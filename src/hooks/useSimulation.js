import { useEffect, useState } from 'react'
import { advanceSimulation, createSimulation } from '../simulation/engine.js'

export default function useSimulation() {
  const [simulation, setSimulation] = useState(createSimulation)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  useEffect(() => {
    if (paused) return
    let previous = performance.now()
    const tick = setInterval(() => {
      const now = performance.now()
      // Hidden tabs freeze; large scheduling gaps don't skip whole task cycles.
      const delta = document.hidden ? 0 : Math.min((now - previous) / 1000, 0.25)
      previous = now
      if (delta) setSimulation((state) => advanceSimulation(state, delta * speed))
    }, 100)
    return () => clearInterval(tick)
  }, [paused, speed])
  return { simulation, paused, speed, setPaused, setSpeed, reset: () => setSimulation(createSimulation()) }
}
