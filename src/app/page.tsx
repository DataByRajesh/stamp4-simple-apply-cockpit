import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="landing">
      <section className="hero-panel">
        <p className="eyebrow">Private Stamp4 Tool</p>
        <h1>Simple Apply Cockpit</h1>
        <p>
          Paste a role description and check whether it moves Raj closer to an Ireland/EU FinTech systems analyst
          lane.
        </p>
        <div>
          <Link className="button" href="/stamp4/simple-apply">
            Open Cockpit
          </Link>
        </div>
      </section>
    </main>
  )
}
