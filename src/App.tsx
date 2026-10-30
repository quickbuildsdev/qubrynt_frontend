import { useEffect } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './auth'
import { StoreProvider, useStore } from './store'
import { TimerProvider } from './components/Timer'
import { Sidebar } from './components/Sidebar'
import { Dock } from './components/Dock'
import { MobileNav } from './components/MobileNav'
import { Splash } from './components/Logo'
import { useIsMobile } from './hooks'
import { QuickAdd } from './components/QuickAdd'
import { Toaster } from './components/ui'
import AuthPage from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Today from './pages/Today'
import Habits from './pages/Habits'
import Tasks from './pages/Tasks'
import Schedule from './pages/Schedule'
import Journal from './pages/Journal'
import Money from './pages/Money'
import Goals from './pages/Goals'
import Analytics from './pages/Analytics'
import Notebook from './pages/Notebook'
import SettingsPage from './pages/Settings'

/** Shows the login page, or the app once you are logged in. */
export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <AuthPage />
  return (
    <StoreProvider key={user.id}>
      <TimerProvider>
        <Shell />
      </TimerProvider>
    </StoreProvider>
  )
}

function Shell() {
  const loc = useLocation()
  const nav = useNavigate()
  const { s } = useStore()
  const isMobile = useIsMobile()
  // left sidebar or bottom dock on computers; a tab bar on phones
  const navMode = isMobile ? 'mobile' : s.settings.navPosition === 'bottom' ? 'bottom' : 'left'
  useEffect(() => { document.documentElement.dataset.nav = navMode }, [navMode])

  // keyboard shortcuts: press "g" then a letter
  useEffect(() => {
    let g = false
    const f = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) || e.metaKey || e.ctrlKey) return
      if (g) {
        const m: Record<string, string> = { d: '/', t: '/today', h: '/habits', k: '/tasks', s: '/schedule', j: '/journal', m: '/money', g: '/goals', a: '/analytics', n: '/notebook' }
        if (m[e.key]) nav(m[e.key])
        g = false
      } else if (e.key === 'g') { g = true; setTimeout(() => (g = false), 900) }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [nav])

  // daily reminder (browser notification, works while the tab is open)
  useEffect(() => {
    if (!s.settings.reminderOn) return
    const id = setInterval(() => {
      const d = new Date()
      const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      const k = 'reminded-' + d.toDateString()
      if (hm === s.settings.reminder && !sessionStorage.getItem(k)) {
        sessionStorage.setItem(k, '1')
        if ('Notification' in window && Notification.permission === 'granted') new Notification('Qubrynt', { body: 'Time to log your day.' })
      }
    }, 20000)
    return () => clearInterval(id)
  }, [s.settings.reminderOn, s.settings.reminder])

  return (
    <>
      <div className="app">
        {navMode === 'left' && <Sidebar />}
        <main className="main">
          <AnimatePresence mode="wait">
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 14, scale: 0.995 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
              <Routes location={loc}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/today" element={<Today />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/money" element={<Money />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/notebook" element={<Notebook />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {navMode === 'bottom' && <Dock />}
      {navMode === 'mobile' && <MobileNav />}
      <div className="fab no-print"><QuickAdd /></div>
      <Toaster />
    </>
  )
}
