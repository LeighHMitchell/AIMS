"use client"

import React, { useRef, useEffect, useState } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"

// Import the tab components
import SDGAlignmentSection from "@/components/SDGAlignmentSection"
import BudgetMappingTab from "@/components/activities/BudgetMappingTab"
import TagsSection from "@/components/TagsSection"
import WorkingGroupsSection from "@/components/WorkingGroupsSection"
import PolicyMarkersSectionIATIWithCustom from "@/components/PolicyMarkersSectionIATIWithCustom"

// Section IDs for the Strategic Alignment group
export const STRATEGIC_ALIGNMENT_SECTIONS = [
  'sdg',
  'country-budget',
  'tags',
  'working_groups',
  'policy_markers'
] as const
export type StrategicAlignmentSectionId = typeof STRATEGIC_ALIGNMENT_SECTIONS[number]

/**
 * Check if a section ID belongs to the Strategic Alignment group
 */
export function isStrategicAlignmentSection(sectionId: string): boolean {
  return STRATEGIC_ALIGNMENT_SECTIONS.includes(sectionId as StrategicAlignmentSectionId)
}

/**
 * Loading skeleton for sections
 */
function SectionSkeleton({ sectionId }: { sectionId: string }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
      <div className="h-32 bg-gray-200 rounded w-full" />
    </div>
  )
}

// Props interface
interface StrategicAlignmentGroupProps {
  // Activity context
  activityId: string
  userId?: string

  // Permissions
  permissions: {
    canEditActivity?: boolean
    [key: string]: any
  } | null

  // Scroll integration
  onActiveSectionChange: (sectionId: string) => void
  initialSection?: string
  activityCreated: boolean

  // Lazy loading control
  // When false, aggressive preloading is disabled - sections only load via IntersectionObserver
  enablePreloading?: boolean

  // SDG props
  sdgMappings: any[]
  onSdgMappingsChange: (mappings: any[]) => void

  // Budget Mapping props
  general: any
  setGeneral: (fn: (prev: any) => any) => void
  onCountryBudgetItemsChange: (count: number) => void
  totalBudgetUSD: number

  // Tags props
  tags: any[]
  onTagsChange: (tags: any[]) => void

  // Working Groups props
  workingGroups: any[]
  onWorkingGroupsChange: (groups: any[]) => void
  setHasUnsavedChanges: (value: boolean) => void

  // Policy Markers props
  policyMarkers: any[]
  onPolicyMarkersChange: (markers: any[]) => void
}

/**
 * StrategicAlignmentGroup - Renders all Strategic Alignment sections in a scrollable container
 * with scroll spy integration for dynamic sidebar highlighting.
 */
