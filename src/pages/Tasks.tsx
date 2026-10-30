import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import { useCats, useStore } from '../store'
import { Check, Empty, Modal, PageHead, toast } from '../components/ui'
import { fmtDate, todayKey, uid } from '../utils'
import type { Task } from '../types'

const blank = (category: string): Task => ({ id: '', title: '', priority: 'Medium', category, due: todayKey(), notes: '', done: false, created: todayKey() })
const PR = { High: 0, Medium: 1, Low: 2 }

export default function Tasks() {
  const { s, set } = useStore()
  const cats = useCats('activity')
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'overdue' | 'done' | 'all'>('today')
  const [sort, setSort] = useState<'priority' | 'due'>('priority')
  const [edit, setEdit] = useState<Task | null>(null)
  const [quick, setQuick] = useState('')
  const t0 = todayKey()

  let list = s.tasks.filter((t) => {
    if (filter === 'today') return !t.done && (!t.due || t.due <= t0)
    if (filter === 'upcoming') return !t.done && t.due && t.due > t0
    if (filter === 'overdue') return !t.done && t.due && t.due < t0
    if (filter === 'done') return t.done
    return true
  })
  list = [...list].sort((a, b) => sort === 'priority' ? PR[a.priority] - PR[b.priority] || (a.due || '').localeCompare(b.due || '') : (a.due || '9').localeCompare(b.due || '9'))
  const counts = {
    today: s.tasks.filter((t) => !t.done && (!t.due || t.due <= t0)).length,
    overdue: s.tasks.filter((t) => !t.done && t.due && t.due < t0).length,
  }

  const addQuick = () => {
    if (!quick.trim()) return
    set((d) => ({ ...d, tasks: [...d.tasks, { ...blank(cats[0]), id: uid(), title: quick.trim() }] }))
    setQuick('')
  }
  const save = () => {
    if (!edit || !edit.title.trim()) return toast('Title needed')
    set((d) => ({ ...d, tasks: edit.id ? d.tasks.map((t) => (t.id === edit.id ? edit : t)) : [...d.tasks, { ...edit, id: uid() }] }))
    setEdit(null)
  }
  const toggle = (t: Task) => set((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done, doneAt: !x.done ? todayKey() : undefined } : x)) }))

  return (
    <>
      <PageHead title="Tasks" sub="Check things off. Unfinished tasks carry over as overdue.">
        <button className="btn" onClick={() => setEdit(blank(cats[0]))}><Plus size={16} /> New task</button>
      </PageHead>

      <div className="row" style={{ marginBottom: 14 }}>
        <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Quick add a task for today and press Enter…" onKeyDown={(e) => e.key === 'Enter' && addQuick()} />
        <button className="btn" onClick={addQuick}>Add</button>
      </div>
      <div className="row between wrap" style={{ marginBottom: 14 }}>
        <div className="tabs">
          {(['today', 'upcoming', 'overdue', 'done', 'all'] as const).map((f) => (
            <button key={f} className={`tab ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}{f === 'today' && counts.today ? ` (${counts.today})` : ''}{f === 'overdue' && counts.overdue ? ` (${counts.overdue})` : ''}
            </button>
          ))}
        </div>
        <select style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="priority">Sort: priority</option><option value="due">Sort: due date</option>
        </select>
      </div>

      <div className="grid" style={{ gap: 10 }}>
        {list.length === 0 && <div className="card"><Empty emoji={filter === 'done' ? '🎯' : '🎉'} title={filter === 'done' ? 'Nothing completed yet' : 'All clear!'} text="Add a task with the box above." /></div>}
        <AnimatePresence>
          {list.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} className="card row" style={{ padding: 14 }}>
              <Check on={t.done} onClick={() => toggle(t)} />
              <div className="grow" onClick={() => setEdit(t)} style={{ cursor: 'pointer' }}>
                <div style={{ fontWeight: 600, textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.5 : 1 }}>{t.title}</div>
                <div className="row wrap small muted" style={{ marginTop: 4, gap: 8 }}>
                  <span className={`tag ${t.priority}`}>{t.priority}</span><span className="tag">{t.category}</span>
                  {t.due && <span style={{ color: !t.done && t.due < t0 ? 'var(--danger)' : undefined }}>{t.due < t0 && !t.done ? 'Overdue · ' : ''}{t.due === t0 ? 'Today' : fmtDate(t.due)}</span>}
                </div>
                {t.notes && <div className="small muted" style={{ marginTop: 4 }}>{t.notes}</div>}
              </div>
              <button className="icon-btn" onClick={() => set((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== t.id) }))}><Trash2 size={16} /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit task' : 'New task'}>
        {edit && (
          <>
            <label>Title</label>
            <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} autoFocus />
            <div className="row">
              <div className="grow"><label>Priority</label><select value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value as any })}><option>High</option><option>Medium</option><option>Low</option></select></div>
              <div className="grow"><label>Category</label><select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
            </div>
            <label>Due date</label>
            <input type="date" value={edit.due || ''} onChange={(e) => setEdit({ ...edit, due: e.target.value || undefined })} />
            <label>Notes</label>
            <textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
            <button className="btn" style={{ width: '100%', marginTop: 16 }} onClick={save}>Save task</button>
          </>
        )}
      </Modal>
    </>
  )
}
