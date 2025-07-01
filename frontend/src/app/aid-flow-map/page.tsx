"use client"

import React from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { AidFlowMap } from '@/components/analytics/AidFlowMap'

export default function AidFlowMapPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <AidFlowMap height={800} />
      </div>
    </MainLayout>
  )
} 