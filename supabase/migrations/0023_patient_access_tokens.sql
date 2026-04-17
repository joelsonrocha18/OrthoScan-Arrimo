create table if not exists patient_access_tokens (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  token_hash text not null unique,
  delivery_channel text not null default 'email',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_patient_access_tokens_patient_id on public.patient_access_tokens(patient_id);
create index if not exists idx_patient_access_tokens_expires_at on public.patient_access_tokens(expires_at);

alter table public.patient_access_tokens enable row level security;
