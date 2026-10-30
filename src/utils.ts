import type { Habit, State } from './types'

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
const p = (n: number) => String(n).padStart(2, '0')
export const dkey = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
export const todayKey = () => dkey(new Date())
export const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (k: string, n: number) => {
  const d = parseKey(k)
  d.setDate(d.getDate() + n)
  return dkey(d)
}
export const dow = (k: string) => parseKey(k).getDay()
export const fmtDate = (k: string, opts?: Intl.DateTimeFormatOptions) =>
  parseKey(k).toLocaleDateString('en-IN', opts ?? { weekday: 'short', day: 'numeric', month: 'short' })
export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
export const rangeKeys = (from: string, to: string) => {
  const out: string[] = []
  let c = from
  while (c <= to) {
    out.push(c)
    c = addDays(c, 1)
  }
  return out
}
export const startOfPeriod = (period: 'week' | 'month' | 'year', weekStart = 1, ref = todayKey()) => {
  const d = parseKey(ref)
  if (period === 'month') return dkey(new Date(d.getFullYear(), d.getMonth(), 1))
  if (period === 'year') return dkey(new Date(d.getFullYear(), 0, 1))
  const diff = (d.getDay() - weekStart + 7) % 7
  d.setDate(d.getDate() - diff)
  return dkey(d)
}
export const endOfPeriod = (period: 'week' | 'month' | 'year', weekStart = 1, ref = todayKey()) => {
  const s = parseKey(startOfPeriod(period, weekStart, ref))
  if (period === 'week') s.setDate(s.getDate() + 6)
  else if (period === 'month') return dkey(new Date(s.getFullYear(), s.getMonth() + 1, 0))
  else return dkey(new Date(s.getFullYear(), 11, 31))
  return dkey(s)
}

export const habitValue = (s: State, h: Habit, date: string) => s.logs[`${h.id}|${date}`] ?? 0
export const habitDone = (s: State, h: Habit, date: string) => {
  const v = habitValue(s, h, date)
  return h.type === 'check' ? v >= 1 : v >= (h.target || 1)
}


export const scheduled = (s: State, date: string) => s.habits.filter((h) => !h.archived && h.days.includes(dow(date)))

export const streakOf = (s: State, h: Habit) => {
  let cur = 0
  let best = 0
  let run = 0
  const today = todayKey()
  // best streak over last 400 days
  for (let i = 400; i >= 0; i--) {
    const k = addDays(today, -i)
    if (!h.days.includes(dow(k))) continue
    if (habitDone(s, h, k)) {
      run++
      best = Math.max(best, run)
    } else if (k !== today) run = 0
  }
  // current
  let k = today
  if (h.days.includes(dow(k)) && !habitDone(s, h, k)) k = addDays(k, -1)
  for (let i = 0; i < 400; i++) {
    if (!h.days.includes(dow(k))) {
      k = addDays(k, -1)
      continue
    }
    if (habitDone(s, h, k)) {
      cur++
      k = addDays(k, -1)
    } else break
  }
  return { cur, best }
}

/** daily discipline score: habits scheduled + tasks due that day */
export const dayScore = (s: State, date: string) => {
  const hs = scheduled(s, date)
  const ts = s.tasks.filter((t) => t.due === date)
  const total = hs.length + ts.length
  if (!total) return null
  const done = hs.filter((h) => habitDone(s, h, date)).length + ts.filter((t) => t.done).length
  return Math.round((done / total) * 100)
}

export const overallStreak = (s: State) => {
  let k = todayKey()
  const sc = dayScore(s, k)
  if (sc === null || sc < 100) {
    if (sc === null || sc < 100) k = addDays(k, -1)
  }
  let n = 0
  for (let i = 0; i < 400; i++) {
    const v = dayScore(s, k)
    if (v === null) {
      k = addDays(k, -1)
      if (i > 60) break
      continue
    }
    if (v >= 70) {
      n++
      k = addDays(k, -1)
    } else break
  }
  return n
}

// Chart colours: greens and greys. Nothing else.
export const CHART_COLORS = ['#22a867', '#0f6b44', '#8e8e93', '#6fd3a5', '#aeaeb2', '#4a5a51']
export const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MOODS = ['😞', '😕', '😐', '🙂', '😄']

export const downloadFile = (name: string, content: string, type = 'text/plain') => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export const avgScore = (s: State, keys: string[]) => {
  const v = keys.map((k) => dayScore(s, k)).filter((x): x is number => x !== null)
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
}

/** Turns "github.com/x" into a safe https URL, or null when it is not a web address. */
export const normalizeUrl = (input: string) => {
  const raw = input.trim()
  if (!raw) return null
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : 'https://' + raw)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}