export function StrategicAlignmentGroup({
  // Activity context
  activityId,
  userId,
  permissions,

  // Scroll integration
  onActiveSectionChange,
  initialSection,
  activityCreated,

  // Lazy loading control (default false - no aggressive preloading)
  enablePreloading = false,

  // SDG props
  sdgMappings,
  onSdgMappingsChange,

  // Budget Mapping props
  general,
  setGeneral,
  onCountryBudgetItemsChange,
  totalBudgetUSD,

  // Tags props
  tags,
  onTagsChange,

  // Working Groups props
  workingGroups,
  onWorkingGroupsChange,
  setHasUnsavedChanges,

  // Policy Markers props
  policyMarkers,
  onPolicyMarkersChange,
}: StrategicAlignmentGroupProps) {

  // Create refs for each section
  const sdgRef = useRef<HTMLElement>(null)
  const countryBudgetRef = useRef<HTMLElement>(null)
  const tagsRef = useRef<HTMLElement>(null)
  const workingGroupsRef = useRef<HTMLElement>(null)
  const policyMarkersRef = useRef<HTMLElement>(null)

  // Track if initial scroll has happened (to prevent re-scrolling when scroll spy updates)
  const hasInitiallyScrolled = useRef(false)

  // Build section refs array for scroll spy (only if activityCreated)
  const sectionRefs: SectionRef[] = activityCreated ? [
    { id: 'sdg', ref: sdgRef },
    { id: 'country-budget', ref: countryBudgetRef },
    { id: 'tags', ref: tagsRef },
    { id: 'working_groups', ref: workingGroupsRef },
    { id: 'policy_markers', ref: policyMarkersRef },
  ] : []

  // Use scroll spy to track visible section
  const { activeSection, scrollToSection, setActiveSection } = useScrollSpy(sectionRefs, {
    rootMargin: '-80px 0px -60% 0px', // Account for sticky headers
    debounceMs: 100,
  })

  // Use lazy loader to track which sections have been scrolled into view
  const { isSectionActive, activateSection, activeSections } = useManualLazyLoader(
    activityCreated ? ['sdg'] : []
  )

  // Track if sections have been revealed (for animation)
  const [sectionsRevealed, setSectionsRevealed] = useState(activityCreated)

  // Update parent when active section changes (for sidebar highlighting)
  // Only update if the active section belongs to this group
  useEffect(() => {
    if (activeSection && isStrategicAlignmentSection(activeSection)) {
      onActiveSectionChange(activeSection)

      // Update URL without triggering navigation
      const params = new URLSearchParams(window.location.search)
      params.set('section', activeSection)
      window.history.replaceState({}, '', `?${params.toString()}`)
    }
  }, [activeSection, onActiveSectionChange])

  // Handle initial scroll to section from URL (only on first mount)
  useEffect(() => {
    // Only scroll on initial mount, not when initialSection changes from scrolling
    if (
      !hasInitiallyScrolled.current &&
      initialSection &&
      initialSection !== 'sdg' &&
      activityCreated &&
      isStrategicAlignmentSection(initialSection)
    ) {
      hasInitiallyScrolled.current = true
      // Wait for content to render, then scroll
      const timer = setTimeout(() => {
        scrollToSection(initialSection)
        activateSection(initialSection)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [initialSection, activityCreated, scrollToSection, activateSection])

  // Handle activity creation - reveal sections with animation
  useEffect(() => {
    if (activityCreated && !sectionsRevealed) {
      setSectionsRevealed(true)
      // Activate the first section
      activateSection('sdg')
    }
  }, [activityCreated, sectionsRevealed, activateSection])

  // Listen for scroll events from sidebar clicks
  useEffect(() => {
    const handleScrollToSection = (event: CustomEvent<string>) => {
      const sectionId = event.detail
      if (isStrategicAlignmentSection(sectionId)) {
        scrollToSection(sectionId)
        activateSection(sectionId)
      }
    }

    window.addEventListener('scrollToSection', handleScrollToSection as EventListener)
    return () => {
      window.removeEventListener('scrollToSection', handleScrollToSection as EventListener)
    }
  }, [scrollToSection, activateSection])

  // Intersection Observer for lazy loading sections
  useEffect(() => {
    if (!activityCreated) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id
            activateSection(sectionId)
          }
        })
      },
      {
        rootMargin: '800px 0px 800px 0px', // Preload 800px before visible for seamless loading
        threshold: 0,
      }
    )

    // Observe all section elements
    const sectionElements = [
      sdgRef.current,
      countryBudgetRef.current,
      tagsRef.current,
      workingGroupsRef.current,
      policyMarkersRef.current
    ]
    sectionElements.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [activityCreated, activateSection])

  // Aggressive preloading - load all sections quickly for seamless scrolling
  // Only enabled when enablePreloading prop is true (user has visited this group)
  useEffect(() => {
    if (!activityCreated || !enablePreloading) return

    // Preload all sections with minimal staggering
    const sectionsToPreload = ['sdg', 'country-budget', 'tags', 'working_groups', 'policy_markers']

    sectionsToPreload.forEach((sectionId, index) => {
      setTimeout(() => {
        if (!activeSections.has(sectionId)) {
          activateSection(sectionId)
        }
      }, 300 + (50 * index)) // Start after 300ms, 50ms stagger between sections
    })
  }, [activityCreated, enablePreloading, activateSection, activeSections])

  return (
    <div className="strategic-alignment-group space-y-0">
      {/* Show message if activity not created */}
      {!activityCreated && (
        <div className="text-center py-12 text-gray-500">
          <p>Please save the activity first to access strategic alignment sections.</p>
        </div>
      )}

      {/* Sections revealed after activity creation */}
      {activityCreated && (
        <div className={`transition-all duration-500 ${sectionsRevealed ? 'opacity-100' : 'opacity-0'}`}>
          {/* SDG Alignment Section */}
          <section
            id="sdg"
            ref={sdgRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pb-16"
          >
            {isSectionActive('sdg') || activeSections.has('sdg') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="sdg"
                  title={getSectionLabel('sdg')}
                  helpText={getSectionHelpText('sdg')}
                  showDivider={false}
                />
                <SDGAlignmentSection
                  sdgMappings={sdgMappings}
                  onUpdate={onSdgMappingsChange}
                  activityId={activityId}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="sdg" />
            )}
          </section>

          {/* Country Budget Mapping Section */}
          <section
            id="country-budget"
            ref={countryBudgetRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            {isSectionActive('country-budget') || activeSections.has('country-budget') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="country-budget"
                  title={getSectionLabel('country-budget')}
                  helpText={getSectionHelpText('country-budget')}
                  showDivider={false}
                />
                <BudgetMappingTab
                  activityId={activityId}
                  userId={userId}
                  budgetStatus={general.budgetStatus}
                  onBudgetPercentage={general.onBudgetPercentage}
                  budgetStatusNotes={general.budgetStatusNotes}
                  onActivityChange={(field, value) => {
                    setGeneral((g: any) => ({ ...g, [field]: value }))
                  }}
                  onDataChange={onCountryBudgetItemsChange}
                  totalBudgetUSD={totalBudgetUSD}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="country-budget" />
            )}
          </section>

          {/* Tags Section */}
          <section
            id="tags"
            ref={tagsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            {isSectionActive('tags') || activeSections.has('tags') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="tags"
                  title={getSectionLabel('tags')}
                  helpText={getSectionHelpText('tags')}
                  showDivider={false}
                />
                <TagsSection
                  activityId={activityId}
                  tags={tags}
                  onChange={onTagsChange}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="tags" />
            )}
          </section>

          {/* Working Groups Section */}
          <section
            id="working_groups"
            ref={workingGroupsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            {isSectionActive('working_groups') || activeSections.has('working_groups') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="working_groups"
                  title={getSectionLabel('working_groups')}
                  helpText={getSectionHelpText('working_groups')}
                  showDivider={false}
                />
                <WorkingGroupsSection
                  activityId={activityId}
                  workingGroups={workingGroups}
                  onChange={onWorkingGroupsChange}
                  setHasUnsavedChanges={setHasUnsavedChanges}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="working_groups" />
            )}
          </section>

          {/* Policy Markers Section */}
          <section
            id="policy_markers"
            ref={policyMarkersRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            {isSectionActive('policy_markers') || activeSections.has('policy_markers') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="policy_markers"
                  title={getSectionLabel('policy_markers')}
                  helpText={getSectionHelpText('policy_markers')}
                  showDivider={false}
                />
                <PolicyMarkersSectionIATIWithCustom
                  activityId={activityId}
                  policyMarkers={policyMarkers}
                  onChange={onPolicyMarkersChange}
                  setHasUnsavedChanges={setHasUnsavedChanges}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="policy_markers" />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default StrategicAlignmentGroup
