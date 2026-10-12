import { Router } from 'express'
import { bodyFields, text, id, requireRecord } from '../validation.js'
import { recordActivity } from '../db/database.js'

export default function projectsApi(db) {
  const router = Router()
  router.get('/', (_req, res) => res.json(db.prepare('SELECT * FROM projects ORDER BY id').all()))
  router.get('/:id', (req, res) => res.json(requireRecord(db, 'projects', id(req.params.id, 'id', { path: true }))))
  router.post('/', (req, res) => {
    bodyFields(req.body, ['name', 'client', 'description', 'status'])
    const name = text(req.body.name, 'name')
    const client = text(req.body.client, 'client')
    const description = text(req.body.description, 'description', { optional: true, max: 10000 })
    const status = text(req.body.status === undefined ? 'active' : req.body.status, 'status')
    const project = db.transaction(() => {
      const now = new Date().toISOString()
      const { lastInsertRowid } = db.prepare('INSERT INTO projects (name,client,description,status,createdAt,updatedAt) VALUES (?,?,?,?,?,?)').run(name, client, description, status, now, now)
      recordActivity(db, { projectId: lastInsertRowid, event: 'project_created', message: `Project #${lastInsertRowid} created` })
      return requireRecord(db, 'projects', lastInsertRowid)
    })()
    res.status(201).json(project)
  })
  return router
}
