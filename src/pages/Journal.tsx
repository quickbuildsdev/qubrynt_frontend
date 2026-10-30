import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { Empty, Modal, PageHead, stagger, toast } from '../components/ui'
import { MOODS, fmtDate, todayKey, uid } from '../utils'
import type { Entry } from '../types'

type Tab = 'learned' | 'achievements' | 'reflection'

export default function Journal() {
  const { s, set } = useStore()
  const [tab, setTab] = useState<Tab>('learned')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Entry | null>(null)
  const key = tab === 'learned' ? 'learnings' : 'achievements'
  const items = (tab === 'reflection' ? [] : (s as any)[key] as Entry[]).filter((e) => (e.title + e.details + e.tag).toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date))
  const blank = (): Entry => ({ id: '', title: '', details: '', tag: 'General', date: todayKey(), link: '' })
  const save = () => {
    if (!edit || !edit.title.trim()) return toast('Title needed')
    set((d: any) => ({ ...d, [key]: edit.id ? d[key].map((x: Entry) => (x.id === edit.id ? edit : x)) : [{ ...edit, id: uid() }, ...d[key]] }))
    setEdit(null)
  }
  const tags = Array.from(new Set(((s as any)[key] as Entry[]).map((e) => e.tag)))
  const refl = [...s.reflections].sort((a, b) => b.date.localeCompare(a.date))
  const today = s.reflections.find((r) => r.date === todayKey()) ?? { date: todayKey(), mood: 0, note: '', well: '', improve: '' }
  const upd = (patch: Partial<typeof today>) => set((d) => {
    const ex = d.reflections.some((r) => r.date === today.date)
    const n = { ...today, ...patch }
    return { ...d, reflections: ex ? d.reflections.map((r) => (r.date === n.date ? n : r)) : [...d.reflections, n] }
  })

  return (
    <>
      <PageHead title="Journal" sub="What you learned, what you achieved, how you felt.">
        {tab !== 'reflection' && <button className="btn" onClick={() => setEdit(blank())}><Plus size={16} /> {tab === 'learned' ? 'Add learning' : 'Add achievement'}</button>}
      </PageHead>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${tab === 'learned' ? 'on' : ''}`} onClick={() => setTab('learned')}>Learned ({s.learnings.length})</button>
        <button className={`tab ${tab === 'achievements' ? 'on' : ''}`} onClick={() => setTab('achievements')}>Achievements ({s.achievements.length})</button>
        <button className={`tab ${tab === 'reflection' ? 'on' : ''}`} onClick={() => setTab('reflection')}>Daily reflection</button>
      </div>

      {tab !== 'reflection' ? (
        <>
          <div className="row wrap" style={{ marginBottom: 14 }}>
            <input style={{ maxWidth: 320 }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            {tags.map((t) => <button key={t} className={`chip ${q === t ? 'on' : ''}`} onClick={() => setQ(q === t ? '' : t)}>#{t}</button>)}
          </div>
          {items.length === 0 ? (
            <div className="card"><Empty emoji={tab === 'learned' ? '💡' : '🏆'} title={tab === 'learned' ? 'Nothing logged yet' : 'No wins logged yet'} text={tab === 'learned' ? 'Write down new things you learn. You will love the 3-month report.' : 'Log every win, big or small.'} action={<button className="btn" onClick={() => setEdit(blank())}>Add one</button>} /></div>
          ) : (
            <div className="timeline">
              {items.map((e, i) => (
                <motion.div key={e.id} className="tl-item" {...stagger(i)}>
                  <div className="card">
                    <div className="row between"><b>{e.title}</b>
                      <div className="row"><span className="tag">#{e.tag}</span><span className="muted small">{fmtDate(e.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <button className="icon-btn" onClick={() => setEdit(e)}><Pencil size={15} /></button>
                        <button className="icon-btn" onClick={() => set((d: any) => ({ ...d, [key]: d[key].filter((x: Entry) => x.id !== e.id) }))}><Trash2 size={15} /></button></div></div>
                    {e.details && <p className="muted" style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: 14 }}>{e.details}</p>}
                    {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="small" style={{ color: 'var(--accent-ink)' }}>{e.link}</a>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid split">
          <div className="card">
            <h3>Today's reflection</h3>
            <div className="row" style={{ justifyContent: 'space-between', margin: '4px 0 10px' }}>
              {MOODS.map((m, i) => <motion.button key={i} whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.15 }} onClick={() => upd({ mood: i + 1 })} style={{ fontSize: 34, opacity: today.mood === i + 1 ? 1 : 0.35 }}>{m}</motion.button>)}
            </div>
            <label>Summary of the day</label><textarea value={today.note} onChange={(e) => upd({ note: e.target.value })} />
            <label>What went well</label><textarea value={today.well} onChange={(e) => upd({ well: e.target.value })} />
            <label>What to improve</label><textarea value={today.improve} onChange={(e) => upd({ improve: e.target.value })} />
            <div className="muted small" style={{ marginTop: 8 }}>Saved automatically ✓</div>
          </div>
          <div>
            <h3 style={{ marginBottom: 10 }}>Past days</h3>
            {refl.filter((r) => r.date !== todayKey()).length === 0 ? <div className="card"><Empty emoji="🌙" title="No past reflections" /></div> :
              refl.filter((r) => r.date !== todayKey()).slice(0, 20).map((r) => (
                <div key={r.date} className="card" style={{ marginBottom: 10 }}>
                  <div className="row between"><b>{fmtDate(r.date)}</b><span style={{ fontSize: 24 }}>{MOODS[r.mood - 1] ?? ''}</span></div>
                  {r.note && <p className="muted small" style={{ marginTop: 6 }}>{r.note}</p>}
                  {r.well && <p className="small" style={{ marginTop: 6 }}>Went well: {r.well}</p>}
                  {r.improve && <p className="small" style={{ marginTop: 4 }}>To improve: {r.improve}</p>}
                </div>
              ))}
          </div>
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit entry' : tab === 'learned' ? 'What did you learn?' : 'What did you achieve?'}>
        {edit && (
          <>
            <label>Title</label><input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} autoFocus />
            <label>Details</label><textarea value={edit.details} onChange={(e) => setEdit({ ...edit, details: e.target.value })} />
            <div className="row">
              <div className="grow"><label>Tag</label><input value={edit.tag} onChange={(e) => setEdit({ ...edit, tag: e.target.value.replace('#', '') })} placeholder="Coding, Health…" /></div>
              <div className="grow"><label>Date</label><input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></div>
            </div>
            <label>Link (optional)</label><input value={edit.link} onChange={(e) => setEdit({ ...edit, link: e.target.value })} placeholder="https://…" />
            <button className="btn" style={{ width: '100%', marginTop: 16 }} onClick={save}>Save</button>
          </>
        )}
      </Modal>
    </>
  )
}
