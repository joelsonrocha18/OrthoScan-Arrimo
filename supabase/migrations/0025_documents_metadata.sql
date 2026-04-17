alter table public.documents
add column if not exists data jsonb not null default '{}'::jsonb;
