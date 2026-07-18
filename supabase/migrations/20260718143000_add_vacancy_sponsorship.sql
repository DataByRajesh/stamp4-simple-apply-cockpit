alter table public.tracked_jobs
  add column if not exists sponsorship_status text not null default 'Unknown',
  add column if not exists sponsorship_evidence text;
