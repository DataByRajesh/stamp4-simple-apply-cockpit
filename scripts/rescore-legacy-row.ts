/**
 * One-time fix for the legacy pre-rescale score on the Fenergo / Data Analyst row
 * (id: dda66b3c-a812-41f8-b18d-2bf0b6d5fa0d), flagged by the score-type migration.
 *
 * Reads the row's stored parsed_job, re-runs it through the CURRENT scoreJob()
 * engine, and updates score + score_breakdown to match every other row's /5 scale.
 *
 * Usage: npx tsx scripts/rescore-legacy-row.ts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getSupabaseServer } from '../src/lib/stamp4/simple-apply/supabaseServer'
import { scoreJob } from '../src/lib/stamp4/simple-apply/scoring'
import type { ParsedJob } from '../src/lib/stamp4/simple-apply/types'

const LEGACY_ROW_ID = 'dda66b3c-a812-41f8-b18d-2bf0b6d5fa0d'

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local')
  const content = readFileSync(envPath, 'utf8')

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex === -1) continue

    const key = trimmed.slice(0, equalsIndex)
    let value = trimmed.slice(equalsIndex + 1)
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

async function main() {
  loadEnvLocal()
  const supabase = getSupabaseServer()

  const { data: row, error: fetchError } = await supabase
    .from('tracked_jobs')
    .select('id, company, role_title, score, parsed_job')
    .eq('id', LEGACY_ROW_ID)
    .single()

  if (fetchError) throw fetchError
  if (!row) {
    console.error(`No row found with id ${LEGACY_ROW_ID}`)
    return
  }

  console.log(`Found row: ${row.company} / ${row.role_title}, current score: ${row.score}`)

  if (!row.parsed_job) {
    console.error(
      'No parsed_job stored on this row - cannot re-score automatically. ' +
        'You will need to find the original JD text and re-run it through the Cockpit UI instead.',
    )
    return
  }

  const parsedJob = row.parsed_job as ParsedJob
  const newScore = scoreJob(parsedJob)

  console.log(`Re-scored with current engine: ${newScore.total}/5 (${newScore.decision})`)
  console.log('Breakdown:', JSON.stringify(newScore, null, 2))

  const { error: updateError } = await supabase
    .from('tracked_jobs')
    .update({
      score: newScore.total,
      decision: newScore.decision,
      score_breakdown: newScore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', LEGACY_ROW_ID)

  if (updateError) throw updateError

  console.log(`Row updated: score ${row.score} -> ${newScore.total}`)
}

main().catch((err) => {
  console.error('Rescore failed:', err)
  process.exit(1)
})
