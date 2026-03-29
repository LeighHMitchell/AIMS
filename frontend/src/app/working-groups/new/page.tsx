"use client"

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { WorkingGroupEditor } from '@/components/working-groups/WorkingGroupEditor'

export default function NewWorkingGroupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const parentId = searchParams?.get('parent_id') ?? null
  const parentLabel = searchParams?.get('parent_label') ?? null

  const handleCreate = (workingGroupId: string) => {
    window.history.replaceState(null, '', `/working-groups/${workingGroupId}/edit`)
  }

  const initialData: Record<string, any> = {}
  if (parentId) {
    initialData.parent_id = parentId
    initialData.group_type = 'sub_working_group'
  }

  return (
    <MainLayout>
      <WorkingGroupEditor
        initialData={initialData}
        isCreating={true}
        parentLabel={parentLabel || undefined}
        onCreate={handleCreate}
        onSuccess={() => {
          router.refresh()
        }}
      />
    </MainLayout>
  )
}
