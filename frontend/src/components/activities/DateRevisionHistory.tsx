"use client"

import React, { useState, useEffect } from 'react'
import { History, X, ArrowRight, Clock, User } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'

interface DateChange {
  id: string
  field: string
  oldValue: string | null
  newValue: string | null
  timestamp: string
  userId: string
  userName: string
}

interface DateRevisionHistoryProps {
  activityId: string
  dateField: 'planned_start_date' | 'planned_end_date' | 'actual_start_date' | 'actual_end_date'
  currentValue: string | null
  /** Size of the trigger icon button */
  size?: 'sm' | 'md'
}

const DATE_FIELD_LABELS: Record<string, string> = {
  planned_start_date: 'Planned Start Date',
  planned_end_date: 'Planned End Date',
  actual_start_date: 'Actual Start Date',
  actual_end_date: 'Actual End Date'
}

/**
 * DateRevisionHistory - A popover component that shows the revision history
 * of an activity date field by querying the change_log table.
 */
export function DateRevisionHistory({ 
  activityId, 
  dateField, 
  currentValue,
  size = 'sm'
}: DateRevisionHistoryProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<DateChange[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch history when popover opens
  useEffect(() => {
    if (open && activityId) {
      fetchHistory()
    }
  }, [open, activityId])

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/activities/${activityId}/date-history`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch date history')
      }
      
      const data = await response.json()
      
      // Filter to only show history for this specific field
      const fieldHistory = data.groupedHistory?.[dateField] || []
      setHistory(fieldHistory)
    } catch (err) {
      console.error('[DateRevisionHistory] Error fetching history:', err)
      setError('Unable to load history')
    } finally {
      setLoading(false)
    }
  }

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

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  const buttonSize = size === 'sm' ? 'p-0.5' : 'p-1'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-popover-trigger
        className={`${buttonSize} rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors`}
        title="View date revision history"
      >
        <History className={iconSize} />
      </PopoverTrigger>
      <PopoverContent 
        align="start" 
        className="w-80 p-0 overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">
              {DATE_FIELD_LABELS[dateField]} History
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
              <span className="ml-2 text-sm text-slate-500">Loading history...</span>
            </div>
          ) : error ? (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={fetchHistory}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No revisions recorded</p>
              <p className="text-xs text-slate-400 mt-1">
                Changes to this date will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Current value */}
              <div className="px-3 py-2.5 bg-blue-50/50">
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mb-1">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                  Current Value
                </div>
                <p className="text-sm font-medium text-slate-900">
                  {formatDateValue(currentValue)}
                </p>
              </div>

              {/* Revision history */}
              {history.map((change, index) => (
                <div key={change.id} className="px-3 py-2.5 hover:bg-slate-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-slate-500">
                      Revision {history.length - index}
                    </span>
                  </div>
                  
                  {/* Date change visualization */}
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="text-slate-500 line-through">
                      {formatDateValue(change.oldValue)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-900 font-medium">
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
      </PopoverContent>
    </Popover>
  )
}

export default DateRevisionHistory



