"use client"

import React, { useRef, useEffect, useState } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"
import { SectionSkeleton, getSectionMinHeight } from "./SectionSkeleton"

// Import the tab components
import SDGAlignmentSection from "@/components/SDGAlignmentSection"
import TagsSection from "@/components/TagsSection"
import WorkingGroupsSection from "@/components/WorkingGroupsSection"
import PolicyMarkersSectionIATIWithCustom from "@/components/PolicyMarkersSectionIATIWithCustom"

// Section IDs for the Strategic Alignment group
export const STRATEGIC_ALIGNMENT_SECTIONS = [
  'sdg',
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
  const tagsRef = useRef<HTMLElement>(null)
  const workingGroupsRef = useRef<HTMLElement>(null)
  const policyMarkersRef = useRef<HTMLElement>(null)

  // Track if initial scroll has happened (to prevent re-scrolling when scroll spy updates)
  const hasInitiallyScrolled = useRef(false)

  // Build section refs array for scroll spy (only if activityCreated)
  const sectionRefs: SectionRef[] = activityCreated ? [
    { id: 'sdg', ref: sdgRef },
    { id: 'tags', ref: tagsRef },
    { id: 'working_groups', ref: workingGroupsRef },
    { id: 'policy_markers', ref: policyMarkersRef },
  ] : []

  // Use scroll spy to track visible section
  const { activeSection, scrollToSection, setActiveSection, lockScrollSpy } = useScrollSpy(sectionRefs, {
    rootMargin: '-80px 0px -60% 0px', // Account for sticky headers
    debounceMs: 100,
  })

  // Use lazy loader to track which sections have been scrolled into view
  const { isSectionActive, activateSection, activateSections, activeSections } = useManualLazyLoader(
    activityCreated
      ? (enablePreloading ? [...STRATEGIC_ALIGNMENT_SECTIONS] : ['sdg'])
      : []
  )

  // Track if sections have been revealed (for animation)
  const [sectionsRevealed, setSectionsRevealed] = useState(activityCreated)

  // When initialSection changes (user clicked a section in this group),
  // lock scroll spy, set active section, and instantly scroll to target
  const prevInitialSection = useRef(initialSection)
  useEffect(() => {
    if (initialSection && isStrategicAlignmentSection(initialSection) && activityCreated) {
      lockScrollSpy(500)
      setActiveSection(initialSection)
      if (initialSection !== 'sdg' || prevInitialSection.current !== initialSection) {
        requestAnimationFrame(() => {
          const el = document.getElementById(initialSection)
          if (el) el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' })
        })
      }
      prevInitialSection.current = initialSection
    }
  }, [initialSection, activityCreated, lockScrollSpy, setActiveSection])

  // Update parent when active section changes (for sidebar highlighting)
  useEffect(() => {
    if (activeSection && isStrategicAlignmentSection(activeSection)) {
      onActiveSectionChange(activeSection)

      const params = new URLSearchParams(window.location.search)
      params.set('section', activeSection)
      window.history.replaceState({}, '', `?${params.toString()}`)
    }
  }, [activeSection, onActiveSectionChange])

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
        rootMargin: '1500px 0px 1500px 0px', // Preload 1500px before visible for seamless loading
        threshold: 0,
      }
    )

    // Observe all section elements
    const sectionElements = [
      sdgRef.current,
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

    // Preload all sections in a single batch
    const sectionsToPreload = ['sdg', 'tags', 'working_groups', 'policy_markers']

    const unloaded = sectionsToPreload.filter(id => !activeSections.has(id))
    if (unloaded.length > 0) {
      activateSections(unloaded)
    }
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
            style={{ minHeight: getSectionMinHeight('sdg') }}
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

          {/* Tags Section */}
          <section
            id="tags"
            ref={tagsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('tags') }}
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
            style={{ minHeight: getSectionMinHeight('working_groups') }}
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
            style={{ minHeight: getSectionMinHeight('policy_markers') }}
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
