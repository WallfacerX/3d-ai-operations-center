import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF, } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import './App.css'

const departments = [
  {
    id: 'management',
    name: 'MANAGEMENT',
    code: 'MGT-01',
    status: 'ONLINE',
    position: [0, 0, 4.5],
    size: [5, 3.5],
    color: '#20ff68',
    description:
      'Executive coordination, strategic planning, decisions and company telemetry.',
  },
  {
    id: 'research',
    name: 'RESEARCH',
    code: 'RND-02',
    status: 'ACTIVE',
    position: [-6, 0, 0],
    size: [4.5, 4],
    color: '#20ff68',
    description:
      'Research queue, technical intelligence, source analysis and discovery.',
  },
  {
    id: 'development',
    name: 'DEVELOPMENT',
    code: 'DEV-03',
    status: 'ACTIVE',
    position: [6, 0, 0],
    size: [4.5, 4],
    color: '#168eff',
    description:
      'Software engineering, prototypes, repositories and development tasks.',
  },
  {
    id: 'security',
    name: 'SECURITY',
    code: 'SEC-04',
    status: 'MONITORING',
    position: [-7, 0, -5.5],
    size: [4, 3.5],
    color: '#ff3853',
    description:
      'Security monitoring, threat analysis, standards and architecture review.',
  },
  {
    id: 'operations',
    name: 'OPERATIONS',
    code: 'OPS-05',
    status: 'ACTIVE',
    position: [0, 0, -4],
    size: [5, 4],
    color: '#20ff68',
    description:
      'Infrastructure, automation, systems, workflow execution and maintenance.',
  },
  {
    id: 'marketing',
    name: 'MARKETING',
    code: 'MKT-06',
    status: 'STANDBY',
    position: [7, 0, -5.5],
    size: [4, 3.5],
    color: '#ff9f19',
    description:
      'Content, campaigns, YouTube, outreach and brand operations.',
  },
  {
    id: 'database',
    name: 'DATABASE',
    code: 'DB-07',
    status: 'ONLINE',
    position: [0, 0, -9],
    size: [4.5, 3],
    color: '#df42ff',
    description:
      'Application data, records, persistence, indexing and internal knowledge.',
  },
]

const connections = [
  ['management', 'research'],
  ['management', 'development'],
  ['research', 'security'],
  ['research', 'operations'],
  ['development', 'operations'],
  ['development', 'marketing'],
  ['security', 'database'],
  ['operations', 'database'],
  ['marketing', 'database'],
]

const bots = [
  {
    id: 'bot-01',
    name: 'RESEARCH BOT',
    task: 'Market analysis',
    from: 'research',
    to: 'management',
    color: '#20ff68',
    speed: 0.12,
    offset: 0,
  },
  {
    id: 'bot-02',
    name: 'DEV BOT',
    task: 'Code review',
    from: 'development',
    to: 'operations',
    color: '#168eff',
    speed: 0.16,
    offset: 0.4,
  },
  {
    id: 'bot-03',
    name: 'SECURITY BOT',
    task: 'Security audit',
    from: 'security',
    to: 'database',
    color: '#ff3853',
    speed: 0.1,
    offset: 0.75,
  },
  {
    id: 'bot-04',
    name: 'MARKETING BOT',
    task: 'Content processing',
    from: 'marketing',
    to: 'management',
    color: '#ff9f19',
    speed: 0.14,
    offset: 1.1,
  },
]

function getDepartment(id) {
  return departments.find((department) => department.id === id)
}

function Machine({
  position,
  size = [0.8, 0.45, 0.8],
  color,
}) {
  return (
   <mesh
     position={[0, -0.08, -2.5]}
     receiveShadow
   >
     <boxGeometry
       args={[80, 0.12, 80]}
     />

     <meshStandardMaterial
       color="#020704"
       metalness={0.15}
       roughness={0.9}
     />
   </mesh>
  )
}

function Desk({ position, color }) {
  return (
    <group position={position}>
      {/* Desktop */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[1.15, 0.12, 0.55]} />
        <meshStandardMaterial color="#2a241d" />
      </mesh>

      {/* Legs */}
      {[
        [-0.48, 0.23, -0.2],
        [0.48, 0.23, -0.2],
        [-0.48, 0.23, 0.2],
        [0.48, 0.23, 0.2],
      ].map((pos, index) => (
        <mesh key={index} position={pos}>
          <boxGeometry args={[0.08, 0.45, 0.08]} />
          <meshStandardMaterial color="#111611" />
        </mesh>
      ))}

      {/* Monitor */}
      <mesh position={[0, 0.82, -0.08]} castShadow>
        <boxGeometry args={[0.55, 0.35, 0.07]} />
        <meshStandardMaterial
          color="#050805"
          emissive={color}
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Monitor stand */}
      <mesh position={[0, 0.61, -0.08]}>
        <boxGeometry args={[0.06, 0.22, 0.06]} />
        <meshStandardMaterial color="#252525" />
      </mesh>
    </group>
  )
}

