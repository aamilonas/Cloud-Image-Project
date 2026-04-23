import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getJob } from '@/lib/api'
import { useJobs } from '@/hooks/useJobs'
import type { Job, JobStatus } from '@/types/api'

interface JobsSessionContextValue {
  jobs: Job[]
  sessionJobs: Job[]
  addSessionJob: (job: Job) => void
  addSessionJobs: (jobs: Job[]) => void
}

const JobsSessionContext = createContext<JobsSessionContextValue | null>(null)

const TERMINAL_STATUSES = new Set<JobStatus>(['completed', 'failed'])
const ACTIVE_STATUSES = new Set<JobStatus>(['pending', 'queued', 'processing'])

function statusRank(status: JobStatus): number {
  switch (status) {
    case 'failed':
      return 4
    case 'completed':
      return 3
    case 'processing':
      return 2
    case 'pending':
    case 'queued':
    default:
      return 1
  }
}

function mergeTwoJobs(primary: Job, secondary?: Job): Job {
  if (secondary == null) {
    return primary
  }

  const preferredStatus =
    statusRank(primary.status) >= statusRank(secondary.status)
      ? primary.status
      : secondary.status

  return {
    ...secondary,
    ...primary,
    status: preferredStatus,
    filename: primary.filename ?? secondary.filename,
    createdAt: primary.createdAt ?? secondary.createdAt,
    startedAt: primary.startedAt ?? secondary.startedAt ?? null,
    completedAt: primary.completedAt ?? secondary.completedAt ?? null,
    durationMs: primary.durationMs ?? secondary.durationMs ?? null,
    originalUrl: primary.originalUrl ?? secondary.originalUrl,
    variants: {
      ...(secondary.variants ?? {}),
      ...(primary.variants ?? {}),
    },
  }
}

function upsertJobs(currentJobs: Job[], incomingJobs: Job[]): Job[] {
  const byId = new Map<string, Job>()

  for (const job of currentJobs) {
    byId.set(job.jobId, job)
  }

  for (const job of incomingJobs) {
    const existing = byId.get(job.jobId)
    byId.set(job.jobId, existing ? mergeTwoJobs(job, existing) : job)
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function mergeJobLists(apiJobs: Job[], sessionJobs: Job[]): Job[] {
  return upsertJobs(apiJobs, sessionJobs)
}

export function JobsSessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const { data: apiJobs = [] } = useJobs()
  const [sessionJobs, setSessionJobs] = useState<Job[]>([])
  const isPollingRef = useRef(false)

  const addSessionJobs = useCallback((jobs: Job[]) => {
    if (jobs.length === 0) return
    setSessionJobs((current) => upsertJobs(current, jobs))
  }, [])

  const addSessionJob = useCallback(
    (job: Job) => {
      addSessionJobs([job])
    },
    [addSessionJobs]
  )

  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (document.hidden || isPollingRef.current) {
        return
      }

      const activeJobs = sessionJobs.filter((job) => ACTIVE_STATUSES.has(job.status)).slice(0, 5)

      if (activeJobs.length === 0) {
        return
      }

      isPollingRef.current = true

      try {
        const refreshedJobs = await Promise.all(
          activeJobs.map(async (job) => {
            try {
              return await getJob(job.jobId)
            } catch {
              return job
            }
          })
        )

        setSessionJobs((current) => upsertJobs(current, refreshedJobs))

        const settledJobs = refreshedJobs.filter((job) => TERMINAL_STATUSES.has(job.status))
        if (settledJobs.length > 0) {
          void queryClient.invalidateQueries({ queryKey: ['jobs'] })
        }
      } finally {
        isPollingRef.current = false
      }
    }, 3000)

    return () => window.clearInterval(interval)
  }, [queryClient, sessionJobs])

  const jobs = useMemo(() => mergeJobLists(apiJobs, sessionJobs), [apiJobs, sessionJobs])

  const value = useMemo(
    () => ({
      jobs,
      sessionJobs,
      addSessionJob,
      addSessionJobs,
    }),
    [addSessionJob, addSessionJobs, jobs, sessionJobs]
  )

  return <JobsSessionContext.Provider value={value}>{children}</JobsSessionContext.Provider>
}

export function useJobsSession() {
  const context = useContext(JobsSessionContext)
  if (context == null) {
    throw new Error('useJobsSession must be used within JobsSessionProvider')
  }
  return context
}
