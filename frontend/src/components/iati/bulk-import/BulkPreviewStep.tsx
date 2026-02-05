'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronRight,
  Database,
} from 'lucide-react'
import type { ParsedActivity } from './types'

interface BulkPreviewStepProps {
  activities: ParsedActivity[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}

type FilterStatus = 'all' | 'valid' | 'warnings' | 'errors'
type SortField = 'id' | 'title' | 'transactions' | 'status'

export default function BulkPreviewStep({
  activities,
  selectedIds,
  onSelectionChange,
}: BulkPreviewStepProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortAsc, setSortAsc] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const filteredActivities = useMemo(() => {
    let result = [...activities]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        a =>
          a.iatiIdentifier?.toLowerCase().includes(q) ||
          a.title?.toLowerCase().includes(q)
      )
    }

    // Status filter
    if (filterStatus === 'valid') {
      result = result.filter(a => !a.validationIssues?.some(i => i.severity === 'error' || i.severity === 'warning'))
    } else if (filterStatus === 'warnings') {
      result = result.filter(a => a.validationIssues?.some(i => i.severity === 'warning'))
    } else if (filterStatus === 'errors') {
      result = result.filter(a => a.validationIssues?.some(i => i.severity === 'error'))
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'id') cmp = (a.iatiIdentifier || '').localeCompare(b.iatiIdentifier || '')
      if (sortField === 'title') cmp = (a.title || '').localeCompare(b.title || '')
      if (sortField === 'transactions') cmp = (a.transactions?.length || 0) - (b.transactions?.length || 0)
      if (sortField === 'status') {
        const aErr = a.validationIssues?.some(i => i.severity === 'error') ? 2 : a.validationIssues?.some(i => i.severity === 'warning') ? 1 : 0
        const bErr = b.validationIssues?.some(i => i.severity === 'error') ? 2 : b.validationIssues?.some(i => i.severity === 'warning') ? 1 : 0
        cmp = aErr - bErr
      }
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [activities, searchQuery, filterStatus, sortField, sortAsc])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const selectAll = () => {
    const ids = new Set(filteredActivities.map(a => a.iatiIdentifier))
    onSelectionChange(ids)
  }

  const deselectAll = () => {
    onSelectionChange(new Set())
  }

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  const totalBudget = (a: ParsedActivity) => {
    return (a.transactions || []).reduce((sum, t) => sum + (t.value || 0), 0)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by IATI ID or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'valid', 'warnings', 'errors'] as FilterStatus[]).map(status => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'All' : status === 'valid' ? 'Valid' : status === 'warnings' ? 'Warnings' : 'Errors'}
            </Button>
          ))}
        </div>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Deselect All
          </Button>
        </div>
        <span className="text-gray-600">
          <span className="font-semibold text-blue-600">{selectedIds.size}</span> of{' '}
          <span className="font-semibold">{activities.length}</span> activities selected for import
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_200px_100px_120px_80px] gap-2 px-4 py-3 border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase">
            <div />
            <button className="text-left hover:text-gray-700" onClick={() => toggleSort('id')}>
              IATI ID / Title {sortField === 'id' && (sortAsc ? '↑' : '↓')}
            </button>
            <button className="text-left hover:text-gray-700" onClick={() => toggleSort('title')}>
              Dates
            </button>
            <button className="text-right hover:text-gray-700" onClick={() => toggleSort('transactions')}>
              Transactions {sortField === 'transactions' && (sortAsc ? '↑' : '↓')}
            </button>
            <div className="text-right">Budget</div>
            <button className="text-center hover:text-gray-700" onClick={() => toggleSort('status')}>
              Status {sortField === 'status' && (sortAsc ? '↑' : '↓')}
            </button>
          </div>

          {/* Table Body */}
          <ScrollArea className="h-[440px]">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No activities match your filters</div>
            ) : (
              filteredActivities.map((activity) => {
                const isExpanded = expandedRow === activity.iatiIdentifier
                const hasErrors = activity.validationIssues?.some(i => i.severity === 'error')
                const hasWarnings = activity.validationIssues?.some(i => i.severity === 'warning')

                return (
                  <div key={activity.iatiIdentifier} className="border-b last:border-b-0">
                    <div className="grid grid-cols-[40px_1fr_200px_100px_120px_80px] gap-2 px-4 py-3 items-center hover:bg-gray-50">
                      <Checkbox
                        checked={selectedIds.has(activity.iatiIdentifier)}
                        onCheckedChange={() => toggleSelection(activity.iatiIdentifier)}
                      />
                      <div
                        className="cursor-pointer min-w-0"
                        onClick={() => setExpandedRow(isExpanded ? null : activity.iatiIdentifier)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{activity.title || 'Untitled'}</p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs text-gray-500 truncate">{activity.iatiIdentifier}</p>
                              {activity.matched && (
                                <span title="Exists in database"><Database className="h-3 w-3 text-blue-500 shrink-0" /></span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {activity.planned_start_date && (
                          <span>{activity.planned_start_date.substring(0, 10)}</span>
                        )}
                        {activity.planned_start_date && activity.planned_end_date && ' → '}
                        {activity.planned_end_date && (
                          <span>{activity.planned_end_date.substring(0, 10)}</span>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        {(activity.transactions || []).length}
                      </div>
                      <div className="text-right text-sm font-medium">
                        {totalBudget(activity) > 0
                          ? `$${totalBudget(activity).toLocaleString()}`
                          : '-'}
                      </div>
                      <div className="text-center">
                        {hasErrors ? (
                          <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                        ) : hasWarnings ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Row Detail */}
                    {isExpanded && (
                      <div className="px-12 py-4 bg-gray-50 border-t text-sm space-y-3">
                        {activity.description && (
                          <div>
                            <span className="font-medium text-gray-700">Description:</span>
                            <p className="text-gray-600 mt-1">{activity.description}</p>
                          </div>
                        )}

                        {activity.participatingOrgs && activity.participatingOrgs.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700">Organizations:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {activity.participatingOrgs.map((org, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {org.name} ({org.role})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {activity.sectors && activity.sectors.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700">Sectors:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {activity.sectors.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {s.name || s.code} {s.percentage ? `(${s.percentage}%)` : ''}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {activity.transactions && activity.transactions.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700">Transactions ({activity.transactions.length}):</span>
                            <div className="mt-1 space-y-1">
                              {activity.transactions.slice(0, 5).map((tx, i) => (
                                <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded border">
                                  <span>{tx.type}</span>
                                  <span className="text-gray-500">{tx.date?.substring(0, 10)}</span>
                                  <span className="font-medium">{tx.currency} {tx.value?.toLocaleString()}</span>
                                </div>
                              ))}
                              {activity.transactions.length > 5 && (
                                <p className="text-xs text-gray-500">
                                  + {activity.transactions.length - 5} more transactions
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {activity.validationIssues && activity.validationIssues.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700">Validation Issues:</span>
                            <div className="mt-1 space-y-1">
                              {activity.validationIssues.map((issue, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  {issue.severity === 'error' ? (
                                    <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                                  ) : issue.severity === 'warning' ? (
                                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
                                  ) : (
                                    <AlertTriangle className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                                  )}
                                  <span>[{issue.field}] {issue.message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
