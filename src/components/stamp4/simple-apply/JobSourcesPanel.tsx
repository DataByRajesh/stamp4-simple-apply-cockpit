'use client'

import { ExternalLink, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  addCustomSource,
  getCustomSources,
  getDaysSinceSourceCheck,
  JOB_SOURCES,
  recordSourceCheck,
  shouldPromptSourceCheck,
  type JobSource,
  type SuggestedSource,
} from '@/lib/stamp4/simple-apply/jobSources'
import { apiCall } from '@/lib/stamp4/simple-apply/storage'

const REGIONS: JobSource['region'][] = ['Ireland', 'Netherlands', 'EU-wide']

function regionLabel(region: JobSource['region']) {
  if (region === 'EU-wide') return 'EU-wide / FinTech-specific'
  return region
}

function suggestionToSource(suggestion: SuggestedSource): JobSource {
  return {
    name: suggestion.name,
    url: suggestion.url ?? '#',
    region: suggestion.region,
    bestFor: suggestion.reasoning,
    fintechRelevant: true,
    alertInstructions: 'Check platform for a saved-search or email-alert option near search results.',
    alertUrlHint: suggestion.url,
  }
}

export function JobSourcesPanel() {
  const [customSources, setCustomSources] = useState<JobSource[]>([])
  const [showReminder, setShowReminder] = useState(false)
  const [daysSinceCheck, setDaysSinceCheck] = useState<number | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestedSource[]>([])
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState<'success' | 'error' | 'info'>('info')
  const [addingName, setAddingName] = useState<string | null>(null)

  const sources = useMemo(() => [...JOB_SOURCES, ...customSources], [customSources])

  useEffect(() => {
    async function loadCloudSources() {
      try {
        const [custom, prompt, days] = await Promise.all([
          getCustomSources(),
          shouldPromptSourceCheck(),
          getDaysSinceSourceCheck(),
        ])
        setCustomSources(custom)
        setShowReminder(prompt)
        setDaysSinceCheck(days)
      } catch {
        setMessage('Cloud source settings unavailable. Static source list is still usable.')
        setMessageKind('error')
      }
    }

    void loadCloudSources()
  }, [])

  async function checkNow() {
    setIsChecking(true)
    setMessage('')

    try {
      const nextSuggestions = await apiCall<SuggestedSource[]>('source-discovery', {
        method: 'POST',
        body: JSON.stringify({ existingSources: sources }),
      })
      const filtered = nextSuggestions.filter(isSuggestedSource)

      setSuggestions(filtered)
      await recordSourceCheck()
      setShowReminder(false)
      setDaysSinceCheck(0)

      if (filtered.length) {
        setMessage(`Found ${filtered.length} new source suggestion${filtered.length === 1 ? '' : 's'}.`)
        setMessageKind('success')
      } else {
        setMessage('No useful new source suggestions returned this time.')
        setMessageKind('info')
      }
    } catch {
      setMessage('Source discovery is unavailable right now. Static source list is unchanged.')
      setMessageKind('error')
    } finally {
      setIsChecking(false)
    }
  }

  async function dismissForCycle() {
    try {
      await recordSourceCheck()
      setShowReminder(false)
      setDaysSinceCheck(0)
    } catch {
      setShowReminder(false)
      setMessage('Could not save the 2-week dismissal in cloud settings.')
      setMessageKind('error')
    }
  }

  async function addSuggestion(suggestion: SuggestedSource) {
    if (addingName) return
    setAddingName(suggestion.name)
    const source = suggestionToSource(suggestion)

    try {
      await addCustomSource(source)
      setCustomSources(await getCustomSources())
      setSuggestions((current) => current.filter((item) => item.name !== suggestion.name))
      setMessage(`Added ${suggestion.name} to custom sources.`)
      setMessageKind('success')
    } catch {
      setMessage('Could not save that source to Supabase.')
      setMessageKind('error')
    } finally {
      setAddingName(null)
    }
  }

  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Job sources</p>
        <h2>Manual JD hunting list</h2>
        <p>
          Curated places to find Ireland, Netherlands and EU FinTech systems roles. Static links only; no scraping or
          auto-import.
        </p>
      </div>

      {showReminder && (
        <div className="notice stack">
          <div>
            <strong>
              {daysSinceCheck === null
                ? 'You have not checked for new job sources yet.'
                : `It has been ${daysSinceCheck} days since you checked for new job sources.`}
            </strong>
            <p>14-day check-in. This only runs if you click; nothing happens in the background.</p>
          </div>
          <div className="source-actions">
            <button className="button" type="button" onClick={checkNow} disabled={isChecking}>
              <RefreshCw size={16} aria-hidden="true" />
              {isChecking ? 'Checking...' : 'Check now'}
            </button>
            <button className="button ghost" type="button" onClick={() => setShowReminder(false)} disabled={isChecking}>
              Remind me later
            </button>
            <button className="button secondary" type="button" onClick={dismissForCycle} disabled={isChecking}>
              Dismiss for 2 weeks
            </button>
          </div>
        </div>
      )}

      {message && <p className={`notice ${messageKind}`}>{message}</p>}

      {suggestions.length > 0 && (
        <div className="notice warning stack">
          <div>
            <strong>AI-suggested, unverified</strong>
            <p>Confirm each site is live before relying on it. Nothing is added unless you choose it.</p>
          </div>
          <div className="grid two-grid">
            {suggestions.map((suggestion) => (
              <article className="card stack" key={suggestion.name}>
                <div className="toolbar">
                  <h3>{suggestion.name}</h3>
                  <span className={`badge ${suggestion.confidence}`}>Confidence: {suggestion.confidence}</span>
                </div>
                <p>{suggestion.reasoning}</p>
                {suggestion.url ? (
                  <a className="source-link" href={suggestion.url} target="_blank" rel="noreferrer">
                    Open suggested link
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                ) : (
                  <p className="muted">No URL supplied - search manually.</p>
                )}
                <div className="source-actions">
                  <button
                    className="button secondary"
                    type="button"
                    disabled={addingName === suggestion.name}
                    onClick={() => addSuggestion(suggestion)}
                  >
                    {addingName === suggestion.name ? 'Adding...' : 'Add to my source list'}
                  </button>
                  <button
                    className="button ghost"
                    type="button"
                    disabled={addingName === suggestion.name}
                    onClick={() => setSuggestions((current) => current.filter((item) => item.name !== suggestion.name))}
                  >
                    Not useful
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="grid two-grid">
        {REGIONS.map((region) => {
          const regionSources = sources.filter((source) => source.region === region)

          return (
            <article className="card stack" key={region}>
              <h3>{regionLabel(region)}</h3>
              <div className="stack compact-stack">
                {regionSources.map((source) => (
                  <div className="source-row" key={`${source.region}-${source.name}`}>
                    <div className="source-heading">
                      {source.url === '#' ? (
                        <strong>{source.name}</strong>
                      ) : (
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.name}
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      )}
                      {source.fintechRelevant && <span className="badge ok">FinTech-relevant</span>}
                    </div>
                    <p>{source.bestFor}</p>
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function isSuggestedSource(value: unknown): value is SuggestedSource {
  if (!value || typeof value !== 'object') return false
  const suggestion = value as SuggestedSource
  return (
    typeof suggestion.name === 'string' &&
    (typeof suggestion.url === 'string' || suggestion.url === null) &&
    ['Ireland', 'Netherlands', 'EU-wide'].includes(suggestion.region) &&
    typeof suggestion.reasoning === 'string' &&
    ['high', 'medium', 'low'].includes(suggestion.confidence)
  )
}


