import { SponsorCompaniesPanel } from '@/components/stamp4/simple-apply/SponsorCompaniesPanel'

export default function SponsorCompaniesPage() {
  return (
    <main className="shell stack">
      <section className="hero-panel">
        <p className="eyebrow">Stamp4 Simple Apply</p>
        <h1>Sponsor companies</h1>
        <p>
          Ireland and Netherlands employers with a track record of work-permit/visa sponsorship, plus automated
          checks against the public job feeds of the ones we can monitor live.
        </p>
      </section>

      <SponsorCompaniesPanel />
    </main>
  )
}
