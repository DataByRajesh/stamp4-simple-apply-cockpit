alter table public.tracked_jobs
  add column if not exists interview_execution jsonb not null default '{}'::jsonb;
