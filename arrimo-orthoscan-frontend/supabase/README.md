# Supabase Setup (OrthoScan)

## 1) Criar projeto no Supabase
- Crie um novo projeto no dashboard.
- Anote `Project URL` e `Anon public key`.

## 2) Auth (Email/Senha)
- Habilite Email Provider.
- Configure URLs de redirect:
  - `SITE_URL` (ex.: https://seu-dominio.com)
  - Redirects: `https://seu-dominio.com/**`

## 3) Aplicar migrations
Opção A (SQL Editor):
- Copie e cole `supabase/migrations/0001_init.sql`
- Depois aplique `supabase/migrations/0003_storage.sql`

Opção B (CLI Supabase):
- `supabase db push`

## 4) Edge Function (convite)
Configure variáveis da function:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL`
- `INVITE_REDIRECT_URL` (ex.: https://seu-dominio.com/login)

Deploy:
- `supabase functions deploy invite-user`

## 4.1) Edge Function (import/export)
Configure variáveis:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Deploy:
- `supabase functions deploy import-db`
- `supabase functions deploy export-db`

## 4.2) Edge Functions (acesso e reset por token)
Configure variaveis:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL` (ex.: https://seu-dominio.com)
- `RESEND_API_KEY`
- `EMAIL_FROM` (ex.: no-reply@seu-dominio.com)

Deploy:
- `supabase functions deploy send-access-email`
- `supabase functions deploy request-password-reset`
- `supabase functions deploy complete-password-reset`

## 5) Frontend
Crie um `.env` baseado em `.env.example`:
```
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 6) Perfil inicial (master)
Depois de criar o usuário no Auth, crie um profile:
```
insert into profiles (user_id, role, clinic_id, full_name, is_active)
values ('<auth_user_id>', 'master_admin', '<clinic_id>', 'Master Admin', true);
```

## 7) Seed inicial
Execute `supabase/seed/seed.sql` no SQL Editor e siga as instrucoes comentadas.

## 8) Migração
Use `/app/settings/migration` (somente master_admin) para exportar o DB local e importar no Supabase.
