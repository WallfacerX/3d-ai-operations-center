const workerStates = new Set(['idle', 'assigned', 'traveling', 'working', 'awaiting_review', 'error'])
const taskStates = new Set(['draft', 'queued', 'assigned', 'traveling', 'working', 'awaiting_review', 'approved', 'completed', 'revision_requested', 'failed', 'cancelled'])
const id = (value) => Number.isSafeInteger(value) && value > 0
const nullableId = (value) => value === null || id(value)
const text = (value) => typeof value === 'string'
const timestamp = (value) => text(value) && Number.isFinite(Date.parse(value))

export class InvalidResponse extends Error {}

export function validateRecords(kind, data) {
  const validators = {
    workers: (r) => id(r.id) && ['name', 'role', 'department'].every((key) => text(r[key])) && workerStates.has(r.status) && nullableId(r.currentTaskId),
    tasks: (r) => id(r.id) && id(r.projectId) && ['title', 'description', 'requirements', 'type'].every((key) => text(r[key])) && nullableId(r.assignedWorkerId) && taskStates.has(r.status) && typeof r.progress === 'number' && Number.isFinite(r.progress) && r.progress >= 0 && r.progress <= 100,
    activity: (r) => id(r.id) && ['projectId', 'taskId', 'workerId'].every((key) => nullableId(r[key])) && text(r.event) && text(r.message) && timestamp(r.timestamp),
  }
  if (!Array.isArray(data) || !data.every((record) => record && validators[kind](record)) || new Set(data.map((record) => record.id)).size !== data.length) {
    throw new InvalidResponse(`Invalid ${kind} response`)
  }
  return data
}

export async function fetchOperations(signal, fetcher = fetch) {
  const kinds = ['workers', 'tasks', 'activity']
  const results = await Promise.all(kinds.map(async (kind) => {
    const response = await fetcher(`/api/${kind}`, { signal, cache: 'no-store' })
    if (!response.ok) throw new Error(`Request failed (${response.status})`)
    let data
    try { data = await response.json() } catch { throw new InvalidResponse(`Invalid ${kind} JSON`) }
    return validateRecords(kind, data)
  }))
  return Object.fromEntries(kinds.map((kind, index) => [kind, results[index]]))
}
