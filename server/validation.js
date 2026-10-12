export const taskStates = ['draft', 'queued', 'assigned', 'traveling', 'working', 'awaiting_review', 'approved', 'completed', 'revision_requested', 'failed', 'cancelled']
export const workerStates = ['idle', 'assigned', 'traveling', 'working', 'awaiting_review', 'error']

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
export function bodyFields(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'A JSON object is required')
  for (const key of Object.keys(body)) if (!allowed.includes(key)) throw new ApiError(400, `Unknown field: ${key}`)
}
export function text(value, field, { optional = false, max = 256 } = {}) {
  if (value === undefined && optional) return ''
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) {
    throw new ApiError(400, `${field} must be ${optional ? 'a' : 'a nonblank'} string of at most ${max} characters`)
  }
  return value.trim()
}
export function id(value, field = 'id', { nullable = false, path = false } = {}) {
  if (nullable && value === null) return null
  if (path && typeof value === 'string' && /^[1-9]\d*$/.test(value)) value = Number(value)
  if (!Number.isSafeInteger(value) || value <= 0) throw new ApiError(400, `${field} must be a positive integer`)
  return value
}
export function state(value, allowed, field = 'status') {
  if (!allowed.includes(value)) throw new ApiError(400, `Invalid ${field}`)
  return value
}
export function progress(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) throw new ApiError(400, 'progress must be a number from 0 to 100')
  return value
}
// Table names come only from route constants, never request input.
export function requireRecord(db, table, recordId, status = 404) {
  const record = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(recordId)
  if (!record) throw new ApiError(status, `${table} record not found`)
  return record
}
