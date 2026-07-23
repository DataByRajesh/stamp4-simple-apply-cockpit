-- Government-sourced (GOV.UK Register of Licensed Sponsors: workers) list of organisations
-- holding a live Skilled Worker sponsor licence - refreshed weekly by the sync-uk-sponsors
-- cron, wholesale replaced on each run (see ukSponsorRegister.ts).
create table if not exists uk_verified_sponsors (
  company_name text primary key,
  rating text,
  imported_at timestamptz not null default now()
);
