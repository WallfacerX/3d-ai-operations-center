import { connections, departments, getDepartment } from '../data/facility.js'
import { taskCatalog, workers } from '../data/workflows.js'

export const TRAVEL_SPEED = 2.4
export const IDLE_DURATION = 1
export const COMPLETED_DURATION = 2
const MAX_EVENTS = 12

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

export function createSimulation() {
  return {
    elapsed: 0,
    completed: 0,
    totals: Object.fromEntries(departments.map(({ id }) => [id, 0])),
    events: [],
    bots: workers.map((worker, index) => ({
      ...worker, lane: [(index % 2 ? 1 : -1) * 0.55, (index < 2 ? 1 : -1) * 0.45], status: 'idle', currentDepartment: worker.home,
      destination: null, task: null, taskIndex: 0, cycle: 1,
      phaseElapsed: 0, phaseDuration: IDLE_DURATION + index * 0.6,
      route: [worker.home], routeLength: 0, progress: 0, completed: 0, lastResult: null,
    })),
  }
}

function record(state, bot, at, message) {
  state.events.unshift({ id: `${bot.id}-${bot.cycle}-${bot.taskIndex}-${bot.status}`, at, bot: bot.name, message })
}

function assign(bot) {
  const template = taskCatalog[bot.workflow[bot.taskIndex]]
  bot.task = { ...template, id: `${bot.id}-${bot.cycle}-${bot.taskIndex}` }
  bot.destination = template.department
  bot.route = findRoute(bot.currentDepartment, bot.destination)
  bot.routeLength = bot.route.slice(1).reduce((sum, id, i) => sum + distance(bot.route[i], id), 0)
  bot.phaseElapsed = 0
  bot.progress = 0
  if (bot.routeLength === 0) {
    bot.status = 'working'
    bot.phaseDuration = bot.task.duration
  } else {
    bot.status = 'traveling'
    bot.currentDepartment = null
    bot.phaseDuration = bot.routeLength / TRAVEL_SPEED
  }
}

// Pure, elapsed-time state transition. No React, browser, wall clock, or network dependencies.
export function advanceSimulation(previous, seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('seconds must be finite and non-negative')
  if (seconds === 0) return previous
  const state = { ...previous, elapsed: previous.elapsed + seconds, totals: { ...previous.totals }, events: [...previous.events] }
  state.bots = previous.bots.map((original) => {
    const bot = { ...original }
    let remaining = seconds
    while (remaining > 1e-9) {
      const slice = Math.min(remaining, bot.phaseDuration - bot.phaseElapsed)
      bot.phaseElapsed += slice
      remaining -= slice
      bot.progress = bot.status === 'working' || bot.status === 'traveling' ? Math.min(1, bot.phaseElapsed / bot.phaseDuration) : bot.status === 'completed' ? 1 : 0
      if (bot.phaseElapsed + 1e-9 < bot.phaseDuration) break
      const at = state.elapsed - remaining
      if (bot.status === 'idle') {
        assign(bot)
        record(state, bot, at, `${bot.status === 'working' ? 'Started' : 'Assigned'}: ${bot.task.title}`)
      } else if (bot.status === 'traveling') {
        bot.currentDepartment = bot.destination
        bot.status = 'working'
        bot.phaseElapsed = 0
        bot.phaseDuration = bot.task.duration
        bot.progress = 0
        record(state, bot, at, `Arrived at ${getDepartment(bot.destination).name}`)
      } else if (bot.status === 'working') {
        bot.status = 'completed'
        bot.phaseElapsed = 0
        bot.phaseDuration = COMPLETED_DURATION
        bot.progress = 1
        bot.completed += 1
        bot.lastResult = bot.task.result
        state.completed += 1
        state.totals[bot.currentDepartment] += 1
        record(state, bot, at, bot.lastResult)
      } else {
        bot.taskIndex = (bot.taskIndex + 1) % bot.workflow.length
        if (bot.taskIndex === 0) bot.cycle += 1
        bot.status = 'idle'
        bot.task = null
        bot.destination = null
        bot.phaseElapsed = 0
        bot.phaseDuration = IDLE_DURATION
        bot.progress = 0
      }
    }
    return bot
  })
  state.events.sort((a, b) => b.at - a.at)
  state.events.length = Math.min(MAX_EVENTS, state.events.length)
  return state
}

// Writes into an existing vector-like object to avoid allocations in the render loop.
export function writeBotPosition(bot, target) {
  if (bot.status !== 'traveling') {
    const p = getDepartment(bot.currentDepartment).position
    target.x = p[0] + bot.lane[0]; target.y = 2; target.z = p[2] + bot.lane[1]
    return target
  }
  let remaining = bot.routeLength * bot.progress
  for (let i = 1; i < bot.route.length; i += 1) {
    const length = distance(bot.route[i - 1], bot.route[i])
    if (remaining <= length || i === bot.route.length - 1) {
      const p = getDepartment(bot.route[i - 1]).position
      const q = getDepartment(bot.route[i]).position
      const t = Math.min(1, remaining / length)
      target.x = p[0] + (q[0] - p[0]) * t + bot.lane[0]
      target.y = 2
      target.z = p[2] + (q[2] - p[2]) * t + bot.lane[1]
      return target
    }
    remaining -= length
  }
  return target
}
