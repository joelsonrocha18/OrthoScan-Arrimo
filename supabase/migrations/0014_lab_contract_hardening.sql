create or replace function public.enforce_lab_item_contract_approved()
returns trigger
language plpgsql
as $$
declare
  case_data jsonb;
  contract_status text;
begin
  if new.case_id is null then
    return new;
  end if;

  select data into case_data
  from public.cases
  where id = new.case_id
  and deleted_at is null;

  if case_data is null then
    raise exception 'Caso/Pedido vinculado nao encontrado para gerar OS.';
  end if;

  contract_status := coalesce(case_data->'contract'->>'status', 'pendente');
  if contract_status <> 'aprovado' then
    raise exception 'Contrato nao aprovado. Nao e possivel gerar OS para o laboratorio.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_lab_item_contract_approved on public.lab_items;

create trigger trg_enforce_lab_item_contract_approved
before insert or update of case_id
on public.lab_items
for each row
execute function public.enforce_lab_item_contract_approved();
