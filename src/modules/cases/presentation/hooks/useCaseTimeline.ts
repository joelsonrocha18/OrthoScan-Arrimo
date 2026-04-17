import { useCallback, useEffect, useState } from 'react'
import type { Case } from '../../../../types/Case'
import type { ListCaseTimelineUseCase } from '../../application'

export function useCaseTimeline(
  caseId: string | undefined,
  useCase: ListCaseTimelineUseCase,
  refreshSignature: string,
) {
  const [entries, setEntries] = useState<Case['timelineEntries']>([])

  const refreshTimeline = useCallback(async () => {
    if (!caseId) {
      setEntries([])
      return
    }
    const result = await Promise.resolve(useCase.execute({ caseId }))
    if (!result.ok) {
      setEntries([])
      return
    }
    setEntries(result.data ?? [])
  }, [caseId, useCase])

  useEffect(() => {
    void refreshTimeline()
  }, [refreshSignature, refreshTimeline])

  return {
    timelineEntries: entries ?? [],
    refreshTimeline,
  }
}

