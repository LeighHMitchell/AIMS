"use client"

import React, { useRef, useEffect, useState, useMemo } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"
import { SectionSkeleton, getSectionMinHeight } from "./SectionSkeleton"

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
  const sectionRefs: SectionRef[] = useMemo(() => activityCreated ? [
    { id: 'organisations', ref: organisationsRef },
    { id: 'contacts', ref: contactsRef },
    { id: 'focal_points', ref: focalPointsRef },
  ] : [], [activityCreated])

  // Use scroll spy to track visible section
  const { activeSection, scrollToSection, setActiveSection, lockScrollSpy } = useScrollSpy(sectionRefs, {
    rootMargin: '-80px 0px -50% 0px', // Active zone: top 50% minus header offset
    debounceMs: 150,
    initialSection: initialSection && isStakeholdersSection(initialSection) ? initialSection : null,
  })

  // Use lazy loader to track which sections have been scrolled into view
  const { isSectionActive, activateSection, activateSections, activeSections } = useManualLazyLoader(
    activityCreated
      ? (enablePreloading ? [...STAKEHOLDERS_SECTIONS] : ['organisations'])
      : []
  )

  // Track if sections have been revealed (for animation)
  const [sectionsRevealed, setSectionsRevealed] = useState(activityCreated)

  // When initialSection changes (user clicked a section in this group),
  // lock scroll spy, set active section, and instantly scroll to target
  const prevInitialSection = useRef(initialSection)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (initialSection && isStakeholdersSection(initialSection) && activityCreated) {
      lockScrollSpy(2000)
      setActiveSection(initialSection)
      if (initialSection !== 'organisations' || prevInitialSection.current !== initialSection) {
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
    if (activeSection && isStakeholdersSection(activeSection)) {
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
        rootMargin: '1500px 0px 1500px 0px', // Preload 1500px before visible for seamless loading
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

  const activeSectionsRef = useRef(activeSections)
  activeSectionsRef.current = activeSections

  // Aggressive preloading - load all sections quickly for seamless scrolling
  // Only enabled when enablePreloading prop is true (user has visited this group)
  useEffect(() => {
    if (!activityCreated || !enablePreloading) return

    // Preload all sections in a single batch
    const sectionsToPreload = ['organisations', 'contacts', 'focal_points']

    const unloaded = sectionsToPreload.filter(id => !activeSectionsRef.current.has(id))
    if (unloaded.length > 0) {
      activateSections(unloaded)
    }
  }, [activityCreated, enablePreloading, activateSections])

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
            style={{ minHeight: getSectionMinHeight('organisations') }}
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
            style={{ minHeight: getSectionMinHeight('contacts') }}
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
            style={{ minHeight: getSectionMinHeight('focal_points') }}
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
