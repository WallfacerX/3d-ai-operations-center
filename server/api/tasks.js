import { Router } from 'express'
import operationsApi from './operations.js'
import { operate, projectTasks } from '../services/operations.js'
import reviewApi from './review.js'
import { ApiError, bodyFields, text, id, state, progress, taskStates, requireRecord, allowManualTaskStatus } from '../validation.js'
import { recordActivity } from '../db/database.js'

export default function tasksApi(db) {
  const router = Router()
  router.use(reviewApi(db))
  router.use(operationsApi(db))
  router.get('/', (_req, res) => res.json(projectTasks(db, db.prepare('SELECT * FROM tasks ORDER BY id').all())))
  router.get('/:id', (req, res) => res.json(projectTasks(db, [requireRecord(db, 'tasks', id(req.params.id, 'id', { path: true }))])[0]))
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
    allowManualTaskStatus(status)
    const amount = progress(body.progress === undefined ? 0 : body.progress)
    const task = db.transaction(() => {
      requireRecord(db, 'projects', projectId, 400)
      if (workerId !== null) requireRecord(db, 'workers', workerId, 400)
      if (!['draft', 'queued'].includes(status) || workerId !== null) throw new ApiError(409, 'Create unassigned draft or queued tasks, then use assignment actions')
      const now = new Date().toISOString()
      const { lastInsertRowid: taskId } = db.prepare(`INSERT INTO tasks
        (projectId,title,description,requirements,type,assignedWorkerId,status,progress,createdAt,startedAt,completedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(projectId, title, description, requirements, type, workerId, status, amount, now, null, null)
      recordActivity(db, { projectId, taskId, workerId, event: 'task_created', message: `Task #${taskId} created` })
      return requireRecord(db, 'tasks', taskId)
    })()
    res.status(201).json(task)
  })
  router.patch('/:id', (req, res) => {
    const taskId = id(req.params.id, 'id', { path: true })
    const body = req.body
    bodyFields(body, ['status', 'progress', 'assignedWorkerId'])
    if (!Object.keys(body).length) throw new ApiError(400, 'Supply at least one field to update')
    const oldTask = requireRecord(db, 'tasks', taskId)
    if (body.status !== undefined || body.assignedWorkerId !== undefined) {
      if (Object.keys(body).length !== 1) throw new ApiError(400, 'Use one explicit workflow action at a time')
      if (body.assignedWorkerId !== undefined) return res.json(operate(db, taskId, 'assign', id(body.assignedWorkerId, 'assignedWorkerId')).task)
      state(body.status, taskStates)
      const action = { traveling: 'start', working: oldTask.status === 'revision_requested' ? 'resume' : 'begin-work', cancelled: 'cancel' }[body.status]
      if (!action) throw new ApiError(409, 'Use explicit workflow actions')
      return res.json(operate(db, taskId, action).task)
    }
    if (body.progress !== undefined) progress(body.progress)
    if (oldTask.status !== 'working') throw new ApiError(409, 'Progress can only change while working')
    const task = db.transaction(() => {
      const amount = progress(body.progress)
      db.prepare('UPDATE tasks SET progress=? WHERE id=?').run(amount, taskId)
      if (amount !== oldTask.progress) recordActivity(db, { projectId: oldTask.projectId, taskId, workerId: oldTask.assignedWorkerId, event: 'task_progress_changed', message: `Task #${taskId} progress: ${amount}%` })
      return requireRecord(db, 'tasks', taskId)
    })()
    res.json(task)
  })
  return router
}
