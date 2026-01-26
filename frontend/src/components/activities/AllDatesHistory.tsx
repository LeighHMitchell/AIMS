"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { History, X, ArrowRight, Clock, User, ChevronDown, ChevronRight, Calendar, Plus, Minus, RefreshCw } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { apiFetch } from '@/lib/api-fetch';

interface DateChange {
  id: string
  field: string
  oldValue: string | null
  newValue: string | null
  timestamp: string
  userId: string
  userName: string
}

interface CustomDate {
  label: string
  date: string
  description?: string
}

interface ActivityDates {
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
}

interface AllDatesHistoryProps {
  activityId: string
  dates: ActivityDates
  customDates?: CustomDate[]
}

// Represents a single change in the custom dates array diff
interface CustomDateDiffItem {
  type: 'added' | 'removed' | 'changed'
  label: string
  oldDate?: string
  newDate?: string
  oldDescription?: string
  newDescription?: string
}

// Represents a full custom dates change record with computed diff
interface CustomDateChangeRecord {
  id: string
  timestamp: string
  userId: string
  userName: string
  diff: CustomDateDiffItem[]
}

const DATE_FIELDS = [
  { key: 'planned_start_date', label: 'Planned Start Date', dateKey: 'plannedStartDate' },
  { key: 'planned_end_date', label: 'Planned End Date', dateKey: 'plannedEndDate' },
  { key: 'actual_start_date', label: 'Actual Start Date', dateKey: 'actualStartDate' },
  { key: 'actual_end_date', label: 'Actual End Date', dateKey: 'actualEndDate' },
] as const

type GroupedHistory = Record<string, DateChange[]>

/**
 * Computes the diff between two custom dates arrays
 * Returns added, removed, and changed items
 */
function computeCustomDatesDiff(oldDates: CustomDate[], newDates: CustomDate[]): CustomDateDiffItem[] {
  const diff: CustomDateDiffItem[] = []
  
  const oldByLabel = new Map(oldDates.map(d => [d.label, d]))
  const newByLabel = new Map(newDates.map(d => [d.label, d]))
  
  // Find added and changed items
  newDates.forEach(newDate => {
    const oldDate = oldByLabel.get(newDate.label)
    if (!oldDate) {
      // Added
      diff.push({
        type: 'added',
        label: newDate.label,
        newDate: newDate.date,
        newDescription: newDate.description
      })
    } else if (oldDate.date !== newDate.date || oldDate.description !== newDate.description) {
      // Changed
      diff.push({
        type: 'changed',
        label: newDate.label,
        oldDate: oldDate.date,
        newDate: newDate.date,
        oldDescription: oldDate.description,
        newDescription: newDate.description
      })
    }
  })
  
  // Find removed items
  oldDates.forEach(oldDate => {
    if (!newByLabel.has(oldDate.label)) {
      diff.push({
        type: 'removed',
        label: oldDate.label,
        oldDate: oldDate.date,
        oldDescription: oldDate.description
      })
    }
  })
  
  return diff
}

/**
 * Parses a JSON string value from change_log into CustomDate array
 */
