create table if not exists public.user_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  p256dh_key text,
  auth_key text,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);

create unique index if not exists idx_user_push_subscriptions_endpoint_unique
  on public.user_push_subscriptions (endpoint);

create unique index if not exists idx_user_push_subscriptions_user_endpoint_unique
  on public.user_push_subscriptions (user_id, endpoint);

create index if not exists idx_user_push_subscriptions_user_id
  on public.user_push_subscriptions (user_id);

do $$ begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_user_push_subscriptions_updated_at'
  ) then
    create trigger trg_user_push_subscriptions_updated_at
    before update on public.user_push_subscriptions
    for each row execute function set_updated_at();
  end if;
end $$;

alter table public.user_push_subscriptions enable row level security;

drop policy if exists "user_push_subscriptions_select_own" on public.user_push_subscriptions;
create policy "user_push_subscriptions_select_own"
on public.user_push_subscriptions for select
using (user_id = auth.uid() or app_is_master());

drop policy if exists "user_push_subscriptions_insert_own" on public.user_push_subscriptions;
create policy "user_push_subscriptions_insert_own"
on public.user_push_subscriptions for insert
with check (user_id = auth.uid());

drop policy if exists "user_push_subscriptions_update_own" on public.user_push_subscriptions;
create policy "user_push_subscriptions_update_own"
on public.user_push_subscriptions for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_push_subscriptions_delete_own" on public.user_push_subscriptions;
create policy "user_push_subscriptions_delete_own"
on public.user_push_subscriptions for delete
using (user_id = auth.uid() or app_is_master());
