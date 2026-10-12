const workerStates = new Set(['idle', 'assigned', 'traveling', 'working', 'awaiting_review', 'error'])
const taskStates = new Set(['draft', 'queued', 'assigned', 'traveling', 'working', 'awaiting_review', 'approved', 'completed', 'revision_requested', 'failed', 'cancelled'])
const id = (value) => Number.isSafeInteger(value) && value > 0
const nullableId = (value) => value === null || id(value)
const text = (value) => typeof value === 'string'
const resultSummary = (r) => r == null || (id(r.id) && id(r.version) && text(r.summary))
const revisionSummary = (r) => r == null || (id(r.id) && text(r.notes) && timestamp(r.createdAt))
const timestamp = (value) => text(value) && Number.isFinite(Date.parse(value))

export class InvalidResponse extends Error {}

export function validateRecords(kind, data) {
  const validators = {
    projects: (r) => id(r.id) && ['name', 'client', 'description', 'status'].every((key) => text(r[key])),
    workers: (r) => id(r.id) && ['name', 'role', 'department'].every((key) => text(r[key])) && workerStates.has(r.status) && nullableId(r.currentTaskId),
    tasks: (r) => id(r.id) && id(r.projectId) && ['title', 'description', 'requirements', 'type'].every((key) => text(r[key])) && nullableId(r.assignedWorkerId) && taskStates.has(r.status) && typeof r.progress === 'number' && Number.isFinite(r.progress) && r.progress >= 0 && r.progress <= 100 && resultSummary(r.latestResult) && revisionSummary(r.latestRevision),
    activity: (r) => id(r.id) && ['projectId', 'taskId', 'workerId'].every((key) => nullableId(r[key])) && text(r.event) && text(r.message) && timestamp(r.timestamp),
  }
  if (!Array.isArray(data) || !data.every((record) => record && validators[kind](record)) || new Set(data.map((record) => record.id)).size !== data.length) {
    throw new InvalidResponse(`Invalid ${kind} response`)
  }
  return data
}

export async function fetchOperations(signal, fetcher = fetch) {
  const kinds = ['workers', 'tasks', 'activity', 'projects']
  const results = await Promise.all(kinds.map(async (kind) => {
    const response = await fetcher(`/api/${kind}`, { signal, cache: 'no-store' })
    if (!response.ok) throw new Error(`Request failed (${response.status})`)
    let data
    try { data = await response.json() } catch { throw new InvalidResponse(`Invalid ${kind} JSON`) }
    return validateRecords(kind, data)
  }))
  return Object.fromEntries(kinds.map((kind, index) => [kind, results[index]]))
}

async function reviewRequest(path, { method = 'GET', body, signal, missing = false } = {}, fetcher = fetch) {
  const response = await fetcher(`/api${path}`, { method, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000), cache: 'no-store', ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) })
  if (missing && response.status === 404) return null
  let data
  try { data = await response.json() } catch { throw new InvalidResponse('Invalid review response') }
  if (!response.ok) {
    const error = new Error(typeof data.error === 'string' ? data.error : `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }
  return data
}
function validResult(result) {
  return result && id(result.id) && id(result.taskId) && id(result.version) && ['summary', 'recommendation', 'reasoning', 'securityConsiderations', 'limitations', 'rawOutput'].every((key) => text(result[key])) && timestamp(result.createdAt) && Array.isArray(result.sources) && result.sources.every((source) => source && text(source.label) && (source.url === undefined || text(source.url)))
}
export async function getTaskResult(taskId, { signal, version } = {}, fetcher = fetch) {
  const result = await reviewRequest(`/tasks/${taskId}/result${version === undefined ? '' : `?version=${version}`}`, { signal, missing: true }, fetcher)
  if (result !== null && (!validResult(result) || result.taskId !== taskId)) throw new InvalidResponse('Invalid task result')
  return result
}
export async function getTaskApprovals(taskId, signal, fetcher = fetch) {
  const data = await reviewRequest(`/tasks/${taskId}/approvals`, { signal }, fetcher)
  if (!Array.isArray(data) || !data.every((r) => id(r.id) && r.taskId === taskId && id(r.resultId) && id(r.resultVersion) && ['approved', 'revision_requested', 'rejected'].includes(r.decision) && text(r.notes) && timestamp(r.createdAt))) throw new InvalidResponse('Invalid approval history')
  return data
}
export async function createTaskResult(taskId, body, signal, fetcher = fetch) {
  const result = await reviewRequest(`/tasks/${taskId}/result`, { method: 'POST', body, signal }, fetcher)
  if (!validResult(result) || result.taskId !== taskId) throw new InvalidResponse('Invalid created result')
  return result
}
async function reviewTask(taskId, action, resultId, notes, fetcher) {
  const data = await reviewRequest(`/tasks/${taskId}/${action}`, { method: 'POST', body: { resultId, notes } }, fetcher)
  if (data?.task?.id !== taskId || data?.approval?.resultId !== resultId) throw new InvalidResponse('Invalid review decision response')
  validateRecords('tasks', [data.task])
  return data
}
export const approveTask = (taskId, resultId, notes = '', fetcher = fetch) => reviewTask(taskId, 'approve', resultId, notes, fetcher)
export const reviseTask = (taskId, resultId, notes, fetcher = fetch) => reviewTask(taskId, 'revise', resultId, notes, fetcher)
export const rejectTask = (taskId, resultId, notes = '', fetcher = fetch) => reviewTask(taskId, 'reject', resultId, notes, fetcher)

export async function createProject(body, fetcher = fetch) {
  const data = await reviewRequest('/projects', { method: 'POST', body }, fetcher)
  validateRecords('projects', [data])
  return data
}
export async function createTask(body, fetcher = fetch) {
  const data = await reviewRequest('/tasks', { method: 'POST', body }, fetcher)
  validateRecords('tasks', [data])
  return data
}
export async function taskAction(taskId, action, workerId, fetcher = fetch) {
  if (!['assign', 'start', 'begin-work', 'resume', 'cancel'].includes(action)) throw new Error('Unknown task action')
  const data = await reviewRequest(`/tasks/${taskId}/${action}`, { method: 'POST', body: action === 'assign' ? { workerId } : {} }, fetcher)
  validateRecords('tasks', [data.task])
  if (data.worker !== null) validateRecords('workers', [data.worker])
  return data
}
