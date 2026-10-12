import { useEffect, useState } from 'react'
import { startPolling } from '../api/polling.js'

export default function useOperations() {
  const [snapshot, setSnapshot] = useState({ status: 'loading', data: { workers: [], tasks: [], activity: [] }, updatedAt: null })
  useEffect(() => startPolling((update) => setSnapshot((previous) => ({ ...previous, ...update }))), [])
  return snapshot
}
