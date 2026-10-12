import { Router } from 'express'
import { ApiError, bodyFields, id, state, workerStates, requireRecord } from '../validation.js'
import { recordActivity } from '../db/database.js'

export default function workersApi(db) {
  const router = Router()
  router.get('/', (_req, res) => res.json(db.prepare('SELECT * FROM workers ORDER BY id').all()))
  router.get('/:id', (req, res) => res.json(requireRecord(db, 'workers', id(req.params.id, 'id', { path: true }))))
  router.patch('/:id', (req, res) => {
    const workerId = id(req.params.id, 'id', { path: true })
    const body = req.body
    bodyFields(body, ['status', 'currentTaskId'])
    if (!Object.keys(body).length) throw new ApiError(400, 'Supply at least one field to update')
    const worker = db.transaction(() => {
      const old = requireRecord(db, 'workers', workerId)
      const status = body.status === undefined ? old.status : state(body.status, workerStates)
      const taskId = body.currentTaskId === undefined ? old.currentTaskId : id(body.currentTaskId, 'currentTaskId', { nullable: true })
      if (taskId !== null) requireRecord(db, 'tasks', taskId, 400)
      if (old.currentTaskId !== null || (body.currentTaskId !== undefined && body.currentTaskId !== null) || (body.status !== undefined && !['idle', 'error'].includes(body.status))) throw new ApiError(409, 'Use task workflow actions to update linked workers')
      if (status === old.status && taskId === old.currentTaskId) return old
      db.prepare('UPDATE workers SET status=?,currentTaskId=?,updatedAt=? WHERE id=?').run(status, taskId, new Date().toISOString(), workerId)
      if (status !== old.status) recordActivity(db, { workerId, event: 'worker_status_changed', message: `Worker #${workerId}: ${old.status} → ${status}` })
      return requireRecord(db, 'workers', workerId)
    })()
    res.json(worker)
  })
  return router
}
