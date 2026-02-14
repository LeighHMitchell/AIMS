"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Save, 
  FolderOpen, 
  ChevronDown, 
  Trash2, 
  Star, 
  Globe,
  Clock,
  User,
  FileText,
  LayoutGrid,
  Pencil,
  Pin
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface PivotConfig {
  rows: string[]
  cols: string[]
  vals: string[]
  aggregatorName: string
  rendererName: string
  valueFilter?: Record<string, Record<string, boolean>>
  // Optional filter state saved with report
  filters?: {
    startDate?: string | null
    endDate?: string | null
    organizationIds?: string[]
    statuses?: string[]
    sectorCodes?: string[]
    transactionTypes?: string[]
    fiscalYears?: string[]
    recordTypes?: string[]
  }
  [key: string]: unknown
}

export interface SavedReport {
  id: string
  name: string
  description: string | null
  config: PivotConfig
  is_template: boolean
  is_public: boolean
  created_by: string | null
  organization_id: string | null
  created_at: string
  updated_at: string
}

interface SavedReportsManagerProps {
  currentConfig: PivotConfig
  onLoadReport: (config: PivotConfig) => void
  isAdmin?: boolean
}

export function SavedReportsManager({ 
  currentConfig, 
  onLoadReport,
  isAdmin = false 
}: SavedReportsManagerProps) {
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Pinned reports state
  const [pinnedReportIds, setPinnedReportIds] = useState<Set<string>>(new Set())
  
  // Save dialog state
  const [reportName, setReportName] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isTemplate, setIsTemplate] = useState(false)
  const [editingReportId, setEditingReportId] = useState<string | null>(null)

  // Fetch saved reports and pinned reports on mount
  useEffect(() => {
    fetchSavedReports()
    fetchPinnedReports()
  }, [])

  const fetchSavedReports = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/reports/saved-pivots')
      if (response.ok) {
        const data = await response.json()
        setSavedReports(data.data || [])
      } else {
        console.error('Failed to fetch saved reports')
      }
    } catch (error) {
      console.error('Error fetching saved reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPinnedReports = async () => {
    try {
      const response = await fetch('/api/reports/pinned-reports')
      if (response.ok) {
        const data = await response.json()
        setPinnedReportIds(new Set(data.pinnedIds || []))
      }
    } catch (error) {
      console.error('Error fetching pinned reports:', error)
    }
  }

  const handleTogglePin = async (reportId: string) => {
    // Find the report to check if it's a template or user report
    const report = savedReports.find(r => r.id === reportId)
    if (!report) return

    const isTemplate = report.is_template
    
    // Count current pins by type
    const pinnedTemplateCount = templateReportsRaw.filter(r => pinnedReportIds.has(r.id)).length
    const pinnedUserCount = userReportsRaw.filter(r => pinnedReportIds.has(r.id)).length

    // Check if already at max (4 per section) and trying to pin
    if (!pinnedReportIds.has(reportId)) {
      if (isTemplate && pinnedTemplateCount >= 4) {
        toast.error('You can only pin up to 4 report templates')
        return
      }
      if (!isTemplate && pinnedUserCount >= 4) {
        toast.error('You can only pin up to 4 saved reports')
        return
      }
    }

    try {
      const response = await fetch('/api/reports/pinned-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      })

      if (response.ok) {
        const data = await response.json()
        // Update local state
        setPinnedReportIds(prev => {
          const newSet = new Set(prev)
          if (data.action === 'unpinned') {
            newSet.delete(reportId)
            toast.success('Report unpinned')
          } else {
            newSet.add(reportId)
            toast.success('Report pinned')
          }
          return newSet
        })
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update pin status')
      }
    } catch (error) {
      console.error('Error toggling pin:', error)
      toast.error('Failed to update pin status')
    }
  }

  const handleSave = async () => {
    if (!reportName.trim()) {
      toast.error('Please enter a report name')
      return
    }

    // Validate config has required fields
    if (!currentConfig || typeof currentConfig !== 'object') {
      toast.error('Invalid report configuration')
      console.error('Invalid config:', currentConfig)
      return
    }

    setIsSaving(true)
    try {
      const url = editingReportId 
        ? `/api/reports/saved-pivots/${editingReportId}` 
        : '/api/reports/saved-pivots'
      
      const method = editingReportId ? 'PATCH' : 'POST'
      
      const payload = {
        name: reportName.trim(),
        description: reportDescription.trim() || null,
        config: {
          rows: currentConfig.rows || [],
          cols: currentConfig.cols || [],
          vals: currentConfig.vals || [],
          aggregatorName: currentConfig.aggregatorName || 'Sum',
          rendererName: currentConfig.rendererName || 'Table',
          valueFilter: currentConfig.valueFilter || {},
          filters: currentConfig.filters || {},
        },
        is_public: isPublic,
        is_template: isTemplate,
      }
      
      console.log('[SavedReportsManager] Saving report:', { url, method, payload })
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()
      console.log('[SavedReportsManager] Save response:', { status: response.status, data: responseData })

      if (response.ok) {
        toast.success(editingReportId ? 'Report updated' : 'Report saved successfully')
        setShowSaveDialog(false)
        resetSaveDialog()
        fetchSavedReports()
      } else {
        // Show more detailed error message
        const errorMessage = responseData.details || responseData.error || 'Failed to save report'
        console.error('[SavedReportsManager] Save failed:', responseData)
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('[SavedReportsManager] Error saving report:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save report. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      const response = await fetch(`/api/reports/saved-pivots/${reportId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Report deleted')
        fetchSavedReports()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete report')
      }
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Failed to delete report')
    }
  }

  const handleLoad = (report: SavedReport) => {
    onLoadReport(report.config)
    toast.success(`Loaded: ${report.name}`)
  }

  const handleEditClick = (report: SavedReport) => {
    setEditingReportId(report.id)
    setReportName(report.name)
    setReportDescription(report.description || '')
    setIsPublic(report.is_public)
    setIsTemplate(report.is_template)
    setShowSaveDialog(true)
  }

  const resetSaveDialog = () => {
    setEditingReportId(null)
    setReportName('')
    setReportDescription('')
    setIsPublic(false)
    setIsTemplate(false)
  }

  const openSaveDialog = () => {
    resetSaveDialog()
    setShowSaveDialog(true)
  }

  // State for load report popover
  const [loadPopoverOpen, setLoadPopoverOpen] = useState(false)

  // Group reports by type
  const templateReportsRaw = savedReports.filter(r => r.is_template)
  const publicReports = savedReports.filter(r => r.is_public && !r.is_template)
  const myReports = savedReports.filter(r => !r.is_template && !r.is_public)
  // Combine user reports (my reports + public from others)
  const userReportsRaw = [...myReports, ...publicReports]

  // Sort reports with pinned first
  const sortByPinned = (reports: SavedReport[]) => {
    return [...reports].sort((a, b) => {
      const aPinned = pinnedReportIds.has(a.id)
      const bPinned = pinnedReportIds.has(b.id)
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return 0
    })
  }

  const templateReports = useMemo(() => sortByPinned(templateReportsRaw), [templateReportsRaw, pinnedReportIds])
  const userReports = useMemo(() => sortByPinned(userReportsRaw), [userReportsRaw, pinnedReportIds])

  const handleLoadAndClose = (report: SavedReport) => {
    handleLoad(report)
    setLoadPopoverOpen(false)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Load Reports Popover */}
        <Popover open={loadPopoverOpen} onOpenChange={setLoadPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Load Report
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            align="end" 
            className="w-[1400px] p-0"
            sideOffset={8}
          >
            <TooltipProvider delayDuration={300}>
              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Loading reports...
                </div>
              ) : (
                <div className="flex divide-x">
                  {/* Left Side: Template Reports */}
                  <div className="flex-[3] p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">Report Templates</h3>
                      <span className="text-xs text-muted-foreground">({templateReports.length})</span>
                    </div>
                    <ScrollArea className="h-[380px]">
                      <div className="pt-4 pr-4">
                      {templateReports.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          No templates available
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-4">
                          {templateReports.map(report => (
                            <ReportCard 
                              key={report.id} 
                              report={report} 
                              onLoad={handleLoadAndClose}
                              onEdit={isAdmin ? handleEditClick : undefined}
                              onDelete={isAdmin ? handleDelete : undefined}
                              variant="template"
                              isPinned={pinnedReportIds.has(report.id)}
                              onTogglePin={handleTogglePin}
                            />
                          ))}
                        </div>
                      )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Right Side: User Reports */}
                  <div className="flex-[2] p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">My Saved Reports</h3>
                      <span className="text-xs text-muted-foreground">({userReports.length})</span>
                    </div>
                    <ScrollArea className="h-[380px]">
                      <div className="pt-4 pr-4">
                      {userReports.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          <p>No saved reports yet</p>
                          <p className="text-xs mt-1">Configure your pivot table and click &quot;Save Report&quot;</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          {userReports.map(report => (
                            <ReportCard 
                              key={report.id} 
                              report={report} 
                              onLoad={handleLoadAndClose}
                              onEdit={report.is_public && report.created_by !== null ? undefined : handleEditClick}
                              onDelete={report.is_public && report.created_by !== null ? undefined : handleDelete}
                              variant={report.is_public ? "public" : "user"}
                              isPinned={pinnedReportIds.has(report.id)}
                              onTogglePin={handleTogglePin}
                            />
                          ))}
                        </div>
                      )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </TooltipProvider>
          </PopoverContent>
        </Popover>

        {/* Save Button */}
        <Button onClick={openSaveDialog} variant="outline" className="gap-2">
          <Save className="h-4 w-4" />
          Save Report
        </Button>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReportId ? 'Update Report' : 'Save Report'}
            </DialogTitle>
            <DialogDescription>
              Save your current pivot configuration for later use.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Input
                id="report-name"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g., Quarterly Disbursements by Partner"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="report-description">Description</Label>
              <Input
                id="report-description"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Optional description..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-public"
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked === true)}
              />
              <Label htmlFor="is-public" className="text-sm font-normal">
                Share with all users (public)
              </Label>
            </div>

            {isAdmin && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-template"
                  checked={isTemplate}
                  onCheckedChange={(checked) => setIsTemplate(checked === true)}
                />
                <Label htmlFor="is-template" className="text-sm font-normal">
                  Save as template (admin only)
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingReportId ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Report card sub-component for grid layout
interface ReportCardProps {
  report: SavedReport
  onLoad: (report: SavedReport) => void
  onEdit?: (report: SavedReport) => void
  onDelete?: (reportId: string) => void
  variant: 'template' | 'user' | 'public'
  isPinned?: boolean
  onTogglePin?: (reportId: string) => void
}

function ReportCard({ report, onLoad, onEdit, onDelete, variant, isPinned = false, onTogglePin }: ReportCardProps) {
  const cardContent = (
    <div 
      className="group relative rounded-md border bg-card p-4 cursor-pointer transition-all hover:shadow-md hover:border-foreground/20 hover:bg-accent/50 min-h-[110px]"
      onClick={() => onLoad(report)}
    >
      {/* Pin icon badge */}
      <div 
        className={cn(
          "absolute top-2 right-2 rounded-full p-1.5 cursor-pointer transition-colors",
          isPinned 
            ? "bg-red-100 hover:bg-red-200" 
            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={(e) => {
          e.stopPropagation()
          onTogglePin?.(report.id)
        }}
        title={isPinned ? "Unpin report" : "Pin report"}
      >
        <Pin className={cn("h-3 w-3", isPinned && "fill-[#DC2625]")} style={isPinned ? { color: '#DC2625' } : undefined} />
      </div>

      {/* Content */}
      <div className="pr-4">
        <div className="font-medium text-sm leading-tight line-clamp-2 mb-1">
          {report.name}
        </div>
        {report.description && (
          <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {report.description}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(report.updated_at).toLocaleDateString()}
        </div>
      </div>

      {/* Action buttons */}
      {(onEdit || onDelete) && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-background/80 hover:bg-background"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(report)
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-background/80 hover:bg-background text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(report.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {cardContent}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold">{report.name}</p>
          {report.description && (
            <p className="text-xs text-muted-foreground">{report.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(report.updated_at).toLocaleDateString()}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
