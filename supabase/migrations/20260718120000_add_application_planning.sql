alter table tracked_jobs add column if not exists application_url text;
alter table tracked_jobs add column if not exists application_deadline date;
