import { createApp } from './app.js'
import { openDatabase } from './db/database.js'

const db = openDatabase()
const server = createApp(db).listen(3001, '127.0.0.1', () => {
  console.log('Operations API: http://127.0.0.1:3001/api/health')
})
server.on('error', (error) => {
  console.error(`Unable to start operations API: ${error.message}`)
  db.close()
  process.exitCode = 1
})
function shutdown() {
  server.close(() => { db.close() })
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
