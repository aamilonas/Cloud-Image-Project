import { useQuery } from '@tanstack/react-query'
import { getJob } from '@/lib/api'
import type { Job } from '@/types/api'

export function useJob(jobId: string | null) {
  return useQuery<Job>({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  })
}
