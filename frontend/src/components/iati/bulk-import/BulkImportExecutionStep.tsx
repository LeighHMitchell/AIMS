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
  Circle,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { ParsedActivity, ImportRules, BulkImportMeta, BatchStatus, BatchItemStatus } from './types'

const CHUNK_SIZE = 10;

/** Format import detail counts with full readable labels and pluralisation */
function formatImportCounts(item: BatchItemStatus, mode: 'expected' | 'imported'): string | null {
  const pl = (n: number, s: string) => `${n} ${n === 1 ? s : s + 's'}`;
  const parts: string[] = [];

  if (mode === 'expected') {
    const d = item.importDetails;
    if (item.transactionsCount > 0) parts.push(pl(item.transactionsCount, 'transaction'));
    if (d?.organizationsTotal) parts.push(pl(d.organizationsTotal, 'organisation'));
    if (d?.budgetsTotal) parts.push(pl(d.budgetsTotal, 'budget'));
    if (d?.sectorsTotal) parts.push(pl(d.sectorsTotal, 'sector'));
    if (d?.locationsTotal) parts.push(pl(d.locationsTotal, 'location'));
    if (d?.contactsTotal) parts.push(pl(d.contactsTotal, 'contact'));
    if (d?.documentsTotal) parts.push(pl(d.documentsTotal, 'document'));
    if (d?.policyMarkersTotal) parts.push(pl(d.policyMarkersTotal, 'policy marker'));
    if (d?.humanitarianScopesTotal) parts.push(pl(d.humanitarianScopesTotal, 'humanitarian scope'));
    if (d?.tagsTotal) parts.push(pl(d.tagsTotal, 'tag'));
  } else {
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
  }

  return parts.length > 0 ? parts.join(', ') : null;
}

