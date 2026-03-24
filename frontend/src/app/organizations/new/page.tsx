"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { OrganizationEditor } from '@/components/organizations/OrganizationEditor'

export default function NewOrganizationPage() {
  const router = useRouter()

  const handleCreate = (organizationId: string) => {
    // Update URL silently without causing a page refresh
    window.history.replaceState(null, '', `/organizations/${organizationId}/edit`)
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-6">
        <Breadcrumbs items={[
          { label: "Organizations", href: "/organizations" },
          { label: "New" },
        ]} />
      </div>
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

