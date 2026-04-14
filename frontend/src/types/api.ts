export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed'

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
  createdAt: string
}

export interface SystemMetrics {
  queueDepth: number
  messagesInFlight: number
  runningWorkers: number
  desiredWorkers: number
  jobsCompleted: number
  jobsFailed: number
  avgDurationMs: number
  timestamp: string
}

export interface MetricsDataPoint extends SystemMetrics {
  time: number
}
