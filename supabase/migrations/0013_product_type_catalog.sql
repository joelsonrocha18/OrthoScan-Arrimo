do $$
begin
  if to_regclass('public.cases') is not null then
    alter table public.cases
      add column if not exists product_type text;
  end if;

  if to_regclass('public.lab_items') is not null then
    alter table public.lab_items
      add column if not exists product_type text;
  end if;
end $$;

update public.cases
set product_type = coalesce(product_type, data->>'productType', 'alinhador_12m')
where product_type is null;

update public.lab_items
set product_type = coalesce(product_type, data->>'productType', 'alinhador_12m')
where product_type is null;

create index if not exists idx_cases_product_type on public.cases(product_type);
create index if not exists idx_lab_items_product_type on public.lab_items(product_type);
