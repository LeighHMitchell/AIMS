"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-fetch'
import { AlertTriangle, ArrowLeft, ArrowRight, MessageSquare, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportOrganizationToExcel } from '@/lib/organization-export'
import { OrganizationComments } from './OrganizationComments'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import OrganizationEditorNavigation from './OrganizationEditorNavigation'
import { OrganizationFormContent, Organization } from './OrganizationFormContent'
import { IATIBudgetManager } from './IATIBudgetManager'
import { IATIDocumentManager } from './IATIDocumentManager'
import IATIImportPreferences from './IATIImportPreferences'
import IATIOrgImportTab from './IATIOrgImportTab'
import OrganizationFundingEnvelopeTab from './OrganizationFundingEnvelopeTab'
import OrganizationContactsTab from './OrganizationContactsTab'

interface OrganizationEditorProps {
  organizationId?: string
  initialData?: Partial<Organization>
  isCreating?: boolean
  onCreate?: (organizationId: string) => void
  onSuccess?: () => void
}

export function OrganizationEditor({
  organizationId,
  initialData = {},
  isCreating = false,
  onCreate,
  onSuccess
}: OrganizationEditorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial section from URL or default to 'general'
  const initialSection = searchParams?.get('section') || 'general'
  const [activeSection, setActiveSection] = useState(initialSection)
  const [organization, setOrganization] = useState<Organization | null>(
    isCreating ? null : (initialData as Organization)
  )
  const [organizationCreated, setOrganizationCreated] = useState(!isCreating)
  const [saving, setSaving] = useState(false)
  const [tabCompletionStatus, setTabCompletionStatus] = useState<Record<string, { isComplete: boolean; isInProgress: boolean }>>({})
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  // Footer state for standalone (non-form) sections — these tabs autosave so
  // there's no Save button, but we still want navigation, comments and export.
  const [showStandaloneCommentsModal, setShowStandaloneCommentsModal] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Ref to track current org ID so callbacks don't depend on the full organization object
  const orgIdRef = useRef(organizationId || (initialData as Organization)?.id)
  useEffect(() => {
    orgIdRef.current = organizationId || organization?.id
  }, [organizationId, organization?.id])

  // Load organization data if we have an ID
  useEffect(() => {
    if (organizationId && !organization && !isCreating) {
      const fetchOrg = async () => {
        try {
          const response = await apiFetch(`/api/organizations/${organizationId}`)
          if (response.ok) {
            const data = await response.json()
            setOrganization(data)
          }
        } catch (error) {
          console.error('Error fetching organization:', error)
        }
      }
      fetchOrg()
    } else if (initialData && Object.keys(initialData).length > 0) {
      setOrganization(initialData as Organization)
    }
  }, [organizationId, isCreating, initialData])

  // Handle organization creation
  const handleCreate = useCallback(async (orgData: Partial<Organization>) => {
    try {
      const response = await apiFetch('/api/organizations', {
        method: 'POST',
        body: JSON.stringify(orgData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to create organisation')
      }

      const newOrg = await response.json()
      setOrganization(newOrg)
      setOrganizationCreated(true)
      
      if (onCreate) {
        onCreate(newOrg.id)
      }
      
      toast.success('Organisation created successfully')
      
      // Switch to general section after creation
      setActiveSection('general')
      router.replace(`/organizations/${newOrg.id}/edit?section=general`, { scroll: false })
    } catch (error: any) {
      console.error('Error creating organization:', error)
      toast.error(error.message || 'Failed to create organisation')
      throw error
    }
  }, [onCreate, router])

  // Handle organization save
  const handleSave = useCallback(async (data: Partial<Organization>) => {
    const currentId = orgIdRef.current
    if (!currentId) {
      // Creating new organization
      await handleCreate(data)
      return
    }

    setSaving(true)
    try {
      const response = await apiFetch(`/api/organizations/${currentId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to save organisation')
      }

      const updatedOrg = await response.json()
      setOrganization(updatedOrg)
      toast.success('Organisation saved successfully')
    } catch (error: any) {
      console.error('Error saving organization:', error)
      toast.error(error.message || 'Failed to save organisation')
    } finally {
      setSaving(false)
    }
  }, [handleCreate])

  // Handle organization deletion
  const handleDeleteOrganization = useCallback(async () => {
    const currentOrgId = orgIdRef.current
    if (!currentOrgId) return

    setIsDeleting(true)
    try {
      const response = await apiFetch(`/api/organizations/${currentOrgId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast(`"${organization?.name || 'Organization'}" was deleted`)
        setShowDeleteDialog(false)
        router.push('/')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete organization')
      }
    } catch (error) {
      console.error('Error deleting organization:', error)
      toast.error('Failed to delete organisation')
    } finally {
      setIsDeleting(false)
    }
  }, [router])

  // Map section IDs to form tab names
  const getFormTab = (section: string) => {
    const mapping: Record<string, string> = {
      'general': 'basic',
      'contact': 'contact',
      'aliases': 'aliases',
      'merge': 'merge' // Merge has its own tab
    }
    return mapping[section] || 'basic'
  }

  // Section order for navigation — must mirror the navigation groups in
  // OrganizationEditorNavigation.tsx so Back / Next walk in the same order
  // the user sees in the sidebar.
  const sectionOrder = [
    'general',
    'contact',
    'contacts',
    'funding-envelope',
    'iati-import',
    'budgets',
    'documents',
    'iati-prefs',
    'aliases',
    'merge',
  ]

  // Navigate to next section
  const handleNextSection = useCallback(() => {
    const currentIndex = sectionOrder.indexOf(activeSection)
    if (currentIndex < sectionOrder.length - 1) {
      const nextSection = sectionOrder[currentIndex + 1]
      setActiveSection(nextSection)
      window.history.replaceState(null, '', `/organizations/${orgIdRef.current}/edit?section=${nextSection}`)
    }
  }, [activeSection])

  // Navigate to previous section
  const handlePreviousSection = useCallback(() => {
    const currentIndex = sectionOrder.indexOf(activeSection)
    if (currentIndex > 0) {
      const previousSection = sectionOrder[currentIndex - 1]
      setActiveSection(previousSection)
      window.history.replaceState(null, '', `/organizations/${orgIdRef.current}/edit?section=${previousSection}`)
    }
  }, [activeSection])

  const currentSectionIndex = sectionOrder.indexOf(activeSection)
  const hasPreviousSection = currentSectionIndex > 0
  const hasNextSection = currentSectionIndex >= 0 && currentSectionIndex < sectionOrder.length - 1

  // Render section content
  const renderSectionContent = () => {
    const currentOrgId = organizationId || organization?.id
    const needsOrg = ['contacts', 'funding-envelope', 'iati-import', 'budgets', 'documents', 'iati-prefs'].includes(activeSection)

    if (needsOrg && !currentOrgId && !organizationCreated) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Please create the organisation first by entering a name in the General section</p>
        </div>
      )
    }

    // For form sections, use OrganizationFormContent with inline mode
    if (['general', 'contact', 'aliases', 'merge'].includes(activeSection)) {
      return (
        <OrganizationFormContent
          organization={organization}
          renderMode="inline"
          onSave={handleSave}
          onSuccess={onSuccess}
          initialTab={getFormTab(activeSection)}
          externalSaving={saving}
          onNextSection={handleNextSection}
          onPreviousSection={handlePreviousSection}
          hasPreviousSection={hasPreviousSection}
          hasNextSection={hasNextSection}
        />
      )
    }

    if (!currentOrgId) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Please create the organisation first</p>
        </div>
      )
    }

    switch (activeSection) {
      case 'contacts':
        return (
          <div className="h-full overflow-y-auto p-6">
            <OrganizationContactsTab
              organizationId={currentOrgId}
              organization={organization ? { name: organization.name, acronym: organization.acronym, logo: organization.logo } : undefined}
            />
          </div>
        )

      case 'funding-envelope':
        return (
          <div className="h-full overflow-y-auto p-6">
            <OrganizationFundingEnvelopeTab organizationId={currentOrgId} />
          </div>
        )

      case 'iati-import':
        return (
          <div className="h-full overflow-y-auto p-6">
            <IATIOrgImportTab 
              organizationId={currentOrgId}
              currentOrgData={organization}
            />
          </div>
        )

      case 'budgets':
        return (
          <div className="h-full overflow-y-auto p-6">
            <IATIBudgetManager organizationId={currentOrgId} />
          </div>
        )

      case 'documents':
        return (
          <div className="h-full overflow-y-auto p-6">
            <IATIDocumentManager organizationId={currentOrgId} />
          </div>
        )

      case 'iati-prefs':
        return (
          <div className="h-full overflow-y-auto p-6">
            <IATIImportPreferences organizationId={currentOrgId} />
          </div>
        )

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Section not found</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden gap-x-6 lg:gap-x-8">
      {/* Navigation Sidebar */}
      <aside className="w-80 flex-shrink-0 bg-card overflow-y-auto pb-24">
        <OrganizationEditorNavigation
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          organizationCreated={organizationCreated}
          tabCompletionStatus={tabCompletionStatus}
          disabled={saving}
          organization={organization}
          onDelete={() => setShowDeleteDialog(true)}
        />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-card pb-24">
        {renderSectionContent()}
      </main>

      {/* Footer for standalone-component sections — the form sections render
          their own footer inside OrganizationFormContent, so we only render
          this one when a non-form section is active to avoid duplicates. */}
      {!['general', 'contact', 'aliases', 'merge'].includes(activeSection) && (
        <footer className="fixed bottom-0 right-0 left-72 bg-card/60 dark:bg-gray-900/60 backdrop-blur-md py-4 px-8 z-[60]">
          <div className="max-w-full flex items-center justify-end gap-3">
            {/* Comments Button */}
            {organization?.id ? (
              <Button
                variant="outline"
                className="px-4 py-3 text-base font-semibold relative"
                onClick={() => setShowStandaloneCommentsModal(true)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Comments
              </Button>
            ) : (
              <Button
                variant="outline"
                className="px-4 py-3 text-base font-semibold opacity-50 cursor-not-allowed"
                disabled
                title="Save the organisation first to enable comments"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Comments
              </Button>
            )}

            {/* Back Button */}
            <Button
              variant="outline"
              className="px-6 py-3 text-base font-semibold min-w-[140px]"
              onClick={handlePreviousSection}
              disabled={!hasPreviousSection || saving}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {/* Next Button */}
            <Button
              variant="outline"
              className="px-6 py-3 text-base font-semibold min-w-[120px]"
              onClick={handleNextSection}
              disabled={!hasNextSection || saving}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {/* Export for Review Button */}
            {organization?.id && (
              <Button
                variant="outline"
                className="px-6 py-3 text-base font-semibold min-w-[200px]"
                onClick={async () => {
                  if (exporting || !organization?.id) return
                  setExporting(true)
                  try {
                    await exportOrganizationToExcel(organization.id)
                  } catch (e) {
                    console.error('[OrgEditor] Export for Review failed:', e)
                    toast.error('Failed to generate Excel export')
                  } finally {
                    setExporting(false)
                  }
                }}
                disabled={exporting || saving}
                title="Download a complete Excel snapshot of this organisation to share with a reviewer"
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? 'Exporting…' : 'Export for Review'}
              </Button>
            )}
          </div>
        </footer>
      )}

      {/* Comments dialog for standalone sections */}
      {organization?.id && (
        <Dialog
          open={showStandaloneCommentsModal}
          onOpenChange={setShowStandaloneCommentsModal}
        >
          <DialogContent className="max-w-3xl min-h-[60vh] max-h-[95vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Comments</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-hidden">
              <OrganizationComments
                organizationId={organization.id}
                contextSection={activeSection}
                allowContextSwitch
                showInline
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Organization Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Organization
            </DialogTitle>
            <DialogDescription className="pt-3">
              Are you sure you want to delete "{organization?.name || 'this organization'}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrganization} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Organisation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
