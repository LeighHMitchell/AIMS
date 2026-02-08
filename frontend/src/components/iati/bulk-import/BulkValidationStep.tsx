'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Download,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'
import type { ParsedActivity, ValidationIssue } from './types'

interface BulkValidationStepProps {
  file: File
  onValidationComplete: (activities: ParsedActivity[], allParsedData: any) => void
  parsedActivities: ParsedActivity[]
}

export default function BulkValidationStep({
  file,
  onValidationComplete,
  parsedActivities,
}: BulkValidationStepProps) {
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activities, setActivities] = useState<ParsedActivity[]>(parsedActivities)
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null)
  const [done, setDone] = useState(parsedActivities.length > 0)

  const summary = {
    total: activities.length,
    valid: activities.filter(a => !a.validationIssues?.some(i => i.severity === 'error')).length,
    warnings: activities.filter(a => a.validationIssues?.some(i => i.severity === 'warning') && !a.validationIssues?.some(i => i.severity === 'error')).length,
    errors: activities.filter(a => a.validationIssues?.some(i => i.severity === 'error')).length,
  }

  const hasBlockingErrors = activities.length > 0 && activities.every(a => a.validationIssues?.some(i => i.severity === 'error'))

  const runValidation = useCallback(async () => {
    if (done) return
    setParsing(true)
    setProgress(10)

    try {
      // Read file as text and send JSON (parse endpoint expects { xmlContent })
      const xmlContent = await file.text()

      setProgress(30)
      const response = await apiFetch('/api/iati/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent }),
      })

      setProgress(60)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to parse IATI file')
      }

      const data = await response.json()
      setProgress(80)

      // Map parsed activities and merge server-side + client-side validation issues
      const parsed: ParsedActivity[] = (data.activities || []).map((a: any) => {
        const issues: ValidationIssue[] = []

        // Server-side per-activity issues (e.g., org-mismatch)
        if (a._perActivityIssues?.length) {
          for (const issue of a._perActivityIssues) {
            issues.push({ field: issue.field, message: issue.message, severity: issue.severity })
          }
        }

        // Client-side validation checks
        if (!a.iatiIdentifier && !a.iati_id) {
          issues.push({ field: 'iati-identifier', message: 'Missing IATI identifier', severity: 'error' })
        }
        if (!a.title) {
          issues.push({ field: 'title', message: 'Missing activity title', severity: 'warning' })
        }
        if (!a.description) {
          issues.push({ field: 'description', message: 'Missing activity description', severity: 'info' })
        }
        if (!(a.transactions || []).length) {
          issues.push({ field: 'transactions', message: 'No transactions found', severity: 'info' })
        }

        return {
          ...a,
          iatiIdentifier: a.iatiIdentifier || a.iati_id,
          validationIssues: issues,
        }
      })

      setActivities(parsed)
      setProgress(100)
      setDone(true)
      onValidationComplete(parsed, data)
      toast.success(`Validated ${parsed.length} activities`)
    } catch (error) {
      console.error('Validation error:', error)
      toast.error(error instanceof Error ? error.message : 'Validation failed')
    } finally {
      setParsing(false)
    }
  }, [file, done, onValidationComplete])

  useEffect(() => {
    if (!done && !parsing) {
      runValidation()
    }
  }, [runValidation, done, parsing])

  const downloadValidationReport = () => {
    const rows = [['IATI Identifier', 'Title', 'Severity', 'Field', 'Message']]
    for (const a of activities) {
      if (a.validationIssues?.length) {
        for (const issue of a.validationIssues) {
          rows.push([a.iatiIdentifier, a.title || '', issue.severity, issue.field, issue.message])
        }
      } else {
        rows.push([a.iatiIdentifier, a.title || '', 'valid', '', ''])
      }
    }
    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'iati-validation-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (parsing) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">Parsing and validating activities...</span>
              </div>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-600">
              This may take a moment for large files.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!done || activities.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{summary.total}</p>
              <p className="text-sm text-gray-600">Total Activities</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-green-600" />
              <p className="text-3xl font-bold text-green-600">{summary.valid}</p>
              <p className="text-sm text-gray-600">Valid</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-yellow-600" />
              <p className="text-3xl font-bold text-yellow-600">{summary.warnings}</p>
              <p className="text-sm text-gray-600">Warnings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-6 w-6 mx-auto mb-1 text-red-600" />
              <p className="text-3xl font-bold text-red-600">{summary.errors}</p>
              <p className="text-sm text-gray-600">Errors</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {hasBlockingErrors && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-800 font-medium">
              All activities have errors. Fix the issues and re-upload, or deselect activities with errors in the Preview step.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Validation Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Activity Validation Log</CardTitle>
          <Button variant="outline" size="sm" onClick={downloadValidationReport}>
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {activities.map((activity) => {
                const hasErrors = activity.validationIssues?.some(i => i.severity === 'error')
                const hasWarnings = activity.validationIssues?.some(i => i.severity === 'warning')
                const isExpanded = expandedActivity === activity.iatiIdentifier

                return (
                  <div key={activity.iatiIdentifier} className="border rounded-lg">
                    <button
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left"
                      onClick={() => setExpandedActivity(isExpanded ? null : activity.iatiIdentifier)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        {hasErrors ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : hasWarnings ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{activity.title || activity.iatiIdentifier}</p>
                          <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{activity.iatiIdentifier}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasErrors && (
                          <Badge variant="destructive" className="text-xs">
                            {activity.validationIssues?.filter(i => i.severity === 'error').length} error(s)
                          </Badge>
                        )}
                        {hasWarnings && (
                          <Badge variant="outline" className="text-xs text-yellow-700 bg-yellow-50">
                            {activity.validationIssues?.filter(i => i.severity === 'warning').length} warning(s)
                          </Badge>
                        )}
                        {!hasErrors && !hasWarnings && (
                          <Badge variant="outline" className="text-xs text-green-700 bg-green-50">Valid</Badge>
                        )}
                      </div>
                    </button>
                    {isExpanded && activity.validationIssues && activity.validationIssues.length > 0 && (
                      <div className="border-t px-3 py-2 bg-gray-50 space-y-1">
                        {activity.validationIssues.map((issue, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm py-1">
                            {issue.severity === 'error' ? (
                              <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                            ) : issue.severity === 'warning' ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                            )}
                            <div>
                              <span className="text-gray-500">[{issue.field}]</span>{' '}
                              <span className="text-gray-700">{issue.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
