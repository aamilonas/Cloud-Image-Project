import { Inbox, Server, CheckCircle2, Timer } from 'lucide-react'
import { KpiCard } from './KpiCard'
import { useMetrics } from '@/hooks/useMetrics'
import { formatNumber, formatDuration } from '@/lib/format'
import { useEffect, useRef, useState } from 'react'

export function KpiRow() {
  const { data } = useMetrics()
  const [workerHighlight, setWorkerHighlight] = useState(false)
  const prevWorkers = useRef<number | null>(null)

  useEffect(() => {
    if (data == null) return
    if (prevWorkers.current !== null && prevWorkers.current !== data.runningWorkers) {
      setWorkerHighlight(true)
      const timer = setTimeout(() => setWorkerHighlight(false), 1000)
      return () => clearTimeout(timer)
    }
    prevWorkers.current = data.runningWorkers
  }, [data?.runningWorkers, data])

  const queueDepth = data?.queueDepth ?? 0
  const runningWorkers = data?.runningWorkers ?? 0
  const desiredWorkers = data?.desiredWorkers ?? 0
  const jobsCompleted = data?.jobsCompleted ?? 0
  const avgDurationMs = data?.avgDurationMs ?? 0
  const messagesInFlight = data?.messagesInFlight ?? 0

  return (
    <div className="grid grid-cols-4 gap-4">
      <KpiCard
        label="Queue Depth"
        value={queueDepth}
        secondaryText={messagesInFlight > 0 ? `${formatNumber(messagesInFlight)} in flight` : undefined}
        icon={Inbox}
      />
      <KpiCard
        label="Workers"
        value={runningWorkers}
        formattedValue={`${runningWorkers} / ${desiredWorkers}`}
        secondaryText={
          runningWorkers > 0
            ? Array.from({ length: runningWorkers }).map(() => '\u25CF').join(' ')
            : 'Scaled to zero'
        }
        icon={Server}
        highlight={workerHighlight}
      />
      <KpiCard
        label="Jobs Completed"
        value={jobsCompleted}
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
