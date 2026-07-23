-- One-shot handoff for JD text captured by the Stamp4 browser extension: the extension POSTs the
-- captured text and gets back a token, then opens the Cockpit with that token in the URL; the
-- Cockpit fetches and deletes the row on load (see /api/stamp4/simple-apply/capture). Rows older
-- than a day are abandoned tabs that were never opened - harmless to leave, but cheap to prune.
create table if not exists capture_handoffs (
  token text primary key,
  raw_text text not null,
  source_url text,
  created_at timestamptz not null default now()
);
