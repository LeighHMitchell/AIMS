"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-fetch'
import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import WorkingGroupEditorNavigation from './WorkingGroupEditorNavigation'
import GeneralSection from './sections/GeneralSection'
import MembersSection from './sections/MembersSection'
import MeetingsSection from './sections/MeetingsSection'
import DocumentsSection from './sections/DocumentsSection'
import ActivitiesSection from './sections/ActivitiesSection'

export interface WorkingGroup {
  id?: string
  code?: string
  label?: string
  description?: string
  sector_code?: string
  is_active?: boolean
  status?: string
  members?: any[]
  meetings?: any[]
  documents?: any[]
  activities?: any[]
  [key: string]: any
}

interface WorkingGroupEditorProps {
  workingGroupId?: string
  initialData?: Partial<WorkingGroup>
  isCreating?: boolean
  onCreate?: (workingGroupId: string) => void
  onSuccess?: () => void
}

export function WorkingGroupEditor({
  workingGroupId,
  initialData = {},
  isCreating = false,
  onCreate,
  onSuccess
}: WorkingGroupEditorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialSection = searchParams?.get('section') || 'general'
  const [activeSection, setActiveSection] = useState(initialSection)
  const [workingGroup, setWorkingGroup] = useState<WorkingGroup | null>(
    isCreating ? null : (initialData as WorkingGroup)
  )
  const [workingGroupCreated, setWorkingGroupCreated] = useState(!isCreating)
  const [saving, setSaving] = useState(false)
  const [tabCompletionStatus, setTabCompletionStatus] = useState<Record<string, { isComplete: boolean; isInProgress: boolean }>>({})
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const section = searchParams?.get('section')
    if (section) setActiveSection(section)
  }, [searchParams])

  useEffect(() => {
    if (workingGroupId && !workingGroup && !isCreating) {
      const fetchWG = async () => {
        try {
          const response = await apiFetch(`/api/working-groups/${workingGroupId}`)
          if (response.ok) {
            const data = await response.json()
            setWorkingGroup(data)
          }
        } catch (error) {
          console.error('Error fetching working group:', error)
        }
      }
      fetchWG()
    } else if (initialData && Object.keys(initialData).length > 0) {
      setWorkingGroup(initialData as WorkingGroup)
    }
  }, [workingGroupId, isCreating, initialData])

  const handleCreate = useCallback(async (wgData: Partial<WorkingGroup>) => {
    try {
      const response = await apiFetch('/api/working-groups', {
        method: 'POST',
        body: JSON.stringify(wgData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create working group')
      }

      const newWG = await response.json()
      setWorkingGroup(newWG)
      setWorkingGroupCreated(true)

      if (onCreate) onCreate(newWG.id)

      toast.success('Working group created successfully')
      setActiveSection('general')
      router.replace(`/working-groups/${newWG.id}/edit?section=general`, { scroll: false })
    } catch (error: any) {
      console.error('Error creating working group:', error)
      toast.error(error.message || 'Failed to create working group')
      throw error
    }
  }, [onCreate, router])

  const handleSave = useCallback(async (data: Partial<WorkingGroup>) => {
    if (!workingGroupId && !workingGroup?.id) {
      await handleCreate(data)
      return
    }

    setSaving(true)
    try {
      const id = workingGroupId || workingGroup?.id
      const response = await apiFetch(`/api/working-groups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save working group')
      }

      const updatedWG = await response.json()
      setWorkingGroup(prev => ({ ...prev, ...updatedWG }))

      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error('Error saving working group:', error)
      toast.error(error.message || 'Failed to save working group')
    } finally {
      setSaving(false)
    }
  }, [workingGroupId, workingGroup, handleCreate, onSuccess])

  const handleDeleteWorkingGroup = useCallback(async () => {
    const currentId = workingGroupId || workingGroup?.id
    if (!currentId) return

    setIsDeleting(true)
    try {
      const response = await apiFetch(`/api/working-groups/${currentId}`, {
        method: 'DELETE',
      })

      if (response.ok || response.status === 204) {
        toast.success(`"${workingGroup?.label || 'Working Group'}" was deleted successfully`)
        setShowDeleteDialog(false)
        router.push('/working-groups')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete working group')
      }
    } catch (error) {
      console.error('Error deleting working group:', error)
      toast.error('Failed to delete working group')
    } finally {
      setIsDeleting(false)
    }
  }, [workingGroupId, workingGroup, router])

  const sectionOrder = ['general', 'members', 'meetings', 'documents', 'activities']

  const sectionLabels: Record<string, string> = {
    general: 'General',
    members: 'Members',
    meetings: 'Meetings',
    documents: 'Documents',
    activities: 'Activities',
  }

  const currentIndex = sectionOrder.indexOf(activeSection)
  const isFirstSection = currentIndex <= 0
  const isLastSection = currentIndex >= sectionOrder.length - 1
  const nextSectionId = !isLastSection ? sectionOrder[currentIndex + 1] : null
  const prevSectionId = !isFirstSection ? sectionOrder[currentIndex - 1] : null

  const handleSectionNav = useCallback((sectionId: string) => {
    setActiveSection(sectionId)
    const id = workingGroupId || workingGroup?.id
    router.replace(`/working-groups/${id}/edit?section=${sectionId}`, { scroll: false })
  }, [workingGroupId, workingGroup, router])

  const handleNextSection = useCallback(() => {
    if (nextSectionId) handleSectionNav(nextSectionId)
  }, [nextSectionId, handleSectionNav])

  const handlePreviousSection = useCallback(() => {
    if (prevSectionId) handleSectionNav(prevSectionId)
  }, [prevSectionId, handleSectionNav])

  const renderSectionContent = () => {
    const currentId = workingGroupId || workingGroup?.id
    const needsWG = ['members', 'meetings', 'documents', 'activities'].includes(activeSection)

    if (needsWG && !currentId && !workingGroupCreated) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Please create the working group first by entering a name in the General section</p>
        </div>
      )
    }

    switch (activeSection) {
      case 'general':
        return (
          <div className="h-full overflow-y-auto p-6">
            <GeneralSection
              workingGroup={workingGroup}
              workingGroupId={currentId}
              isCreating={isCreating && !workingGroupCreated}
              onSave={handleSave}
            />
          </div>
        )

      case 'members':
        return currentId ? (
          <div className="h-full overflow-y-auto p-6">
            <MembersSection workingGroupId={currentId} />
          </div>
        ) : null

      case 'meetings':
        return currentId ? (
          <div className="h-full overflow-y-auto p-6">
            <MeetingsSection workingGroupId={currentId} />
          </div>
        ) : null

      case 'documents':
        return currentId ? (
          <div className="h-full overflow-y-auto p-6">
            <DocumentsSection workingGroupId={currentId} />
          </div>
        ) : null

      case 'activities':
        return currentId ? (
          <div className="h-full overflow-y-auto p-6">
            <ActivitiesSection
              activities={workingGroup?.activities || []}
            />
          </div>
        ) : null

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Section not found</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white">
      <WorkingGroupEditorNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        workingGroupCreated={workingGroupCreated}
        tabCompletionStatus={tabCompletionStatus}
        disabled={saving}
        workingGroup={workingGroup}
        onDelete={() => setShowDeleteDialog(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {renderSectionContent()}
        </div>

        {/* Fixed footer with Back/Next navigation — matches Activity Editor */}
        {workingGroupCreated && (
          <footer className="border-t bg-white px-8 py-4">
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                className="px-6 py-3 text-base font-semibold"
                onClick={handlePreviousSection}
                disabled={isFirstSection}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back
              </Button>
              <Button
                variant="default"
                className="px-6 py-3 text-base font-semibold min-w-[140px]"
                onClick={handleNextSection}
                disabled={isLastSection}
              >
                {nextSectionId ? sectionLabels[nextSectionId] : 'Next'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </footer>
        )}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Working Group
            </DialogTitle>
            <DialogDescription className="pt-3">
              Are you sure you want to delete &quot;{workingGroup?.label || 'this working group'}&quot;?
              This action cannot be undone. All members, meetings, and documents will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWorkingGroup} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Working Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
