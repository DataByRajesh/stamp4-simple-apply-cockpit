# stamp4-simple-apply-cockpit
Private permit-aware job-fit cockpit for Ireland/EU FinTech Systems Analyst roles

## Features

- **Cockpit** - paste a JD, get deterministic scoring, permit-risk flagging, proof mapping and an AI-generated application pack (skipped automatically for poor-fit roles).
- **Job Sources & Alerts** - curated Ireland/Netherlands/EU-wide job boards plus a native-alert setup checklist. No scraping or auto-import.
- **Interview Prep** - pick a saved/tracked job and generate a fresh, tailored interview question bank on demand. Always a live AI call; if it fails, nothing generic is shown in its place.
- **Sponsor Companies** - a curated Ireland/Netherlands watchlist of sponsor-friendly employers, with links to the official government registers to verify any one directly. Companies with a confirmed public ATS job-board API (currently Stripe, Adyen, Wayflyer) are polled automatically by a daily cron job; new roles matching the target role lane trigger an email digest via Resend.

## Setup

Base env vars (Supabase-backed tracker/sources/alerts/settings, AI generation, shared access secret) - see `.env.local`.

Sponsor-company monitoring additionally needs:

| Env var | Purpose |
|---|---|
| `CRON_SECRET` | Authorises the Vercel Cron request to `/api/stamp4/simple-apply/cron/poll-sponsors` (Vercel sends it automatically as `Authorization: Bearer <CRON_SECRET>`). |
| `RESEND_API_KEY` | Resend API key used to send the new-match email digest. |
| `STAMP4_ALERT_EMAIL_TO` | Where the digest is sent. |
| `STAMP4_ALERT_EMAIL_FROM` | Verified Resend sender address. |

The poll runs once daily (`vercel.json`) - Vercel's Hobby plan only allows daily cron jobs. Without the email
vars set, the poll still runs and records new postings in `seen_job_postings`; it just won't email you.

Database schema: `docs/supabase-schema.sql` (reference) and `supabase/migrations/` (applied via `supabase db push`).

## Testing

See `docs/testing.md`.
