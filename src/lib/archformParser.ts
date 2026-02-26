import initSqlJs from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

export type PlanningTrayCounts = {
  upper?: number
  lower?: number
  source: 'keyframes' | 'goalset'
}

let sqlJsPromise: Promise<Awaited<ReturnType<typeof initSqlJs>>> | null = null

function getSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({
      locateFile: () => sqlWasmUrl,
    })
  }
  return sqlJsPromise
}

function isPositiveCount(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1000
}

function readCountInt32(blob: Uint8Array | null | undefined) {
  if (!blob || blob.length < 4) return undefined
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength)
  const value = view.getInt32(0, true)
  return isPositiveCount(value) ? value : undefined
}

function readIntList(blob: Uint8Array | null | undefined) {
  if (!blob || blob.length < 8) return []
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength)
  const count = view.getInt32(0, true)
  if (!isPositiveCount(count)) return []
  const ids: number[] = []
  for (let i = 0; i < count; i += 1) {
    const offset = 4 + i * 4
    if (offset + 4 > view.byteLength) break
    ids.push(view.getInt32(offset, true))
  }
  return ids
}

function toRows(execResult: Array<{ values: unknown[][] }>) {
  return execResult?.[0]?.values ?? []
}

async function extractFromArchformBuffer(buffer: ArrayBuffer): Promise<PlanningTrayCounts | null> {
  const SQL = await getSqlJs()
  const db = new SQL.Database(new Uint8Array(buffer))
  try {
    const patientRows = toRows(
      db.exec('select UpperToothSetId, LowerToothSetId from Patient limit 1'),
    )
    const [upperSetIdRaw, lowerSetIdRaw] = patientRows[0] ?? []
    const upperSetId = typeof upperSetIdRaw === 'number' ? upperSetIdRaw : undefined
    const lowerSetId = typeof lowerSetIdRaw === 'number' ? lowerSetIdRaw : undefined

    const setRows = toRows(db.exec('select Id, ToothIDs from ToothInfoSet'))
    const toothIdsBySet = new Map<number, number[]>()
    for (const row of setRows) {
      const [setIdRaw, toothIdsRaw] = row
      if (typeof setIdRaw !== 'number') continue
      toothIdsBySet.set(setIdRaw, readIntList(toothIdsRaw as Uint8Array))
    }

    const toothRows = toRows(db.exec('select Id, toothISO, KeyFrames from ToothInfo'))
    const frameCountByToothId = new Map<number, number>()
    const upperByIso: number[] = []
    const lowerByIso: number[] = []

    for (const row of toothRows) {
      const [toothIdRaw, toothIsoRaw, keyFramesRaw] = row
      const count = readCountInt32(keyFramesRaw as Uint8Array)
      if (!isPositiveCount(count)) continue
      if (typeof toothIdRaw === 'number') frameCountByToothId.set(toothIdRaw, count)
      if (typeof toothIsoRaw === 'number') {
        if (toothIsoRaw >= 11 && toothIsoRaw <= 28) upperByIso.push(count)
        if (toothIsoRaw >= 31 && toothIsoRaw <= 48) lowerByIso.push(count)
      }
    }

    const upperFromSet = (upperSetId ? toothIdsBySet.get(upperSetId) : undefined)
      ?.map((id) => frameCountByToothId.get(id))
      .filter((value): value is number => typeof value === 'number')
    const lowerFromSet = (lowerSetId ? toothIdsBySet.get(lowerSetId) : undefined)
      ?.map((id) => frameCountByToothId.get(id))
      .filter((value): value is number => typeof value === 'number')

    const upper = Math.max(
      ...(upperFromSet && upperFromSet.length > 0 ? upperFromSet : upperByIso),
      0,
    )
    const lower = Math.max(
      ...(lowerFromSet && lowerFromSet.length > 0 ? lowerFromSet : lowerByIso),
      0,
    )
    if (upper > 0 || lower > 0) {
      return {
        upper: upper > 0 ? upper : undefined,
        lower: lower > 0 ? lower : undefined,
        source: 'keyframes',
      }
    }

    const goalRows = toRows(db.exec('select Count from GoalSet limit 1'))
    const goalCount = typeof goalRows[0]?.[0] === 'number' ? (goalRows[0][0] as number) : undefined
    if (isPositiveCount(goalCount)) {
      return { upper: goalCount, lower: goalCount, source: 'goalset' }
    }
    return null
  } finally {
    db.close()
  }
}

export async function parsePlanningTrayCounts(file: File): Promise<PlanningTrayCounts | null> {
  const isPlanningLike =
    file.name.toLowerCase().endsWith('.archform') || file.type.includes('sqlite') || file.type === ''
  if (!isPlanningLike) return null
  try {
    const buffer = await file.arrayBuffer()
    return await extractFromArchformBuffer(buffer)
  } catch {
    return null
  }
}
