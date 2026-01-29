"use client"

import React, { useEffect, useState } from 'react'
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
  Pencil
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
  
  // Save dialog state
  const [reportName, setReportName] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isTemplate, setIsTemplate] = useState(false)
  const [editingReportId, setEditingReportId] = useState<string | null>(null)

  // Fetch saved reports on mount
  useEffect(() => {
    fetchSavedReports()
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
  const templateReports = savedReports.filter(r => r.is_template)
  const publicReports = savedReports.filter(r => r.is_public && !r.is_template)
  const myReports = savedReports.filter(r => !r.is_template && !r.is_public)
  // Combine user reports (my reports + public from others)
  const userReports = [...myReports, ...publicReports]

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
            className="w-[1200px] p-0"
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
                    <ScrollArea className="h-[280px]">
                      {templateReports.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          No templates available
                        </div>
                      ) : (
                        <div className="grid grid-cols-5 gap-3 pr-2">
                          {templateReports.map(report => (
                            <ReportCard 
                              key={report.id} 
                              report={report} 
                              onLoad={handleLoadAndClose}
                              onEdit={isAdmin ? handleEditClick : undefined}
                              onDelete={isAdmin ? handleDelete : undefined}
                              variant="template"
                            />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Right Side: User Reports */}
                  <div className="flex-[2] p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">My Saved Reports</h3>
                      <span className="text-xs text-muted-foreground">({userReports.length})</span>
                    </div>
                    <ScrollArea className="h-[280px]">
                      {userReports.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          <p>No saved reports yet</p>
                          <p className="text-xs mt-1">Configure your pivot table and click &quot;Save Report&quot;</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3 pr-2">
                          {userReports.map(report => (
                            <ReportCard 
                              key={report.id} 
                              report={report} 
                              onLoad={handleLoadAndClose}
                              onEdit={report.is_public && report.created_by !== null ? undefined : handleEditClick}
                              onDelete={report.is_public && report.created_by !== null ? undefined : handleDelete}
                              variant={report.is_public ? "public" : "user"}
                            />
                          ))}
                        </div>
                      )}
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
              <Label htmlFor="report-name">Report Name *</Label>
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
}

function ReportCard({ report, onLoad, onEdit, onDelete, variant }: ReportCardProps) {
  const cardContent = (
    <div 
      className="group relative rounded-md border bg-card p-3 cursor-pointer transition-all hover:shadow-md hover:border-foreground/20 hover:bg-accent/50"
      onClick={() => onLoad(report)}
    >
      {/* Icon badge */}
      <div className="absolute -top-2 -right-2 rounded-full p-1 bg-background shadow-sm border text-muted-foreground">
        {variant === 'template' && <Star className="h-3 w-3" />}
        {variant === 'user' && <User className="h-3 w-3" />}
        {variant === 'public' && <Globe className="h-3 w-3" />}
      </div>

      {/* Content */}
      <div className="pr-4">
        <div className="font-medium text-sm leading-tight line-clamp-2 mb-1">
          {report.name}
        </div>
        {report.description && (
          <div className="text-xs text-muted-foreground line-clamp-1 mb-2">
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