function parseCustomDatesValue(value: string | null): CustomDate[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * AllDatesHistory - A unified popover component that shows all activity dates
 * and their revision histories with collapsible sections.
 */
export function AllDatesHistory({ activityId, dates, customDates = [] }: AllDatesHistoryProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [groupedHistory, setGroupedHistory] = useState<GroupedHistory>({})
  const [customDatesHistory, setCustomDatesHistory] = useState<CustomDateChangeRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const fetchHistory = useCallback(async (isBackground = false) => {
    // Don't refetch if already fetched (unless forced)
    if (hasFetched && !isBackground) return
    
    if (!isBackground) {
      setLoading(true)
    }
    setError(null)
    
    try {
      const response = await apiFetch(`/api/activities/${activityId}/date-history`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch date history')
      }
      
      const data = await response.json()
      setGroupedHistory(data.groupedHistory || {})
      
      // Process custom dates history - parse JSON and compute diffs
      const rawCustomDatesHistory: DateChange[] = data.customDatesHistory || []
      const processedCustomDatesHistory: CustomDateChangeRecord[] = rawCustomDatesHistory.map(change => {
        const oldDates = parseCustomDatesValue(change.oldValue)
        const newDates = parseCustomDatesValue(change.newValue)
        const diff = computeCustomDatesDiff(oldDates, newDates)
        
        return {
          id: change.id,
          timestamp: change.timestamp,
          userId: change.userId,
          userName: change.userName,
          diff
        }
      })
      
      setCustomDatesHistory(processedCustomDatesHistory)
      setHasFetched(true)
    } catch (err) {
      console.error('[AllDatesHistory] Error fetching history:', err)
      if (!isBackground) {
        setError('Unable to load history')
      }
    } finally {
      setLoading(false)
    }
  }, [activityId, hasFetched])

  // Fetch history when popover opens (if not already fetched)
  useEffect(() => {
    if (open && activityId && !hasFetched) {
      fetchHistory()
    }
  }, [open, activityId, hasFetched, fetchHistory])

  // Prefetch on hover (background load)
  const handleMouseEnter = useCallback(() => {
    if (!hasFetched && activityId) {
      fetchHistory(true)
    }
  }, [hasFetched, activityId, fetchHistory])

  const formatDateValue = (dateString: string | null): string => {
    if (!dateString) return 'Not set'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      return format(date, 'dd MMM yyyy')
    } catch {
      return dateString
    }
  }

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return timestamp
      return format(date, 'MMM dd, yyyy \'at\' h:mm a')
    } catch {
      return timestamp
    }
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const getCurrentValue = (dateKey: keyof ActivityDates): string | null => {
    return dates[dateKey]
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-popover-trigger
        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
        title="View all dates and revision history"
        onMouseEnter={handleMouseEnter}
      >
        <History className="h-3.5 w-3.5" />
      </PopoverTrigger>
      <PopoverContent 
        align="start" 
        className="w-96 p-0 overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">
              Date Revision History
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {/* Skeleton for each date field */}
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                </div>
              ))}
              {/* Skeleton for additional dates section */}
              <div className="px-4 py-2.5 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={fetchHistory}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Collapsible Sections for Each Standard Date Field */}
              {DATE_FIELDS.map(field => {
                const history = groupedHistory[field.key] || []
                const isExpanded = expandedSections[field.key]
                const currentValue = getCurrentValue(field.dateKey as keyof ActivityDates)
                
                return (
                  <Collapsible
                    key={field.key}
                    open={isExpanded}
                    onOpenChange={() => toggleSection(field.key)}
                  >
                    <CollapsibleTrigger className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                        <span className="text-sm font-medium text-slate-700">
                          {field.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {formatDateValue(currentValue)}
                        </span>
                        {history.length > 0 && (
                          <span className="px-1.5 py-0.5 text-xs bg-slate-200 text-slate-600 rounded">
                            {history.length} revision{history.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-3 pt-1 bg-slate-50/50">
                        {history.length === 0 ? (
                          <div className="py-3 text-center">
                            <Clock className="h-5 w-5 text-slate-300 mx-auto mb-1" />
                            <p className="text-xs text-slate-400">No revisions recorded</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {history.map((change, index) => (
                              <div 
                                key={change.id} 
                                className="p-2 bg-white rounded border border-slate-100"
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-xs font-medium text-slate-500">
                                    Revision {history.length - index}
                                  </span>
                                </div>
                                
                                {/* Date change visualization */}
                                <div className="flex items-center gap-2 text-sm mb-2">
                                  <span className="text-slate-500 line-through text-xs">
                                    {formatDateValue(change.oldValue)}
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                  <span className="text-slate-900 font-medium text-xs">
                                    {formatDateValue(change.newValue)}
                                  </span>
                                </div>

                                {/* Metadata */}
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>{change.userName}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTimestamp(change.timestamp)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}

              {/* Additional/Custom Dates Section with History */}
              {(customDates.length > 0 || customDatesHistory.length > 0) && (
                <Collapsible
                  open={expandedSections['customDates']}
                  onOpenChange={() => toggleSection('customDates')}
                >
                  <CollapsibleTrigger className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      {expandedSections['customDates'] ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">
                        Additional Dates
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {customDates.length} date{customDates.length !== 1 ? 's' : ''}
                      </span>
                      {customDatesHistory.length > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-slate-200 text-slate-600 rounded">
                          {customDatesHistory.length} revision{customDatesHistory.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-3 pt-1 bg-slate-50/50">
                      {/* Current Custom Dates */}
                      {customDates.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-slate-400 font-medium mb-1.5">Current Values</div>
                          <div className="space-y-1">
                            {customDates.map((customDate, index) => (
                              <div 
                                key={index}
                                className="flex items-center justify-between text-xs p-1.5 bg-white rounded border border-slate-100"
                              >
                                <span className="text-slate-700 font-medium">{customDate.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500">{formatDateValue(customDate.date)}</span>
                                  {customDate.description && (
                                    <span className="text-slate-400 italic max-w-[80px] truncate" title={customDate.description}>
                                      {customDate.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Custom Dates Revision History */}
                      {customDatesHistory.length === 0 ? (
                        <div className="py-3 text-center">
                          <Clock className="h-5 w-5 text-slate-300 mx-auto mb-1" />
                          <p className="text-xs text-slate-400">No revisions recorded</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs text-slate-400 font-medium mb-1.5">Revision History</div>
                          {customDatesHistory.map((change, changeIndex) => (
                            <div 
                              key={change.id} 
                              className="p-2 bg-white rounded border border-slate-100"
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-medium text-slate-500">
                                  Revision {customDatesHistory.length - changeIndex}
                                </span>
                              </div>
                              
                              {/* Diff visualization */}
                              <div className="space-y-1 mb-2">
                                {change.diff.map((diffItem, diffIndex) => (
                                  <div key={diffIndex} className="flex items-start gap-2 text-xs">
                                    {diffItem.type === 'added' && (
                                      <>
                                        <Plus className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-green-700">
                                          Added <span className="font-medium">{diffItem.label}</span>: {formatDateValue(diffItem.newDate || null)}
                                        </span>
                                      </>
                                    )}
                                    {diffItem.type === 'removed' && (
                                      <>
                                        <Minus className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-red-700">
                                          Removed <span className="font-medium">{diffItem.label}</span>: {formatDateValue(diffItem.oldDate || null)}
                                        </span>
                                      </>
                                    )}
                                    {diffItem.type === 'changed' && (
                                      <>
                                        <RefreshCw className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-amber-700">
                                          <span className="font-medium">{diffItem.label}</span>:{' '}
                                          <span className="line-through text-slate-400">{formatDateValue(diffItem.oldDate || null)}</span>
                                          {' → '}
                                          <span>{formatDateValue(diffItem.newDate || null)}</span>
                                        </span>
                                      </>
                                    )}
                                  </div>
                                ))}
                                {change.diff.length === 0 && (
                                  <span className="text-xs text-slate-400 italic">No changes detected</span>
                                )}
                              </div>

                              {/* Metadata */}
                              <div className="flex items-center gap-3 text-xs text-slate-400">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{change.userName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatTimestamp(change.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default AllDatesHistory






