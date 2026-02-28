type ExcelJSModule = typeof import('exceljs')

let excelJsModule: ExcelJSModule | null = null
let excelJsLoadPromise: Promise<ExcelJSModule> | null = null

function normalizeExcelJSImport(mod: ExcelJSModule) {
  if (mod && typeof mod === 'object' && 'Workbook' in mod) return mod
  const fallback = (mod as unknown as { default?: ExcelJSModule }).default
  if (fallback && typeof fallback === 'object' && 'Workbook' in fallback) return fallback
  return mod
}

export async function loadExcelJS() {
  if (excelJsModule) return excelJsModule
  if (!excelJsLoadPromise) {
    excelJsLoadPromise = import('exceljs')
      .then((mod) => {
        excelJsModule = normalizeExcelJSImport(mod)
        return excelJsModule
      })
      .catch((error) => {
        excelJsLoadPromise = null
        throw error
      })
  }
  return excelJsLoadPromise
}
