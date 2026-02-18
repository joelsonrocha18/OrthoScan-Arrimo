import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import WhatsappLink from '../components/WhatsappLink'
import AppShell from '../layouts/AppShell'
import { useDb } from '../lib/useDb'
import type { DentistClinic } from '../types/DentistClinic'
import { getCurrentUser } from '../lib/auth'
import { can } from '../auth/permissions'

function statusLabel(item: DentistClinic) {
  if (item.deletedAt) return { label: 'Excluido', tone: 'danger' as const }
  if (!item.isActive) return { label: 'Inativo', tone: 'neutral' as const }
  return { label: 'Ativo', tone: 'success' as const }
}

export default function DentistsPage() {
  const { db } = useDb()
  const currentUser = getCurrentUser(db)
  const canWrite = can(currentUser, 'dentists.write')
  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  const dentists = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return [...db.dentists]
      .filter((item) => item.type === 'dentista')
      .filter((item) => (showDeleted ? true : !item.deletedAt))
      .filter((item) => (showInactive ? true : item.isActive))
      .filter((item) => {
        if (!normalizedQuery) return true
        return (
          item.name.toLowerCase().includes(normalizedQuery) ||
          (item.cro ?? '').toLowerCase().includes(normalizedQuery) ||
          (item.phone ?? '').toLowerCase().includes(normalizedQuery) ||
          (item.whatsapp ?? '').toLowerCase().includes(normalizedQuery) ||
          (item.email ?? '').toLowerCase().includes(normalizedQuery)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [db.dentists, query, showInactive, showDeleted])

  return (
    <AppShell breadcrumb={['Inicio', 'Dentistas']}>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dentistas</h1>
          <p className="mt-2 text-sm text-slate-500">Cadastro de profissionais.</p>
        </div>
        {canWrite ? (
          <Link to="/app/dentists/new">
            <Button>Novo</Button>
          </Link>
        ) : null}
      </section>

      <section className="mt-6">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome, CRO ou telefone"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(event) => setShowInactive(event.target.checked)}
                />
                Mostrar inativos
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(event) => setShowDeleted(event.target.checked)}
                />
                Mostrar excluidos
              </label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">CRO</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Telefone fixo</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">WhatsApp</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dentists.map((item) => {
                  const status = statusLabel(item)
                  return (
                    <tr key={item.id} className="bg-white">
                      <td className="px-5 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{item.cro || '-'}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{item.phone || '-'}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{item.whatsapp ? <WhatsappLink value={item.whatsapp} /> : '-'}</td>
                      <td className="px-5 py-4">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to={`/app/dentists/${item.id}`}
                          className="inline-flex h-9 items-center rounded-lg bg-brand-500 px-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                        >
                          {canWrite ? 'Ver/Editar' : 'Ver'}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                {dentists.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-sm text-slate-500" colSpan={6}>
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </AppShell>
  )
}
