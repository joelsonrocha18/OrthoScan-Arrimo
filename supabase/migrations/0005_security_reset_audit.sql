create table if not exists security_audit_logs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  event_type text not null,
  actor_user_id uuid references auth.users(id),
  target_user_id uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_tokens_user on password_reset_tokens(user_id);
create index if not exists idx_password_reset_tokens_exp on password_reset_tokens(expires_at);

alter table security_audit_logs enable row level security;
alter table password_reset_tokens enable row level security;
