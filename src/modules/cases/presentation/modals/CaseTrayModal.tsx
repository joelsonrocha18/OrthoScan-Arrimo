import Button from '../../../../components/Button'
import Card from '../../../../components/Card'
import type { CaseTray, TrayState } from '../../../../types/Case'

type CaseTrayModalProps = {
  selectedTray: CaseTray | null
  open: boolean
  canManageTray: boolean
  trayState: TrayState
  reworkArch: 'superior' | 'inferior' | 'ambos'
  trayNote: string
  hasLinkedLabItem: boolean
  onClose: () => void
  onTrayStateChange: (value: TrayState) => void
  onReworkArchChange: (value: 'superior' | 'inferior' | 'ambos') => void
  onTrayNoteChange: (value: string) => void
  onSave: () => void
}

export function CaseTrayModal({
  selectedTray,
  open,
  canManageTray,
  trayState,
  reworkArch,
  trayNote,
  hasLinkedLabItem,
  onClose,
  onTrayStateChange,
  onReworkArchChange,
  onTrayNoteChange,
  onSave,
}: CaseTrayModalProps) {
  if (!open || !selectedTray) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Placa #{selectedTray.trayNumber}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
            <select
              value={trayState}
              onChange={(event) => onTrayStateChange(event.target.value as TrayState)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="pendente">Pendente</option>
              <option value="em_producao">Em produção</option>
              <option value="pronta">Pronta</option>
              <option value="entregue">Entregue</option>
              <option value="rework">Reconfecção</option>
            </select>
          </div>

          {trayState === 'rework' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Arcada da reconfecção</label>
              <select
                value={reworkArch}
                onChange={(event) => onReworkArchChange(event.target.value as 'superior' | 'inferior' | 'ambos')}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="inferior">Inferior</option>
                <option value="superior">Superior</option>
                <option value="ambos">Ambas</option>
              </select>
            </div>
          ) : null}

          {hasLinkedLabItem ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Esta placa está vinculada ao laboratório.</p>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nota</label>
            <textarea
              rows={4}
              value={trayNote}
              onChange={(event) => onTrayNoteChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={!canManageTray}>
            Salvar
          </Button>
        </div>
      </Card>
    </div>
  )
}
