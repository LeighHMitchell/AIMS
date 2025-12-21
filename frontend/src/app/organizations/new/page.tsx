"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { OrganizationEditor } from '@/components/organizations/OrganizationEditor'

export default function NewOrganizationPage() {
  const router = useRouter()

  const handleCreate = (organizationId: string) => {
    // Redirect to edit page once organization is created
    router.push(`/organizations/${organizationId}/edit`)
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
