import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutGrid, LogOut, Plus, Timer } from 'lucide-react'
import { useStore } from '../store'
import { useAuth } from '../auth'
import { useTimer } from './Timer'
import { LinkEditor } from './LinkEditor'
import { LinkIcon } from './icons'
import { Logo } from './Logo'
import { MENU, NOTEBOOK, SETTINGS, NavItem } from './nav'

const TABS: NavItem[] = [MENU[0], MENU[1], MENU[2], NOTEBOOK]

/** Phone navigation: a tab bar at the bottom, plus a "More" sheet with everything else. */
export function MobileNav() {
  const { s, status } = useStore()
  const { user, logout } = useAuth()
  const timer = useTimer()
  const nav = useNavigate()
  const [more, setMore] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const go = (to: string) => { setMore(false); nav(to) }

  const tile = (it: NavItem) => (
    <button key={it.to} className="app-tile" onClick={() => go(it.to)}><span className="ic"><it.icon size={24} /></span>{it.label}</button>
  )

  return (
    <>
      <nav className="tabbar no-print">
        {TABS.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
                <it.icon size={22} /><span>{it.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button className="tab-item" onClick={() => setMore(true)}><LayoutGrid size={22} /><span>More</span></button>
      </nav>

      <AnimatePresence>
        {more && (
          <motion.div className="sheet-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMore(false)}>
            <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.5 }} onDragEnd={(_, i) => { if (i.offset.y > 90 || i.velocity.y > 500) setMore(false) }}
              onClick={(e) => e.stopPropagation()}>
              <div className="grab" />
              <div className="row between" style={{ margin: '4px 0 16px' }}>
                <div className="row"><Logo size={30} /><b style={{ fontSize: 18, letterSpacing: '-.02em' }}>Qubrynt</b></div>
                <span className="sync"><span className={`dot ${status}`} />{status === 'saving' ? 'Saving…' : status === 'error' ? 'Offline' : 'All saved'}</span>
              </div>
              <div className="app-grid">
                {MENU.map(tile)}
                {tile(NOTEBOOK)}
                <button className="app-tile" onClick={() => { setMore(false); timer.open() }}><span className="ic"><Timer size={24} style={timer.running ? { color: 'var(--accent2)' } : undefined} /></span>{timer.label || 'Timer'}</button>
                {tile(SETTINGS)}
              </div>
              <div className="side-title" style={{ padding: '22px 2px 10px', color: 'var(--muted)' }}>Quick links</div>
              <div className="app-grid">
                {s.links.map((l) => (
                  <a key={l.id} className="app-tile" href={l.url} target="_blank" rel="noopener noreferrer"><span className="ic"><LinkIcon link={l} size={26} /></span>{l.title}</a>
                ))}
                <button className="app-tile" onClick={() => setLinkOpen(true)}><span className="ic"><Plus size={24} /></span>Add link</button>
              </div>
              <div className="row between" style={{ marginTop: 22, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div className="small muted">{s.settings.name || user?.name}<br />{user?.email}</div>
                <button className="btn ghost sm" onClick={logout}><LogOut size={15} /> Log out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <LinkEditor open={linkOpen} link={null} onClose={() => setLinkOpen(false)} />
    </>
  )
}
