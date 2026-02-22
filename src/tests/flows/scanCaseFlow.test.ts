import { beforeEach, describe, expect, it } from 'vitest'
import { createCaseFromScan, getScan, markScanAttachmentError, updateScan } from '../../data/scanRepo'
import { getCase, markCaseScanFileError } from '../../data/caseRepo'
import { clearQaSeed, seedQaData } from '../seed'

describe('Scan to Case flow', () => {
  beforeEach(() => {
    clearQaSeed()
    seedQaData()
  })

  it('creates case from approved scan and copies clinical + files metadata', () => {
    const result = createCaseFromScan('qa_scan_1', {
      totalTraysUpper: 20,
      totalTraysLower: 18,
      changeEveryDays: 7,
      attachmentBondingTray: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const created = getCase(result.caseId)
    expect(created).toBeTruthy()
    expect(created?.sourceScanId).toBe('qa_scan_1')
    expect(created?.complaint).toBe('Queixa A')
    expect(created?.dentistGuidance).toBe('Orientacao A')
    expect((created?.scanFiles ?? []).length).toBeGreaterThanOrEqual(9)

    const copied = (created?.scanFiles ?? [])[0]
    expect(copied).toHaveProperty('kind')
    expect(copied).toHaveProperty('status')
    expect(copied).toHaveProperty('attachedAt')

    const source = getScan('qa_scan_1')
    expect(source?.status).toBe('convertido')
    expect(source?.linkedCaseId).toBe(result.caseId)
  })

  it('marking file error does not remove the original attachment', () => {
    const result = createCaseFromScan('qa_scan_1', {
      totalTraysUpper: 10,
      totalTraysLower: 10,
      changeEveryDays: 7,
      attachmentBondingTray: false,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const c = getCase(result.caseId)
    expect(c).toBeTruthy()
    if (!c || !c.scanFiles || c.scanFiles.length === 0) return

    const firstFileId = c.scanFiles[0].id
    const beforeCount = c.scanFiles.length
    const mark = markCaseScanFileError(c.id, firstFileId, 'Arquivo corrompido')
    expect(mark.ok).toBe(true)

    const after = getCase(c.id)
    expect(after?.scanFiles?.length).toBe(beforeCount)
    expect(after?.scanFiles?.find((f) => f.id === firstFileId)?.status).toBe('erro')

    const scanMark = markScanAttachmentError('qa_scan_1', 'qa_scan_att_1', 'Invalido')
    expect(scanMark).toBeTruthy()
    const afterScan = getScan('qa_scan_1')
    expect(afterScan?.attachments.find((a) => a.id === 'qa_scan_att_1')).toBeTruthy()
    expect(afterScan?.attachments.find((a) => a.id === 'qa_scan_att_1')?.status).toBe('erro')
  })

  it('blocks case creation when required STL/photos are missing', () => {
    const scan = getScan('qa_scan_1')
    expect(scan).toBeTruthy()
    if (!scan) return
    updateScan('qa_scan_1', { attachments: scan.attachments.filter((item) => item.kind !== 'foto_extra') })
    const result = createCaseFromScan('qa_scan_1', {
      totalTraysUpper: 10,
      totalTraysLower: 10,
      changeEveryDays: 7,
      attachmentBondingTray: false,
    })
    expect(result.ok).toBe(false)
  })
})
