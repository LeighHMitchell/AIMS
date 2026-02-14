"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { WorkingGroupEditor } from '@/components/working-groups/WorkingGroupEditor'

export default function NewWorkingGroupPage() {
  const router = useRouter()

  const handleCreate = (workingGroupId: string) => {
    window.history.replaceState(null, '', `/working-groups/${workingGroupId}/edit`)
  }

  return (
    <MainLayout>
      <WorkingGroupEditor
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
