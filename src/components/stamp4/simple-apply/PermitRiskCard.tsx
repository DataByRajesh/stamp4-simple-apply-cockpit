import type { ParsedJob } from '@/lib/stamp4/simple-apply/types'

export function PermitRiskCard({ parsed }: { parsed: ParsedJob }) {
  const signals = parsed.sponsorshipSignals.length ? parsed.sponsorshipSignals : ['No explicit permit-risk phrase detected']

  return (
    <section className="card stack">
      <div>
        <p className="eyebrow">Permit risk</p>
        <h2>{parsed.country || 'Country unclear'}</h2>
        <p>{parsed.location || 'No location signal found'} {parsed.workPattern ? `- ${parsed.workPattern}` : ''}</p>
      </div>
      <div className="stack">
        {signals.map((signal) => (
          <span className={parsed.sponsorshipSignals.length ? 'badge high' : 'badge ok'} key={signal}>
            {signal}
          </span>
        ))}
      </div>
      {parsed.redFlags.length > 0 && <p>Red flags: {parsed.redFlags.join(', ')}</p>}
    </section>
  )
}
