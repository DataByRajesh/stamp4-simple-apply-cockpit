const COUNTRIES = [
  ['Belgium', 'English + French/Dutch check'], ['Luxembourg', 'Finance and multilingual roles'],
  ['France', 'English-first roles only'], ['Spain', 'International tech hubs'], ['Portugal', 'English-first tech and fintech'],
  ['Sweden', 'English-friendly tech'], ['Denmark', 'English-friendly specialist roles'], ['Finland', 'English-friendly tech'],
  ['Austria', 'German requirement check'], ['Czechia', 'Prague international hubs'], ['Poland', 'International finance and tech'],
  ['Estonia', 'English-first digital companies'], ['Lithuania', 'Fintech and shared services'],
] as const

export default function EuExplorerPage() {
  return (
    <main className="shell stack">
      <section className="hero-panel"><p className="eyebrow">Weekly exploration</p><h1>EU Explorer</h1>
        <p>Lower-priority opportunities outside Ireland, Netherlands and Germany. Nothing here affects the daily sprint until it is promoted into the focused watchlist.</p>
      </section>
      <section className="panel stack">
        <div className="toolbar"><span className="badge">Weekly only</span><span className="badge low">Evidence required</span>
          <a href="https://eures.europa.eu/index_en" target="_blank" rel="noreferrer">Search official EURES</a></div>
        <div className="notice info">Promotion gate: strong role fit, workable language, credible relocation or visa route, and salary feasibility.</div>
        <div className="grid two-grid">{COUNTRIES.map(([country, focus]) =>
          <article className="card stack" key={country}><h3>{country}</h3><p className="muted">{focus}</p>
            <p>Track: employer evidence, role language, relocation wording, visa route, salary signal and application deadline.</p>
            <span className="badge low">Explorer tier</span></article>)}</div>
      </section>
    </main>
  )
}
