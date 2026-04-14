import { useState, useMemo, useEffect, useRef } from 'react'
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
import { useMetrics } from '@/hooks/useMetrics'
import { useMetricsBuffer } from '@/hooks/useMetricsBuffer'
import type { MetricsDataPoint } from '@/types/api'

const TIME_RANGES = [
  { label: '1m', ms: 60_000 },
  { label: '5m', ms: 5 * 60_000 },
  { label: '15m', ms: 15 * 60_000 },
] as const

interface ScaleEvent {
  time: number
  label: string
}

export function LiveMetricsChart() {
  const { data: metrics } = useMetrics()
  const { getDataForRange } = useMetricsBuffer(metrics)
  const [rangeIndex, setRangeIndex] = useState(2) // default 15m
  const [chartData, setChartData] = useState<MetricsDataPoint[]>([])
  const scaleEventsRef = useRef<ScaleEvent[]>([])
  const prevWorkersRef = useRef<number | null>(null)

  // Track scale events
  useEffect(() => {
    if (!metrics) return
    if (prevWorkersRef.current !== null && prevWorkersRef.current !== metrics.runningWorkers) {
      scaleEventsRef.current.push({
        time: Date.now(),
        label: `${prevWorkersRef.current} \u2192 ${metrics.runningWorkers}`,
      })
      // Keep only last 10 events
      if (scaleEventsRef.current.length > 10) {
        scaleEventsRef.current = scaleEventsRef.current.slice(-10)
      }
    }
    prevWorkersRef.current = metrics.runningWorkers
  }, [metrics?.runningWorkers, metrics])

  // Update chart data on interval
  useEffect(() => {
    const range = TIME_RANGES[rangeIndex]
    const update = () => setChartData(getDataForRange(range.ms))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [rangeIndex, getDataForRange])

  const scaleEvents = useMemo(() => {
    const range = TIME_RANGES[rangeIndex]
    const cutoff = Date.now() - range.ms
    return scaleEventsRef.current.filter((e) => e.time >= cutoff)
  }, [chartData, rangeIndex]) // eslint-disable-line react-hooks/exhaustive-deps

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
              <p className="text-sm text-[#8792A2]">Collecting data...</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
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
              />
              <YAxis
                yAxisId="workers"
                orientation="right"
                domain={[0, 5]}
                tick={{ fontSize: 11, fill: '#8792A2' }}
                axisLine={false}
                tickLine={false}
                width={30}
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
                  name === 'queueDepth' ? 'Queue Depth' : 'Workers',
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
                dataKey="runningWorkers"
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
