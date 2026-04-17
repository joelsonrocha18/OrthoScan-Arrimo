import Button from '../../../../components/Button'

type LabPageHeaderSectionProps = {
  canWrite: boolean
  exportingPatientReport: boolean
  preferredBrotherPrinter: string
  onConfigurePrinter: () => void
  onExportPatientReport: () => void
  onOpenDelivery: () => void
}

export function LabPageHeaderSection({
  canWrite,
  exportingPatientReport,
  preferredBrotherPrinter,
  onConfigurePrinter,
  onExportPatientReport,
  onOpenDelivery,
}: LabPageHeaderSectionProps) {
  return (
    <>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Laboratório</h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button className="w-full sm:w-auto" variant="secondary" onClick={onExportPatientReport} disabled={exportingPatientReport}>
            {exportingPatientReport ? 'Preparando relatório...' : 'Planilha pacientes'}
          </Button>
          {canWrite ? (
            <Button className="w-full sm:w-auto" variant="secondary" onClick={onConfigurePrinter}>
              Impressora Brother
            </Button>
          ) : null}
          {canWrite ? (
            <Button className="w-full sm:w-auto" variant="secondary" onClick={onOpenDelivery}>
              Registrar entrega ao profissional
            </Button>
          ) : null}
        </div>
      </section>

      {canWrite ? (
        <section className="mt-2">
          <p className="text-xs text-slate-500">
            Impressora vinculada: {preferredBrotherPrinter.trim() || 'Não definida'}
          </p>
        </section>
      ) : null}
    </>
  )
}
