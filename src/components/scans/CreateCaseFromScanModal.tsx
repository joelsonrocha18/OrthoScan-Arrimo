import { useEffect, useState } from 'react'
import type { Scan } from '../../types/Scan'
import Button from '../Button'
import Card from '../Card'
import Input from '../Input'

type CreateCaseFromScanModalProps = {
  open: boolean
  scan: Scan | null
  onClose: () => void
  onConfirm: (payload: {
    totalTraysUpper?: number
    totalTraysLower?: number
    changeEveryDays: number
    attachmentBondingTray: boolean
    planningNote?: string
  }) => void
}

export default function CreateCaseFromScanModal({ open, scan, onClose, onConfirm }: CreateCaseFromScanModalProps) {
  const [upper, setUpper] = useState('24')
  const [lower, setLower] = useState('20')
  const [changeEveryDays, setChangeEveryDays] = useState('7')
  const [attachmentBondingTray, setAttachmentBondingTray] = useState(false)
  const [planningNote, setPlanningNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !scan) return
    if (scan.arch === 'superior') {
      setUpper('24')
      setLower('')
    } else if (scan.arch === 'inferior') {
      setUpper('')
      setLower('20')
    } else {
      setUpper('24')
      setLower('20')
    }
    setChangeEveryDays('7')
    setAttachmentBondingTray(false)
    setPlanningNote('')
    setError('')
  }, [open, scan])

  if (!open || !scan) return null

  const submit = () => {
    const upperNum = Number(upper)
    const lowerNum = Number(lower)
    const days = Number(changeEveryDays)

    const upperValue = Number.isFinite(upperNum) && upperNum > 0 ? upperNum : undefined
    const lowerValue = Number.isFinite(lowerNum) && lowerNum > 0 ? lowerNum : undefined

    if (!Number.isFinite(days) || days <= 0) {
      setError('Troca em dias deve ser maior que zero.')
      return
    }

    if (scan.arch === 'superior' && !upperValue) {
      setError('Informe total de placas superior.')
      return
    }
    if (scan.arch === 'inferior' && !lowerValue) {
      setError('Informe total de placas inferior.')
      return
    }
    if (scan.arch === 'ambos' && !upperValue && !lowerValue) {
      setError('Informe total de placas superior e/ou inferior.')
      return
    }

    onConfirm({
      totalTraysUpper: upperValue,
      totalTraysLower: lowerValue,
      changeEveryDays: days,
      attachmentBondingTray,
      planningNote: planningNote.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <Card className="w-full max-w-lg">
        <h3 className="text-xl font-semibold text-slate-900">Criar Caso a partir do Scan</h3>
        <p className="mt-1 text-sm text-slate-500">
          {scan.arch === 'ambos'
            ? 'Planejamento inicial de placas para superior/inferior.'
            : `Planejamento inicial de placas para arcada ${scan.arch}.`}
        </p>
        {scan.arch === 'ambos' ? (
          <p className="mt-1 text-xs text-slate-500">Superior e inferior podem ter quantidades diferentes.</p>
        ) : null}

        <div className="mt-4 grid gap-4">
          {scan.arch === 'ambos' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Total de placas Superior</label>
                <Input
                  type="number"
                  min={0}
                  value={upper}
                  onChange={(event) => setUpper(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Total de placas Inferior</label>
                <Input
                  type="number"
                  min={0}
                  value={lower}
                  onChange={(event) => setLower(event.target.value)}
                />
              </div>
            </div>
          ) : scan.arch === 'superior' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Total de placas Superior</label>
              <Input
                type="number"
                min={0}
                value={upper}
                onChange={(event) => setUpper(event.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Total de placas Inferior</label>
              <Input
                type="number"
                min={0}
                value={lower}
                onChange={(event) => setLower(event.target.value)}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Troca a cada (dias)</label>
            <Input type="number" min={1} value={changeEveryDays} onChange={(event) => setChangeEveryDays(event.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={attachmentBondingTray}
              onChange={(event) => setAttachmentBondingTray(event.target.checked)}
            />
            Incluir placa para colar attachments antes do inicio
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Observacao do planejamento (opcional)</label>
            <textarea
              rows={3}
              value={planningNote}
              onChange={(event) => setPlanningNote(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit}>Criar Caso</Button>
        </div>
      </Card>
    </div>
  )
}
