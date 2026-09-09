# Stamp4 authentication migration

The target architecture is Supabase Auth plus request-scoped clients using the
publishable/anon key. User-owned tables rely on RLS and `auth.uid()`; the
service-role client is reserved for cron jobs and other explicitly privileged
server operations.

## Current migration status

- Supabase email/password sign-in and sign-out issue HttpOnly auth cookies.
- `custom_job_sources`, `tracker_jobs`, `seen_job_postings` and
  `alert_setup_status` are migrated: reads and writes use the caller's
  session-scoped client, and RLS limits rows to their `user_id`.
- `career_search_profiles` (renamed from the earlier hardcoded `RAJ_PROFILE`
  constant, and distinct from the unrelated `mobility_profiles` table used by
  AutoTime EU Apply's own cross-border sponsorship feature in this same
  consolidated Supabase project) holds each user's own career-search
  preferences. The daily `poll-sponsors` cron loops over every row in it
  (service-role, cron-only) instead of one hardcoded profile, and emails each
  user's own account address instead of one shared `STAMP4_ALERT_EMAIL_TO`.
- Login also issues the old signed workspace cookie temporarily so unmigrated
  web routes continue to work during the staged cutover.
- The extension may continue using `STAMP4_ACCESS_SECRET` until personal access
  tokens are designed and implemented.

Do not treat the compatibility cookie or extension bearer secret as tenant
identity. Routes using either mechanism must not expose per-user data.

## `app_settings` ownership audit (completed)

The per-user keys moved to a dedicated `user_app_settings` table
(`user_id, key` composite primary key, RLS-scoped to `auth.uid() = user_id`)
rather than overloading `app_settings` with a nullable-user_id composite key -
same pattern as `career_search_profiles`:

- `candidate_evidence_profile`
- `mobility_profile`
- `last_source_check`

`settings/route.ts` (session-scoped via `authenticateRequest`) enforces this
exact key allowlist and rejects anything else - closing the previous gap
where the route accepted any key at all. `app_settings` itself keeps its
original bare `key` primary key and now holds only genuinely global,
privileged-cron-written keys:

- `last_sponsor_poll`
- `last_ireland_sponsor_sync`
- `last_uk_sponsor_sync`

`generate/route.ts` is reachable only via the extension's shared-secret path
(see "Remaining sequence" step 5 below - it has no caller identity yet), so it
reads the per-user settings keys via a documented single-operator fallback
(`OPERATOR_USER_ID` in `operatorAccount.ts`) rather than a real per-user
lookup, until personal extension tokens exist.

## Remaining sequence

1. Apply `20260908150000_rls_custom_job_sources.sql` and verify two test users
   cannot read or mutate each other's rows.
2. ~~Migrate the remaining user-owned routes and tables one at a time.~~ Done:
   `custom_job_sources`, `tracker_jobs`, `seen_job_postings`,
   `alert_setup_status`, `career_search_profiles`, `user_app_settings`.
3. ~~Split `app_settings` as described above and migrate its API consumers.~~ Done.
4. Remove the legacy cookie once every web route uses Supabase sessions.
5. Introduce hashed, revocable, user-owned extension tokens; then remove shared
   bearer-secret support (this also resolves `generate/route.ts`'s
   single-operator fallback above).
