"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import OrganizationFundingVisualization from '../OrganizationFundingVisualization'
import { OrganizationFundingEnvelope } from '@/types/organization-funding-envelope'

interface OrganizationFundingAnalyticsProps {
  organizationId: string
  organizationName?: string
}

export function OrganizationFundingAnalytics({
  organizationId,
  organizationName
}: OrganizationFundingAnalyticsProps) {
  const [envelopes, setEnvelopes] = useState<OrganizationFundingEnvelope[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch envelopes
  useEffect(() => {
    const fetchEnvelopes = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/organizations/${organizationId}/funding-envelopes`)
        if (!response.ok) {
          throw new Error('Failed to fetch funding envelopes')
        }
        const data = await response.json()
        setEnvelopes(data || [])
      } catch (err) {
        console.error('[Organization Funding Analytics] Error fetching:', err)
        setError('Failed to load funding envelope data')
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      fetchEnvelopes()
    }
  }, [organizationId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Visualizations */}
      <OrganizationFundingVisualization
        envelopes={envelopes}
        organizationName={organizationName}
      />
    </div>
  )
}



