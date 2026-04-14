import type { LucideIcon } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: number
  formattedValue?: string
  secondaryText?: string
  icon: LucideIcon
  highlight?: boolean
  className?: string
}

export function KpiCard({
  label,
  value,
  formattedValue,
  secondaryText,
  icon: Icon,
  highlight,
  className,
}: KpiCardProps) {
  const animatedValue = useCountUp(value)

  const displayValue = formattedValue ?? animatedValue.toLocaleString('en-US')

  return (
    <div
      className={cn(
        'rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150',
        highlight && 'animate-highlight',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#8792A2]">
          {label}
        </span>
        <Icon className="h-4 w-4 text-[#8792A2]" />
      </div>
      <div className="mt-2">
        <span className="tabular-nums text-[32px] font-bold leading-none tracking-tight text-[#0A2540]">
          {displayValue}
        </span>
      </div>
      {secondaryText && (
        <p className="mt-1.5 text-xs text-[#8792A2]">{secondaryText}</p>
      )}
    </div>
  )
}
