import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'

export function Machine({ position, size = [0.8, 0.45, 0.8], color }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#16251e" emissive={color} emissiveIntensity={0.12} metalness={0.6} roughness={0.45} />
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

export function RoomDetails({ department }) {
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

export function BlenderDesk({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 0.5,
}) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/desk.glb`)

  const model = useMemo(() => scene.clone(true), [scene])

  return (
    <primitive
      object={model}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  )
}

useGLTF.preload(`${import.meta.env.BASE_URL}models/desk.glb`)

