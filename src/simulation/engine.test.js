import test from 'node:test'
import assert from 'node:assert/strict'
import { advanceSimulation, createSimulation, findRoute, writeBotPosition } from './engine.js'
import { connections, departments, getDepartment } from '../data/facility.js'

test('every department pair has a route made only of visible links', () => {
  for (const from of departments) for (const to of departments) {
    const route = findRoute(from.id, to.id)
    assert.equal(route[0], from.id)
    assert.equal(route.at(-1), to.id)
    for (let i = 1; i < route.length; i++) assert.ok(connections.some(([a, b]) => a === route[i - 1] && b === route[i] || b === route[i - 1] && a === route[i]))
  }
})

test('worker starts, performs work, completes, travels, arrives and repeats', () => {
  let state = createSimulation()
  state = advanceSimulation(state, 1)
  assert.equal(state.bots[0].status, 'working')
  state = advanceSimulation(state, 6)
  assert.equal(state.bots[0].progress, 0.5)
  state = advanceSimulation(state, 6)
  assert.equal(state.bots[0].status, 'completed')
  assert.match(state.bots[0].lastResult, /Research brief/)
  assert.equal(state.totals.research, 1)
  state = advanceSimulation(state, 3)
  let bot = state.bots[0]
  assert.equal(bot.status, 'traveling')
  assert.equal(bot.currentDepartment, null)
  assert.equal(bot.destination, 'database')
  state = advanceSimulation(state, bot.phaseDuration / 2)
  bot = state.bots[0]
  const position = writeBotPosition(bot, {})
  assert.ok(Number.isFinite(position.x) && Number.isFinite(position.z))
  state = advanceSimulation(state, bot.phaseDuration / 2)
  assert.equal(state.bots[0].status, 'working')
  assert.equal(state.bots[0].currentDepartment, 'database')
  assert.equal(state.bots[0].progress, 0)
  const arrived = writeBotPosition(state.bots[0], {})
  assert.equal(arrived.z, getDepartment('database').position[2] + state.bots[0].lane[1])
  state = advanceSimulation(state, 180)
  assert.ok(state.bots.every((worker) => worker.cycle > 1))
})

test('simulation is deterministic, immutable and independent of step size', () => {
  const initial = createSimulation()
  const snapshot = JSON.stringify(initial)
  const single = advanceSimulation(initial, 300)
  let stepped = createSimulation()
  for (let i = 0; i < 3000; i++) stepped = advanceSimulation(stepped, 0.1)
  assert.equal(JSON.stringify(initial), snapshot)
  assert.deepEqual(single, advanceSimulation(createSimulation(), 300))
  assert.equal(single.completed, stepped.completed)
  single.bots.forEach((bot, index) => {
    assert.equal(bot.status, stepped.bots[index].status)
    assert.equal(bot.task.id, stepped.bots[index].task.id)
    assert.ok(Math.abs(bot.progress - stepped.bots[index].progress) < 1e-8)
  })
})

test('long-running simulation stays bounded and visits every department', () => {
  const state = advanceSimulation(createSimulation(), 3600)
  assert.ok(Object.values(state.totals).every((count) => count > 0))
  assert.equal(Object.values(state.totals).reduce((a, b) => a + b, 0), state.completed)
  assert.equal(state.events.length, 12)
  assert.equal(new Set(state.events.map((event) => event.id)).size, state.events.length)
  assert.ok(state.events.every((event, index) => index === 0 || event.at <= state.events[index - 1].at))
  for (const bot of state.bots) {
    assert.ok(bot.progress >= 0 && bot.progress <= 1)
    if (bot.status === 'working') assert.equal(bot.currentDepartment, bot.task.department)
  }
})

test('zero time is a no-op and invalid time fails explicitly', () => {
  const state = createSimulation()
  assert.equal(advanceSimulation(state, 0), state)
  for (const value of [-1, NaN, Infinity]) assert.throws(() => advanceSimulation(state, value), RangeError)
})
