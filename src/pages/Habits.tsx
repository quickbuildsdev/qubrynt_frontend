import { useState } from 'react'
import { motion } from 'framer-motion'
import { Archive, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCats, useStore } from '../store'
import { DayPicker, Empty, Modal, PageHead, stagger, toast } from '../components/ui'
import { DAY_NAMES, streakOf, uid } from '../utils'
import type { Habit } from '../types'

const STARTERS: Partial<Habit>[] = [
  { name: 'Yoga', emoji: '🧘', category: 'Health', type: 'check' },
  { name: 'Running', emoji: '🏃', category: 'Health', type: 'number', unit: 'km', target: 5 },
  { name: 'Reading', emoji: '📚', category: 'Study', type: 'number', unit: 'pages', target: 20 },
  { name: 'Meditation', emoji: '🕉️', category: 'Mind', type: 'number', unit: 'min', target: 10 },
  { name: 'Water', emoji: '💧', category: 'Health', type: 'number', unit: 'glasses', target: 8 },
  { name: 'Gym', emoji: '🏋️', category: 'Health', type: 'check' },
  { name: 'Sleep early', emoji: '😴', category: 'Health', type: 'check' },
  { name: 'Coding', emoji: '💻', category: 'Work', type: 'number', unit: 'min', target: 60 },
  { name: 'Learn something new', emoji: '💡', category: 'Study', type: 'check' },
]
const EMOJIS = ['🧘', '🏃', '📚', '💧', '🏋️', '😴', '💻', '🎯', '✍️', '🍎', '🚴', '🎸', '🧠', '🙏', '🚫', '🌅']
const blank = (category: string): Habit => ({ id: '', name: '', emoji: '🎯', type: 'check', unit: '', target: 1, days: [0, 1, 2, 3, 4, 5, 6], category })

export default function Habits() {
  const { s, set } = useStore()
  const cats = useCats('activity')
  const [edit, setEdit] = useState<Habit | null>(null)
  const [showArch, setShowArch] = useState(false)
  const list = s.habits.filter((h) => !!h.archived === showArch)

  const save = () => {
    if (!edit || !edit.name.trim()) return toast('Give the habit a name')
    const h = { ...edit, name: edit.name.trim(), target: edit.type === 'number' ? edit.target || 1 : 1 }
    if (!h.days.length) return toast('Pick at least one day')
    set((d) => ({ ...d, habits: h.id ? d.habits.map((x) => (x.id === h.id ? h : x)) : [...d.habits, { ...h, id: uid() }] }))
    setEdit(null)
    toast('Habit saved ✓')
  }
  const quick = (t: Partial<Habit>) => {
    if (s.habits.some((h) => h.name === t.name && !h.archived)) return toast(`${t.name} already added`)
    setEdit({ ...blank(cats[0]), ...t, category: cats.includes(t.category!) ? t.category! : cats[0] } as Habit)
  }

  return (
    <>
      <PageHead title="Habits" sub="Everything you want to do regularly. Add as many as you like.">
        <button className="btn ghost" onClick={() => setShowArch(!showArch)}><Archive size={16} /> {showArch ? 'Active' : 'Archived'}</button>
        <button className="btn" onClick={() => setEdit(blank(cats[0]))}><Plus size={16} /> New habit</button>
      </PageHead>

      {!showArch && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Quick add</h3>
          <div className="row wrap">{STARTERS.map((t) => <button key={t.name} className="chip" onClick={() => quick(t)}>{t.emoji} {t.name}</button>)}</div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="card"><Empty emoji={showArch ? '📦' : '🌱'} title={showArch ? 'No archived habits' : 'No habits yet'} text={showArch ? undefined : 'Tap a quick-add chip above or create your own.'} action={!showArch && <button className="btn" onClick={() => setEdit(blank(cats[0]))}>Create first habit</button>} /></div>
      ) : (
        <div className="grid g2">
          {list.map((h, i) => {
            const st = streakOf(s, h)
            return (
              <motion.div key={h.id} className="card habit-card" {...stagger(i)}>
                <div className="emoji">{h.emoji}</div>
                <div className="grow">
                  <div className="hname">{h.name}</div>
                  <div className="muted small">{h.type === 'number' ? `${h.target} ${h.unit}/day` : 'Done / not done'} · {h.days.length === 7 ? 'Every day' : h.days.map((d) => DAY_NAMES[d]).join(', ')}</div>
                  <div className="row" style={{ marginTop: 6 }}><span className="tag">{h.category}</span><span className="small muted">Streak {st.cur} · best {st.best}</span></div>
                </div>
                <button className="icon-btn" onClick={() => setEdit(h)}><Pencil size={16} /></button>
                <button className="icon-btn" title={h.archived ? 'Restore' : 'Archive'} onClick={() => set((d) => ({ ...d, habits: d.habits.map((x) => x.id === h.id ? { ...x, archived: !x.archived } : x) }))}><Archive size={16} /></button>
                <button className="icon-btn" onClick={() => { if (confirm(`Delete "${h.name}" and all its history?`)) set((d) => ({ ...d, habits: d.habits.filter((x) => x.id !== h.id), logs: Object.fromEntries(Object.entries(d.logs).filter(([k]) => !k.startsWith(h.id + '|'))) })) }}><Trash2 size={16} /></button>
              </motion.div>
            )
          })}
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit habit' : 'New habit'}>
        {edit && (
          <>
            <label>Name</label>
            <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Morning run" autoFocus />
            <label>Icon</label>
            <div className="row wrap" style={{ gap: 6 }}>{EMOJIS.map((e) => <button key={e} className={`chip ${edit.emoji === e ? 'on' : ''}`} style={{ padding: '4px 9px', fontSize: 18 }} onClick={() => setEdit({ ...edit, emoji: e })}>{e}</button>)}</div>
            <label>Type</label>
            <div className="tabs">
              <button className={`tab ${edit.type === 'check' ? 'on' : ''}`} onClick={() => setEdit({ ...edit, type: 'check' })}>Done / not done</button>
              <button className={`tab ${edit.type === 'number' ? 'on' : ''}`} onClick={() => setEdit({ ...edit, type: 'number', target: edit.target && edit.target > 1 ? edit.target : 5, unit: edit.unit || 'units' })}>Numeric</button>
            </div>
            {edit.type === 'number' && (
              <div className="row">
                <div className="grow"><label>Daily target</label><input type="number" min={1} value={edit.target} onChange={(e) => setEdit({ ...edit, target: +e.target.value })} /></div>
                <div className="grow"><label>Unit</label><input value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} placeholder="km, pages, min" /></div>
              </div>
            )}
            <label>Repeat on</label>
            <DayPicker value={edit.days} onChange={(days) => setEdit({ ...edit, days })} />
            <div className="row" style={{ marginTop: 6 }}>
              <button className="chip" onClick={() => setEdit({ ...edit, days: [0, 1, 2, 3, 4, 5, 6] })}>Every day</button>
              <button className="chip" onClick={() => setEdit({ ...edit, days: [1, 2, 3, 4, 5] })}>Weekdays</button>
            </div>
            <label>Category</label>
            <select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
            <button className="btn" style={{ width: '100%', marginTop: 18 }} onClick={save}>Save habit</button>
          </>
        )}
      </Modal>
    </>
  )
}
