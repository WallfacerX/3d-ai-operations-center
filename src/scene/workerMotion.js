import { connections, departments, getDepartment } from '../data/facility.js'

const distance = (a, b) => {
  const p = getDepartment(a).position
  const q = getDepartment(b).position
  return Math.hypot(p[0] - q[0], p[2] - q[2])
}

// Dijkstra over the visible links: workers never teleport or invent a connection.
export function findRoute(from, to) {
  const costs = Object.fromEntries(departments.map(({ id }) => [id, Infinity]))
  const previous = {}
  const pending = new Set(departments.map(({ id }) => id))
  costs[from] = 0
  while (pending.size) {
    const current = [...pending].reduce((a, b) => costs[a] <= costs[b] ? a : b)
    if (costs[current] === Infinity) break
    if (current === to) {
      const path = [to]
      while (path[0] !== from) path.unshift(previous[path[0]])
      return path
    }
    pending.delete(current)
    for (const [a, b] of connections) {
      const next = a === current ? b : b === current ? a : null
      if (!pending.has(next)) continue
      const cost = costs[current] + distance(current, next)
      if (cost < costs[next]) { costs[next] = cost; previous[next] = current }
    }
  }
  throw new Error(`No route from ${from} to ${to}`)
}


export const TRAVEL_SPEED = 2.4

function point(department, lane) {
  const p = getDepartment(department).position
  return { x: p[0] + lane[0], y: 2, z: p[2] + lane[1] }
}

export function createMotion(bot) {
  const department = ['working', 'awaiting_review', 'error'].includes(bot.status) ? bot.destination : 'management'
  return { position: point(department, bot.lane), anchor: department, key: null, points: [], index: 0, elapsed: 0 }
}

// Rebuild only when status/destination changes, never when another poll returns identical data.
export function updateMotion(motion, bot) {
  const key = `${bot.status}:${bot.destination}:${bot.lane.join(',')}`
  if (motion.key === key) return
  motion.key = key
  motion.points = []
  motion.index = 0
  if (bot.status === 'assigned' || bot.status === 'error') return
  const target = bot.status === 'idle' ? 'management' : bot.destination
  // Finish the current graph segment first if an update arrives mid-flight.
  const route = findRoute(motion.anchor, target)
  motion.points = route.map((id) => ({ ...point(id, bot.lane), department: id }))
}

// Mutates reusable presentation state only. Arrival never changes persisted business state.
export function advanceMotion(motion, seconds, online) {
  if (!online) return motion.position
  motion.elapsed += seconds
  let remaining = Math.min(seconds, 0.1) * TRAVEL_SPEED
  while (remaining > 0 && motion.index < motion.points.length) {
    const target = motion.points[motion.index]
    const dx = target.x - motion.position.x
    const dz = target.z - motion.position.z
    const length = Math.hypot(dx, dz)
    if (length <= remaining) {
      motion.position.x = target.x
      motion.position.z = target.z
      motion.anchor = target.department
      motion.index += 1
      remaining -= length
    } else {
      motion.position.x += dx / length * remaining
      motion.position.z += dz / length * remaining
      // Anchor is the segment endpoint, so retargeting continues along this segment.
      motion.anchor = target.department
      remaining = 0
    }
  }
  return motion.position
}
