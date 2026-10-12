import { Router } from 'express'
import { ApiError, bodyFields, text, id, state, progress, taskStates, requireRecord } from '../validation.js'
import { recordActivity } from '../db/database.js'

export default function tasksApi(db) {
  const router = Router()
  router.get('/', (_req, res) => res.json(db.prepare('SELECT * FROM tasks ORDER BY id').all()))
  router.get('/:id', (req, res) => res.json(requireRecord(db, 'tasks', id(req.params.id, 'id', { path: true }))))
  router.post('/', (req, res) => {
    const body = req.body
    bodyFields(body, ['projectId', 'title', 'description', 'requirements', 'type', 'assignedWorkerId', 'status', 'progress'])
    const projectId = id(body.projectId, 'projectId')
    const title = text(body.title, 'title')
    const description = text(body.description, 'description', { optional: true, max: 10000 })
    const requirements = text(body.requirements, 'requirements', { optional: true, max: 10000 })
    const type = text(body.type, 'type')
    const workerId = id(body.assignedWorkerId ?? null, 'assignedWorkerId', { nullable: true })
    const status = state(body.status === undefined ? 'draft' : body.status, taskStates)
    const amount = progress(body.progress === undefined ? 0 : body.progress)
    const task = db.transaction(() => {
      requireRecord(db, 'projects', projectId, 400)
      if (workerId !== null) requireRecord(db, 'workers', workerId, 400)
      const now = new Date().toISOString()
      const { lastInsertRowid: taskId } = db.prepare(`INSERT INTO tasks
        (projectId,title,description,requirements,type,assignedWorkerId,status,progress,createdAt,startedAt,completedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(projectId, title, description, requirements, type, workerId, status, amount, now, status === 'working' ? now : null, status === 'completed' ? now : null)
      recordActivity(db, { projectId, taskId, workerId, event: 'task_created', message: `Task #${taskId} created` })
      if (workerId !== null) recordActivity(db, { projectId, taskId, workerId, event: 'task_assigned', message: `Task #${taskId} assigned to worker #${workerId}` })
      return requireRecord(db, 'tasks', taskId)
    })()
    res.status(201).json(task)
  })
  router.patch('/:id', (req, res) => {
    const taskId = id(req.params.id, 'id', { path: true })
    const body = req.body
    bodyFields(body, ['status', 'progress', 'assignedWorkerId'])
    if (!Object.keys(body).length) throw new ApiError(400, 'Supply at least one field to update')
    const task = db.transaction(() => {
      const old = requireRecord(db, 'tasks', taskId)
      const status = body.status === undefined ? old.status : state(body.status, taskStates)
      const amount = body.progress === undefined ? old.progress : progress(body.progress)
      const workerId = body.assignedWorkerId === undefined ? old.assignedWorkerId : id(body.assignedWorkerId, 'assignedWorkerId', { nullable: true })
      if (workerId !== null) requireRecord(db, 'workers', workerId, 400)
      if (workerId !== old.assignedWorkerId && db.prepare('SELECT id FROM workers WHERE currentTaskId = ?').get(taskId)) throw new ApiError(409, 'Clear the current worker task before reassigning it')
      const now = new Date().toISOString()
      const startedAt = old.startedAt ?? (status === 'working' ? now : null)
      const completedAt = status === 'completed' ? old.completedAt ?? now : null
      db.prepare('UPDATE tasks SET status=?,progress=?,assignedWorkerId=?,startedAt=?,completedAt=? WHERE id=?').run(status, amount, workerId, startedAt, completedAt, taskId)
      const context = { projectId: old.projectId, taskId, workerId }
      if (workerId !== old.assignedWorkerId) recordActivity(db, { ...context, event: workerId === null ? 'task_unassigned' : 'task_assigned', message: workerId === null ? `Task #${taskId} unassigned` : `Task #${taskId} assigned to worker #${workerId}` })
      if (status !== old.status) recordActivity(db, { ...context, event: 'task_status_changed', message: `Task #${taskId}: ${old.status} → ${status}` })
      if (amount !== old.progress) recordActivity(db, { ...context, event: 'task_progress_changed', message: `Task #${taskId} progress: ${amount}%` })
      return requireRecord(db, 'tasks', taskId)
    })()
    res.json(task)
  })
  return router
}
