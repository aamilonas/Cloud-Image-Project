export type JobStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed'

export interface JobVariants {
  thumbnail?: string
  medium?: string
  grayscale?: string
  blur?: string
  edges?: string
}

export interface Job {
  jobId: string
  status: JobStatus
  filename?: string
  createdAt: string
  startedAt?: string | null
  completedAt?: string | null
  durationMs?: number | null
  variants?: JobVariants
  originalUrl?: string
}

export interface SubmitJobRequest {
  filename: string
  contentType: string
  imageBase64: string
}

export interface SubmitJobResponse {
  jobId: string
  status: JobStatus
  createdAt?: string
}

export interface SystemMetrics {
  queueDepth: number
  dlqDepth: number
  activeWorkers: number
  pendingWorkers: number
  desiredWorkers: number
  timestamp: string
}

export type MetricsWindow = '1m' | '5m' | '15m' | '30m'

export interface MetricsHistoryPoint {
  time: number
  queueDepth: number
  activeWorkers: number
}

export interface MetricsHistoryResponse {
  window: MetricsWindow
  periodSeconds: number
  points: MetricsHistoryPoint[]
}
