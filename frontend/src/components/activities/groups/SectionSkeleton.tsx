"use client"

import React from "react"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Estimated minimum heights for each section based on typical rendered content.
 * These prevent layout shifts when skeleton placeholders are replaced by real content.
 */
export const SECTION_MIN_HEIGHTS: Record<string, number> = {
  // Activity Overview
  sectors: 480,
  humanitarian: 340,
  'country-region': 400,
  locations: 480,
  // Stakeholders
  organisations: 560,
  contacts: 380,
  focal_points: 340,
  // Funding & Delivery
  finances: 560,
  'planned-disbursements': 380,
  budgets: 380,
  // Strategic Alignment
  sdg: 380,
  tags: 280,
  working_groups: 280,
  policy_markers: 380,
  // Supporting Info
  documents: 380,
  aid_effectiveness: 340,
  // Advanced
  linked_activities: 380,
  results: 380,
  'forward-spending-survey': 340,
  'capital-spend': 280,
  'financing-terms': 340,
  conditions: 340,
  'country-budget': 380,
}

/**
 * Get the estimated minimum height for a section.
 * Returns a default of 320px for unknown sections.
 */
export function getSectionMinHeight(sectionId: string): number {
  return SECTION_MIN_HEIGHTS[sectionId] ?? 320
}

/**
 * Skeleton types for different section layouts
 */
type SkeletonVariant = 'form' | 'table' | 'cards' | 'mixed'

const SECTION_VARIANTS: Record<string, SkeletonVariant> = {
  sectors: 'table',
  humanitarian: 'form',
  'country-region': 'table',
  locations: 'mixed',
  organisations: 'cards',
  contacts: 'table',
  focal_points: 'table',
  finances: 'table',
  'planned-disbursements': 'table',
  budgets: 'table',
  sdg: 'cards',
  tags: 'form',
  working_groups: 'form',
  policy_markers: 'table',
  documents: 'cards',
  aid_effectiveness: 'form',
  linked_activities: 'table',
  results: 'cards',
  'forward-spending-survey': 'form',
  'capital-spend': 'form',
  'financing-terms': 'form',
  conditions: 'table',
  'country-budget': 'table',
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Form fields */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {/* Toggle/checkbox row */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-10 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      {/* Another field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search/filter bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-28" />
      </div>
      {/* Table header */}
      <div className="flex gap-4 py-3 border-b border-border">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
      </div>
      {/* Table rows */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-border">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
        </div>
      ))}
    </div>
  )
}

function CardsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}

function MixedSkeleton() {
  return (
    <div className="space-y-4">
      {/* Map placeholder */}
      <Skeleton className="h-48 w-full rounded-lg" />
      {/* Form fields below */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-28" />
      </div>
      {/* List items */}
      {[1, 2].map((i) => (
        <div key={i} className="border border-border rounded-lg p-4 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}

/**
 * Shared section skeleton component with per-section estimated heights.
 * Renders a section-appropriate loading placeholder that approximates the
 * real content height to prevent layout shifts during lazy loading.
 */
export function SectionSkeleton({ sectionId }: { sectionId: string }) {
  const variant = SECTION_VARIANTS[sectionId] ?? 'form'
  const minHeight = getSectionMinHeight(sectionId)

  return (
    <div
      className="bg-card rounded-lg shadow-sm border border-border p-8 animate-pulse"
      style={{ minHeight }}
    >
      {/* Section header */}
      <div className="mb-6">
        <Skeleton className="h-7 w-48" />
      </div>
      {/* Section-appropriate content */}
      {variant === 'form' && <FormSkeleton />}
      {variant === 'table' && <TableSkeleton />}
      {variant === 'cards' && <CardsSkeleton />}
      {variant === 'mixed' && <MixedSkeleton />}
    </div>
  )
}
