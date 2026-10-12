import test from 'node:test'
import assert from 'node:assert/strict'
import { mapWorkers } from './workerScene.js'
const worker = { id: 1, name: 'From backend', role: 'Analyst', department: 'research', status: 'working', currentTaskId: 7 }
const task = { id: 7, assignedWorkerId: 1, title: 'Real task', type: 'engineering', progress: 38 }
test('preserves numeric identity and task progress; maps task type to existing room', () => {
  const [bot] = mapWorkers([worker], [task])
  assert.equal(bot.id, 1)
  assert.equal(bot.name, worker.name)
  assert.equal(bot.task, task)
  assert.equal(bot.task.progress, 38)
  assert.equal(bot.destination, 'development')
  assert.equal(bot.warning, null)
})
test('missing/mismatched task and unmapped departments are safe without invented work', () => {
  assert.equal(mapWorkers([worker], [])[0].task, null)
  assert.ok(mapWorkers([worker], [])[0].warning)
  assert.equal(mapWorkers([worker], [{ ...task, assignedWorkerId: 9 }])[0].task, null)
  assert.equal(mapWorkers([{ ...worker, department: 'unknown', currentTaskId: null }], [])[0].destination, 'management')
  assert.equal(mapWorkers([{ ...worker, currentTaskId: null }], [])[0].warning, null)
  assert.equal(mapWorkers([worker], [{ ...task, type: 'custom' }])[0].destination, 'research')
  assert.deepEqual(mapWorkers([], []), [])
})
