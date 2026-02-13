import { useMemo, useState } from 'react'
import AppShell from '../layouts/AppShell'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { runDiagnostics, type DiagnosticItem, type DiagnosticReport } from '../diagnostics/runDiagnostics'
import { createDiagnosticsTestData, clearDiagnosticsTestData } from '../diagnostics/testData'
import { useToast } from '../app/ToastProvider'

type Section = {
  id: string
  title: string
  match: (item: DiagnosticItem) => boolean
}

const sections: Section[] = [
  { id: 'env', title: 'Ambiente', match: (item) => item.id.startsWith('env_') },
  { id: 'db', title: 'DB & Migracoes', match: (item) => item.id.startsWith('db_') },
  { id: 'routes', title: 'Rotas', match: (item) => item.id.startsWith('routes_') },
  { id: 'modules', title: 'Modulos', match: (item) => item.id.startsWith('modules_') },
  { id: 'rbac', title: 'Permissoes (RBAC)', match: (item) => item.id.startsWith('rbac_') },
  { id: 'scope', title: 'Escopo (Dentista/Clinica)', match: (item) => item.id.startsWith('scope_') },
  { id: 'docs', title: 'Anexos/Docs', match: (item) => item.id.startsWith('docs_') },
  { id: 'lab', title: 'LAB', match: (item) => item.id.startsWith('lab_') },
]

function statusTone(status: DiagnosticItem['status']) {
  if (status === 'pass') return 'success' as const
  if (status === 'fail') return 'danger' as const
  return 'info' as const
}

function statusLabel(status: DiagnosticItem['status']) {
  if (status === 'pass') return 'PASS'
  if (status === 'fail') return 'FAIL'
  return 'WARN'
}

export default function DiagnosticsPage() {
  const { addToast } = useToast()
  const [report, setReport] = useState<DiagnosticReport | null>(null)
  const [running, setRunning] = useState(false)

  const handleRun = async () => {
    setRunning(true)
    try {
      const next = await runDiagnostics()
      setReport(next)
    } finally {
      setRunning(false)
    }
  }

  const handleCreateData = () => {
    createDiagnosticsTestData()
    addToast({ type: 'success', title: 'Dados de teste criados' })
  }

  const handleClearData = () => {
    clearDiagnosticsTestData()
    addToast({ type: 'info', title: 'Dados de teste removidos' })
  }

  const itemsBySection = useMemo(() => {
    if (!report) return new Map<string, DiagnosticItem[]>()
    const map = new Map<string, DiagnosticItem[]>()
    sections.forEach((section) => {
      map.set(section.id, report.items.filter(section.match))
    })
    return map
  }, [report])

  const summary = useMemo(() => {
    if (!report) return null
    const counts = report.items.reduce(
      (acc, item) => {
        acc[item.status] += 1
        return acc
      },
      { pass: 0, warn: 0, fail: 0 },
    )
    const viaCep = report.items.find((item) => item.id === 'viacep.ping')
    return { ...counts, viaCep }
  }, [report])

  const formatDuration = (durationMs: number) => {
    if (durationMs < 1000) return `${durationMs} ms`
    return `${durationMs} ms (${(durationMs / 1000).toFixed(1)} s)`
  }

  return (
    <AppShell breadcrumb={['Inicio', 'Configuracoes', 'Diagnostico']}>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Diagnostico do Sistema</h1>
          <p className="mt-2 text-sm text-slate-500">Checklist automatico de recursos, RBAC e dados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleCreateData}>
            Criar dados de teste
          </Button>
          <Button variant="secondary" onClick={handleClearData}>
            Limpar dados de teste
          </Button>
          <Button onClick={handleRun} disabled={running}>
            {running ? 'Executando...' : 'Executar diagnostico'}
          </Button>
        </div>
      </section>

      <section className="mt-4">
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Resumo do diagnostico</p>
            {report ? (
              <p className="mt-1 text-xs text-slate-500">
                Iniciado em {new Date(report.startedAt).toLocaleString('pt-BR')} • Finalizado em{' '}
                {new Date(report.finishedAt).toLocaleString('pt-BR')}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Ainda nao executado.</p>
            )}
          </div>
          {summary ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success">PASS: {summary.pass}</Badge>
              <Badge tone="info">WARN: {summary.warn}</Badge>
              <Badge tone="danger">FAIL: {summary.fail}</Badge>
              {report ? (
                <span className="text-xs text-slate-500">Duracao: {formatDuration(report.durationMs)}</span>
              ) : null}
              {summary.viaCep ? (
                <span className="text-xs text-slate-500">
                  ViaCEP: {summary.viaCep.status === 'pass' ? 'OK' : 'Indisponivel'}
                </span>
              ) : null}
            </div>
          ) : null}
        </Card>
        {summary && summary.fail > 0 ? (
          <p className="mt-2 text-sm text-red-600">Ha falhas criticas — revise antes de usar com clientes.</p>
        ) : null}
      </section>

      <section className="mt-6 space-y-4">
        {sections.map((section) => {
          const items = itemsBySection.get(section.id) ?? []
          const withViaCep =
            section.id === 'env' && summary?.viaCep && !items.some((item) => item.id === summary.viaCep?.id)
              ? [...items, summary.viaCep]
              : items
          return (
            <Card key={section.id}>
              <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
              <div className="mt-4 space-y-3">
                {withViaCep.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum item executado.</p>
                ) : (
                  withViaCep.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="text-sm text-slate-600">{item.message}</p>
                        </div>
                        <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                      </div>
                      {item.details || item.fixHint ? (
                        <details className="mt-2 text-sm text-slate-600">
                          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Detalhes
                          </summary>
                          {item.details ? <p className="mt-2">{item.details}</p> : null}
                          {item.fixHint ? <p className="mt-2 text-xs text-amber-700">Dica: {item.fixHint}</p> : null}
                        </details>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </Card>
          )
        })}
      </section>
    </AppShell>
  )
}
