'use client'

import { Copy, Mail, Search } from 'lucide-react'
import { useState } from 'react'
import { copyToClipboard } from '@/lib/stamp4/simple-apply/clipboard'
import type { ContactLookupResult } from '@/lib/stamp4/simple-apply/contactLookup'
import type { GenerationSource } from '@/lib/stamp4/simple-apply/generator'
import { buildRecruiterSearchUrl } from '@/lib/stamp4/simple-apply/recruiterSearch'
import type { ApplicationPack as ApplicationPackType } from '@/lib/stamp4/simple-apply/types'

function RecruiterContactLookup({ companyName }: { companyName: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<ContactLookupResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleLookup() {
    setState('loading')
    try {
      const response = await fetch(`/api/stamp4/simple-apply/contact-lookup?company=${encodeURIComponent(companyName)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Contact lookup failed.')
      setResult(data as ContactLookupResult)
      setState('done')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Contact lookup failed.')
      setState('error')
    }
  }

  return (
    <div className="stack">
      <button className="button secondary" type="button" onClick={handleLookup} disabled={state === 'loading'}>
        <Mail size={16} aria-hidden="true" />
        {state === 'loading' ? 'Looking up recruiter emails...' : `Find recruiter emails at ${companyName}`}
      </button>
      {state === 'error' && <p className="notice warning">{errorMessage}</p>}
      {state === 'done' && result && (
        result.contacts.length === 0 ? (
          <p className="notice">No recruiter or talent-acquisition contacts found for {companyName} on Apollo.</p>
        ) : (
          <ul className="text-block">
            {result.contacts.map((contact) => (
              <li key={`${contact.name}-${contact.email ?? 'no-email'}`}>
                <strong>{contact.name}</strong>
                {contact.title ? ` - ${contact.title}` : ''}
                {': '}
                {contact.email ? `${contact.email} (${contact.emailStatus})` : 'no email found'}
                {contact.linkedInUrl && (
                  <>
                    {' - '}
                    <a href={contact.linkedInUrl} target="_blank" rel="noopener noreferrer">
                      LinkedIn
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}

function CopyBlock({ title, text }: { title: string; text: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  async function handleCopy() {
    const ok = await copyToClipboard(text)
    setStatus(ok ? 'copied' : 'error')
    setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <h3>{title}</h3>
        <button className="button secondary" type="button" onClick={handleCopy}>
          <Copy size={16} aria-hidden="true" />
          {status === 'copied' ? 'Copied!' : status === 'error' ? 'Copy failed' : 'Copy'}
        </button>
      </div>
      <pre className="text-block">{text}</pre>
    </div>
  )
}

export function ApplicationPack({
  pack,
  source,
  companyName,
}: {
  pack: ApplicationPackType
  source: GenerationSource
  companyName: string
}) {
  return (
    <section className="panel stack">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Application pack</p>
          <h2>Template text</h2>
        </div>
        <span className={`badge ${source === 'ai' ? 'ok' : 'medium'}`}>
          {source === 'ai' ? 'AI-generated' : 'Fallback template'}
        </span>
      </div>
      {source === 'fallback' && (
        <p className="notice warning">
          AI generation was unavailable, so this pack, the interview questions and correction actions below are
          deterministic templates, not AI-written prose. Check NVIDIA_API_KEY and OPENAI_API_KEY if this is
          unexpected - either can generate the pack, OpenAI is the fallback if NVIDIA fails.
        </p>
      )}
      <CopyBlock title="CV summary" text={pack.tailoredCvSummary} />
      <CopyBlock title="Top CV bullets" text={pack.topCvBullets.map((bullet) => `- ${bullet}`).join('\n')} />
      <CopyBlock title="Cover message" text={pack.coverMessage} />
      <div className="stack">
        <CopyBlock title="Recruiter LinkedIn message" text={pack.recruiterLinkedInMessage} />
        <a
          className="button secondary"
          href={buildRecruiterSearchUrl(companyName)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Search size={16} aria-hidden="true" />
          Find a recruiter at {companyName} on LinkedIn
        </a>
        <RecruiterContactLookup companyName={companyName} />
      </div>
      <CopyBlock title="Why me answer" text={pack.whyMeAnswer} />
      <CopyBlock title="Project proof paragraph" text={pack.projectProofParagraph} />
    </section>
  )
}