function ServerRack({ position, color }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[0.65, 1.3, 0.65]} />
        <meshStandardMaterial
          color="#090d0a"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {[0.25, 0.5, 0.75, 1].map((height) => (
        <mesh
          key={height}
          position={[0, height, -0.335]}
        >
          <boxGeometry args={[0.48, 0.07, 0.02]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2}
          />
        </mesh>
      ))}
    </group>
  )
}

function Crate({ position }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[0.65, 0.65, 0.65]} />
      <meshStandardMaterial
        color="#5d4325"
        roughness={0.9}
      />
    </mesh>
  )
}

function Plant({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.36, 12]} />
        <meshStandardMaterial color="#403326" />
      </mesh>

      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshStandardMaterial color="#1f7a38" />
      </mesh>
    </group>
  )
}

function Workbench({ position, color }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.6, 0.16, 0.75]} />
        <meshStandardMaterial
          color="#343434"
          metalness={0.6}
        />
      </mesh>

      <mesh position={[-0.65, 0.24, 0]}>
        <boxGeometry args={[0.1, 0.5, 0.1]} />
        <meshStandardMaterial color="#151515" />
      </mesh>

      <mesh position={[0.65, 0.24, 0]}>
        <boxGeometry args={[0.1, 0.5, 0.1]} />
        <meshStandardMaterial color="#151515" />
      </mesh>

      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[0.5, 0.25, 0.4]} />
        <meshStandardMaterial
          color="#080808"
          emissive={color}
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  )
}

function RoomDetails({ department }) {
  const color = department.color

  switch (department.id) {
    case 'management':
      return (
        <>
          <Desk position={[-1.1, 0, 0]} color={color} />
          <Desk position={[1.1, 0, 0]} color={color} />
          <Plant position={[1.8, 0, -1]} />
        </>
      )

    case 'research':
      return (
        <>
          <Desk position={[-1, 0, -0.6]} color={color} />
          <Workbench position={[1, 0, 0.65]} color={color} />
          <Plant position={[-1.7, 0, 1.1]} />
        </>
      )

    case 'development':
      return (
        <>
          <Desk position={[-1, 0, -0.5]} color={color} />
          <Desk position={[1, 0, 0.5]} color={color} />
          <ServerRack position={[1.7, 0, -1.2]} color={color} />
        </>
      )

    case 'security':
      return (
        <>
          <Desk position={[0, 0, -0.4]} color={color} />
          <ServerRack position={[-1.2, 0, 0.75]} color={color} />
          <ServerRack position={[1.2, 0, 0.75]} color={color} />
        </>
      )

    case 'operations':
      return (
        <>
          <Workbench position={[-1.1, 0, -0.5]} color={color} />
          <Workbench position={[1.1, 0, 0.6]} color={color} />
          <ServerRack position={[1.8, 0, -1.2]} color={color} />
        </>
      )

    case 'marketing':
      return (
        <>
          <Desk position={[-1, 0, -0.5]} color={color} />
          <Desk position={[1, 0, 0.5]} color={color} />
          <Plant position={[1.5, 0, -1]} />
        </>
      )

    case 'database':
      return (
        <>
          <ServerRack position={[-1.1, 0, 0]} color={color} />
          <ServerRack position={[0, 0, 0]} color={color} />
          <ServerRack position={[1.1, 0, 0]} color={color} />
        </>
      )

    default:
      return null
  }
}

function BlenderDesk({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 0.5,
}) {
  const { scene } = useGLTF('/models/desk.glb')

  return (
    <primitive
      object={scene}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  )
}

useGLTF.preload('/models/desk.glb')

