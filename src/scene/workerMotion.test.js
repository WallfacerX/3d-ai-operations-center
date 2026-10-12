import test from 'node:test'
import assert from 'node:assert/strict'
import { createMotion, updateMotion, advanceMotion } from './workerMotion.js'
const bot = { id: 1, status: 'idle', destination: 'research', lane: [-0.55, 0.45] }
test('travel is continuous, polling cannot restart it, arrival does not change worker status', () => {
  const motion = createMotion(bot)
  assert.equal(motion.position.x, -0.55)
  updateMotion(motion, { ...bot, status: 'assigned' })
  advanceMotion(motion, 0.1, true)
  assert.equal(motion.position.x, -0.55)
  const traveling = { ...bot, status: 'traveling' }
  updateMotion(motion, traveling)
  advanceMotion(motion, 0.1, true)
  const x = motion.position.x
  const points = motion.points
  updateMotion(motion, { ...traveling })
  assert.equal(motion.points, points)
  advanceMotion(motion, 0.1, true)
  assert.ok(motion.position.x < x)
  for (let i = 0; i < 100; i++) advanceMotion(motion, 0.1, true)
  assert.equal(motion.position.x, -6.55)
  assert.equal(motion.position.z, 0.45)
  assert.equal(traveling.status, 'traveling')
  const before = { ...motion.position }
  updateMotion(motion, { ...traveling, status: 'working' })
  advanceMotion(motion, 0.1, true)
  assert.deepEqual(motion.position, before)
})
test('offline freezes animation and retargeting starts from current position', () => {
  const motion = createMotion(bot)
  updateMotion(motion, { ...bot, status: 'traveling' })
  advanceMotion(motion, 0.1, true)
  const before = { ...motion.position }
  const elapsed = motion.elapsed
  advanceMotion(motion, 5, false)
  assert.deepEqual(motion.position, before)
  assert.equal(motion.elapsed, elapsed)
  updateMotion(motion, { ...bot, status: 'traveling', destination: 'database' })
  assert.deepEqual(motion.position, before)
  advanceMotion(motion, 0.1, true)
  assert.ok(Math.hypot(motion.position.x - before.x, motion.position.z - before.z) <= 0.241)
})
test('review loads at the department, remains still, and idle returns to staging', () => {
  const motion = createMotion({ ...bot, status: 'awaiting_review' })
  assert.equal(motion.position.x, -6.55)
  updateMotion(motion, { ...bot, status: 'awaiting_review' })
  advanceMotion(motion, 0.1, true)
  assert.equal(motion.position.x, -6.55)
  updateMotion(motion, bot)
  for (let i = 0; i < 100; i++) advanceMotion(motion, 0.1, true)
  assert.equal(motion.position.x, -0.55)
})
