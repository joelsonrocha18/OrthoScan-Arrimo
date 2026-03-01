create or replace function public.app_current_clinic()
returns uuid
language sql
stable
as $$
  select clinic_id
  from public.profiles
  where user_id = auth.uid()
  limit 1
$$;

create or replace function public.app_is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role in ('master_admin', 'dentist_admin')
      and coalesce(is_active, true) = true
      and deleted_at is null
  )
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.ai_feature_flags (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  ai_enabled boolean not null default false,
  clinica_enabled boolean not null default false,
  lab_enabled boolean not null default false,
  gestao_enabled boolean not null default false,
  comercial_enabled boolean not null default false,
  limits_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  input_hash text not null,
  input_redacted jsonb not null default '{}'::jsonb,
  output text,
  status text not null default 'queued',
  error text,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_estimated numeric(12, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_jobs_clinic_created_at_idx on public.ai_jobs(clinic_id, created_at desc);
create index if not exists ai_jobs_user_created_at_idx on public.ai_jobs(user_id, created_at desc);
create index if not exists ai_jobs_feature_created_at_idx on public.ai_jobs(feature, created_at desc);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  day date not null,
  tokens_total integer not null default 0,
  cost_total numeric(12, 6) not null default 0,
  created_at timestamptz not null default now(),
  unique (clinic_id, user_id, feature, day)
);

create index if not exists ai_usage_clinic_day_idx on public.ai_usage(clinic_id, day desc);

alter table public.ai_feature_flags enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists "ai_feature_flags_select_scope" on public.ai_feature_flags;
create policy "ai_feature_flags_select_scope"
  on public.ai_feature_flags
  for select
  to authenticated
  using (
    public.app_is_admin()
    or clinic_id = public.app_current_clinic()
  );

drop policy if exists "ai_feature_flags_write_admin" on public.ai_feature_flags;
create policy "ai_feature_flags_write_admin"
  on public.ai_feature_flags
  for all
  to authenticated
  using (public.app_is_admin())
  with check (public.app_is_admin());

drop policy if exists "ai_jobs_select_scope" on public.ai_jobs;
create policy "ai_jobs_select_scope"
  on public.ai_jobs
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.app_is_admin()
    or clinic_id = public.app_current_clinic()
  );

drop policy if exists "ai_usage_select_scope" on public.ai_usage;
create policy "ai_usage_select_scope"
  on public.ai_usage
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.app_is_admin()
    or clinic_id = public.app_current_clinic()
  );

drop trigger if exists ai_feature_flags_touch_updated_at on public.ai_feature_flags;
create trigger ai_feature_flags_touch_updated_at
  before update on public.ai_feature_flags
  for each row
  execute function public.set_updated_at();

drop trigger if exists ai_jobs_touch_updated_at on public.ai_jobs;
create trigger ai_jobs_touch_updated_at
  before update on public.ai_jobs
  for each row
  execute function public.set_updated_at();
