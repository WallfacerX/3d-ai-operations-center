import { useState } from 'react'
import { createProject, createTask, createTaskResult } from '../api/client.js'

export function Field({ label, name, value, onChange, required = false, long = false, maxLength = 256 }) {
  const Tag = long ? 'textarea' : 'input'
  return <label className="operator-field">{label}<Tag name={name} value={value} onChange={onChange} required={required} maxLength={maxLength} rows={long ? 3 : undefined} /></label>
}
export function ProjectForm({ action, onCreated }) {
  const [form, setForm] = useState({ name: '', client: '', description: '', status: 'active' })
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  return <form onSubmit={(event) => { event.preventDefault(); if (!form.name.trim() || !form.client.trim() || !form.status.trim()) return; action.run(() => createProject(form), (project) => { onCreated(project); setForm({ name: '', client: '', description: '', status: 'active' }) }) }}>
    <fieldset disabled={action.disabled}><legend>Create project</legend>
      {['name', 'client', 'status', 'description'].map((name) => <Field key={name} name={name} label={name} value={form[name]} onChange={change} required={name !== 'description'} long={name === 'description'} maxLength={name === 'description' ? 10000 : 256} />)}
      <button>Create project</button>
    </fieldset>
  </form>
}
export function TaskForm({ action, projects, projectId, setProjectId, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', requirements: '', type: 'research' })
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  return <form onSubmit={(event) => { event.preventDefault(); if (!projectId || !form.title.trim() || !form.type.trim()) return; action.run(() => createTask({ ...form, projectId: Number(projectId) }), (task) => { onCreated(task); setForm({ title: '', description: '', requirements: '', type: 'research' }) }) }}>
    <fieldset disabled={action.disabled}><legend>New task</legend>
      <label className="operator-field">Project<select required value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      {['title', 'type', 'description', 'requirements'].map((name) => <Field key={name} name={name} label={name} value={form[name]} onChange={change} required={['title', 'type'].includes(name)} long={['description', 'requirements'].includes(name)} maxLength={['title', 'type'].includes(name) ? 256 : 10000} />)}
      <button>Create draft task</button>
    </fieldset>
  </form>
}
export function ResultForm({ task, action }) {
  const empty = { summary: '', recommendation: '', reasoning: '', securityConsiderations: '', limitations: '' }
  const [form, setForm] = useState(empty)
  const [sources, setSources] = useState([])
  const labels = { summary: 'Summary', recommendation: 'Recommendation', reasoning: 'Reasoning', securityConsiderations: 'Security considerations', limitations: 'Limitations' }
  return <details><summary>Enter manual result</summary><p>No work is generated automatically. Enter the result of your manual work.</p><form onSubmit={(event) => { event.preventDefault(); if (!form.summary.trim()) return; action.run(() => createTaskResult(task.id, { ...form, sources: sources.map((source) => ({ label: source.label, ...(source.url.trim() ? { url: source.url } : {}) })) }), () => { setForm(empty); setSources([]) }) }}><fieldset disabled={action.disabled}>
    {Object.keys(form).map((name) => <Field key={name} name={name} label={labels[name]} value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} required={name === 'summary'} long maxLength={10000} />)}
    {sources.map((source, index) => <div key={index}>{['label', 'url'].map((key) => <Field key={key} label={`Source ${index + 1} ${key}`} value={source[key]} required={key === 'label'} maxLength={key === 'url' ? 2048 : 256} onChange={(event) => setSources(sources.map((item, i) => i === index ? { ...item, [key]: event.target.value } : item))} />)}<button type="button" onClick={() => setSources(sources.filter((_, i) => i !== index))}>Remove source</button></div>)}
    <button type="button" disabled={sources.length >= 20} onClick={() => setSources([...sources, { label: '', url: '' }])}>Add source</button><button>Submit for review</button>
  </fieldset></form></details>
}
