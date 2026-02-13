"use client"

import React, { useRef, useEffect, useState } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"

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
  const sectionRefs: SectionRef[] = activityCreated ? [
    { id: 'documents', ref: documentsRef },
    { id: 'aid_effectiveness', ref: aidEffectivenessRef },
  ] : []

  // Use scroll spy to track visible section
  const { activeSection, scrollToSection, setActiveSection } = useScrollSpy(sectionRefs, {
    rootMargin: '-80px 0px -60% 0px', // Account for sticky headers
    debounceMs: 100,
  })

  // Use lazy loader to track which sections have been scrolled into view
  const { isSectionActive, activateSection, activeSections } = useManualLazyLoader(
    activityCreated ? ['documents'] : []
  )

  // Track if sections have been revealed (for animation)
  const [sectionsRevealed, setSectionsRevealed] = useState(activityCreated)

  // Update parent when active section changes (for sidebar highlighting)
  // Only update if the active section belongs to this group
  useEffect(() => {
    if (activeSection && isSupportingInfoSection(activeSection)) {
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
      initialSection !== 'documents' &&
      activityCreated &&
      isSupportingInfoSection(initialSection)
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
        rootMargin: '800px 0px 800px 0px', // Preload 800px before visible for seamless loading
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

  // Aggressive preloading - load all sections quickly for seamless scrolling
  // Only enabled when enablePreloading prop is true (user has visited this group)
  useEffect(() => {
    if (!activityCreated || !enablePreloading) return

    // Preload all sections with minimal staggering
    const sectionsToPreload = ['documents', 'aid_effectiveness']

    sectionsToPreload.forEach((sectionId, index) => {
      setTimeout(() => {
        if (!activeSections.has(sectionId)) {
          activateSection(sectionId)
        }
      }, 350 + (50 * index)) // Start after 350ms, 50ms stagger between sections
    })
  }, [activityCreated, enablePreloading, activateSection, activeSections])

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
