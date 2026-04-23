import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusChip } from './StatusChip'
import { formatDuration, formatRelativeTime, truncateMiddle } from '@/lib/format'
import { Eye } from 'lucide-react'
import type { JobStatus } from '@/types/api'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useJobsSession } from '@/context/jobs-session'

type Filter = 'all' | JobStatus

interface JobsTableProps {
  onViewJob: (jobId: string) => void
}

export function JobsTable({ onViewJob }: JobsTableProps) {
  const { jobs } = useJobsSession()
  const [filter, setFilter] = useState<Filter>('all')

  const filtered =
    jobs?.filter((job) => {
      if (filter === 'all') return true
      if (filter === 'processing') {
        return job.status === 'pending' || job.status === 'queued' || job.status === 'processing'
      }
      return job.status === filter
    }) ?? []
  const total = jobs?.length ?? 0

  const filters: { label: string; value: Filter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'processing' },
    { label: 'Completed', value: 'completed' },
    { label: 'Failed', value: 'failed' },
  ]

  return (
    <Card className="border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-baseline gap-3">
          <h3 className="text-base font-semibold text-[#0A2540]">Recent Jobs</h3>
          <span className="text-xs text-[#8792A2]">{total} total</span>
        </div>
        <div className="flex gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-[#F1F5F9] text-[#0A2540]'
                  : 'text-[#8792A2] hover:text-[#425466]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-[#E5E7EB] hover:bg-transparent">
              <TableHead className="w-10 pl-6"></TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-[#8792A2]">Filename</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-[#8792A2]">Status</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-[#8792A2]">Duration</TableHead>
              <TableHead className="text-[11px] font-medium uppercase tracking-wider text-[#8792A2]">Created</TableHead>
              <TableHead className="w-16 pr-6"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-8 w-8 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell className="pr-6"><Skeleton className="h-8 w-12" /></TableCell>
                  </TableRow>
                ))}
              </>
            )}
            {jobs.length > 0 && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-sm text-[#8792A2]">
                  No jobs yet. Upload an image or run a load test to get started.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((job) => (
              <TableRow
                key={job.jobId}
                className="border-[#E5E7EB] transition-colors hover:bg-[#F7FAFC]"
              >
                <TableCell className="pl-6">
                  {job.status === 'completed' && job.variants?.thumbnail ? (
                    <img
                      src={job.variants.thumbnail}
                      alt=""
                      className="h-8 w-8 rounded border border-[#E5E7EB] object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded border border-[#E5E7EB] bg-[#F1F5F9]" />
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm text-[#0A2540]">
                  {job.filename ?? truncateMiddle(job.jobId)}
                </TableCell>
                <TableCell>
                  <StatusChip status={job.status} size="sm" />
                </TableCell>
                <TableCell className="font-mono text-sm text-[#425466]">
                  {formatDuration(job.durationMs)}
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger className="text-sm text-[#8792A2]">
                      {formatRelativeTime(job.createdAt)}
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="font-mono text-xs">{job.createdAt}</span>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="pr-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[#8792A2] hover:text-[#0A2540]"
                    onClick={() => onViewJob(job.jobId)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
