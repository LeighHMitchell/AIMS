'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  SkipForward,
  Info,
} from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'
import type { ParsedActivity, ImportRules, BulkImportMeta, BatchStatus, BatchItemStatus } from './types'

interface BulkImportExecutionStepProps {
  activities: ParsedActivity[]
  selectedIds: Set<string>
  importRules: ImportRules
  meta: BulkImportMeta
  onComplete: (batchStatus: BatchStatus) => void
  batchId: string | null
  onBatchIdChange: (id: string) => void
}

export default function BulkImportExecutionStep({
  activities,
  selectedIds,
  importRules,
  meta,
  onComplete,
  batchId,
  onBatchIdChange,
}: BulkImportExecutionStepProps) {
  const [importing, setImporting] = useState(false)
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null)
  const startedRef = useRef(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const selectedActivities = activities.filter(a => selectedIds.has(a.iatiIdentifier))

  const startImport = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true
    setImporting(true)

    try {
      const response = await apiFetch('/api/iati/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: selectedActivities,
          selectedActivityIds: Array.from(selectedIds),
          importRules,
          meta: {
            sourceMode: meta.sourceMode,
            fileName: meta.sourceMode === 'datastore' ? 'IATI Datastore' : (meta.fileName || ''),
            fileHash: meta.fileHash || '',
            iatiVersion: meta.iatiVersion || '',
            reportingOrgRef: meta.reportingOrgRef,
            reportingOrgName: meta.reportingOrgName,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Import failed')
      }

      const result = await response.json()
      onBatchIdChange(result.batchId)

      // Start polling for status
      pollBatchStatus(result.batchId)
    } catch (error) {
      console.error('[Bulk Import] Import failed:', error)
      toast.error(error instanceof Error ? error.message : 'Import failed')
      setImporting(false)
    }
  }, [selectedActivities, selectedIds, importRules, meta, onBatchIdChange])

  const pollBatchStatus = useCallback(async (id: string) => {
    try {
      const response = await apiFetch(`/api/iati/bulk-import/${id}/status`)
      if (response.ok) {
        const status: BatchStatus = await response.json()
        setBatchStatus(status)

        if (status.status === 'completed' || status.status === 'failed') {
          setImporting(false)
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          onComplete(status)
          if (status.status === 'completed') {
            toast.success('Import completed successfully!')
          } else {
            toast.error('Import completed with errors')
          }
          return
        }
      }
    } catch (error) {
      console.error('[Bulk Import] Poll error:', error)
    }

    // Continue polling
    if (!pollRef.current) {
      pollRef.current = setInterval(() => pollBatchStatus(id), 2000)
    }
  }, [onComplete])

  useEffect(() => {
    startImport()
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const completedItems = batchStatus?.items?.filter(
    i => i.status === 'completed' || i.status === 'failed' || i.status === 'skipped'
  ).length || 0
  const totalItems = batchStatus?.totalActivities || selectedActivities.length
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {importing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                <span className="font-medium text-lg">
                  {importing
                    ? `Importing ${completedItems} of ${totalItems}...`
                    : 'Import Complete'}
                </span>
              </div>
              <span className="text-sm text-gray-500 font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />

            {batchStatus && (
              <div className="flex gap-6 text-sm">
                <span className="text-green-600">
                  Created: <span className="font-semibold">{batchStatus.createdCount}</span>
                </span>
                <span className="text-blue-600">
                  Updated: <span className="font-semibold">{batchStatus.updatedCount}</span>
                </span>
                <span className="text-gray-500">
                  Skipped: <span className="font-semibold">{batchStatus.skippedCount}</span>
                </span>
                <span className="text-red-600">
                  Failed: <span className="font-semibold">{batchStatus.failedCount}</span>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {importing && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            You can leave this page. The import will continue in the background.
          </AlertDescription>
        </Alert>
      )}

      {/* Per-activity status table */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_200px_120px_100px] gap-2 px-4 py-3 border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase">
            <div>Activity</div>
            <div>IATI ID</div>
            <div>Action</div>
            <div className="text-center">Status</div>
          </div>
          <ScrollArea className="h-80">
            {(batchStatus?.items || selectedActivities.map(a => ({
              iatiIdentifier: a.iatiIdentifier,
              activityTitle: a.title || '',
              action: 'pending' as const,
              status: 'queued' as const,
            } as BatchItemStatus))).map((item, i) => (
              <div
                key={item.iatiIdentifier || i}
                className="grid grid-cols-[1fr_200px_120px_100px] gap-2 px-4 py-3 border-b last:border-b-0 items-center"
              >
                <p className="text-sm truncate">{item.activityTitle || item.iatiIdentifier}</p>
                <p className="text-xs text-gray-500 truncate">{item.iatiIdentifier}</p>
                <div>
                  {item.action === 'create' && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Create</Badge>
                  )}
                  {item.action === 'update' && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Update</Badge>
                  )}
                  {item.action === 'skip' && (
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500">Skip</Badge>
                  )}
                  {item.action === 'fail' && (
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700">Failed</Badge>
                  )}
                  {item.action === 'pending' && (
                    <Badge variant="outline" className="text-xs">Pending</Badge>
                  )}
                </div>
                <div className="text-center">
                  {item.status === 'processing' && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 mx-auto" />
                  )}
                  {item.status === 'completed' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                  )}
                  {item.status === 'failed' && (
                    <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                  )}
                  {item.status === 'skipped' && (
                    <SkipForward className="h-4 w-4 text-gray-400 mx-auto" />
                  )}
                  {item.status === 'queued' && (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300 mx-auto" />
                  )}
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
