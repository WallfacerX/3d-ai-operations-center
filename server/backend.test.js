import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { get } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './app.js'
import { openDatabase } from './db/database.js'
import { taskStates, workerStates } from './validation.js'

async function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), 'magnium-api-'))
  const filename = join(dir, 'test.db')
  const db = openDatabase(filename)
  const errors = []
  const server = createApp(db, { onError: (error) => errors.push(error) }).listen(0, '127.0.0.1')
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve))
    if (db.open) db.close()
    rmSync(dir, { recursive: true, force: true })
  })
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  const request = async (path, method = 'GET', body, headers = {}) => {
    const response = await fetch(`${base}/api${path}`, {
      method,
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    return { status: response.status, body: await response.json(), headers: response.headers }
  }
  const createTask = async (extra = {}) => {
    const result = await request('/tasks', 'POST', { projectId: 1, title: 'Evaluate local architecture', type: 'research', ...extra })
    assert.equal(result.status, 201)
    return result.body
  }
  return { db, filename, base, request, createTask, errors }
}

test('initializes schema and seed once, preserves mutations after reopening', async (t) => {
  const { db, filename, request } = await setup(t)
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1)
  assert.equal(db.pragma('journal_mode', { simple: true }), 'wal')
  assert.equal(db.pragma('user_version', { simple: true }), 1)
  const workers = (await request('/workers')).body
  assert.equal(workers.length, 1)
  assert.deepEqual({ name: workers[0].name, role: workers[0].role, department: workers[0].department, status: workers[0].status, currentTaskId: workers[0].currentTaskId }, {
    name: 'Research Bot 01', role: 'Technical Research', department: 'research', status: 'idle', currentTaskId: null,
  })
  assert.equal((await request('/projects')).body[0].name, 'Internal Prototype')
  assert.deepEqual((await request('/workers/1')).body, workers[0])
  assert.equal((await request('/workers/1', 'PATCH', { status: 'assigned' })).status, 200)
  db.close()
  const reopened = openDatabase(filename)
  try {
    assert.equal(reopened.prepare('SELECT count(*) AS count FROM workers').get().count, 1)
    assert.equal(reopened.prepare('SELECT count(*) AS count FROM projects').get().count, 1)
    assert.equal(reopened.prepare('SELECT status FROM workers WHERE id=1').get().status, 'assigned')
    assert.equal(reopened.prepare('SELECT count(*) AS count FROM activity').get().count, 1)
  } finally { reopened.close() }
})

test('health, project/task creation and reading, defaults and activity references', async (t) => {
  const { request } = await setup(t)
  const health = await request('/health')
  assert.equal(health.status, 200)
  assert.deepEqual(health.body, { status: 'ok' })
  assert.equal(health.headers.get('Access-Control-Allow-Origin'), null)
  const project = await request('/projects', 'POST', { name: 'New project', client: 'Magnium' })
  assert.equal(project.status, 201)
  assert.equal(project.body.status, 'active')
  assert.equal(project.body.createdAt, project.body.updatedAt)
  assert.deepEqual((await request(`/projects/${project.body.id}`)).body, project.body)
  assert.equal((await request('/projects')).body.length, 2)
  const task = await request('/tasks', 'POST', { projectId: project.body.id, title: 'Check constraints', type: 'research', assignedWorkerId: 1 })
  assert.equal(task.status, 201)
  assert.equal(task.body.status, 'draft')
  assert.equal(task.body.progress, 0)
  assert.equal(task.body.requirements, '')
  assert.equal(task.body.startedAt, null)
  assert.equal(task.body.completedAt, null)
  assert.deepEqual((await request(`/tasks/${task.body.id}`)).body, task.body)
  assert.deepEqual((await request('/tasks')).body, [task.body])
  const events = (await request('/activity')).body
  assert.deepEqual(events.map((event) => event.event), ['task_assigned', 'task_created', 'project_created'])
  assert.ok(events.every((event) => event.projectId === project.body.id))
  assert.equal(events[0].taskId, task.body.id)
  assert.equal(events[0].workerId, 1)
})

