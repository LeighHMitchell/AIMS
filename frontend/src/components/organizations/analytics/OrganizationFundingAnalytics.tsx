"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Info, Loader2 } from 'lucide-react'
import OrganizationFundingVisualization from '../OrganizationFundingVisualization'
import {
  OrganizationFundingEnvelope,
  getTemporalCategory
} from '@/types/organization-funding-envelope'

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
  const currentYear = new Date().getFullYear()

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

  // Categorize envelopes
  const categorized = useMemo(() => {
    const past: OrganizationFundingEnvelope[] = []
    const current: OrganizationFundingEnvelope[] = []
    const future: OrganizationFundingEnvelope[] = []

    envelopes.forEach(envelope => {
      const category = getTemporalCategory(envelope, currentYear)
      if (category === 'past') {
        past.push(envelope)
      } else if (category === 'current') {
        current.push(envelope)
      } else {
        future.push(envelope)
      }
    })

    return { past, current, future }
  }, [envelopes, currentYear])

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
      {/* Warning Banner */}
      <Alert className="border-amber-200 bg-amber-50">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <p className="font-medium mb-1">Non-Aggregatable Organisation-Level Data</p>
          <p className="text-sm">
            The figures shown below represent indicative organisation-level funding from the perspective of{' '}
            <strong>{organizationName || 'this organisation'}</strong> only. 
            They are intended for planning and coordination purposes and must <strong>not be aggregated across organisations</strong> or treated as national totals.
          </p>
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Past Aid (Actual)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {categorized.past.length > 0 ? (
                <>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(
                    categorized.past.reduce((sum, e) => sum + (e.amount_usd || e.amount || 0), 0)
                  )}
                </>
              ) : (
                <span className="text-slate-400">No data</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {categorized.past.length} {categorized.past.length === 1 ? 'entry' : 'entries'} (2022-{currentYear - 1})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Current Aid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {categorized.current.length > 0 ? (
                <>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(
                    categorized.current.reduce((sum, e) => sum + (e.amount_usd || e.amount || 0), 0)
                  )}
                </>
              ) : (
                <span className="text-slate-400">No data</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {categorized.current.length} {categorized.current.length === 1 ? 'entry' : 'entries'} ({currentYear})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Future Aid (Indicative)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {categorized.future.length > 0 ? (
                <>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(
                    categorized.future.reduce((sum, e) => sum + (e.amount_usd || e.amount || 0), 0)
                  )}
                </>
              ) : (
                <span className="text-slate-400">No data</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {categorized.future.length} {categorized.future.length === 1 ? 'entry' : 'entries'} ({currentYear + 1}+)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visualizations */}
      <OrganizationFundingVisualization 
        envelopes={envelopes}
        organizationName={organizationName}
      />
    </div>
  )
}
