alter table public.tracked_jobs
  add column if not exists application_record jsonb not null default '{}'::jsonb;
