import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, PanelLeftClose, PanelLeftOpen, Plus, Timer } from 'lucide-react'
import { useStore } from '../store'
import { useAuth } from '../auth'
import { useTimer } from './Timer'
import { LinkEditor } from './LinkEditor'
import { LinkIcon } from './icons'
import { Logo } from './Logo'
import { MENU, NOTEBOOK, SETTINGS, NavItem } from './nav'

/**
 * Navigation on the left.
 * Wide: icons with names beside them. Collapsed ("rail"): icons with a small name underneath.
 * Below the main pages come the tools (notebook, timer) and then your quick links.
 */
export function Sidebar() {
  const { s, status } = useStore()
  const { user, logout } = useAuth()
  const timer = useTimer()
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('qubrynt.rail') === '1' } catch { return false } })
  const [linkOpen, setLinkOpen] = useState(false)

  const toggle = () => { const n = !collapsed; setCollapsed(n); try { localStorage.setItem('qubrynt.rail', n ? '1' : '0') } catch {} }

  const link = (it: NavItem) => (
    <NavLink key={it.to} to={it.to} end={it.end} title={it.label} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="side-pill" className="pill" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
          <span className="ico"><it.icon size={19} /></span><span className="lbl">{it.label}</span>
        </>
      )}
    </NavLink>
  )
  const initial = (s.settings.name || user?.name || '?').trim().charAt(0).toUpperCase()
  const statusText = status === 'saving' ? 'Saving…' : status === 'error' ? 'Offline, retrying' : 'All saved'

  return (
    <motion.aside className={`sidebar ${collapsed ? 'rail' : ''}`} initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
      <div className="side-top">
        <Logo size={34} />
        {!collapsed && <div className="brand-name">Qubrynt</div>}
        <button className="side-btn" onClick={toggle} title={collapsed ? 'Expand menu' : 'Collapse menu'}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <div className="side-scroll">
        <div className="side-title">Menu</div>
        {MENU.map(link)}

        <div className="side-title">Tools</div>
        {link(NOTEBOOK)}
        <button className="nav-item" onClick={timer.open} title="Focus timer">
          <span className="ico"><Timer size={19} style={timer.running ? { color: 'var(--accent2)' } : undefined} /></span>
          <span className="lbl" style={timer.running ? { color: 'var(--accent2)' } : undefined}>{timer.label || 'Timer'}</span>
        </button>

        <div className="side-title">
          <span>Quick links</span>
          {!collapsed && <button className="side-btn" style={{ width: 22, height: 22 }} onClick={() => setLinkOpen(true)} title="Add quick link"><Plus size={14} /></button>}
        </div>
        {s.links.map((l) => (
          <motion.a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" title={l.title} className="nav-item link-item" whileHover={{ x: collapsed ? 0 : 3 }} whileTap={{ scale: 0.96 }}>
            <span className="ico"><LinkIcon link={l} /></span><span className="lbl">{l.title}</span>
          </motion.a>
        ))}
        <button className="nav-item" onClick={() => setLinkOpen(true)} title="Add quick link" style={collapsed ? undefined : { display: s.links.length ? 'none' : 'flex' }}>
          <span className="ico"><Plus size={18} /></span><span className="lbl">{collapsed ? 'Add' : 'Add a link'}</span>
        </button>
      </div>

      <div className="side-foot">
        {link(SETTINGS)}
        <div className="user-row">
          <div className="avatar" title={user?.email}>{initial}</div>
          <div className="user-meta">
            <b>{s.settings.name || user?.name}</b>
            <div className="sync"><span className={`dot ${status}`} />{statusText}</div>
          </div>
          <button className="side-btn" onClick={logout} title="Log out"><LogOut size={17} /></button>
        </div>
        {collapsed && <div className="sync" style={{ justifyContent: 'center' }} title={statusText}><span className={`dot ${status}`} /></div>}
      </div>
      <LinkEditor open={linkOpen} link={null} onClose={() => setLinkOpen(false)} />
    </motion.aside>
  )
}
