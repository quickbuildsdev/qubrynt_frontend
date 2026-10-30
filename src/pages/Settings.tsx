import { useRef, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { emptyState, ensureBooks, useStore } from '../store'
import { useAuth } from '../auth'
import { Modal, PageHead, toast } from '../components/ui'
import { addDays, dkey, dow, downloadFile, todayKey, uid } from '../utils'
import type { CategoryType, State } from '../types'

const GROUPS: { type: CategoryType; title: string; hint: string }[] = [
  { type: 'activity', title: 'Activity categories', hint: 'Used by habits, tasks, schedule blocks and focus sessions' },
  { type: 'expense', title: 'Expense categories', hint: 'Food, Travel, Bills… used when you add an expense' },
  { type: 'income', title: 'Income sources', hint: 'Salary, Freelance… used when you add income' },
]

export default function SettingsPage() {
  const { s, set, replace } = useStore()
  const { user, logout, deleteAccount } = useAuth()
  const file = useRef<HTMLInputElement>(null)
  const [delOpen, setDelOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const st = s.settings
  const up = (p: Partial<typeof st>) => set((d) => ({ ...d, settings: { ...d.settings, ...p } }))

  const notif = async () => {
    if (!('Notification' in window)) return toast('Notifications are not supported in this browser')
    const r = await Notification.requestPermission()
    up({ reminderOn: r === 'granted' })
    toast(r === 'granted' ? 'Reminder on (keep the tab open)' : 'Permission denied')
  }

  // ----- categories -----
  const addCat = (type: CategoryType, name: string) => {
    name = name.trim()
    if (!name) return false
    if (s.categories.some((c) => c.type === type && c.name.toLowerCase() === name.toLowerCase())) { toast('That category already exists'); return false }
    set((d) => ({ ...d, categories: [...d.categories, { id: uid(), name, type }] }))
    return true
  }
  const renameCat = (id: string, name: string) => {
    name = name.trim()
    const c = s.categories.find((x) => x.id === id)
    if (!c || !name || name === c.name) return
    if (s.categories.some((x) => x.type === c.type && x.id !== id && x.name.toLowerCase() === name.toLowerCase())) return toast('That category already exists')
    const swap = (v: string) => (v === c.name ? name : v)
    set((d) => ({
      ...d,
      categories: d.categories.map((x) => (x.id === id ? { ...x, name } : x)),
      // keep existing items in sync with the new name
      ...(c.type === 'activity' ? {
        habits: d.habits.map((h) => (h.category === c.name ? { ...h, category: name } : h)),
        tasks: d.tasks.map((t) => (t.category === c.name ? { ...t, category: name } : t)),
        blocks: d.blocks.map((b) => (b.category === c.name ? { ...b, category: name } : b)),
        sessions: d.sessions.map((x) => (x.category === c.name ? { ...x, category: swap(x.category) } : x)),
      } : { txs: d.txs.map((t) => (t.type === c.type && t.category === c.name ? { ...t, category: name } : t)) }),
    }))
  }
  const removeCat = (id: string) => {
    const c = s.categories.find((x) => x.id === id)
    if (!c) return
    if (s.categories.filter((x) => x.type === c.type).length <= 1) return toast('Keep at least one category')
    set((d) => ({ ...d, categories: d.categories.filter((x) => x.id !== id) }))
    toast('Removed. Existing items keep the old name')
  }

  // ----- data -----
  const importFile = async (f: File) => {
    try {
      const p = JSON.parse(await f.text())
      if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error()
      const base = emptyState()
      const next: State = { ...base, ...p, categories: p.categories?.length ? p.categories : s.categories, links: p.links ?? s.links, notebooks: p.notebooks ?? s.notebooks, notes: p.notes ?? s.notes, settings: s.settings }
      if (!confirm('Replace your current data with this backup?')) return
      replace(ensureBooks(next))
      toast('Backup restored')
    } catch { toast('That file is not a valid backup') }
  }
  const wipe = () => {
    if (!confirm('Delete all habits, tasks, logs, journal, money and goals? Your notes, links, categories and settings stay. This cannot be undone.')) return
    replace({ ...emptyState(), notebooks: s.notebooks, notes: s.notes, links: s.links, categories: s.categories, settings: s.settings })
    toast('Tracking data deleted')
  }
  const removeAccount = async () => {
    setBusy(true)
    try { await deleteAccount(pw) } catch (e: any) { toast(e.message); setBusy(false) }
  }

  return (
    <>
      <PageHead title="Settings" sub="Profile, categories, data and account" />
      <div className="grid g2">
        <div className="card">
          <h3>Profile & appearance</h3>
          <label>Display name</label><input value={st.name} onChange={(e) => up({ name: e.target.value })} placeholder="Shown in the greeting" maxLength={80} />
          <label>Theme</label>
          <div className="tabs"><button className={`tab ${st.theme === 'light' ? 'on' : ''}`} onClick={() => up({ theme: 'light' })}>Light</button><button className={`tab ${st.theme === 'dark' ? 'on' : ''}`} onClick={() => up({ theme: 'dark' })}>Dark</button></div>
          <label>Navigation on computers</label>
          <div className="tabs"><button className={`tab ${st.navPosition !== 'bottom' ? 'on' : ''}`} onClick={() => up({ navPosition: 'left' })}>Left sidebar</button><button className={`tab ${st.navPosition === 'bottom' ? 'on' : ''}`} onClick={() => up({ navPosition: 'bottom' })}>Bottom dock</button></div>
          <div className="muted small" style={{ marginTop: 6 }}>Phones always use a tab bar at the bottom.</div>
          <label>Week starts on</label>
          <div className="tabs"><button className={`tab ${st.weekStart === 1 ? 'on' : ''}`} onClick={() => up({ weekStart: 1 })}>Monday</button><button className={`tab ${st.weekStart === 0 ? 'on' : ''}`} onClick={() => up({ weekStart: 0 })}>Sunday</button></div>
          <label>Daily reminder</label>
          <div className="row"><input type="time" value={st.reminder} onChange={(e) => up({ reminder: e.target.value })} style={{ width: 140 }} />
            {st.reminderOn ? <button className="btn ghost" onClick={() => up({ reminderOn: false })}>Turn off</button> : <button className="btn" onClick={notif}>Enable</button>}</div>
          <div className="muted small" style={{ marginTop: 6 }}>Browser notifications work while the app tab is open.</div>
        </div>

        <div className="card">
          <h3>Account</h3>
          <div className="small muted">Signed in as</div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{user?.name}</div>
          <div className="muted" style={{ marginBottom: 16 }}>{user?.email}</div>
          <div className="row wrap">
            <button className="btn ghost" onClick={logout}>Log out</button>
            <button className="btn danger" onClick={() => { setPw(''); setDelOpen(true) }}>Delete account</button>
          </div>
          <div className="muted small" style={{ marginTop: 10 }}>Your data is stored in the database, linked to this account. Deleting the account removes everything permanently.</div>
        </div>

        {GROUPS.map((g) => <CategoryGroup key={g.type} {...g} items={s.categories.filter((c) => c.type === g.type)} onAdd={(n) => addCat(g.type, n)} onRename={renameCat} onRemove={removeCat} />)}

        <div className="card">
          <h3>Your data</h3>
          <p className="muted small" style={{ marginBottom: 12 }}>Export a copy any time, or restore one. Backups are plain JSON files.</p>
          <div className="row wrap">
            <button className="btn" onClick={() => downloadFile(`qubrynt-backup-${todayKey()}.json`, JSON.stringify(s, null, 2), 'application/json')}>Export backup</button>
            <button className="btn ghost" onClick={() => file.current?.click()}>Import backup</button>
            <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importFile(f) }} />
          </div>
          <div className="row wrap" style={{ marginTop: 12 }}>
            <button className="btn ghost" onClick={() => { if (confirm('Fill your account with 3 months of sample data? This replaces your habits, tasks and logs.')) { replace({ ...makeDemo(s), settings: s.settings, categories: s.categories, links: s.links, notebooks: s.notebooks, notes: s.notes }); toast('Demo data loaded') } }}>Load demo data</button>
            <button className="btn ghost" onClick={wipe}>Delete tracking data</button>
          </div>
          <div className="muted small" style={{ marginTop: 8 }}>Demo data lets you preview the analytics. Delete tracking data to start fresh.</div>
        </div>
      </div>

      <div className="muted small" style={{ textAlign: 'center', marginTop: 28 }}>Qubrynt v{__APP_VERSION__}</div>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete your account?" sub="This permanently deletes your account and all your data.">
        <label>Enter your password to confirm</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && pw && removeAccount()} />
        <button className="btn danger" style={{ width: '100%', marginTop: 16 }} disabled={!pw || busy} onClick={removeAccount}>{busy ? 'Deleting…' : 'Delete everything'}</button>
      </Modal>
    </>
  )
}

