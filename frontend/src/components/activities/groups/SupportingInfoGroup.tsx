"use client"

import React, { useRef, useEffect, useState, useMemo } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"
import { SectionSkeleton, getSectionMinHeight } from "./SectionSkeleton"

// Import the tab components
import { DocumentsAndImagesTabInline } from "@/components/activities/DocumentsAndImagesTabInline"
import { AidEffectivenessForm } from "@/components/AidEffectivenessForm"

// Section IDs for the Supporting Info group
export const SUPPORTING_INFO_SECTIONS = [
  'documents',
  'aid_effectiveness'
] as const
export type SupportingInfoSectionId = typeof SUPPORTING_INFO_SECTIONS[number]

/**
 * Check if a section ID belongs to the Supporting Info group
 */
export function isSupportingInfoSection(sectionId: string): boolean {
  return SUPPORTING_INFO_SECTIONS.includes(sectionId as SupportingInfoSectionId)
}

// Props interface
interface SupportingInfoGroupProps {
  // Activity context
  activityId: string
  general: any
  setGeneral: (fn: (prev: any) => any) => void

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

  // Documents props
  documents: any[]
  onDocumentsChange: (documents: any[]) => void
  documentsAutosave: { saveNow: (documents: any[]) => void }
}

/**
 * SupportingInfoGroup - Renders all Supporting Info sections in a scrollable container
 * with scroll spy integration for dynamic sidebar highlighting.
 */
export function SupportingInfoGroup({
  // Activity context
  activityId,
  general,
  setGeneral,
  permissions,

  // Scroll integration
  onActiveSectionChange,
  initialSection,
  activityCreated,

  // Lazy loading control (default false - no aggressive preloading)
  enablePreloading = false,

  // Documents props
  documents,
  onDocumentsChange,
  documentsAutosave,
}: SupportingInfoGroupProps) {

  // Create refs for each section
  const documentsRef = useRef<HTMLElement>(null)
  const aidEffectivenessRef = useRef<HTMLElement>(null)

  // Track if initial scroll has happened (to prevent re-scrolling when scroll spy updates)
  const hasInitiallyScrolled = useRef(false)

  // Build section refs array for scroll spy (only if activityCreated)
  const sectionRefs: SectionRef[] = useMemo(() => activityCreated ? [
    { id: 'documents', ref: documentsRef },
    { id: 'aid_effectiveness', ref: aidEffectivenessRef },
  ] : [], [activityCreated])

  // Use scroll spy to track visible section
  const { activeSection, scrollToSection, setActiveSection, lockScrollSpy } = useScrollSpy(sectionRefs, {
    rootMargin: '-80px 0px -50% 0px', // Active zone: top 50% minus header offset
    debounceMs: 150,
    initialSection: initialSection && isSupportingInfoSection(initialSection) ? initialSection : null,
  })

  // Use lazy loader to track which sections have been scrolled into view
  const { isSectionActive, activateSection, activateSections, activeSections } = useManualLazyLoader(
    activityCreated
      ? (enablePreloading ? [...SUPPORTING_INFO_SECTIONS] : ['documents'])
      : []
  )

  // Track if sections have been revealed (for animation)
  const [sectionsRevealed, setSectionsRevealed] = useState(activityCreated)

  // When initialSection changes (user clicked a section in this group),
  // lock scroll spy, set active section, and instantly scroll to target
  const prevInitialSection = useRef(initialSection)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (initialSection && isSupportingInfoSection(initialSection) && activityCreated) {
      lockScrollSpy(2000)
      setActiveSection(initialSection)
      if (initialSection !== 'documents' || prevInitialSection.current !== initialSection) {
        requestAnimationFrame(() => {
          const el = document.getElementById(initialSection)
          if (!el) return
          el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' })
          const initialTop = el.getBoundingClientRect().top
          setTimeout(() => {
            const currentTop = el.getBoundingClientRect().top
            if (Math.abs(currentTop - initialTop) > 5) {
              el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' })
            }
          }, 600)
        })
      }
      prevInitialSection.current = initialSection
    }
  }, [initialSection, activityCreated, lockScrollSpy, setActiveSection])

  // Stable ref for callback to avoid infinite re-render loop
  const onActiveSectionChangeRef = useRef(onActiveSectionChange)
  onActiveSectionChangeRef.current = onActiveSectionChange

  // Update parent when active section changes (for sidebar highlighting)
  useEffect(() => {
    if (isFirstRender.current) return
    if (activeSection && isSupportingInfoSection(activeSection)) {
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
      // Activate the first section
      activateSection('documents')
    }
  }, [activityCreated, sectionsRevealed, activateSection])

  // Listen for scroll events from sidebar clicks
  useEffect(() => {
    const handleScrollToSection = (event: CustomEvent<string>) => {
      const sectionId = event.detail
      if (isSupportingInfoSection(sectionId)) {
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
      documentsRef.current,
      aidEffectivenessRef.current
    ]
    sectionElements.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [activityCreated, activateSection])

  const activeSectionsRef = useRef(activeSections)
  activeSectionsRef.current = activeSections

  // Aggressive preloading - load all sections quickly for seamless scrolling
  // Only enabled when enablePreloading prop is true (user has visited this group)
  useEffect(() => {
    if (!activityCreated || !enablePreloading) return

    // Preload all sections in a single batch
    const sectionsToPreload = ['documents', 'aid_effectiveness']

    const unloaded = sectionsToPreload.filter(id => !activeSectionsRef.current.has(id))
    if (unloaded.length > 0) {
      activateSections(unloaded)
    }
  }, [activityCreated, enablePreloading, activateSections])

  return (
    <div className="supporting-info-group space-y-0">
      {/* Show message if activity not created */}
      {!activityCreated && (
        <div className="text-center py-12 text-gray-500">
          <p>Please save the activity first to access supporting info sections.</p>
        </div>
      )}

      {/* Sections revealed after activity creation */}
      {activityCreated && (
        <div className={`transition-all duration-500 ${sectionsRevealed ? 'opacity-100' : 'opacity-0'}`}>
          {/* Documents Section */}
          <section
            id="documents"
            ref={documentsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('documents') }}
          >
            {isSectionActive('documents') || activeSections.has('documents') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="documents"
                  title={getSectionLabel('documents')}
                  helpText={getSectionHelpText('documents')}
                  showDivider={false}
                />
                <DocumentsAndImagesTabInline
                  documents={documents}
                  onChange={(newDocuments) => {
                    onDocumentsChange(newDocuments)
                    documentsAutosave.saveNow(newDocuments)
                  }}
                  activityId={activityId}
                  locale="en"
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="documents" />
            )}
          </section>

          {/* Aid Effectiveness Section */}
          <section
            id="aid_effectiveness"
            ref={aidEffectivenessRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('aid_effectiveness') }}
          >
            {isSectionActive('aid_effectiveness') || activeSections.has('aid_effectiveness') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="aid_effectiveness"
                  title={getSectionLabel('aid_effectiveness')}
                  helpText={getSectionHelpText('aid_effectiveness')}
                  showDivider={false}
                />
                <AidEffectivenessForm
                  general={general}
                  onUpdate={setGeneral}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="aid_effectiveness" />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default SupportingInfoGroup
