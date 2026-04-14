import { formatDistanceToNowStrict } from 'date-fns'

const numberFormatter = new Intl.NumberFormat('en-US')

export function formatNumber(n: number): string {
  return numberFormatter.format(n)
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '\u2014'
  if (ms < 10_000) return `${formatNumber(Math.round(ms))} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return `${minutes}m ${seconds}s`
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '\u2014'
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true })
  } catch {
    return '\u2014'
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function truncateMiddle(str: string, maxLen: number = 16): string {
  if (str.length <= maxLen) return str
  const start = Math.ceil((maxLen - 1) / 2)
  const end = Math.floor((maxLen - 1) / 2)
  return `${str.slice(0, start)}\u2026${str.slice(-end)}`
}
