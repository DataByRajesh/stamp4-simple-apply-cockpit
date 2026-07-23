# Stamp4 Capture (browser extension)

Companion to the Stamp4 Cockpit web app. Captures the job posting text on the current tab and
hands it to your Cockpit's paste-JD flow - it does **not** score, tailor, or submit anything
itself. All analysis and every "apply" click still happens in Stamp4, same as pasting a JD by
hand. This is intentionally the smallest possible extension: read the current page, send text,
open a tab. Everything else - scoring, visa check, CV/cover letter, contact lookup, tracking -
is the Cockpit you already have.

## What it does

1. Click the toolbar icon (or right-click the page → "Send this job to Stamp4").
2. The extension grabs the visible text of the job posting from the current tab.
3. It POSTs that text to your Stamp4 deployment's `/api/stamp4/simple-apply/capture` endpoint.
4. It opens a new tab at your Cockpit with a one-time capture token in the URL.
5. The Cockpit fetches and deletes that token, pre-filling the paste-JD box - you land on the
   normal "confirm before scoring" step, exactly like a manual paste.

## Setup

1. **Load it**: `chrome://extensions` → enable Developer mode → "Load unpacked" → select this
   `extension/` folder.
2. **Configure it**: click the extension icon → "Set Stamp4 domain & secret" (or right-click the
   icon → Options). Enter:
   - **Domain**: your deployed Cockpit's host only, e.g. `stamp4.yourdomain.com` - no
     `https://`, no trailing slash.
   - **Secret**: must match the `STAMP4_ACCESS_SECRET` environment variable already set on your
     Vercel deployment (the same value that signs your web session).
3. Both are stored in `chrome.storage.local` - local to this browser install, never synced.

## Site coverage

There's no fixed list of supported sites - it works everywhere by design. Site-specific
selectors (LinkedIn, Indeed, and a few others) are tried first as a fast path; if none match, or
if a job board's markup has changed since this was written, it falls back to finding the largest
visible text block on the page. Parsing job title/company/salary out of that raw text still
happens in Stamp4's existing parser, same as it does for anything you paste manually - so this
never needs to be pixel-perfect at extraction time.

## Security notes

- `host_permissions: ["<all_urls>"]` is required because the Cockpit domain is something you
  configure at install time, not something known when this manifest was written, and a
  background service worker needs an explicit host permission to `fetch()` cross-origin (there's
  no "active tab" concept in a service worker). If you ever publish this to the Chrome Web
  Store, narrow this to `optional_host_permissions` requested for just your configured domain -
  broad `<all_urls>` is fine for personal unpacked use but would draw review scrutiny published.
- The access secret is sent as a `Bearer` header on every capture request, checked with the same
  timing-safe comparison as the web session (see `checkAccessSecret.ts` in the main app). It
  never leaves `chrome.storage.local` otherwise.
- The capture handoff on the server side is one-shot: the row is deleted the moment the Cockpit
  reads it, so a leaked/guessed token is only useful once and only for a few seconds.

## Known gap

This captures text only. It does not fill in application forms (name, email, work history,
screening questions) - that's the next phase, and needs a separate "applicant profile" data
source in Stamp4 for the extension to draw from before it's worth building.
