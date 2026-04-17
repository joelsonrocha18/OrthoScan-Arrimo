import { Activity, Clock3, PackageCheck, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type DashboardStat = {
  title: string
  value: string
  meta: string
  metaTone: 'success' | 'danger' | 'neutral'
  icon: LucideIcon
}

export type PendingAction = {
  title: string
  priorityText: string
  priorityTone: 'danger' | 'info' | 'neutral'
  kind: 'rework' | 'tray' | 'delivery'
  kindLabel: string
}

export const dashboardStats: DashboardStat[] = [
  {
    title: 'Pacientes Ativos',
    value: '124',
    meta: '+12%',
    metaTone: 'success',
    icon: UsersRound,
  },
  {
    title: 'Tratamentos em Andamento',
    value: '87',
    meta: '+5%',
    metaTone: 'success',
    icon: Activity,
  },
  {
    title: 'Entregas Hoje',
    value: '18',
    meta: '4 confirmadas',
    metaTone: 'neutral',
    icon: PackageCheck,
  },
  {
    title: 'Alinhadores Pendentes',
    value: '23',
    meta: '3 atrasados',
    metaTone: 'danger',
    icon: Clock3,
  },
]

export const pendingActions: PendingAction[] = [
  {
    title: 'Aprovar reconfecção - Maria Silva',
    priorityText: 'Urgente',
    priorityTone: 'danger',
    kind: 'rework',
    kindLabel: 'Reconfecção',
  },
  {
    title: 'Placa #12 pronta para entrega',
    priorityText: 'Médio',
    priorityTone: 'info',
    kind: 'tray',
    kindLabel: 'Placa',
  },
  {
    title: 'Confirmar entrega - Joao Santos',
    priorityText: 'Baixo',
    priorityTone: 'neutral',
    kind: 'delivery',
    kindLabel: 'Entrega',
  },
]
