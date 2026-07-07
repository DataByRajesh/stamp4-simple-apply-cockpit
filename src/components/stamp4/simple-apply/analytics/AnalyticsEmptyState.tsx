export const MIN_JOBS_FOR_ANALYTICS = 10

export function AnalyticsEmptyState({ jobCount }: { jobCount: number }) {
  return (
    <p className="notice info">
      Not enough data yet - {jobCount} tracked job{jobCount === 1 ? '' : 's'} so far. This view needs at least{' '}
      {MIN_JOBS_FOR_ANALYTICS} to say anything meaningful rather than over-reading a handful of points.
    </p>
  )
}
