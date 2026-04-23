import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { useMetricsHistory } from '@/hooks/useMetricsHistory'
import { useMetrics } from '@/hooks/useMetrics'
import type { MetricsWindow } from '@/types/api'

const TIME_RANGES: { label: MetricsWindow }[] = [
  { label: '1m' },
  { label: '5m' },
  { label: '15m' },
  { label: '30m' },
]

interface ScaleEvent {
  time: number
  label: string
}

interface LiveTailPoint {
  time: number
  queueDepth: number
  activeWorkers: number
}

const LIVE_TAIL_BUCKET_MS = 3000

function bucketTimestamp(time: number): number {
  return Math.floor(time / LIVE_TAIL_BUCKET_MS) * LIVE_TAIL_BUCKET_MS
}

export function LiveMetricsChart() {
  const [rangeIndex, setRangeIndex] = useState(2) // default 15m
  const [liveTailPoints, setLiveTailPoints] = useState<LiveTailPoint[]>([])
  const window = TIME_RANGES[rangeIndex].label
  const { data, isLoading } = useMetricsHistory(window)
  const { data: liveMetrics } = useMetrics()

  const historyPoints = data?.points ?? []
  const latestHistoryPointTime = historyPoints.at(-1)?.time ?? 0

  useEffect(() => {
    setLiveTailPoints((current) =>
      current.filter((point) => point.time > latestHistoryPointTime)
    )
  }, [latestHistoryPointTime])

  useEffect(() => {
    if (liveMetrics == null) {
      return
    }

    const livePointTime = new Date(liveMetrics.timestamp).getTime()
    if (!Number.isFinite(livePointTime) || livePointTime <= latestHistoryPointTime) {
      return
    }

    const nextPoint: LiveTailPoint = {
      time: livePointTime,
      queueDepth: liveMetrics.queueDepth,
      activeWorkers: liveMetrics.activeWorkers,
    }

    setLiveTailPoints((current) => {
      const bucket = bucketTimestamp(nextPoint.time)
      const trimmed = current.filter((point) => point.time > latestHistoryPointTime)
      const existingIndex = trimmed.findIndex(
        (point) => bucketTimestamp(point.time) === bucket
      )

      if (existingIndex >= 0) {
        const updated = [...trimmed]
        updated[existingIndex] = nextPoint
        return updated
      }

      return [...trimmed, nextPoint].sort((a, b) => a.time - b.time)
    })
  }, [latestHistoryPointTime, liveMetrics])

  const chartData = useMemo(() => {
    const merged = new Map<number, LiveTailPoint>()

    for (const point of historyPoints) {
      merged.set(point.time, point)
    }

    for (const point of liveTailPoints) {
      if (point.time > latestHistoryPointTime) {
        merged.set(point.time, point)
      }
    }

    return Array.from(merged.values()).sort((a, b) => a.time - b.time)
  }, [historyPoints, latestHistoryPointTime, liveTailPoints])

  const scaleEvents = useMemo<ScaleEvent[]>(() => {
    const events: ScaleEvent[] = []
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1].activeWorkers
      const curr = chartData[i].activeWorkers
      if (prev !== curr) {
        events.push({
          time: chartData[i].time,
          label: `${prev} → ${curr}`,
        })
      }
    }
    return events.slice(-10)
  }, [chartData])

  const hasData = chartData.length > 2

  return (
    <Card className="border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <h3 className="text-base font-semibold text-[#0A2540]">Live Metrics</h3>
          <p className="text-xs text-[#8792A2]">Queue depth vs. running workers</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-[#E5E7EB] p-0.5">
          {TIME_RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIndex(i)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                rangeIndex === i
                  ? 'bg-[#F1F5F9] text-[#0A2540]'
                  : 'text-[#8792A2] hover:text-[#425466]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[280px] items-center justify-center">
            <div className="text-center">
              <Skeleton className="mx-auto mb-3 h-32 w-full max-w-md" />
              <p className="text-sm text-[#8792A2]">
                {isLoading ? 'Loading history...' : 'No data in this window yet.'}
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={chartData}
              margin={{ top: 40, right: 24, left: 8, bottom: 12 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E7EB"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tick={false}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="queue"
                orientation="left"
                tick={{ fontSize: 11, fill: '#8792A2' }}
                axisLine={false}
                tickLine={false}
                width={40}
                label={{
                  value: 'Queue Depth',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 2,
                  fill: '#635BFF',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              <YAxis
                yAxisId="workers"
                orientation="right"
                domain={[0, 5]}
                tick={{ fontSize: 11, fill: '#8792A2' }}
                axisLine={false}
                tickLine={false}
                width={44}
                label={{
                  value: 'Active Workers',
                  angle: 90,
                  position: 'insideRight',
                  offset: 2,
                  fill: '#00875A',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: '0 4px 12px rgba(16, 24, 40, 0.06)',
                }}
                labelFormatter={(value) => new Date(Number(value)).toLocaleTimeString()}
                formatter={(value, name) => [
                  String(value),
                  name === 'queueDepth' ? 'Queue Depth' : 'Active Workers',
                ]}
              />
              <Area
                yAxisId="queue"
                type="monotone"
                dataKey="queueDepth"
                stroke="#635BFF"
                strokeWidth={2}
                fill="#635BFF"
                fillOpacity={0.15}
                isAnimationActive={false}
              />
              <Line
                yAxisId="workers"
                type="stepAfter"
                dataKey="activeWorkers"
                stroke="#00875A"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {scaleEvents.map((event, i) => (
                <ReferenceLine
                  key={`${event.time}-${i}`}
                  yAxisId="queue"
                  x={event.time}
                  stroke="#635BFF"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  ifOverflow="extendDomain"
                  label={{
                    value: event.label,
                    position: 'top',
                    fontSize: 10,
                    fill: '#635BFF',
                    fontWeight: 600,
                  }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
