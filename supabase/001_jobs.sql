-- ============================================================
-- Granite Systems landing pages — jobs, reviews, photos, enquiries
-- Runs in the SAME Supabase project as Second Cut Stone (reuses public.admins / is_admin(),
-- so the same staff accounts and approvals work on both sites).
-- Supabase → SQL Editor → New query → paste → Run. Safe to run more than once.
-- ============================================================

-- ---------- Jobs (a finished job shown on a region page) ----------
create table if not exists public.gs_jobs (
  id            uuid primary key default gen_random_uuid(),
  region        text not null check (region in ('fife','edinburgh','tayside','central','elsewhere')),
  town          text,
  title         text,                                 -- optional; page builds one from material + type
  job_type      text,                                 -- Kitchen, Bathroom, Commercial, Other
  material      text,                                 -- e.g. "Silestone Calacatta Gold"
  description   text,
  photos        text[] not null default '{}',         -- public URLs, first one is the cover
  review_text   text,                                 -- only with the customer's permission
  reviewer_name text,                                 -- e.g. "Sarah, Broughty Ferry"
  rating        smallint check (rating between 1 and 5),
  published     boolean not null default true,
  featured      boolean not null default false,
  job_date      date default current_date,
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);
create index if not exists gs_jobs_region_idx on public.gs_jobs (region, published, job_date desc);

-- ---------- Quote requests from the landing pages ----------
create table if not exists public.gs_enquiries (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 200),
  email         text not null check (char_length(email) between 3 and 320),
  phone         text check (char_length(phone) <= 40),
  postcode      text check (char_length(postcode) <= 12),
  project_type  text check (char_length(project_type) <= 60),
  message       text check (char_length(message) <= 4000),
  region        text check (char_length(region) <= 20),
  page          text check (char_length(page) <= 200),
  handled       boolean not null default false,
  notified_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.gs_jobs      enable row level security;
alter table public.gs_enquiries enable row level security;

drop policy if exists "gs_jobs public read" on public.gs_jobs;
create policy "gs_jobs public read" on public.gs_jobs
  for select using (published or public.is_admin());
drop policy if exists "gs_jobs admin write" on public.gs_jobs;
create policy "gs_jobs admin write" on public.gs_jobs
  for all using (public.is_admin()) with check (public.is_admin());

-- Anyone can send a quote request, but only new, unhandled ones; only staff can read them.
drop policy if exists "gs_enquiries public insert" on public.gs_enquiries;
create policy "gs_enquiries public insert" on public.gs_enquiries
  for insert with check (handled = false and notified_at is null);
drop policy if exists "gs_enquiries admin manage" on public.gs_enquiries;
create policy "gs_enquiries admin manage" on public.gs_enquiries
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.gs_jobs to anon, authenticated;
grant insert on public.gs_enquiries to anon, authenticated;
grant all on public.gs_jobs, public.gs_enquiries to authenticated;

-- ---------- Job photo storage (public read, staff upload) ----------
insert into storage.buckets (id, name, public)
values ('gs-job-photos', 'gs-job-photos', true)
on conflict (id) do nothing;

drop policy if exists "gs photos public read" on storage.objects;
create policy "gs photos public read" on storage.objects
  for select using (bucket_id = 'gs-job-photos');
drop policy if exists "gs photos admin insert" on storage.objects;
create policy "gs photos admin insert" on storage.objects
  for insert with check (bucket_id = 'gs-job-photos' and public.is_admin());
drop policy if exists "gs photos admin update" on storage.objects;
create policy "gs photos admin update" on storage.objects
  for update using (bucket_id = 'gs-job-photos' and public.is_admin());
drop policy if exists "gs photos admin delete" on storage.objects;
create policy "gs photos admin delete" on storage.objects
  for delete using (bucket_id = 'gs-job-photos' and public.is_admin());
