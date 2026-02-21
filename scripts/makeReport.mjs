import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const reportsDir = path.join(root, 'reports')
const diagnosticsPath = path.join(reportsDir, 'diagnostics.json')
const playwrightPath = path.join(reportsDir, 'playwright-results.json')
const qaReportPath = path.join(reportsDir, 'qa-report.md')

function readJson(file) {
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function fmtDuration(ms = 0) {
  if (!Number.isFinite(ms)) return 'n/a'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

const diagnostics = readJson(diagnosticsPath)
const playwright = readJson(playwrightPath)

const diagSummary = diagnostics?.summary ?? { pass: 0, warn: 0, fail: 1 }

const pwStats = playwright?.stats
  ? {
      expected: playwright.stats.expected ?? 0,
      unexpected: playwright.stats.unexpected ?? 0,
      flaky: playwright.stats.flaky ?? 0,
      skipped: playwright.stats.skipped ?? 0,
      duration: playwright.stats.duration ?? 0,
    }
  : null

const buildExists = fs.existsSync(path.join(root, 'dist'))

const lines = []
lines.push('# QA Report')
lines.push('')
lines.push(`Generated at: ${new Date().toISOString()}`)
lines.push('')
lines.push('## Summary')
lines.push('')
lines.push(`- Diagnostics: PASS ${diagSummary.pass} | WARN ${diagSummary.warn} | FAIL ${diagSummary.fail}`)
if (pwStats) {
  lines.push(`- E2E (Playwright): expected ${pwStats.expected} | unexpected ${pwStats.unexpected} | flaky ${pwStats.flaky} | skipped ${pwStats.skipped}`)
} else {
  lines.push('- E2E (Playwright): WARN - resultado JSON nao encontrado em reports/playwright-results.json')
}
lines.push(`- Build artifacts (dist): ${buildExists ? 'PASS' : 'WARN'}`)
lines.push('')
lines.push('## Diagnostics Items')
lines.push('')

if (diagnostics?.items?.length) {
  for (const item of diagnostics.items) {
    lines.push(`- [${item.status.toUpperCase()}] ${item.title}: ${item.message}`)
    if (item.details) lines.push(`  - details: ${String(item.details).replace(/\n/g, ' ')}`)
  }
} else {
  lines.push('- [WARN] Sem dados de diagnostico para listar.')
}

lines.push('')
lines.push('## Evidence Paths')
lines.push('')
lines.push('- diagnostics JSON: reports/diagnostics.json')
lines.push('- playwright JSON: reports/playwright-results.json')
lines.push('- playwright html: reports/playwright-html/index.html')
lines.push('- qa report: reports/qa-report.md')
lines.push('')
lines.push('## Ready For Client Criteria')
lines.push('')
lines.push(`- Build OK: ${buildExists ? 'PASS' : 'WARN'}`)
lines.push(`- Diagnostics FAIL = 0: ${diagSummary.fail === 0 ? 'PASS' : 'FAIL'}`)
lines.push(`- E2E unexpected = 0: ${pwStats ? (pwStats.unexpected === 0 ? 'PASS' : 'FAIL') : 'WARN'}`)
lines.push(`- Warns only non-critical: ${diagSummary.fail === 0 ? 'PASS (manual review required)' : 'FAIL'}`)
lines.push('')
lines.push('## Duration')
lines.push('')
lines.push(`- Diagnostics duration: ${fmtDuration(diagnostics?.durationMs ?? 0)}`)
lines.push(`- E2E duration: ${fmtDuration(pwStats?.duration ?? 0)}`)

fs.mkdirSync(reportsDir, { recursive: true })
fs.writeFileSync(qaReportPath, `${lines.join('\n')}\n`)

console.log(`QA report generated: ${path.relative(root, qaReportPath)}`)
