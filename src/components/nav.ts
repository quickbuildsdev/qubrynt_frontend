import { BarChart3, BookOpen, CalendarCheck, LayoutDashboard, ListChecks, NotebookPen, Repeat, Settings as Cog, Target, Wallet, Clock, LucideIcon } from 'lucide-react'

export type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

export const MENU: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/today', label: 'Today', icon: CalendarCheck },
  { to: '/habits', label: 'Habits', icon: Repeat },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/schedule', label: 'Schedule', icon: Clock },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/money', label: 'Money', icon: Wallet },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]
export const NOTEBOOK: NavItem = { to: '/notebook', label: 'Notebook', icon: NotebookPen }
export const SETTINGS: NavItem = { to: '/settings', label: 'Settings', icon: Cog }
