'use client'

import { Copy } from 'lucide-react'
import { useState } from 'react'
import { copyToClipboard } from '@/lib/stamp4/simple-apply/clipboard'
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

export function ApplicationPack({ pack }: { pack: ApplicationPackType }) {
  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Application pack</p>
        <h2>Template text</h2>
      </div>
      <CopyBlock title="CV summary" text={pack.tailoredCvSummary} />
      <CopyBlock title="Top CV bullets" text={pack.topCvBullets.map((bullet) => `- ${bullet}`).join('\n')} />
      <CopyBlock title="Cover message" text={pack.coverMessage} />
      <CopyBlock title="Recruiter LinkedIn message" text={pack.recruiterLinkedInMessage} />
      <CopyBlock title="Why me answer" text={pack.whyMeAnswer} />
      <CopyBlock title="Project proof paragraph" text={pack.projectProofParagraph} />
    </section>
  )
}
