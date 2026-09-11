drop policy if exists "users can read own access request" on public.admin_access_requests;
drop policy if exists "master can read access requests" on public.admin_access_requests;

create policy "users and master can read access requests"
on public.admin_access_requests
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);

drop policy if exists "admins can read leads" on public.leads;
drop policy if exists "approved users can read leads" on public.leads;

create policy "approved users and master can read leads"
on public.leads
for select
to authenticated
using (
  exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  or exists (select 1 from public.admin_access_requests where user_id = (select auth.uid()) and status = 'approved')
);

drop policy if exists "admins can update leads" on public.leads;
drop policy if exists "approved users can update leads" on public.leads;

create policy "approved users and master can update leads"
on public.leads
for update
to authenticated
using (
  exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  or exists (select 1 from public.admin_access_requests where user_id = (select auth.uid()) and status = 'approved')
)
with check (
  exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  or exists (select 1 from public.admin_access_requests where user_id = (select auth.uid()) and status = 'approved')
);

create index if not exists admin_access_requests_reviewed_by_idx
  on public.admin_access_requests(reviewed_by);
