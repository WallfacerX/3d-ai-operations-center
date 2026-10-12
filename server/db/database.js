import Database from 'better-sqlite3'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const defaultDatabasePath = fileURLToPath(new URL('../../data/magnium.db', import.meta.url))

export function openDatabase(filename = defaultDatabasePath) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true })
  const db = new Database(filename)
  try {
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    db.pragma('busy_timeout = 3000')
    db.transaction(() => {
      const version = db.pragma('user_version', { simple: true })
      if (version > 1) throw new Error('Database schema is newer than this application supports')
      if (version === 0) {
        db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'))
        const now = new Date().toISOString()
        db.prepare('INSERT INTO projects (name,client,description,status,createdAt,updatedAt) VALUES (?,?,?,?,?,?)')
          .run('Internal Prototype', 'Magnium Technology Solutions', 'Local operations backend prototype.', 'active', now, now)
        db.prepare('INSERT INTO workers (name,role,department,status,createdAt,updatedAt) VALUES (?,?,?,?,?,?)')
          .run('Research Bot 01', 'Technical Research', 'research', 'idle', now, now)
        db.pragma('user_version = 1')
      }
    }).immediate()
    return db
  } catch (error) {
    db.close()
    throw error
  }
}

export function recordActivity(db, { projectId = null, taskId = null, workerId = null, event, message }) {
  db.prepare('INSERT INTO activity (projectId,taskId,workerId,event,message,timestamp) VALUES (?,?,?,?,?,?)')
    .run(projectId, taskId, workerId, event, message, new Date().toISOString())
}
