alter table profiles
  add column if not exists cpf text,
  add column if not exists phone text,
  add column if not exists onboarding_completed_at timestamptz;

create table if not exists user_onboarding_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  role app_role not null,
  clinic_id uuid not null references clinics(id),
  dentist_id uuid references dentists(id),
  full_name text not null,
  cpf text,
  phone text,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_onboarding_invites_expires
  on user_onboarding_invites (expires_at);

create index if not exists idx_onboarding_invites_used
  on user_onboarding_invites (used_at);

alter table user_onboarding_invites enable row level security;

