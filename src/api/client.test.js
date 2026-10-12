import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchOperations, validateRecords, InvalidResponse } from './client.js'

test('loads all four collections as one snapshot using relative API URLs', async () => {
  const calls = []
  const signal = new AbortController().signal
  const result = await fetchOperations(signal, async (url, options) => { calls.push(url); assert.equal(options.signal, signal); return { ok: true, json: async () => [] } })
  assert.deepEqual(calls, ['/api/workers', '/api/tasks', '/api/activity', '/api/projects'])
  assert.deepEqual(result, { workers: [], tasks: [], activity: [], projects: [] })
})
test('rejects malformed collections, duplicate IDs, bad status/progress and failed requests', async () => {
  const worker = { id: 1, name: 'Research', role: 'Research', department: 'research', status: 'idle', currentTaskId: null }
  assert.deepEqual(validateRecords('workers', [worker]), [worker])
  for (const value of [null, {}, [null], [{ ...worker, id: '1' }], [{ ...worker, status: 'fake' }], [worker, worker]]) assert.throws(() => validateRecords('workers', value), InvalidResponse)
  assert.throws(() => validateRecords('tasks', [{ id: 1, projectId: 1, title: 'a', description: '', requirements: '', type: 'research', assignedWorkerId: 1, status: 'working', progress: 101 }]), InvalidResponse)
  assert.throws(() => validateRecords('tasks', [{ id: 1, projectId: 1, title: 'a', description: '', requirements: '', type: 'research', assignedWorkerId: null, status: 'draft', progress: 0, latestResult: { id: 1, version: 1, summary: {} } }]), InvalidResponse)
  await assert.rejects(fetchOperations(undefined, async () => ({ ok: false, status: 500 })), /500/)
  await assert.rejects(fetchOperations(undefined, async () => ({ ok: true, json: async () => { throw new Error('bad JSON') } })), InvalidResponse)
})
