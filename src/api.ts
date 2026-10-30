const BASE: string = (import.meta as any).env?.VITE_API_URL || '/api'
const TOKEN_KEY = 'qubrynt.token'
const OLD_TOKEN_KEY = 'dos.token' // v2 key: keeps people logged in after the upgrade

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(OLD_TOKEN_KEY) } catch { return null }
}
export const setToken = (t: string | null) => {
  try { localStorage.removeItem(OLD_TOKEN_KEY); t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch {}
}

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn }

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; keepalive?: boolean; auth?: boolean } = {}): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      keepalive: opts.keepalive,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // a 401 on a normal request means the session is over (login/register failures use auth:false)
    if (res.status === 401 && opts.auth !== false) onUnauthorized?.()
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`)
  }
  return data as T
}
