import { useCallback, useEffect, useRef, useState } from 'react'
import { startPolling } from '../api/polling.js'

export default function useOperations() {
  const [snapshot, setSnapshot] = useState({ status: 'loading', data: { workers: [], tasks: [], activity: [], projects: [] }, updatedAt: null })
  const polling = useRef(null)
  useEffect(() => {
    polling.current = startPolling((update) => setSnapshot((previous) => ({ ...previous, ...update })))
    return () => polling.current()
  }, [])
  const refresh = useCallback(() => polling.current?.refresh(), [])
  return { ...snapshot, refresh }
}
