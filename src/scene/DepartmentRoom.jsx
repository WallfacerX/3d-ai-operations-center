import { Html } from '@react-three/drei'
import { Machine, RoomDetails, BlenderDesk } from './RoomDetails.jsx'

export default function DepartmentRoom({
  department,
  selected,
  onSelect,
  working = 0,
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
        zIndexRange={[30, 0]}
      >
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onSelect(department.id) }}
          aria-pressed={selected}
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
            {working ? `${working} WORKING` : 'READY'}
          </span>
        </button>
      </Html>
    </group>
  )
}

export function Connection({
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

