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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Save, 
  FolderOpen, 
  ChevronDown, 
  Trash2, 
  Star, 
  Globe,
  Clock,
  User,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'

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

    setIsSaving(true)
    try {
      const url = editingReportId 
        ? `/api/reports/saved-pivots/${editingReportId}` 
        : '/api/reports/saved-pivots'
      
      const method = editingReportId ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName.trim(),
          description: reportDescription.trim() || null,
          config: currentConfig,
          is_public: isPublic,
          is_template: isTemplate,
        }),
      })

      if (response.ok) {
        toast.success(editingReportId ? 'Report updated' : 'Report saved')
        setShowSaveDialog(false)
        resetSaveDialog()
        fetchSavedReports()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save report')
      }
    } catch (error) {
      console.error('Error saving report:', error)
      toast.error('Failed to save report')
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

  // Group reports by type
  const templateReports = savedReports.filter(r => r.is_template)
  const publicReports = savedReports.filter(r => r.is_public && !r.is_template)
  const myReports = savedReports.filter(r => !r.is_template && !r.is_public)

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Load Reports Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Load Report
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : savedReports.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No saved reports
              </div>
            ) : (
              <>
                {/* Templates */}
                {templateReports.length > 0 && (
                  <>
                    <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                      <Star className="h-3 w-3 text-yellow-500" />
                      Templates
                    </DropdownMenuLabel>
                    {templateReports.map(report => (
                      <ReportMenuItem 
                        key={report.id} 
                        report={report} 
                        onLoad={handleLoad}
                        onEdit={isAdmin ? handleEditClick : undefined}
                        onDelete={isAdmin ? handleDelete : undefined}
                      />
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* Public Reports */}
                {publicReports.length > 0 && (
                  <>
                    <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                      <Globe className="h-3 w-3 text-blue-500" />
                      Public Reports
                    </DropdownMenuLabel>
                    {publicReports.map(report => (
                      <ReportMenuItem 
                        key={report.id} 
                        report={report} 
                        onLoad={handleLoad}
                      />
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* My Reports */}
                {myReports.length > 0 && (
                  <>
                    <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                      <User className="h-3 w-3 text-green-500" />
                      My Reports
                    </DropdownMenuLabel>
                    {myReports.map(report => (
                      <ReportMenuItem 
                        key={report.id} 
                        report={report} 
                        onLoad={handleLoad}
                        onEdit={handleEditClick}
                        onDelete={handleDelete}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

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

// Report menu item sub-component
interface ReportMenuItemProps {
  report: SavedReport
  onLoad: (report: SavedReport) => void
  onEdit?: (report: SavedReport) => void
  onDelete?: (reportId: string) => void
}

function ReportMenuItem({ report, onLoad, onEdit, onDelete }: ReportMenuItemProps) {
  return (
    <div className="group relative">
      <DropdownMenuItem 
        onClick={() => onLoad(report)}
        className="flex items-start gap-2 pr-16"
      >
        <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{report.name}</div>
          {report.description && (
            <div className="text-xs text-muted-foreground truncate">
              {report.description}
            </div>
          )}
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            {new Date(report.updated_at).toLocaleDateString()}
          </div>
        </div>
      </DropdownMenuItem>
      
      {(onEdit || onDelete) && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(report)
              }}
            >
              <Save className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
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
}
