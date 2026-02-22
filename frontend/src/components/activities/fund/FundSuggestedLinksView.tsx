"use client"

import React, { useEffect, useState, useCallback } from "react"
import { apiFetch } from "@/lib/api-fetch"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Link2, X, RefreshCw, Sparkles, DollarSign } from "lucide-react"
import Link from "next/link"

interface Suggestion {
  activityId: string
  title: string
  status: string
  reasons: string[]
  confidence: number
  financialAmount: number
}

interface FundSuggestedLinksViewProps {
  activityId: string
  readOnly?: boolean
}

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function FundSuggestedLinksView({ activityId, readOnly = false }: FundSuggestedLinksViewProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linking, setLinking] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`fund-dismissed-${activityId}`)
        return stored ? new Set(JSON.parse(stored)) : new Set()
      } catch { return new Set() }
    }
    return new Set()
  })

  const loadSuggestions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/activities/${activityId}/fund-suggestions`)
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to load suggestions')
        return
      }
      const result = await res.json()
      setSuggestions(result.suggestions || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }, [activityId])

  useEffect(() => {
    if (activityId) loadSuggestions()
  }, [activityId, loadSuggestions])

  const handleLink = async (suggestion: Suggestion) => {
    setLinking(suggestion.activityId)
    try {
      const res = await apiFetch(`/api/activities/${activityId}/linked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedActivityId: suggestion.activityId,
          relationshipType: '1',
          narrative: `Linked as child of pooled fund`,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to link activity')
        return
      }

      toast.success(`${suggestion.title} linked as child activity`)
      setSuggestions(prev => prev.filter(s => s.activityId !== suggestion.activityId))
    } catch (e: any) {
      toast.error(e.message || 'Failed to link activity')
    } finally {
      setLinking(null)
    }
  }

  const handleDismiss = (activityId: string) => {
    const newDismissed = new Set(dismissed)
    newDismissed.add(activityId)
    setDismissed(newDismissed)
    try {
      localStorage.setItem(`fund-dismissed-${activityId}`, JSON.stringify(Array.from(newDismissed)))
    } catch { /* localStorage may be unavailable */ }
  }

  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.activityId))

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-8 text-gray-500"><p>{error}</p></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {visibleSuggestions.length > 0
            ? `${visibleSuggestions.length} potential child activit${visibleSuggestions.length !== 1 ? 'ies' : 'y'} found`
            : 'No suggestions found'}
        </p>
        <Button variant="outline" size="sm" onClick={loadSuggestions} className="gap-1">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {visibleSuggestions.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Sparkles className="h-8 w-8 mx-auto mb-2" />
          <p className="text-lg">No suggestions available</p>
          <p className="text-sm mt-1">The system looks for activities with transaction references to this fund, activities where this fund's organisation is a funding partner, and activities with similar titles.</p>
        </div>
      )}

      {visibleSuggestions.map(suggestion => {
        const confidenceColor = suggestion.confidence >= 60 ? 'bg-green-100 text-green-700'
          : suggestion.confidence >= 30 ? 'bg-yellow-100 text-yellow-700'
          : 'bg-gray-100 text-gray-700'

        return (
          <Card key={suggestion.activityId} className="border border-gray-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/activities/${suggestion.activityId}`}
                      className="text-blue-600 hover:underline font-medium truncate"
                    >
                      {suggestion.title}
                    </Link>
                    {suggestion.status && (
                      <Badge variant="outline" className="text-xs shrink-0">{suggestion.status}</Badge>
                    )}
                    <Badge className={`text-xs shrink-0 ${confidenceColor}`}>
                      {suggestion.confidence}% match
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {suggestion.reasons.map((reason, i) => (
                      <Badge key={i} variant="outline" className="text-xs text-gray-500">
                        {reason}
                      </Badge>
                    ))}
                  </div>

                  {suggestion.financialAmount > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <DollarSign className="h-3 w-3" />
                      {formatUSD(suggestion.financialAmount)} in linked transactions
                    </div>
                  )}
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleLink(suggestion)}
                      disabled={linking === suggestion.activityId}
                      className="gap-1"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      {linking === suggestion.activityId ? 'Linking...' : 'Link as Child'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(suggestion.activityId)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
