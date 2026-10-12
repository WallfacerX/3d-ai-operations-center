import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { writeBotPosition } from '../simulation/engine.js'

export default function TaskBot({ bot, elapsed, selected, onSelect }) {
  const group = useRef()
  const ring = useRef()
  const target = useRef({ x: 0, y: 2, z: 0 })
  const initialized = useRef(false)
  const color = bot.status === 'completed' ? '#ffffff' : bot.status === 'idle' ? '#8baba0' : bot.color
  useFrame((_, delta) => {
    writeBotPosition(bot, target.current)
    const { x, y, z } = target.current
    const position = group.current.position
    if (!initialized.current) { position.set(x, y, z); initialized.current = true }
    const blend = 1 - Math.exp(-delta * 24)
    position.x += (x - position.x) * blend
    position.z += (z - position.z) * blend
    position.y = y + Math.sin(elapsed * 3 + bot.id.charCodeAt(5)) * 0.06
    ring.current.rotation.z = bot.status === 'working' ? elapsed * 2 : 0
    ring.current.scale.setScalar(selected ? 1.35 : 1)
  })
  const select = (event) => { event.stopPropagation(); onSelect(bot.id) }
  return (
    <group ref={group} onClick={select}>
      <mesh castShadow>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshStandardMaterial color="#13251c" emissive={color} emissiveIntensity={selected ? 1.8 : 1} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.37, 0.035, 8, 24, bot.status === 'working' ? Math.PI * 1.6 : Math.PI * 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
      </mesh>
      {(selected || bot.status === 'traveling') && <Html position={[0, 0.65, 0]} center zIndexRange={[40, 31]}>
        <button type="button" className={`bot-label ${selected ? 'is-selected' : ''}`} style={{ '--bot-color': color }} onClick={select} aria-pressed={selected}>
          <strong>{bot.name}</strong><span>{bot.status}</span>
        </button>
      </Html>}
    </group>
  )
}
