"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { OrganizationEditor } from '@/components/organizations/OrganizationEditor'

export default function NewOrganizationPage() {
  const router = useRouter()

  const handleCreate = (organizationId: string) => {
    // Update URL silently without causing a page refresh
    window.history.replaceState(null, '', `/organizations/${organizationId}/edit`)
  }

  return (
    <MainLayout>
      <OrganizationEditor
        initialData={{}}
        isCreating={true}
        onCreate={handleCreate}
        onSuccess={() => {
          router.refresh()
        }}
      />
    </MainLayout>
  )
}

