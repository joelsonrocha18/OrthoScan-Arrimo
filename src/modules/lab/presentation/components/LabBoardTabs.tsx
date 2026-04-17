import Button from '../../../../components/Button'

type LabBoardTabsProps = {
  boardTab: 'esteira' | 'reconfeccao' | 'banco_restante'
  onBoardTabChange: (value: 'esteira' | 'reconfeccao' | 'banco_restante') => void
}

export function LabBoardTabs({ boardTab, onBoardTabChange }: LabBoardTabsProps) {
  return (
    <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      <Button variant={boardTab === 'esteira' ? 'primary' : 'secondary'} onClick={() => onBoardTabChange('esteira')}>
        Esteira
      </Button>
      <Button variant={boardTab === 'reconfeccao' ? 'primary' : 'secondary'} onClick={() => onBoardTabChange('reconfeccao')}>
        Placas com defeito (reconfecção)
      </Button>
      <Button variant={boardTab === 'banco_restante' ? 'primary' : 'secondary'} onClick={() => onBoardTabChange('banco_restante')}>
        Banco de reposicoes
      </Button>
    </div>
  )
}
