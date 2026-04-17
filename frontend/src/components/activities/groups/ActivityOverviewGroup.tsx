"use client"

import React, { useRef, useEffect, useCallback, useState, useMemo } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"
import { SectionSkeleton, getSectionMinHeight } from "./SectionSkeleton"

// Import the tab components
import ImprovedSectorAllocationForm from "@/components/activities/ImprovedSectorAllocationForm"
import { HumanitarianTab } from "@/components/activities/HumanitarianTab"

// Section IDs for the Activity Overview group
export const ACTIVITY_OVERVIEW_SECTIONS = ['general', 'sectors', 'humanitarian'] as const
export type ActivityOverviewSectionId = typeof ACTIVITY_OVERVIEW_SECTIONS[number]

/**
 * Check if a section ID belongs to the Activity Overview group
 */
export function isActivityOverviewSection(sectionId: string): boolean {
  return ACTIVITY_OVERVIEW_SECTIONS.includes(sectionId as ActivityOverviewSectionId)
}

// Props interface - this matches the props passed from page.tsx
interface ActivityOverviewGroupProps {
  // General state and handlers
  general: any
  setGeneral: (fn: (prev: any) => any) => void
  user: any
  getDateFieldStatus: (fieldName: string) => any
  setHasUnsavedChanges: (value: boolean) => void
  updateActivityNestedField: (field: string, value: any) => void
  setShowActivityCreatedAlert: (value: boolean) => void
  onTitleAutosaveState: (state: any, id: string) => void
  clearSavedFormData: () => void
  isNewActivity: boolean
  
  // Sectors props
  sectors: any[]
  setSectors: (sectors: any[]) => void
  setSectorValidation: (validation: any) => void
  setSectorsCompletionStatusWithLogging: (status: any) => void
  onSectorExportLevelChange: (level: string) => void
  
  // Humanitarian props
  setHumanitarian: (data: any) => void
  setHumanitarianScopes: (data: any) => void
  
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

  // Render function for GeneralSection (since it's defined inline in page.tsx)
  renderGeneralSection: () => React.ReactNode
}


/**
 * ActivityOverviewGroup - Renders all Activity Overview sections in a scrollable container
 * with scroll spy integration for dynamic sidebar highlighting.
 */
