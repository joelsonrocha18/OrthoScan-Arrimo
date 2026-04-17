import Button from '../../../../components/Button'
import Card from '../../../../components/Card'
import Input from '../../../../components/Input'
import type { Case } from '../../../../types/Case'
import { archLabelMap } from '../lib/caseDetailPresentation'

type CaseClinicalInfoSectionProps = {
  currentCase: Case
  clinicName?: string
  dentistLabel: string
  requesterLabel: string
  isAlignerCase: boolean
  canWrite: boolean
  changeEveryDaysInput: string
  hasUpperArch: boolean
  hasLowerArch: boolean
  totalUpper: number
  totalLower: number
  onChangeEveryDaysInput: (value: string) => void
  onSaveChangeEveryDays: () => void
}

export function CaseClinicalInfoSection({
  currentCase,
  clinicName,
  dentistLabel,
  requesterLabel,
  isAlignerCase,
  canWrite,
  changeEveryDaysInput,
  hasUpperArch,
  hasLowerArch,
  totalUpper,
  totalLower,
  onChangeEveryDaysInput,
  onSaveChangeEveryDays,
}: CaseClinicalInfoSectionProps) {
  return (
    <Card className="ui-surface-panel">
      <h2 className="text-lg font-semibold text-slate-900">Informações clínicas</h2>
      <div className="mt-3 space-y-2 text-sm">
        <p>
          <span className="ui-label">Arcada:</span> <span className="ui-value">{currentCase.arch ? archLabelMap[currentCase.arch] : '-'}</span>
        </p>
        <p>
          <span className="ui-label">Queixa do paciente:</span> <span className="ui-value">{currentCase.complaint || '-'}</span>
        </p>
        <p>
          <span className="ui-label">Orientacao do dentista:</span> <span className="ui-value">{currentCase.dentistGuidance || '-'}</span>
        </p>
        <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
          <p className="ui-copy-muted text-xs font-semibold uppercase tracking-wide">Profissional / Clinica</p>
          <p className="mt-1">
            <span className="ui-label">Clinica:</span> <span className="ui-value">{clinicName || '-'}</span>
          </p>
          <p>
            <span className="ui-label">Dentista responsável:</span> <span className="ui-value">{dentistLabel}</span>
          </p>
          <p>
            <span className="ui-label">Solicitante:</span> <span className="ui-value">{requesterLabel}</span>
          </p>
        </div>
        {isAlignerCase ? (
          <>
            <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm">
              <p className="text-sm">
                <span className="ui-label">Troca a cada (dias):</span> <span className="ui-value">{currentCase.changeEveryDays}</span>
              </p>
              {canWrite ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="number"
                    min={1}
                    value={changeEveryDaysInput}
                    onChange={(event) => onChangeEveryDaysInput(event.target.value)}
                    className="ui-input-strong sm:w-40"
                  />
                  <Button size="sm" variant="secondary" onClick={onSaveChangeEveryDays}>
                    Salvar dias de troca
                  </Button>
                </div>
              ) : null}
            </div>
            <p>
              <span className="ui-label">Placas:</span>{' '}
              <span className="ui-value">
                {hasUpperArch && hasLowerArch
                  ? `Superior: ${totalUpper} | Inferior: ${totalLower}`
                  : hasUpperArch
                    ? `Superior: ${totalUpper}`
                    : `Inferior: ${totalLower}`}
              </span>
            </p>
            <p>
              <span className="ui-label">Placa de attachments:</span>{' '}
              <span className="ui-value">{currentCase.attachmentBondingTray ? 'Sim' : 'Não'}</span>
            </p>
          </>
        ) : (
          <p className="ui-copy-muted rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
            Produto sem fluxo de placas. Registro focado na instalação.
          </p>
        )}
        <p>
          <span className="ui-label">Fonte:</span>{' '}
          <span className="ui-value">{currentCase.sourceScanId ? `Scan ${currentCase.sourceScanId}` : 'Não vinculado'}</span>
        </p>
      </div>
    </Card>
  )
}
