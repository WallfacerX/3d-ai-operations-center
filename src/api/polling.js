import { fetchOperations, InvalidResponse } from './client.js'

// One scheduled batch at a time; injected dependencies keep lifecycle behavior testable.
export function startPolling(onUpdate, {
  load = fetchOperations, visibility = document,
  schedule = setTimeout, cancel = clearTimeout, now = Date.now,
} = {}) {
  let stopped = false
  let timer
  let active
  async function poll() {
    if (stopped || visibility.hidden || active) return
    const controller = new AbortController()
    active = controller
    let timedOut = false
    let timeout
    const cancelled = new Promise((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        cancel(timeout)
        reject(new Error(timedOut ? 'Request timed out' : 'Request cancelled'))
      }, { once: true })
      timeout = schedule(() => { timedOut = true; controller.abort() }, 5000)
    })
    try {
      const data = await Promise.race([load(controller.signal), cancelled])
      if (!stopped && !controller.signal.aborted) onUpdate({ status: 'connected', data, updatedAt: now() })
    } catch (error) {
      if (!stopped && !visibility.hidden && (!controller.signal.aborted || timedOut)) onUpdate({ status: error instanceof InvalidResponse ? 'invalid' : 'offline' })
    } finally {
      controller.abort()
      cancel(timeout)
      active = null
      if (!stopped && !visibility.hidden) timer = schedule(poll, 3000)
    }
  }
  function onVisibility() {
    cancel(timer)
    if (visibility.hidden) active?.abort()
    else poll()
  }
  visibility.addEventListener('visibilitychange', onVisibility)
  poll()
  return () => {
    stopped = true
    cancel(timer)
    active?.abort()
    visibility.removeEventListener('visibilitychange', onVisibility)
  }
}
