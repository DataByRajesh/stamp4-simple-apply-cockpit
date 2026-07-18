alter table public.tracked_jobs
  add column if not exists offer_decision jsonb not null default '{}'::jsonb;
