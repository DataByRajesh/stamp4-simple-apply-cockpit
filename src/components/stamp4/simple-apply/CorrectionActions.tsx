import type { CorrectionAction } from '@/lib/stamp4/simple-apply/types'

export function CorrectionActions({ actions }: { actions: CorrectionAction[] }) {
  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Correction actions</p>
        <h2>Before applying</h2>
      </div>
      {actions.length === 0 ? (
        <p>No correction actions generated. Review manually before applying.</p>
      ) : (
        <div className="grid two-grid">
          {actions.map((action) => (
            <article className="card" key={action.action}>
              <span className={`badge ${action.priority.toLowerCase()}`}>{action.priority}</span>
              <h3>{action.action}</h3>
              <p>{action.whyItMatters}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
