import { AlertSetupChecklist } from '@/components/stamp4/simple-apply/AlertSetupChecklist'
import { JobSourcesPanel } from '@/components/stamp4/simple-apply/JobSourcesPanel'

export default function SourcesAlertsPage() {
  return (
    <main className="shell stack">
      <section className="hero-panel">
        <p className="eyebrow">Stamp4 Simple Apply</p>
        <h1>Job sources &amp; alerts</h1>
        <p>Curated hunting list and native alert checklist, kept separate from the scoring cockpit.</p>
      </section>

      <JobSourcesPanel />
      <AlertSetupChecklist />
    </main>
  )
}
