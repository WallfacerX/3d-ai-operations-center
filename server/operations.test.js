import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { openDatabase } from './db/database.js'
import { createApp } from './app.js'
async function setup(t) {
  const db = openDatabase(':memory:')
  const server = createApp(db, { onError() {} }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); db.close() })
  const request = async (path, body, method = 'POST') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, ...(method === 'GET' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) }) })
    return { status: response.status, body: await response.json() }
  }
  const create = async () => (await request('/tasks', { projectId: 1, title: 'Operator task', type: 'research' })).body
  return { db, request, create }
}
test('operator action validation, busy workers, racing assignments and cancellation', async (t) => {
  const { request, create } = await setup(t)
  const a = await create(), b = await create()
  assert.equal((await request(`/tasks/${a.id}/start`)).status, 409)
  assert.equal((await request(`/tasks/${a.id}/assign`, { workerId: 999 })).status, 404)
  assert.equal((await request(`/tasks/${a.id}/assign`, { workerId: '1' })).status, 400)
  assert.equal((await request('/tasks/999/start')).status, 404)
  assert.equal((await request(`/tasks/${a.id}/start`, { status: 'working' })).status, 400)
  const races = await Promise.all([a, b].map((task) => request(`/tasks/${task.id}/assign`, { workerId: 1 })))
  assert.deepEqual(races.map((r) => r.status).sort(), [200, 409])
  const task = races.find((r) => r.status === 200).body.task
  assert.equal((await request(`/tasks/${task.id}/begin-work`)).status, 409)
  assert.equal((await request(`/tasks/${task.id}/start`)).body.worker.status, 'traveling')
  assert.equal((await request(`/tasks/${task.id}/start`)).status, 409)
  assert.equal((await request(`/tasks/${task.id}/begin-work`)).body.task.status, 'working')
  const cancelled = await request(`/tasks/${task.id}/cancel`)
  assert.equal(cancelled.body.task.status, 'cancelled')
  assert.equal(cancelled.body.worker.status, 'idle')
  assert.equal(cancelled.body.worker.currentTaskId, null)
  assert.equal((await request(`/tasks/${task.id}/cancel`)).status, 409)
  assert.equal((await request(`/tasks/${task.id}`, { status: 'working' }, 'PATCH')).status, 409)
  const events = (await request('/activity', undefined, 'GET')).body.map((event) => event.event)
  for (const event of ['task_assigned', 'task_started', 'task_work_started', 'task_cancelled']) assert.ok(events.includes(event))
})
test('revision resumes the retained worker, preserves history and projects latest data', async (t) => {
  const { request, create } = await setup(t)
  const task = await create()
  for (const action of ['assign', 'start', 'begin-work']) await request(`/tasks/${task.id}/${action}`, action === 'assign' ? { workerId: 1 } : {})
  const result = (await request(`/tasks/${task.id}/result`, { summary: 'First result' })).body
  assert.equal((await request(`/tasks/${task.id}/cancel`)).status, 409)
  await request(`/tasks/${task.id}/revise`, { resultId: result.id, notes: 'Include costs' })
  const resumed = await request(`/tasks/${task.id}/resume`)
  assert.equal(resumed.body.task.status, 'working')
  assert.equal(resumed.body.task.progress, 0)
  assert.equal(resumed.body.worker.currentTaskId, task.id)
  assert.equal((await request(`/tasks/${task.id}/resume`)).status, 409)
  const next = (await request(`/tasks/${task.id}/result`, { summary: 'Second result' })).body
  assert.equal(next.version, 2)
  const saved = (await request(`/tasks/${task.id}`, undefined, 'GET')).body
  assert.equal(saved.latestResult.summary, 'Second result')
  assert.equal(saved.latestRevision.notes, 'Include costs')
})
test('operator transaction rolls back on activity failure and protects unrelated worker', async (t) => {
  const { db, request, create } = await setup(t)
  const task = await create()
  db.exec("CREATE TRIGGER fail_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT,'private'); END")
  const response = await request(`/tasks/${task.id}/assign`, { workerId: 1 })
  assert.equal(response.status, 500)
  assert.deepEqual(response.body, { error: 'Internal server error' })
  assert.equal(db.prepare('SELECT status FROM tasks WHERE id=?').get(task.id).status, 'draft')
  assert.equal(db.prepare('SELECT currentTaskId FROM workers WHERE id=1').get().currentTaskId, null)
  db.exec('DROP TRIGGER fail_activity')
  const other = await create()
  db.prepare('UPDATE tasks SET assignedWorkerId=1 WHERE id=?').run(task.id)
  db.prepare("UPDATE workers SET status='working',currentTaskId=? WHERE id=1").run(other.id)
  await request(`/tasks/${task.id}/cancel`)
  assert.equal(db.prepare('SELECT currentTaskId FROM workers WHERE id=1').get().currentTaskId, other.id)
})
