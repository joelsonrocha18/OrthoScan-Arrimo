create or replace function public.enforce_lab_item_production_requirements()
returns trigger
language plpgsql
as $$
declare
  item_arch text;
  item_product text;
  planned_upper numeric;
  planned_lower numeric;
begin
  if new.status <> 'em_producao' then
    return new;
  end if;

  item_arch := coalesce(new.data->>'arch', '');
  if item_arch = '' then
    raise exception 'Defina a arcada do produto antes de iniciar producao.';
  end if;

  item_product := coalesce(new.product_id, new.product_type, new.data->>'productId', new.data->>'productType', 'alinhador_12m');
  if item_product in ('alinhador_3m', 'alinhador_6m', 'alinhador_12m') then
    planned_upper := coalesce(nullif(new.data->>'plannedUpperQty', '')::numeric, 0);
    planned_lower := coalesce(nullif(new.data->>'plannedLowerQty', '')::numeric, 0);
    if planned_upper + planned_lower <= 0 then
      raise exception 'Defina quantidades por arcada antes de iniciar producao.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_lab_item_production_requirements on public.lab_items;

create trigger trg_enforce_lab_item_production_requirements
before insert or update of status, data, product_type, product_id
on public.lab_items
for each row
execute function public.enforce_lab_item_production_requirements();
