# Testing

This project had no test framework or test files before this document. It now uses
[Vitest](https://vitest.dev) for automated tests of the deterministic logic layer.

## Running tests

```
pnpm test          # run once
pnpm test:watch    # watch mode
```

`vitest.config.ts` maps the `@/*` path alias to `src/*`, matching `tsconfig.json`, so tests
import modules the same way the app does (`@/lib/stamp4/simple-apply/...`).

## What's covered, and why

Matches the architecture split in `stamp4_project_plan.md` (Section 2): deterministic logic
is automated here because it must be traceable and shouldn't silently regress; AI-generation
and cloud-backed routes are not, for the reasons in the table below.

| Module | Test file | Covers |
|---|---|---|
| `parser.ts` | `parser.test.ts` | Title/company/location/salary/skill/sponsorship-signal extraction against realistic pasted JD text |
| `scoring.ts` | `scoring.test.ts` | Role/domain/skill/permit/proof scoring math, salary-floor vs target-range split (Decision Log #7), decision thresholds (Apply Now / Proof Fix / Low Priority / Skip) |
| `proofMapper.ts` | `proofMapper.test.ts` | JD-requirement -> proof-asset keyword matching for each of the 6 mapping rules |
| `dashboardStats.ts` | `dashboardStats.test.ts` | Average score, application rate, weakest-scoring dimension tally, country split, empty-tracker edge case |
| `generator.ts` | `generator.test.ts` | The deterministic fallback content generators (`generateApplicationPackFallback`, `generateInterviewQuestionsFallback`, `generateCorrectionActionsFallback`) and the `isAIGenerationOutput`/`isInterviewQuestion`/etc. shape validators used to accept or reject the AI response — including the nullable `tamilAudioNote` case |

## What's explicitly not covered by automated tests, and how to check it instead

- **OpenAI generation (`generate/route.ts`, `source-discovery/route.ts`)** — calls a real
  external API and costs money per run. Verified manually by triggering the flow with
  `OPENAI_API_KEY` set and checking the response satisfies `isAIGenerationOutput`; the
  fallback path (used whenever AI generation fails) is what's covered automatically.
- **Supabase-backed API routes (`tracker`, `sources`, `alerts`, `settings`, `export`)** —
  need a live Supabase project + `STAMP4_ACCESS_SECRET`. Verified manually against a real
  project; the row <-> app-type mapping functions they use (`rowToJob`, `jobToInsert`, etc.)
  are simple enough to review by inspection rather than worth mocking Supabase for.
- **UI rendering/styling** — verified by running the dev server and driving it with a
  headless browser (see chat history for the Playwright script used to screenshot the
  cockpit page after the CSS rewrite and the Sprint Dashboard addition), not by automated
  component tests.

## Known behavior notes surfaced while writing these tests

Record here if a test reveals a real discrepancy between intended and actual behavior,
rather than fixing it silently — so it doesn't get re-discovered from scratch later.

Two bugs were caught this way and have since been fixed, with the tests updated from
"characterises the bug" to regression tests for the fix:

- **`parser.ts` `extractLocation` false-positives on "EU".** The EU/Europe check used to be
  a plain substring test (`lower.includes('eu')`), and the currency code "EUR" contains "eu"
  as a substring, so any EUR salary line (e.g. "Salary: EUR 48,000") got tagged with a false
  "eu" location signal. Fixed by matching location tokens on a word boundary instead of a
  bare substring. See `parser.test.ts` ("does not treat 'EUR' as an EU location signal").
- **`parser.ts` keyword matching missed plural forms.** `keywordMatches` used `\bkeyword\b`,
  so a JD requirement written as "settlement workflows" did not satisfy the core-skill
  keyword `workflow` (the trailing `s` broke the closing word boundary). Fixed with an
  optional trailing `s?` in the match. See `parser.test.ts` ("matches a whole-word keyword
  against a pluralised form of it").

Also fixed while reviewing, not caught by a test (no coverage existed for these components):
a duplicate `'systems analyst'` entry in `profile.ts`'s `targetRoleLane`, and a hardcoded
`"badge medium"` class on the source-discovery confidence badge in `JobSourcesPanel.tsx`
that ignored the real `suggestion.confidence` value.
