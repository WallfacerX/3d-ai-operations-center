import { Router } from 'express'

export default function activityApi(db) {
  const router = Router()
  router.get('/', (_req, res) => res.json(db.prepare('SELECT * FROM activity ORDER BY timestamp DESC, id DESC LIMIT 100').all()))
  return router
}
