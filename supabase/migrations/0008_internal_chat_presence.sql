create table if not exists public.internal_chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_internal_chat_messages_created_at on public.internal_chat_messages(created_at);
create index if not exists idx_internal_chat_messages_sender on public.internal_chat_messages(sender_user_id);

alter table public.internal_chat_messages enable row level security;

drop policy if exists "internal_chat_select_authenticated" on public.internal_chat_messages;
create policy "internal_chat_select_authenticated"
on public.internal_chat_messages
for select
to authenticated
using (true);

drop policy if exists "internal_chat_insert_own_user" on public.internal_chat_messages;
create policy "internal_chat_insert_own_user"
on public.internal_chat_messages
for insert
to authenticated
with check (auth.uid() = sender_user_id);
