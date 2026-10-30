import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Plus, Trash2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCats, useStore } from '../store'
import { CountUp, Empty, Modal, PageHead, stagger, toast } from '../components/ui'
import { CHART_COLORS, fmtDate, inr, startOfPeriod, todayKey, uid } from '../utils'
import type { Tx } from '../types'

const blank = (): Tx => ({ id: '', type: 'expense', amount: 0, category: '', date: todayKey(), note: '' })

export default function Money() {
  const { s, set } = useStore()
  const incomeCats = useCats('income')
  const expenseCats = useCats('expense')
  const [edit, setEdit] = useState<Tx | null>(null)
  const ms = startOfPeriod('month')
  const month = s.txs.filter((t) => t.date >= ms)
  const inc = month.filter((t) => t.type === 'income').reduce((a, b) => a + b.amount, 0)
  const exp = month.filter((t) => t.type === 'expense').reduce((a, b) => a + b.amount, 0)

  const months: { m: string; Income: number; Expense: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const tx = s.txs.filter((t) => t.date.startsWith(k))
    months.push({ m: d.toLocaleString('en', { month: 'short' }), Income: tx.filter((t) => t.type === 'income').reduce((a, b) => a + b.amount, 0), Expense: tx.filter((t) => t.type === 'expense').reduce((a, b) => a + b.amount, 0) })
  }
  const cat: Record<string, number> = {}
  month.filter((t) => t.type === 'expense').forEach((t) => (cat[t.category || 'Other'] = (cat[t.category || 'Other'] || 0) + t.amount))
  const pie = Object.entries(cat).map(([name, value]) => ({ name, value }))
  const save = () => {
    if (!edit || !(edit.amount > 0)) return toast('Enter an amount')
    const e = { ...edit, category: edit.category || (edit.type === 'income' ? incomeCats[0] : expenseCats[0]) }
    set((d) => ({ ...d, txs: e.id ? d.txs.map((t) => (t.id === e.id ? e : t)) : [...d.txs, { ...e, id: uid() }] }))
    setEdit(null)
  }
  const stats = [['Income this month', inc, 'var(--accent2)'], ['Expenses', exp, 'var(--text)'], ['Savings', inc - exp, 'var(--accent)']] as const

  return (
    <>
      <PageHead title="Money" sub="What you earn and spend. All amounts in ₹.">
        <button className="btn" onClick={() => setEdit(blank())}><Plus size={16} /> Add transaction</button>
      </PageHead>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        {stats.map(([l, v, c], i) => (
          <motion.div key={l} className="card stat" {...stagger(i)}><div className="l">{l}</div><div className="v" style={{ color: c }}><CountUp value={v} format={(n) => inr(n)} /></div></motion.div>
        ))}
      </div>
      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card"><h3>Last 6 months</h3>
          <div style={{ height: 240 }}><ResponsiveContainer><BarChart data={months}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" stroke="var(--muted)" fontSize={12} /><YAxis stroke="var(--muted)" fontSize={12} width={50} /><Tooltip contentStyle={{ background: 'var(--card-solid)', border: '1px solid var(--border)', borderRadius: 12 }} formatter={(v: number) => inr(v)} /><Legend /><Bar dataKey="Income" fill="#6fd3a5" radius={[6, 6, 0, 0]} /><Bar dataKey="Expense" fill="#8e8e93" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><h3>Spending by category (this month)</h3>
          {pie.length === 0 ? <Empty emoji="🥧" title="No expenses this month" /> : <div style={{ height: 240 }}><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>{pie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: 'var(--card-solid)', border: '1px solid var(--border)', borderRadius: 12 }} formatter={(v: number) => inr(v)} /><Legend /></PieChart></ResponsiveContainer></div>}</div>
      </div>
      <div className="card"><h3>Recent transactions</h3>
        {s.txs.length === 0 ? <Empty emoji="💰" title="No transactions yet" text="Log income and expenses to see your trends." action={<button className="btn" onClick={() => setEdit(blank())}>Add one</button>} /> :
          [...s.txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25).map((t) => (
            <div key={t.id} className="row" style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, ' + (t.type === 'income' ? 'var(--accent2)' : 'var(--muted)') + ' 14%, transparent)', color: t.type === 'income' ? 'var(--accent2)' : 'var(--muted)' }}>{t.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}</div>
              <div className="grow" onClick={() => setEdit(t)} style={{ cursor: 'pointer' }}><div style={{ fontWeight: 600 }}>{t.category}</div><div className="muted small">{fmtDate(t.date)}{t.note && ' · ' + t.note}</div></div>
              <b style={{ color: t.type === 'income' ? 'var(--accent2)' : 'var(--text)' }}>{t.type === 'income' ? '+' : '-'}{inr(t.amount)}</b>
              <button className="icon-btn" onClick={() => set((d) => ({ ...d, txs: d.txs.filter((x) => x.id !== t.id) }))}><Trash2 size={15} /></button>
            </div>
          ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit transaction' : 'New transaction'}>
        {edit && (<>
          <div className="tabs" style={{ marginTop: 12 }}>
            <button className={`tab ${edit.type === 'income' ? 'on' : ''}`} onClick={() => setEdit({ ...edit, type: 'income', category: '' })}>Income</button>
            <button className={`tab ${edit.type === 'expense' ? 'on' : ''}`} onClick={() => setEdit({ ...edit, type: 'expense', category: '' })}>Expense</button>
          </div>
          <label>Amount (₹)</label><input type="number" value={edit.amount || ''} onChange={(e) => setEdit({ ...edit, amount: +e.target.value })} autoFocus />
          <label>{edit.type === 'income' ? 'Source' : 'Category'}</label>
          <select value={edit.category || (edit.type === 'income' ? incomeCats[0] : expenseCats[0])} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
            {((c) => (edit.category && !c.includes(edit.category) ? [edit.category, ...c] : c))(edit.type === 'income' ? incomeCats : expenseCats).map((c) => <option key={c}>{c}</option>)}
          </select>
          <label>Date</label><input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
          <label>Note</label><input value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
          <button className="btn" style={{ width: '100%', marginTop: 16 }} onClick={save}>Save</button>
        </>)}
      </Modal>
    </>
  )
}
