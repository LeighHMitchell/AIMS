"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { OrganizationEditor } from '@/components/organizations/OrganizationEditor'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface Organization {
  id?: string
  name: string
  acronym?: string
  Organisation_Type_Code?: string
  organisation_type?: string
  description?: string
  website?: string
  email?: string
  phone?: string
  address?: string
  logo?: string
  banner?: string
  country?: string
  country_represented?: string
  cooperation_modality?: string
  iati_org_id?: string
  reporting_org_ref?: string
  reporting_org_type?: string
  reporting_org_name?: string
  reporting_org_secondary_reporter?: boolean
  last_updated_datetime?: string
  default_currency?: string
  default_language?: string
  alias_refs?: string[]
  name_aliases?: string[]
  social_twitter?: string
  social_facebook?: string
  social_linkedin?: string
  social_instagram?: string
  social_youtube?: string
  [key: string]: any
}

export default function EditOrganizationPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = params?.id as string
  
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!organizationId) {
      setError('Organization ID is required')
      setLoading(false)
      return
    }

    const fetchOrganization = async () => {
      try {
        const response = await fetch(`/api/organizations/${organizationId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Organization not found')
          } else {
            setError('Failed to load organization')
          }
          return
        }

        const data = await response.json()
        setOrganization(data)
      } catch (err) {
        console.error('Error fetching organization:', err)
        setError('Failed to load organization')
      } finally {
        setLoading(false)
      }
    }

    fetchOrganization()
  }, [organizationId])

  const handleSuccess = () => {
    // Optionally redirect or show success message
    router.refresh()
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto p-6">
          <Skeleton className="h-12 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    )
  }

  if (!organization) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Not Found</AlertTitle>
            <AlertDescription>Organization not found</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <OrganizationEditor
        organizationId={organizationId}
        initialData={organization}
        isCreating={false}
        onSuccess={handleSuccess}
      />
    </MainLayout>
  )
}


