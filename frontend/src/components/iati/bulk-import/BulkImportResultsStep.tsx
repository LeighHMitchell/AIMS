'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  RefreshCw,
  Download,
  ExternalLink,
  Plus,
  AlertTriangle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { BatchStatus } from './types'

interface BulkImportResultsStepProps {
  batchStatus: BatchStatus
  onStartNew: () => void
}

export default function BulkImportResultsStep({
  batchStatus,
  onStartNew,
}: BulkImportResultsStepProps) {
  const router = useRouter()

  const failedItems = batchStatus.items.filter(i => i.status === 'failed')
  const importedItems = batchStatus.items.filter(i => i.status === 'completed' && i.activityId)

  const downloadReport = () => {
    const rows = [['IATI Identifier', 'Title', 'Action', 'Status', 'Activity ID', 'Transactions Imported', 'Error']]
    for (const item of batchStatus.items) {
      rows.push([
        item.iatiIdentifier,
        item.activityTitle,
        item.action,
        item.status,
        item.activityId || '',
        String(item.transactionsImported || 0),
        item.errorMessage || '',
      ])
    }
    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-report-${batchStatus.id.substring(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <Plus className="h-6 w-6 mx-auto mb-1 text-green-600" />
              <p className="text-3xl font-bold text-green-600">{batchStatus.createdCount}</p>
              <p className="text-sm text-gray-600">Created</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 mx-auto mb-1 text-blue-600" />
              <p className="text-3xl font-bold text-blue-600">{batchStatus.updatedCount}</p>
              <p className="text-sm text-gray-600">Updated</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <SkipForward className="h-6 w-6 mx-auto mb-1 text-gray-500" />
              <p className="text-3xl font-bold text-gray-500">{batchStatus.skippedCount}</p>
              <p className="text-sm text-gray-600">Skipped</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-6 w-6 mx-auto mb-1 text-red-600" />
              <p className="text-3xl font-bold text-red-600">{batchStatus.failedCount}</p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {batchStatus.status === 'completed' && batchStatus.failedCount === 0 && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            All activities were imported successfully!
          </AlertDescription>
        </Alert>
      )}
      {batchStatus.failedCount > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            {batchStatus.failedCount} activit{batchStatus.failedCount === 1 ? 'y' : 'ies'} failed to import. See details below.
          </AlertDescription>
        </Alert>
      )}

      {/* Failed Items Detail */}
      {failedItems.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-800">Failed Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {failedItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{item.activityTitle || item.iatiIdentifier}</p>
                    <p className="text-xs text-gray-500">{item.iatiIdentifier}</p>
                    {item.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">{item.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Import Results</CardTitle>
            <CardDescription>{batchStatus.items.length} activities processed</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_200px_100px_100px_80px] gap-2 px-4 py-3 border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase">
            <div>Activity</div>
            <div>IATI ID</div>
            <div>Action</div>
            <div className="text-right">Transactions</div>
            <div className="text-center">Link</div>
          </div>
          <ScrollArea className="h-64">
            {batchStatus.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_200px_100px_100px_80px] gap-2 px-4 py-3 border-b last:border-b-0 items-center"
              >
                <p className="text-sm truncate">{item.activityTitle || item.iatiIdentifier}</p>
                <p className="text-xs text-gray-500 truncate">{item.iatiIdentifier}</p>
                <div>
                  {item.action === 'create' && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Created</Badge>
                  )}
                  {item.action === 'update' && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Updated</Badge>
                  )}
                  {item.action === 'skip' && (
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500">Skipped</Badge>
                  )}
                  {item.action === 'fail' && (
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700">Failed</Badge>
                  )}
                </div>
                <p className="text-sm text-right text-gray-600">{item.transactionsImported || 0}</p>
                <div className="text-center">
                  {item.activityId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => router.push(`/activities/${item.activityId}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Batch Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Batch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Batch ID:</span>{' '}
              <span className="font-mono text-xs">{batchStatus.id}</span>
            </div>
            <div>
              <span className="text-gray-500">Source:</span>{' '}
              <span className="font-medium">
                {batchStatus.sourceMode === 'datastore' ? 'IATI Datastore' : (batchStatus.fileName || 'XML Upload')}
              </span>
            </div>
            <div>
              <span className="text-gray-500">IATI Version:</span>{' '}
              <span className="font-medium">{batchStatus.iatiVersion || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500">Reporting Org:</span>{' '}
              <span className="font-medium">{batchStatus.reportingOrgName || batchStatus.reportingOrgRef}</span>
            </div>
            {batchStatus.startedAt && (
              <div>
                <span className="text-gray-500">Started:</span>{' '}
                <span className="font-medium">{new Date(batchStatus.startedAt).toLocaleString()}</span>
              </div>
            )}
            {batchStatus.completedAt && (
              <div>
                <span className="text-gray-500">Completed:</span>{' '}
                <span className="font-medium">{new Date(batchStatus.completedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {importedItems.length > 0 && (
          <Button onClick={() => router.push('/activities')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Imported Activities
          </Button>
        )}
        <Button variant="outline" onClick={downloadReport}>
          <Download className="h-4 w-4 mr-2" />
          Download Import Report
        </Button>
        <Button variant="outline" onClick={onStartNew}>
          <Plus className="h-4 w-4 mr-2" />
          Start New Import
        </Button>
      </div>
    </div>
  )
}
