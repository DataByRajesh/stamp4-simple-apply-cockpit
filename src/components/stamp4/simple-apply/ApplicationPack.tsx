'use client'

import { Copy, Search } from 'lucide-react'
import { useState } from 'react'
import { copyToClipboard } from '@/lib/stamp4/simple-apply/clipboard'
import type { GenerationSource } from '@/lib/stamp4/simple-apply/generator'
import { buildRecruiterSearchUrl } from '@/lib/stamp4/simple-apply/recruiterSearch'
import type { ApplicationPack as ApplicationPackType } from '@/lib/stamp4/simple-apply/types'

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
      </div>
      <CopyBlock title="Why me answer" text={pack.whyMeAnswer} />
      <CopyBlock title="Project proof paragraph" text={pack.projectProofParagraph} />
    </section>
  )
}
