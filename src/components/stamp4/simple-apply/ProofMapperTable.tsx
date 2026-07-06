import type { ProofMapping } from '@/lib/stamp4/simple-apply/types'

export function ProofMapperTable({ proofs }: { proofs: ProofMapping[] }) {
  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Proof map</p>
        <h2>JD requirement to evidence</h2>
      </div>
      {proofs.length === 0 ? (
        <p>No direct proof mappings detected. Treat this as a weak proof-fit role unless the JD has hidden relevance.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>JD requirement</th>
                <th>Proof asset</th>
                <th>How to use</th>
              </tr>
            </thead>
            <tbody>
              {proofs.map((proof) => (
                <tr key={proof.jdRequirement}>
                  <td>{proof.jdRequirement}</td>
                  <td>{proof.proofAsset}</td>
                  <td>{proof.howToUse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
