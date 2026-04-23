import { useQuery } from '@tanstack/react-query'
import { listJobs } from '@/lib/api'
import type { Job } from '@/types/api'

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: listJobs,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  })
}
