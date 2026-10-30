import { FormEvent, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Database, ShieldCheck, NotebookPen } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useAuth } from '../auth'

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(name, email, password)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-side">
        <div className="row" style={{ gap: 14 }}><Logo size={64} animate /><b style={{ color: '#f5f5f7', fontSize: 28, letterSpacing: '-.03em' }}>Qubrynt</b></div>
        <h2>Build discipline you can measure.</h2>
        <motion.ul style={{ display: 'grid', gap: 16 }} initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.09, delayChildren: 0.5 } } }}>
          <motion.li variants={{ h: { opacity: 0, x: -14 }, s: { opacity: 1, x: 0 } }}><BarChart3 size={20} /><span>Track habits, tasks, focus time and money, then see weekly, monthly and yearly analytics.</span></motion.li>
          <motion.li variants={{ h: { opacity: 0, x: -14 }, s: { opacity: 1, x: 0 } }}><NotebookPen size={20} /><span>Keep a notebook of what you learn, plus quick links to the tools you use every day.</span></motion.li>
          <motion.li variants={{ h: { opacity: 0, x: -14 }, s: { opacity: 1, x: 0 } }}><Database size={20} /><span>Your data is saved in your own database, so it is there on every device.</span></motion.li>
          <motion.li variants={{ h: { opacity: 0, x: -14 }, s: { opacity: 1, x: 0 } }}><ShieldCheck size={20} /><span>Private by default. Only you can see your account.</span></motion.li>
        </motion.ul>
      </div>
      <div className="auth-form">
        <motion.form className="auth-card card" onSubmit={submit} style={{ padding: 30 }} initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.1 }}>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="muted" style={{ marginTop: 4 }}>{mode === 'login' ? 'Log in to continue.' : 'It takes less than a minute.'}</p>
          {mode === 'register' && (<><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" /></>)}
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'register' ? 8 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'At least 8 characters' : ''} />
          {error && <div className="err" role="alert">{error}</div>}
          <button className="btn" style={{ width: '100%', marginTop: 20 }} disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
          <div className="muted small" style={{ textAlign: 'center', marginTop: 16 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" style={{ color: 'var(--accent-ink)', fontWeight: 600 }} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Sign up' : 'Log in'}</button>
          </div>
        </motion.form>
      </div>
    </div>
  )
}