function DepartmentRoom({
  department,
  selected,
  onSelect,
}) {
  const [x, , z] = department.position
  const [width, depth] = department.size

  const wallHeight = 1.15
  const wallThickness = 0.14

  return (
    <group
      position={[x, 0, z]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(department.id)
      }}
    >
      {/* Floor */}
      <mesh
        position={[0, 0.08, 0]}
        receiveShadow
      >
        <boxGeometry
          args={[
            width,
            0.16,
            depth,
          ]}
        />

        <meshStandardMaterial
          color={
            selected
              ? '#101e14'
              : '#07100a'
          }
          emissive={department.color}
          emissiveIntensity={
            selected ? 0.16 : 0.035
          }
          metalness={0.3}
          roughness={0.75}
        />
      </mesh>

      {/* Back wall */}
      <mesh
        position={[
          0,
          wallHeight / 2,
          -depth / 2,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            width,
            wallHeight,
            wallThickness,
          ]}
        />

        <meshStandardMaterial
          color="#09130c"
          emissive={department.color}
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* Front wall */}
      <mesh
        position={[
          0,
          wallHeight / 2,
          depth / 2,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            width,
            wallHeight,
            wallThickness,
          ]}
        />

        <meshStandardMaterial
          color="#09130c"
          emissive={department.color}
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* Left wall */}
      <mesh
        position={[
          -width / 2,
          wallHeight / 2,
          0,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            wallThickness,
            wallHeight,
            depth,
          ]}
        />

        <meshStandardMaterial
          color="#09130c"
          emissive={department.color}
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* Right wall */}
      <mesh
        position={[
          width / 2,
          wallHeight / 2,
          0,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            wallThickness,
            wallHeight,
            depth,
          ]}
        />

        <meshStandardMaterial
          color="#09130c"
          emissive={department.color}
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* Equipment */}
      <Machine
        position={[
          -width * 0.23,
          0.37,
          -depth * 0.2,
        ]}
        color={department.color}
      />

      <Machine
        position={[
          width * 0.22,
          0.34,
          -depth * 0.22,
        ]}
        size={[
          1,
          0.38,
          0.65,
        ]}
        color={department.color}
      />

      <Machine
        position={[
          0,
          0.3,
          depth * 0.2,
        ]}
        size={[
          1.2,
          0.3,
          0.65,
        ]}
        color={department.color}
      />

      {/* Terminal */}
      <mesh
        position={[
          width * 0.3,
          0.5,
          depth * 0.2,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            0.55,
            0.8,
            0.45,
          ]}
        />

        <meshStandardMaterial
          color="#050806"
          emissive={department.color}
          emissiveIntensity={0.25}
        />
      </mesh>

      <RoomDetails department={department} />

      {department.id === 'management' && (
        <BlenderDesk
          position={[0, 0.15, 0]}
          scale={0.5}
        />
      )}

      {/* Room light */}
      <pointLight
        position={[0, 2.3, 0]}
        color={department.color}
        intensity={
          selected ? 7 : 3
        }
        distance={6}
      />

      {/* Floating label */}
      <Html
        position={[
          0,
          1.8,
          -depth / 2,
        ]}
        center
        distanceFactor={11}
      >
        <div
          className={`room-label ${
            selected
              ? 'room-label-selected'
              : ''
          }`}
          style={{
            '--room-color':
              department.color,
          }}
        >
          <div className="room-code">
            {department.code}
          </div>

          <strong>
            {department.name}
          </strong>

          <span>
            {department.status}
          </span>
        </div>
      </Html>
    </group>
  )
}

function Connection({
  from,
  to,
}) {
  const [x1, , z1] =
    from.position

  const [x2, , z2] =
    to.position

  const dx = x2 - x1
  const dz = z2 - z1

  const distance =
    Math.sqrt(
      dx * dx + dz * dz
    )

  const midpoint = [
    (x1 + x2) / 2,
    0.14,
    (z1 + z2) / 2,
  ]

  const angle =
    Math.atan2(dz, dx)

  return (
    <mesh
      position={midpoint}
      rotation={[
        0,
        -angle,
        0,
      ]}
    >
      <boxGeometry
        args={[
          distance,
          0.035,
          0.055,
        ]}
      />

      <meshStandardMaterial
        color="#20ff68"
        emissive="#20ff68"
        emissiveIntensity={2}
      />
    </mesh>
  )
}

