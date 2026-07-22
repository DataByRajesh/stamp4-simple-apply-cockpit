---
name: run-cockpit
description: Build, run, and drive the Stamp4 Simple Apply Cockpit Next.js app. Use when asked to start the Cockpit, run its dev server, take a screenshot of its UI, log in, analyse a job description through the scoring flow, or interact with the running app.
---

Stamp4 Simple Apply Cockpit is a Next.js/Turbopack web app. Drive it via the Playwright REPL
driver at `.claude/skills/run-cockpit/driver.mjs` - `chromium-cli` isn't installed in this
environment, so this driver fills the same role (same command vocabulary: `nav`, `text`, `click`,
`screenshot`, `console --errors`, ...), plus a couple of app-specific shortcuts (`login`,
`analyse`, `confirm-generate`).

All paths below are relative to the repo root.

## Prerequisites

Playwright is a project devDependency (`pnpm add -D playwright` already done). Chromium needs to
be downloaded once:

```bash
npx playwright install chromium
```

## Setup

```bash
pnpm install
```

Required env vars (already in `.env.local` for local dev - see that file for real values, not
reproduced here since some are live API keys):

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
STAMP4_ACCESS_SECRET=...              # the login password
NEXT_PUBLIC_STAMP4_ACCESS_SECRET=...  # must match STAMP4_ACCESS_SECRET
```

## Build

No separate build step needed to drive the app - `pnpm dev` runs Turbopack directly. (`pnpm build`
exists for a production build if specifically needed; not required for verification.)

## Run (agent path)

```bash
pnpm dev &
timeout 60 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
```

Then pipe commands to the driver as a heredoc (one-shot scripted run - no tmux needed, the driver
reads from stdin and exits on its own once stdin closes):

```bash
STAMP4_ACCESS_SECRET=<value-from-.env.local> node .claude/skills/run-cockpit/driver.mjs <<'EOF'
login
text .hero-panel p:not(.eyebrow)
screenshot 01-hero
nav /stamp4/simple-apply/sources-alerts
count text=Germany
screenshot 02-sources-alerts
console --errors
quit
EOF
```

Screenshots land in `.claude/skills/run-cockpit/screenshots/` (override with `SCREENSHOT_DIR`).
That directory is gitignored - it's verification output, not source.

When done, stop the dev server (Windows - `lsof` isn't reliable in Git Bash here):

```powershell
$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($conn) { Stop-Process -Id ($conn.OwningProcess | Sort-Object -Unique) -Force }
```

### Commands

| command | what it does |
|---|---|
| `nav <url>` | navigate (relative paths resolve against `BASE_URL`, default `http://localhost:3000`) |
| `login [password]` | fills and submits `/stamp4/login`; omit password to use `STAMP4_ACCESS_SECRET` from env |
| `fill <selector> <value...>` | fill an input |
| `click <selector-or-text=...>` | click; `text=Foo` does a text match, anything else is a CSS selector |
| `press <key>` | keyboard press |
| `wait-for <selector-or-text=...> [timeoutMs]` | wait for an element (default 15000ms) |
| `screenshot [name]` | full-page screenshot → `screenshots/<name>.png` |
| `screenshot-element <selector> [name]` | screenshot just one element |
| `text <selector>` | print `textContent` |
| `count <selector>` | print element count |
| `eval <js>` | evaluate in the page, print JSON |
| `console --errors` | print every captured `console.error`/`pageerror` since launch |
| `analyse <jd-text>` | project shortcut: fills the JD textarea, clicks Analyse, waits for the Confirm-before-scoring step. Multi-line JD text must use literal `\n` (the REPL is line-based) |
| `confirm-generate` | project shortcut: clicks "Confirm & generate" (real AI call, up to ~90s worst case), waits for the results grid |
| `quit` | close the browser |

`login`/`nav` lazily launch the browser on first use - no separate `launch` command needed.

## Run (human path)

```bash
pnpm dev   # → http://localhost:3000, Ctrl-C to stop
```

## Test

```bash
pnpm exec tsc --noEmit    # typecheck
pnpm exec eslint .        # lint
pnpm exec vitest run      # unit tests - 143 pass as of this writing
```

## Direct invocation: hitting API routes without the browser

