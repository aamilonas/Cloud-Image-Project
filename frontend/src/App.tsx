import { useState } from 'react'
import { TopBar } from '@/components/TopBar'
import { KpiRow } from '@/components/KpiRow'
import { LiveMetricsChart } from '@/components/LiveMetricsChart'
import { UploadZone } from '@/components/UploadZone'
import { LoadTestPanel } from '@/components/LoadTestPanel'
import { JobsTable } from '@/components/JobsTable'
import { JobDetailDialog } from '@/components/JobDetailDialog'

export default function App() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <TopBar />

      <main className="mx-auto max-w-[1400px] px-8 py-12">
        <div className="flex flex-col gap-8">
          {/* KPI Row */}
          <KpiRow />

          {/* Live Metrics Chart */}
          <LiveMetricsChart />

          {/* Upload + Load Test */}
          <div className="grid grid-cols-2 gap-6">
            <UploadZone />
            <LoadTestPanel />
          </div>

          {/* Jobs Table */}
          <JobsTable onViewJob={setSelectedJobId} />
        </div>
      </main>

      {/* Job Detail Dialog */}
      <JobDetailDialog
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
      />
    </div>
  )
}
