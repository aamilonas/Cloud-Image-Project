import type {
  Job,
  MetricsHistoryResponse,
  MetricsWindow,
  SubmitJobRequest,
  SubmitJobResponse,
  SystemMetrics,
} from '@/types/api'

const API_URL = import.meta.env.VITE_API_URL as string

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

function normalizeStatus(status: Job['status'] | SubmitJobResponse['status'] | undefined): Job['status'] {
  if (status === 'queued' || status === 'pending' || status == null) {
    return 'pending'
  }
  return status
}

function normalizeJob(job: Job): Job {
  return {
    ...job,
    status: normalizeStatus(job.status),
  }
}

export async function submitJob(data: SubmitJobRequest): Promise<SubmitJobResponse> {
  const response = await request<SubmitJobResponse>('/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return {
    ...response,
    status: normalizeStatus(response.status),
  }
}

export async function getJob(jobId: string): Promise<Job> {
  const job = await request<Job>(`/jobs/${jobId}`)
  return normalizeJob(job)
}

export async function listJobs(): Promise<Job[]> {
  const data = await request<Job[] | { jobs: Job[] }>('/jobs')
  // Handle both array and wrapped response shapes
  if (Array.isArray(data)) return data.map(normalizeJob)
  if (data && 'jobs' in data && Array.isArray(data.jobs)) return data.jobs.map(normalizeJob)
  return []
}

export async function getMetrics(): Promise<SystemMetrics> {
  return request<SystemMetrics>('/metrics')
}

export async function getMetricsHistory(window: MetricsWindow): Promise<MetricsHistoryResponse> {
  return request<MetricsHistoryResponse>(`/metrics/history?window=${window}`)
}