Several routes (the cron endpoints especially) are more directly tested with a raw request than
through the UI. Example - the daily sponsor-alert poll, gated by `CRON_SECRET`:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/stamp4/simple-apply/cron/poll-sponsors
```

Outside its 08:00 Europe/London window this returns `{"skipped":true,...}` immediately - see
Gotchas.

## Gotchas

- **The JD analysis flow is two steps, not one.** Filling the JD textarea and clicking "Analyse"
  only parses the JD into a "Confirm before scoring" review step. You then have to click "Confirm
  & generate" - which makes a real AI call and can take up to ~90s - before the results grid
  (FitVerdictCard/ScoreBreakdown/SeniorityFitCard/PermitRiskCard) actually renders. Wait for a
  specific result-grid selector (`text=Seniority fit`), never a fixed timeout. The `analyse` /
  `confirm-generate` driver commands already encode this (90s wait).

- **NVIDIA (tried first, see `llm.ts`) genuinely takes ~50-65s for a full generation on its free
  tier - it is not hanging, just slow under load (measured live: 690 completion tokens in 50.7s).**
  It's bounded at 65s before falling back to OpenAI, so a single "Confirm & generate" click can
  take up to ~90s total in the worst case (NVIDIA's 65s timeout + the OpenAI fallback call). This
  is deliberate - see the comment above `callNvidia()` for the reasoning.

- **`readline`'s `close` event fires as soon as stdin hits EOF - not when queued async commands
  finish.** For a piped heredoc, stdin closes almost immediately, well before a slow command like
  `login` (~1-2s) has actually completed. If anything calls `rl.prompt()` after `close` has
  already fired, it throws `ERR_USE_AFTER_CLOSE`, and left uncaught that silently kills every
  command still queued behind it - which looked exactly like "only the first command ever runs"
  when first built. The driver guards every prompt call behind a `closed` flag for this reason;
  if you extend the driver, keep using `safePrompt()`, not `rl.prompt()` directly.

- **`readline`'s `line` event does not wait for your async handler.** All lines from a piped
  heredoc fire their `line` events back-to-back immediately, regardless of how long a previous
  command's promise takes. Every command must go through the driver's serialized `queue` (a
  promise chain), or commands race each other.

- **Never call `rl.close()` from inside a command that's currently executing as a link in that
  same `queue` chain**, then `await queue` in the `close` handler - that's a self-referential
  deadlock (only the command that called it ever completes). The driver's `quit` command
  deliberately does *not* call `rl.close()`; cleanup relies entirely on stdin's natural EOF (a
  heredoc closes it automatically; a human at a real terminal sends it with Ctrl-D).

- **Don't call `process.exit()` after doing real output on Windows.** stdout to a redirected/piped
  destination is asynchronous there; `process.exit()` can truncate `console.log` calls that
  haven't flushed yet - observed directly (screenshot/text output silently vanished from a file
  redirect until the explicit `process.exit()` calls were removed). Once the browser and readline
  are both closed, nothing keeps the event loop alive and the process exits on its own with output
  intact - let it.

- **Multi-line text can't go through the REPL as literal newlines** - each newline is its own
  command. The `analyse` command accepts `\n` (two characters) and unescapes it before filling the
  textarea; do the same for any new command that needs multi-line input.

- **The `poll-sponsors` cron only actually runs at 08:00 Europe/London.** Outside that window it
  returns `{"skipped":true,"reason":"Outside 08:00 Europe/London window"}` immediately, without
  touching any of the feeds or the database. To exercise the real logic outside that window
  requires a temporary code patch to the hour-gate check in
  `src/app/api/stamp4/simple-apply/cron/poll-sponsors/route.ts` - **do this only for local,
  throwaway verification and always revert it before committing.** Don't build a permanent bypass
  flag into the route.

- **A `caret-color: transparent` hydration warning on disabled/hidden inputs is a known
  false-positive, not an app bug.** `console --errors` reproduces it in more than one place - the
  alert-status checklist's `disabled` checkboxes on `/stamp4/simple-apply/sources-alerts` while
  its initial Supabase fetch is in flight, and the `hidden` file input in `TrackerImporter` on the
  main Cockpit page - always the same server/client mismatch on that one CSS property. No
  `caret-color` is set anywhere in this app's source; it's a Chromium user-agent-stylesheet
  default applied to `disabled`/`hidden` inputs that the server obviously can't predict during
  SSR. Don't chase this one - it reproduces on this class of input generally, not anything
  specific to a given change.

## Troubleshooting

- **`Cannot find module 'playwright'`**: it's a devDependency - run `pnpm install`, don't reach
  for a global/npx install.
- **`browserType.launch: Executable doesn't exist`**: run `npx playwright install chromium` once.
- **Dev server already running / `EADDRINUSE`**: kill whatever holds port 3000 first (see the
  PowerShell snippet above) before starting a new one.
- **`login` throws `no password given and STAMP4_ACCESS_SECRET is not set`**: either pass a
  password explicitly (`login <password>`) or export `STAMP4_ACCESS_SECRET` before launching the
  driver - it is not read from `.env.local` automatically by a plain `node` process outside
  Next.js.
