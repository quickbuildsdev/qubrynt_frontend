export type Habit = {
  id: string
  name: string
  emoji: string
  type: 'check' | 'number'
  unit?: string
  target?: number
  days: number[] // 0=Sun..6=Sat
  category: string
  archived?: boolean
}
export type Task = {
  id: string
  title: string
  priority: 'High' | 'Medium' | 'Low'
  category: string
  due?: string
  notes?: string
  done: boolean
  doneAt?: string
  created: string
}
export type Block = { id: string; title: string; start: string; end: string; category: string; days: number[] }
export type Session = { id: string; date: string; minutes: number; category: string; label: string; mode: string }
export type Entry = { id: string; title: string; details: string; tag: string; date: string; link?: string }
export type Reflection = { date: string; mood: number; note: string; well: string; improve: string }
export type Tx = { id: string; type: 'income' | 'expense'; amount: number; category: string; date: string; note: string }
export type Goal = {
  id: string
  title: string
  kind: 'habit' | 'income' | 'tasks' | 'focus' | 'manual'
  habitId?: string
  target: number
  period: 'week' | 'month' | 'year'
  progress?: number
  unit?: string
}
export type Notebook = { id: string; title: string; created: string }
export type Note = { id: string; bookId?: string; title: string; body: string; pinned?: boolean; created: string; updated: string }
export type QuickLink = { id: string; title: string; url: string; icon: string }
export type CategoryType = 'activity' | 'expense' | 'income'
export type Category = { id: string; name: string; type: CategoryType }
export type Settings = { theme: 'dark' | 'light'; name: string; weekStart: 0 | 1; reminder: string; reminderOn: boolean; navPosition: 'left' | 'bottom' }

export type State = {
  habits: Habit[]
  logs: Record<string, number>
  tasks: Task[]
  blocks: Block[]
  blockLogs: Record<string, 'done' | 'skipped'>
  sessions: Session[]
  learnings: Entry[]
  achievements: Entry[]
  reflections: Reflection[]
  txs: Tx[]
  goals: Goal[]
  notebooks: Notebook[]
  notes: Note[]
  links: QuickLink[]
  categories: Category[]
  settings: Settings
}
