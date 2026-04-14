import type { Job, SubmitJobRequest, SubmitJobResponse, SystemMetrics } from '@/types/api'

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

export async function submitJob(data: SubmitJobRequest): Promise<SubmitJobResponse> {
  return request<SubmitJobResponse>('/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getJob(jobId: string): Promise<Job> {
  return request<Job>(`/jobs/${jobId}`)
}

export async function listJobs(): Promise<Job[]> {
  const data = await request<Job[] | { jobs: Job[] }>('/jobs')
  // Handle both array and wrapped response shapes
  if (Array.isArray(data)) return data
  if (data && 'jobs' in data && Array.isArray(data.jobs)) return data.jobs
  return []
}

export async function getMetrics(): Promise<SystemMetrics> {
  return request<SystemMetrics>('/metrics')
}
