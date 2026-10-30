import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from './api'

export type User = { id: string; name: string; email: string }
type Ctx = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  deleteAccount: (password: string) => Promise<void>
}
const C = createContext<Ctx>(null as any)
export const useAuth = () => useContext(C)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(!!getToken())

  const logout = useCallback(() => { setToken(null); setUser(null) }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  useEffect(() => {
    if (!getToken()) return
    api<{ user: User }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => {}) // a 401 already logged us out; a network error shows the login page
      .finally(() => setLoading(false))
  }, [])

  const start = (r: { token: string; user: User }) => { setToken(r.token); setUser(r.user) }
  const login = async (email: string, password: string) => start(await api('/auth/login', { method: 'POST', body: { email, password }, auth: false }))
  const register = async (name: string, email: string, password: string) => start(await api('/auth/register', { method: 'POST', body: { name, email, password }, auth: false }))
  const deleteAccount = async (password: string) => { await api('/auth/me', { method: 'DELETE', body: { password }, auth: false }); logout() }

  return <C.Provider value={{ user, loading, login, register, logout, deleteAccount }}>{children}</C.Provider>
}
