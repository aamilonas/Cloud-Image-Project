import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusChip } from './StatusChip'
import { useJob } from '@/hooks/useJob'
import { formatDuration, formatRelativeTime, truncateMiddle } from '@/lib/format'
import { Copy, Download, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface JobDetailDialogProps {
  jobId: string | null
  onClose: () => void
}

const VARIANT_LABELS: Record<string, string> = {
  thumbnail: 'Thumbnail',
  medium: 'Medium',
  grayscale: 'Grayscale',
  blur: 'Blur',
  edges: 'Edges',
}

export function JobDetailDialog({ jobId, onClose }: JobDetailDialogProps) {
  const { data: job } = useJob(jobId)

  const copyId = () => {
    if (job?.jobId) {
      navigator.clipboard.writeText(job.jobId)
      toast.success('Copied job ID')
    }
  }

  const allVariants = job
    ? [
        { key: 'original', label: 'Original', url: job.originalUrl },
        ...Object.entries(job.variants ?? {}).map(([key, url]) => ({
          key,
          label: VARIANT_LABELS[key] ?? key,
          url,
        })),
      ]
    : []

  return (
    <Dialog open={jobId !== null} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl">
        {!job ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <DialogTitle className="font-mono text-base font-semibold text-[#0A2540]">
                  {job.filename ?? truncateMiddle(job.jobId, 24)}
                </DialogTitle>
                <StatusChip status={job.status} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[#8792A2] hover:text-[#0A2540]"
                  onClick={copyId}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  <span className="text-xs">Copy ID</span>
                </Button>
              </div>
            </DialogHeader>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] p-4">
              {[
                ['Job ID', truncateMiddle(job.jobId, 24)],
                ['Created', formatRelativeTime(job.createdAt)],
                ['Started', formatRelativeTime(job.startedAt)],
                ['Completed', formatRelativeTime(job.completedAt)],
                ['Duration', formatDuration(job.durationMs)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between py-1">
                  <span className="text-xs font-medium text-[#8792A2]">{label}</span>
                  <span className="font-mono text-sm text-[#0A2540]">{value}</span>
                </div>
              ))}
            </div>

            {/* Variants gallery */}
            {job.status === 'processing' ? (
              <div className="relative grid grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-square w-full rounded-lg" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60">
                  <span className="text-sm font-medium text-[#425466]">Processing...</span>
                </div>
              </div>
            ) : job.status === 'failed' ? (
              <div className="rounded-lg border border-[#FFEBE6] bg-[#FFEBE6] p-6 text-center">
                <p className="text-sm font-medium text-[#DE350B]">
                  This job failed to process.
                </p>
              </div>
            ) : allVariants.length > 0 ? (
              <div className="grid grid-cols-6 gap-3">
                {allVariants.map((v) => (
                  <div key={v.key} className="group space-y-2">
                    <div className="relative aspect-square overflow-hidden rounded-lg border border-[#E5E7EB]">
                      {v.url ? (
                        <>
                          <img
                            src={v.url}
                            alt={v.label}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <a
                              href={v.url}
                              download
                              className="rounded-md bg-white p-1.5 text-[#0A2540] hover:bg-[#F1F5F9]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <a
                              href={v.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md bg-white p-1.5 text-[#0A2540] hover:bg-[#F1F5F9]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[#F1F5F9]">
                          <span className="text-xs text-[#8792A2]">N/A</span>
                        </div>
                      )}
                    </div>
                    <p className="text-center text-xs font-medium text-[#8792A2]">
                      {v.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