test('manual state updates support every state and preserve timestamp semantics', async (t) => {
  const { request, createTask } = await setup(t)
  const task = await createTask({ assignedWorkerId: 1 })
  let startedAt
  for (const status of taskStates) {
    const response = await request(`/tasks/${task.id}`, 'PATCH', { status, progress: 37.5 })
    assert.equal(response.status, 200, status)
    assert.equal(response.body.status, status)
    if (status === 'working') { startedAt = response.body.startedAt; assert.ok(startedAt) }
    assert.equal(response.body.completedAt !== null, status === 'completed')
  }
  const repeatedWork = await request(`/tasks/${task.id}`, 'PATCH', { status: 'working' })
  assert.equal(repeatedWork.body.startedAt, startedAt)
  for (const status of workerStates) {
    const response = await request('/workers/1', 'PATCH', { status, currentTaskId: task.id })
    assert.equal(response.status, 200, status)
    assert.equal(response.body.status, status)
    assert.equal(response.body.currentTaskId, task.id)
  }
  const count = (await request('/activity')).body.length
  const before = (await request('/workers/1')).body
  await request('/workers/1', 'PATCH', { status: 'error', currentTaskId: task.id })
  await request(`/tasks/${task.id}`, 'PATCH', { status: 'working', progress: 37.5 })
  assert.equal((await request('/activity')).body.length, count)
  assert.deepEqual((await request('/workers/1')).body, before)
  assert.ok((await request('/activity')).body.some((event) => event.event === 'worker_status_changed'))
})

test('assignment conflicts require clearing worker link and do not partially mutate', async (t) => {
  const { request, createTask } = await setup(t)
  const task = await createTask()
  assert.equal((await request('/workers/1', 'PATCH', { currentTaskId: task.id })).status, 400)
  assert.equal((await request(`/tasks/${task.id}`, 'PATCH', { assignedWorkerId: 1 })).status, 200)
  assert.equal((await request('/workers/1', 'PATCH', { currentTaskId: task.id, status: 'working' })).status, 200)
  const count = (await request('/activity')).body.length
  assert.equal((await request(`/tasks/${task.id}`, 'PATCH', { assignedWorkerId: null, status: 'completed' })).status, 409)
  assert.equal((await request(`/tasks/${task.id}`)).body.status, 'draft')
  assert.equal((await request('/activity')).body.length, count)
  await request('/workers/1', 'PATCH', { currentTaskId: null, status: 'idle' })
  assert.equal((await request(`/tasks/${task.id}`, 'PATCH', { assignedWorkerId: null })).status, 200)
})

test('rejects invalid fields, identifiers, references, states and progress', async (t) => {
  const { request, createTask } = await setup(t)
  const task = await createTask()
  for (const body of [{}, { name: 'x' }, { name: ' ', client: 'x' }, { name: 'x', client: 'x', status: null }, { name: 'x', client: 'x', id: 10 }, { name: 'x', client: 2 }, { name: 'x'.repeat(257), client: 'x' }]) {
    assert.equal((await request('/projects', 'POST', body)).status, 400, JSON.stringify(body))
  }
  const valid = { projectId: 1, title: 'x', type: 'research' }
  for (const extra of [{ projectId: '1' }, { projectId: 0 }, { projectId: 999 }, { projectId: 1.5 }, { title: null }, { type: '' }, { requirements: [] }, { description: 'x'.repeat(10001) }, { status: 'running' }, { status: null }, { progress: -1 }, { progress: 101 }, { progress: '50' }, { progress: null }, { assignedWorkerId: 999 }, { assignedWorkerId: '1' }, { createdAt: 'yesterday' }]) {
    assert.equal((await request('/tasks', 'POST', { ...valid, ...extra })).status, 400)
  }
  for (const body of [{}, { status: 'unknown' }, { progress: false }, { assignedWorkerId: -1 }, { projectId: 1 }]) assert.equal((await request(`/tasks/${task.id}`, 'PATCH', body)).status, 400)
  for (const body of [{}, { status: 'queued' }, { status: null }, { currentTaskId: 999 }, { currentTaskId: '1' }, { role: 'changed' }]) assert.equal((await request('/workers/1', 'PATCH', body)).status, 400)
  for (const resource of ['projects', 'tasks', 'workers']) {
    for (const invalid of ['0', '-1', '1.5', 'abc', '9007199254740992', '1%20OR%201=1']) assert.equal((await request(`/${resource}/${invalid}`)).status, 400)
    assert.equal((await request(`/${resource}/999`)).status, 404)
  }
  assert.equal((await request('/tasks/999', 'PATCH', { status: 'working' })).status, 404)
  assert.equal((await request('/workers/999', 'PATCH', { status: 'working' })).status, 404)
})

