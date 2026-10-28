-- ============================================================
-- Granite Systems: all-Scotland regions + material type on jobs
-- Run once after 001_jobs.sql (Supabase → SQL Editor → paste → Run). Safe to re-run.
-- ============================================================

-- Material type lets each material pop-up show its own jobs (silestone, sensa, granite,
-- dekton, marble, corian, quartz, other). The free-text "material" column keeps the colour.
alter table public.gs_jobs add column if not exists material_type text;

-- Regions: Tayside was split into Dundee & Angus and Perth & Kinross, and every other
-- Scottish region added.
alter table public.gs_jobs drop constraint if exists gs_jobs_region_check;
update public.gs_jobs set region = 'dundee' where region = 'tayside';
alter table public.gs_jobs add constraint gs_jobs_region_check check (region in (
  'fife','edinburgh','dundee','perth','central','glasgow','lanarkshire','renfrewshire',
  'ayrshire','dumfries','borders','aberdeen','highlands','argyll','elsewhere'
));
