import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { submitJob } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useJobsSession } from '@/context/jobs-session'

const LOAD_TEST_OPTIONS = [
  { count: 25, label: '25', recommended: false },
  { count: 50, label: '50', recommended: false },
  { count: 200, label: '200', recommended: true },
]

export function LoadTestPanel() {
  const queryClient = useQueryClient()
  const { addSessionJob } = useJobsSession()
  const [confirmCount, setConfirmCount] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)

  const runLoadTest = useCallback(
    async (count: number) => {
      setSubmitting(true)
      setProgress(0)
      setTotal(count)
      setConfirmCount(null)

      // Load sample image
      let sampleBase64: string
      try {
        const res = await fetch('/sample.jpg')
        const blob = await res.blob()
        const reader = new FileReader()
        sampleBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1])
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      } catch {
        toast.error('Could not load sample image. Upload an image first, then try again.')
        setSubmitting(false)
        return
      }

      let completed = 0
      let failed = 0

      // Submit with 100ms stagger to avoid Lambda cold-start issues
      for (let i = 0; i < count; i++) {
        submitJob({
          filename: `load-test-${i + 1}.jpg`,
          contentType: 'image/jpeg',
          imageBase64: sampleBase64,
        })
          .then((response) => {
            addSessionJob({
              jobId: response.jobId,
              status: response.status,
              filename: `load-test-${i + 1}.jpg`,
              createdAt: response.createdAt ?? new Date().toISOString(),
              startedAt: null,
              completedAt: null,
              durationMs: null,
            })
            completed++
            setProgress(completed + failed)
          })
          .catch(() => {
            failed++
            setProgress(completed + failed)
          })

        // 100ms stagger between submissions
        if (i < count - 1) {
          await new Promise((r) => setTimeout(r, 100))
        }
      }

      // Wait for all to complete
      const waitForAll = () => {
        return new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (completed + failed >= count) {
              clearInterval(check)
              resolve()
            }
          }, 200)
        })
      }
      await waitForAll()

      setSubmitting(false)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })

      if (failed > 0) {
        toast.error(`${failed} of ${count} jobs failed to submit`)
      } else {
        toast.success(`${count} jobs submitted — watch the workers scale up`)
      }
    },
    [addSessionJob, queryClient]
  )

  return (
    <>
      <Card className="border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <CardHeader className="pb-2">
          <h3 className="text-base font-semibold text-[#0A2540]">Load Test</h3>
          <p className="text-xs text-[#8792A2]">
            Simulate a burst of jobs to demonstrate auto-scaling
          </p>
        </CardHeader>
        <CardContent>
          {submitting ? (
            <div className="flex flex-col gap-3 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-[#425466]">Submitting jobs...</span>
                <span className="tabular-nums font-mono text-sm text-[#8792A2]">
                  {progress} / {total}
                </span>
              </div>
              <Progress value={(progress / total) * 100} className="h-2" />
            </div>
          ) : (
            <div className="flex gap-3 pt-2">
              {LOAD_TEST_OPTIONS.map((opt) => (
                <div key={opt.count} className="relative flex-1">
                  {opt.recommended && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#635BFF] px-2 py-0.5 text-[10px] font-medium text-white">
                      Recommended
                    </span>
                  )}
                  <Button
                    variant="outline"
                    className="flex h-20 w-full flex-col gap-1 border-[#E5E7EB] hover:border-[#D1D5DB]"
                    onClick={() => setConfirmCount(opt.count)}
                  >
                    <span className="tabular-nums text-2xl font-bold text-[#0A2540]">{opt.label}</span>
                    <span className="text-xs text-[#8792A2]">jobs</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmCount !== null} onOpenChange={() => setConfirmCount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit {confirmCount} jobs?</DialogTitle>
            <DialogDescription>
              This will trigger auto-scaling. Workers will spin up to process the queue and scale back down when done.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCount(null)}>
              Cancel
            </Button>
            <Button onClick={() => confirmCount && runLoadTest(confirmCount)}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
