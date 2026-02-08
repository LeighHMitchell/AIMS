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
import type { BatchStatus, BatchItemStatus } from './types'

/** Format import detail counts with full readable labels and pluralisation */
function formatImportCounts(item: BatchItemStatus): string | null {
  const pl = (n: number, s: string) => `${n} ${n === 1 ? s : s + 's'}`;
  const parts: string[] = [];
  const d = item.importDetails;
  if (item.transactionsImported > 0) parts.push(pl(item.transactionsImported, 'transaction'));
  if (d?.organizations) parts.push(pl(d.organizations, 'organisation'));
  if (d?.budgets) parts.push(pl(d.budgets, 'budget'));
  if (d?.sectors) parts.push(pl(d.sectors, 'sector'));
  if (d?.locations) parts.push(pl(d.locations, 'location'));
  if (d?.contacts) parts.push(pl(d.contacts, 'contact'));
  if (d?.documents) parts.push(pl(d.documents, 'document'));
  if (d?.policyMarkers) parts.push(pl(d.policyMarkers, 'policy marker'));
  if (d?.humanitarianScopes) parts.push(pl(d.humanitarianScopes, 'humanitarian scope'));
  if (d?.tags) parts.push(pl(d.tags, 'tag'));
  if (d?.results) parts.push(pl(d.results, 'result'));
  if (d?.indicators) parts.push(pl(d.indicators, 'indicator'));
  if (d?.periods) parts.push(pl(d.periods, 'period'));
  return parts.length > 0 ? parts.join(', ') : null;
}

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
    const rows = [['IATI Identifier', 'Title', 'Action', 'Status', 'Activity ID', 'Transactions Imported', 'Organizations Imported', 'Budgets Imported', 'Sectors Imported', 'Locations Imported', 'Contacts Imported', 'Documents Imported', 'Policy Markers Imported', 'Humanitarian Scopes Imported', 'Tags Imported', 'Results Imported', 'Indicators Imported', 'Periods Imported', 'Error']]
    for (const item of batchStatus.items) {
      rows.push([
        item.iatiIdentifier,
        item.activityTitle,
        item.action,
        item.status,
        item.activityId || '',
        String(item.transactionsImported || 0),
        String(item.importDetails?.organizations || 0),
        String(item.importDetails?.budgets || 0),
        String(item.importDetails?.sectors || 0),
        String(item.importDetails?.locations || 0),
        String(item.importDetails?.contacts || 0),
        String(item.importDetails?.documents || 0),
        String(item.importDetails?.policyMarkers || 0),
        String(item.importDetails?.humanitarianScopes || 0),
        String(item.importDetails?.tags || 0),
        String(item.importDetails?.results || 0),
        String(item.importDetails?.indicators || 0),
        String(item.importDetails?.periods || 0),
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
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <Plus className="h-6 w-6 mx-auto mb-1 text-gray-700" />
              <p className="text-3xl font-bold text-gray-900">{batchStatus.createdCount}</p>
              <p className="text-sm text-gray-600">Created</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 mx-auto mb-1 text-gray-700" />
              <p className="text-3xl font-bold text-gray-900">{batchStatus.updatedCount}</p>
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
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-6 w-6 mx-auto mb-1 text-gray-700" />
              <p className="text-3xl font-bold text-gray-900">{batchStatus.failedCount}</p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {batchStatus.status === 'completed' && batchStatus.failedCount === 0 && (
        <Alert className="bg-gray-50 border-gray-300">
          <CheckCircle2 className="h-4 w-4 text-gray-700" />
          <AlertDescription className="text-gray-800">
            All activities were imported successfully!
          </AlertDescription>
        </Alert>
      )}
      {batchStatus.failedCount > 0 && (
        <Alert className="bg-gray-50 border-gray-300">
          <AlertTriangle className="h-4 w-4 text-gray-700" />
          <AlertDescription className="text-gray-800">
            {batchStatus.failedCount} activit{batchStatus.failedCount === 1 ? 'y' : 'ies'} failed to import. See details below.
          </AlertDescription>
        </Alert>
      )}

      {/* Failed Items Detail */}
      {failedItems.length > 0 && (
        <Card className="border-gray-300">
          <CardHeader>
            <CardTitle className="text-base text-gray-900">Failed Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {failedItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-100 rounded-lg">
                  <XCircle className="h-4 w-4 text-gray-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{item.activityTitle || item.iatiIdentifier}</p>
                    <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{item.iatiIdentifier}</span>
                    {item.errorMessage && (
                      <p className="text-xs text-gray-600 mt-1">{item.errorMessage}</p>
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
          <div className="grid grid-cols-[1fr_100px_200px] gap-2 px-4 py-3 border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase">
            <div>Activity</div>
            <div>Action</div>
            <div className="text-right">Import Details</div>
          </div>
          <ScrollArea className="h-64">
            {batchStatus.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_100px_200px] gap-2 px-4 py-3 border-b last:border-b-0 items-center"
              >
                <div className="min-w-0">
                  {item.activityId ? (
                    <button
                      onClick={() => router.push(`/activities/${item.activityId}`)}
                      className="text-sm text-left hover:text-gray-600 truncate block w-full"
                    >
                      {item.activityTitle || item.iatiIdentifier}
                    </button>
                  ) : (
                    <p className="text-sm truncate">{item.activityTitle || item.iatiIdentifier}</p>
                  )}
                  <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-0.5 inline-block">{item.iatiIdentifier}</span>
                </div>
                <div>
                  {item.action === 'create' && (
                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700">Created</Badge>
                  )}
                  {item.action === 'update' && (
                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700">Updated</Badge>
                  )}
                  {item.action === 'skip' && (
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500">Skipped</Badge>
                  )}
                  {item.action === 'fail' && (
                    <Badge variant="outline" className="text-xs bg-gray-200 text-gray-700">Failed</Badge>
                  )}
                </div>
                <div className="text-right text-xs text-gray-500">
                  {formatImportCounts(item) || '-'}
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
