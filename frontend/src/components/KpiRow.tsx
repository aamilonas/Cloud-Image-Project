import { Inbox, Server, CheckCircle2, Timer, AlertTriangle } from 'lucide-react'
import { KpiCard } from './KpiCard'
import { useMetrics } from '@/hooks/useMetrics'
import { useDerivedMetrics } from '@/hooks/useDerivedMetrics'
import { formatDuration } from '@/lib/format'
import { useEffect, useRef, useState } from 'react'
import { useJobsSession } from '@/context/jobs-session'

export function KpiRow() {
  const { data } = useMetrics()
  const { jobs } = useJobsSession()
  const { jobsCompleted, jobsFailed, avgDurationMs } = useDerivedMetrics(jobs)
  const [workerHighlight, setWorkerHighlight] = useState(false)
  const prevWorkers = useRef<number | null>(null)

  const activeWorkers = data?.activeWorkers ?? 0
  const pendingWorkers = data?.pendingWorkers ?? 0
  const desiredWorkers = data?.desiredWorkers ?? 0
  const queueDepth = data?.queueDepth ?? 0
  const dlqDepth = data?.dlqDepth ?? 0

  useEffect(() => {
    if (data == null) return
    if (prevWorkers.current !== null && prevWorkers.current !== activeWorkers) {
      setWorkerHighlight(true)
      const timer = setTimeout(() => setWorkerHighlight(false), 1000)
      return () => clearTimeout(timer)
    }
    prevWorkers.current = activeWorkers
  }, [activeWorkers, data])

  const workersSecondary =
    pendingWorkers > 0
      ? `+${pendingWorkers} starting...`
      : activeWorkers > 0
        ? Array.from({ length: activeWorkers }).map(() => '\u25CF').join(' ')
        : 'Scaled to zero'

  const failedLabel = jobsFailed > 0 ? `${jobsFailed} failed` : undefined

  return (
    <div className="grid grid-cols-5 gap-4">
      <KpiCard
        label="Queue Depth"
        value={queueDepth}
        icon={Inbox}
      />
      <KpiCard
        label="Workers"
        value={activeWorkers}
        formattedValue={`${activeWorkers} / ${desiredWorkers}`}
        secondaryText={workersSecondary}
        icon={Server}
        highlight={workerHighlight}
      />
      <KpiCard
        label="DLQ Depth"
        value={dlqDepth}
        icon={AlertTriangle}
        danger={dlqDepth > 0}
      />
      <KpiCard
        label="Jobs Completed"
        value={jobsCompleted}
        secondaryText={failedLabel}
        icon={CheckCircle2}
      />
      <KpiCard
        label="Avg Duration"
        value={avgDurationMs}
        formattedValue={avgDurationMs > 0 ? formatDuration(avgDurationMs) : '\u2014'}
        icon={Timer}
      />
    </div>
  )
}
