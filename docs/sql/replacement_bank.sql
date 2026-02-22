-- Banco de reposicoes por placa/arcada (uso manual no Supabase SQL Editor)
create table if not exists public.replacement_bank (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  arcada text not null check (arcada in ('superior', 'inferior')),
  placa_numero integer not null check (placa_numero > 0),
  status text not null check (status in ('disponivel', 'em_producao', 'entregue', 'rework', 'defeituosa')),
  source_lab_item_id uuid null references public.lab_items(id) on delete set null,
  delivered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_replacement_bank_case on public.replacement_bank(case_id);
create index if not exists idx_replacement_bank_case_status on public.replacement_bank(case_id, status);
create index if not exists idx_replacement_bank_case_arcada_placa on public.replacement_bank(case_id, arcada, placa_numero);

create or replace function public.set_replacement_bank_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_replacement_bank_updated_at on public.replacement_bank;
create trigger trg_replacement_bank_updated_at
before update on public.replacement_bank
for each row execute function public.set_replacement_bank_updated_at();
