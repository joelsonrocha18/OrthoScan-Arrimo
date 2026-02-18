alter table public.internal_chat_messages
  add column if not exists sender_role text not null default 'receptionist';