function splitIntoChunks<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

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
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const startedRef = useRef(false)

  const selectedActivities = activities.filter(a => selectedIds.has(a.iatiIdentifier))

  const pollBatchStatus = useCallback(async (id: string): Promise<BatchStatus | null> => {
    try {
      const response = await apiFetch(`/api/iati/bulk-import/${id}/status`)
      if (response.ok) {
        const status: BatchStatus = await response.json()
        setBatchStatus(status)
        return status
      }
    } catch (error) {
      console.error('[Bulk Import] Poll error:', error)
    }
    return null
  }, [])

  const startImport = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true
    setImporting(true)
    setImportError(null)

    try {
      // Step 1: Create batch (lightweight — just creates batch + items)
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
          organizationId: meta.organizationId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create import batch')
      }

      const result = await response.json()
      const newBatchId = result.batchId
      onBatchIdChange(newBatchId)

      // Poll once to get initial batch items for the UI
      await pollBatchStatus(newBatchId)

      // Step 2: Split activities into chunks and process sequentially
      const chunks = splitIntoChunks(selectedActivities, CHUNK_SIZE)
      setChunkProgress({ current: 0, total: chunks.length })

      for (let i = 0; i < chunks.length; i++) {
        setChunkProgress({ current: i + 1, total: chunks.length })

        let chunkSuccess = false;
        let retries = 0;
        const maxRetries = 1;

        while (!chunkSuccess && retries <= maxRetries) {
          try {
            const chunkResponse = await apiFetch(`/api/iati/bulk-import/${newBatchId}/process-chunk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                activities: chunks[i],
                importRules,
                meta: {
                  sourceMode: meta.sourceMode,
                  reportingOrgRef: meta.reportingOrgRef,
                  reportingOrgName: meta.reportingOrgName,
                },
                organizationId: meta.organizationId,
              }),
            })

            if (!chunkResponse.ok) {
              const errorData = await chunkResponse.json().catch(() => ({}))
              throw new Error(errorData.error || `Chunk ${i + 1} failed`)
            }

            const chunkResult = await chunkResponse.json()
            chunkSuccess = true

            // Poll status after each chunk to update UI
            const status = await pollBatchStatus(newBatchId)

            if (chunkResult.batchComplete || status?.status === 'completed' || status?.status === 'failed') {
              // Batch is done
              setImporting(false)
              if (status) {
                onComplete(status)
                if (status.status === 'completed') {
                  toast.success('Import completed successfully!')
                } else {
                  toast.error('Import completed with errors')
                }
              }
              return
            }
          } catch (chunkError) {
            retries++;
            if (retries > maxRetries) {
              console.error(`[Bulk Import] Chunk ${i + 1} failed after retry:`, chunkError)
              setImportError(
                `Failed to process chunk ${i + 1} of ${chunks.length}: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}. ` +
                `${i} of ${chunks.length} chunks were processed successfully.`
              )
              // Poll one more time to get final state
              const finalStatus = await pollBatchStatus(newBatchId)
              setImporting(false)
              if (finalStatus) {
                onComplete(finalStatus)
              }
              toast.error('Import stopped due to an error')
              return
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
      }

      // Final poll after all chunks
      const finalStatus = await pollBatchStatus(newBatchId)
      setImporting(false)
      if (finalStatus) {
        onComplete(finalStatus)
        if (finalStatus.status === 'completed') {
          toast.success('Import completed successfully!')
        } else {
          toast.error('Import completed with errors')
        }
      }
    } catch (error) {
      console.error('[Bulk Import] Import failed:', error)
      toast.error(error instanceof Error ? error.message : 'Import failed')
      setImportError(error instanceof Error ? error.message : 'Import failed')
      setImporting(false)
    }
  }, [selectedActivities, selectedIds, importRules, meta, onBatchIdChange, onComplete, pollBatchStatus])

  useEffect(() => {
    startImport()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const completedItems = batchStatus?.items?.filter(
    i => i.status === 'completed' || i.status === 'failed' || i.status === 'skipped'
  ).length || 0
  const totalItems = batchStatus?.totalActivities || selectedActivities.length
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Progress - Monochrome */}
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {importing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-gray-800" />
                )}
                <span className="font-medium text-lg">
                  {importing
                    ? `Importing ${completedItems} of ${totalItems}...`
                    : 'Import Complete'}
                </span>
              </div>
              <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded text-gray-700">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3 bg-gray-200 [&>div]:bg-gray-700" />

            {batchStatus && (
              <div className="flex gap-6 text-sm">
                <span className="text-gray-700">
                  Created: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{batchStatus.createdCount}</span>
                </span>
                <span className="text-gray-700">
                  Updated: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{batchStatus.updatedCount}</span>
                </span>
                <span className="text-gray-500">
                  Skipped: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{batchStatus.skippedCount}</span>
                </span>
                <span className="text-gray-700">
                  Failed: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{batchStatus.failedCount}</span>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {importing && chunkProgress && (
        <Alert className="bg-gray-50 border-gray-200">
          <Info className="h-4 w-4 text-gray-600" />
          <AlertDescription className="text-gray-700">
            Processing chunk {chunkProgress.current} of {chunkProgress.total}... Please keep this page open until the import completes.
          </AlertDescription>
        </Alert>
      )}

      {importError && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {importError}
          </AlertDescription>
        </Alert>
      )}

      {/* Per-activity status table - Monochrome */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_300px] gap-2 px-4 py-3 border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase">
            <div>Activity</div>
            <div className="text-right">Status</div>
          </div>
          <ScrollArea className="h-80">
            {[...(batchStatus?.items || selectedActivities.map(a => ({
              iatiIdentifier: a.iatiIdentifier,
              activityTitle: a.title || '',
              action: 'pending' as const,
              status: 'queued' as const,
            } as BatchItemStatus)))].sort((a, b) => {
              const order: Record<string, number> = { processing: 0, completed: 1, failed: 1, skipped: 1, queued: 2 };
              return (order[a.status] ?? 3) - (order[b.status] ?? 3);
            }).map((item, i) => (
              <div
                key={item.iatiIdentifier || i}
                className="grid grid-cols-[1fr_300px] gap-2 px-4 py-3 border-b last:border-b-0 items-center"
              >
                {/* Activity Title + IATI Identifier */}
                <div className="min-w-0">
                  <p className="text-sm truncate">
                    {item.activityTitle || item.iatiIdentifier}
                    <span className="ml-2 font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{item.iatiIdentifier}</span>
                  </p>
                </div>
                {/* Combined Status */}
                <div className="text-right flex items-center justify-end gap-2">
                  {item.status === 'queued' && (
                    <>
                      <Circle className="h-4 w-4 text-gray-300" />
                      <span className="text-xs text-gray-400">Pending</span>
                    </>
                  )}
                  {item.status === 'processing' && (
                    <div className="flex items-center gap-2 w-full">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-600 shrink-0" />
                      <div className="flex-1 min-w-0 text-right">
                        <span className="text-xs text-gray-600 block">Importing...</span>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden my-1">
                          <div
                            className="h-full bg-gray-500 rounded-full"
                            style={{
                              width: '100%',
                              animation: 'pulse 1.5s ease-in-out infinite',
                            }}
                          />
                        </div>
                        {formatImportCounts(item, 'expected') && (
                          <span className="text-[11px] text-gray-400 block">
                            {formatImportCounts(item, 'expected')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {item.status === 'completed' && item.action === 'create' && (
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-gray-700 shrink-0" />
                      <div className="text-xs text-gray-600 text-right">
                        <span className="font-mono">Created {item.completedAt ? format(new Date(item.completedAt), 'HH:mm:ss') : ''}</span>
                        {formatImportCounts(item, 'imported') && (
                          <span className="block text-[11px] text-gray-400">
                            Imported {formatImportCounts(item, 'imported')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {item.status === 'completed' && item.action === 'update' && (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-gray-700 shrink-0" />
                      <div className="text-xs text-gray-600 text-right">
                        <span className="font-mono">Updated {item.completedAt ? format(new Date(item.completedAt), 'HH:mm:ss') : ''}</span>
                        {formatImportCounts(item, 'imported') && (
                          <span className="block text-[11px] text-gray-400">
                            Imported {formatImportCounts(item, 'imported')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {item.status === 'completed' && item.action !== 'create' && item.action !== 'update' && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-gray-700 shrink-0" />
                      <span className="text-xs text-gray-600 font-mono">
                        Done {item.completedAt ? format(new Date(item.completedAt), 'HH:mm:ss') : ''}
                      </span>
                    </div>
                  )}
                  {item.status === 'failed' && (
                    <>
                      <XCircle className="h-4 w-4 text-gray-600" />
                      <span className="text-xs text-gray-500">Failed</span>
                    </>
                  )}
                  {item.status === 'skipped' && (
                    <>
                      <SkipForward className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-400">Skipped</span>
                    </>
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
