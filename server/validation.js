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

export function resultPayload(body) {
  const narrative = ['summary', 'recommendation', 'reasoning', 'securityConsiderations', 'limitations', 'rawOutput']
  bodyFields(body, [...narrative, 'sources'])
  const result = Object.fromEntries(narrative.map((field) => [field, text(body[field], field, { optional: field !== 'summary', max: 10000 })]))
  const sources = body.sources === undefined ? [] : body.sources
  if (!Array.isArray(sources) || sources.length > 20) throw new ApiError(400, 'sources must be an array of at most 20 entries')
  result.sources = sources.map((source) => {
    bodyFields(source, ['label', 'url'])
    const entry = { label: text(source.label, 'source label') }
    if (source.url !== undefined) {
      entry.url = text(source.url, 'source URL', { max: 2048 })
      let url
      try { url = new URL(entry.url) } catch { throw new ApiError(400, 'Invalid source URL') }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new ApiError(400, 'Source URL must use HTTP/HTTPS without credentials')
    }
    return entry
  })
  return result
}

export function allowManualTaskStatus(status, existing) {
  if (['approved', 'completed', 'revision_requested', 'awaiting_review'].includes(status)) {
    throw new ApiError(409, 'Use result submission or explicit review endpoints for this state')
  }
  if (existing?.status === 'awaiting_review' || existing?.status === 'approved') throw new ApiError(409, 'Pending review cannot be changed through task PATCH')
}
