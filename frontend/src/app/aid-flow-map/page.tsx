"use client"

import React, { Suspense } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { MapSkeleton } from '@/components/ui/skeleton-loader'
import { AidFlowMap } from '@/components/analytics/AidFlowMap'

export default function AidFlowMapPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Network</h1>
        <p className="text-gray-600">
          Interactive visualization of aid flows between donors and recipients
        </p>
      </div>
      
      <Suspense fallback={<MapSkeleton height="800px" />}>
        <div className="w-full py-4">
          <AidFlowMap height={800} />
        </div>
      </Suspense>
    </MainLayout>
  )
} 