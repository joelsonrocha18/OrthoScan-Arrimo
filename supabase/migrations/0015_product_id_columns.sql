do $$
begin
  if to_regclass('public.cases') is not null then
    alter table public.cases
      add column if not exists product_id text;
  end if;

  if to_regclass('public.lab_items') is not null then
    alter table public.lab_items
      add column if not exists product_id text;
  end if;
end $$;

update public.cases
set
  product_id = coalesce(product_id, product_type, data->>'productId', data->>'productType', 'alinhador_12m'),
  product_type = coalesce(product_type, product_id, data->>'productType', data->>'productId', 'alinhador_12m')
where product_id is null
   or product_type is null;

update public.lab_items
set
  product_id = coalesce(product_id, product_type, data->>'productId', data->>'productType', 'alinhador_12m'),
  product_type = coalesce(product_type, product_id, data->>'productType', data->>'productId', 'alinhador_12m')
where product_id is null
   or product_type is null;

create index if not exists idx_cases_product_id on public.cases(product_id);
create index if not exists idx_lab_items_product_id on public.lab_items(product_id);
