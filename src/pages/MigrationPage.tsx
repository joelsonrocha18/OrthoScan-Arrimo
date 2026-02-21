import { useMemo, useState } from 'react'
import AppShell from '../layouts/AppShell'
import Card from '../components/Card'
import Button from '../components/Button'
import { DATA_MODE } from '../data/dataMode'
import { supabase } from '../lib/supabaseClient'
import { getCurrentUser } from '../lib/auth'
import { useDb } from '../lib/useDb'

type ImportReport = {
  ok: boolean
  clinicId?: string
  counts?: Record<string, number>
  warnings?: string[]
  dryRun?: boolean
  error?: string
}

export default function MigrationPage() {
  const { db } = useDb()
  const currentUser = getCurrentUser(db)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [clinicName, setClinicName] = useState('ARRIMO OrthoScan')
  const [dryRun, setDryRun] = useState(true)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [exportData, setExportData] = useState<string>('')
  const [error, setError] = useState('')
  const [supabaseExport, setSupabaseExport] = useState<string>('')

  const localCounts = useMemo(() => {
    return {
      clinics: db.clinics.length,
      dentists: db.dentists.length,
      patients: db.patients.length,
      scans: db.scans.length,
      cases: db.cases.length,
      labItems: db.labItems.length,
      documents: db.patientDocuments.length,
    }
  }, [db])

  const exportLocal = () => {
    const payload = {
      clinic: { tradeName: clinicName },
      data: {
        clinics: db.clinics,
        dentists: db.dentists,
        patients: db.patients,
        scans: db.scans,
        cases: db.cases,
        labItems: db.labItems,
        documents: db.patientDocuments,
        users: db.users,
      },
    }
    const json = JSON.stringify(payload, null, 2)
    setExportData(json)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orthoscan_local_export_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const importToSupabase = async () => {
    if (DATA_MODE !== 'supabase') {
      setError('Modo supabase nao habilitado.')
      return
    }
    if (!supabase) {
      setError('Supabase nao configurado.')
      return
    }
    if (!importFile) {
      setError('Selecione um arquivo JSON.')
      return
    }
    const text = await importFile.text()
    const parsed = JSON.parse(text)
    const result = await supabase.functions.invoke('import-db', {
      body: {
        clinic: { tradeName: clinicName },
        ownerUserId: currentUser?.id ?? '',
        data: parsed.data ?? parsed,
        options: { mergeStrategy: 'upsert', dryRun },
      },
    })
    if (result.error) {
      setReport({ ok: false, error: result.error.message })
      return
    }
    setReport(result.data as ImportReport)
  }

  const exportSupabase = async () => {
    if (DATA_MODE !== 'supabase' || !supabase) {
      setError('Supabase nao configurado.')
      return
    }
    const result = await supabase.functions.invoke('export-db', { body: {} })
    if (result.error) {
      setError(result.error.message)
      return
    }
    const json = JSON.stringify(result.data, null, 2)
    setSupabaseExport(json)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orthoscan_supabase_export_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell breadcrumb={['Inicio', 'Configuracoes', 'Migracao']}>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Migracao</h1>
        <p className="mt-2 text-sm text-slate-500">Exportar DB local e importar para Supabase.</p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Exportar (Local)</h2>
          <p className="mt-2 text-sm text-slate-500">
            Clinicas: {localCounts.clinics} | Dentistas: {localCounts.dentists} | Pacientes: {localCounts.patients}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Scans: {localCounts.scans} | Cases: {localCounts.cases} | Lab: {localCounts.labItems}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Arquivos locais nao sao migrados. Reenvie anexos para Storage.
          </p>
          <Button className="mt-4" onClick={exportLocal}>
            Exportar DB local
          </Button>
          {exportData ? <p className="mt-2 text-xs text-slate-500">JSON gerado.</p> : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Importar (Supabase)</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Arquivo JSON</label>
              <input type="file" accept="application/json" onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Clinica destino</label>
              <input
                value={clinicName}
                onChange={(event) => setClinicName(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
              Dry run (simular)
            </label>
            <Button onClick={importToSupabase}>Importar</Button>
            {report ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>OK: {String(report.ok)}</p>
                {report.counts ? <p>Counts: {JSON.stringify(report.counts)}</p> : null}
                {report.warnings?.length ? <p>Warnings: {report.warnings.length}</p> : null}
                {report.error ? <p className="text-red-600">{report.error}</p> : null}
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Exportar (Supabase)</h2>
          <p className="mt-2 text-sm text-slate-500">Exporta dados da clinica do usuario logado.</p>
          <Button className="mt-4" onClick={exportSupabase}>
            Exportar dados da clinica
          </Button>
          {supabaseExport ? <p className="mt-2 text-xs text-slate-500">JSON gerado.</p> : null}
        </Card>
      </section>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </AppShell>
  )
}