export function ActivityOverviewGroup({
  // General
  general,
  setGeneral,
  user,
  getDateFieldStatus,
  setHasUnsavedChanges,
  updateActivityNestedField,
  setShowActivityCreatedAlert,
  onTitleAutosaveState,
  clearSavedFormData,
  isNewActivity,
  
  // Sectors
  sectors,
  setSectors,
  setSectorValidation,
  setSectorsCompletionStatusWithLogging,
  onSectorExportLevelChange,
  
  // Humanitarian
  setHumanitarian,
  setHumanitarianScopes,
  
  // Permissions
  permissions,

  // Scroll integration
  onActiveSectionChange,
  initialSection,
  activityCreated,

  // Lazy loading control (default true for ActivityOverview since it's the first group)
  enablePreloading = true,

  // Render function for GeneralSection
  renderGeneralSection,
}: ActivityOverviewGroupProps) {
  
  // Create refs for each section
  const generalRef = useRef<HTMLElement>(null)
  const sectorsRef = useRef<HTMLElement>(null)
  const humanitarianRef = useRef<HTMLElement>(null)
  
  // Track if initial scroll has happened (to prevent re-scrolling when scroll spy updates)
  const hasInitiallyScrolled = useRef(false)
  
  // Build section refs array for scroll spy (memoized to prevent IntersectionObserver restarts)
  const sectionRefs: SectionRef[] = useMemo(() => [
    { id: 'general', ref: generalRef },
    ...(activityCreated ? [
      { id: 'sectors', ref: sectorsRef },
      { id: 'humanitarian', ref: humanitarianRef },
    ] : []),
  ], [activityCreated])
  
  // Use scroll spy to track visible section
  const { activeSection, scrollToSection, setActiveSection, lockScrollSpy } = useScrollSpy(sectionRefs, {
    rootMargin: '-80px 0px -50% 0px', // Active zone: top 50% minus header offset
    debounceMs: 150,
    initialSection: initialSection && isActivityOverviewSection(initialSection) ? initialSection : null,
  })

  // Use lazy loader to track which sections have been scrolled into view
  const { isSectionActive, activateSection, activateSections, activeSections } = useManualLazyLoader(
    enablePreloading && activityCreated
      ? [...ACTIVITY_OVERVIEW_SECTIONS]
      : ['general']
  )

  // Track if sections have been revealed (for animation)
  const [sectionsRevealed, setSectionsRevealed] = useState(activityCreated)

  // When initialSection changes (user clicked a section in this group),
  // lock scroll spy, set active section, and instantly scroll to target
  const prevInitialSection = useRef(initialSection)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (initialSection && isActivityOverviewSection(initialSection) && activityCreated) {
      lockScrollSpy(2000)
      setActiveSection(initialSection)
      if (prevInitialSection.current !== initialSection || isFirstRender.current) {
        requestAnimationFrame(() => {
          const el = document.getElementById(initialSection)
          if (!el) return
          const scroll = () => el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' })
          scroll()
        })
      }
      prevInitialSection.current = initialSection
    }
  }, [initialSection, activityCreated, lockScrollSpy, setActiveSection])

  // Stable ref for callback to avoid infinite re-render loop
  const onActiveSectionChangeRef = useRef(onActiveSectionChange)
  onActiveSectionChangeRef.current = onActiveSectionChange

  // Update parent when active section changes (for sidebar highlighting)
  // Skipped on first render — scroll spy hasn't settled yet
  // NOTE: Do NOT call window.history.replaceState here — it triggers Next.js's
  // useSearchParams to update, which fires the page's useEffect([searchParams]),
  // creating an infinite re-render loop. URL updates happen only in handleTabChange.
  useEffect(() => {
    if (isFirstRender.current) return
    if (activeSection && isActivityOverviewSection(activeSection)) {
      // Sync prevInitialSection so the parent re-render doesn't re-trigger scrollIntoView
      prevInitialSection.current = activeSection
      onActiveSectionChangeRef.current(activeSection)
    }
  }, [activeSection])

  useEffect(() => {
    isFirstRender.current = false
  })
  
  // Handle activity creation - reveal sections with animation
  useEffect(() => {
    if (activityCreated && !sectionsRevealed) {
      setSectionsRevealed(true)
      // Activate the first section after general
      activateSection('sectors')
    }
  }, [activityCreated, sectionsRevealed, activateSection])
  
  // Listen for scroll events from sidebar clicks
  useEffect(() => {
    const handleScrollToSection = (event: CustomEvent<string>) => {
      const sectionId = event.detail
      if (isActivityOverviewSection(sectionId)) {
        prevInitialSection.current = sectionId
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
    const sectionElements = [sectorsRef.current, humanitarianRef.current]
    sectionElements.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [activityCreated, activateSection])

  const activeSectionsRef = useRef(activeSections)
  activeSectionsRef.current = activeSections

  // Batch preloading - load all sections at once to avoid cascading layout shifts
  // Only enabled when enablePreloading prop is true (user has visited this group)
  useEffect(() => {
    if (!activityCreated || !enablePreloading) return

    // Activate all sections in a single batch to prevent sequential layout shifts
    const sectionsToPreload = ['sectors', 'humanitarian']
    const unloaded = sectionsToPreload.filter(id => !activeSectionsRef.current.has(id))
    if (unloaded.length > 0) {
      activateSections(unloaded)
    }
  }, [activityCreated, enablePreloading, activateSections])
  
  return (
    <div className="activity-overview-group space-y-0">
      {/* General Section - Always visible */}
      <section 
        id="general" 
        ref={generalRef as React.RefObject<HTMLElement>}
        className="scroll-mt-0 pb-16"
      >
        {renderGeneralSection()}
      </section>
      
      {/* Sections revealed after activity creation */}
      {activityCreated && (
        <div className={`transition-all duration-500 ${sectionsRevealed ? 'opacity-100' : 'opacity-0'}`}>
          {/* Sectors Section */}
          <section
            id="sectors"
            ref={sectorsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 mt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('sectors') }}
          >
            {isSectionActive('sectors') || activeSections.has('sectors') ? (
              <div className="bg-card rounded-lg shadow-sm border border-border p-8">
                <SectionHeader
                  id="sectors"
                  title={getSectionLabel('sectors')}
                  helpText={getSectionHelpText('sectors')}
                  showDivider={false}
                />
                <ImprovedSectorAllocationForm
                  allocations={sectors}
                  onChange={(newSectors) => {
                    setSectors(newSectors)
                  }}
                  onValidationChange={setSectorValidation}
                  onCompletionStatusChange={setSectorsCompletionStatusWithLogging}
                  activityId={general.id}
                  sectorExportLevel={general.sectorExportLevel || 'activity'}
                  onSectorExportLevelChange={onSectorExportLevelChange}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="sectors" />
            )}
          </section>
          
          {/* Humanitarian Section */}
          <section
            id="humanitarian"
            ref={humanitarianRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 mt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('humanitarian') }}
          >
            {isSectionActive('humanitarian') || activeSections.has('humanitarian') ? (
              <div className="bg-card rounded-lg shadow-sm border border-border p-8">
                <SectionHeader
                  id="humanitarian"
                  title={getSectionLabel('humanitarian')}
                  helpText={getSectionHelpText('humanitarian')}
                  showDivider={false}
                />
                <HumanitarianTab
                  activityId={general.id || ''}
                  readOnly={!permissions?.canEditActivity}
                  onDataChange={(data) => {
                    setHumanitarian(data.humanitarian)
                    setHumanitarianScopes(data.humanitarianScopes)
                  }}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="humanitarian" />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default ActivityOverviewGroup
