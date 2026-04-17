# Proteção de Branch no GitHub (main)

Pré-requisitos:

- `gh` instalado
- autenticação com `gh auth login`
- permissão de escrita/admin no repositório

Repositório:

- `joelsonrocha18/OrthoScan-Arrimo`

## Aplicar proteção

Execute:

```bash
gh api -X PUT repos/joelsonrocha18/OrthoScan-Arrimo/branches/main/protection ^
  -H "Accept: application/vnd.github+json" ^
  -f required_status_checks.strict=true ^
  -f required_status_checks.contexts[]="quality" ^
  -f enforce_admins=true ^
  -f required_pull_request_reviews.dismiss_stale_reviews=true ^
  -f required_pull_request_reviews.required_approving_review_count=1 ^
  -f restrictions=
```

Observações:

- O nome do status check obrigatório deve corresponder ao nome do job em `.github/workflows/ci.yml` (`quality`).
- Se a branch padrão não for `main`, substitua `main` no endpoint.

