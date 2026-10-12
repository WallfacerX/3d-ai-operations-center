import { useState } from 'react'
import useOperatorAction from '../hooks/useOperatorAction.js'
import { ProjectForm, TaskForm } from './OperatorForms.jsx'
import { terminalStates } from '../data/operatorState.js'
export default function OperationsPanel({ data, online, refresh, onSelectTask }) {
  const [projectId, setProjectId] = useState('')
  const [createdProject, setCreatedProject] = useState(null)
  const action = useOperatorAction(online, refresh)
  const projects = createdProject && !data.projects.some((item) => item.id === createdProject.id) ? [...data.projects, createdProject] : data.projects
  const active = data.tasks.filter((task) => !terminalStates.includes(task.status))
  const reviews = active.filter((task) => task.status === 'awaiting_review')
  const projectName = (id) => projects.find((project) => project.id === id)?.name ?? `Project #${id}`
  const workerName = (id) => data.workers.find((worker) => worker.id === id)?.name ?? 'Unassigned'
  return <div className="operations-content">
    <p>Task orchestration is functional. Actual AI task execution is not implemented yet.</p>
    {!online && <p role="status">Backend unavailable. Controls are disabled.</p>}
    {action.error && <p className="review-error" role="alert">{action.error}</p>}
    <section className="side-section"><h2>Projects</h2>{projects.map((project) => <button className="associated-worker" key={project.id} aria-pressed={Number(projectId) === project.id} onClick={() => setProjectId(String(project.id))}>{project.name} · {project.client} · {project.status}</button>)}<details><summary>New project</summary><ProjectForm action={action} onCreated={(project) => { setCreatedProject(project); setProjectId(String(project.id)) }} /></details></section>
    <section className="side-section"><TaskForm action={action} projects={projects} projectId={projectId} setProjectId={setProjectId} onCreated={onSelectTask} /></section>
    <section className="side-section"><h2>Active Work ({active.length})</h2>{!active.length && <p>No active tasks.</p>}{active.map((task) => <button className="task-card" key={task.id} onClick={() => onSelectTask(task)}><strong>{task.title}</strong><span>{projectName(task.projectId)} · {workerName(task.assignedWorkerId)}</span><span>{task.status.replaceAll('_', ' ')} · {task.progress}%</span>{task.status === 'revision_requested' && <span>Revision note: {task.latestRevision?.notes ?? 'No note available'}</span>}</button>)}</section>
    <section className="side-section"><h2>Review Queue ({reviews.length})</h2>{!reviews.length && <p>No tasks awaiting review.</p>}{reviews.map((task) => <div className="task-card" key={task.id}><strong>{task.title}</strong><span>{projectName(task.projectId)} · {workerName(task.assignedWorkerId)}</span><span>{task.latestResult?.summary ?? 'Result unavailable'}</span><span>Version {task.latestResult?.version ?? '—'}</span><button onClick={() => onSelectTask(task)}>Review</button></div>)}</section>
  </div>
}
