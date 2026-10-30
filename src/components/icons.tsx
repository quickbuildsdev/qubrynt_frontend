import { useState } from 'react'
import { Briefcase, BookOpen, Calendar, Cloud, Code, FileText, Folder, Globe, Github, Mail, MessageSquare, Music, ShoppingCart, Video, Wallet, LucideIcon } from 'lucide-react'
import { BRANDS, Brand } from './brands'
import type { QuickLink } from '../types'

/** Generic icons a quick link can use instead of the automatic brand icon. */
export const LINK_ICONS: Record<string, LucideIcon> = {
  globe: Globe, mail: Mail, github: Github, video: Video, file: FileText, calendar: Calendar, work: Briefcase,
  shop: ShoppingCart, music: Music, code: Code, book: BookOpen, money: Wallet, cloud: Cloud, chat: MessageSquare, folder: Folder,
}

export const hostOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase() } catch { return '' }
}

// most specific host first, so mail.google.com wins over google.com
const HOSTS = BRANDS.flatMap((b) => b.hosts.map((h) => [h, b] as const)).sort((a, b) => b[0].length - a[0].length)

/** Finds the brand (GitHub, YouTube, Notion…) a web address belongs to. */
export const brandFor = (url: string): Brand | null => {
  const host = hostOf(url)
  if (!host) return null
  for (const [h, b] of HOSTS) if (host === h || host.endsWith('.' + h)) return b
  return null
}

export function BrandMark({ brand, size = 20 }: { brand: Brand; size?: number }) {
  // very dark logos (GitHub, X, Notion) use the text colour so they stay visible in dark mode
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={brand.title} style={{ display: 'block', flexShrink: 0 }}>
      <path d={brand.path} fill={brand.dark ? 'currentColor' : brand.hex} />
    </svg>
  )
}

/** First letter of the site in a soft tile. Used when the site has no known brand and no icon could be loaded. */
function Monogram({ link, size }: { link: QuickLink; size: number }) {
  const ch = (link.title || hostOf(link.url) || '?').trim().charAt(0).toUpperCase()
  return <span className="mono" style={{ width: size, height: size, fontSize: size * 0.6 }}>{ch}</span>
}

export function LinkIcon({ link, size = 20 }: { link: QuickLink; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (link.icon === 'auto') {
    const brand = brandFor(link.url)
    if (brand) return <BrandMark brand={brand} size={size} />
    if (!failed) {
      return <img width={size} height={size} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ borderRadius: 4, display: 'block' }}
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(link.url))}&sz=64`} onError={() => setFailed(true)} />
    }
    return <Monogram link={link} size={size} />
  }
  const Icon = LINK_ICONS[link.icon] ?? Globe
  return <Icon size={size} />
}
