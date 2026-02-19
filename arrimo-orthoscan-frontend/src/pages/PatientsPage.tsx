import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import WhatsappLink from '../components/WhatsappLink'
import AppShell from '../layouts/AppShell'
import { DATA_MODE } from '../data/dataMode'
import { useDb } from '../lib/useDb'
import { getCurrentUser } from '../lib/auth'
import { can } from '../auth/permissions'
import { listPatientsForUser } from '../auth/scope'
import { supabase } from '../lib/supabaseClient'

export default function PatientsPage() {
  const { db } = useDb()
  const isSupabaseMode = DATA_MODE === 'supabase'
  const currentUser = getCurrentUser(db)
  const canWrite = can(currentUser, 'patients.write')
  const [query, setQuery] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [supabasePatients, setSupabasePatients] = useState<Array<{
    id: string
    name: string
    cpf?: string
    phone?: string
    whatsapp?: string
    primaryDentistId?: string
    deletedAt?: string
  }>>([])
  const [supabaseDentistsById, setSupabaseDentistsById] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let active = true
    if (!isSupabaseMode || !supabase) return
    ;(async () => {
      const [patientsRes, dentistsRes] = await Promise.all([
        supabase.from('patients').select('id, name, cpf, phone, whatsapp, primary_dentist_id, deleted_at'),
        supabase.from('dentists').select('id, name, deleted_at').is('deleted_at', null),
      ])
      if (!active) return
      const patients = ((patientsRes.data ?? []) as Array<{
        id: string
        name: string
        cpf?: string
        phone?: string
        whatsapp?: string
        primary_dentist_id?: string
        deleted_at?: string
      }>).map((row) => ({
        id: row.id,
        name: row.name ?? '-',
        cpf: row.cpf ?? undefined,
        phone: row.phone ?? undefined,
        whatsapp: row.whatsapp ?? undefined,
        primaryDentistId: row.primary_dentist_id ?? undefined,
        deletedAt: row.deleted_at ?? undefined,
      }))
      setSupabasePatients(patients)
      const dentistsMap = new Map<string, string>()
      for (const row of (dentistsRes.data ?? []) as Array<{ id: string; name: string }>) {
        dentistsMap.set(row.id, row.name ?? '')
      }
      setSupabaseDentistsById(dentistsMap)
    })()
    return () => {
      active = false
    }
  }, [isSupabaseMode])

  const localPatients = useMemo(() => listPatientsForUser(db, currentUser), [db, currentUser])
  const sourcePatients = isSupabaseMode ? supabasePatients : localPatients
  const dentistsById = isSupabaseMode
    ? supabaseDentistsById
    : new Map(db.dentists.map((dentist) => [dentist.id, dentist.name]))

  const patients = useMemo(
    () =>
      [...sourcePatients]
        .filter((item) => (showDeleted ? true : !item.deletedAt))
        .filter((item) => {
          const q = query.trim().toLowerCase()
          if (!q) return true
          return (
            item.name.toLowerCase().includes(q) ||
            (item.cpf ?? '').toLowerCase().includes(q) ||
            (item.phone ?? '').toLowerCase().includes(q) ||
            (item.whatsapp ?? '').toLowerCase().includes(q)
          )
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [sourcePatients, query, showDeleted],
  )

  return (
    <AppShell breadcrumb={['Inicio', 'Pacientes']}>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Pacientes</h1>
          <p className="mt-2 text-sm text-slate-500">Cadastro centralizado de pacientes e vinculos de tratamento.</p>
        </div>
        {canWrite ? (
          <Link to="/app/patients/new">
            <Button>Novo paciente</Button>
          </Link>
        ) : null}
      </section>

      <section className="mt-6">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Buscar por nome, CPF, telefone ou WhatsApp"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} />
              Mostrar excluidos
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Dentista responsavel</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Telefone fixo</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">WhatsApp</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {patients.map((item) => (
                  <tr key={item.id} className="bg-white">
                    <td className="px-5 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {item.primaryDentistId
                        ? dentistsById.get(item.primaryDentistId) ?? '-'
                        : '-'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{item.phone || '-'}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {item.whatsapp ? <WhatsappLink value={item.whatsapp} /> : '-'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Link
                          to={`/app/patients/${item.id}`}
                          className="inline-flex h-9 items-center rounded-lg bg-brand-500 px-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                        >
                          Abrir
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-sm text-slate-500" colSpan={5}>
                      Nenhum paciente encontrado.
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
