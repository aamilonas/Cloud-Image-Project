import { cn } from '@/lib/utils'
import type { JobStatus } from '@/types/api'

const statusConfig: Record<JobStatus, { label: string; dotClass: string; bgClass: string; textClass: string }> = {
  queued: {
    label: 'Queued',
    dotClass: 'bg-[#64748B]',
    bgClass: 'bg-[#F1F5F9]',
    textClass: 'text-[#64748B]',
  },
  processing: {
    label: 'Processing',
    dotClass: 'bg-[#0055CC] animate-pulse-dot',
    bgClass: 'bg-[#DEEBFF]',
    textClass: 'text-[#0055CC]',
  },
  completed: {
    label: 'Completed',
    dotClass: 'bg-[#00875A]',
    bgClass: 'bg-[#E3FCEF]',
    textClass: 'text-[#00875A]',
  },
  failed: {
    label: 'Failed',
    dotClass: 'bg-[#DE350B]',
    bgClass: 'bg-[#FFEBE6]',
    textClass: 'text-[#DE350B]',
  },
}

interface StatusChipProps {
  status: JobStatus
  size?: 'sm' | 'md'
  className?: string
}

export function StatusChip({ status, size = 'md', className }: StatusChipProps) {
  const config = statusConfig[status] ?? statusConfig.queued

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium transition-all duration-150',
        config.bgClass,
        config.textClass,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  )
}
