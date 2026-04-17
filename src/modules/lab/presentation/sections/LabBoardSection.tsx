import LabBoard from '../../../../components/lab/LabBoard'
import { nowIsoDate } from '../../../../shared/utils/date'
import type { Case } from '../../../../types/Case'
import { LabBoardTabs } from '../components/LabBoardTabs'
import { LabRemainingBankTableSection } from './LabRemainingBankTableSection'
import { LabReworkTableSection } from './LabReworkTableSection'
import type { LabOrder } from '../../domain/entities/LabOrder'

type LabBoardSectionProps = {
  boardTab: 'esteira' | 'reconfeccao' | 'banco_restante'
  pipelineItems: LabOrder[]
  reworkItems: LabOrder[]
  remainingBankItems: LabOrder[]
  caseById: Map<string, Case>
  guideAutomationLeadDays: number
  canWrite: boolean
  onBoardTabChange: (value: 'esteira' | 'reconfeccao' | 'banco_restante') => void
  onRefresh: () => void
  onOpenDetails: (item: LabOrder) => void
  onPrintLabel: (item: LabOrder) => void
  onMoveStatus?: (id: string, nextStage: LabOrder['status']) => Promise<{ ok: true } | { ok: false; error: string }>
  onAdvanceRequest: (item: LabOrder) => void
  resolveOrderProductLabel: (item: LabOrder, caseItemOverride?: Case) => string
}

export function LabBoardSection({
  boardTab,
  pipelineItems,
  reworkItems,
  remainingBankItems,
  caseById,
  guideAutomationLeadDays,
  canWrite,
  onBoardTabChange,
  onRefresh,
  onOpenDetails,
  onPrintLabel,
  onMoveStatus,
  onAdvanceRequest,
  resolveOrderProductLabel,
}: LabBoardSectionProps) {
  return (
    <section className="mt-6">
      <LabBoardTabs boardTab={boardTab} onBoardTabChange={onBoardTabChange} />

      {boardTab === 'esteira' ? (
        <LabBoard
          items={pipelineItems}
          guideTone={(item) => (item.status === 'prontas' ? 'green' : item.dueDate < nowIsoDate() ? 'red' : 'yellow')}
          caseLabel={(item) => caseById.get(item.caseId ?? '')?.treatmentCode ?? item.requestCode}
          productLabel={resolveOrderProductLabel}
          onItemsChange={onRefresh}
          onDetails={onOpenDetails}
          onPrintLabel={onPrintLabel}
          onMoveStatus={canWrite ? onMoveStatus : undefined}
          canEdit={canWrite}
        />
      ) : boardTab === 'reconfeccao' ? (
        <LabReworkTableSection items={reworkItems} caseById={caseById} />
      ) : (
        <LabRemainingBankTableSection
          items={remainingBankItems}
          caseById={caseById}
          resolveLabProductLabel={resolveOrderProductLabel}
          guideAutomationLeadDays={guideAutomationLeadDays}
          canWrite={canWrite}
          onRequestAdvance={onAdvanceRequest}
        />
      )}
    </section>
  )
}
