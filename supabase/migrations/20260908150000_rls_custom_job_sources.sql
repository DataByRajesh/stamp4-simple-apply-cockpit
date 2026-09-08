alter table public.custom_job_sources
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.custom_job_sources enable row level security;

drop policy if exists "Users manage their own custom job sources" on public.custom_job_sources;
create policy "Users manage their own custom job sources"
  on public.custom_job_sources
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists custom_job_sources_user_id_idx
  on public.custom_job_sources(user_id);
