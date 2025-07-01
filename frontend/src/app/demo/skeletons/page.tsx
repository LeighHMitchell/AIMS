"use client"

import React, { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityProfileSkeleton } from '@/components/skeletons/ActivityProfileSkeleton'
import { ValidationQueueSkeleton } from '@/components/skeletons/ValidationQueueSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SkeletonDemoPage() {
  const [showActivityProfile, setShowActivityProfile] = useState(false)
  const [showValidationQueue, setShowValidationQueue] = useState(false)

  // Simulate loading
  const simulateLoading = (type: 'activity' | 'validation') => {
    if (type === 'activity') {
      setShowActivityProfile(true)
      setTimeout(() => setShowActivityProfile(false), 3000)
    } else {
      setShowValidationQueue(true)
      setTimeout(() => setShowValidationQueue(false), 3000)
    }
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Skeleton Loading Animations Demo</h1>
          <p className="text-muted-foreground mb-8">
            Preview the skeleton loading states for Activity Profile and Validation Queue views
          </p>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity-profile">Activity Profile</TabsTrigger>
              <TabsTrigger value="validation-queue">Validation Queue</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Profile Skeleton</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Used when loading individual activity details including title, status pills, 
                      description blocks, and transaction tables.
                    </p>
                    <Button onClick={() => simulateLoading('activity')}>
                      Preview Loading State
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Validation Queue Skeleton</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Used when loading the validation queue including header, filter inputs, 
                      stats cards, and activity table rows.
                    </p>
                    <Button onClick={() => simulateLoading('validation')}>
                      Preview Loading State
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Implementation Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Key Features:</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Shimmer animation effect using CSS gradients</li>
                      <li>Maintains exact layout structure to prevent shifts</li>
                      <li>Accessible with aria-busy and aria-label attributes</li>
                      <li>Smooth fade-in transition when real content loads</li>
                      <li>Responsive design matching actual components</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Usage Example:</h3>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`import { ActivityProfileSkeleton } from '@/components/skeletons'

// In your component
if (loading) {
  return <ActivityProfileSkeleton />
}

// Render actual content when loaded
return <ActualContent />`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity-profile">
              {showActivityProfile ? (
                <div className="relative">
                  <div className="absolute top-4 right-4 z-10">
                    <Card className="bg-yellow-50 border-yellow-200">
                      <CardContent className="p-3">
                        <p className="text-sm text-yellow-800">Loading simulation active (3s)</p>
                      </CardContent>
                    </Card>
                  </div>
                  <ActivityProfileSkeleton />
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      Click the button below to see the Activity Profile skeleton in action
                    </p>
                    <Button onClick={() => simulateLoading('activity')}>
                      Show Activity Profile Skeleton
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="validation-queue">
              {showValidationQueue ? (
                <div className="relative">
                  <div className="absolute top-4 right-4 z-10">
                    <Card className="bg-yellow-50 border-yellow-200">
                      <CardContent className="p-3">
                        <p className="text-sm text-yellow-800">Loading simulation active (3s)</p>
                      </CardContent>
                    </Card>
                  </div>
                  <ValidationQueueSkeleton />
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      Click the button below to see the Validation Queue skeleton in action
                    </p>
                    <Button onClick={() => simulateLoading('validation')}>
                      Show Validation Queue Skeleton
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
}