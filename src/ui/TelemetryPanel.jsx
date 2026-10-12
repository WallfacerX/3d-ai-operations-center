import { departments, getDepartment } from '../data/facility.js'
import { taskCatalog } from '../data/workflows.js'

function formatTime(seconds) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}
function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>
}

export default function TelemetryPanel({ simulation, selection, onSelect }) {
  const bot = selection.type === 'bot' ? simulation.bots.find(({ id }) => id === selection.id) : null
  const department = !bot ? getDepartment(selection.id) : null
  const working = simulation.bots.filter((worker) => worker.status === 'working')
  const progress = Math.round((bot?.progress ?? 0) * 100)
  return (
    <aside className="telemetry-panel" aria-label="Operations telemetry">
      <section className="side-section inspector">
        <div className="side-heading"><span>{bot ? 'SELECTED WORKER' : 'SELECTED DEPARTMENT'}</span><span>{bot?.id ?? department.code}</span></div>
        <h1>{bot?.name ?? department.name}</h1>
        {bot ? <>
          <p className="role">{bot.role}</p>
          <div className={`selected-status status-${bot.status}`}>{bot.status.toUpperCase()}</div>
          <dl className="details">
            <dt>Assigned task</dt><dd>{bot.task?.title ?? 'Selecting next workflow task'}</dd>
            <dt>Current department</dt><dd>{bot.currentDepartment ? getDepartment(bot.currentDepartment).name : 'In transit'}</dd>
            <dt>Destination</dt><dd>{bot.destination ? getDepartment(bot.destination).name : '—'}</dd>
            {bot.status === 'traveling' && <><dt>Route</dt><dd>{bot.route.map((id) => getDepartment(id).name).join(' → ')}</dd></>}
          </dl>
          <label className="progress-label" htmlFor="task-progress">{bot.status === 'traveling' ? 'Travel' : 'Task'} progress <strong>{progress}%</strong></label>
          <progress id="task-progress" max="100" value={progress} />
          <p>Completed: {bot.completed} · Workflow cycle: {bot.cycle}</p>
          {bot.lastResult && <div className="result"><span>LATEST SIMULATED RESULT</span><p>{bot.lastResult}</p></div>}
        </> : <>
          <div className="selected-status">{working.some((worker) => worker.currentDepartment === department.id) ? 'PROCESSING' : 'READY'}</div>
          <p>{department.description}</p>
          <div className="metrics-grid">
            <Metric label="PRESENT" value={simulation.bots.filter((worker) => worker.currentDepartment === department.id).length} />
            <Metric label="WORKING" value={working.filter((worker) => worker.currentDepartment === department.id).length} />
            <Metric label="INBOUND" value={simulation.bots.filter((worker) => worker.status === 'traveling' && worker.destination === department.id).length} />
            <Metric label="DONE" value={simulation.totals[department.id]} />
          </div>
          <div className="result"><span>DEPARTMENT DELIVERABLE</span><p>{taskCatalog[department.id].title}</p></div>
        </>}
      </section>
      <section className="side-section">
        <div className="side-heading"><span>WORKFORCE</span><span>{working.length} / {simulation.bots.length} WORKING</span></div>
        <div className="worker-list">
          {simulation.bots.map((worker) => <button type="button" key={worker.id} aria-pressed={selection.type === 'bot' && selection.id === worker.id} onClick={() => onSelect({ type: 'bot', id: worker.id })}>
            <span><i style={{ background: worker.color }} />{worker.name}<small>{worker.status}</small></span>
            <span className="worker-task">{worker.task?.title ?? 'Preparing next task'}</span>
          </button>)}
        </div>
      </section>
      <section className="side-section">
        <div className="side-heading"><span>DEPARTMENTS</span><span>{departments.length} ONLINE</span></div>
        <div className="department-list">{departments.map((item) => <button type="button" key={item.id} aria-pressed={selection.type === 'department' && selection.id === item.id} onClick={() => onSelect({ type: 'department', id: item.id })}>{item.name}</button>)}</div>
      </section>
      <section className="side-section log-section">
        <div className="side-heading"><span>ACTIVITY LOG</span><span>LOCAL SIMULATION</span></div>
        <ol className="activity-log" aria-label="Recent simulation events">
          {simulation.events.length === 0 && <li>Workers are preparing their first tasks.</li>}
          {simulation.events.map((event) => <li key={event.id}><time>{formatTime(event.at)}</time> <strong>{event.bot}</strong><span>{event.message}</span></li>)}
        </ol>
      </section>
    </aside>
  )
}
