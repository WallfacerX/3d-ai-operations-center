import { lazy, Suspense, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import useOperations from './hooks/useOperations.js'
import { mapWorkers } from './data/workerScene.js'
import TelemetryPanel from './ui/TelemetryPanel.jsx'
import SceneBoundary from './ui/SceneBoundary.jsx'
import './App.css'

const FacilityScene = lazy(() => import('./scene/FacilityScene.jsx'))

export default function App() {
  const operations = useOperations()
  const workers = useMemo(() => mapWorkers(operations.data.workers, operations.data.tasks), [operations.data.workers, operations.data.tasks])
  const online = operations.status === 'connected'
  const [selection, setSelection] = useState({ type: 'department', id: 'operations' })
  const [cameraVersion, setCameraVersion] = useState(0)
  const activeSelection = selection.type === 'bot' && !workers.some((worker) => worker.id === selection.id)
    ? { type: 'department', id: 'operations' } : selection
  const connectionLabel = { loading: 'CONNECTING', connected: 'BACKEND CONNECTED', offline: 'BACKEND OFFLINE', invalid: 'INVALID BACKEND RESPONSE' }[operations.status]
  return (
    <main className="command-center">
      <div className="scanlines" />
      <header className="top-hud">
        <div className="brand-block"><div className="brand-mark">M</div><div><div className="brand-title">MAGNIUM TECHNOLOGY SOLUTIONS</div><div className="brand-subtitle">3D AI OPERATIONS CENTER</div></div></div>
        <div className="top-status"><span>{connectionLabel}</span></div>
      </header>
      <section className="main-layout">
        <section className="network-panel" aria-label="3D facility">
          <div className="network-header"><span><b>01 //</b> ORGANIZATIONAL FACILITY</span><span>PERSISTED WORKER STATE</span></div>
          <div className="three-workspace">
            <SceneBoundary>
              <Canvas shadows dpr={[1, 1.5]} camera={{ position: [16, 17, 18], fov: 45, near: 0.1, far: 100 }} fallback={<div className="scene-message">WebGL is unavailable. Use the inspector to explore the simulation.</div>}>
                <Suspense fallback={<Html center><div className="loading">Loading facility…</div></Html>}>
                  <FacilityScene workers={workers} online={online} selected={activeSelection.type === 'department' ? activeSelection.id : null} selectedBot={activeSelection.type === 'bot' ? activeSelection.id : null} onSelect={(id) => setSelection({ type: 'department', id })} onSelectBot={(id) => setSelection({ type: 'bot', id })} cameraVersion={cameraVersion} />
                </Suspense>
              </Canvas>
            </SceneBoundary>
            <div className="scene-toolbar">
              <span className={`connection-status connection-${operations.status}`} role="status">{connectionLabel}{!online && operations.updatedAt ? ' · STALE DATA' : ''}</span>
              <button type="button" onClick={() => setCameraVersion((value) => value + 1)}>Reset view</button>
              <span className="refresh-time">{operations.updatedAt ? `Updated ${new Date(operations.updatedAt).toLocaleTimeString()}` : 'Waiting for backend'}</span>
            </div>
            <div className="control-help"><span>DRAG <b>ORBIT</b></span><span>RIGHT DRAG <b>PAN</b></span><span>SCROLL <b>ZOOM</b></span><span>CLICK <b>ROOM / BOT</b></span></div>
          </div>
          <div className="workspace-footer"><span>HOVER ROUTES // TASK-DRIVEN</span><span>MANUAL WORKFLOW · NO AI</span></div>
        </section>
        <TelemetryPanel workers={workers} tasks={operations.data.tasks} activity={operations.data.activity} connection={operations.status} refreshKey={operations.updatedAt} onRefresh={operations.refresh} selection={activeSelection} onSelect={setSelection} />
      </section>
      <footer className="bottom-hud">
        <div className="footer-block"><span>WORKERS</span><strong>{workers.length} REGISTERED</strong></div>
        <div className="footer-block"><span>COMPLETED TASKS</span><strong>{operations.data.tasks.filter((task) => task.status === 'completed').length}</strong></div>
        <div className="footer-block"><span>MODE</span><strong>BACKEND / MANUAL</strong></div>
        <div className="build-number">MTS.OS // DEMO 1.0</div>
      </footer>
    </main>
  )
}
