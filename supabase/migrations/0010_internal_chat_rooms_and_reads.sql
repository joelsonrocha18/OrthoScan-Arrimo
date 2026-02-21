alter table public.internal_chat_messages
  add column if not exists room_key text not null default 'global',
  add column if not exists room_label text not null default 'Geral';

create index if not exists idx_internal_chat_messages_room_created_at
  on public.internal_chat_messages(room_key, created_at);

create table if not exists public.internal_chat_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  room_key text not null,
  last_read_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, room_key)
);

alter table public.internal_chat_reads enable row level security;

drop policy if exists "internal_chat_reads_select_own" on public.internal_chat_reads;
create policy "internal_chat_reads_select_own"
on public.internal_chat_reads
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "internal_chat_reads_insert_own" on public.internal_chat_reads;
create policy "internal_chat_reads_insert_own"
on public.internal_chat_reads
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "internal_chat_reads_update_own" on public.internal_chat_reads;
create policy "internal_chat_reads_update_own"
on public.internal_chat_reads
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
