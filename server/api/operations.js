import { Router } from 'express'
import { bodyFields, id } from '../validation.js'
import { operate } from '../services/operations.js'
export default function operationsApi(db) {
  const router = Router()
  for (const action of ['assign', 'start', 'begin-work', 'resume', 'cancel']) router.post(`/:id/${action}`, (req, res) => {
    bodyFields(req.body, action === 'assign' ? ['workerId'] : [])
    res.json(operate(db, id(req.params.id, 'id', { path: true }), action, action === 'assign' ? id(req.body.workerId, 'workerId') : undefined))
  })
  return router
}
