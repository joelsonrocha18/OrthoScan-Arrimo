# Production Checklist

## Required env vars

- `VITE_DATA_MODE=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STORAGE_PROVIDER` (`supabase` ou `microsoft_drive`)
- `VITE_RELEASE` (e.g. `2026-02-16.1`)
- `VITE_MONITORING_WEBHOOK_URL` (optional frontend error webhook)

For Supabase Edge Functions:

- `SUPABASE_URL`
- `SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `SITE_URL`
- `ALLOWED_ORIGIN` (frontend origin, e.g. `https://app.example.com`)

When `VITE_STORAGE_PROVIDER=microsoft_drive`, configure also:

- `MS_AUTH_MODE` (`app` or `delegated`)
- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `MS_DRIVE_ID` (required in `app` mode, optional in `delegated`)
- `MS_DRIVE_BASE_PATH` (optional, default: `orthoscan`)
- `MS_DRIVE_LINK_SCOPE` (optional, `anonymous` or `organization`)
- `MS_AUTHORITY` (only `delegated`, usually `consumers` for personal accounts)
- `MS_REFRESH_TOKEN` (only `delegated`)

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

