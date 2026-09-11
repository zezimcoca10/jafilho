create table if not exists public.admin_access_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create index if not exists admin_access_requests_status_idx
  on public.admin_access_requests(status);

alter table public.admin_access_requests enable row level security;

create policy "users can read own access request"
on public.admin_access_requests for select to authenticated
using ((select auth.uid()) = user_id);

create policy "users can request own access"
on public.admin_access_requests for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "master can read access requests"
on public.admin_access_requests for select to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

create policy "master can update access requests"
on public.admin_access_requests for update to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

create policy "master can delete access requests"
on public.admin_access_requests for delete to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

grant select, insert on public.admin_access_requests to authenticated;
grant update, delete on public.admin_access_requests to authenticated;

create policy "approved users can read leads"
on public.leads for select to authenticated
using (
  exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  or exists (select 1 from public.admin_access_requests where user_id = (select auth.uid()) and status = 'approved')
);

create policy "approved users can update leads"
on public.leads for update to authenticated
using (
  exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  or exists (select 1 from public.admin_access_requests where user_id = (select auth.uid()) and status = 'approved')
)
with check (
  exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  or exists (select 1 from public.admin_access_requests where user_id = (select auth.uid()) and status = 'approved')
);

create policy "master can delete leads"
on public.leads for delete to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

grant delete on public.leads to authenticated;