function CategoryGroup({ title, hint, items, onAdd, onRename, onRemove }: {
  title: string; hint: string; items: { id: string; name: string }[]
  onAdd: (n: string) => boolean; onRename: (id: string, n: string) => void; onRemove: (id: string) => void
}) {
  const [name, setName] = useState('')
  const add = () => { if (onAdd(name)) setName('') }
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="muted small" style={{ marginBottom: 12 }}>{hint}. Click a name to rename it.</div>
      <div className="row wrap" style={{ gap: 8 }}>
        {items.map((c) => (
          <span key={c.id + c.name} className="cat-chip">
            <input defaultValue={c.name} maxLength={40} aria-label={`Rename ${c.name}`} onBlur={(e) => onRename(c.id, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} style={{ width: Math.max(60, c.name.length * 9 + 12) }} />
            <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => onRemove(c.id)} title="Remove"><X size={14} /></button>
          </span>
        ))}
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" maxLength={40} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn" onClick={add}><Plus size={16} /> Add</button>
      </div>
    </div>
  )
}

/** Sample data so the analytics can be previewed. */
function makeDemo(cur: State): State {
  const d = emptyState()
  const act = (name: string) => cur.categories.find((c) => c.type === 'activity' && c.name === name)?.name ?? cur.categories.find((c) => c.type === 'activity')?.name ?? 'Other'
  const exp = cur.categories.filter((c) => c.type === 'expense').map((c) => c.name)
  const mk = (name: string, emoji: string, type: 'check' | 'number', target: number, unit: string, cat: string, days = [0, 1, 2, 3, 4, 5, 6]) => ({ id: uid(), name, emoji, type, target, unit, category: act(cat), days })
  d.habits = [mk('Yoga', '🧘', 'check', 1, '', 'Health'), mk('Running', '🏃', 'number', 5, 'km', 'Health', [1, 3, 5, 6]), mk('Reading', '📚', 'number', 20, 'pages', 'Study'), mk('Coding', '💻', 'number', 60, 'min', 'Work', [1, 2, 3, 4, 5])]
  const today = dkey(new Date())
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]
  for (let i = 100; i >= 0; i--) {
    const k = addDays(today, -i)
    const trend = 0.55 + ((100 - i) / 100) * 0.35
    d.habits.forEach((h) => {
      if (!h.days.includes(dow(k)) || rnd() > trend) return
      d.logs[`${h.id}|${k}`] = h.type === 'check' ? 1 : Math.round(h.target! * (0.8 + rnd() * 0.5))
    })
    if (rnd() < 0.5) d.sessions.push({ id: uid(), date: k, minutes: 25 * (1 + Math.floor(rnd() * 3)), category: act(pick(['Work', 'Study', 'Health'])), label: 'Focus', mode: 'pomodoro' })
    if (rnd() < 0.6) d.reflections.push({ date: k, mood: 2 + Math.floor(rnd() * 4), note: '', well: '', improve: '' })
    if (rnd() < 0.08) d.learnings.push({ id: uid(), title: 'Learned something new', details: '', tag: 'Coding', date: k })
    if (rnd() < 0.05) d.achievements.push({ id: uid(), title: 'Small win', details: '', tag: 'Work', date: k })
    if (rnd() < 0.1) d.tasks.push({ id: uid(), title: 'Finish a task', priority: 'Medium', category: act('Work'), due: k, done: rnd() < 0.8, doneAt: k, created: k })
    if (i % 30 === 0) d.txs.push({ id: uid(), type: 'income', amount: 30000 + Math.round(rnd() * 20000), category: cur.categories.find((c) => c.type === 'income')?.name ?? 'Salary', date: k, note: '' })
    if (exp.length && rnd() < 0.2) d.txs.push({ id: uid(), type: 'expense', amount: 200 + Math.round(rnd() * 2000), category: pick(exp), date: k, note: '' })
  }
  d.goals = [{ id: uid(), title: 'Run 60 km this month', kind: 'habit', habitId: d.habits[1].id, target: 60, period: 'month' }]
  return d
}
