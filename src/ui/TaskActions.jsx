import { useState } from 'react'
import { taskAction } from '../api/client.js'
import { availableWorkers, taskActions } from '../data/operatorState.js'
const labels = { assign: 'Assign worker', start: 'Start task', 'begin-work': 'Begin work', resume: 'Resume task', cancel: 'Cancel task' }
export default function TaskActions({ task, workers, tasks, action }) {
  const [workerId, setWorkerId] = useState('')
  const [confirm, setConfirm] = useState(false)
  const available = availableWorkers(workers, tasks, task.id)
  const actions = taskActions(task)
  return <div className="operator-actions">
    {actions.includes('assign') && <label className="operator-field">Available worker<select value={workerId} disabled={action.disabled} onChange={(event) => setWorkerId(event.target.value)}><option value="">Select worker</option>{available.map((worker) => <option key={worker.id} value={worker.id}>{worker.name} · {worker.role} · {worker.department} · {worker.status}</option>)}</select>{available.length === 0 && <small>No workers available.</small>}</label>}
    {actions.map((name) => <button key={name} type="button" disabled={action.disabled || (name === 'assign' && !available.some((worker) => worker.id === Number(workerId)))} onClick={() => name === 'cancel' ? setConfirm(true) : action.run(() => taskAction(task.id, name, Number(workerId)))}>{labels[name]}</button>)}
    {confirm && <div role="group" aria-label="Confirm cancellation"><p>Cancel this task and release its worker?</p><button disabled={action.disabled} onClick={() => action.run(() => taskAction(task.id, 'cancel'), () => setConfirm(false))}>Confirm cancellation</button><button onClick={() => setConfirm(false)}>Keep task</button></div>}
    {task.status === 'traveling' && <p>Observe the trip, then choose Begin work. Arrival does not execute work.</p>}
  </div>
}
