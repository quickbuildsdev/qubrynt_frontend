import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import { diff, SyncQueue, SyncStatus } from './sync'
import { Splash } from './components/Logo'
import type { CategoryType, State } from './types'

const DEFAULT_BOOK_ID = 'default-book'

/** Notes from older versions have no book. Put them in a book called "My notebook" so nothing is lost. */
export function ensureBooks(st: State): State {
  const orphans = st.notes.filter((n) => !n.bookId || !st.notebooks.some((b) => b.id === n.bookId))
  if (!orphans.length) return st
  const now = new Date().toISOString()
  const notebooks = st.notebooks.some((b) => b.id === DEFAULT_BOOK_ID) ? st.notebooks : [...st.notebooks, { id: DEFAULT_BOOK_ID, title: 'My notebook', created: now }]
  return { ...st, notebooks, notes: st.notes.map((n) => (orphans.includes(n) ? { ...n, bookId: DEFAULT_BOOK_ID } : n)) }
}

export const emptyState = (): State => ({
  habits: [], logs: {}, tasks: [], blocks: [], blockLogs: {}, sessions: [],
  learnings: [], achievements: [], reflections: [], txs: [], goals: [],
  notebooks: [], notes: [], links: [], categories: [],
  settings: { theme: 'light', name: '', weekStart: 1, reminder: '21:00', reminderOn: false, navPosition: 'left' },
})

type Ctx = {
  s: State
  /** Change the state. The change is shown immediately and saved to the database in the background. */
  set: (fn: (draft: State) => State) => void
  replace: (s: State) => void
  status: SyncStatus
}
const C = createContext<Ctx>(null as any)
export const useStore = () => useContext(C)

/** Names of the categories of one kind (activity, expense or income), in the order the user arranged them. */
export function useCats(type: CategoryType) {
  const { s } = useStore()
  return useMemo(() => {
    const names = s.categories.filter((c) => c.type === type).map((c) => c.name)
    return names.length ? names : ['Other']
  }, [s.categories, type])
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State | null>(null)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const ref = useRef<State>(emptyState())
  const queue = useMemo(() => new SyncQueue(setStatus), [])

  useEffect(() => {
    let cancelled = false
    setLoadError('')
    api<Partial<State>>('/data')
      .then((d) => {
        if (cancelled) return
        const loaded: State = { ...emptyState(), ...d, settings: { ...emptyState().settings, ...(d.settings ?? {}) } }
        const st = ensureBooks(loaded)
        ref.current = st
        setS(st)
        queue.enqueue(diff(loaded, st)) // saves the migration, if there was one
      })
      .catch((e) => !cancelled && setLoadError(e.message))
    return () => { cancelled = true }
  }, [attempt, queue])

  // send what's left when the tab is closed, and warn if there are unsaved changes
  useEffect(() => {
    const hide = () => { queue.flush(true) }
    const warn = (e: BeforeUnloadEvent) => { if (queue.hasPending()) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('pagehide', hide)
    window.addEventListener('beforeunload', warn)
    return () => { window.removeEventListener('pagehide', hide); window.removeEventListener('beforeunload', warn); queue.dispose() }
  }, [queue])

  const replace = useCallback((next: State) => {
    queue.enqueue(diff(ref.current, next))
    ref.current = next
    setS(next)
  }, [queue])
  const set = useCallback((fn: (d: State) => State) => replace(fn(ref.current)), [replace])

  useEffect(() => {
    if (!s) return
    document.documentElement.dataset.theme = s.settings.theme
    try { localStorage.setItem('qubrynt.theme', s.settings.theme) } catch {}
  }, [s?.settings.theme])

  if (loadError) {
    return (
      <div className="center-screen">
        <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
          <h3 style={{ justifyContent: 'center' }}>Could not load your data</h3>
          <p className="muted" style={{ marginBottom: 14 }}>{loadError}</p>
          <button className="btn" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </div>
      </div>
    )
  }
  if (!s) return <Splash />
  return <C.Provider value={{ s, set, replace, status }}>{children}</C.Provider>
}
