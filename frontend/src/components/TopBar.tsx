import { Layers } from 'lucide-react'
import { useMetrics } from '@/hooks/useMetrics'
import { cn } from '@/lib/utils'

export function TopBar() {
  const { dataUpdatedAt, isError } = useMetrics()

  const secondsAgo = dataUpdatedAt ? Math.floor((Date.now() - dataUpdatedAt) / 1000) : Infinity

  let statusColor = 'bg-[#00875A]'
  let statusLabel = 'Live'
  if (isError || secondsAgo > 30) {
    statusColor = 'bg-[#DE350B]'
    statusLabel = 'Disconnected'
  } else if (secondsAgo > 10) {
    statusColor = 'bg-[#974F0C]'
    statusLabel = 'Delayed'
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#635BFF]">
          <Layers className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-semibold text-[#0A2540]">Cloud Job Queue</span>
      </div>

      <div className="flex items-center gap-2">
        <span className={cn('inline-block h-2 w-2 rounded-full', statusColor)} />
        <span className="text-sm font-medium text-[#425466]">{statusLabel}</span>
        {dataUpdatedAt > 0 && (
          <span className="font-mono text-xs text-[#8792A2]">
            {secondsAgo}s ago
          </span>
        )}
      </div>
    </header>
  )
}
