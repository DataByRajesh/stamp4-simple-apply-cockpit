create table if not exists contact_lookup_cache (
  company_key text primary key,
  company_name text not null,
  contacts jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now()
);
