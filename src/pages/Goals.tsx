import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { Confetti, Empty, Modal, PageHead, stagger, toast } from '../components/ui'
import { endOfPeriod, habitDone, inr, parseKey, rangeKeys, startOfPeriod, todayKey, uid } from '../utils'
import type { Goal, State } from '../types'

export const goalProgress = (s: State, g: Goal) => {
  const a = startOfPeriod(g.period, s.settings.weekStart)
  const b = endOfPeriod(g.period, s.settings.weekStart)
  if (g.kind === 'manual') return g.progress || 0
  if (g.kind === 'income') return s.txs.filter((t) => t.type === 'income' && t.date >= a && t.date <= b).reduce((x, y) => x + y.amount, 0)
  if (g.kind === 'tasks') return s.tasks.filter((t) => t.done && t.doneAt && t.doneAt >= a && t.doneAt <= b).length
  if (g.kind === 'focus') return Math.round((s.sessions.filter((x) => x.date >= a && x.date <= b).reduce((x, y) => x + y.minutes, 0) / 60) * 10) / 10
  const h = s.habits.find((x) => x.id === g.habitId)
  if (!h) return 0
  const keys = rangeKeys(a, b)
  if (h.type === 'check') return keys.filter((k) => habitDone(s, h, k)).length
  return keys.reduce((t, k) => t + (s.logs[`${h.id}|${k}`] || 0), 0)
}

const blank = (): Goal => ({ id: '', title: '', kind: 'habit', target: 10, period: 'month', unit: '' })

export default function Goals() {
  const { s, set } = useStore()
  const [edit, setEdit] = useState<Goal | null>(null)
  const [fire, setFire] = useState(0)
  const doneRef = useRef<Set<string> | null>(null)
  const today = todayKey()

  useEffect(() => {
    const now = new Set(s.goals.filter((g) => goalProgress(s, g) >= g.target).map((g) => g.id))
    if (doneRef.current) now.forEach((id) => { if (!doneRef.current!.has(id)) { setFire((f) => f + 1); toast('Goal completed!') } })
    doneRef.current = now
  }, [s])

  const save = () => {
    if (!edit || !edit.title.trim() || !(edit.target > 0)) return toast('Title and target needed')
    if (edit.kind === 'habit' && !edit.habitId) return toast('Choose a habit')
    set((d) => ({ ...d, goals: edit.id ? d.goals.map((g) => (g.id === edit.id ? edit : g)) : [...d.goals, { ...edit, id: uid() }] }))
    setEdit(null)
  }
  const unitOf = (g: Goal) => g.kind === 'income' ? '' : g.kind === 'tasks' ? 'tasks' : g.kind === 'focus' ? 'hrs' : g.kind === 'habit' ? (s.habits.find((h) => h.id === g.habitId)?.unit || 'days') : g.unit
  const fmt = (g: Goal, n: number) => g.kind === 'income' ? inr(n) : `${Math.round(n * 10) / 10} ${unitOf(g)}`

  return (
    <>
      <Confetti fire={fire} />
      <PageHead title="Goals" sub="Weekly, monthly and yearly targets that track themselves.">
        <button className="btn" onClick={() => setEdit({ ...blank(), habitId: s.habits[0]?.id })}><Plus size={16} /> New goal</button>
      </PageHead>
      {s.goals.length === 0 ? (
        <div className="card"><Empty emoji="🎯" title="No goals yet" text='Try "Run 100 km this month" or "Earn ₹50,000 this month".' action={<button className="btn" onClick={() => setEdit({ ...blank(), habitId: s.habits[0]?.id })}>Create a goal</button>} /></div>
      ) : (
        <div className="grid g2">
          {s.goals.map((g, i) => {
            const p = goalProgress(s, g)
            const pct = Math.min(100, (p / g.target) * 100)
            const left = Math.max(0, Math.round((parseKey(endOfPeriod(g.period, s.settings.weekStart)).getTime() - parseKey(today).getTime()) / 864e5))
            const done = p >= g.target
            return (
              <motion.div key={g.id} className="card" {...stagger(i)} style={done ? { borderColor: 'var(--accent2)' } : undefined}>
                <div className="row between"><b style={{ fontSize: 16 }}>{g.title}</b>
                  <div className="row"><button className="icon-btn" onClick={() => setEdit(g)}><Pencil size={15} /></button><button className="icon-btn" onClick={() => set((d) => ({ ...d, goals: d.goals.filter((x) => x.id !== g.id) }))}><Trash2 size={15} /></button></div></div>
                <div className="muted small" style={{ margin: '4px 0 12px' }}>{g.period === 'week' ? 'This week' : g.period === 'month' ? 'This month' : 'This year'} · {left} day{left !== 1 && 's'} left</div>
                <div className="bar" style={{ height: 12 }}><motion.div initial={{ width: 0 }} animate={{ width: pct + '%' }} transition={{ duration: 0.9 }} /></div>
                <div className="row between" style={{ marginTop: 8 }}><span style={{ fontWeight: 700 }}>{fmt(g, p)} <span className="muted">/ {fmt(g, g.target)}</span></span><b>{Math.round(pct)}%</b></div>
                {g.kind === 'manual' && (
                  <div className="row" style={{ marginTop: 10 }}>
                    <button className="btn ghost sm" onClick={() => set((d) => ({ ...d, goals: d.goals.map((x) => x.id === g.id ? { ...x, progress: Math.max(0, (x.progress || 0) - 1) } : x) }))}>−1</button>
                    <button className="btn ghost sm" onClick={() => set((d) => ({ ...d, goals: d.goals.map((x) => x.id === g.id ? { ...x, progress: (x.progress || 0) + 1 } : x) }))}>+1</button>
                    <span className="muted small">manual progress</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit goal' : 'New goal'}>
        {edit && (<>
          <label>Goal name</label><input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Run 100 km this month" autoFocus />
          <label>Tracks</label>
          <select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as any })}>
            <option value="habit">A habit (auto)</option><option value="income">Income earned (auto)</option><option value="tasks">Tasks completed (auto)</option><option value="focus">Focus hours (auto)</option><option value="manual">Manual count</option>
          </select>
          {edit.kind === 'habit' && (<><label>Habit</label>
            {s.habits.length === 0 ? <div className="muted small">Create a habit first.</div> : <select value={edit.habitId} onChange={(e) => setEdit({ ...edit, habitId: e.target.value })}>{s.habits.map((h) => <option key={h.id} value={h.id}>{h.emoji} {h.name}</option>)}</select>}</>)}
          {edit.kind === 'manual' && (<><label>Unit</label><input value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} placeholder="books, courses…" /></>)}
          <div className="row">
            <div className="grow"><label>Target</label><input type="number" value={edit.target} onChange={(e) => setEdit({ ...edit, target: +e.target.value })} /></div>
            <div className="grow"><label>Period</label><select value={edit.period} onChange={(e) => setEdit({ ...edit, period: e.target.value as any })}><option value="week">Weekly</option><option value="month">Monthly</option><option value="year">Yearly</option></select></div>
          </div>
          <button className="btn" style={{ width: '100%', marginTop: 16 }} onClick={save}>Save goal</button>
        </>)}
      </Modal>
    </>
  )
}
