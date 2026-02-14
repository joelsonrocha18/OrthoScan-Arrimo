alter table profiles
  add column if not exists login_email text;

create index if not exists idx_profiles_login_email
  on profiles (lower(login_email))
  where login_email is not null;
