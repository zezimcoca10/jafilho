create schema if not exists private;

create table if not exists public.admin_bootstrap (
  id boolean primary key default true check (id = true),
  claimed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.admin_bootstrap (id, claimed)
values (true, exists (select 1 from public.admin_users))
on conflict (id) do update
set claimed = excluded.claimed,
    updated_at = now();

alter table public.admin_bootstrap enable row level security;

revoke all on table public.admin_bootstrap from public;
grant select on table public.admin_bootstrap to anon, authenticated;

drop policy if exists "public can read master bootstrap state" on public.admin_bootstrap;

create policy "public can read master bootstrap state"
on public.admin_bootstrap
for select
to anon, authenticated
using (true);

create or replace function private.prevent_multiple_master_admins()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bootstrap_claimed boolean;
begin
  perform pg_advisory_xact_lock(7712345678901);

  select claimed
    into bootstrap_claimed
  from public.admin_bootstrap
  where id = true
  for update;

  if coalesce(bootstrap_claimed, false) or exists (select 1 from public.admin_users) then
    raise exception 'Only one master administrator is allowed';
  end if;

  update public.admin_bootstrap
  set claimed = true, updated_at = now()
  where id = true;

  return new;
end;
$$;

revoke all on function private.prevent_multiple_master_admins() from public;

drop trigger if exists enforce_single_master_admin on public.admin_users;

create trigger enforce_single_master_admin
before insert on public.admin_users
for each row
execute function private.prevent_multiple_master_admins();

drop policy if exists "first user can become master administrator" on public.admin_users;

create policy "first user can become master administrator"
on public.admin_users
for insert
to authenticated
with check ((select auth.uid()) = user_id);
