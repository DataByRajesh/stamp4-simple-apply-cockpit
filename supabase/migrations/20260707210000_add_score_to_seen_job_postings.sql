alter table seen_job_postings add column if not exists score_total numeric;
alter table seen_job_postings add column if not exists decision text;
