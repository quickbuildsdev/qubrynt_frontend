import { motion } from 'framer-motion'
import { LOGO_BG, LOGO_SHAPES } from './logoShapes'

/** The Qubrynt mark. With animate, the paper facets fold into place one by one. */
export function Logo({ size = 32, animate = false }: { size?: number; animate?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Qubrynt" style={{ flexShrink: 0, display: 'block' }}>
      <circle cx="50" cy="50" r="50" fill={LOGO_BG} />
      {LOGO_SHAPES.map((s, i) =>
        animate ? (
          <motion.polygon key={i} points={s.points} fill={s.fill} stroke={s.fill} strokeWidth={0.3} strokeLinejoin="round"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={{ opacity: 0, scale: 0.4, rotate: -12 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.05 + i * 0.028, type: 'spring', stiffness: 240, damping: 18 }} />
        ) : (
          <polygon key={i} points={s.points} fill={s.fill} stroke={s.fill} strokeWidth={0.3} strokeLinejoin="round" />
        )
      )}
    </svg>
  )
}

/** Full-screen loading view. */
export function Splash() {
  return (
    <div className="center-screen" style={{ flexDirection: 'column', gap: 18 }}>
      <Logo size={84} animate />
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ fontWeight: 650, fontSize: 20, letterSpacing: '-.02em' }}>Qubrynt</motion.div>
    </div>
  )
}
