import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check as CheckI, Pencil, Plus, SkipForward, Trash2 } from 'lucide-react'
import { useCats, useStore } from '../store'
import { DayPicker, Empty, Modal, PageHead, stagger, toast } from '../components/ui'
import { dow, todayKey, uid } from '../utils'
import type { Block } from '../types'

const blank = (category: string): Block => ({ id: '', title: '', start: '06:00', end: '07:00', category, days: [0, 1, 2, 3, 4, 5, 6] })

export default function Schedule() {
  const { s, set } = useStore()
  const cats = useCats('activity')
  const [edit, setEdit] = useState<Block | null>(null)
  const [now, setNow] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(i) }, [])
  const date = todayKey()
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const blocks = s.blocks.filter((b) => b.days.includes(dow(date))).sort((a, b) => a.start.localeCompare(b.start))
  const mark = (b: Block, v: 'done' | 'skipped') => set((d) => {
    const k = `${b.id}|${date}`
    const bl = { ...d.blockLogs }
    if (bl[k] === v) delete bl[k]; else bl[k] = v
    return { ...d, blockLogs: bl }
  })
  const save = () => {
    if (!edit || !edit.title.trim()) return toast('Title needed')
    if (edit.end <= edit.start) return toast('End time must be after start')
    set((d) => ({ ...d, blocks: edit.id ? d.blocks.map((b) => (b.id === edit.id ? edit : b)) : [...d.blocks, { ...edit, id: uid() }] }))
    setEdit(null)
  }
  const done = blocks.filter((b) => s.blockLogs[`${b.id}|${date}`] === 'done').length
  const todaySessions = s.sessions.filter((x) => x.date === date)
  const focus = todaySessions.reduce((a, b) => a + b.minutes, 0)

  return (
    <>
      <PageHead title="Schedule" sub={`Your routine for today · ${done}/${blocks.length} blocks done`}>
        <button className="btn" onClick={() => setEdit(blank(cats[0]))}><Plus size={16} /> Time block</button>
      </PageHead>
      <div className="grid split">
        <div>
          {blocks.length === 0 ? (
            <div className="card"><Empty emoji="⏰" title="No routine for today" text="Add blocks like 06:00 Yoga, 09:00 Deep work, 21:00 Reading." action={<button className="btn" onClick={() => setEdit(blank(cats[0]))}>Add first block</button>} /></div>
          ) : (
            <div className="timeline">
              {blocks.map((b, i) => {
                const st = s.blockLogs[`${b.id}|${date}`]
                const isNow = hm >= b.start && hm < b.end
                return (
                  <motion.div key={b.id} {...stagger(i)} className={`tl-item ${isNow ? 'now' : ''}`}>
                    <div className="card row" style={{ padding: 14, opacity: st ? 0.7 : 1 }}>
                      <div className="grow">
                        <div className="row" style={{ gap: 8 }}><b style={{ textDecoration: st === 'done' ? 'line-through' : 'none' }}>{b.title}</b>{isNow && <span className="tag Medium">NOW</span>}{st === 'skipped' && <span className="tag">skipped</span>}</div>
                        <div className="muted small">{b.start} – {b.end} · {b.category}</div>
                      </div>
                      <button className="icon-btn" title="Done" style={st === 'done' ? { background: 'var(--accent2)', color: '#fff' } : undefined} onClick={() => mark(b, 'done')}><CheckI size={17} /></button>
                      <button className="icon-btn" title="Skip" style={st === 'skipped' ? { background: 'var(--muted)', color: '#fff' } : undefined} onClick={() => mark(b, 'skipped')}><SkipForward size={16} /></button>
                      <button className="icon-btn" onClick={() => setEdit(b)}><Pencil size={15} /></button>
                      <button className="icon-btn" onClick={() => confirm('Delete this block?') && set((d) => ({ ...d, blocks: d.blocks.filter((x) => x.id !== b.id) }))}><Trash2 size={15} /></button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
        <div>
          <div className="card">
            <h3>Focus today</h3>
            <div style={{ fontSize: 34, fontWeight: 800 }}>{Math.floor(focus / 60)}h {focus % 60}m</div>
            <div className="muted small" style={{ marginBottom: 10 }}>Use the timer button (bottom right) to log focus sessions.</div>
            {todaySessions.length === 0 ? <div className="muted small">No sessions yet.</div> : todaySessions.slice(-6).reverse().map((x) => (
              <div key={x.id} className="row between small" style={{ padding: '6px 0', borderTop: '1px solid var(--border)' }}><span>{x.label}</span><span className="muted">{x.minutes} min</span></div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit block' : 'New time block'}>
        {edit && (
          <>
            <label>Title</label>
            <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Yoga, Deep work, Reading…" autoFocus />
            <div className="row">
              <div className="grow"><label>Start</label><input type="time" value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} /></div>
              <div className="grow"><label>End</label><input type="time" value={edit.end} onChange={(e) => setEdit({ ...edit, end: e.target.value })} /></div>
            </div>
            <label>Category</label>
            <select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
            <label>Repeat on</label>
            <DayPicker value={edit.days} onChange={(days) => setEdit({ ...edit, days })} />
            <button className="btn" style={{ width: '100%', marginTop: 18 }} onClick={save}>Save block</button>
          </>
        )}
      </Modal>
    </>
  )
}
