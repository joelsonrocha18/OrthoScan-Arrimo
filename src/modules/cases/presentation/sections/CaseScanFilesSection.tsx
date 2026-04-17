import Card from '../../../../components/Card'
import type { Case } from '../../../../types/Case'
import { CaseScanFileCard } from '../components/CaseScanFileCard'
import { slotLabel, type GroupedCaseScanFiles } from '../lib/caseDetailPresentation'

type CaseScanFilesSectionProps = {
  groupedScanFiles: GroupedCaseScanFiles
  hasUpperArch: boolean
  hasLowerArch: boolean
  canWriteLocalOnly: boolean
  onOpenScanFile: (item: NonNullable<Case['scanFiles']>[number]) => void
  onMarkCaseFileError: (fileId: string) => void
  onClearCaseFileError: (fileId: string) => void
}

function FileGroup({
  title,
  files,
  canWriteLocalOnly,
  onOpenScanFile,
  onMarkCaseFileError,
  onClearCaseFileError,
}: {
  title: string
  files: NonNullable<Case['scanFiles']>
  canWriteLocalOnly: boolean
  onOpenScanFile: (item: NonNullable<Case['scanFiles']>[number]) => void
  onMarkCaseFileError: (fileId: string) => void
  onClearCaseFileError: (fileId: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
      <div className="mt-2 space-y-2">
        {files.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum arquivo.</p>
        ) : (
          files.map((item) => (
            <CaseScanFileCard
              key={item.id}
              item={item}
              canWriteLocalOnly={canWriteLocalOnly}
              onOpen={onOpenScanFile}
              onMarkError={onMarkCaseFileError}
              onClearError={onClearCaseFileError}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function CaseScanFilesSection({
  groupedScanFiles,
  hasUpperArch,
  hasLowerArch,
  canWriteLocalOnly,
  onOpenScanFile,
  onMarkCaseFileError,
  onClearCaseFileError,
}: CaseScanFilesSectionProps) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Arquivos do exame</h2>
      <div className="mt-3 space-y-4">
        {hasUpperArch ? (
          <FileGroup
            title="Escaneamento 3D - Superior"
            files={groupedScanFiles.scan3d.superior}
            canWriteLocalOnly={canWriteLocalOnly}
            onOpenScanFile={onOpenScanFile}
            onMarkCaseFileError={onMarkCaseFileError}
            onClearCaseFileError={onClearCaseFileError}
          />
        ) : null}
        {hasLowerArch ? (
          <FileGroup
            title="Escaneamento 3D - Inferior"
            files={groupedScanFiles.scan3d.inferior}
            canWriteLocalOnly={canWriteLocalOnly}
            onOpenScanFile={onOpenScanFile}
            onMarkCaseFileError={onMarkCaseFileError}
            onClearCaseFileError={onClearCaseFileError}
          />
        ) : null}
        <FileGroup
          title="Escaneamento 3D - Mordida"
          files={groupedScanFiles.scan3d.mordida}
          canWriteLocalOnly={canWriteLocalOnly}
          onOpenScanFile={onOpenScanFile}
          onMarkCaseFileError={onMarkCaseFileError}
          onClearCaseFileError={onClearCaseFileError}
        />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Fotos intraorais</p>
          <div className="mt-2 space-y-2">
            {groupedScanFiles.fotosIntra.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum arquivo.</p>
            ) : (
              groupedScanFiles.fotosIntra.map((item) => (
                <CaseScanFileCard
                  key={item.id}
                  item={item}
                  labelOverride={slotLabel(item.slotId)}
                  canWriteLocalOnly={canWriteLocalOnly}
                  onOpen={onOpenScanFile}
                  onMarkError={onMarkCaseFileError}
                  onClearError={onClearCaseFileError}
                />
              ))
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Fotos extraorais</p>
          <div className="mt-2 space-y-2">
            {groupedScanFiles.fotosExtra.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum arquivo.</p>
            ) : (
              groupedScanFiles.fotosExtra.map((item) => (
                <CaseScanFileCard
                  key={item.id}
                  item={item}
                  labelOverride={slotLabel(item.slotId)}
                  canWriteLocalOnly={canWriteLocalOnly}
                  onOpen={onOpenScanFile}
                  onMarkError={onMarkCaseFileError}
                  onClearError={onClearCaseFileError}
                />
              ))
            )}
          </div>
        </div>

        <FileGroup
          title="Radiografias - Panoramica"
          files={groupedScanFiles.radiografias.panoramica}
          canWriteLocalOnly={canWriteLocalOnly}
          onOpenScanFile={onOpenScanFile}
          onMarkCaseFileError={onMarkCaseFileError}
          onClearCaseFileError={onClearCaseFileError}
        />
        <FileGroup
          title="Radiografias - Teleradiografia"
          files={groupedScanFiles.radiografias.teleradiografia}
          canWriteLocalOnly={canWriteLocalOnly}
          onOpenScanFile={onOpenScanFile}
          onMarkCaseFileError={onMarkCaseFileError}
          onClearCaseFileError={onClearCaseFileError}
        />
        <FileGroup
          title="Radiografias - Tomografia"
          files={groupedScanFiles.radiografias.tomografia}
          canWriteLocalOnly={canWriteLocalOnly}
          onOpenScanFile={onOpenScanFile}
          onMarkCaseFileError={onMarkCaseFileError}
          onClearCaseFileError={onClearCaseFileError}
        />
        <FileGroup
          title="Planejamento"
          files={groupedScanFiles.planejamento}
          canWriteLocalOnly={canWriteLocalOnly}
          onOpenScanFile={onOpenScanFile}
          onMarkCaseFileError={onMarkCaseFileError}
          onClearCaseFileError={onClearCaseFileError}
        />
      </div>
    </Card>
  )
}
