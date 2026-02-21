import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../layouts/AppShell'
import Badge from '../components/Badge'
import Card from '../components/Card'
import type { CasePhase } from '../types/Case'
import { DATA_MODE } from '../data/dataMode'
import { useDb } from '../lib/useDb'
import { getCurrentUser } from '../lib/auth'
import { listCasesForUser } from '../auth/scope'
import { supabase } from '../lib/supabaseClient'

const phaseLabelMap: Record<CasePhase, string> = {
  planejamento: 'Planejamento',
  orcamento: 'Orçamento',
  contrato_pendente: 'Contrato pendente',
  contrato_aprovado: 'Contrato aprovado',
  em_producao: 'Em produção',
  finalizado: 'Finalizado',
}

const phaseToneMap: Record<CasePhase, 'neutral' | 'info' | 'success'> = {
  planejamento: 'neutral',
  orcamento: 'neutral',
  contrato_pendente: 'neutral',
  contrato_aprovado: 'info',
  em_producao: 'info',
  finalizado: 'success',
}

type CaseListItem = {
  id: string
  patientId?: string
  patientName: string
  dentistId?: string
  phase: CasePhase
  status: string
  treatmentCode?: string
  totalTrays?: number
  totalTraysUpper?: number
  totalTraysLower?: number
  changeEveryDays?: number
  deliveryLots?: unknown[]
  installation?: { installedAt?: string }
}

function caseStatusBadge(item: CaseListItem) {
  if (item.phase === 'finalizado' || item.status === 'finalizado') {
    return { label: 'Finalizado', tone: 'success' as const }
  }
  if ((item.deliveryLots?.length ?? 0) > 0 && !item.installation?.installedAt) {
    return { label: 'Pronto para entrega', tone: 'info' as const }
  }
  if (item.installation?.installedAt) {
    return { label: 'Em tratamento', tone: 'info' as const }
  }
  return { label: phaseLabelMap[item.phase], tone: phaseToneMap[item.phase] }
}

export default function CasesPage() {
  const { db } = useDb()
  const isSupabaseMode = DATA_MODE === 'supabase'
  const currentUser = getCurrentUser(db)
  const [supabaseCases, setSupabaseCases] = useState<CaseListItem[]>([])
  const [supabasePatientsById, setSupabasePatientsById] = useState<Map<string, string>>(new Map())
  const [supabaseDentistsById, setSupabaseDentistsById] = useState<Map<string, { name: string; gender?: string }>>(new Map())

  useEffect(() => {
    let active = true
    if (!isSupabaseMode || !supabase) return
    ;(async () => {
      const [casesRes, patientsRes, dentistsRes] = await Promise.all([
        supabase.from('cases').select('id, patient_id, dentist_id, status, data, deleted_at').is('deleted_at', null),
        supabase.from('patients').select('id, name, deleted_at').is('deleted_at', null),
        supabase.from('dentists').select('id, name, gender, deleted_at').is('deleted_at', null),
      ])
      if (!active) return

      const patientsMap = new Map<string, string>()
      for (const row of (patientsRes.data ?? []) as Array<{ id: string; name: string }>) {
        patientsMap.set(row.id, row.name ?? '')
      }
      setSupabasePatientsById(patientsMap)

      const dentistsMap = new Map<string, { name: string; gender?: string }>()
      for (const row of (dentistsRes.data ?? []) as Array<{ id: string; name: string; gender?: string }>) {
        dentistsMap.set(row.id, { name: row.name ?? '', gender: row.gender })
      }
      setSupabaseDentistsById(dentistsMap)

      const mapped = ((casesRes.data ?? []) as Array<{ id: string; patient_id?: string; dentist_id?: string; status?: string; data?: Record<string, unknown> }>).map((row) => {
        const data = row.data ?? {}
        const status = (data.status as string | undefined) ?? row.status ?? 'planejamento'
        const phaseRaw = (data.phase as string | undefined) ?? ''
        const phase = (phaseRaw || (status === 'finalizado' ? 'finalizado' : status === 'em_producao' || status === 'em_entrega' ? 'em_producao' : 'planejamento')) as CasePhase
        const patientName = (data.patientName as string | undefined)
          ?? (row.patient_id ? patientsMap.get(row.patient_id) : undefined)
          ?? '-'
        return {
          id: row.id,
          patientId: row.patient_id,
          patientName,
          dentistId: row.dentist_id,
          phase,
          status,
          treatmentCode: data.treatmentCode as string | undefined,
          totalTrays: data.totalTrays as number | undefined,
          totalTraysUpper: data.totalTraysUpper as number | undefined,
          totalTraysLower: data.totalTraysLower as number | undefined,
          changeEveryDays: data.changeEveryDays as number | undefined,
          deliveryLots: (data.deliveryLots as unknown[] | undefined) ?? [],
          installation: (data.installation as { installedAt?: string } | undefined) ?? undefined,
        } as CaseListItem
      })
      setSupabaseCases(mapped)
    })()
    return () => {
      active = false
    }
  }, [isSupabaseMode])

  const localPatientsById = useMemo(() => new Map(db.patients.map((item) => [item.id, item.name])), [db.patients])
  const localDentistsById = useMemo(
    () => new Map(db.dentists.map((item) => [item.id, { name: item.name, gender: item.gender }])),
    [db.dentists],
  )
  const localCases = useMemo(() => listCasesForUser(db, currentUser), [db, currentUser])
  const cases: CaseListItem[] = isSupabaseMode
    ? supabaseCases
    : localCases
  const patientsById = isSupabaseMode ? supabasePatientsById : localPatientsById
  const dentistsById = isSupabaseMode ? supabaseDentistsById : localDentistsById

  return (
    <AppShell breadcrumb={['Inicio', 'Tratamentos']}>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Casos</h1>
        <p className="mt-2 text-sm text-slate-500">Casos de alinhadores originados por exame/scan.</p>
      </section>

      <section className="mt-6">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4 text-sm font-medium text-slate-700">
            {cases.length} casos cadastrados
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Paciente</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Placas</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Troca a cada (dias)</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cases.map((item) => {
                  const patientName = item.patientId ? (patientsById.get(item.patientId) ?? item.patientName) : item.patientName
                  const dentist = item.dentistId ? dentistsById.get(item.dentistId) : undefined
                  const dentistPrefix = dentist?.gender === 'feminino' ? 'Dra.' : dentist ? 'Dr.' : ''
                  const hasArchCounts = typeof item.totalTraysUpper === 'number' || typeof item.totalTraysLower === 'number'
                  const badge = caseStatusBadge(item)
                  return (
                    <tr key={item.id} className="bg-white">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-900">{patientName}</p>
                        {item.treatmentCode ? <p className="mt-1 text-xs font-semibold text-slate-600">ID: {item.treatmentCode}</p> : null}
                        {dentist ? (
                          <p className="mt-1 text-xs text-slate-500">Dentista: {`${dentistPrefix} ${dentist.name}`}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {hasArchCounts
                          ? `Sup ${item.totalTraysUpper ?? 0} | Inf ${item.totalTraysLower ?? 0}`
                          : `Total ${item.totalTrays}`}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{item.changeEveryDays}</td>
                      <td className="px-5 py-4">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to={`/app/cases/${item.id}`}
                          className="inline-flex items-center rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </AppShell>
  )
}
