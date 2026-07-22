// Zero-cost recruiter-discovery helper: builds a LinkedIn people-search URL scoped to a
// company plus recruiter/talent-acquisition keywords, rather than looking up verified
// contact data ourselves. Real contact enrichment (verified emails, bulk lookups) needs a
// licensed data provider - out of scope for this tool. This just gets you from "found a
// role" to "here's who to message" in one click, using LinkedIn's own search.
export function buildRecruiterSearchUrl(companyName: string): string {
  const trimmed = companyName.trim()
  const keywords = trimmed ? `${trimmed} recruiter OR "talent acquisition"` : 'recruiter OR "talent acquisition"'

  const params = new URLSearchParams({ keywords })
  return `https://www.linkedin.com/search/results/people/?${params.toString()}`
}
