import { useEffect, useRef, useState } from 'react'
import { getTaskResult, getTaskApprovals, approveTask, reviseTask, rejectTask } from '../api/client.js'

export default function useTaskReview(taskId, version, refreshKey, online, refreshOperations) {
  const [data, setData] = useState({ result: null, approvals: [], loaded: false, version: undefined })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [outcome, setOutcome] = useState(null)
  const lifecycle = useRef({ generation: 0, mounted: true })
  const writing = useRef(false)
  useEffect(() => {
    const state = lifecycle.current
    state.mounted = true
    return () => { state.mounted = false; state.generation++ }
  }, [])
  useEffect(() => {
    if (!online || busy) return
    const state = lifecycle.current
    const current = ++state.generation
    const controller = new AbortController()
    Promise.all([getTaskResult(taskId, { signal: controller.signal, version }), getTaskApprovals(taskId, controller.signal)])
      .then(([result, approvals]) => {
        if (current !== lifecycle.current.generation || controller.signal.aborted) return
        setData({ result, approvals, loaded: true, version })
        setError('')
      }).catch((reason) => {
        if (current === lifecycle.current.generation && !controller.signal.aborted) setError(reason.message)
      })
    return () => { controller.abort(); state.generation++ }
  }, [taskId, version, refreshKey, online, busy, revision])
  async function decide(action, notes) {
    if (writing.current || !online || !data.result || data.version !== undefined) return false
    writing.current = true
    lifecycle.current.generation++
    setBusy(true)
    setError('')
    try {
      const method = { approve: approveTask, revise: reviseTask, reject: rejectTask }[action]
      const response = await method(taskId, data.result.id, notes)
      if (lifecycle.current.mounted) setOutcome({ status: response.task.status, refreshKey })
      refreshOperations()
      return true
    } catch (reason) {
      if (lifecycle.current.mounted) setError(`${reason.message}. Refreshing saved state; the action was not automatically retried.`)
      refreshOperations()
      return false
    } finally {
      writing.current = false
      if (lifecycle.current.mounted) { setBusy(false); setRevision((value) => value + 1) }
    }
  }
  return { ...data, error, busy, outcome: outcome?.refreshKey === refreshKey ? outcome.status : null, decide }
}