function TaskBot({
  bot,
}) {
  const botRef = useRef()

  const from =
    getDepartment(bot.from)

  const to =
    getDepartment(bot.to)

  const [
    startX,
    ,
    startZ,
  ] = from.position

  const [
    endX,
    ,
    endZ,
  ] = to.position

  useFrame((state) => {
    if (!botRef.current) {
      return
    }

    const elapsed =
      state.clock.getElapsedTime()

    const cycle =
      (
        elapsed * bot.speed +
        bot.offset
      ) % 2

    const progress =
      cycle <= 1
        ? cycle
        : 2 - cycle

    const x =
      startX +
      (endX - startX) *
      progress

    const z =
      startZ +
      (endZ - startZ) *
      progress

    const hover =
      0.55 +
      Math.sin(
        elapsed * 5 +
        bot.offset
      ) * 0.08

    botRef.current.position.set(
      x,
      hover,
      z
    )
  })

  return (
    <group ref={botRef}>

      {/* Bot body */}
      <mesh castShadow>
        <sphereGeometry
          args={[
            0.18,
            16,
            16,
          ]}
        />

        <meshStandardMaterial
          color="#050805"
          emissive={bot.color}
          emissiveIntensity={2.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Bot ring */}
      <mesh
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
      >
        <torusGeometry
          args={[
            0.28,
            0.025,
            8,
            24,
          ]}
        />

        <meshStandardMaterial
          color={bot.color}
          emissive={bot.color}
          emissiveIntensity={2}
        />
      </mesh>

      {/* Light */}
      <pointLight
        color={bot.color}
        intensity={4}
        distance={2.5}
      />

      {/* Bot label */}
      <Html
        position={[
          0,
          0.55,
          0,
        ]}
        center
        distanceFactor={10}
      >
        <div
          style={{
            padding: '4px 6px',
            minWidth: '90px',
            background:
              'rgba(0, 5, 2, 0.9)',
            border:
              `1px solid ${bot.color}`,
            color: bot.color,
            fontFamily:
              'monospace',
            fontSize: '7px',
            textAlign: 'center',
            pointerEvents: 'none',
            boxShadow:
              `0 0 8px ${bot.color}`,
          }}
        >
          <strong>
            {bot.name}
          </strong>

          <div
            style={{
              marginTop: '2px',
              opacity: 0.7,
            }}
          >
            {bot.task}
          </div>
        </div>
      </Html>

    </group>
  )
}

function FacilityScene({
  selected,
  onSelect,
}) {
  return (
    <>
     <color
       attach="background"
       args={['#0b1c11']}
     />

     <fog
       attach="fog"
       args={[
         '#07120b',
         25,
         60,
       ]}
     />

      <ambientLight
        intensity={1.15}
      />

      <hemisphereLight
        skyColor="#173d25"
        groundColor="#020704"
        intensity={1.1}
      />

      <directionalLight
        position={[8, 16, 10]}
        intensity={2.5}
        castShadow
      />

      {/* Main facility floor */}
      <mesh
        position={[
          0,
          -0.08,
          -2.5,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            27,
            0.12,
            22,
          ]}
        />

        <meshStandardMaterial
          color="#020704"
          metalness={0.15}
          roughness={0.9}
        />
      </mesh>

      {/* Grid */}
     <gridHelper
       args={[
         80,
         80,
         '#0e6e32',
         '#073b1c',
       ]}
       position={[
         0,
         0.01,
         -2.5,
       ]}
     />
      {/* Network links */}
      {connections.map(
        ([fromId, toId]) => (
          <Connection
            key={`${fromId}-${toId}`}
            from={
              getDepartment(fromId)
            }
            to={
              getDepartment(toId)
            }
          />
        )
      )}

      {/* Automated task bots */}
      {bots.map((bot) => (
        <TaskBot
          key={bot.id}
          bot={bot}
        />
      ))}

      {/* Departments */}
      {departments.map(
        (department) => (
          <DepartmentRoom
            key={department.id}
            department={department}
            selected={
              selected ===
              department.id
            }
            onSelect={onSelect}
          />
        )
      )}

      <OrbitControls
        makeDefault
        enableRotate
        enableZoom
        enablePan
        enableDamping
        dampingFactor={0.06}
        minDistance={8}
        maxDistance={30}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.05}
        target={[
          0,
          0,
          -2.5,
        ]}
      />

      <EffectComposer>
        <Bloom
          intensity={1.4}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>

    </>
  )
}

