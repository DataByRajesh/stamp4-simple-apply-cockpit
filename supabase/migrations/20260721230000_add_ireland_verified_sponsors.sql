-- Government-sourced (enterprise.gov.ie) list of companies issued at least one employment
-- permit in Ireland this year - refreshed monthly by the sync-ireland-sponsors cron, wholesale
-- replaced on each run rather than incrementally updated (see irelandSponsorRegister.ts).
create table if not exists ireland_verified_sponsors (
  company_name text primary key,
  imported_at timestamptz not null default now()
);

alter table seen_job_postings add column if not exists verified_sponsor boolean;
