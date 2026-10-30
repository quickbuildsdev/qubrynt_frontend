import { api, ApiError } from './api'
import type { State } from './types'

/** One change to send to the server: save (data) or remove (del) a single item. */
export type Op = { c: string; id: string; del?: boolean; data?: unknown }
export type SyncStatus = 'idle' | 'saving' | 'error'

// collections stored as lists of items, and which field is the item's key
const LISTS: Record<string, string> = {
  habits: 'id', tasks: 'id', blocks: 'id', sessions: 'id', learnings: 'id', achievements: 'id',
  txs: 'id', goals: 'id', notebooks: 'id', notes: 'id', links: 'id', categories: 'id', reflections: 'date',
}
// collections stored as key -> value maps
const MAPS = ['logs', 'blockLogs'] as const

/** Compares two states and returns the operations that turn the first into the second. */
export function diff(prev: State, next: State): Op[] {
  const ops: Op[] = []
  for (const [c, keyField] of Object.entries(LISTS)) {
    const a = (prev as any)[c] as any[]
    const b = (next as any)[c] as any[]
    if (a === b) continue
    const before = new Map(a.map((x) => [x[keyField], x]))
    const seen = new Set<string>()
    for (const item of b) {
      seen.add(item[keyField])
      if (before.get(item[keyField]) !== item) ops.push({ c, id: item[keyField], data: item })
    }
    for (const k of before.keys()) if (!seen.has(k)) ops.push({ c, id: k, del: true })
  }
  for (const c of MAPS) {
    const a = prev[c] as Record<string, unknown>
    const b = next[c] as Record<string, unknown>
    if (a === b) continue
    for (const k of Object.keys(b)) if (a[k] !== b[k]) ops.push({ c, id: k, data: { value: b[k] } })
    for (const k of Object.keys(a)) if (!(k in b)) ops.push({ c, id: k, del: true })
  }
  if (prev.settings !== next.settings) ops.push({ c: 'settings', id: 'main', data: next.settings })
  return ops
}

/**
 * Collects changes and sends them to the server in batches.
 * - If the same item changes many times (like typing in a note) only the latest version is sent.
 * - If the network fails, changes stay in the queue and are retried with a growing delay.
 */
export class SyncQueue {
  private pending = new Map<string, Op>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private busy = false
  private failures = 0
  private dead = false
  constructor(private onStatus: (s: SyncStatus) => void) {}

  enqueue(ops: Op[]) {
    if (!ops.length || this.dead) return
    for (const o of ops) this.pending.set(`${o.c}\u0000${o.id}`, o)
    this.onStatus('saving')
    this.schedule(600)
  }
  hasPending() { return this.busy || this.pending.size > 0 }
  dispose() { this.dead = true; if (this.timer) clearTimeout(this.timer) }

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), ms)
  }

  async flush(keepalive = false) {
    if (this.busy || !this.pending.size || this.dead) return
    this.busy = true
    const batch = [...this.pending.entries()]
    this.pending.clear()
    try {
      for (let i = 0; i < batch.length; i += 400) {
        const chunk = batch.slice(i, i + 400).map(([, o]) => o)
        try {
          const r = await api<{ rejected?: unknown[] }>('/data/sync', { method: 'POST', body: { ops: chunk }, keepalive })
          if (r.rejected?.length) console.warn('Server skipped some changes:', r.rejected)
        } catch (e) {
          // a 4xx means the server will never accept this chunk; drop it instead of retrying forever
          if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 429) {
            console.warn('Server refused a batch:', e.message)
            continue
          }
          // otherwise put this chunk and everything after it back (unless a newer version was queued meanwhile)
          for (const [k, o] of batch.slice(i)) if (!this.pending.has(k)) this.pending.set(k, o)
          throw e
        }
      }
      this.failures = 0
    } catch {
      this.failures++
      this.busy = false
      this.onStatus('error')
      if (!this.dead) this.schedule(Math.min(30000, 2000 * 2 ** this.failures))
      return
    }
    this.busy = false
    if (this.pending.size) this.schedule(200)
    else this.onStatus('idle')
  }
}
