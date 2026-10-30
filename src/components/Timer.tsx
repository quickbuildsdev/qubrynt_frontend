import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Square } from 'lucide-react'
import { useCats, useStore } from '../store'
import { Ring, Modal, toast } from './ui'
import { todayKey, uid } from '../utils'

type Mode = 'pomodoro' | 'stopwatch'
type Ctx = { open: () => void; running: boolean; label: string }
const C = createContext<Ctx>({ open: () => {}, running: false, label: '' })
export const useTimer = () => useContext(C)

const mm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`

/** Focus timer. It lives above the pages, so it keeps running while you move around the app. */
export function TimerProvider({ children }: { children: ReactNode }) {
  const { set } = useStore()
  const cats = useCats('activity')
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('pomodoro')
  const [work, setWork] = useState(25)
  const [brk, setBrk] = useState(5)
  const [phase, setPhase] = useState<'work' | 'break'>('work')
  const [category, setCategory] = useState(cats[0])
  const [label, setLabel] = useState('')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(0)
  const baseRef = useRef(0)

  const total = (phase === 'work' ? work : brk) * 60
  const shown = mode === 'pomodoro' ? Math.max(0, total - elapsed) : elapsed

  useEffect(() => {
    if (!running) return
    startRef.current = Date.now()
    baseRef.current = elapsed
    const id = setInterval(() => setElapsed(baseRef.current + Math.floor((Date.now() - startRef.current) / 1000)), 250)
    return () => clearInterval(id)
    // eslint-disable-next-line
  }, [running])

  const save = (secs: number) => {
    const minutes = Math.round(secs / 60)
    if (minutes < 1) return
    set((d) => ({ ...d, sessions: [...d.sessions, { id: uid(), date: todayKey(), minutes, category, label: label || category, mode }] }))
    toast(`Saved ${minutes} min of ${category}`)
  }

  useEffect(() => {
    if (mode === 'pomodoro' && running && elapsed >= total) {
      setRunning(false)
      try { navigator.vibrate?.([200, 100, 200]); const a = new AudioContext(); const o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 880; o.start(); setTimeout(() => o.stop(), 400) } catch {}
      if (phase === 'work') save(total)
      setPhase(phase === 'work' ? 'break' : 'work')
      setElapsed(0)
      toast(phase === 'work' ? 'Focus session done. Take a break.' : 'Break over. Back to it.')
    }
    // eslint-disable-next-line
  }, [elapsed])

  const stop = () => {
    setRunning(false)
    if (mode === 'stopwatch' || phase === 'work') save(elapsed)
    setElapsed(0)
  }
  const pct = mode === 'pomodoro' ? (elapsed / total) * 100 : ((elapsed % 3600) / 3600) * 100

  return (
    <C.Provider value={{ open: () => setOpen(true), running, label: running || elapsed ? mm(shown) : '' }}>
      {children}
      <Modal open={open} onClose={() => setOpen(false)} title="Focus timer" sub="Sessions are saved for your time analytics">
        <div className="tabs" style={{ margin: '14px 0' }}>
          {(['pomodoro', 'stopwatch'] as Mode[]).map((m) => (
            <button key={m} className={`tab ${mode === m ? 'on' : ''}`} onClick={() => { if (!running) { setMode(m); setElapsed(0) } }}>{m === 'pomodoro' ? 'Pomodoro' : 'Stopwatch'}</button>
          ))}
        </div>
        <div style={{ display: 'grid', placeItems: 'center', margin: '10px 0 16px' }}>
          <Ring value={pct} size={190} stroke={12}>
            <div>
              <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-.03em' }}>{mm(shown)}</div>
              <div className="muted small">{mode === 'pomodoro' ? (phase === 'work' ? 'Focus' : 'Break') : 'Elapsed'}</div>
            </div>
          </Ring>
        </div>
        <div className="row" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <button className="btn" onClick={() => setRunning(!running)}>{running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {elapsed ? 'Resume' : 'Start'}</>}</button>
          <button className="btn ghost" onClick={stop}><Square size={15} /> Stop &amp; save</button>
          <button className="icon-btn" onClick={() => { setRunning(false); setElapsed(0) }} title="Reset"><RotateCcw size={16} /></button>
        </div>
        <label>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <label>What are you working on? (optional)</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. React course" />
        {mode === 'pomodoro' && (
          <div className="row" style={{ marginTop: 6 }}>
            <div className="grow"><label>Focus (min)</label><input type="number" min={1} value={work} disabled={running} onChange={(e) => setWork(+e.target.value || 25)} /></div>
            <div className="grow"><label>Break (min)</label><input type="number" min={1} value={brk} disabled={running} onChange={(e) => setBrk(+e.target.value || 5)} /></div>
          </div>
        )}
      </Modal>
    </C.Provider>
  )
}
