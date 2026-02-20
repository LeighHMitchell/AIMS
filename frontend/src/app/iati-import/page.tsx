"use client"

import { useState, useCallback, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDropzone } from 'react-dropzone'
import { useUser } from '@/hooks/useUser'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Upload,
  FileCode,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  History,
  Building2,
  Activity,
  CreditCard,
  FileWarning,
  Undo2,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Database,
  AlertTriangle,
  ClipboardPaste,
  Globe,
  Search,
  SkipForward,
  RefreshCw,
  Plus,
  Download,
  Trash2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { IATIImportSkeleton } from '@/components/skeletons'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api-fetch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import BulkImportWizard from '@/components/iati/bulk-import/BulkImportWizard'

interface ImportSummary {
  activities: number
  organizations: number
  transactions: number
  errors: number
}

interface ParsedData {
  activities: any[]
  organizations: any[]
  transactions: any[]
  unmapped: {
    activities: any[]
    organizations: any[]
    transactions: any[]
  }
}

interface ImportProgress {
  total: number
  completed: number
  current: string
  errors: string[]
}

type ImportStep = 'upload' | 'parse' | 'summary' | 'organizations' | 'activities' | 'transactions' | 'complete'
type ImportPhase = 'review' | 'importing' | 'done'

interface ImportState {
  organizations: {
    phase: ImportPhase
    selected: Set<string>
    imported: string[]
    errors: string[]
  }
  activities: {
    phase: ImportPhase
    selected: Set<string>
    imported: string[]
    errors: string[]
  }
  transactions: {
    phase: ImportPhase
    selected: Set<string>
    imported: string[]
    errors: string[]
  }
}

/**
 * Enhanced History Tab with drill-down, filters, search, pagination, CSV export, and delete.
 */
