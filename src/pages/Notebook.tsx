import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, BookOpen, BookPlus, Check, ChevronRight, FileText, Library, Pencil, Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { Empty, PageHead } from '../components/ui'
import { uid } from '../utils'
import type { Note } from '../types'

const when = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const LS = 'qubrynt.nb'
const readLS = (): { book?: string; page?: string; open?: string[] } => {
  try { return JSON.parse(localStorage.getItem(LS) || '{}') } catch { return {} }
}

/** Notebook: books are folders, pages are files inside them. Changes save automatically. */
export default function Notebook() {
  const { s, set, status } = useStore()
  const loc = useLocation()
  const saved = useMemo(readLS, [])
  const fromLink = (loc.state as any)?.open as string | undefined
  const linked = fromLink ? s.notes.find((n) => n.id === fromLink) : undefined

  const [book, setBook] = useState<string | null>(linked?.bookId ?? saved.book ?? null)
  const [page, setPage] = useState<string | null>(linked?.id ?? saved.page ?? null)
  const [openIds, setOpenIds] = useState<string[]>(linked?.bookId ? [linked.bookId] : saved.open ?? [])
  const [q, setQ] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(!!linked) // small screens show the tree or the editor
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ book, page, open: openIds })) } catch { /* private mode */ }
  }, [book, page, openIds])

  const books = s.notebooks
  const query = q.trim().toLowerCase()
  const pagesOf = (id: string) =>
    s.notes
      .filter((n) => n.bookId === id)
      .filter((n) => !query || (n.title + ' ' + n.body).toLowerCase().includes(query))
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updated.localeCompare(a.updated))
  const countOf = (id: string) => s.notes.filter((n) => n.bookId === id).length

  const current: Note | null = s.notes.find((n) => n.id === page) ?? null
  const currentBook = books.find((b) => b.id === (current?.bookId ?? book)) ?? null

  // drop selections that no longer exist
  useEffect(() => {
    if (book && !books.some((b) => b.id === book)) setBook(null)
    if (page && !s.notes.some((n) => n.id === page)) setPage(null)
  }, [books, s.notes, book, page])

  // on a wide screen, open something sensible the first time
  useEffect(() => {
    if (!books.length || book || !window.matchMedia('(min-width: 861px)').matches) return
    const first = books[0]
    setBook(first.id); setOpenIds((o) => (o.includes(first.id) ? o : [...o, first.id]))
  }, [books, book])

  const isOpen = (id: string) => openIds.includes(id) || (!!query && pagesOf(id).length > 0)
  const toggle = (id: string) => setOpenIds((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))
  const pick = (id: string) => {
    if (book === id) toggle(id)
    else { setBook(id); setOpenIds((o) => (o.includes(id) ? o : [...o, id])) }
  }

  const newBook = () => {
    const b = { id: uid(), title: 'Untitled book', created: new Date().toISOString() }
    set((d) => ({ ...d, notebooks: [b, ...d.notebooks] }))
    setQ(''); setBook(b.id); setPage(null); setOpenIds((o) => [...o, b.id]); setRenaming(b.id); setShowEditor(false)
  }
  const renameBook = (id: string, title: string) => {
    const t = title.trim()
    setRenaming(null)
    if (t) set((d) => ({ ...d, notebooks: d.notebooks.map((b) => (b.id === id ? { ...b, title: t.slice(0, 200) } : b)) }))
  }
  const removeBook = (id: string) => {
    const n = countOf(id)
    if (!confirm(n ? `Delete this book and its ${n} ${n === 1 ? 'page' : 'pages'}? This cannot be undone.` : 'Delete this empty book?')) return
    set((d) => ({ ...d, notebooks: d.notebooks.filter((b) => b.id !== id), notes: d.notes.filter((x) => x.bookId !== id) }))
    if (book === id) { setBook(null); setPage(null); setShowEditor(false) }
  }
  const newPage = (bookId: string) => {
    const now = new Date().toISOString()
    const n: Note = { id: uid(), bookId, title: '', body: '', created: now, updated: now }
    set((d) => ({ ...d, notes: [n, ...d.notes] }))
    setQ(''); setBook(bookId); setPage(n.id); setOpenIds((o) => (o.includes(bookId) ? o : [...o, bookId])); setShowEditor(true)
    setTimeout(() => titleRef.current?.focus(), 80)
  }
  const update = (id: string, patch: Partial<Pick<Note, 'title' | 'body' | 'pinned'>>, touch = true) =>
    set((d) => ({ ...d, notes: d.notes.map((n) => (n.id === id ? { ...n, ...patch, ...(touch ? { updated: new Date().toISOString() } : {}) } : n)) }))
  const removePage = (id: string) => {
    if (!confirm('Delete this page? This cannot be undone.')) return
    set((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }))
    setPage(null); setShowEditor(false)
  }
  const words = current ? current.body.trim().split(/\s+/).filter(Boolean).length : 0
  const shown = books.filter((b) => !query || pagesOf(b.id).length > 0 || b.title.toLowerCase().includes(query))

  return (
    <>
      <PageHead title="Notebook" sub="Books hold your pages. Saved automatically." />

      <div className={`nb ${showEditor ? 'show-editor' : ''}`}>
        <div className="card nb-tree">
          <button className="btn nb-new" onClick={newBook}><BookPlus size={18} /> New book</button>
          <div className="nb-search">
            <Search size={15} />
            <input placeholder="Search all pages" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="nb-books">
            {books.length === 0 && (
              <Empty emoji="📚" title="No books yet" text="Create a book, then add pages inside it." action={<button className="btn" onClick={newBook}>New book</button>} />
            )}
            {books.length > 0 && shown.length === 0 && <div className="muted small" style={{ padding: 12 }}>Nothing matches "{q}".</div>}

            {shown.map((b) => {
              const open = isOpen(b.id)
              const sel = book === b.id
              const pages = pagesOf(b.id)
              return (
                <div key={b.id} className={`nb-book ${sel ? 'sel' : ''} ${open ? 'open' : ''}`}>
                  <div className="nb-book-row" onClick={() => renaming !== b.id && pick(b.id)}>
                    <motion.span className="nb-chev" animate={{ rotate: open ? 90 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 32 }}><ChevronRight size={15} /></motion.span>
                    <span className="nb-cover">{open ? <BookOpen size={17} /> : <Library size={17} />}</span>
                    <div className="nb-book-name">
                      {renaming === b.id ? (
                        <input
                          autoFocus defaultValue={b.title} maxLength={200}
                          onFocus={(e) => e.currentTarget.select()}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => renameBook(b.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') renameBook(b.id, e.currentTarget.value); if (e.key === 'Escape') setRenaming(null) }}
                        />
                      ) : (<><b>{b.title}</b><span>{countOf(b.id)} {countOf(b.id) === 1 ? 'page' : 'pages'}</span></>)}
                    </div>
                    {renaming === b.id ? (
                      <button className="nb-act always" title="Save name" onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); const i = (e.currentTarget.parentElement as HTMLElement).querySelector('input'); renameBook(b.id, i?.value ?? b.title) }}><Check size={16} /></button>
                    ) : (
                      <div className="nb-acts" onClick={(e) => e.stopPropagation()}>
                        <button className="nb-act" title="Rename book" onClick={() => setRenaming(b.id)}><Pencil size={14} /></button>
                        <button className="nb-act" title="Delete book" onClick={() => removeBook(b.id)}><Trash2 size={14} /></button>
                        <button className="nb-act plus" title="New page in this book" onClick={() => newPage(b.id)}><Plus size={17} /></button>
                      </div>
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div className="nb-pages" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}>
                        <div className="nb-pages-in">
                          {pages.map((n) => (
                            <button key={n.id} className={`nb-page ${n.id === page ? 'on' : ''}`} onClick={() => { setBook(b.id); setPage(n.id); setShowEditor(true) }}>
                              <FileText size={16} />
                              <span className="nb-page-txt"><b>{n.title || 'Untitled page'}</b><span>{when(n.updated)}</span></span>
                              {n.pinned && <Pin size={12} className="nb-pin" />}
                            </button>
                          ))}
                          {!query && (
                            <button className="nb-page nb-add" onClick={() => newPage(b.id)}><Plus size={16} /> New page</button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card nb-editor">
          {current ? (
            <>
              <div className="nb-top">
                <button className="icon-btn nb-back" onClick={() => setShowEditor(false)} title="Back to books"><ArrowLeft size={18} /></button>
                <div className="nb-crumb"><Library size={14} /><span>{currentBook?.title ?? 'Book'}</span><ChevronRight size={13} /><b>{current.title || 'Untitled page'}</b></div>
                <div className="grow" />
                <button className="icon-btn" onClick={() => update(current.id, { pinned: !current.pinned }, false)} title={current.pinned ? 'Unpin' : 'Pin to top'}>{current.pinned ? <PinOff size={16} /> : <Pin size={16} />}</button>
                <button className="icon-btn" onClick={() => removePage(current.id)} title="Delete page"><Trash2 size={16} /></button>
              </div>
              <div className="nb-sheet">
                <input ref={titleRef} className="nb-title" placeholder="Untitled page" value={current.title} maxLength={300} onChange={(e) => update(current.id, { title: e.target.value })} />
                <div className="nb-paper">
                  <textarea className="nb-body" placeholder="Start writing…" value={current.body} maxLength={200000} onChange={(e) => update(current.id, { body: e.target.value })} />
                </div>
              </div>
              <div className="nb-bar">
                <span>{words} {words === 1 ? 'word' : 'words'}</span><span>·</span><span>Edited {when(current.updated)}</span>
                <span className="grow" /><span>{status === 'saving' ? 'Saving…' : status === 'error' ? 'Offline, will retry' : 'Saved'}</span>
              </div>
            </>
          ) : (
            <div className="nb-empty">
              <button className="icon-btn nb-back" onClick={() => setShowEditor(false)} title="Back"><ArrowLeft size={18} /></button>
              {!books.length ? (
                <Empty emoji="📚" title="Start with a book" text="A book is like a folder. Pages live inside it." action={<button className="btn" onClick={newBook}><BookPlus size={16} /> New book</button>} />
              ) : currentBook ? (
                <Empty emoji="📄" title={countOf(currentBook.id) ? 'Pick a page' : 'This book is empty'} text={countOf(currentBook.id) ? `Choose a page from “${currentBook.title}”.` : 'Add the first page to this book.'} action={<button className="btn" onClick={() => newPage(currentBook.id)}><Plus size={16} /> New page</button>} />
              ) : (
                <Empty emoji="📖" title="Select a book" text="Open a book on the left to see its pages." />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
