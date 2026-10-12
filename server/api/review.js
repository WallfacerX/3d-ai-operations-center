import { Router } from 'express'
import { ApiError, id } from '../validation.js'
import { getResult, createResult, getApprovals, decide } from '../services/review.js'

export default function reviewApi(db) {
  const router = Router()
  const taskId = (req) => id(req.params.id, 'id', { path: true })
  router.get('/:id/result', (req, res) => {
    if (Object.keys(req.query).some((key) => key !== 'version')) throw new ApiError(400, 'Unknown query parameter')
    const version = req.query.version === undefined ? undefined : id(req.query.version, 'version', { path: true })
    res.json(getResult(db, taskId(req), version))
  })
  router.post('/:id/result', (req, res) => res.status(201).json(createResult(db, taskId(req), req.body)))
  router.get('/:id/approvals', (req, res) => res.json(getApprovals(db, taskId(req))))
  for (const [action, decision] of [['approve', 'approved'], ['revise', 'revision_requested'], ['reject', 'rejected']]) {
    router.post(`/:id/${action}`, (req, res) => res.json(decide(db, taskId(req), decision, req.body)))
  }
  return router
}
