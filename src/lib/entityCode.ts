import { buildEntityCode } from '../shared/utils/id'

export function patientCode(id: string, shortId?: string) {
  return buildEntityCode('P', id, shortId)
}

export function dentistCode(id: string, shortId?: string) {
  return buildEntityCode('D', id, shortId)
}

export function clinicCode(id: string, shortId?: string) {
  return buildEntityCode('C', id, shortId)
}
