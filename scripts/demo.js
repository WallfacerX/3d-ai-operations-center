const base = 'http://127.0.0.1:3001/api'
const title = 'Milestone 2: Research visualization demo'
const marker = 'Manual demonstration task. No AI execution.'
const steps = ['setup', 'idle', 'assigned', 'traveling', 'working', 'result', 'review', 'new']
const step = process.argv[2]

async function request(path, method = 'GET', body, missing = false) {
  const response = await fetch(`${base}${path}`, {
    method, signal: AbortSignal.timeout(5000),
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  if (missing && response.status === 404) return null
  const data = await response.json()
  if (!response.ok) throw new Error(`${method} ${path}: ${data.error ?? response.status}`)
  return data
}

async function run() {
  if (!steps.includes(step) || process.argv.length !== 3) throw new Error(`Usage: npm run demo -- ${steps.join('|')}`)
  const [workers, projects, tasks] = await Promise.all([request('/workers'), request('/projects'), request('/tasks')])
  const worker = workers.find((item) => item.name === 'Research Bot 01' && item.department === 'research')
  const project = projects.find((item) => item.name === 'Internal Prototype' && item.client === 'Magnium Technology Solutions')
  if (!worker || !project) throw new Error('Expected seeded research worker and Internal Prototype project are missing.')
  let task = tasks.sort((a, b) => b.id - a.id).find((item) => item.projectId === project.id && item.title === title && item.description === marker)
  if (worker.currentTaskId !== null && worker.currentTaskId !== task?.id) throw new Error('Worker has an unrelated current task; refusing to replace it.')
  if (task && task.assignedWorkerId !== null && task.assignedWorkerId !== worker.id) throw new Error('Demo task is assigned to another worker; refusing to replace that assignment.')
  if (step === 'new') {
    if (worker.currentTaskId !== null || (task && !['completed', 'cancelled'].includes(task.status))) throw new Error('Finish the current demo review before creating another task.')
    task = null
  }
  if (!task) {
    if (!['setup', 'new'].includes(step)) throw new Error('Run npm run demo -- setup first.')
    task = await request('/tasks', 'POST', { projectId: project.id, title, description: marker, requirements: 'Inspect the 3D worker, task progress, and activity feed.', type: 'research' })
  }
  if (['setup', 'new'].includes(step)) { console.log(`Demo task #${task.id} ready; worker #${worker.id}. Run idle, assigned, traveling, working, then result; make the decision in the HUD. Setup did not advance worker state.`); return }
  if (['result', 'review'].includes(step)) {
    const existing = await request(`/tasks/${task.id}/result`, 'GET', undefined, true)
    if (task.status === 'awaiting_review' && existing) { console.log(`Result version ${existing.version} is already awaiting human review. No duplicate created.`); return }
    await request(`/tasks/${task.id}/result`, 'POST', {
      summary: 'SAMPLE / SIMULATED: Compared three website platform options.',
      recommendation: 'Wix Studio (illustrative demo choice, not researched).',
      reasoning: 'Sample rationale: low maintenance and editor usability.',
      securityConsiderations: 'Sample consideration: managed hosting reduces direct server administration.',
      limitations: 'No external research was performed. Pricing and feature availability may change.',
      sources: [{ label: 'Fictional platform comparison', url: 'https://example.invalid/platforms' }],
    })
    console.log(`Task #${task.id} has a persisted sample result and is awaiting human review. Use Approve, Request revision, or Reject in the HUD.`)
    return
  }
  if (['awaiting_review', 'completed', 'cancelled'].includes(task.status)) throw new Error('Use the HUD to decide pending review, or run new after a terminal decision. History is preserved.')
  if (step === 'idle') {
    if (task.status !== 'draft' || worker.currentTaskId !== null) throw new Error('Idle is only available before assignment; cancel/finish active work in the UI.')
  } else {
    const action = { assigned: 'assign', traveling: 'start', working: task.status === 'revision_requested' ? 'resume' : 'begin-work' }[step]
    await request(`/tasks/${task.id}/${action}`, 'POST', action === 'assign' ? { workerId: worker.id } : {})
  }
  console.log(`Worker #${worker.id}, task #${task.id}: ${step}. Allow a polling cycle (about 3 seconds) to see the change. Travel normally takes another 3–4 seconds.`)
}
run().catch((error) => { console.error(`Demo stopped: ${error.message}. Earlier successful API calls may already be saved; inspect the HUD/API before retrying.`); process.exitCode = 1 })
