import { useState } from 'react'
import useTaskReview from '../hooks/useTaskReview.js'

const label = (value) => value === 'cancelled' ? 'Rejected / Cancelled' : value.replaceAll('_', ' ')

export default function TaskReviewPanel({ task, online, refreshKey, onRefresh }) {
  const [notes, setNotes] = useState('')
  const [version, setVersion] = useState(undefined)
  const review = useTaskReview(task.id, version, refreshKey, online, onRefresh)
  const result = review.result
  const status = review.outcome ?? task.status
  const canReview = online && !review.busy && !review.error && review.loaded && version === undefined && review.version === undefined && status === 'awaiting_review' && result && !review.approvals.some((item) => item.resultId === result.id)
  async function handleDecision(action) {
    if (await review.decide(action, notes)) setNotes('')
  }
  return <section className="side-section review-panel" aria-label="Task result and human review">
    <div className="side-heading"><span>TASK RESULT / REVIEW</span><span>#{task.id}</span></div>
    <h2>{task.title}</h2>
    <p className="review-outcome" role="status">{label(status)}</p>
    {review.error && <p className="review-error" role="alert">{review.error}</p>}
    {!online && <p>Backend offline. Review controls are unavailable.</p>}
    {!review.loaded && !review.error && <p>Loading result…</p>}
    {review.loaded && !result && <p>No persisted result available. Submit a result before reviewing this task.</p>}
    {result && <>
      <p>Result version {result.version}{version !== undefined ? ' · history' : ''}</p>
      <dl className="details">
        {[['Summary', 'summary'], ['Recommendation', 'recommendation'], ['Reasoning', 'reasoning'], ['Security considerations', 'securityConsiderations'], ['Limitations', 'limitations']].map(([title, field]) => <div key={field}><dt>{title}</dt><dd>{result[field] || 'Not provided'}</dd></div>)}
      </dl>
      {result.sources.length > 0 && <details><summary>Sources ({result.sources.length})</summary><ul>{result.sources.map((source, index) => <li key={index}>{source.label}{source.url ? ` — ${source.url}` : ''}</li>)}</ul></details>}
    </>}
    {status === 'awaiting_review' && version === undefined && <div className="review-controls">
      <label htmlFor={`review-notes-${task.id}`}>Review note (required for revision)</label>
      <textarea id={`review-notes-${task.id}`} maxLength={2000} value={notes} disabled={review.busy} onChange={(event) => setNotes(event.target.value)} rows={3} />
      <div><button type="button" disabled={!canReview} onClick={() => handleDecision('approve')}>Approve</button><button type="button" disabled={!canReview || !notes.trim()} onClick={() => handleDecision('revise')}>Request revision</button><button type="button" disabled={!canReview} onClick={() => handleDecision('reject')}>Reject</button></div>
      {review.busy && <p>Saving decision…</p>}
    </div>}
    {version !== undefined && <button type="button" onClick={() => setVersion(undefined)}>Show latest result</button>}
    {review.approvals.length > 0 && <details open><summary>Decision history</summary><ol className="activity-log">{review.approvals.map((approval) => <li key={approval.id}><strong>{label(approval.decision)}</strong> · version {approval.resultVersion}<span>{new Date(approval.createdAt).toLocaleString()}</span><span>{approval.notes || 'No note provided'}</span><button type="button" onClick={() => setVersion(approval.resultVersion)}>View result version {approval.resultVersion}</button></li>)}</ol></details>}
  </section>
}
