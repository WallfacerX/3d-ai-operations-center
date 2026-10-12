import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { openDatabase } from './db/database.js'
import { createApp } from './app.js'

async function setup(t) {
  const db = openDatabase(':memory:')
  const server = createApp(db, { onError: () => {} }).listen(0, '127.0.0.1')
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); db.close() })
  await once(server, 'listening')
  const request = async (path, method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) })
    return { status: response.status, body: await response.json() }
  }
  const task = (await request('/tasks', 'POST', { projectId: 1, title: 'Review test', type: 'research' })).body
  for (const action of ['assign', 'start', 'begin-work']) assert.equal((await request(`/tasks/${task.id}/${action}`, 'POST', action === 'assign' ? { workerId: 1 } : {})).status, 200)
  const path = `/tasks/${task.id}`
  const submit = (body = { summary: 'Sample comparison', sources: [{ label: 'Demo source', url: 'https://example.invalid/demo' }] }) => request(`${path}/result`, 'POST', body)
  return { db, request, task, path, submit }
}

test('v1 migration preserves data, seeds and schema version across restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'magnium-migration-'))
  const file = join(dir, 'test.db')
  const old = new Database(file)
  old.exec(readFileSync(new URL('./db/schema.sql', import.meta.url), 'utf8'))
  old.exec("INSERT INTO projects VALUES (4,'Existing','Client','','active','2026-01-01','2026-01-01'); PRAGMA user_version=1")
  old.close()
  try {
    for (let i = 0; i < 2; i++) {
      const db = openDatabase(file)
      assert.equal(db.pragma('user_version', { simple: true }), 2)
      assert.deepEqual(db.prepare('SELECT id,name FROM projects').all(), [{ id: 4, name: 'Existing' }])
      assert.equal(db.prepare('SELECT count(*) AS n FROM workers').get().n, 0)
      assert.equal(db.prepare('SELECT count(*) AS n FROM task_results').get().n, 0)
      db.close()
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('result create/read, defaults, safe sources and invalid payloads', async (t) => {
  const { request, path, submit } = await setup(t)
  assert.equal((await request(`${path}/result`)).status, 404)
  for (const body of [{}, { summary: ' ' }, { summary: 'x', sources: 'bad' }, { summary: 'x', sources: [{ label: 'x', url: 'javascript:alert(1)' }] }, { summary: 'x', sources: [{ label: 'x', url: 'https://user:secret@example.invalid' }] }, { summary: 'x', sources: Array(21).fill({ label: 'x' }) }, { summary: 'x', rawOutput: 3 }, { summary: 'x', taskId: 1 }]) assert.equal((await submit(body)).status, 400)
  const result = await submit()
  assert.equal(result.status, 201)
  assert.equal(result.body.version, 1)
  assert.equal(result.body.reasoning, '')
  assert.deepEqual((await request(`${path}/result?version=1`)).body, result.body)
  assert.equal((await request(`${path}/result?version=0`)).status, 400)
  assert.equal((await request(`${path}/result?version=2`)).status, 404)
  assert.equal((await submit()).status, 409)
  for (const endpoint of ['result', 'approvals', 'approve', 'revise', 'reject']) assert.equal((await request(`/tasks/999/${endpoint}`, ['result', 'approvals'].includes(endpoint) ? 'GET' : 'POST', ['result', 'approvals'].includes(endpoint) ? undefined : { resultId: 1, notes: 'x' })).status, 404)
  assert.equal((await request('/tasks/999/result', 'POST', { summary: 'x' })).status, 404)
})

for (const [action, decision, status] of [['approve', 'approved', 'completed'], ['revise', 'revision_requested', 'revision_requested'], ['reject', 'rejected', 'cancelled']]) {
  test(`${action} updates task, linked worker, decision and activity atomically`, async (t) => {
    const { request, path, task, submit } = await setup(t)
    const result = (await submit()).body
    assert.equal((await request('/workers/1')).body.status, 'awaiting_review')
    const response = await request(`${path}/${action}`, 'POST', { resultId: result.id, notes: 'Private review note' })
    assert.equal(response.status, 200)
    assert.equal(response.body.task.status, status)
    assert.equal(response.body.approval.decision, decision)
    assert.equal(response.body.approval.notes, 'Private review note')
    const worker = (await request('/workers/1')).body
    assert.equal(worker.status, action === 'revise' ? 'assigned' : 'idle')
    assert.equal(worker.currentTaskId, action === 'revise' ? task.id : null)
    assert.equal(response.body.task.completedAt !== null, action === 'approve')
    assert.equal((await request(`${path}/${action}`, 'POST', { resultId: result.id, notes: 'Again' })).status, 409)
    assert.equal((await request(`${path}/approvals`)).body.length, 1)
    const events = (await request('/activity')).body
    assert.ok(events.some((event) => event.event === `task_${decision}`))
    assert.ok(events.some((event) => event.event === 'task_result_created'))
    assert.equal(events.some((event) => event.event === 'task_completed'), action === 'approve')
    assert.ok(events.every((event) => !event.message.includes('Private review note')))
  })
}

test('revision history remains intact and stale result decisions are rejected', async (t) => {
  const { request, path, submit } = await setup(t)
  const first = (await submit()).body
  assert.equal((await request(`${path}/revise`, 'POST', { resultId: first.id })).status, 400)
  assert.equal((await request(`${path}/revise`, 'POST', { resultId: first.id, notes: 'Include costs' })).status, 200)
  const second = (await submit({ summary: 'Includes costs' })).body
  assert.equal(second.version, 2)
  assert.deepEqual((await request(`${path}/result?version=1`)).body, first)
  assert.equal((await request(`${path}/approve`, 'POST', { resultId: first.id })).status, 409)
  assert.equal((await request(`${path}/approve`, 'POST', { resultId: second.id })).status, 200)
  assert.equal((await request(`${path}/approvals`)).body.length, 2)
})

test('manual APIs cannot bypass review; malformed actions and absent results fail safely', async (t) => {
  const { request, path, submit, db } = await setup(t)
  for (const status of ['approved', 'completed', 'revision_requested', 'awaiting_review']) {
    assert.equal((await request(path, 'PATCH', { status })).status, 409)
    assert.equal((await request('/tasks', 'POST', { projectId: 1, title: 'x', type: 'research', status })).status, 409)
  }
  assert.equal((await request(`${path}/approve`, 'POST', { resultId: 1 })).status, 409)
  db.prepare("UPDATE tasks SET status='awaiting_review' WHERE id=1").run()
  assert.equal((await request(`${path}/approve`, 'POST', { resultId: 1 })).status, 409)
  const result = (await submit()).body // legacy awaiting_review without a result
  for (const body of [{}, { resultId: '1' }, { resultId: result.id, status: 'completed' }, { resultId: result.id, notes: 'x'.repeat(2001) }]) assert.equal((await request(`${path}/approve`, 'POST', body)).status, 400)
  for (const body of [{ status: 'working' }, { progress: 0 }]) assert.equal((await request(path, 'PATCH', body)).status, 409)
  await request(`${path}/reject`, 'POST', { resultId: result.id })
  assert.equal((await request(path, 'PATCH', { status: 'draft' })).status, 409)
})

test('unrelated worker assignment is untouched by review', async (t) => {
  const { request, path, submit, db } = await setup(t)
  const result = (await submit()).body
  // Simulate a legacy inconsistent association without permitting it through the API.
  db.exec("UPDATE workers SET status='idle',currentTaskId=NULL WHERE id=1")
  const other = (await request('/tasks', 'POST', { projectId: 1, title: 'Other', type: 'research' })).body
  db.prepare("UPDATE tasks SET assignedWorkerId=1 WHERE id=?").run(other.id)
  db.prepare("UPDATE workers SET status='working',currentTaskId=? WHERE id=1").run(other.id)
  assert.equal((await request(`${path}/approve`, 'POST', { resultId: result.id })).status, 200)
  const worker = (await request('/workers/1')).body
  assert.equal(worker.currentTaskId, other.id)
  assert.equal(worker.status, 'working')
})

test('activity failure rolls back submission and decisions', async (t) => {
  const { db, request, path, submit } = await setup(t)
  const fail = () => db.exec("CREATE TRIGGER fail_review BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT,'internal'); END")
  fail()
  assert.equal((await submit()).status, 500)
  assert.equal((await request(`${path}/result`)).status, 404)
  assert.equal((await request(path)).body.status, 'working')
  db.exec('DROP TRIGGER fail_review')
  const result = (await submit()).body
  fail()
  assert.equal((await request(`${path}/approve`, 'POST', { resultId: result.id })).status, 500)
  assert.equal((await request(`${path}/approvals`)).body.length, 0)
  assert.equal((await request(path)).body.status, 'awaiting_review')
  assert.equal((await request('/workers/1')).body.status, 'awaiting_review')
})


test('simultaneous decisions accept exactly one review', async (t) => {
  const { request, path, submit } = await setup(t)
  const result = (await submit()).body
  const responses = await Promise.all(['approve', 'reject'].map((action) => request(`${path}/${action}`, 'POST', { resultId: result.id })))
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409])
  const approvals = (await request(`${path}/approvals`)).body
  assert.equal(approvals.length, 1)
  assert.equal((await request(path)).body.status, approvals[0].decision === 'approved' ? 'completed' : 'cancelled')
  assert.equal((await request('/workers/1')).body.currentTaskId, null)
})
