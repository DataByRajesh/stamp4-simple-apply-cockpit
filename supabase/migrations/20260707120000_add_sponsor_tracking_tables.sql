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
