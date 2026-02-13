# QA Report

Generated at: 2026-02-10T23:51:18.001Z

## Summary

- Diagnostics: PASS 9 | WARN 0 | FAIL 0
- E2E (Playwright): expected 4 | unexpected 0 | flaky 0 | skipped 0
- Build artifacts (dist): PASS

## Diagnostics Items

- [PASS] Node/NPM: Node v20.20.0 | NPM 10.8.2
- [PASS] DB key: Chave do DB local encontrada em db.ts.
- [PASS] Rotas essenciais: Todas as rotas essenciais estao declaradas (8).
- [PASS] Roles: Todas as roles obrigatorias foram encontradas.
- [PASS] Permissoes por role: Mapeamento de permissoes encontrado para todas as roles.
- [PASS] Escopo: Funcoes de escopo principais encontradas.
- [PASS] Upload + Camera: Componente contem accept/capture e fallback iOS.
- [PASS] Smoke lint: Lint executado com sucesso.
- [PASS] Smoke typecheck: Typecheck executado com sucesso.

## Evidence Paths

- diagnostics JSON: reports/diagnostics.json
- playwright JSON: reports/playwright-results.json
- playwright html: reports/playwright-html/index.html
- qa report: reports/qa-report.md

## Ready For Client Criteria

- Build OK: PASS
- Diagnostics FAIL = 0: PASS
- E2E unexpected = 0: PASS
- Warns only non-critical: PASS (manual review required)

## Duration

- Diagnostics duration: 78.59 s
- E2E duration: 210.04 s
