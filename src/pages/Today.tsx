import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Flame, Minus, Plus } from 'lucide-react'
import { useStore } from '../store'
import { Check, Confetti, CountUp, Empty, PageHead, Ring, stagger } from '../components/ui'
import { addDays, dayScore, dow, fmtDate, habitDone, habitValue, overallStreak, scheduled, streakOf, todayKey, parseKey } from '../utils'
import type { Habit } from '../types'

export default function Today() {
  const { s, set } = useStore()
  const [date, setDate] = useState(todayKey())
  const [fire, setFire] = useState(0)
  const isToday = date === todayKey()
  const hs = scheduled(s, date)
  const score = dayScore(s, date)
  const prev = useRef(score)

  useEffect(() => {
    if (score === 100 && prev.current !== null && prev.current < 100) setFire((f) => f + 1)
    prev.current = score
  }, [score])
  useEffect(() => { prev.current = dayScore(s, date) }, [date])

  const setVal = (h: Habit, v: number) => set((d) => ({ ...d, logs: { ...d.logs, [`${h.id}|${date}`]: Math.max(0, v) } }))
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dayTasks = s.tasks.filter((t) => (t.due === date) || (isToday && !t.done && t.due && t.due < date)).sort((a, b) => Number(a.done) - Number(b.done)).slice(0, 5)
  const dayBlocks = s.blocks.filter((b) => b.days.includes(dow(date))).sort((a, b) => a.start.localeCompare(b.start))
  const now = new Date()
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const next = isToday ? dayBlocks.find((b) => b.end > hm && s.blockLogs[`${b.id}|${date}`] !== 'done') : dayBlocks[0]
  const doneCount = hs.filter((h) => habitDone(s, h, date)).length
  const best = Math.max(0, ...s.habits.map((h) => streakOf(s, h).cur))
  const focusToday = s.sessions.filter((x) => x.date === date).reduce((a, b) => a + b.minutes, 0)

  return (
    <>
      <Confetti fire={fire} />
      <PageHead title={`${greet}${s.settings.name ? ', ' + s.settings.name : ''}`} sub={isToday ? 'Small steps every day build discipline.' : 'Editing a past day'}>
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))}><ChevronLeft /></button>
        <div style={{ minWidth: 118, textAlign: 'center', fontWeight: 700 }}>{isToday ? 'Today' : fmtDate(date)}</div>
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} disabled={date >= todayKey()} style={{ opacity: date >= todayKey() ? 0.3 : 1 }}><ChevronRight /></button>
        {!isToday && <button className="btn ghost sm" onClick={() => setDate(todayKey())}>Back to today</button>}
      </PageHead>

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <motion.div className="card row" {...stagger(0)} style={{ gap: 18, gridColumn: 'span 1' }}>
          <Ring value={score ?? 0}>
            <div><div style={{ fontSize: 30, fontWeight: 800 }}><CountUp value={score ?? 0} />%</div><div className="muted small">discipline</div></div>
          </Ring>
          <div>
            <div style={{ fontWeight: 700 }}>{doneCount}/{hs.length} habits</div>
            <div className="muted small">{dayTasks.filter((t) => t.done).length}/{dayTasks.length} tasks</div>
            <div className="muted small">{focusToday} min focus</div>
          </div>
        </motion.div>
        <motion.div className="card" {...stagger(1)}>
          <h3><Flame size={18} /> Streaks</h3>
          <div className="row" style={{ gap: 24 }}>
            <div><div style={{ fontSize: 30, fontWeight: 800 }}><CountUp value={overallStreak(s)} /></div><div className="muted small">overall days (≥70%)</div></div>
            <div><div style={{ fontSize: 30, fontWeight: 800 }}><CountUp value={best} /></div><div className="muted small">best habit streak</div></div>
          </div>
        </motion.div>
        <motion.div className="card" {...stagger(2)}>
          <h3>Next up</h3>
          {next ? (
            <div className="row"><div style={{ width: 6, alignSelf: 'stretch', borderRadius: 6, background: 'var(--accent)' }} />
              <div><div style={{ fontWeight: 700 }}>{next.title}</div><div className="muted small">{next.start} – {next.end}</div></div></div>
          ) : <div className="muted small">Nothing scheduled. <Link to="/schedule" style={{ color: 'var(--accent-ink)' }}>Plan your routine</Link></div>}
        </motion.div>
      </div>

      <div className="grid split">
        <div>
          <div className="row between" style={{ marginBottom: 10 }}><h3 style={{ margin: 0 }}>Habits</h3><Link className="small" style={{ color: 'var(--accent-ink)' }} to="/habits">Manage</Link></div>
          {hs.length === 0 ? (
            <div className="card"><Empty emoji="🌱" title="No habits for this day" text="Add habits like Yoga, Running or Reading to start tracking." action={<Link to="/habits" className="btn" style={{ textDecoration: 'none' }}>Add habits</Link>} /></div>
          ) : (
            <div className="grid" style={{ gap: 10 }}>
              {hs.map((h, i) => {
                const done = habitDone(s, h, date)
                const v = habitValue(s, h, date)
                const st = streakOf(s, h).cur
                return (
                  <motion.div key={h.id} layout {...stagger(i)} className={`card habit-card ${done ? 'done' : ''}`}>
                    <div className="emoji">{h.emoji}</div>
                    <div className="grow">
                      <div className="hname">{h.name}</div>
                      <div className="muted small">{st > 0 ? `${st} day${st > 1 ? 's' : ''}` : h.category}{h.type === 'number' && ` · target ${h.target} ${h.unit}`}</div>
                      {h.type === 'number' && <div className="bar" style={{ marginTop: 7 }}><motion.div animate={{ width: `${Math.min(100, (v / (h.target || 1)) * 100)}%` }} /></div>}
                    </div>
                    {h.type === 'check' ? (
                      <Check on={done} onClick={() => setVal(h, done ? 0 : 1)} />
                    ) : (
                      <div className="stepper">
                        <button onClick={() => setVal(h, v - (h.target! >= 20 ? 5 : 1))}><Minus size={14} /></button>
                        <input type="number" value={v} onChange={(e) => setVal(h, +e.target.value)} />
                        <button onClick={() => setVal(h, v + (h.target! >= 20 ? 5 : 1))}><Plus size={14} /></button>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
        <div>
          <div className="row between" style={{ marginBottom: 10 }}><h3 style={{ margin: 0 }}>{isToday ? "Today's tasks" : 'Tasks'}</h3><Link className="small" style={{ color: 'var(--accent-ink)' }} to="/tasks">All tasks</Link></div>
          <div className="card">
            {dayTasks.length === 0 ? <Empty emoji="✨" title="No tasks due" text="Add one with the + button." /> : dayTasks.map((t) => (
              <div key={t.id} className="row" style={{ padding: '8px 0' }}>
                <Check on={t.done} onClick={() => set((d) => ({ ...d, tasks: d.tasks.map((x) => x.id === t.id ? { ...x, done: !x.done, doneAt: !x.done ? todayKey() : undefined } : x) }))} />
                <div className="grow" style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.55 : 1 }}>
                  {t.title}
                  {t.due && t.due < date && !t.done && <span className="tag High" style={{ marginLeft: 8 }}>Overdue</span>}
                </div>
                <span className={`tag ${t.priority}`}>{t.priority}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 14 }} />
          <ReflectionMini date={date} />
        </div>
      </div>
    </>
  )
}

function ReflectionMini({ date }: { date: string }) {
  const { s, set } = useStore()
  const r = s.reflections.find((x) => x.date === date)
  const moods = ['😞', '😕', '😐', '🙂', '😄']
  const setMood = (m: number) => set((d) => {
    const ex = d.reflections.find((x) => x.date === date)
    return { ...d, reflections: ex ? d.reflections.map((x) => x.date === date ? { ...x, mood: m } : x) : [...d.reflections, { date, mood: m, note: '', well: '', improve: '' }] }
  })
  return (
    <div className="card">
      <h3>How was your day?</h3>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        {moods.map((m, i) => (
          <motion.button key={i} whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.15 }} onClick={() => setMood(i + 1)} style={{ fontSize: 30, opacity: r?.mood === i + 1 ? 1 : 0.4, filter: r?.mood === i + 1 ? 'none' : 'grayscale(.6)' }}>{m}</motion.button>
        ))}
      </div>
    </div>
  )
}
