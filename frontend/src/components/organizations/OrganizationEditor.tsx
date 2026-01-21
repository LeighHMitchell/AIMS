"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
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

  // Update active section when URL changes
  useEffect(() => {
    const section = searchParams?.get('section')
    if (section) {
      setActiveSection(section)
    }
  }, [searchParams])

  // Load organization data if we have an ID
  useEffect(() => {
    if (organizationId && !organization && !isCreating) {
      const fetchOrg = async () => {
        try {
          const response = await fetch(`/api/organizations/${organizationId}`)
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
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create organization')
      }

      const newOrg = await response.json()
      setOrganization(newOrg)
      setOrganizationCreated(true)
      
      if (onCreate) {
        onCreate(newOrg.id)
      }
      
      toast.success('Organization created successfully')
      
      // Switch to general section after creation
      setActiveSection('general')
      router.replace(`/organizations/${newOrg.id}/edit?section=general`, { scroll: false })
    } catch (error: any) {
      console.error('Error creating organization:', error)
      toast.error(error.message || 'Failed to create organization')
      throw error
    }
  }, [onCreate, router])

  // Handle organization save
  const handleSave = useCallback(async (data: Partial<Organization>) => {
    if (!organizationId && !organization?.id) {
      // Creating new organization
      await handleCreate(data)
      return
    }

    setSaving(true)
    try {
      const id = organizationId || organization?.id
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save organization')
      }

      const updatedOrg = await response.json()
      setOrganization(updatedOrg)
      toast.success('Organization saved successfully')
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error saving organization:', error)
      toast.error(error.message || 'Failed to save organization')
    } finally {
      setSaving(false)
    }
  }, [organizationId, organization, handleCreate, onSuccess])

  // Map section IDs to form tab names
  const getFormTab = (section: string) => {
    const mapping: Record<string, string> = {
      'general': 'basic',
      'branding': 'branding',
      'contact': 'contact',
      'aliases': 'aliases',
      'merge': 'merge' // Merge has its own tab
    }
    return mapping[section] || 'basic'
  }

  // Section order for navigation
  const sectionOrder = [
    'general',
    'branding',
    'contact',
    'contacts',
    'aliases',
    'merge',
    'funding-envelope',
    'iati-import',
    'budgets',
    'documents',
    'iati-prefs'
  ]

  // Navigate to next section
  const handleNextSection = useCallback(() => {
    const currentIndex = sectionOrder.indexOf(activeSection)
    if (currentIndex < sectionOrder.length - 1) {
      const nextSection = sectionOrder[currentIndex + 1]
      setActiveSection(nextSection)
      router.replace(`/organizations/${organizationId}/edit?section=${nextSection}`, { scroll: false })
    }
  }, [activeSection, organizationId, router])

  // Render section content
  const renderSectionContent = () => {
    const currentOrgId = organizationId || organization?.id
    const needsOrg = ['contacts', 'funding-envelope', 'iati-import', 'budgets', 'documents', 'iati-prefs'].includes(activeSection)

    if (needsOrg && !currentOrgId && !organizationCreated) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Please create the organization first by entering a name in the General section</p>
        </div>
      )
    }

    // For form sections, use OrganizationFormContent with inline mode
    if (['general', 'branding', 'contact', 'aliases', 'merge'].includes(activeSection)) {
      return (
        <OrganizationFormContent
          organization={organization}
          renderMode="inline"
          onSave={handleSave}
          onSuccess={() => {
            if (onSuccess) onSuccess()
          }}
          initialTab={getFormTab(activeSection)}
          externalSaving={saving}
          onNextSection={handleNextSection}
        />
      )
    }

    if (!currentOrgId) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Please create the organization first</p>
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
            <p className="text-gray-500">Section not found</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white">
      {/* Navigation Sidebar */}
      <OrganizationEditorNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        organizationCreated={organizationCreated}
        tabCompletionStatus={tabCompletionStatus}
        disabled={saving}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderSectionContent()}
      </div>
    </div>
  )
}
