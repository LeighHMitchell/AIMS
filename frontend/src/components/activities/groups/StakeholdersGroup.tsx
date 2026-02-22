"use client"

import React, { useRef, useEffect, useState } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"

// Import the tab components
import OrganisationsSection from "@/components/OrganisationsSection"
import ContactsTab from "@/components/contacts/ContactsTab"
import FocalPointsTab from "@/components/activities/FocalPointsTab"

// Section IDs for the Stakeholders group
export const STAKEHOLDERS_SECTIONS = ['organisations', 'contacts', 'focal_points'] as const
export type StakeholdersSectionId = typeof STAKEHOLDERS_SECTIONS[number]

/**
 * Check if a section ID belongs to the Stakeholders group
 */
export function isStakeholdersSection(sectionId: string): boolean {
  return STAKEHOLDERS_SECTIONS.includes(sectionId as StakeholdersSectionId)
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
interface StakeholdersGroupProps {
  // Activity context
  activityId: string

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

  // OrganisationsSection props
  extendingPartners?: any[]
  implementingPartners?: any[]
  governmentPartners?: any[]
  fundingPartners?: any[]
  onOrganisationsChange?: (field: string, value: any[]) => void

  // Callbacks for data changes (to update tab completion)
  onParticipatingOrganizationsChange?: (count: number) => void
  onContactsChange?: (contacts: any[]) => void
  onFocalPointsChange?: (focalPoints: any[]) => void
}

/**
 * StakeholdersGroup - Renders all Stakeholder sections in a scrollable container
 * with scroll spy integration for dynamic sidebar highlighting.
 */
export function StakeholdersGroup({
  // Activity context
  activityId,
  permissions,

  // Scroll integration
  onActiveSectionChange,
  initialSection,
  activityCreated,

  // Lazy loading control (default false - no aggressive preloading)
  enablePreloading = false,

  // OrganisationsSection props
  extendingPartners,
  implementingPartners,
  governmentPartners,
  fundingPartners,
  onOrganisationsChange,

  // Callbacks
  onParticipatingOrganizationsChange,
  onContactsChange,
  onFocalPointsChange,
}: StakeholdersGroupProps) {

  // Create refs for each section
  const organisationsRef = useRef<HTMLElement>(null)
  const contactsRef = useRef<HTMLElement>(null)
  const focalPointsRef = useRef<HTMLElement>(null)

  // Track if initial scroll has happened (to prevent re-scrolling when scroll spy updates)
  const hasInitiallyScrolled = useRef(false)

  // Build section refs array for scroll spy (only if activityCreated)
  const sectionRefs: SectionRef[] = activityCreated ? [
    { id: 'organisations', ref: organisationsRef },
    { id: 'contacts', ref: contactsRef },
    { id: 'focal_points', ref: focalPointsRef },
  ] : []

  // Use scroll spy to track visible section
  const { activeSection, scrollToSection, setActiveSection } = useScrollSpy(sectionRefs, {
    rootMargin: '-80px 0px -60% 0px', // Account for sticky headers
    debounceMs: 100,
  })

  // Use lazy loader to track which sections have been scrolled into view
  const { isSectionActive, activateSection, activeSections } = useManualLazyLoader(
    activityCreated ? ['organisations'] : []
  )

  // Track if sections have been revealed (for animation)
  const [sectionsRevealed, setSectionsRevealed] = useState(activityCreated)

  // Update parent when active section changes (for sidebar highlighting)
  // Only update if the active section belongs to this group
  useEffect(() => {
    if (activeSection && isStakeholdersSection(activeSection)) {
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
      initialSection !== 'organisations' &&
      activityCreated &&
      isStakeholdersSection(initialSection)
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
      activateSection('organisations')
    }
  }, [activityCreated, sectionsRevealed, activateSection])

  // Listen for scroll events from sidebar clicks
  useEffect(() => {
    const handleScrollToSection = (event: CustomEvent<string>) => {
      const sectionId = event.detail
      if (isStakeholdersSection(sectionId)) {
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
      organisationsRef.current,
      contactsRef.current,
      focalPointsRef.current,
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
    const sectionsToPreload = ['organisations', 'contacts', 'focal_points']

    sectionsToPreload.forEach((sectionId, index) => {
      setTimeout(() => {
        if (!activeSections.has(sectionId)) {
          activateSection(sectionId)
        }
      }, 200 + (50 * index)) // Start after 200ms, 50ms stagger between sections
    })
  }, [activityCreated, enablePreloading, activateSection, activeSections])

  return (
    <div className="stakeholders-group space-y-0">
      {/* Show message if activity not created */}
      {!activityCreated && (
        <div className="text-center py-12 text-gray-500">
          <p>Please save the activity first to access stakeholder sections.</p>
        </div>
      )}

      {/* Sections revealed after activity creation */}
      {activityCreated && (
        <div className={`transition-all duration-500 ${sectionsRevealed ? 'opacity-100' : 'opacity-0'}`}>
          {/* Organisations Section */}
          <section
            id="organisations"
            ref={organisationsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pb-16"
          >
            {isSectionActive('organisations') || activeSections.has('organisations') ? (
              <OrganisationsSection
                activityId={activityId}
                extendingPartners={extendingPartners}
                implementingPartners={implementingPartners}
                governmentPartners={governmentPartners}
                fundingPartners={fundingPartners}
                onParticipatingOrganizationsChange={onParticipatingOrganizationsChange}
                onChange={onOrganisationsChange}
              />
            ) : (
              <SectionSkeleton sectionId="organisations" />
            )}
          </section>

          {/* Contacts Section */}
          <section
            id="contacts"
            ref={contactsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            {isSectionActive('contacts') || activeSections.has('contacts') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="contacts"
                  title={getSectionLabel('contacts')}
                  helpText={getSectionHelpText('contacts')}
                  showDivider={false}
                />
                <ContactsTab
                  activityId={activityId}
                  readOnly={!permissions?.canEditActivity}
                  onContactsChange={onContactsChange}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="contacts" />
            )}
          </section>

          {/* Focal Points Section */}
          <section
            id="focal_points"
            ref={focalPointsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            {isSectionActive('focal_points') || activeSections.has('focal_points') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="focal_points"
                  title={getSectionLabel('focal_points')}
                  helpText={getSectionHelpText('focal_points')}
                  showDivider={false}
                />
                <FocalPointsTab
                  activityId={activityId}
                  onFocalPointsChange={onFocalPointsChange}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="focal_points" />
            )}
          </section>

        </div>
      )}
    </div>
  )
}

export default StakeholdersGroup
