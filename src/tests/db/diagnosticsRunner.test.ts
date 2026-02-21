import { describe, expect, it } from 'vitest'
import { runDiagnostics } from '../../diagnostics/runDiagnostics'
import { clearQaSeed, seedQaData } from '../seed'

describe('Diagnostics runner', () => {
  it('returns diagnostic report structure', async () => {
    clearQaSeed()
    seedQaData()
    const report = await runDiagnostics()

    expect(report.startedAt).toBeTruthy()
    expect(report.finishedAt).toBeTruthy()
    expect(report.durationMs).toBeGreaterThanOrEqual(0)
    expect(report.items.length).toBeGreaterThan(0)
  })
})
