import test from 'node:test'
import assert from 'node:assert/strict'
import { createProject, createTask, taskAction } from './client.js'
const task = { id: 1, projectId: 1, title: 'Task', type: 'research', description: '', requirements: '', assignedWorkerId: null, status: 'draft', progress: 0 }
test('operator client uses explicit endpoints and validates returned records', async () => {
  const calls = []
  const fetcher = async (url, options) => { calls.push([url, JSON.parse(options.body)]); return { ok: true, json: async () => url === '/api/projects' ? { id: 1, name: 'Project', client: 'Client', description: '', status: 'active' } : url === '/api/tasks' ? task : { task, worker: null } } }
  await createProject({ name: 'Project', client: 'Client' }, fetcher)
  await createTask({ title: 'Task', projectId: 1, type: 'research' }, fetcher)
  for (const action of ['assign', 'start', 'begin-work', 'resume', 'cancel']) await taskAction(1, action, 1, fetcher)
  assert.deepEqual(calls[2], ['/api/tasks/1/assign', { workerId: 1 }])
  assert.deepEqual(calls[3], ['/api/tasks/1/start', {}])
  assert.equal(calls.length, 7)
  await assert.rejects(taskAction(1, 'execute', 1, fetcher), /Unknown/)
  await assert.rejects(createProject({}, async () => ({ ok: true, json: async () => ({}) })), /Invalid/)
  let writes = 0
  await assert.rejects(taskAction(1, 'start', undefined, async () => { writes++; return { ok: false, status: 409, json: async () => ({ error: 'Conflict' }) } }), /Conflict/)
  assert.equal(writes, 1)
})
