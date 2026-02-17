# GitHub Branch Protection (main)

Prerequisite:

- `gh` installed
- authenticated with `gh auth login`
- write/admin permission on the repository

Repository:

- `joelsonrocha18/OrthoScan-Arrimo`

## Apply protection

Run:

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

Notes:

- The required status check name must match the job name from `.github/workflows/ci.yml` (`quality`).
- If your default branch is not `main`, replace `main` in the endpoint.

