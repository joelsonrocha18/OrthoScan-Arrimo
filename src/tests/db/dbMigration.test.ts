import { beforeEach, describe, expect, it } from 'vitest'
import { DB_KEY, loadDb } from '../../data/db'
import { createPatient, listPatients, softDeletePatient } from '../../repo/patientRepo'
import { clearQaSeed } from '../seed'

describe('DB migration and soft-delete', () => {
  beforeEach(() => {
    clearQaSeed()
    localStorage.clear()
  })

  it('normalizes legacy DB shape without losing case data', () => {
    const legacy = {
      casos: [
        {
          id: 'legacy_case_1',
          paciente: { nome: 'Paciente Legado' },
          data_scan: '2026-01-01',
          planejamento: { quantidade_total_placas: 8, troca_a_cada_dias: 7 },
          status: 'planejamento',
        },
      ],
      patients: [{ id: 'pat_legacy', name: 'Paciente Legado' }],
      scans: [],
      labItems: [],
    }

    localStorage.setItem(DB_KEY, JSON.stringify(legacy))
    const db = loadDb()
    const found = db.cases.find((c) => c.id === 'legacy_case_1')

    expect(found).toBeTruthy()
    expect(found?.patientName).toBe('Paciente Legado')
    expect(Array.isArray(db.patients)).toBe(true)
    expect(Array.isArray(db.scans)).toBe(true)
    expect(Array.isArray(db.users)).toBe(true)
  })

  it('keeps soft-deleted patients retrievable with includeDeleted', () => {
    const created = createPatient({
      name: 'Paciente Soft',
      birthDate: '1990-01-01',
    } as never)

    expect(created.ok).toBe(true)
    if (!created.ok) return

    const id = created.patient.id
    expect(softDeletePatient(id).ok).toBe(true)

    const defaultList = listPatients()
    const withDeleted = listPatients({ includeDeleted: true })

    expect(defaultList.find((p) => p.id === id)).toBeFalsy()
    expect(withDeleted.find((p) => p.id === id)).toBeTruthy()
  })
})
