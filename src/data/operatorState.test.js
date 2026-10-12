import test from 'node:test'
import assert from 'node:assert/strict'
import { availableWorkers, taskActions } from './operatorState.js'
test('operator controls offer only valid actions and available workers', () => {
  const workers = [{ id: 1, status: 'idle', currentTaskId: null }, { id: 2, status: 'working', currentTaskId: 7 }]
  assert.deepEqual(availableWorkers(workers, [], 3).map((w) => w.id), [1])
  assert.deepEqual(availableWorkers(workers, [{ id: 4, assignedWorkerId: 1, status: 'assigned' }], 3), [])
  assert.deepEqual(taskActions({ status: 'awaiting_review' }), [])
  assert.deepEqual(taskActions({ status: 'revision_requested' }), ['resume', 'cancel'])
  assert.deepEqual(taskActions({ status: 'traveling' }), ['begin-work', 'cancel'])
})
