"use client"

import React, { useRef, useEffect, useState } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"

// Import the tab components
import { EnhancedFinancesSection } from "@/components/activities/EnhancedFinancesSection"
import PlannedDisbursementsTab from "@/components/activities/PlannedDisbursementsTab"
import ActivityBudgetsTab from "@/components/activities/ActivityBudgetsTab"

// Section IDs for the Funding & Delivery group
export const FUNDING_DELIVERY_SECTIONS = [
  'finances',
  'planned-disbursements',
  'budgets',
] as const
export type FundingDeliverySectionId = typeof FUNDING_DELIVERY_SECTIONS[number]

/**
 * Check if a section ID belongs to the Funding & Delivery group
 */
export function isFundingDeliverySection(sectionId: string): boolean {
  return FUNDING_DELIVERY_SECTIONS.includes(sectionId as FundingDeliverySectionId)
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
interface FundingDeliveryGroupProps {
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

  // Finances props
  transactions: any[]
  setTransactions: (transactions: any[]) => void
  refreshTransactions: () => void
  initialTransactionId?: string
  geographyLevel: string
  activitySectors: any[]

  // Budgets props
  onBudgetsChange: (budgets: any[]) => void

  // Planned Disbursements props
  onDisbursementsChange: (disbursements: any[]) => void
}

/**
 * FundingDeliveryGroup - Renders all Funding & Delivery sections in a scrollable container
 * with scroll spy integration for dynamic sidebar highlighting.
 */
export function FundingDeliveryGroup({
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

  // Finances props
  transactions,
  setTransactions,
  refreshTransactions,
  initialTransactionId,
  geographyLevel,
  activitySectors,

  // Callbacks
  onBudgetsChange,
  onDisbursementsChange,
}: FundingDeliveryGroupProps) {

  // Create refs for each section
  const financesRef = useRef<HTMLElement>(null)
  const plannedDisbursementsRef = useRef<HTMLElement>(null)
  const budgetsRef = useRef<HTMLElement>(null)

  // Track if initial scroll has happened (to prevent re-scrolling when scroll spy updates)
  const hasInitiallyScrolled = useRef(false)

  // Build section refs array for scroll spy (only if activityCreated)
  const sectionRefs: SectionRef[] = activityCreated ? [
    { id: 'finances', ref: financesRef },
    { id: 'planned-disbursements', ref: plannedDisbursementsRef },
    { id: 'budgets', ref: budgetsRef },
  ] : []

  // Use scroll spy to track visible section
  const { activeSection, scrollToSection, setActiveSection } = useScrollSpy(sectionRefs, {
    rootMargin: '-80px 0px -60% 0px', // Account for sticky headers
    debounceMs: 100,
  })

  // Use lazy loader to track which sections have been scrolled into view
  const { isSectionActive, activateSection, activeSections } = useManualLazyLoader(
    activityCreated ? ['finances'] : []
  )

  // Track if sections have been revealed (for animation)
  const [sectionsRevealed, setSectionsRevealed] = useState(activityCreated)

  // Update parent when active section changes (for sidebar highlighting)
  // Only update if the active section belongs to this group
  useEffect(() => {
    if (activeSection && isFundingDeliverySection(activeSection)) {
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
      initialSection !== 'finances' &&
      activityCreated &&
      isFundingDeliverySection(initialSection)
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
      activateSection('finances')
    }
  }, [activityCreated, sectionsRevealed, activateSection])

  // Listen for scroll events from sidebar clicks
  useEffect(() => {
    const handleScrollToSection = (event: CustomEvent<string>) => {
      const sectionId = event.detail
      if (isFundingDeliverySection(sectionId)) {
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
      financesRef.current,
      plannedDisbursementsRef.current,
      budgetsRef.current,
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
    const sectionsToPreload = FUNDING_DELIVERY_SECTIONS.slice()

    sectionsToPreload.forEach((sectionId, index) => {
      setTimeout(() => {
        if (!activeSections.has(sectionId)) {
          activateSection(sectionId)
        }
      }, 400 + (50 * index)) // Start after 400ms, 50ms stagger between sections
    })
  }, [activityCreated, enablePreloading, activateSection, activeSections])

  return (
    <div className="funding-delivery-group space-y-0">
      {/* Show message if activity not created */}
      {!activityCreated && (
        <div className="text-center py-12 text-gray-500">
          <p>Please save the activity first to access funding and delivery sections.</p>
        </div>
      )}

      {/* Sections revealed after activity creation */}
      {activityCreated && (
        <div className={`transition-all duration-500 ${sectionsRevealed ? 'opacity-100' : 'opacity-0'}`}>
          {/* Finances Section */}
          <section
            id="finances"
            ref={financesRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pb-16"
          >
            {isSectionActive('finances') || activeSections.has('finances') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="finances"
                  title={getSectionLabel('finances')}
                  helpText={getSectionHelpText('finances')}
                  showDivider={false}
                />
                <EnhancedFinancesSection
                  activityId={activityId || "new"}
                  general={general}
                  transactions={transactions}
                  onTransactionsChange={setTransactions}
                  onRefreshNeeded={refreshTransactions}
                  initialTransactionId={initialTransactionId}
                  onDefaultsChange={(field, value) => {
                    if (field === 'defaultFlowType') {
                      setGeneral((g: any) => ({ ...g, defaultFlowType: value }))
                    } else if (field === 'defaultTiedStatus') {
                      setGeneral((g: any) => ({ ...g, defaultTiedStatus: value }))
                    } else {
                      setGeneral((g: any) => ({ ...g, [field]: value }))
                    }
                  }}
                  disabled={false}
                  geographyLevel={geographyLevel || 'activity'}
                  activitySectors={activitySectors}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="finances" />
            )}
          </section>

          {/* Planned Disbursements Section */}
          <section
            id="planned-disbursements"
            ref={plannedDisbursementsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            {isSectionActive('planned-disbursements') || activeSections.has('planned-disbursements') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="planned-disbursements"
                  title={getSectionLabel('planned-disbursements')}
                  helpText={getSectionHelpText('planned-disbursements')}
                  showDivider={false}
                />
                <PlannedDisbursementsTab
                  activityId={activityId}
                  startDate={general.plannedStartDate || general.actualStartDate || ""}
                  endDate={general.plannedEndDate || general.actualEndDate || ""}
                  defaultCurrency={general.defaultCurrency || "USD"}
                  readOnly={!permissions?.canEditActivity}
                  onDisbursementsChange={onDisbursementsChange}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="planned-disbursements" />
            )}
          </section>

          {/* Budgets Section */}
          <section
            id="budgets"
            ref={budgetsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            {isSectionActive('budgets') || activeSections.has('budgets') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="budgets"
                  title={getSectionLabel('budgets')}
                  helpText={getSectionHelpText('budgets')}
                  showDivider={false}
                />
                <ActivityBudgetsTab
                  activityId={activityId}
                  startDate={general.plannedStartDate || general.actualStartDate || ""}
                  endDate={general.plannedEndDate || general.actualEndDate || ""}
                  defaultCurrency={general.defaultCurrency || "USD"}
                  onBudgetsChange={onBudgetsChange}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="budgets" />
            )}
          </section>

        </div>
      )}
    </div>
  )
}

export default FundingDeliveryGroup
