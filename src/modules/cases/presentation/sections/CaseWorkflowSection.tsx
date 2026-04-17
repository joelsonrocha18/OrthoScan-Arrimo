import Button from '../../../../components/Button'
import Card from '../../../../components/Card'
import Input from '../../../../components/Input'

type CaseWorkflowSectionProps = {
  visible: boolean
  statusLabel: string
  phase: string
  canWrite: boolean
  budgetValue: string
  budgetNotes: string
  contractNotes: string
  contractStatus?: string
  contractApprovedAt?: string
  onBudgetValueChange: (value: string) => void
  onBudgetNotesChange: (value: string) => void
  onContractNotesChange: (value: string) => void
  onConcludePlanning: () => void
  onCloseBudget: () => void
  onApproveContract: () => void
  onCreateLabOrder: () => void
}

export function CaseWorkflowSection({
  visible,
  statusLabel,
  phase,
  canWrite,
  budgetValue,
  budgetNotes,
  contractNotes,
  contractStatus,
  contractApprovedAt,
  onBudgetValueChange,
  onBudgetNotesChange,
  onContractNotesChange,
  onConcludePlanning,
  onCloseBudget,
  onApproveContract,
  onCreateLabOrder,
}: CaseWorkflowSectionProps) {
  if (!visible) return null

  return (
    <section className="mt-6">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Fluxo do pedido</h2>
        <p className="mt-1 text-sm text-slate-500">Status atual: {statusLabel}</p>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">Etapa 1 - Planejamento</p>
            <Button className="mt-2" size="sm" onClick={onConcludePlanning} disabled={phase !== 'planejamento' || !canWrite}>
              Concluir planejamento
            </Button>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">Etapa 2 - Orçamento</p>
            <div className="mt-2 grid gap-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={budgetValue}
                onChange={(event) => onBudgetValueChange(event.target.value)}
              />
              <textarea
                rows={2}
                placeholder="Observações do orçamento"
                value={budgetNotes}
                onChange={(event) => onBudgetNotesChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <Button size="sm" onClick={onCloseBudget} disabled={phase !== 'orçamento' || !canWrite}>
                Fechar orçamento
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">Etapa 3 - Contrato</p>
            <p className="mt-1 text-xs text-slate-500">
              Status: {contractStatus ?? 'pendente'}
              {contractApprovedAt ? ` | Aprovado em ${contractApprovedAt}` : ''}
            </p>
            <textarea
              rows={2}
              placeholder="Observações do contrato"
              value={contractNotes}
              onChange={(event) => onContractNotesChange(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <Button className="mt-2" size="sm" onClick={onApproveContract} disabled={phase !== 'contrato_pendente' || !canWrite}>
              Aprovar contrato
            </Button>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">Etapa 4 - Ordem de Serviço (LAB)</p>
            <Button className="mt-2" size="sm" onClick={onCreateLabOrder} disabled={!canWrite}>
              Gerar OS para o LAB
            </Button>
          </div>
        </div>
      </Card>
    </section>
  )
}
