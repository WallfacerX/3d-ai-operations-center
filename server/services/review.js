import { ApiError, requireRecord, resultPayload, bodyFields, id, text } from '../validation.js'
import { recordActivity } from '../db/database.js'

const decode = (row) => row ? { ...row, sources: JSON.parse(row.sources) } : null
export function getResult(db, taskId, version) {
  requireRecord(db, 'tasks', taskId)
  const row = version === undefined
    ? db.prepare('SELECT * FROM task_results WHERE taskId=? ORDER BY version DESC LIMIT 1').get(taskId)
    : db.prepare('SELECT * FROM task_results WHERE taskId=? AND version=?').get(taskId, version)
  if (!row) throw new ApiError(404, 'Task result not found')
  return decode(row)
}
export function getApprovals(db, taskId) {
  requireRecord(db, 'tasks', taskId)
  return db.prepare('SELECT a.*, r.version AS resultVersion FROM approvals a JOIN task_results r ON r.id=a.resultId WHERE a.taskId=? ORDER BY a.id DESC').all(taskId)
}
function updateLinkedWorker(db, task, status, clear, context) {
  const worker = db.prepare('SELECT * FROM workers WHERE currentTaskId=? AND id=?').get(task.id, task.assignedWorkerId)
  if (!worker) return
  db.prepare('UPDATE workers SET status=?,currentTaskId=?,updatedAt=? WHERE id=?').run(status, clear ? null : task.id, new Date().toISOString(), worker.id)
  if (worker.status !== status) recordActivity(db, { ...context, event: 'worker_status_changed', message: `Worker #${worker.id}: ${worker.status} → ${status}` })
  if (clear) recordActivity(db, { ...context, event: 'worker_task_changed', message: `Worker #${worker.id} current task cleared` })
}
export function createResult(db, taskId, body) {
  return db.transaction(() => {
    const task = requireRecord(db, 'tasks', taskId)
    const value = resultPayload(body)
    const latest = db.prepare('SELECT version FROM task_results WHERE taskId=? ORDER BY version DESC LIMIT 1').get(taskId)
    if (!['working', 'revision_requested'].includes(task.status) && !(task.status === 'awaiting_review' && !latest)) throw new ApiError(409, 'Task must be working or awaiting revision before result submission')
    const now = new Date().toISOString()
    const version = (latest?.version ?? 0) + 1
    db.prepare(`INSERT INTO task_results (taskId,version,summary,recommendation,reasoning,securityConsiderations,limitations,sources,rawOutput,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(taskId, version, value.summary, value.recommendation, value.reasoning, value.securityConsiderations, value.limitations, JSON.stringify(value.sources), value.rawOutput, now, now)
    db.prepare("UPDATE tasks SET status='awaiting_review',progress=100,completedAt=NULL WHERE id=?").run(taskId)
    const context = { projectId: task.projectId, taskId, workerId: task.assignedWorkerId }
    recordActivity(db, { ...context, event: 'task_result_created', message: `Result version ${version} created for Task #${taskId}` })
    recordActivity(db, { ...context, event: 'task_status_changed', message: `Task #${taskId}: ${task.status} → awaiting_review` })
    updateLinkedWorker(db, task, 'awaiting_review', false, context)
    return getResult(db, taskId)
  }).immediate()
}
export function decide(db, taskId, decision, body) {
  return db.transaction(() => {
    const task = requireRecord(db, 'tasks', taskId)
    bodyFields(body, ['resultId', 'notes'])
    const resultId = id(body.resultId, 'resultId')
    const notes = text(body.notes, 'notes', { optional: decision !== 'revision_requested', max: 2000 })
    if (task.status !== 'awaiting_review') throw new ApiError(409, 'Task is not awaiting review')
    const result = db.prepare('SELECT * FROM task_results WHERE taskId=? ORDER BY version DESC LIMIT 1').get(taskId)
    if (!result || result.id !== resultId || db.prepare('SELECT id FROM approvals WHERE resultId=?').get(resultId)) throw new ApiError(409, 'Result is missing, outdated, or already reviewed')
    const now = new Date().toISOString()
    db.prepare('INSERT INTO approvals (taskId,resultId,decision,notes,createdAt,updatedAt) VALUES (?,?,?,?,?,?)').run(taskId, resultId, decision, notes, now, now)
    const context = { projectId: task.projectId, taskId, workerId: task.assignedWorkerId }
    const event = { approved: 'task_approved', revision_requested: 'task_revision_requested', rejected: 'task_rejected' }[decision]
    const status = { approved: 'completed', revision_requested: 'revision_requested', rejected: 'cancelled' }[decision]
    if (decision === 'approved') db.prepare("UPDATE tasks SET status='approved' WHERE id=?").run(taskId)
    recordActivity(db, { ...context, event, message: `Task #${taskId} ${decision.replaceAll('_', ' ')} (result version ${result.version})` })
    db.prepare('UPDATE tasks SET status=?,completedAt=?,progress=? WHERE id=?').run(status, status === 'completed' ? now : null, status === 'completed' ? 100 : task.progress, taskId)
    if (status === 'completed') recordActivity(db, { ...context, event: 'task_completed', message: `Task #${taskId} completed` })
    updateLinkedWorker(db, task, decision === 'revision_requested' ? 'assigned' : 'idle', decision !== 'revision_requested', context)
    return { task: requireRecord(db, 'tasks', taskId), approval: getApprovals(db, taskId)[0] }
  }).immediate()
}
