import { lazy, Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import useSimulation from './hooks/useSimulation.js'
import TelemetryPanel from './ui/TelemetryPanel.jsx'
import SceneBoundary from './ui/SceneBoundary.jsx'
import './App.css'

const FacilityScene = lazy(() => import('./scene/FacilityScene.jsx'))

export default function App() {
  const { simulation, paused, speed, setPaused, setSpeed, reset } = useSimulation()
  const [selection, setSelection] = useState({ type: 'department', id: 'operations' })
  const [cameraVersion, setCameraVersion] = useState(0)
  const [sceneVersion, setSceneVersion] = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)
  const minutes = Math.floor(simulation.elapsed / 60).toString().padStart(2, '0')
  const seconds = Math.floor(simulation.elapsed % 60).toString().padStart(2, '0')
  return (
    <main className="command-center">
      <div className="scanlines" />
      <header className="top-hud">
        <div className="brand-block"><div className="brand-mark">M</div><div><div className="brand-title">MAGNIUM TECHNOLOGY SOLUTIONS</div><div className="brand-subtitle">3D AI OPERATIONS CENTER</div></div></div>
        <div className="top-status"><span><i className="status-dot" />LOCAL SIMULATION</span><strong>{minutes}:{seconds}</strong></div>
      </header>
      <section className="main-layout">
        <section className="network-panel" aria-label="3D facility">
          <div className="network-header"><span><b>01 //</b> ORGANIZATIONAL FACILITY</span><span>{paused ? 'PAUSED' : 'RUNNING'} · {speed}×</span></div>
          <div className="three-workspace">
            <SceneBoundary>
              <Canvas shadows dpr={[1, 1.5]} camera={{ position: [16, 17, 18], fov: 45, near: 0.1, far: 100 }} fallback={<div className="scene-message">WebGL is unavailable. Use the inspector to explore the simulation.</div>}>
                <Suspense fallback={<Html center><div className="loading">Loading facility…</div></Html>}>
                  <FacilityScene key={sceneVersion} simulation={simulation} selected={selection.type === 'department' ? selection.id : null} selectedBot={selection.type === 'bot' ? selection.id : null} onSelect={(id) => setSelection({ type: 'department', id })} onSelectBot={(id) => setSelection({ type: 'bot', id })} cameraVersion={cameraVersion} />
                </Suspense>
              </Canvas>
            </SceneBoundary>
            <div className="scene-toolbar">
              <button type="button" onClick={() => setPaused(!paused)}>{paused ? 'Resume' : 'Pause'}</button>
              <label>Speed <select aria-label="Simulation speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
              <button type="button" onClick={() => setCameraVersion((value) => value + 1)}>Reset view</button>
              <button type="button" onClick={() => setConfirmReset(true)}>Restart</button>
            </div>
            {confirmReset && <div className="reset-prompt" role="dialog" aria-label="Restart simulation"><p>Clear simulated results and restart all workers?</p><button type="button" onClick={() => { reset(); setSceneVersion((value) => value + 1); setConfirmReset(false) }}>Restart simulation</button><button type="button" onClick={() => setConfirmReset(false)}>Cancel</button></div>}
            <div className="control-help"><span>DRAG <b>ORBIT</b></span><span>RIGHT DRAG <b>PAN</b></span><span>SCROLL <b>ZOOM</b></span><span>CLICK <b>ROOM / BOT</b></span></div>
          </div>
          <div className="workspace-footer"><span>HOVER ROUTES // TASK-DRIVEN</span><span>SIMULATED WORK · NO EXTERNAL AI</span></div>
        </section>
        <TelemetryPanel simulation={simulation} selection={selection} onSelect={setSelection} />
      </section>
      <footer className="bottom-hud">
        <div className="footer-block"><span>WORKERS</span><strong>{simulation.bots.length} AUTONOMOUS</strong></div>
        <div className="footer-block"><span>COMPLETED TASKS</span><strong>{simulation.completed}</strong></div>
        <div className="footer-block"><span>MODE</span><strong>DETERMINISTIC / LOCAL</strong></div>
        <div className="build-number">MTS.OS // DEMO 1.0</div>
      </footer>
    </main>
  )
}
