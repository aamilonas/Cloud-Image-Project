import { useQuery } from '@tanstack/react-query'
import { getMetricsHistory } from '@/lib/api'
import type { MetricsHistoryResponse, MetricsWindow } from '@/types/api'

export function useMetricsHistory(window: MetricsWindow) {
  return useQuery<MetricsHistoryResponse>({
    queryKey: ['metrics-history', window],
    queryFn: () => getMetricsHistory(window),
    // CloudWatch SQS metrics update at 60s granularity, so refetch at that
    // cadence. Without this the chart would freeze until the range changes.
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  })
}
