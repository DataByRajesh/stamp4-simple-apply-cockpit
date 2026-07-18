import { SeenPostingsTable } from '@/components/stamp4/simple-apply/SeenPostingsTable'
import { SponsorCompaniesPanel } from '@/components/stamp4/simple-apply/SponsorCompaniesPanel'
import { PermitEmployerUniverse } from '@/components/stamp4/simple-apply/PermitEmployerUniverse'
import { NetherlandsSponsorUniverse } from '@/components/stamp4/simple-apply/NetherlandsSponsorUniverse'

export default function SponsorCompaniesPage() {
  return (
    <main className="shell stack">
      <section className="hero-panel">
        <p className="eyebrow">Stamp4 Simple Apply</p>
        <h1>Sponsor companies</h1>
        <p>
          Ireland and Netherlands employers with a track record of work-permit/visa sponsorship. New roles from the
          ones we can monitor live are run through the same scoring engine as the Cockpit before you&apos;re emailed -
          Skip-tier matches are recorded but not sent.
        </p>
      </section>

      <PermitEmployerUniverse />
      <NetherlandsSponsorUniverse />
      <SponsorCompaniesPanel />
      <SeenPostingsTable />
    </main>
  )
}


