import '@fontsource-variable/inter'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './auth'
import App from './App'
import './styles.css'
import { Analytics } from '@vercel/analytics/react'

try { document.documentElement.dataset.theme = localStorage.getItem('qubrynt.theme') || 'light' } catch {}

// reducedMotion="user": people who turn animations off in their system settings get calmer transitions
createRoot(document.getElementById('root')!).render(
  <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Analytics />
      </AuthProvider>
    </BrowserRouter>
  </MotionConfig>
)
