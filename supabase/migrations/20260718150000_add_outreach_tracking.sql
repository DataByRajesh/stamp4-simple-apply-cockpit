alter table public.tracked_jobs
  add column if not exists outreach jsonb not null default '{}'::jsonb;
