import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Printer } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../store'
import { CountUp, Empty, PageHead, stagger } from '../components/ui'
import { DAY_NAMES, CHART_COLORS, addDays, dayScore, downloadFile, dow, fmtDate, habitDone, inr, parseKey, rangeKeys, scheduled, streakOf, todayKey } from '../utils'

const RANGES = [['Week', 7], ['Month', 30], ['3 Months', 90], ['Year', 365]] as const
const tip = { contentStyle: { background: 'var(--card-solid)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 } }
const ax = { stroke: 'var(--muted)', fontSize: 11 }

export default function Analytics() {
  const { s } = useStore()
  const [n, setN] = useState<number>(90)
  const [custom, setCustom] = useState(false)
  const [from, setFrom] = useState(addDays(todayKey(), -29))
  const [to, setTo] = useState(todayKey())
  const end = custom ? to : todayKey()
  const start = custom ? from : addDays(end, -n + 1)
  const keys = useMemo(() => rangeKeys(start, end), [start, end])
  const days = keys.length
  const bucket = days > 60 ? 7 : 1 // weekly buckets for long ranges

  const D = useMemo(() => {
    // score trend
    const scores = keys.map((k) => dayScore(s, k))
    const trend: { d: string; score: number | null }[] = []
    for (let i = 0; i < keys.length; i += bucket) {
      const sl = scores.slice(i, i + bucket).filter((x): x is number => x !== null)
      trend.push({ d: fmtDate(keys[i], { day: 'numeric', month: 'short' }), score: sl.length ? Math.round(sl.reduce((a, b) => a + b, 0) / sl.length) : null })
    }
    const valid = scores.filter((x): x is number => x !== null)
    const avg = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0
    // habit rates
    const hab = s.habits.filter((h) => !h.archived).map((h) => {
      const sched = keys.filter((k) => h.days.includes(dow(k)))
      const done = sched.filter((k) => habitDone(s, h, k)).length
      const total = h.type === 'number' ? keys.reduce((t, k) => t + (s.logs[`${h.id}|${k}`] || 0), 0) : done
      return { h, name: `${h.emoji} ${h.name}`, rate: sched.length ? Math.round((done / sched.length) * 100) : 0, done, sched: sched.length, total, st: streakOf(s, h) }
    })
    const totalHabitDone = hab.reduce((a, b) => a + b.done, 0)
    // time per category
    const cat: Record<string, number> = {}
    const ss = s.sessions.filter((x) => x.date >= start && x.date <= end)
    ss.forEach((x) => (cat[x.category] = (cat[x.category] || 0) + x.minutes))
    const timeCat = Object.entries(cat).map(([name, v]) => ({ name, value: Math.round((v / 60) * 10) / 10 }))
    const hours = Math.round((ss.reduce((a, b) => a + b.minutes, 0) / 60) * 10) / 10
    // weekly buckets for tasks / learn / ach
    const weeks: { w: string; Tasks: number; Learned: number; Wins: number }[] = []
    for (let i = 0; i < keys.length; i += 7) {
      const a = keys[i], b = keys[Math.min(i + 6, keys.length - 1)]
      weeks.push({
        w: fmtDate(a, { day: 'numeric', month: 'short' }),
        Tasks: s.tasks.filter((t) => t.done && t.doneAt && t.doneAt >= a && t.doneAt <= b).length,
        Learned: s.learnings.filter((t) => t.date >= a && t.date <= b).length,
        Wins: s.achievements.filter((t) => t.date >= a && t.date <= b).length,
      })
    }
    // money by month
    const mm: Record<string, { m: string; Income: number; Expense: number }> = {}
    s.txs.filter((t) => t.date >= start && t.date <= end).forEach((t) => {
      const k = t.date.slice(0, 7)
      mm[k] ??= { m: parseKey(t.date).toLocaleString('en', { month: 'short' }), Income: 0, Expense: 0 }
      if (t.type === 'income') mm[k].Income += t.amount; else mm[k].Expense += t.amount
    })
    const money = Object.keys(mm).sort().map((k) => mm[k])
    const income = money.reduce((a, b) => a + b.Income, 0)
    const expense = money.reduce((a, b) => a + b.Expense, 0)
    // mood
    const mood: { d: string; mood: number | null }[] = []
    for (let i = 0; i < keys.length; i += bucket) {
      const sl = s.reflections.filter((r) => r.date >= keys[i] && r.date <= keys[Math.min(i + bucket - 1, keys.length - 1)] && r.mood)
      mood.push({ d: fmtDate(keys[i], { day: 'numeric', month: 'short' }), mood: sl.length ? Math.round((sl.reduce((a, b) => a + b.mood, 0) / sl.length) * 10) / 10 : null })
    }
    // weekday pattern
    const wd = Array.from({ length: 7 }, () => ({ t: 0, n: 0 }))
    keys.forEach((k, i) => { const sc = scores[i]; if (sc !== null) { wd[dow(k)].t += sc; wd[dow(k)].n++ } })
    const wdAvg = wd.map((x, i) => ({ day: DAY_NAMES[i], avg: x.n ? Math.round(x.t / x.n) : 0, n: x.n }))
    // numeric habits series
    const numeric = hab.filter((x) => x.h.type === 'number').slice(0, 4).map((x) => {
      const series: { d: string; v: number }[] = []
      for (let i = 0; i < keys.length; i += bucket) {
        let t = 0
        for (let j = i; j < Math.min(i + bucket, keys.length); j++) t += s.logs[`${x.h.id}|${keys[j]}`] || 0
        series.push({ d: fmtDate(keys[i], { day: 'numeric', month: 'short' }), v: Math.round(t * 10) / 10 })
      }
      return { ...x, series }
    })
    const learned = s.learnings.filter((t) => t.date >= start && t.date <= end).length
    const wins = s.achievements.filter((t) => t.date >= start && t.date <= end).length
    const tasksDone = s.tasks.filter((t) => t.done && t.doneAt && t.doneAt >= start && t.doneAt <= end).length
    // insights
    const ins: string[] = []
    const bestD = [...wdAvg].filter((x) => x.n > 2).sort((a, b) => b.avg - a.avg)
    if (bestD.length > 1) ins.push(`You are most consistent on ${bestD[0].day}s (${bestD[0].avg}%) and weakest on ${bestD[bestD.length - 1].day}s (${bestD[bestD.length - 1].avg}%).`)
    const hs = [...hab].filter((x) => x.sched > 0).sort((a, b) => b.rate - a.rate)
    if (hs.length > 1) ins.push(`Strongest habit: ${hs[0].name} (${hs[0].rate}%). Needs attention: ${hs[hs.length - 1].name} (${hs[hs.length - 1].rate}%).`)
    // compare with previous period
    const pk = rangeKeys(addDays(start, -days), addDays(start, -1))
    const ps = pk.map((k) => dayScore(s, k)).filter((x): x is number => x !== null)
    if (ps.length && valid.length) {
      const pa = Math.round(ps.reduce((a, b) => a + b, 0) / ps.length)
      const diff = avg - pa
      ins.push(diff >= 0 ? `Your average discipline score is up ${diff} points vs the previous ${days} days (${pa}% → ${avg}%). Keep going!` : `Your average score dropped ${-diff} points vs the previous ${days} days (${pa}% → ${avg}%). Try fewer, easier habits to rebuild momentum.`)
    }
    numeric.forEach((x) => {
      const prev = pk.reduce((t, k) => t + (s.logs[`${x.h.id}|${k}`] || 0), 0)
      if (prev > 0 && x.total > 0) { const ch = Math.round(((x.total - prev) / prev) * 100); if (Math.abs(ch) >= 10) ins.push(`${x.h.name} is ${ch > 0 ? 'up' : 'down'} ${Math.abs(ch)}% vs the previous period (${Math.round(x.total)} ${x.h.unit}).`) }
    })
    if (hours > 0) ins.push(`You focused for ${hours} hours in this period.`)
    return { scores, trend, avg, hab, totalHabitDone, timeCat, hours, weeks, money, income, expense, mood, wdAvg, numeric, learned, wins, tasksDone, ins }
  }, [s, keys])

  const heatCols = useMemo(() => {
    const pad = dow(keys[0])
    const cells: (number | null | undefined)[] = [...Array(pad).fill(undefined), ...D.scores]
    return cells
  }, [D.scores, keys])
  const hasData = s.habits.length > 0 || s.tasks.length > 0 || s.txs.length > 0
  const bestStreak = Math.max(0, ...D.hab.map((x) => x.st.best))

  const csv = () => {
    const hs = s.habits.filter((h) => !h.archived)
    const rows = [['date', 'score', ...hs.map((h) => h.name)].join(',')]
    keys.forEach((k, i) => rows.push([k, D.scores[i] ?? '', ...hs.map((h) => s.logs[`${h.id}|${k}`] ?? 0)].join(',')))
    downloadFile(`qubrynt-${start}_to_${end}.csv`, rows.join('\n'), 'text/csv')
  }

  return (
    <>
      <PageHead title="Analytics" sub={`${fmtDate(start, { day: 'numeric', month: 'short', year: 'numeric' })} → ${fmtDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}`}>
        <button className="btn ghost sm no-print" onClick={csv}><Download size={14} /> CSV</button>
        <button className="btn ghost sm no-print" onClick={() => window.print()}><Printer size={14} /> PDF</button>
      </PageHead>
      <div className="row wrap no-print" style={{ marginBottom: 16 }}>
        <div className="tabs">
          {RANGES.map(([l, v]) => <button key={l} className={`tab ${!custom && n === v ? 'on' : ''}`} onClick={() => { setCustom(false); setN(v) }}>{l}</button>)}
          <button className={`tab ${custom ? 'on' : ''}`} onClick={() => setCustom(true)}>Custom</button>
        </div>
        {custom && <><input type="date" style={{ width: 150 }} value={from} max={to} onChange={(e) => setFrom(e.target.value)} /><input type="date" style={{ width: 150 }} value={to} min={from} max={todayKey()} onChange={(e) => setTo(e.target.value)} /></>}
      </div>

      {!hasData ? <div className="card"><Empty emoji="📊" title="Nothing to analyse yet" text="Add habits and log a few days, or load demo data from Settings to preview." /></div> : (
        <>
          <motion.div className="card" {...stagger(0)} style={{ marginBottom: 16 }}>
            <h3>Report: last {days} days</h3>
            <div className="grid g4" style={{ marginBottom: 14 }}>
              {([['Avg discipline', D.avg, (x: number) => Math.round(x) + '%'], ['Habits done', D.totalHabitDone, (x: number) => String(Math.round(x))], ['Best streak', bestStreak, (x: number) => Math.round(x) + ' d'], ['Hours focused', D.hours, (x: number) => x.toFixed(1)], ['Tasks done', D.tasksDone, (x: number) => String(Math.round(x))], ['Things learned', D.learned, (x: number) => String(Math.round(x))], ['Achievements', D.wins, (x: number) => String(Math.round(x))], ['Income', D.income, (x: number) => inr(x)]] as const).map(([l, v, f]) => (
                <div key={l}><div className="muted small" style={{ fontWeight: 600 }}>{l}</div><div style={{ fontSize: 24, fontWeight: 800 }}><CountUp value={v} format={f} /></div></div>
              ))}
            </div>
            <div className="grid" style={{ gap: 8 }}>{D.ins.length ? D.ins.map((t, i) => <div key={i} className="insight">{t}</div>) : <div className="muted small">Log a few more days to unlock insights.</div>}</div>
          </motion.div>

          <div className="grid g2">
            <div className="card" style={{ gridColumn: '1 / -1' }}><h3>Discipline score trend {bucket > 1 && <span className="muted small">(weekly average)</span>}</h3>
              <div style={{ height: 240 }}><ResponsiveContainer><AreaChart data={D.trend}><defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22a867" stopOpacity={0.5} /><stop offset="100%" stopColor="#22a867" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" {...ax} minTickGap={24} /><YAxis domain={[0, 100]} {...ax} width={32} /><Tooltip {...tip} formatter={(v: number) => v + '%'} /><Area type="monotone" dataKey="score" stroke="#22a867" strokeWidth={2.5} fill="url(#gs)" connectNulls /></AreaChart></ResponsiveContainer></div></div>

            <div className="card" style={{ gridColumn: '1 / -1' }}><h3>Consistency heatmap</h3>
              <div className="heat">{heatCols.map((v, i) => <div key={i} title={v == null ? '' : v + '%'} style={{ background: v === undefined ? 'transparent' : v === null ? 'var(--border)' : `color-mix(in srgb, var(--accent) ${Math.max(15, v)}%, transparent)`, opacity: v === null ? 0.5 : 1 }} />)}</div>
              <div className="row small muted" style={{ marginTop: 8, gap: 6 }}>Less {[15, 40, 65, 100].map((p) => <span key={p} style={{ width: 14, height: 14, borderRadius: 4, background: `color-mix(in srgb, var(--accent) ${p}%, transparent)` }} />)} More</div></div>

            <div className="card"><h3>Habit completion rate</h3>
              {D.hab.length === 0 ? <Empty emoji="🌱" title="No habits" /> : <div className="grid" style={{ gap: 12 }}>{[...D.hab].sort((a, b) => b.rate - a.rate).map((x) => (
                <div key={x.h.id}><div className="row between small"><b>{x.name}</b><span className="muted">{x.rate}% · Streak {x.st.cur} (best {x.st.best})</span></div><div className="bar" style={{ marginTop: 5 }}><motion.div initial={{ width: 0 }} animate={{ width: x.rate + '%' }} transition={{ duration: 0.8 }} /></div></div>))}</div>}
            </div>
            <div className="card"><h3>Best days of the week</h3>
              <div style={{ height: 230 }}><ResponsiveContainer><BarChart data={D.wdAvg}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="day" {...ax} /><YAxis domain={[0, 100]} {...ax} width={30} /><Tooltip {...tip} formatter={(v: number) => v + '%'} /><Bar dataKey="avg" fill="#22a867" radius={[6, 6, 0, 0]}></Bar></BarChart></ResponsiveContainer></div></div>

            <div className="card"><h3>Time spent per category (hrs)</h3>
              {D.timeCat.length === 0 ? <Empty emoji="⏱️" title="No focus sessions" text="Use the timer button to log time." /> : <div style={{ height: 240 }}><ResponsiveContainer><PieChart><Pie data={D.timeCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>{D.timeCat.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip {...tip} formatter={(v: number) => v + ' h'} /><Legend /></PieChart></ResponsiveContainer></div>}</div>
            <div className="card"><h3>Tasks, learnings & wins per week</h3>
              <div style={{ height: 240 }}><ResponsiveContainer><BarChart data={D.weeks}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="w" {...ax} minTickGap={20} /><YAxis allowDecimals={false} {...ax} width={26} /><Tooltip {...tip} /><Legend /><Bar dataKey="Tasks" fill="#22a867" radius={[4, 4, 0, 0]} /><Bar dataKey="Learned" fill="#aeaeb2" radius={[4, 4, 0, 0]} /><Bar dataKey="Wins" fill="#6fd3a5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>

            {D.numeric.map((x) => (
              <div key={x.h.id} className="card"><h3>{x.name} <span className="muted small">total {Math.round(x.total * 10) / 10} {x.h.unit}</span></h3>
                <div style={{ height: 170 }}><ResponsiveContainer><LineChart data={x.series}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" {...ax} minTickGap={24} /><YAxis {...ax} width={34} /><Tooltip {...tip} /><Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div></div>
            ))}

            <div className="card"><h3>Income vs expense</h3>
              {D.money.length === 0 ? <Empty emoji="💰" title="No transactions in range" /> : <div style={{ height: 230 }}><ResponsiveContainer><BarChart data={D.money}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" {...ax} /><YAxis {...ax} width={46} /><Tooltip {...tip} formatter={(v: number) => inr(v)} /><Legend /><Bar dataKey="Income" fill="#6fd3a5" radius={[6, 6, 0, 0]} /><Bar dataKey="Expense" fill="#8e8e93" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>}
              {D.money.length > 0 && <div className="muted small" style={{ marginTop: 6 }}>Net: <b style={{ color: D.income - D.expense >= 0 ? 'var(--accent2)' : 'var(--danger)' }}>{inr(D.income - D.expense)}</b></div>}</div>
            <div className="card"><h3>Mood trend</h3>
              {D.mood.every((m) => m.mood === null) ? <Empty emoji="🙂" title="No mood data" text="Tap a mood on the Today page." /> : <div style={{ height: 230 }}><ResponsiveContainer><LineChart data={D.mood}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" {...ax} minTickGap={24} /><YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} {...ax} width={24} /><Tooltip {...tip} /><Line type="monotone" dataKey="mood" stroke="#22a867" strokeWidth={2.5} dot={{ r: 3 }} connectNulls /></LineChart></ResponsiveContainer></div>}</div>
          </div>
        </>
      )}
    </>
  )
}
