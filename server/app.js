import express from 'express'
import projectsApi from './api/projects.js'
import tasksApi from './api/tasks.js'
import workersApi from './api/workers.js'
import activityApi from './api/activity.js'
import { ApiError } from './validation.js'

const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
function localUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && localHosts.has(url.hostname) && !url.username && !url.password
  } catch { return false }
}

export function createApp(db, { onError = console.error } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    // Host checking also prevents a remote hostname from being rebound to loopback.
    if (!localUrl(`http://${req.headers.host}`) || (req.headers.origin && !localUrl(req.headers.origin))) return next(new ApiError(403, 'Only local requests are allowed'))
    if (['POST', 'PATCH'].includes(req.method) && !req.is('application/json')) return next(new ApiError(400, 'Content-Type must be application/json'))
    next()
  })
  app.use(express.json({ limit: '64kb' }))
  app.get('/api/health', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ok' }) })
  app.use('/api/projects', projectsApi(db))
  app.use('/api/tasks', tasksApi(db))
  app.use('/api/workers', workersApi(db))
  app.use('/api/activity', activityApi(db))
  app.use((_req, _res, next) => next(new ApiError(404, 'Endpoint not found')))
  app.use((error, _req, res, _next) => {
    if (error instanceof ApiError) return res.status(error.status).json({ error: error.message })
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON' })
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body exceeds 64 KB' })
    if (error.status >= 400 && error.status < 500) return res.status(400).json({ error: 'Invalid request body' })
    onError(error)
    res.status(500).json({ error: 'Internal server error' })
  })
  return app
}
