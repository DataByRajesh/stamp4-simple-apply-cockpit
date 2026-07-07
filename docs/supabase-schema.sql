create table tracked_jobs (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role_title text not null,
  country text,
  location text,
  salary text,
  score integer not null,
  decision text not null,
  status text not null default 'Saved',
  date_added timestamptz not null default now(),
  notes text default '',
  generated_pack jsonb,
  proof_map jsonb,
  correction_actions jsonb,
  score_breakdown jsonb,
  parsed_job jsonb,
  updated_at timestamptz not null default now()
);

-- Run this against an existing database that predates the score_breakdown column:
-- alter table tracked_jobs add column if not exists score_breakdown jsonb;

-- Run this against an existing database that predates the parsed_job column
-- (added so "Why this score?" explanations work for already-saved jobs too):
-- alter table tracked_jobs add column if not exists parsed_job jsonb;

create table custom_job_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  region text not null,
  reasoning text,
  confidence text,
  added_at timestamptz not null default now()
);

create table alert_setup_status (
  source_name text primary key,
  done boolean not null default false,
  updated_at timestamptz not null default now()
);

create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table custom_sponsor_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  sector text,
  why_sponsor_friendly text,
  careers_url text,
  ats_provider text,
  ats_slug text,
  added_at timestamptz not null default now()
);

create table seen_job_postings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  external_id text not null,
  title text not null,
  url text not null,
  location text,
  first_seen_at timestamptz not null default now(),
  unique (company_name, external_id)
);