function HistoryTab() {
  const { user } = useUser()
  const isSuperUser = user?.role === 'super_user'

  const [historyData, setHistoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null)
  const [batchItems, setBatchItems] = useState<any[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null)
  const [exportingBatchId, setExportingBatchId] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLimit, setPageLimit] = useState(20)
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageLimit))

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1) // Reset to page 1 on search change
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const [historyError, setHistoryError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setHistoryError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      params.set('page', String(currentPage))
      params.set('limit', String(pageLimit))
      const response = await apiFetch(`/api/iati/history?${params.toString()}`)
      if (response.ok) {
        const result = await response.json()
        // Handle new paginated response format
        if (result.data && result.pagination) {
          setHistoryData(result.data)
          setTotalCount(result.pagination.total)
        } else if (Array.isArray(result)) {
          // Backward compat
          setHistoryData(result)
          setTotalCount(result.length)
        } else {
          setHistoryData([])
          setTotalCount(0)
        }
      } else {
        const errData = await response.json().catch(() => ({}))
        console.error('Failed to fetch import history:', errData)
        setHistoryError(errData.error || `Server error (${response.status})`)
      }
    } catch (error) {
      console.error('Failed to fetch import history:', error)
      setHistoryError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, debouncedSearch, currentPage, pageLimit])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Reset to page 1 when filter changes
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  const handlePageLimitChange = (newLimit: number) => {
    setPageLimit(newLimit)
    setCurrentPage(1)
  }

  const fetchBatchItems = async (batchId: string) => {
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null)
      setBatchItems([])
      return
    }
    setExpandedBatchId(batchId)
    setLoadingItems(true)
    try {
      const response = await apiFetch(`/api/iati/history?batchId=${batchId}`)
      if (response.ok) {
        const data = await response.json()
        setBatchItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch batch items:', error)
    } finally {
      setLoadingItems(false)
    }
  }

  const exportBatchCsv = async (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExportingBatchId(batchId)
    try {
      const response = await apiFetch(`/api/iati/history?batchId=${batchId}&format=csv`)
      if (response.ok) {
        const blob = await response.blob()
        const disposition = response.headers.get('Content-Disposition')
        const filenameMatch = disposition?.match(/filename="?([^"]+)"?/)
        const filename = filenameMatch?.[1] || `import-${batchId.substring(0, 8)}.csv`
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      } else {
        toast.error('Failed to export CSV')
      }
    } catch {
      toast.error('Failed to export CSV')
    } finally {
      setExportingBatchId(null)
    }
  }

  const deleteBatch = async (batchId: string, batchName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete import "${batchName}"? This removes the import history record only — imported activities are not affected.`)) return
    setDeletingBatchId(batchId)
    try {
      const res = await apiFetch('/api/iati/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      })
      if (res.ok) {
        toast.success('Import history deleted')
        if (expandedBatchId === batchId) {
          setExpandedBatchId(null)
          setBatchItems([])
        }
        fetchHistory()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to delete')
      }
    } catch {
      toast.error('Failed to delete import history')
    } finally {
      setDeletingBatchId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
      case 'importing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Importing</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="h-3 w-3 mr-1" />{status}</Badge>
    }
  }

  const getItemActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="h-3.5 w-3.5 text-gray-700" />
      case 'update': return <RefreshCw className="h-3.5 w-3.5 text-gray-700" />
      case 'skip': return <SkipForward className="h-3.5 w-3.5 text-gray-400" />
      case 'fail': return <XCircle className="h-3.5 w-3.5 text-red-500" />
      default: return <Clock className="h-3.5 w-3.5 text-gray-400" />
    }
  }

  const startIndex = (currentPage - 1) * pageLimit
  const endIndex = startIndex + historyData.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import History</CardTitle>
        <CardDescription>
          View past bulk imports and their status. Click a batch to see individual activity details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by organisation or file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1">
            {['all', 'completed', 'failed', 'importing', 'cancelled'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter(status)}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* History List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-gray-500">Loading history...</span>
            </div>
          ) : historyError ? (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm">{historyError}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={fetchHistory}>Retry</Button>
            </div>
          ) : historyData.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No import history found</p>
          ) : (
            historyData.map((record) => {
              const isExpanded = expandedBatchId === record.id
              return (
                <div key={record.id} className="border rounded-lg overflow-hidden">
                  {/* Batch Row */}
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
                    onClick={() => fetchBatchItems(record.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{record.reportingOrgName || record.fileName}</p>
                          {record.sourceMode === 'datastore' && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              <Globe className="h-3 w-3 mr-1" />
                              Registry
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          By {record.userName} · {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                          <span className="hidden sm:inline text-gray-400 ml-1" title={new Date(record.timestamp).toLocaleString()}>
                            ({new Date(record.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                          </span>
                        </p>
                        <div className="flex gap-3 mt-1.5 text-xs">
                          <span className="text-gray-700 font-mono bg-muted px-1.5 py-0.5 rounded">{record.totalActivities} total</span>
                          {record.createdCount > 0 && <span className="text-gray-700">{record.createdCount} created</span>}
                          {record.updatedCount > 0 && <span className="text-gray-700">{record.updatedCount} updated</span>}
                          {record.skippedCount > 0 && <span className="text-gray-500">{record.skippedCount} skipped</span>}
                          {record.failedCount > 0 && <span className="text-red-600">{record.failedCount} failed</span>}
                        </div>
                        {record.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">{record.errorMessage}</p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 ml-3 flex items-center gap-1">
                      {getStatusBadge(record.status)}
                      {/* Export CSV */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 ml-1"
                        title="Export CSV"
                        disabled={exportingBatchId === record.id}
                        onClick={(e) => exportBatchCsv(record.id, e)}
                      >
                        {exportingBatchId === record.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      {/* Delete (super user only) */}
                      {isSuperUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete import history"
                          disabled={deletingBatchId === record.id}
                          onClick={(e) => deleteBatch(record.id, record.reportingOrgName || record.fileName, e)}
                        >
                          {deletingBatchId === record.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      )}
                      {record.status === 'importing' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (!confirm('Cancel this import? Items already imported will remain.')) return
                            try {
                              const res = await apiFetch('/api/iati/history', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ batchId: record.id, action: 'cancel' })
                              })
                              if (res.ok) {
                                toast.success('Import cancelled')
                                fetchHistory()
                              } else {
                                const err = await res.json()
                                toast.error(err.error || 'Failed to cancel')
                              }
                            } catch {
                              toast.error('Failed to cancel import')
                            }
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </button>

                  {/* Expanded Batch Items (drill-down) */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 px-4 py-3">
                      {loadingItems ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-gray-500">Loading activities...</span>
                        </div>
                      ) : batchItems.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No activity details available</p>
                      ) : (
                        <div className="space-y-1">
                          <div className="grid grid-cols-[1fr_200px_100px] gap-2 text-xs font-medium text-gray-500 uppercase px-2 py-1">
                            <div>Activity</div>
                            <div>Import Details</div>
                            <div className="text-right">Action</div>
                          </div>
                          <ScrollArea className="max-h-80">
                            {batchItems.map((item: any) => (
                              <div
                                key={item.id}
                                className="grid grid-cols-[1fr_200px_100px] gap-2 px-2 py-2 border-b border-gray-100 last:border-b-0 items-center"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm truncate">{item.activityTitle || item.iatiIdentifier}</p>
                                  <span className="text-xs font-mono bg-white px-1.5 py-0.5 rounded text-gray-500 border">{item.iatiIdentifier}</span>
                                  {item.errorMessage && (
                                    <p className="text-xs text-red-500 mt-0.5">{item.errorMessage}</p>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {(() => {
                                    const pl = (n: number, s: string) => `${n} ${n === 1 ? s : s + 's'}`;
                                    const parts: string[] = [];
                                    if (item.transactionsImported > 0) parts.push(pl(item.transactionsImported, 'transaction'));
                                    if (item.importDetails?.organizations) parts.push(pl(item.importDetails.organizations, 'organisation'));
                                    if (item.importDetails?.budgets) parts.push(pl(item.importDetails.budgets, 'budget'));
                                    if (item.importDetails?.sectors) parts.push(pl(item.importDetails.sectors, 'sector'));
                                    if (item.importDetails?.locations) parts.push(pl(item.importDetails.locations, 'location'));
                                    if (item.importDetails?.contacts) parts.push(pl(item.importDetails.contacts, 'contact'));
                                    if (item.importDetails?.documents) parts.push(pl(item.importDetails.documents, 'document'));
                                    if (item.importDetails?.policyMarkers) parts.push(pl(item.importDetails.policyMarkers, 'policy marker'));
                                    if (item.importDetails?.humanitarianScopes) parts.push(pl(item.importDetails.humanitarianScopes, 'humanitarian scope'));
                                    if (item.importDetails?.tags) parts.push(pl(item.importDetails.tags, 'tag'));
                                    if (item.importDetails?.results) parts.push(pl(item.importDetails.results, 'result'));
                                    if (item.importDetails?.indicators) parts.push(pl(item.importDetails.indicators, 'indicator'));
                                    return parts.length > 0 ? parts.join(', ') : '-';
                                  })()}
                                </div>
                                <div className="text-right flex items-center justify-end gap-1.5">
                                  {getItemActionIcon(item.action)}
                                  <span className="text-xs text-gray-600 capitalize">{item.action === 'fail' ? 'Failed' : item.action}</span>
                                </div>
                              </div>
                            ))}
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {!loading && totalCount > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {Math.min(startIndex + 1, totalCount)} to {Math.min(endIndex, totalCount)} of {totalCount} imports
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Per page:</label>
                <Select
                  value={pageLimit.toString()}
                  onValueChange={(value) => handlePageLimitChange(Number(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function IATIImportPage() {
  const { user, permissions } = useUser()
  const router = useRouter()
  
  // Check permissions
  const canImport = permissions?.canCreateActivities || 
                   user?.role === 'super_user' || 
                   user?.role === 'dev_partner_tier_1' ||
                   user?.role === 'gov_partner_tier_1'

  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsingProgress, setParsingProgress] = useState(0)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [importState, setImportState] = useState<ImportState>({
    organizations: { phase: 'review', selected: new Set(), imported: [], errors: [] },
    activities: { phase: 'review', selected: new Set(), imported: [], errors: [] },
    transactions: { phase: 'review', selected: new Set(), imported: [], errors: [] }
  })
  const [importing, setImporting] = useState(false)
  const [importHistory, setImportHistory] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('bulk-import')
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Snippet import state
  const [importMethod, setImportMethod] = useState<'file' | 'url' | 'snippet'>('file')
  const [snippetContent, setSnippetContent] = useState('')
  const [urlContent, setUrlContent] = useState('')

  // File upload handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const xmlFile = acceptedFiles[0]
    if (!xmlFile) return

    if (!xmlFile.name.endsWith('.xml')) {
      toast.error('Please upload a valid XML file')
      return
    }

    setFile(xmlFile)
    setStep('parse')
    setParsing(true)
    setParsingProgress(10)

    try {
      // Parse the XML file
      setParsingProgress(30)
      const formData = new FormData()
      formData.append('file', xmlFile)
      
      setParsingProgress(50)
      const response = await apiFetch('/api/iati/parse', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to parse IATI file')
      }

      setParsingProgress(70)
      const data = await response.json()
      setParsingProgress(90)
      setParsedData(data)
      setSummary({
        activities: data.activities.length,
        organizations: data.organizations.length,
        transactions: data.transactions.length,
        errors: data.errors?.length || 0
      })
      setParsingProgress(100)
      
      // Initialize import state with parsed data
      setImportState({
        organizations: {
          phase: 'review',
          selected: new Set(data.organizations.filter((o: any) => !o.matched).map((o: any) => o.ref)),
          imported: [],
          errors: []
        },
        activities: {
          phase: 'review',
          selected: new Set(data.activities.filter((a: any) => !a.matched).map((a: any) => a.iatiIdentifier)),
          imported: [],
          errors: []
        },
        transactions: {
          phase: 'review',
          selected: new Set(data.transactions.map((t: any, i: number) => `${i}`)),
          imported: [],
          errors: []
        }
      })
      
      // Start with organizations step
      setStep('summary')
    } catch (error) {
      console.error('Parse error:', error)
      toast.error('Failed to parse IATI file')
      setStep('upload')
    } finally {
      setParsing(false)
      setParsingProgress(0)
    }
  }, [])

  // Snippet parsing handler
  const parseSnippet = useCallback(async () => {
    if (!snippetContent.trim()) {
      toast.error('Please paste some XML content')
      return
    }

    setStep('parse')
    setParsing(true)
    setParsingProgress(10)

    try {
      setParsingProgress(30)
      
      const response = await apiFetch('/api/iati/parse-snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent: snippetContent })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Failed to parse snippet')
      }

      setParsingProgress(70)
      const data = await response.json()
      setParsingProgress(90)
      
      // Transform snippet data to match expected format
      const transformedData = {
        activities: data.activities || [],
        organizations: data.organizations || [],
        transactions: data.transactions || [],
        locations: data.locations || [],
        sectors: data.sectors || [],
        recipientCountries: data.recipientCountries || [],
        recipientRegions: data.recipientRegions || [],
        snippetType: data.snippetType,
        unmapped: {
          activities: [],
          organizations: [],
          transactions: []
        }
      }
      
      setParsedData(transformedData)
      setSummary({
        activities: transformedData.activities.length,
        organizations: transformedData.organizations.length,
        transactions: transformedData.transactions.length,
        errors: 0
      })
      setParsingProgress(100)
      
      // Initialize import state
      setImportState({
        organizations: {
          phase: 'review',
          selected: new Set(transformedData.organizations.map((o: any, i: number) => `${i}`)),
          imported: [],
          errors: []
        },
        activities: {
          phase: 'review',
          selected: new Set(transformedData.activities.map((a: any, i: number) => `${i}`)),
          imported: [],
          errors: []
        },
        transactions: {
          phase: 'review',
          selected: new Set(transformedData.transactions.map((t: any, i: number) => `${i}`)),
          imported: [],
          errors: []
        }
      })
      
      toast.success(data.message || `Parsed ${data.snippetType} snippet successfully!`)
      setStep('summary')
    } catch (error) {
      console.error('Snippet parse error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to parse snippet')
      setStep('upload')
    } finally {
      setParsing(false)
      setParsingProgress(0)
    }
  }, [snippetContent])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml']
    },
    maxFiles: 1,
    disabled: !canImport
  })

  // Import organizations
  const importOrganizations = async () => {
    if (!parsedData || importState.organizations.selected.size === 0) {
      // Skip to activities if no organizations to import
      setImportState(prev => ({ ...prev, organizations: { ...prev.organizations, phase: 'done' } }))
      setStep('activities')
      return
    }

    setImporting(true)
    setImportState(prev => ({ ...prev, organizations: { ...prev.organizations, phase: 'importing' } }))

    try {
      const orgsToImport = parsedData.organizations.filter(o => 
        importState.organizations.selected.has(o.ref)
      )

      const response = await apiFetch('/api/iati/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: [],
          organizations: orgsToImport,
          transactions: [],
          userId: user?.id,
          organizationId: user?.organizationId,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to import organizations')
      }

      const result = await response.json()
      
      setImportState(prev => ({
        ...prev,
        organizations: {
          ...prev.organizations,
          phase: 'done',
          imported: result.organizationIds || [],
          errors: result.errors || []
        }
      }))
      
      toast.success(`Imported ${result.organizationIds?.length || 0} organizations`)
      
      // Move to activities step
      setStep('activities')
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import organizations')
      setImportState(prev => ({
        ...prev,
        organizations: {
          ...prev.organizations,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      }))
    } finally {
      setImporting(false)
    }
  }

  // Import activities
  const importActivities = async () => {
    if (!parsedData || importState.activities.selected.size === 0) {
      // Skip to transactions if no activities to import
      setImportState(prev => ({ ...prev, activities: { ...prev.activities, phase: 'done' } }))
      setStep('transactions')
      return
    }

    setImporting(true)
    setImportState(prev => ({ ...prev, activities: { ...prev.activities, phase: 'importing' } }))

    try {
      const activitiesToImport = parsedData.activities.filter(a => 
        importState.activities.selected.has(a.iatiIdentifier)
      )

      const response = await apiFetch('/api/iati/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: activitiesToImport,
          organizations: [],
          transactions: [],
          userId: user?.id,
          organizationId: user?.organizationId,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to import activities')
      }

      const result = await response.json()
      
      setImportState(prev => ({
        ...prev,
        activities: {
          ...prev.activities,
          phase: 'done',
          imported: result.activityIds || [],
          errors: result.errors || []
        }
      }))
      
      toast.success(`Imported ${result.activityIds?.length || 0} activities`)
      
      // Move to transactions step
      setStep('transactions')
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import activities')
      setImportState(prev => ({
        ...prev,
        activities: {
          ...prev.activities,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      }))
    } finally {
      setImporting(false)
    }
  }

  // Import transactions
  const importTransactions = async () => {
    if (!parsedData || !parsedData.transactions || importState.transactions.selected.size === 0) {
      // Complete if no transactions to import
      setImportState(prev => ({ ...prev, transactions: { ...prev.transactions, phase: 'done' } }))
      setStep('complete')
      return
    }

    setImporting(true)
    setImportState(prev => ({ ...prev, transactions: { ...prev.transactions, phase: 'importing' } }))

    try {
      const transactionsToImport = (parsedData.transactions || []).filter((t, i) => 
        importState.transactions.selected.has(`${i}`)
      )

      const response = await apiFetch('/api/iati/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: [],
          organizations: [],
          transactions: transactionsToImport,
          userId: user?.id,
          organizationId: user?.organizationId,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to import transactions')
      }

      const result = await response.json()
      
      setImportState(prev => ({
        ...prev,
        transactions: {
          ...prev.transactions,
          phase: 'done',
          imported: result.transactionIds || [],
          errors: result.errors || []
        }
      }))
      
      toast.success(`Imported ${result.transactionIds?.length || 0} transactions`)
      
      // Complete the import process
      setStep('complete')
      fetchImportHistory()
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import transactions')
      setImportState(prev => ({
        ...prev,
        transactions: {
          ...prev.transactions,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      }))
    } finally {
      setImporting(false)
    }
  }

  // Skip current step
  const skipCurrentStep = () => {
    if (step === 'organizations') {
      setImportState(prev => ({ ...prev, organizations: { ...prev.organizations, phase: 'done' } }))
      setStep('activities')
    } else if (step === 'activities') {
      setImportState(prev => ({ ...prev, activities: { ...prev.activities, phase: 'done' } }))
      setStep('transactions')
    } else if (step === 'transactions') {
      setImportState(prev => ({ ...prev, transactions: { ...prev.transactions, phase: 'done' } }))
      setStep('complete')
    }
  }

  // Toggle item selection
  const toggleItemSelection = (type: 'organizations' | 'activities' | 'transactions', id: string) => {
    setImportState(prev => {
      const newSelected = new Set(prev[type].selected)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      return {
        ...prev,
        [type]: { ...prev[type], selected: newSelected }
      }
    })
  }

  // Enhanced Select/deselect all items - includes sub-item selections
  const toggleAllItems = (type: 'organizations' | 'activities' | 'transactions', items: string[]) => {
    console.log(`[IATI Import] Enhanced Toggle All: ${type} with ${items.length} items`);
    
    setImportState(prev => {
      const allSelected = items.every(id => prev[type].selected.has(id))
      const newSelected = allSelected ? new Set<string>() : new Set(items)
      
      console.log(`[IATI Import] Enhanced Toggle All: ${type} - ${allSelected ? 'Deselecting' : 'Selecting'} all items`);
      
      // Enhanced: For transactions, also ensure all sub-items are selected
      if (type === 'transactions' && !allSelected && parsedData?.transactions) {
        console.log(`[IATI Import] Enhanced Toggle All: Selecting all ${(parsedData.transactions || []).length} individual transactions`);
        
        // Create enhanced selection that includes all transaction indices
        const allTransactionIndices = (parsedData.transactions || []).map((_, i) => `${i}`);
        const enhancedSelection = new Set([...newSelected, ...allTransactionIndices]);
        
        return {
          ...prev,
          [type]: { ...prev[type], selected: enhancedSelection }
        }
      }
      
      // Enhanced: For activities, ensure all sub-components are selected
      if (type === 'activities' && !allSelected && parsedData?.activities) {
        console.log(`[IATI Import] Enhanced Toggle All: Selecting all ${parsedData.activities.length} activities with full sub-component selection`);
        
        // For activities, we select the main activities - sub-components will be handled
        // during the actual import process based on the activity data
        return {
          ...prev,
          [type]: { ...prev[type], selected: newSelected }
        }
      }
      
      // Enhanced: For organizations, select all organization data
      if (type === 'organizations' && !allSelected && parsedData?.organizations) {
        console.log(`[IATI Import] Enhanced Toggle All: Selecting all ${parsedData.organizations.length} organizations`);
        
        return {
          ...prev,
          [type]: { ...prev[type], selected: newSelected }
        }
      }
      
      return {
        ...prev,
        [type]: { ...prev[type], selected: newSelected }
      }
    })
  }

  // Fetch import history
  const fetchImportHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await apiFetch('/api/iati/history')
      if (response.ok) {
        const data = await response.json()
        setImportHistory(data)
      }
    } catch (error) {
      console.error('Failed to fetch import history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Fetch history when history tab is selected
  useEffect(() => {
    if (activeTab === 'history') {
      fetchImportHistory()
    }
  }, [activeTab])

  if (!canImport) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to import IATI data. Please contact your administrator.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    )
  }

  // Show progress bar when parsing file
  if (parsing && step === 'parse') {
    return (
      <MainLayout>
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">IATI Import Tool</h1>
            <p className="text-gray-600 mt-2">Sequential import process for IATI data</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Parsing XML file...</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {parsingProgress}%
                  </span>
                </div>
                <Progress 
                  value={parsingProgress} 
                  className="h-2"
                />
                <p className="text-sm text-gray-600">
                  Please wait while we process your IATI XML file. This may take a few moments for large files.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-screen-2xl mx-auto px-6 py-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">IATI Import Tool</h1>
          <p className="text-gray-600 mt-2">Sequential import process for IATI data</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap" data-tour="import-tabs">
            <TabsTrigger value="bulk-import" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Database className="h-4 w-4" />
              Bulk Import
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
              {[
                { key: 'upload', label: 'Upload', icon: Upload },
                { key: 'parse', label: 'Parse', icon: FileCode },
                { key: 'summary', label: 'Summary', icon: Database },
                { key: 'organizations', label: 'Organizations', icon: Building2 },
                { key: 'activities', label: 'Activities', icon: Activity },
                { key: 'transactions', label: 'Transactions', icon: CreditCard },
                { key: 'complete', label: 'Complete', icon: CheckCircle2 }
              ].map((s, index) => {
                const isActive = step === s.key
                const isPast = ['upload', 'parse', 'summary', 'organizations', 'activities', 'transactions', 'complete'].indexOf(step) > index
                const Icon = s.icon
                
                return (
                  <div key={s.key} className="flex items-center">
                    <div className={`
                      flex flex-col items-center
                    `}>
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2
                        ${isActive ? 'bg-blue-600 text-white' : 
                          isPast ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}
                      `}>
                        {isPast ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <span className={`text-xs ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                        {s.label}
                      </span>
                    </div>
                    {index < 6 && (
                      <div className={`w-14 h-1 mx-2 mb-6 ${
                        isPast ? 'bg-green-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Upload Step */}
            {step === 'upload' && (
              <Card>
                <CardHeader>
                  <CardTitle>Import IATI Data</CardTitle>
                  <CardDescription>
                    Choose how you want to import your IATI data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Import method selector */}
                  <div className="flex gap-2 mb-6">
                    <Button
                      variant={importMethod === 'file' ? 'default' : 'outline'}
                      onClick={() => setImportMethod('file')}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                    <Button
                      variant={importMethod === 'url' ? 'default' : 'outline'}
                      onClick={() => setImportMethod('url')}
                      className="flex-1"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      From URL
                    </Button>
                    <Button
                      variant={importMethod === 'snippet' ? 'default' : 'outline'}
                      onClick={() => setImportMethod('snippet')}
                      className="flex-1"
                    >
                      <ClipboardPaste className="h-4 w-4 mr-2" />
                      Paste Snippet
                    </Button>
                  </div>

                  {/* File Upload */}
                  {importMethod === 'file' && (
                    <>
                      <div
                        {...getRootProps()}
                        className={`
                          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                          transition-colors duration-200
                          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                        `}
                      >
                        <input {...getInputProps()} />
                        <FileCode className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        {isDragActive ? (
                          <p className="text-lg font-medium text-blue-600">Drop the file here...</p>
                        ) : (
                          <>
                            <p className="text-lg font-medium text-gray-700">
                              Drop your IATI XML file here
                            </p>
                            <p className="text-sm text-gray-500 mt-2">or click to select file</p>
                            <p className="text-xs text-gray-400 mt-4">Supports IATI 2.03 format</p>
                          </>
                        )}
                      </div>

                      <Alert className="mt-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          The import process will check for existing data and guide you through importing:
                          <ol className="list-decimal list-inside mt-2 space-y-1">
                            <li>Organizations first (to establish references)</li>
                            <li>Activities second (linked to organizations)</li>
                            <li>Transactions last (linked to activities)</li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                    </>
                  )}

                  {/* URL Import */}
                  {importMethod === 'url' && (
                    <>
                      <div className="space-y-3">
                        <label className="text-sm font-medium">IATI XML URL</label>
                        <Input
                          type="url"
                          placeholder="https://example.com/iati-data.xml"
                          value={urlContent}
                          onChange={(e) => setUrlContent(e.target.value)}
                          className="w-full"
                        />
                        <Button
                          onClick={async () => {
                            try {
                              setStep('parse')
                              setParsing(true)
                              setParsingProgress(10)
                              
                              // Fetch XML from URL using the existing API
                              console.log('[IATI Import] Fetching XML from URL:', urlContent.trim())
                              const fetchResponse = await apiFetch('/api/xml/fetch', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url: urlContent.trim() })
                              })
                              
                              if (!fetchResponse.ok) {
                                const error = await fetchResponse.json()
                                throw new Error(error.error || 'Failed to fetch XML from URL')
                              }
                              
                              setParsingProgress(30)
                              const { content } = await fetchResponse.json()
                              console.log('[IATI Import] Successfully fetched XML, length:', content?.length)
                              
                              // Now parse the XML content (reuse existing parse logic)
                              setParsingProgress(50)
                              const parseResponse = await apiFetch('/api/iati/parse', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ xmlContent: content })
                              })
                              
                              if (!parseResponse.ok) {
                                const parseError = await parseResponse.json()
                                throw new Error(parseError.error || 'Failed to parse IATI file from URL')
                              }
                              
                              setParsingProgress(70)
                              const data = await parseResponse.json()
                              setParsingProgress(90)
                              setParsedData(data)
                              setSummary({
                                activities: data.activities.length,
                                organizations: data.organizations.length,
                                transactions: data.transactions.length,
                                errors: data.errors?.length || 0
                              })
                              setParsingProgress(100)
                              
                              // Initialize import state with parsed data
                              setImportState({
                                organizations: {
                                  phase: 'review',
                                  selected: new Set(data.organizations.filter((o: any) => !o.matched).map((o: any) => o.ref)),
                                  imported: [],
                                  errors: []
                                },
                                activities: {
                                  phase: 'review',
                                  selected: new Set(data.activities.filter((a: any) => !a.matched).map((a: any) => a.iatiIdentifier)),
                                  imported: [],
                                  errors: []
                                },
                                transactions: {
                                  phase: 'review',
                                  selected: new Set(data.transactions.map((t: any, i: number) => `${i}`)),
                                  imported: [],
                                  errors: []
                                }
                              })
                              
                              // Start with summary step
                              setStep('summary')
                              toast.success('Successfully fetched and parsed IATI XML from URL')
                              
                            } catch (error) {
                              console.error('[IATI Import] URL import error:', error)
                              toast.error(`Failed to import from URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
                              setParsing(false)
                              setStep('upload')
                            }
                          }}
                          disabled={!urlContent.trim() || parsing}
                          className="w-full"
                        >
                          {parsing ? 'Fetching...' : 'Fetch and Parse'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>

                      <Alert className="mt-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-medium mb-2">URL Import allows you to:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Import directly from IATI Registry URLs</li>
                            <li>Fetch data from public IATI XML endpoints</li>
                            <li>Automatically update from scheduled URLs</li>
                          </ul>
                          <p className="mt-2 text-sm text-emerald-600">
                            Enter a URL above and click &quot;Fetch and Parse&quot; to begin.
                          </p>
                        </AlertDescription>
                      </Alert>
                    </>
                  )}

                  {/* Snippet Import */}
                  {importMethod === 'snippet' && (
                    <>
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Paste IATI XML Snippet</label>
                        <Textarea
                          placeholder="Paste any IATI XML snippet here (transactions, organizations, locations, sectors, etc.)..."
                          value={snippetContent}
                          onChange={(e) => setSnippetContent(e.target.value)}
                          className="font-mono text-sm min-h-[300px]"
                        />
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{snippetContent.length} characters</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSnippetContent('')}
                            disabled={!snippetContent}
                          >
                            Clear
                          </Button>
                        </div>
                        <Button
                          onClick={parseSnippet}
                          disabled={!snippetContent.trim()}
                          className="w-full"
                        >
                          Parse Snippet
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>

                      <Alert className="mt-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-medium mb-2">Snippet Import supports:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;transaction&gt;</code> - Individual or multiple transactions</li>
                            <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;participating-org&gt;</code> / <code className="text-xs bg-gray-100 px-1 rounded">&lt;reporting-org&gt;</code> - Organizations</li>
                            <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;location&gt;</code> - Location data</li>
                            <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;sector&gt;</code> - Sector allocations</li>
                            <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;recipient-country&gt;</code> / <code className="text-xs bg-gray-100 px-1 rounded">&lt;recipient-region&gt;</code> - Geographic data</li>
                            <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;policy-marker&gt;</code> - Policy markers</li>
                            <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;budget&gt;</code> - Budget information</li>
                            <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;iati-activity&gt;</code> - Full activities</li>
                          </ul>
                          <p className="mt-2 text-sm">
                            The system will automatically detect the type of snippet and parse it accordingly.
                          </p>
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Parse Step */}
            {step === 'parse' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
                    <h3 className="text-lg font-medium">Parsing IATI File...</h3>
                    <p className="text-gray-500 mt-2">Analyzing data and checking for existing records</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Step - Show what was found in the XML */}
            {step === 'summary' && parsedData && (
              <Card>
                <CardHeader>
                  <CardTitle>IATI File Analysis Complete</CardTitle>
                  <CardDescription>
                    Here's what we found in your IATI XML file
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Building2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                          <p className="text-3xl font-bold">{parsedData.organizations.length}</p>
                          <p className="text-sm text-gray-600">Organizations</p>
                          <div className="mt-2 text-xs text-gray-500">
                            <p>{parsedData.organizations.filter(o => o.matched).length} existing</p>
                            <p>{parsedData.organizations.filter(o => !o.matched).length} new</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <Activity className="h-8 w-8 mx-auto mb-2 text-green-600" />
                          <p className="text-3xl font-bold">{parsedData.activities.length}</p>
                          <p className="text-sm text-gray-600">Activities</p>
                          <div className="mt-2 text-xs text-gray-500">
                            <p>{parsedData.activities.filter(a => a.matched).length} existing</p>
                            <p>{parsedData.activities.filter(a => !a.matched).length} new</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <CreditCard className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                          <p className="text-3xl font-bold">{(parsedData.transactions || []).length}</p>
                          <p className="text-sm text-gray-600">Transactions</p>
                          <div className="mt-2 text-xs text-gray-500">
                            <p>Total value:</p>
                            <p className="font-medium">
                              {(parsedData.transactions || []).reduce((sum, t) => sum + t.value, 0).toLocaleString()} USD
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {(parsedData.organizations || []).length === 0 && (parsedData.transactions || []).length === 0 && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <p className="font-medium mb-2">Limited data found</p>
                        <p>We found activities but no organizations or transactions. This might happen if:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                          <li>The XML file doesn't contain complete IATI data</li>
                          <li>Organizations are not properly tagged with ref attributes</li>
                          <li>Transactions are missing or in a different format</li>
                        </ul>
                        <p className="mt-2">Check the browser console for detailed parsing logs.</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {summary?.errors && summary.errors > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {summary.errors} items had parsing errors and may be skipped during import
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={() => setStep('organizations')}
                      disabled={parsedData.activities.length === 0}
                    >
                      Proceed to Import
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep('upload')
                        setFile(null)
                        setParsedData(null)
                        setSummary(null)
                      }}
                    >
                      Upload Different File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organizations Step */}
            {step === 'organizations' && parsedData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Import Organizations
                  </CardTitle>
                  <CardDescription>
                    Review organizations found in the IATI file. Existing organizations are highlighted.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Summary Stats */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm text-gray-700 mb-3">Data Found in XML File:</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{parsedData.organizations.length}</p>
                        <p className="text-sm text-gray-600">Organizations</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {parsedData.organizations.filter(o => !o.matched).length} new
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{parsedData.activities.length}</p>
                        <p className="text-sm text-gray-600">Activities</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {parsedData.activities.filter(a => !a.matched).length} new
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{(parsedData.transactions || []).length}</p>
                        <p className="text-sm text-gray-600">Transactions</p>
                      </div>
                    </div>
                  </div>

                  {importState.organizations.phase === 'review' && (
                    <>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                            <span className="text-sm">Existing in AIMS</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full" />
                            <span className="text-sm">New to import</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAllItems('organizations', 
                            parsedData.organizations.filter(o => !o.matched).map(o => o.ref)
                          )}
                        >
                          {parsedData.organizations.filter(o => !o.matched).every(o => 
                            importState.organizations.selected.has(o.ref)
                          ) ? 'Deselect All' : 'Select All New'}
                        </Button>
                      </div>

                      <ScrollArea className="h-96 border rounded-lg p-4">
                        <div className="space-y-2">
                          {parsedData.organizations.map((org) => (
                            <div 
                              key={org.ref} 
                              className={`flex items-start space-x-3 p-3 rounded-lg ${
                                org.matched ? 'bg-green-50' : 'bg-blue-50'
                              }`}
                            >
                              <Checkbox
                                checked={importState.organizations.selected.has(org.ref)}
                                onCheckedChange={() => toggleItemSelection('organizations', org.ref)}
                                disabled={org.matched}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{org.name}</p>
                                <p className="text-sm text-gray-500">
                                  Ref: {org.ref} • Type: {org.type}
                                  {org.acronym && ` • ${org.acronym}`}
                                </p>
                              </div>
                              <Badge variant={org.matched ? "secondary" : "default"}>
                                {org.matched ? 'Exists' : 'New'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="mt-6 flex gap-3">
                        <Button
                          onClick={importOrganizations}
                          disabled={importing || importState.organizations.selected.size === 0}
                        >
                          {importing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              Import {importState.organizations.selected.size} Organizations
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={skipCurrentStep}
                          disabled={importing}
                        >
                          Skip to Activities
                        </Button>
                      </div>
                    </>
                  )}

                  {importState.organizations.phase === 'importing' && (
                    <div className="text-center py-8">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
                      <p className="text-lg font-medium">Importing Organizations...</p>
                    </div>
                  )}

                  {importState.organizations.phase === 'done' && (
                    <Alert className="bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        Successfully imported {importState.organizations.imported.length} organizations
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Activities Step */}
            {step === 'activities' && parsedData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Import Activities
                  </CardTitle>
                  <CardDescription>
                    Review activities found in the IATI file. Activities linked to imported organizations are ready to import.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {importState.activities.phase === 'review' && (
                    <>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                            <span className="text-sm">Existing in AIMS</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full" />
                            <span className="text-sm">New to import</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAllItems('activities', 
                            parsedData.activities.filter(a => !a.matched).map(a => a.iatiIdentifier)
                          )}
                        >
                          {parsedData.activities.filter(a => !a.matched).every(a => 
                            importState.activities.selected.has(a.iatiIdentifier)
                          ) ? 'Deselect All' : 'Select All New'}
                        </Button>
                      </div>

                      <ScrollArea className="h-96 border rounded-lg p-4">
                        <div className="space-y-2">
                          {parsedData.activities.map((activity) => (
                            <div 
                              key={activity.iatiIdentifier} 
                              className={`flex items-start space-x-3 p-3 rounded-lg ${
                                activity.matched ? 'bg-green-50' : 'bg-blue-50'
                              }`}
                            >
                              <Checkbox
                                checked={importState.activities.selected.has(activity.iatiIdentifier)}
                                onCheckedChange={() => toggleItemSelection('activities', activity.iatiIdentifier)}
                                disabled={activity.matched}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{activity.title}</p>
                                <p className="text-sm text-gray-500">
                                  ID: <span className="font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-xs">{activity.iatiIdentifier}</span> • Status: {activity.status}
                                </p>
                                {activity.description && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {activity.description}
                                  </p>
                                )}
                                <div className="flex gap-2 mt-2">
                                  {activity.participatingOrgs?.map((org: any, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {org.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <Badge variant={activity.matched ? "secondary" : "default"}>
                                {activity.matched ? 'Exists' : 'New'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="mt-6 flex gap-3">
                        <Button
                          onClick={importActivities}
                          disabled={importing || importState.activities.selected.size === 0}
                        >
                          {importing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              Import {importState.activities.selected.size} Activities
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={skipCurrentStep}
                          disabled={importing}
                        >
                          Skip to Transactions
                        </Button>
                      </div>
                    </>
                  )}

                  {importState.activities.phase === 'importing' && (
                    <div className="text-center py-8">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
                      <p className="text-lg font-medium">Importing Activities...</p>
                    </div>
                  )}

                  {importState.activities.phase === 'done' && (
                    <Alert className="bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        Successfully imported {importState.activities.imported.length} activities
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Transactions Step */}
            {step === 'transactions' && parsedData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Import Transactions
                  </CardTitle>
                  <CardDescription>
                    Review transactions found in the IATI file. Transactions are linked to the imported activities.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {importState.transactions.phase === 'review' && (
                    <>
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {(parsedData.transactions || []).length} transactions found
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAllItems('transactions', 
                            (parsedData.transactions || []).map((_, i) => `${i}`)
                          )}
                        >
                          {(parsedData.transactions || []).every((_, i) => 
                            importState.transactions.selected.has(`${i}`)
                          ) ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                      
                      <ScrollArea className="h-96 border rounded-lg p-4">
                        <div className="space-y-2">
                          {(parsedData.transactions || []).map((transaction, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                              <Checkbox
                                checked={importState.transactions.selected.has(`${index}`)}
                                onCheckedChange={() => toggleItemSelection('transactions', `${index}`)}
                              />
                              <div className="flex-1">
                                <p className="font-medium">
                                  {transaction.type} - {transaction.currency} {transaction.value.toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Date: {new Date(transaction.date).toLocaleDateString()} • 
                                  Activity: {transaction.activityRef}
                                </p>
                                {transaction.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {transaction.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="mt-6 flex gap-3">
                        <Button
                          onClick={importTransactions}
                          disabled={importing || importState.transactions.selected.size === 0}
                        >
                          {importing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              Import {importState.transactions.selected.size} Transactions
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={skipCurrentStep}
                          disabled={importing}
                        >
                          Complete Import
                        </Button>
                      </div>
                    </>
                  )}

                  {importState.transactions.phase === 'importing' && (
                    <div className="text-center py-8">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
                      <p className="text-lg font-medium">Importing Transactions...</p>
                    </div>
                  )}

                  {importState.transactions.phase === 'done' && (
                    <Alert className="bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        Successfully imported {importState.transactions.imported.length} transactions
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Complete Step */}
            {step === 'complete' && (
              <Card>
                <CardHeader>
                  <CardTitle>Import Complete</CardTitle>
                  <CardDescription>
                    Your IATI data has been successfully imported
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Import process completed successfully!
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Organizations</p>
                              <p className="text-2xl font-bold">{importState.organizations.imported.length}</p>
                            </div>
                            <Building2 className="h-8 w-8 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Activities</p>
                              <p className="text-2xl font-bold">{importState.activities.imported.length}</p>
                            </div>
                            <Activity className="h-8 w-8 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Transactions</p>
                              <p className="text-2xl font-bold">{importState.transactions.imported.length}</p>
                            </div>
                            <CreditCard className="h-8 w-8 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Show any errors */}
                    {(importState.organizations.errors.length > 0 || 
                      importState.activities.errors.length > 0 || 
                      importState.transactions.errors.length > 0) && (
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription>
                          <p className="font-medium text-yellow-800 mb-2">Some items had errors:</p>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            {importState.organizations.errors.map((err, i) => (
                              <li key={`org-err-${i}`}>• Organization: {err}</li>
                            ))}
                            {importState.activities.errors.map((err, i) => (
                              <li key={`act-err-${i}`}>• Activity: {err}</li>
                            ))}
                            {importState.transactions.errors.map((err, i) => (
                              <li key={`tx-err-${i}`}>• Transaction: {err}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-3">
                      <Button onClick={() => router.push('/activities')}>
                        View Activities
                      </Button>
                      <Button onClick={() => router.push('/organizations')}>
                        View Organizations
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setStep('upload')
                          setFile(null)
                          setParsedData(null)
                          setSummary(null)
                          setImportState({
                            organizations: { phase: 'review', selected: new Set(), imported: [], errors: [] },
                            activities: { phase: 'review', selected: new Set(), imported: [], errors: [] },
                            transactions: { phase: 'review', selected: new Set(), imported: [], errors: [] }
                          })
                        }}
                      >
                        Import Another File
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bulk-import" className="space-y-6" data-tour="import-wizard">
            <BulkImportWizard />
          </TabsContent>

          <TabsContent value="history" className="space-y-6" data-tour="import-history">
            <HistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
} 