import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, CheckSquare, Lightbulb, Trophy, Wallet } from 'lucide-react'
import { useCats, useStore } from '../store'
import { Modal, toast } from './ui'
import { todayKey, uid } from '../utils'

type Kind = 'task' | 'learned' | 'achievement' | 'money' | null

export function QuickAdd() {
  const { set } = useStore()
  const [menu, setMenu] = useState(false)
  const [kind, setKind] = useState<Kind>(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [amount, setAmount] = useState('')
  const [tx, setTx] = useState<'income' | 'expense'>('expense')
  const [cat, setCat] = useState('')
  const incomeCats = useCats('income')
  const expenseCats = useCats('expense')
  const txCats = tx === 'income' ? incomeCats : expenseCats

  const close = () => { setKind(null); setTitle(''); setText(''); setAmount(''); setCat('') }
  const open = (k: Kind) => { setMenu(false); setKind(k) }
  const submit = () => {
    if (kind === 'money') {
      if (!+amount) return
      set((d) => ({ ...d, txs: [...d.txs, { id: uid(), type: tx, amount: +amount, category: cat || txCats[0], date: todayKey(), note: text }] }))
    } else {
      if (!title.trim()) return
      if (kind === 'task') set((d) => ({ ...d, tasks: [...d.tasks, { id: uid(), title: title.trim(), priority: 'Medium', category: 'Other', due: todayKey(), notes: text, done: false, created: todayKey() }] }))
      if (kind === 'learned') set((d) => ({ ...d, learnings: [{ id: uid(), title: title.trim(), details: text, tag: 'General', date: todayKey() }, ...d.learnings] }))
      if (kind === 'achievement') set((d) => ({ ...d, achievements: [{ id: uid(), title: title.trim(), details: text, tag: 'General', date: todayKey() }, ...d.achievements] }))
    }
    toast('Added ✓')
    close()
  }
  const labels = { task: 'Task for today', learned: 'Something I learned', achievement: 'Achievement', money: 'Income / expense' }
  return (
    <>
      <AnimatePresence>
        {menu && (
          <motion.div className="fab-menu" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
            <button onClick={() => open('money')}><Wallet size={16} /> Income / expense</button>
            <button onClick={() => open('achievement')}><Trophy size={16} /> Achievement</button>
            <button onClick={() => open('learned')}><Lightbulb size={16} /> Something learned</button>
            <button onClick={() => open('task')}><CheckSquare size={16} /> Task</button>
          </motion.div>
        )}
      </AnimatePresence>
      <button className="fab-btn" onClick={() => setMenu(!menu)} aria-label="Quick add">
        <motion.div animate={{ rotate: menu ? 135 : 0 }}><Plus size={26} /></motion.div>
      </button>
      <Modal open={!!kind} onClose={close} title={kind ? 'Quick add: ' + labels[kind] : ''}>
        {kind === 'money' && (
          <>
            <div className="tabs" style={{ marginTop: 12 }}>
              <button className={`tab ${tx === 'expense' ? 'on' : ''}`} onClick={() => { setTx('expense'); setCat('') }}>Expense</button>
              <button className={`tab ${tx === 'income' ? 'on' : ''}`} onClick={() => { setTx('income'); setCat('') }}>Income</button>
            </div>
            <label>Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            <label>{tx === 'income' ? 'Source' : 'Category'}</label>
            <select value={cat || txCats[0]} onChange={(e) => setCat(e.target.value)}>{txCats.map((c) => <option key={c}>{c}</option>)}</select>
          </>
        )}
        {kind && kind !== 'money' && (
          <>
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </>
        )}
        <label>Note (optional)</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" style={{ width: '100%', marginTop: 16 }} onClick={submit}>Save</button>
      </Modal>
    </>
  )
}