test('request boundaries reject remote origins, unexpected hosts, malformed and oversized bodies', async (t) => {
  const { request, base } = await setup(t)
  assert.equal((await request('/health', 'GET', undefined, { Origin: 'https://example.com' })).status, 403)
  assert.equal((await request('/health', 'GET', undefined, { Origin: 'null' })).status, 403)
  assert.equal((await request('/health', 'GET', undefined, { Origin: 'http://localhost.evil.test' })).status, 403)
  // Node fetch normalizes Host; use HTTP directly to exercise the received header.
  const hostileHostStatus = await new Promise((resolve, reject) => {
    get(`${base}/api/health`, { headers: { Host: 'evil.test' } }, (response) => {
      response.resume()
      resolve(response.statusCode)
    }).on('error', reject)
  })
  assert.equal(hostileHostStatus, 403)
  assert.equal((await request('/health', 'GET', undefined, { Origin: 'http://localhost:5173' })).status, 200)
  for (const [body, contentType, expected] of [['{', 'application/json', 400], ['[]', 'application/json', 400], ['null', 'application/json', 400], ['name=x', 'application/x-www-form-urlencoded', 400], [JSON.stringify({ name: 'x'.repeat(70000) }), 'application/json', 413]]) {
    const response = await fetch(`${base}/api/projects`, { method: 'POST', headers: { 'Content-Type': contentType }, body })
    assert.equal(response.status, expected)
    assert.ok((await response.json()).error)
  }
  assert.equal((await request('/execute', 'POST', {})).status, 404)
  assert.equal((await request('/shell', 'POST', {})).status, 404)
  assert.equal((await request('/command', 'POST', {})).status, 404)
})

test('SQL constraints, transactional rollback and sanitized internal errors', async (t) => {
  const { db, request, errors, createTask } = await setup(t)
  const task = await createTask()
  assert.throws(() => db.prepare('UPDATE tasks SET projectId=999 WHERE id=?').run(task.id), /FOREIGN KEY/)
  assert.throws(() => db.prepare("UPDATE tasks SET status='unknown' WHERE id=?").run(task.id), /CHECK/)
  assert.throws(() => db.prepare('UPDATE tasks SET progress=101 WHERE id=?').run(task.id), /CHECK/)
  assert.throws(() => db.prepare("UPDATE workers SET status='unknown' WHERE id=1").run(), /CHECK/)
  db.exec("CREATE TRIGGER fail_activity BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT, 'private internal detail'); END")
  const before = (await request('/projects')).body.length
  const response = await request('/projects', 'POST', { name: 'Must roll back', client: 'Magnium' })
  assert.equal(response.status, 500)
  assert.deepEqual(response.body, { error: 'Internal server error' })
  assert.equal((await request('/projects')).body.length, before)
  assert.equal(errors.length, 1)
})

test('activity is limited to newest 100 in stable order', async (t) => {
  const { db, request } = await setup(t)
  const insert = db.prepare('INSERT INTO activity (event,message,timestamp) VALUES (?,?,?)')
  db.transaction(() => { for (let i = 0; i < 105; i++) insert.run('test', String(i), '2026-01-01T00:00:00.000Z') })()
  const events = (await request('/activity')).body
  assert.equal(events.length, 100)
  assert.equal(events[0].message, '104')
  assert.equal(events.at(-1).message, '5')
})

test('manual research demo states persist with task/worker links and activity', async (t) => {
  const { request, createTask } = await setup(t)
  const task = await createTask({ assignedWorkerId: 1, type: 'research' })
  for (const status of ['assigned', 'traveling', 'working', 'awaiting_review']) {
    const progress = status === 'awaiting_review' ? 100 : status === 'working' ? 40 : 0
    assert.equal((await request(`/tasks/${task.id}`, 'PATCH', { status, progress })).status, 200)
    assert.equal((await request('/workers/1', 'PATCH', { status, currentTaskId: task.id })).status, 200)
    const worker = (await request('/workers')).body[0]
    const current = (await request('/tasks')).body.find((item) => item.id === worker.currentTaskId)
    assert.equal(worker.status, status)
    assert.equal(current.status, status)
    assert.equal(current.progress, progress)
  }
  const events = (await request('/activity')).body
  assert.ok(events.some((event) => event.event === 'worker_status_changed' && event.message.includes('awaiting_review')))
  assert.ok(events.some((event) => event.event === 'task_status_changed' && event.taskId === task.id))
})
