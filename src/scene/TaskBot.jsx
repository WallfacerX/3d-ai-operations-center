import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { createMotion, updateMotion, advanceMotion } from './workerMotion.js'

export default function TaskBot({ bot, online, selected, onSelect }) {
  const group = useRef()
  const ring = useRef()
  const motion = useRef(null)
  const color = bot.status === 'awaiting_review' ? '#ffbd59' : bot.status === 'error' ? '#ff3853' : bot.status === 'idle' ? '#8baba0' : bot.color
  useEffect(() => {
    if (!motion.current) motion.current = createMotion(bot)
    if (online) updateMotion(motion.current, bot)
  }, [bot, online])
  useFrame((_, delta) => {
    if (!motion.current) return
    const position = advanceMotion(motion.current, delta, online)
    const elapsed = motion.current.elapsed
    group.current.position.set(position.x, position.y + Math.sin(elapsed * 3 + bot.id) * 0.06, position.z)
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
      <Html position={[0, 0.65, 0]} center zIndexRange={[40, 31]}>
        <button type="button" className={`bot-label ${selected ? 'is-selected' : ''}`} style={{ '--bot-color': color }} onClick={select} aria-pressed={selected}>
          <strong>{bot.name}</strong><span>{bot.status.replaceAll('_', ' ')}</span>
        </button>
      </Html>
    </group>
  )
}
