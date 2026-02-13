import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb, loadDb, saveDb } from '../../data/db'
import { createCaseFromScan } from '../../data/scanRepo'
import { getCase, registerCaseDeliveryLot, registerCaseInstallation, setTrayState } from '../../data/caseRepo'
import { addLabItem, createAdvanceLabOrder, generateLabOrder, listLabItems, moveLabItem } from '../../data/labRepo'
import { clearQaSeed, seedQaData } from '../seed'

describe('System scenarios', () => {
  beforeEach(() => {
    clearQaSeed()
    seedQaData()
  })

  it('supports reset to empty and can reseed data', () => {
    resetDb('empty')
    const empty = loadDb()
    expect(empty.cases.length).toBe(0)
    expect(empty.labItems.length).toBe(0)

    seedQaData()
    const seeded = loadDb()
    expect(seeded.cases.length).toBeGreaterThan(0)
    expect(seeded.scans.length).toBeGreaterThan(0)
  })

  it('creates case from approved scan with treatment code (A/C pattern)', () => {
    const result = createCaseFromScan('qa_scan_1', {
      totalTraysUpper: 12,
      totalTraysLower: 10,
      changeEveryDays: 7,
      attachmentBondingTray: false,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const caseItem = getCase(result.caseId)
    expect(caseItem?.treatmentCode).toMatch(/^[AC]-\d{4}$/)
  })

  it('keeps LAB item in aguardando when qty is zero and auto-moves to em_producao when qty is set', () => {
    const created = addLabItem({
      caseId: 'qa_case_1',
      arch: 'ambos',
      plannedUpperQty: 0,
      plannedLowerQty: 0,
      patientName: 'Paciente 1',
      trayNumber: 4,
      plannedDate: '2026-02-01',
      dueDate: '2026-02-08',
      status: 'aguardando_iniciar',
      priority: 'Medio',
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.item.status).toBe('aguardando_iniciar')

    const updated = addLabItem({
      caseId: 'qa_case_1',
      arch: 'ambos',
      plannedUpperQty: 1,
      plannedLowerQty: 1,
      patientName: 'Paciente 1',
      trayNumber: 5,
      plannedDate: '2026-02-01',
      dueDate: '2026-02-08',
      status: 'aguardando_iniciar',
      priority: 'Medio',
    })
    expect(updated.ok).toBe(true)
    if (!updated.ok) return
    expect(updated.item.status).toBe('em_producao')
  })

  it('creates programmed replenishment for partial delivery and allows manual advance OS', () => {
    expect(setTrayState('qa_case_1', 1, 'em_producao').ok).toBe(true)
    expect(setTrayState('qa_case_1', 1, 'pronta').ok).toBe(true)
    const firstTray = setTrayState('qa_case_1', 1, 'entregue')
    expect(firstTray.ok).toBe(true)
    const secondTrayPending = setTrayState('qa_case_1', 2, 'pendente')
    expect(secondTrayPending.ok).toBe(true)
    const db = loadDb()
    db.cases = db.cases.map((item) =>
      item.id === 'qa_case_1'
        ? {
            ...item,
            trays: item.trays.map((tray) => (tray.trayNumber === 2 ? { ...tray, dueDate: new Date().toISOString().slice(0, 10) } : tray)),
          }
        : item,
    )
    saveDb(db)

    const before = listLabItems()
    const replenishment = before.find((item) => item.caseId === 'qa_case_1' && item.requestKind === 'reposicao_programada')
    expect(replenishment).toBeTruthy()
    if (!replenishment) return

    const advance = createAdvanceLabOrder(replenishment.id, { plannedUpperQty: 2, plannedLowerQty: 1 })
    expect(advance.ok).toBe(true)
    if (!advance.ok) return
    expect(advance.item.requestCode).toMatch(/^[AC]-\d{4}\/\d+$/)
    expect(advance.item.requestKind).toBe('producao')
    expect(advance.item.status).toBe('em_producao')
    const after = listLabItems()
    const sourceStillExists = after.some((item) => item.id === replenishment.id)
    expect(sourceStillExists).toBe(false)
  })

  it('blocks regression after delivery and auto-creates rework OS when moving to CQ', () => {
    expect(setTrayState('qa_case_1', 1, 'em_producao').ok).toBe(true)
    expect(setTrayState('qa_case_1', 1, 'pronta').ok).toBe(true)
    const delivered = setTrayState('qa_case_1', 1, 'entregue')
    expect(delivered.ok).toBe(true)
    const regressed = setTrayState('qa_case_1', 1, 'em_producao')
    expect(regressed.ok).toBe(false)

    const created = addLabItem({
      caseId: 'qa_case_1',
      arch: 'ambos',
      plannedUpperQty: 1,
      plannedLowerQty: 1,
      patientName: 'Paciente 1',
      trayNumber: 3,
      plannedDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'em_producao',
      priority: 'Urgente',
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const moved = moveLabItem(created.item.id, 'controle_qualidade')
    expect(moved.error).toBeUndefined()
    const items = listLabItems()
    const rework = items.find(
      (item) =>
        item.caseId === 'qa_case_1' &&
        item.id !== created.item.id &&
        item.trayNumber === 3 &&
        item.status === 'aguardando_iniciar' &&
        (item.notes ?? '').toLowerCase().includes('reconfeccao automatica'),
    )
    expect(rework).toBeTruthy()
    expect(rework?.status).toBe('aguardando_iniciar')
  })

  it('enforces sequence: dentist delivery requires LAB OS first', () => {
    expect(setTrayState('qa_case_1', 1, 'em_producao').ok).toBe(true)
    expect(setTrayState('qa_case_1', 1, 'pronta').ok).toBe(true)

    const db = loadDb()
    db.labItems = db.labItems.filter((item) => !(item.caseId === 'qa_case_1' && (item.requestKind ?? 'producao') === 'producao'))
    saveDb(db)

    const denied = registerCaseDeliveryLot('qa_case_1', {
      arch: 'superior',
      fromTray: 1,
      toTray: 1,
      deliveredToDoctorAt: new Date().toISOString().slice(0, 10),
    })
    expect(denied.ok).toBe(false)

    const os = generateLabOrder('qa_case_1')
    expect(os.ok).toBe(true)
    const allowed = registerCaseDeliveryLot('qa_case_1', {
      arch: 'superior',
      fromTray: 1,
      toTray: 1,
      deliveredToDoctorAt: new Date().toISOString().slice(0, 10),
    })
    expect(allowed.ok).toBe(true)
  })

  it('enforces sequence: patient delivery only after dentist delivery', () => {
    const denied = registerCaseInstallation('qa_case_1', {
      installedAt: new Date().toISOString().slice(0, 10),
      deliveredUpper: 1,
      deliveredLower: 0,
    })
    expect(denied.ok).toBe(false)

    expect(setTrayState('qa_case_1', 1, 'em_producao').ok).toBe(true)
    expect(setTrayState('qa_case_1', 1, 'pronta').ok).toBe(true)
    const lot = registerCaseDeliveryLot('qa_case_1', {
      arch: 'superior',
      fromTray: 1,
      toTray: 1,
      deliveredToDoctorAt: new Date().toISOString().slice(0, 10),
    })
    expect(lot.ok).toBe(true)

    const allowed = registerCaseInstallation('qa_case_1', {
      installedAt: new Date().toISOString().slice(0, 10),
      deliveredUpper: 1,
      deliveredLower: 0,
    })
    expect(allowed.ok).toBe(true)
  })
})
