import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, Clock, Flame, Gauge, Link2, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { useStore } from '../store'
import { CountUp, Empty, PageHead, Ring, stagger } from '../components/ui'
import { LinkEditor } from '../components/LinkEditor'
import { LinkIcon, hostOf } from '../components/icons'
import { addDays, avgScore, dayScore, dow, fmtDate, habitDone, inr, overallStreak, rangeKeys, scheduled, startOfPeriod, todayKey } from '../utils'
import { goalProgress } from './Goals'
import type { QuickLink } from '../types'

const tip = { contentStyle: { background: 'var(--card-solid)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 } }
const ax = { stroke: 'var(--muted)', fontSize: 11 }

export default function Dashboard() {
  const { s, set } = useStore()
  const [editing, setEditing] = useState<QuickLink | null>(null)
  const [adding, setAdding] = useState(false)
  const today = todayKey()

  const D = useMemo(() => {
    const last7 = rangeKeys(addDays(today, -6), today)
    const prev7 = rangeKeys(addDays(today, -13), addDays(today, -7))
    const last30 = rangeKeys(addDays(today, -29), today)
    const a = avgScore(s, last7)
    const b = avgScore(s, prev7)
    const focus = Math.round((s.sessions.filter((x) => x.date >= last7[0]).reduce((t, x) => t + x.minutes, 0) / 60) * 10) / 10
    const ms = startOfPeriod('month')
    const month = s.txs.filter((t) => t.date >= ms)
    const income = month.filter((t) => t.type === 'income').reduce((t, x) => t + x.amount, 0)
    const expense = month.filter((t) => t.type === 'expense').reduce((t, x) => t + x.amount, 0)
    const trend = last30.map((k) => ({ d: fmtDate(k, { day: 'numeric', month: 'short' }), score: dayScore(s, k) }))
    const habits = s.habits.filter((h) => !h.archived).map((h) => {
      const sched = last30.filter((k) => h.days.includes(dow(k)))
      const done = sched.filter((k) => habitDone(s, h, k)).length
      return { h, rate: sched.length ? Math.round((done / sched.length) * 100) : 0 }
    }).sort((x, y) => y.rate - x.rate).slice(0, 6)
    const heatKeys = rangeKeys(addDays(today, -104), today)
    const heat: (number | null | undefined)[] = [...Array(dow(heatKeys[0])).fill(undefined), ...heatKeys.map((k) => dayScore(s, k))]
    return { a, b, focus, income, expense, trend, habits, heat }
  }, [s, today])

  const hs = scheduled(s, today)
  const todayScore = dayScore(s, today)
  const doneToday = hs.filter((h) => habitDone(s, h, today)).length
  const tasksToday = s.tasks.filter((t) => t.due === today)
  const delta = D.a !== null && D.b !== null ? D.a - D.b : null
  const recent = [...s.notes].sort((x, y) => y.updated.localeCompare(x.updated)).slice(0, 3)
  const goals = s.goals.slice(0, 3)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const kpis = [
    { l: 'Discipline score (7 days)', icon: Gauge, v: D.a ?? 0, f: (n: number) => (D.a === null ? '–' : Math.round(n) + '%'), d: delta === null ? 'No earlier data to compare' : <span className={delta >= 0 ? 'up' : 'down'}>{delta >= 0 ? '+' : ''}{delta} pts vs previous week</span> },
    { l: 'Current streak', icon: Flame, v: overallStreak(s), f: (n: number) => Math.round(n) + ' days', d: 'Days with a score of 70% or more' },
    { l: 'Focus time (7 days)', icon: Clock, v: D.focus, f: (n: number) => n.toFixed(1) + ' h', d: `${s.sessions.filter((x) => x.date >= addDays(today, -6)).length} sessions` },
    { l: 'Net this month', icon: Wallet, v: D.income - D.expense, f: (n: number) => inr(n), d: `${inr(D.income)} in · ${inr(D.expense)} out` },
  ]

  return (
    <>
      <PageHead title={`${greet}${s.settings.name ? ', ' + s.settings.name.split(' ')[0] : ''}`} sub={fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
        <Link to="/today" className="btn">Open today's check-in <ArrowRight size={16} /></Link>
      </PageHead>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        {kpis.map((k, i) => (
          <motion.div key={k.l} className="card kpi" {...stagger(i)}>
            <div className="l"><k.icon size={15} /> {k.l}</div>
            <div className="v"><CountUp value={k.v} format={k.f} /></div>
            <div className="d">{k.d}</div>
          </motion.div>
        ))}
      </div>

      <motion.div className="card" {...stagger(4)} style={{ marginBottom: 16 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}><Link2 size={16} /> Quick links</h3>
          <button className="btn ghost sm" onClick={() => setAdding(true)}><Plus size={14} /> Add link</button>
        </div>
        {s.links.length === 0 ? (
          <Empty emoji="🌿" title="No quick links yet" text="Add the websites and tools you open every day (email, GitHub, docs). They also appear in the side bar." action={<button className="btn" onClick={() => setAdding(true)}>Add your first link</button>} />
        ) : (
          <div className="links-grid">
            {s.links.map((l) => (
              <a key={l.id} className="link-tile" href={l.url} target="_blank" rel="noopener noreferrer">
                <span className="li"><LinkIcon link={l} size={22} /></span>
                <span style={{ minWidth: 0 }}><b>{l.title}</b><span className="muted small">{hostOf(l.url)}</span></span>
                <span className="acts">
                  <button className="icon-btn" title="Edit" onClick={(e) => { e.preventDefault(); setEditing(l) }}><Pencil size={14} /></button>
                  <button className="icon-btn" title="Remove" onClick={(e) => { e.preventDefault(); set((d) => ({ ...d, links: d.links.filter((x) => x.id !== l.id) })) }}><Trash2 size={14} /></button>
                </span>
              </a>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid split" style={{ marginBottom: 16 }}>
        <motion.div className="card" {...stagger(5)}>
          <h3>Discipline score, last 30 days</h3>
          {s.habits.length === 0 && s.tasks.length === 0 ? <Empty emoji="📈" title="Your trend will appear here" text="Add a habit or a task to start." action={<Link className="btn" to="/habits">Add habits</Link>} /> : (
            <div style={{ height: 230 }}><ResponsiveContainer><AreaChart data={D.trend}>
              <defs><linearGradient id="ds" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22a867" stopOpacity={0.25} /><stop offset="100%" stopColor="#22a867" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="d" {...ax} minTickGap={28} /><YAxis domain={[0, 100]} {...ax} width={32} />
              <Tooltip {...tip} formatter={(v: number) => v + '%'} /><Area type="monotone" dataKey="score" stroke="#22a867" strokeWidth={2} fill="url(#ds)" connectNulls />
            </AreaChart></ResponsiveContainer></div>
          )}
        </motion.div>
        <motion.div className="card" {...stagger(6)}>
          <h3>Today</h3>
          <div className="row" style={{ gap: 18 }}>
            <Ring value={todayScore ?? 0} size={112} stroke={10}><div><div style={{ fontSize: 24, fontWeight: 700 }}>{todayScore ?? 0}%</div></div></Ring>
            <div>
              <div style={{ fontWeight: 600 }}>{doneToday}/{hs.length} habits</div>
              <div className="muted small">{tasksToday.filter((t) => t.done).length}/{tasksToday.length} tasks due</div>
              <div className="muted small">{s.sessions.filter((x) => x.date === today).reduce((t, x) => t + x.minutes, 0)} min focus</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            {hs.slice(0, 4).map((h) => (
              <div key={h.id} className="row small" style={{ padding: '5px 0' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: habitDone(s, h, today) ? 'var(--accent2)' : 'var(--border)' }} />
                <span className="grow" style={{ color: habitDone(s, h, today) ? 'var(--muted)' : undefined }}>{h.emoji} {h.name}</span>
              </div>
            ))}
            {hs.length === 0 && <div className="muted small">No habits scheduled for today.</div>}
          </div>
        </motion.div>
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <motion.div className="card" {...stagger(7)}>
          <h3>Habit consistency, last 30 days</h3>
          {D.habits.length === 0 ? <Empty emoji="🌱" title="No habits yet" /> : (
            <div className="grid" style={{ gap: 12 }}>{D.habits.map(({ h, rate }) => (
              <div key={h.id}><div className="row between small"><b>{h.emoji} {h.name}</b><span className="muted">{rate}%</span></div>
                <div className="bar" style={{ marginTop: 5 }}><motion.div initial={{ width: 0 }} animate={{ width: rate + '%' }} transition={{ duration: 0.7 }} /></div></div>
            ))}</div>
          )}
        </motion.div>
        <motion.div className="card" {...stagger(8)}>
          <h3>Activity, last 15 weeks</h3>
          <div className="heat">{D.heat.map((v, i) => <div key={i} title={v == null ? '' : v + '%'} style={{ background: v === undefined ? 'transparent' : v === null ? undefined : `color-mix(in srgb, var(--accent) ${Math.max(18, v)}%, transparent)` }} />)}</div>
          <div className="row small muted" style={{ marginTop: 8, gap: 6 }}>Less {[18, 40, 65, 100].map((p) => <span key={p} style={{ width: 14, height: 14, borderRadius: 3, background: `color-mix(in srgb, var(--accent) ${p}%, transparent)` }} />)} More</div>
          <div style={{ marginTop: 14 }}><Link to="/analytics" className="small" style={{ fontWeight: 600 }}>Full analytics <ArrowRight size={12} style={{ verticalAlign: -2 }} /></Link></div>
        </motion.div>
      </div>

      <div className="grid g2">
        <motion.div className="card" {...stagger(9)}>
          <div className="row between"><h3>Goals</h3><Link to="/goals" className="small">View all</Link></div>
          {goals.length === 0 ? <div className="muted small">No goals yet. <Link to="/goals">Create one</Link></div> : (
            <div className="grid" style={{ gap: 14 }}>{goals.map((g) => {
              const p = goalProgress(s, g)
              const pct = Math.min(100, (p / g.target) * 100)
              return <div key={g.id}><div className="row between small"><b>{g.title}</b><span className="muted">{Math.round(pct)}%</span></div><div className="bar" style={{ marginTop: 5 }}><div style={{ width: pct + '%' }} /></div></div>
            })}</div>
          )}
        </motion.div>
        <motion.div className="card" {...stagger(10)}>
          <div className="row between"><h3>Recent notes</h3><Link to="/notebook" className="small">Open notebook</Link></div>
          {recent.length === 0 ? <div className="muted small">No notes yet. <Link to="/notebook">Write your first page</Link></div> : recent.map((n) => (
            <Link key={n.id} to="/notebook" state={{ open: n.id }} style={{ display: 'block', padding: '8px 0', borderTop: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none' }}>
              <b style={{ fontSize: 14 }}>{n.title || 'Untitled'}</b>
              <div className="muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body.trim().split('\n')[0] || 'Empty page'}</div>
            </Link>
          ))}
        </motion.div>
      </div>

      <LinkEditor open={adding || !!editing} link={editing} onClose={() => { setAdding(false); setEditing(null) }} />
    </>
  )
}