function Metric({
  label,
  value,
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Telemetry({
  label,
  value,
  width,
}) {
  return (
    <div className="telemetry-row">
      <div className="telemetry-label">
        <span>{label}</span>
        <span>{value}</span>
      </div>

      <div className="meter">
        <div
          className="meter-value"
          style={{ width }}
        />
      </div>
    </div>
  )
}

function App() {
  const [
    selected,
    setSelected,
  ] = useState('operations')

  const [time, setTime] = useState(
    new Date().toLocaleTimeString([], { hour12: false })
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString([], { hour12: false })
      )
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const active =
    getDepartment(selected)

  return (
    <main className="command-center">
      <div className="scanlines" />

      <header className="top-hud">
        <div className="brand-block">
          <div className="brand-mark">
            M
          </div>

          <div>
            <div className="brand-title">
              MAGNIUM TECHNOLOGY
              SOLUTIONS
            </div>

            <div className="brand-subtitle">
              ADVANCED OPERATIONS
              COMMAND SYSTEM
            </div>
          </div>
        </div>

        <div className="top-status">
          <span>
            <i className="status-dot" />
            CORE ONLINE
          </span>

          <span>SYS.01</span>

          <strong>
            {time}
          </strong>
        </div>
      </header>

      <section className="main-layout">
        <section className="network-panel">
          <div className="network-header">
            <span>
              <b>01 //</b>
              {' '}
              3D ORGANIZATIONAL
              FACILITY
            </span>

            <span>
              ROTATE // PAN // ZOOM
            </span>
          </div>

          <div className="three-workspace">
            <Canvas
              shadows
              camera={{
                position: [
                  16,
                  17,
                  18,
                ],
                fov: 45,
                near: 0.1,
                far: 100,
              }}
            >
              <FacilityScene
                selected={selected}
                onSelect={
                  setSelected
                }
              />
            </Canvas>

            <div className="control-help">
              <span>
                LEFT DRAG
                <b> ROTATE</b>
              </span>

              <span>
                RIGHT DRAG
                <b> PAN</b>
              </span>

              <span>
                SCROLL
                <b> ZOOM</b>
              </span>
            </div>
          </div>

          <div className="workspace-footer">
            <span>
              FACILITY VIEW // LIVE
            </span>

            <span>
              3D ENGINE // THREE.JS
            </span>

            <span>
              R3F // ACTIVE
            </span>
          </div>
        </section>

        <aside className="telemetry-panel">
          <section className="side-section">
            <div className="side-heading">
              <span>
                SELECTED NODE
              </span>

              <span>
                {active.code}
              </span>
            </div>

            <h1>
              {active.name}
            </h1>

            <div className="selected-status">
              <i className="status-dot" />
              {active.status}
            </div>

            <p>
              {active.description}
            </p>

            <div className="metrics-grid">
              <Metric
                label="CPU"
                value="18%"
              />

              <Metric
                label="MEM"
                value="42%"
              />

              <Metric
                label="TASKS"
                value="07"
              />

              <Metric
                label="ALERTS"
                value="00"
              />
            </div>
          </section>

          <section className="side-section">
            <div className="side-heading">
              <span>
                SYSTEM TELEMETRY
              </span>

              <span>LIVE</span>
            </div>

            <Telemetry
              label="CORE PROCESS"
              value="98%"
              width="98%"
            />

            <Telemetry
              label="DATABASE"
              value="86%"
              width="86%"
            />

            <Telemetry
              label="AI SERVICES"
              value="73%"
              width="73%"
            />

            <Telemetry
              label="SECURITY"
              value="100%"
              width="100%"
            />

            <Telemetry
              label="NETWORK"
              value="91%"
              width="91%"
            />
          </section>

          <section className="side-section">
            <div className="side-heading">
              <span>
                FACILITY CONTROLS
              </span>

              <span>3D</span>
            </div>

            <div className="instruction">
              LEFT MOUSE
              <strong>
                ORBIT CAMERA
              </strong>
            </div>

            <div className="instruction">
              RIGHT MOUSE
              <strong>
                MOVE CAMERA
              </strong>
            </div>

            <div className="instruction">
              MOUSE WHEEL
              <strong>
                ZOOM
              </strong>
            </div>

            <div className="instruction">
              ROOM
              <strong>
                CLICK TO SELECT
              </strong>
            </div>
          </section>

          <section className="side-section log-section">
            <div className="side-heading">
              <span>
                ACTIVITY LOG
              </span>

              <span>SYS.LOG</span>
            </div>

            <div className="terminal-log">
              <div>
                &gt; THREE.JS ENGINE ONLINE
              </div>

              <div>
                &gt; FACILITY MODEL LOADED
              </div>

              <div>
                &gt; CAMERA CONTROL ACTIVE
              </div>

              <div>
                &gt; NODE SELECTION ACTIVE
              </div>

              <div>
                &gt; OPERATIONS NOMINAL
              </div>

              <div className="terminal-cursor">
                &gt; _
              </div>
            </div>
          </section>
        </aside>
      </section>

      <footer className="bottom-hud">
        <div className="footer-block">
          <span>NETWORK</span>
          <strong>CONNECTED</strong>
        </div>

        <div className="footer-block">
          <span>3D ENGINE</span>
          <strong>ONLINE</strong>
        </div>

        <div className="footer-block">
          <span>DATABASE</span>
          <strong>ONLINE</strong>
        </div>

        <div className="footer-block">
          <span>SECURITY</span>
          <strong>ACTIVE</strong>
        </div>

        <div className="build-number">
          MTS.OS // BUILD 0.4.0
        </div>
      </footer>
    </main>
  )
}

export default App