"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { WorkingGroupEditor } from '@/components/working-groups/WorkingGroupEditor'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'

export default function EditWorkingGroupPage() {
  const params = useParams()
  const router = useRouter()
  const workingGroupId = params?.id as string

  const [workingGroup, setWorkingGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workingGroupId) {
      setError('Working group ID is required')
      setLoading(false)
      return
    }

    const fetchWorkingGroup = async () => {
      try {
        const response = await apiFetch(`/api/working-groups/${workingGroupId}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('Working group not found')
          } else {
            setError('Failed to load working group')
          }
          return
        }

        const data = await response.json()
        setWorkingGroup(data)
      } catch (err) {
        console.error('Error fetching working group:', err)
        setError('Failed to load working group')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkingGroup()
  }, [workingGroupId])

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

  if (!workingGroup) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Not Found</AlertTitle>
            <AlertDescription>Working group not found</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <WorkingGroupEditor
        workingGroupId={workingGroupId}
        initialData={workingGroup}
        isCreating={false}
        onSuccess={() => router.refresh()}
      />
    </MainLayout>
  )
}
