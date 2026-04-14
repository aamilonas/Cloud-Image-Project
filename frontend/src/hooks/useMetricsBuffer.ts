import { useEffect, useRef, useCallback } from 'react'
import type { SystemMetrics, MetricsDataPoint } from '@/types/api'

const MAX_BUFFER_DURATION = 15 * 60 * 1000 // 15 minutes in ms

export function useMetricsBuffer(metrics: SystemMetrics | undefined) {
  const bufferRef = useRef<MetricsDataPoint[]>([])

  useEffect(() => {
    if (!metrics) return

    const now = Date.now()
    bufferRef.current.push({ ...metrics, time: now })

    // Trim old entries beyond 15 minutes
    const cutoff = now - MAX_BUFFER_DURATION
    bufferRef.current = bufferRef.current.filter((p) => p.time >= cutoff)
  }, [metrics])

  const getDataForRange = useCallback((rangeMs: number): MetricsDataPoint[] => {
    const now = Date.now()
    const cutoff = now - rangeMs
    return bufferRef.current.filter((p) => p.time >= cutoff)
  }, [])

  return { buffer: bufferRef, getDataForRange }
}
