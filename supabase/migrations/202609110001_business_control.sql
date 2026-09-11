create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  company_name text not null check (char_length(trim(company_name)) between 2 and 160),
  phone text not null check (char_length(trim(phone)) between 8 and 40),
  email text not null check (position('@' in email) > 1),
  role text,
  segment text not null default 'multinicho',
  lead_score integer not null default 0 check (lead_score between 0 and 100),
  lead_temperature text not null default 'frio' check (lead_temperature in ('frio', 'morno', 'quente')),
  status text not null default 'novo' check (status in ('novo', 'contato_realizado', 'qualificado', 'reuniao', 'proposta', 'negociacao', 'fechado', 'perdido')),
  source text,
  referrer text,
  landing_page text,
  answers jsonb not null default '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  question_id text not null,
  question text not null,
  answer text not null,
  score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete restrict,
  note text not null check (char_length(trim(note)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_temperature_idx on public.leads(lead_temperature);
create index if not exists quiz_responses_lead_id_idx on public.quiz_responses(lead_id);
create index if not exists lead_notes_lead_id_idx on public.lead_notes(lead_id);
create index if not exists lead_notes_admin_id_idx on public.lead_notes(admin_id);
create index if not exists lead_status_history_lead_id_idx on public.lead_status_history(lead_id);
create index if not exists lead_status_history_changed_by_idx on public.lead_status_history(changed_by);

alter table public.leads enable row level security;
alter table public.quiz_responses enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_status_history enable row level security;
alter table public.admin_users enable row level security;

create policy "public can submit leads" on public.leads for insert to anon, authenticated with check (consent_at is not null and char_length(trim(name)) between 2 and 120);
create policy "admins can read leads" on public.leads for select to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admins can update leads" on public.leads for update to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid()))) with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

create policy "admins can read quiz responses" on public.quiz_responses for select to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admins can read notes" on public.lead_notes for select to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admins can add notes" on public.lead_notes for insert to authenticated with check ((select auth.uid()) = admin_id and exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admins can read status history" on public.lead_status_history for select to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admins can read own admin record" on public.admin_users for select to authenticated using ((select auth.uid()) = user_id);

grant insert on public.leads to anon, authenticated;
grant select, update on public.leads to authenticated;
grant select on public.quiz_responses, public.lead_notes, public.lead_status_history, public.admin_users to authenticated;
grant insert on public.lead_notes to authenticated;

create or replace function public.set_updated_at() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads for each row execute procedure public.set_updated_at();