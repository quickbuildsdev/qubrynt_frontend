import { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import { useStore } from '../store'
import { Modal, toast } from './ui'
import { LINK_ICONS, LinkIcon, brandFor } from './icons'
import { normalizeUrl, uid } from '../utils'
import type { QuickLink } from '../types'

/** Add or edit a quick link. Pass link=null to add a new one. */
export function LinkEditor({ open, link, onClose }: { open: boolean; link: QuickLink | null; onClose: () => void }) {
  const { set } = useStore()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [icon, setIcon] = useState('auto')

  useEffect(() => {
    if (!open) return
    setTitle(link?.title ?? ''); setUrl(link?.url ?? ''); setIcon(link?.icon ?? 'auto')
  }, [open, link])

  const href = normalizeUrl(url)
  const brand = href ? brandFor(href) : null
  const save = () => {
    if (!href) return toast('Enter a valid web address')
    const item: QuickLink = { id: link?.id ?? uid(), title: title.trim() || brand?.title || new URL(href).hostname.replace(/^www\./, ''), url: href, icon }
    set((d) => ({ ...d, links: link ? d.links.map((l) => (l.id === item.id ? item : l)) : [...d.links, item] }))
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={link ? 'Edit quick link' : 'Add quick link'} sub="Shown on your dashboard and in the navigation">
      <label>Web address</label>
      <div className="row">
        <div className="li-preview">{href ? <LinkIcon key={href + icon} link={{ id: 'p', title, url: href, icon }} size={22} /> : <Globe size={20} />}</div>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="github.com or https://…" autoFocus onKeyDown={(e) => e.key === 'Enter' && save()} />
      </div>
      {brand && icon === 'auto' && <div className="small muted" style={{ marginTop: 6 }}>Detected {brand.title}. Its icon is used automatically.</div>}
      <label>Name</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={brand?.title ?? 'Optional. Defaults to the site name'} onKeyDown={(e) => e.key === 'Enter' && save()} />
      <label>Icon</label>
      <div className="icon-pick">
        <button className={icon === 'auto' ? 'on' : ''} onClick={() => setIcon('auto')} title="Use the website's own icon" style={{ fontSize: 11, fontWeight: 700 }}>Auto</button>
        {Object.entries(LINK_ICONS).map(([k, I]) => (
          <button key={k} className={icon === k ? 'on' : ''} onClick={() => setIcon(k)} title={k}><I size={18} /></button>
        ))}
      </div>
      <button className="btn" style={{ width: '100%', marginTop: 18 }} onClick={save}><Globe size={16} /> Save link</button>
    </Modal>
  )
}
