# Competitive comparison: Stamp4 vs ApplyWave (2026-07-22)

Compared Stamp4 against ApplyWave (ie.applywave.app/blog/ie-critical-skills), an
Ireland Critical Skills-focused job application SaaS, to check for missing capability.

## Outcome

Only one genuine gap found: **Recruiter Finder**. It has been closed via a zero-cost
LinkedIn people-search link, not a full contact-enrichment feature (see below). No
other ApplyWave capability requires further work here.

## Feature-by-feature

- **Job Radar** - already had it. `cron/poll-sponsors` polls sponsor-company ATS boards
  directly plus three aggregator feeds (Arbeitnow/Germany, Adzuna/Netherlands,
  Jooble/Ireland) on a daily schedule and emails a scored digest. More precise than
  generic keyword matching - matches are run through the same scoring engine used for
  manually pasted JDs, not a keyword filter.

- **Resume tailoring / cover letters / recruiter messages** - already had it, tied to
  the candidate's evidence profile (verified facts, portfolio projects) rather than
  generic AI prose.

- **Interview prep** - already had it, more extensive: STAR-outline answers plus
  bilingual audio notes, not just a question list.

- **Fit scoring against real evidence, ATS-coverage transparency, country-specific
  salary-threshold logic** - Stamp4 has this, ApplyWave does not. These are actual
  differentiators, not gaps, and aren't part of this comparison's action items.

- **Recruiter Finder** - the one real gap. ApplyWave's version is paid contact
  enrichment (verified emails, LinkedIn lookups at scale), which depends on a licensed
  data provider. Replicating that in-house would be genuine scope creep for a solo MVP
  tool, not a quick add. Closed instead with a zero-cost one-click LinkedIn
  people-search link scoped to the company name
  (`src/lib/stamp4/simple-apply/recruiterSearch.ts`), placed next to the existing
  recruiter LinkedIn message template. Deliberately not verified-contact data.

## Scope boundary

No further ApplyWave-driven feature work is planned. If the recruiter-search link
proves too weak in practice (thin LinkedIn results for smaller sponsor companies), the
fallback is to use ApplyWave's own free tier for that one lookup - not to build a
fuller contact-enrichment version in-house.

If a future session sees "ApplyWave has X feature" - check this doc first. The
comparison has already been done; assume no new gap exists unless ApplyWave has
shipped something genuinely new since this date.
