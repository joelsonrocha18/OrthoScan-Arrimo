# Checklist de produção

## Variáveis de ambiente obrigatórias

- `VITE_DATA_MODE=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STORAGE_PROVIDER` (`supabase` ou `microsoft_drive`)
- `VITE_RELEASE` (ex.: `2026-02-16.1`)
- `VITE_MONITORING_WEBHOOK_URL` (webhook opcional de erro do frontend)

Para Supabase Edge Functions:

- `SUPABASE_URL`
- `SERVICE_ROLE_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY`)
- `SITE_URL`
- `ALLOWED_ORIGIN` (origem do frontend, ex.: `https://app.example.com`)

Quando `VITE_STORAGE_PROVIDER=microsoft_drive`, configure também:

- `MS_AUTH_MODE` (`app` ou `delegated`)
- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `MS_DRIVE_ID` (obrigatório no modo `app`, opcional em `delegated`)
- `MS_DRIVE_BASE_PATH` (opcional, padrão: `orthoscan`)
- `MS_DRIVE_LINK_SCOPE` (opcional, `anonymous` ou `organization`)
- `MS_AUTHORITY` (somente `delegated`, geralmente `consumers` para contas pessoais)
- `MS_REFRESH_TOKEN` (somente `delegated`)

## Headers de segurança

- Os headers da Vercel são aplicados em `vercel.json`.
- Os headers do Nginx são aplicados em `nginx.conf` e `nginx.edge.template.conf`.

## Porta de CI

- Workflow: `.github/workflows/ci.yml`
- Verificações obrigatórias:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test -- --run`
  - `npm run build`

## Storage e arquivos

- Bucket: `orthoscan` (privado)
- Todos os envios devem passar por `src/repo/storageRepo.ts`.
- Use URLs assinadas para acesso de leitura.

## Smoke checks pós-deploy

1. Login e acesso baseado em perfis.
2. Enviar PDF/JPEG/STL e reabrir arquivos.
3. Redefinição de senha e fluxo de link de onboarding.
4. Verificar endpoint `/health` e monitor de uptime.

