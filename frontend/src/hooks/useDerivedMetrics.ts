import { useMemo } from 'react'
import type { Job } from '@/types/api'

export interface DerivedMetrics {
  jobsCompleted: number
  jobsFailed: number
  avgDurationMs: number
}

export function useDerivedMetrics(jobs: Job[] | undefined): DerivedMetrics {
  return useMemo(() => {
    if (!jobs || jobs.length === 0) {
      return { jobsCompleted: 0, jobsFailed: 0, avgDurationMs: 0 }
    }
    let completed = 0
    let failed = 0
    let durationSum = 0
    let durationCount = 0
    for (const j of jobs) {
      if (j.status === 'completed') {
        completed++
        if (typeof j.durationMs === 'number' && j.durationMs > 0) {
          durationSum += j.durationMs
          durationCount++
        }
      } else if (j.status === 'failed') {
        failed++
      }
    }
    return {
      jobsCompleted: completed,
      jobsFailed: failed,
      avgDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    }
  }, [jobs])
}
