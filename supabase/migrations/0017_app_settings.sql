create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_authenticated" on public.app_settings;
create policy "app_settings_select_authenticated"
  on public.app_settings
  for select
  to authenticated
  using (true);

drop policy if exists "app_settings_write_master_admin" on public.app_settings;
create policy "app_settings_write_master_admin"
  on public.app_settings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role = 'master_admin'
        and p.deleted_at is null
        and p.is_active = true
    )
  );

drop policy if exists "app_settings_update_master_admin" on public.app_settings;
create policy "app_settings_update_master_admin"
  on public.app_settings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role = 'master_admin'
        and p.deleted_at is null
        and p.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role = 'master_admin'
        and p.deleted_at is null
        and p.is_active = true
    )
  );
