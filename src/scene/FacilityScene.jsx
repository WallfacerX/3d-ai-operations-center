import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { departments, connections, getDepartment } from '../data/facility.js'
import DepartmentRoom, { Connection } from './DepartmentRoom.jsx'
import TaskBot from './TaskBot.jsx'

function CameraReset({ version }) {
  const { camera, controls } = useThree()
  useEffect(() => {
    camera.position.set(16, 17, 18)
    controls?.target.set(0, 0, -2.5)
    controls?.update()
  }, [version, camera, controls])
  return null
}

export default function FacilityScene({
  selected,
  onSelect,
  simulation,
  selectedBot,
  onSelectBot,
  cameraVersion,
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
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
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
            80,
            0.12,
            80,
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
      {simulation.bots.map((bot) => (
        <TaskBot
          key={bot.id}
          bot={bot}
          elapsed={simulation.elapsed}
          selected={selectedBot === bot.id}
          onSelect={onSelectBot}
        />
      ))}

      {/* Departments */}
      {departments.map(
        (department) => (
          <DepartmentRoom
            key={department.id}
            department={department}
            working={simulation.bots.filter((bot) => bot.status === 'working' && bot.currentDepartment === department.id).length}
            selected={
              selected ===
              department.id
            }
            onSelect={onSelect}
          />
        )
      )}

      <CameraReset version={cameraVersion} />
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
          intensity={0.45}
          luminanceThreshold={1}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>

    </>
  )
}

