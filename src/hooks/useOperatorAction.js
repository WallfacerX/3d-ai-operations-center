import { useRef, useState } from 'react'
export default function useOperatorAction(online, refresh) {
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(action, success = () => {}) {
    if (!online || lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try { const result = await action(); success(result); refresh() }
    catch (reason) { setError(`${reason.message}. Saved state will refresh; no automatic retry.`); refresh() }
    finally { lock.current = false; setBusy(false) }
  }
  return { run, busy, error, disabled: !online || busy }
}
