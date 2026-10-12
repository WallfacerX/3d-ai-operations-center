import { ApiError, requireRecord } from '../validation.js'
import { recordActivity } from '../db/database.js'

export function operate(db, taskId, action, workerId) {
  return db.transaction(() => {
    const task = requireRecord(db, 'tasks', taskId)
    const allowed = { assign: ['draft', 'queued'], start: ['assigned'], 'begin-work': ['traveling'], resume: ['revision_requested'], cancel: ['draft', 'queued', 'assigned', 'traveling', 'working', 'revision_requested'] }
    if (!allowed[action]?.includes(task.status)) throw new ApiError(409, 'Action is not available in this task state')
    let worker = task.assignedWorkerId === null ? null : requireRecord(db, 'workers', task.assignedWorkerId)
    if (action === 'assign') {
      worker = requireRecord(db, 'workers', workerId)
      if (worker.status !== 'idle' || worker.currentTaskId !== null || db.prepare("SELECT id FROM tasks WHERE assignedWorkerId=? AND id<>? AND status NOT IN ('completed','cancelled','failed')").get(workerId, taskId)) throw new ApiError(409, 'Worker is unavailable')
      if (task.assignedWorkerId !== null && task.assignedWorkerId !== workerId) throw new ApiError(409, 'Task already has another worker')
    } else if (action !== 'cancel') {
      const expected = action === 'begin-work' ? 'traveling' : 'assigned'
      if (!worker || worker.currentTaskId !== taskId || worker.status !== expected) throw new ApiError(409, 'Worker assignment or status is inconsistent')
    }
    const status = { assign: 'assigned', start: 'traveling', 'begin-work': 'working', resume: 'working', cancel: 'cancelled' }[action]
    const now = new Date().toISOString()
    db.prepare('UPDATE tasks SET status=?,assignedWorkerId=?,progress=?,startedAt=?,completedAt=NULL WHERE id=?').run(status, worker?.id ?? null, action === 'resume' ? 0 : task.progress, task.startedAt ?? (status === 'working' ? now : null), taskId)
    const context = { projectId: task.projectId, taskId, workerId: worker?.id ?? null }
    if (worker && (action === 'assign' || worker.currentTaskId === taskId)) {
      db.prepare('UPDATE workers SET status=?,currentTaskId=?,updatedAt=? WHERE id=?').run(action === 'cancel' ? 'idle' : status, action === 'cancel' ? null : taskId, now, worker.id)
      recordActivity(db, { ...context, event: 'worker_status_changed', message: `Worker #${worker.id}: ${action === 'cancel' ? 'idle' : status}` })
    }
    recordActivity(db, { ...context, event: { assign: 'task_assigned', start: 'task_started', 'begin-work': 'task_work_started', resume: 'task_resumed', cancel: 'task_cancelled' }[action], message: `Task #${taskId}: ${task.status} → ${status}` })
    return { task: requireRecord(db, 'tasks', taskId), worker: worker ? requireRecord(db, 'workers', worker.id) : null }
  }).immediate()
}

export function projectTasks(db, tasks) {
  const results = new Map(db.prepare('SELECT id,taskId,version,summary FROM task_results WHERE id IN (SELECT MAX(id) FROM task_results GROUP BY taskId)').all().map(({ taskId, ...result }) => [taskId, result]))
  const revisions = new Map(db.prepare("SELECT id,taskId,notes,createdAt FROM approvals WHERE id IN (SELECT MAX(id) FROM approvals WHERE decision='revision_requested' GROUP BY taskId)").all().map(({ taskId, ...revision }) => [taskId, revision]))
  return tasks.map((task) => ({ ...task, latestResult: results.get(task.id) ?? null, latestRevision: revisions.get(task.id) ?? null }))
}
