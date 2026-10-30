import { ReactNode, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, animate } from 'framer-motion'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function Modal({ open, onClose, title, sub, children }: { open: boolean; onClose: () => void; title: string; sub?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [open, onClose])
  // Rendered into <body>: the sidebar and dock use backdrop-filter, which would otherwise trap a fixed dialog inside them
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="modal-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div className="modal" initial={{ y: 40, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 320 }}>
            <div className="row between">
              <div>
                <h2>{title}</h2>
                {sub && <div className="muted small">{sub}</div>}
              </div>
              <button className="icon-btn" onClick={onClose}><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function Empty({ emoji, title, text, action }: { emoji: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="big">{emoji}</div>
      <h4>{title}</h4>
      {text && <p style={{ marginBottom: 14 }}>{text}</p>}
      {action}
    </div>
  )
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="row wrap">{children}</div>
    </div>
  )
}

export function CountUp({ value, format = (n: number) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const [v, setV] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const c = animate(prev.current, value, { duration: 0.9, ease: 'easeOut', onUpdate: (x) => setV(x) })
    prev.current = value
    return () => c.stop()
  }, [value])
  return <>{format(v)}</>
}

export function Ring({ value, size = 130, stroke = 12, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke="var(--accent)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(100, value) / 100) }} transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  )
}

export function Check({ on, onClick, color }: { on: boolean; onClick: () => void; color?: string }) {
  return (
    <motion.button whileTap={{ scale: 0.8 }} className={`check ${on ? 'on' : ''}`} onClick={onClick} aria-label="toggle">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }} transition={{ duration: 0.3 }} />
      </svg>
    </motion.button>
  )
}

export const stagger = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: Math.min(i, 12) * 0.045, duration: 0.35 } })

export function Confetti({ fire }: { fire: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!fire) return
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    cv.width = innerWidth
    cv.height = innerHeight
    const cols = ['#22a867','#0f6b44','#6fd3a5','#e6dcc3','#f4eddc','#aeaeb2']
    const ps = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2, y: innerHeight * 0.4, vx: (Math.random() - 0.5) * 16, vy: Math.random() * -15 - 3,
      s: Math.random() * 7 + 4, c: cols[Math.floor(Math.random() * cols.length)], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    }))
    let t = 0
    let raf = 0
    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height)
      ps.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.38; p.vx *= 0.99; p.r += p.vr
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - t / 130)
        ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s / 1.6); ctx.restore()
      })
      if (++t < 130) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, cv.width, cv.height)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [fire])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }} />
}

let toastSet: ((m: string) => void) | null = null
export const toast = (m: string) => toastSet?.(m)
export function Toaster() {
  const [m, setM] = useState('')
  useEffect(() => {
    toastSet = (x) => {
      setM(x)
      setTimeout(() => setM(''), 2200)
    }
    return () => { toastSet = null }
  }, [])
  return (
    <AnimatePresence>
      {m && <motion.div className="toast" initial={{ y: 20, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ opacity: 0, x: '-50%' }}>{m}</motion.div>}
    </AnimatePresence>
  )
}

export function DayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const names = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {names.map((n, i) => (
        <button type="button" key={i} className={`chip ${value.includes(i) ? 'on' : ''}`} style={{ width: 38, height: 38, justifyContent: 'center', padding: 0 }}
          onClick={() => onChange(value.includes(i) ? value.filter((x) => x !== i) : [...value, i].sort())}>{n}</button>
      ))}
    </div>
  )
}
