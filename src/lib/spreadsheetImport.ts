import * as XLSX from 'xlsx'

type ParseResult<T> = {
  rows: T[]
  errors: string[]
}

export type ImportedPatientRow = {
  name: string
  scanDate?: string
}

export type ImportedDentistRow = {
  name: string
}

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function detectDelimiter(line: string) {
  const tabCount = (line.match(/\t/g) ?? []).length
  const semicolonCount = (line.match(/;/g) ?? []).length
  const commaCount = (line.match(/,/g) ?? []).length
  if (tabCount >= semicolonCount && tabCount >= commaCount && tabCount > 0) return '\t'
  if (semicolonCount >= commaCount && semicolonCount > 0) return ';'
  return ','
}

function splitCsvLine(line: string, delimiter: string) {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    const next = line[i + 1]
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === delimiter && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  values.push(current.trim())
  return values
}

function parseLines(raw: string) {
  return raw
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function rowsToDelimitedText(rows: string[][]) {
  return rows
    .map((cols) => cols.map((value) => String(value ?? '').trim()).join('\t'))
    .join('\n')
}

export async function readSpreadsheetFileText(file: File) {
  const fileName = file.name.toLowerCase()
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) return ''
    const sheet = workbook.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    }) as string[][]
    return rowsToDelimitedText(rows)
  }
  return file.text()
}

function parseDateToIso(rawDate?: string) {
  const value = (rawDate ?? '').trim()
  if (!value) return undefined
  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (br) {
    const day = br[1].padStart(2, '0')
    const month = br[2].padStart(2, '0')
    const year = br[3]
    return `${year}-${month}-${day}`
  }
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return value
  return undefined
}

export function parsePatientsSpreadsheet(raw: string): ParseResult<ImportedPatientRow> {
  const lines = parseLines(raw)
  if (lines.length === 0) return { rows: [], errors: ['Planilha vazia.'] }

  const delimiter = detectDelimiter(lines[0])
  const header = splitCsvLine(lines[0], delimiter).map(normalizeHeader)

  const nameIdx = header.findIndex((value) => ['nome do paciente', 'nome paciente', 'paciente', 'nome'].includes(value))
  const dateIdx = header.findIndex((value) =>
    ['data emissao', 'data emissão', 'data do escaneamento', 'data escaneamento', 'data cadastro', 'data'].includes(value),
  )

  if (nameIdx < 0) {
    return { rows: [], errors: ['Coluna de nome do paciente não encontrada.'] }
  }

  const rows: ImportedPatientRow[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i], delimiter)
    const name = (cols[nameIdx] ?? '').trim()
    if (!name) {
      errors.push(`Linha ${i + 1}: nome vazio.`)
      continue
    }
    const scanDateRaw = dateIdx >= 0 ? cols[dateIdx] : undefined
    const scanDate = parseDateToIso(scanDateRaw)
    if (scanDateRaw && !scanDate) {
      errors.push(`Linha ${i + 1}: data inválida (${scanDateRaw}).`)
    }
    rows.push({ name, scanDate })
  }

  return { rows, errors }
}

export function parseDentistsSpreadsheet(raw: string): ParseResult<ImportedDentistRow> {
  const lines = parseLines(raw)
  if (lines.length === 0) return { rows: [], errors: ['Planilha vazia.'] }

  const delimiter = detectDelimiter(lines[0])
  const header = splitCsvLine(lines[0], delimiter).map(normalizeHeader)
  const nameIdx = header.findIndex((value) => ['nome do dentista', 'nome dentista', 'dentista', 'nome'].includes(value))

  if (nameIdx < 0) {
    return { rows: [], errors: ['Coluna de nome do dentista não encontrada.'] }
  }

  const rows: ImportedDentistRow[] = []
  const errors: string[] = []
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i], delimiter)
    const name = (cols[nameIdx] ?? '').trim()
    if (!name) {
      errors.push(`Linha ${i + 1}: nome vazio.`)
      continue
    }
    rows.push({ name })
  }
  return { rows, errors }
}
