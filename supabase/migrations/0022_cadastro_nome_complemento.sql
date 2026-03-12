alter table public.dentists
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists cpf text,
  add column if not exists birth_date date,
  add column if not exists address jsonb;

alter table public.patients
  add column if not exists first_name text,
  add column if not exists last_name text;

update public.dentists
set
  first_name = coalesce(first_name, nullif(split_part(trim(name), ' ', 1), '')),
  last_name = coalesce(
    last_name,
    nullif(
      trim(
        regexp_replace(trim(name), '^\\S+\\s*', '')
      ),
      ''
    )
  )
where coalesce(first_name, last_name) is null
  and coalesce(name, '') <> '';

update public.patients
set
  first_name = coalesce(first_name, nullif(split_part(trim(name), ' ', 1), '')),
  last_name = coalesce(
    last_name,
    nullif(
      trim(
        regexp_replace(trim(name), '^\\S+\\s*', '')
      ),
      ''
    )
  )
where coalesce(first_name, last_name) is null
  and coalesce(name, '') <> '';
