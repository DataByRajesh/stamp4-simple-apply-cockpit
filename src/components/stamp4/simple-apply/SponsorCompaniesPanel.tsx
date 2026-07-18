'use client'

import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiCall } from '@/lib/stamp4/simple-apply/storage'
import {
  addCustomSponsorCompany,
  getAllSponsorCompanies,
  sponsorRegisterLinks,
  type AtsProvider,
  type SponsorCompany,
} from '@/lib/stamp4/simple-apply/sponsorCompanies'

const COUNTRIES: SponsorCompany['country'][] = ['Ireland', 'Netherlands']

const EMPTY_FORM = {
  name: '',
  country: 'Ireland' as SponsorCompany['country'],
  sector: '',
  whySponsorFriendly: '',
  careersUrl: '',
  atsProvider: '' as AtsProvider | '',
  atsSlug: '',
}

type PollSummary = {
  at: string
  checkedCompanyCount: number
  failedCompanyCount: number
  newMatchCount: number
  emailedMatchCount: number
  emailed: boolean
}

export function SponsorCompaniesPanel() {
  const [companies, setCompanies] = useState<SponsorCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [pollSummary, setPollSummary] = useState<PollSummary | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  async function refresh() {
    setLoading(true)
    setLoadError('')

    try {
      setCompanies(await getAllSponsorCompanies())
    } catch {
      setLoadError('Cloud sponsor-company list unavailable. Check Supabase and STAMP4 access secret env vars.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => void refresh())
    apiCall<{ value: PollSummary | null }>('settings?key=last_sponsor_poll')
      .then(({ value }) => setPollSummary(value))
      .catch(() => {})
  }, [])

  async function handleAdd() {
    if (!form.name || !form.careersUrl || saving) return
    setSaving(true)
    setSaveMessage('')

    try {
      await addCustomSponsorCompany({
        name: form.name,
        country: form.country,
        sector: form.sector,
        whySponsorFriendly: form.whySponsorFriendly,
        careersUrl: form.careersUrl,
        atsProvider: form.atsProvider || null,
        atsSlug: form.atsProvider ? form.atsSlug || null : null,
      })
      setForm(EMPTY_FORM)
      setSaveMessage(`Added ${form.name}.`)
      await refresh()
    } catch {
      setSaveMessage('Could not save that company to Supabase.')
    } finally {
      setSaving(false)
    }
  }

  const registerLinks = sponsorRegisterLinks()

  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Sponsor companies</p>
        <h2>Ireland &amp; Netherlands sponsor-friendly watchlist</h2>
        <p>
          A curated starting point, not a verified-today snapshot - cross-check any specific company against the
          live official registers:{' '}
          <a href={registerLinks.ireland} target="_blank" rel="noreferrer">
            Ireland employment permit statistics
          </a>{' '}
          and{' '}
          <a href={registerLinks.netherlands} target="_blank" rel="noreferrer">
            Netherlands IND recognised sponsors register
          </a>
          .
        </p>
      </div>

      {pollSummary && (
        <p className="notice info">
          Last automated check: {new Date(pollSummary.at).toLocaleString()} - {pollSummary.checkedCompanyCount}{' '}
          companies checked, {pollSummary.newMatchCount} new matching role
          {pollSummary.newMatchCount === 1 ? '' : 's'} pre-scored, {pollSummary.emailedMatchCount} worth emailing
          {pollSummary.emailed ? ' (email sent)' : ''}.
        </p>
      )}

      {loading ? (
        <p>Loading sponsor companies...</p>
      ) : loadError ? (
        <p className="notice error">{loadError}</p>
      ) : (
        <div className="grid two-grid">
          {COUNTRIES.map((country) => (
            <article className="card stack" key={country}>
              <h3>{country}</h3>
              <div className="stack compact-stack">
                {companies
                  .filter((company) => company.country === country)
                  .map((company) => (
                    <div className="source-row" key={`${country}-${company.name}`}>
                      <div className="source-heading">
                        <a href={company.careersUrl} target="_blank" rel="noreferrer">
                          {company.name}
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                        <span className={`badge ${company.atsProvider ? 'ok' : 'low'}`}>
                          {company.atsProvider ? 'Auto-monitored' : 'Manual check'}
                        </span>
                      </div>
                      {company.sector && <p className="muted">{company.sector}</p>}
                      <p>{company.whySponsorFriendly}</p>
                    </div>
                  ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="stack">
        <h3>Add a company to the watchlist</h3>
        <div className="grid two-grid">
          <input
            className="input"
            placeholder="Company name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <select
            className="select"
            value={form.country}
            onChange={(event) =>
              setForm((current) => ({ ...current, country: event.target.value as SponsorCompany['country'] }))
            }
          >
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Sector (e.g. Payments FinTech)"
            value={form.sector}
            onChange={(event) => setForm((current) => ({ ...current, sector: event.target.value }))}
          />
          <input
            className="input"
            placeholder="Careers page URL"
            value={form.careersUrl}
            onChange={(event) => setForm((current) => ({ ...current, careersUrl: event.target.value }))}
          />
          <select
            className="select"
            value={form.atsProvider}
            onChange={(event) =>
              setForm((current) => ({ ...current, atsProvider: event.target.value as AtsProvider | '' }))
            }
          >
            <option value="">No auto-monitoring (manual check only)</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
            <option value="ashby">Ashby</option>
          </select>
          {form.atsProvider && (
            <input
              className="input"
              placeholder="ATS board token (e.g. the slug in the careers URL)"
              value={form.atsSlug}
              onChange={(event) => setForm((current) => ({ ...current, atsSlug: event.target.value }))}
            />
          )}
        </div>
        <textarea
          className="textarea"
          placeholder="Why is this company sponsor-friendly?"
          value={form.whySponsorFriendly}
          onChange={(event) => setForm((current) => ({ ...current, whySponsorFriendly: event.target.value }))}
        />
        <div className="toolbar">
          <button className="button" type="button" onClick={handleAdd} disabled={saving || !form.name || !form.careersUrl}>
            {saving ? 'Saving...' : 'Add company'}
          </button>
          {saveMessage && <p className="muted">{saveMessage}</p>}
        </div>
      </div>
    </section>
  )
}
