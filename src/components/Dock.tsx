import { ReactNode, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, MotionValue, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Plus, Timer } from 'lucide-react'
import { useStore } from '../store'
import { useTimer } from './Timer'
import { LinkEditor } from './LinkEditor'
import { LinkIcon } from './icons'
import { Logo } from './Logo'
import { MENU, NOTEBOOK, SETTINGS, NavItem } from './nav'

const BASE = 46
const MAX = 70
const RANGE = 140

/** One dock icon. It grows as the pointer gets close, like the macOS dock. */
function Tile({ mouseX, label, active, plain, children }: { mouseX: MotionValue<number>; label: string; active?: boolean; plain?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const distance = useTransform(mouseX, (v) => { const b = ref.current?.getBoundingClientRect(); return b ? v - b.x - b.width / 2 : Infinity })
  const size = useSpring(useTransform(distance, [-RANGE, 0, RANGE], [BASE, MAX, BASE]), { mass: 0.1, stiffness: 170, damping: 14 })
  const iconScale = useTransform(size, [BASE, MAX], [1, 1.4])
  return (
    <motion.div ref={ref} className={`dock-item ${active ? 'active' : ''} ${plain ? 'plain' : ''}`} style={{ width: size, height: size }} whileTap={{ scale: 0.92 }}>
      <motion.span className="dock-ic" style={{ scale: iconScale }}>{children}</motion.span>
      <span className="dock-tip">{label}</span>
      {active && <motion.span layoutId="dock-dot" className="dock-dot" />}
    </motion.div>
  )
}

/** Navigation as a floating dock at the bottom of the screen (an alternative to the left sidebar). */
export function Dock() {
  const { s, status } = useStore()
  const timer = useTimer()
  const mouseX = useMotionValue(Infinity)
  const [linkOpen, setLinkOpen] = useState(false)
  const statusText = status === 'saving' ? 'Saving…' : status === 'error' ? 'Offline, retrying' : 'All saved'

  const nav = (it: NavItem) => (
    <NavLink key={it.to} to={it.to} end={it.end} className="dock-link" aria-label={it.label}>
      {({ isActive }) => <Tile mouseX={mouseX} label={it.label} active={isActive}><it.icon size={22} /></Tile>}
    </NavLink>
  )
  const Sep = () => <span className="dock-sep" />

  return (
    <div className="dock-wrap no-print">
      <motion.nav className="dock" initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        onMouseMove={(e) => mouseX.set(e.clientX)} onMouseLeave={() => mouseX.set(Infinity)}>
        <Tile mouseX={mouseX} label={`Qubrynt · ${statusText}`} plain><Logo size={30} /></Tile>
        <Sep />
        {MENU.map(nav)}
        <Sep />
        {nav(NOTEBOOK)}
        <button className="dock-link" onClick={timer.open} aria-label="Focus timer">
          <Tile mouseX={mouseX} label={timer.running ? `Timer ${timer.label}` : 'Timer'} active={timer.running}>
            {timer.label ? <span style={{ fontSize: 10.5, fontWeight: 700 }}>{timer.label}</span> : <Timer size={22} />}
          </Tile>
        </button>
        <Sep />
        {s.links.slice(0, 6).map((l) => (
          <a key={l.id} className="dock-link" href={l.url} target="_blank" rel="noopener noreferrer" aria-label={l.title}>
            <Tile mouseX={mouseX} label={l.title}><LinkIcon link={l} size={24} /></Tile>
          </a>
        ))}
        <button className="dock-link" onClick={() => setLinkOpen(true)} aria-label="Add quick link"><Tile mouseX={mouseX} label="Add quick link"><Plus size={22} /></Tile></button>
        <Sep />
        {nav(SETTINGS)}
      </motion.nav>
      <LinkEditor open={linkOpen} link={null} onClose={() => setLinkOpen(false)} />
    </div>
  )
}
