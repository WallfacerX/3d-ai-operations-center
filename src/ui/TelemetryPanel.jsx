import { useState } from 'react'
import TaskReviewPanel from './TaskReviewPanel.jsx'
import { departments, getDepartment } from '../data/facility.js'

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}
const statusLabel = (status) => status.replaceAll('_', ' ')

export default function TelemetryPanel({ workers, tasks, activity, connection, selection, onSelect, refreshKey, onRefresh }) {
  const [historySelection, setHistorySelection] = useState(null)
  const bot = selection.type === 'bot' ? workers.find(({ id }) => id === selection.id) : null
  const department = !bot ? getDepartment(selection.id) ?? getDepartment('operations') : null
  const history = bot ? tasks.filter((task) => task.assignedWorkerId === bot.id && ['completed', 'cancelled'].includes(task.status)).sort((a, b) => b.id - a.id) : []
  const reviewTask = bot?.task ?? (historySelection?.workerId === bot?.id ? history.find((task) => task.id === historySelection.taskId) : null) ?? history[0]
  const working = workers.filter((worker) => worker.status === 'working')
  const associated = department ? workers.filter((worker) => worker.department === department.id) : []
  const recent = [...activity].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp) || b.id - a.id).slice(0, 10)
  const selectWorker = (worker) => onSelect({ type: 'bot', id: worker.id })
  return (
    <aside className="telemetry-panel" aria-label="Operations telemetry">
      <section className="side-section inspector">
        <div className="side-heading"><span>{bot ? 'SELECTED WORKER' : 'SELECTED DEPARTMENT'}</span><span>{bot ? `#${bot.id}` : department.code}</span></div>
        <h1>{bot?.name ?? department.name}</h1>
        {bot ? <>
          <p className="role">{bot.role}</p>
          <div className={`selected-status status-${bot.status}`}>{statusLabel(bot.status).toUpperCase()}</div>
          {bot.status === 'awaiting_review' && <p className="review-notice">Human review needed</p>}
          {bot.warning && <p role="status">{bot.warning}</p>}
          <dl className="details">
            <dt>Department affiliation</dt><dd>{getDepartment(bot.department)?.name ?? bot.department}</dd>
            <dt>Visual destination</dt><dd>{getDepartment(bot.status === 'idle' ? 'management' : bot.destination).name}{bot.status === 'idle' ? ' · idle staging' : ''}</dd>
            <dt>Current task</dt><dd>{bot.task?.title ?? (bot.currentTaskId === null ? 'No current task' : `Task #${bot.currentTaskId} unavailable`)}</dd>
            {bot.task && <>
              <dt>Description</dt><dd>{bot.task.description || 'No description provided'}</dd>
              <dt>Type</dt><dd>{bot.task.type}</dd>
              <dt>Task status</dt><dd>{statusLabel(bot.task.status)}</dd>
              <dt>Requirements</dt><dd>{bot.task.requirements || 'None specified'}</dd>
            </>}
          </dl>
          {bot.task && <><label className="progress-label" htmlFor="task-progress">Task progress <strong>{bot.task.progress}%</strong></label><progress id="task-progress" max="100" value={bot.task.progress} /></>}
          <p>State and progress are updated manually through the local API.</p>
        </> : <>
          <div className="selected-status">{working.some((worker) => worker.destination === department.id) ? 'PROCESSING' : 'READY'}</div>
          <p>{department.description}</p>
          <div className="metrics-grid">
            <Metric label="ASSOCIATED" value={associated.length} />
            <Metric label="WORKING" value={working.filter((worker) => worker.destination === department.id).length} />
            <Metric label="TRAVELING" value={workers.filter((worker) => worker.status === 'traveling' && worker.destination === department.id).length} />
            <Metric label="TASKS" value={tasks.filter((task) => associated.some((worker) => worker.id === task.assignedWorkerId)).length} />
          </div>
          <p>Department affiliation is separate from a worker’s visual location.</p>
          {associated.map((worker) => <button className="associated-worker" type="button" key={worker.id} onClick={() => selectWorker(worker)}>{worker.name} · {statusLabel(worker.status)}</button>)}
        </>}
      </section>
      {bot && !bot.task && history.length > 0 && <section className="side-section"><div className="side-heading">RECENT TASKS · NOT ACTIVE</div>{history.slice(0, 10).map((task) => <button className="associated-worker" type="button" key={task.id} onClick={() => setHistorySelection({ workerId: bot.id, taskId: task.id })}>{task.title} · {task.status}</button>)}</section>}
      {bot && reviewTask && <TaskReviewPanel key={reviewTask.id} task={reviewTask} online={connection === 'connected'} refreshKey={refreshKey} onRefresh={onRefresh} />}
      <section className="side-section">
        <div className="side-heading"><span>WORKFORCE</span><span>{working.length} / {workers.length} WORKING</span></div>
        {workers.length === 0 && <p>{connection === 'loading' ? 'Loading workers…' : connection !== 'connected' ? 'Worker data unavailable. Start the backend with npm run server.' : 'No workers registered.'}</p>}
        <div className="worker-list">
          {workers.map((worker) => <button type="button" key={worker.id} aria-pressed={selection.type === 'bot' && selection.id === worker.id} onClick={() => selectWorker(worker)}>
            <span><i style={{ background: worker.color }} />{worker.name}<small>{statusLabel(worker.status)}</small></span>
            <span className="worker-task">{worker.task?.title ?? (worker.currentTaskId === null ? 'No current task' : 'Current task unavailable')}</span>
          </button>)}
        </div>
      </section>
      <section className="side-section">
        <div className="side-heading"><span>DEPARTMENTS</span><span>{departments.length} ROOMS</span></div>
        <div className="department-list">{departments.map((item) => <button type="button" key={item.id} aria-pressed={selection.type === 'department' && selection.id === item.id} onClick={() => onSelect({ type: 'department', id: item.id })}>{item.name}</button>)}</div>
      </section>
      <section className="side-section log-section">
        <div className="side-heading"><span>ACTIVITY LOG</span><span>BACKEND RECORDS</span></div>
        <ol className="activity-log" aria-label="Recent backend activity">
          {recent.length === 0 && <li>No activity records available.</li>}
          {recent.map((event) => <li key={event.id}><time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleTimeString()}</time> <strong>{event.workerId ? workers.find((worker) => worker.id === event.workerId)?.name ?? `Worker #${event.workerId}` : statusLabel(event.event)}</strong><span>{event.message}</span></li>)}
        </ol>
      </section>
    </aside>
  )
}
