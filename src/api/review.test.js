import test from 'node:test'
import assert from 'node:assert/strict'
import { getTaskResult, getTaskApprovals, approveTask, reviseTask, rejectTask, createTaskResult, InvalidResponse } from './client.js'
const result = { id: 7, taskId: 1, version: 2, summary: 'Demo', recommendation: '', reasoning: '', securityConsiderations: '', limitations: '', rawOutput: '', sources: [], createdAt: '2026-01-01T00:00:00Z' }
const task = { id: 1, projectId: 1, title: 'a', description: '', requirements: '', type: 'research', assignedWorkerId: 1, status: 'completed', progress: 100 }
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })
test('result/history reads validate payload and treat missing result as empty', async () => {
  assert.equal(await getTaskResult(1, {}, async () => response({}, 404)), null)
  assert.deepEqual(await getTaskResult(1, { version: 2 }, async (url) => { assert.equal(url, '/api/tasks/1/result?version=2'); return response(result) }), result)
  await assert.rejects(getTaskResult(1, {}, async () => response({ ...result, taskId: 2 })), InvalidResponse)
  await assert.rejects(getTaskApprovals(1, undefined, async () => response({})), InvalidResponse)
  assert.deepEqual(await getTaskApprovals(1, undefined, async () => response([])), [])
  assert.deepEqual(await createTaskResult(1, { summary: 'Demo' }, undefined, async () => response(result, 201)), result)
})
test('review methods use explicit routes, result identity and notes; failed writes are never retried', async () => {
  for (const [method, action] of [[approveTask, 'approve'], [reviseTask, 'revise'], [rejectTask, 'reject']]) {
    let count = 0
    await method(1, 7, 'Note', async (url, options) => {
      count++
      assert.equal(url, `/api/tasks/1/${action}`)
      assert.equal(options.method, 'POST')
      assert.deepEqual(JSON.parse(options.body), { resultId: 7, notes: 'Note' })
      return response({ task, approval: { resultId: 7 } })
    })
    assert.equal(count, 1)
  }
  let calls = 0
  await assert.rejects(approveTask(1, 7, '', async () => { calls++; return response({ error: 'Already reviewed' }, 409) }), /Already reviewed/)
  assert.equal(calls, 1)
})
