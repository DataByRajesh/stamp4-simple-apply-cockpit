'use client'

import { Copy, ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { copyToClipboard } from '@/lib/stamp4/simple-apply/clipboard'
import { buildSuggestedSearchQuery, JOB_SOURCES, type JobSource } from '@/lib/stamp4/simple-apply/jobSources'
import { getAlertSetupStatus, setAlertSetupStatus } from '@/lib/stamp4/simple-apply/storage'

const REGIONS: JobSource['region'][] = ['Ireland', 'Netherlands', 'EU-wide']

function alertHref(source: JobSource) {
  return source.alertUrlHint ?? source.url
}

export function AlertSetupChecklist() {
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copyStatus, setCopyStatus] = useState<Record<string, 'copied' | 'error' | undefined>>({})

  async function handleCopyQuery(region: string, query: string) {
    const ok = await copyToClipboard(query)
    setCopyStatus((current) => ({ ...current, [region]: ok ? 'copied' : 'error' }))
    setTimeout(() => setCopyStatus((current) => ({ ...current, [region]: undefined })), 2000)
  }

  useEffect(() => {
    getAlertSetupStatus()
      .then(setStatusMap)
      .catch(() => {
        setError('Cloud alert checklist unavailable. Check Supabase and STAMP4 access secret env vars.')
      })
      .finally(() => setLoading(false))
  }, [])

  const completed = useMemo(
    () => JOB_SOURCES.filter((source) => statusMap[source.name]).length,
    [statusMap],
  )

  async function handleToggle(sourceName: string, done: boolean) {
    setStatusMap((current) => ({ ...current, [sourceName]: done }))

    try {
      await setAlertSetupStatus(sourceName, done)
    } catch {      setStatusMap((current) => ({ ...current, [sourceName]: !done }))
      setError('Could not save that alert status to Supabase.')
    }
  }

  const progressPercent = JOB_SOURCES.length ? Math.round((completed / JOB_SOURCES.length) * 100) : 0

  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Alert checklist</p>
        <h2>Set native job alerts</h2>
        <p>
          Use each platform&apos;s own alert feature - copy a search below, paste it into the matching site, then
          tick it off once its alert is set up. This checklist only tracks what Raj has manually set up.
        </p>
      </div>

      <div className="grid two-grid">
        {(['Ireland', 'Netherlands'] as const).map((region) => {
          const query = buildSuggestedSearchQuery(region)
          return (
            <article className="card stack" key={region}>
              <div className="toolbar">
                <h3>{region} search</h3>
                <button className="button secondary" type="button" onClick={() => handleCopyQuery(region, query)}>
                  <Copy size={16} aria-hidden="true" />
                  {copyStatus[region] === 'copied' ? 'Copied!' : copyStatus[region] === 'error' ? 'Copy failed' : 'Copy'}
                </button>
              </div>
              <pre className="text-block">{query}</pre>
            </article>
          )
        })}
      </div>

      <div className="stack compact-stack">
        <div className="toolbar">
          <strong>
            {completed} of {JOB_SOURCES.length} alerts set up
          </strong>
          {loading && <span className="muted">Loading cloud status...</span>}
        </div>
        <div className="meter">
          <div className="meter-fill" data-tier={progressPercent === 100 ? 'top' : 'high'} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {error && <p className="notice error">{error}</p>}

      <div className="grid two-grid">
        {REGIONS.map((region) => {
          const regionSources = JOB_SOURCES.filter((source) => source.region === region)
          if (!regionSources.length) return null

          return (
            <article className="card stack" key={region}>
              <h3>{region}</h3>
              <div className="stack compact-stack">
                {regionSources.map((source) => (
                  <label className="check-row" key={source.name}>
                    <input
                      type="checkbox"
                      checked={Boolean(statusMap[source.name])}
                      disabled={loading}
                      onChange={(event) => handleToggle(source.name, event.target.checked)}
                    />
                    <span className="check-content">
                      <span className="source-heading">
                        <a href={alertHref(source)} target="_blank" rel="noreferrer">
                          {source.name}
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                        {source.fintechRelevant && <span className="badge ok">FinTech-relevant</span>}
                      </span>
                      <span className="muted">{source.alertInstructions}</span>
                    </span>
                  </label>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

