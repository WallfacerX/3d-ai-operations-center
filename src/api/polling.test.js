import test from 'node:test'
import assert from 'node:assert/strict'
import { startPolling } from './polling.js'
import { InvalidResponse } from './client.js'
const flush = () => new Promise((resolve) => setImmediate(resolve))
function harness(load) {
  const timers = new Map()
  let nextId = 0
  let listener
  const visibility = { hidden: false, addEventListener: (_name, fn) => { listener = fn }, removeEventListener: () => { listener = null } }
  const updates = []
  const stop = startPolling((value) => updates.push(value), { load, visibility, now: () => 42, schedule: (fn, ms) => { timers.set(++nextId, { fn, ms }); return nextId }, cancel: (id) => timers.delete(id) })
  return { stop, updates, visibility, change: () => listener?.(), timers, fire: (ms) => { const entry = [...timers].find(([, timer]) => timer.ms === ms); assert.ok(entry); timers.delete(entry[0]); entry[1].fn() } }
}
test('one batch at a time, schedule after settlement, unmount cancels and ignores late data', async () => {
  let resolve
  let calls = 0
  let signal
  const h = harness((s) => { calls++; signal = s; return new Promise((r) => { resolve = r }) })
  assert.equal(calls, 1)
  assert.equal([...h.timers.values()].some((timer) => timer.ms === 3000), false)
  h.change()
  assert.equal(calls, 1)
  resolve({ workers: [], tasks: [], activity: [] })
  await flush()
  assert.equal(h.updates[0].status, 'connected')
  assert.equal(h.updates[0].updatedAt, 42)
  h.fire(3000)
  assert.equal(calls, 2)
  h.stop()
  assert.equal(signal.aborted, true)
  resolve({})
  await flush()
  assert.equal(h.updates.length, 1)
  assert.equal(h.timers.size, 0)
})
test('timeout recovers, malformed data is distinguished, hidden tabs stop scheduled polls', async () => {
  let attempt = 0
  const h = harness(() => { attempt++; return attempt === 1 ? new Promise(() => {}) : attempt === 2 ? Promise.reject(new InvalidResponse('bad')) : Promise.resolve({ workers: [], tasks: [], activity: [] }) })
  h.fire(5000)
  await flush()
  assert.equal(h.updates.at(-1).status, 'offline')
  h.fire(3000)
  await flush()
  assert.equal(h.updates.at(-1).status, 'invalid')
  h.visibility.hidden = true
  h.change()
  assert.equal(h.timers.size, 0)
  h.visibility.hidden = false
  h.change()
  await flush()
  assert.equal(h.updates.at(-1).status, 'connected')
  h.stop()
})


test('hiding or unmounting aborts even an unresponsive load without an offline update', async () => {
  let signal
  const h = harness((value) => { signal = value; return new Promise(() => {}) })
  h.visibility.hidden = true
  h.change()
  await flush()
  assert.equal(signal.aborted, true)
  assert.equal(h.timers.size, 0)
  assert.equal(h.updates.length, 0)
  h.visibility.hidden = false
  h.change()
  h.stop()
  await flush()
  assert.equal(h.timers.size, 0)
  assert.equal(h.updates.length, 0)
})

test('manual refresh invalidates an in-flight read and publishes only fresh data', async () => {
  const resolvers = []
  const h = harness(() => new Promise((resolve) => resolvers.push(resolve)))
  h.stop.refresh()
  await flush()
  assert.equal(resolvers.length, 2)
  resolvers[0]({ stale: true })
  resolvers[1]({ fresh: true })
  await flush()
  assert.equal(h.updates.length, 1)
  assert.deepEqual(h.updates[0].data, { fresh: true })
  h.stop()
})
