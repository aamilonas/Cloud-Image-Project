import { useQuery } from '@tanstack/react-query'
import { getMetrics } from '@/lib/api'
import type { SystemMetrics } from '@/types/api'

export function useMetrics() {
  return useQuery<SystemMetrics>({
    queryKey: ['metrics'],
    queryFn: getMetrics,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  })
}
