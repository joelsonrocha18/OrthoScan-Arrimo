# Production Checklist

## Required env vars

- `VITE_DATA_MODE=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_RELEASE` (e.g. `2026-02-16.1`)
- `VITE_MONITORING_WEBHOOK_URL` (optional frontend error webhook)

For Supabase Edge Functions:

- `SUPABASE_URL`
- `SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `SITE_URL`
- `ALLOWED_ORIGIN` (frontend origin, e.g. `https://app.example.com`)

## Security headers

- Vercel headers are enforced in `vercel.json`.
- Nginx headers are enforced in `nginx.conf` and `nginx.edge.template.conf`.

## CI gate

- Workflow: `.github/workflows/ci.yml`
- Required checks:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test -- --run`
  - `npm run build`

## Storage and files

- Bucket: `orthoscan` (private)
- All uploads should go through `src/repo/storageRepo.ts`.
- Use signed URLs for read access.

## Post-deploy smoke checks

1. Login and role-based access.
2. Upload PDF/JPEG/STL and reopen files.
3. Password reset and onboarding link flow.
4. Verify `/health` endpoint and uptime monitor.

