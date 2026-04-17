"use client"

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"
import { SectionSkeleton, getSectionMinHeight } from "./SectionSkeleton"

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

  // Stable callback for EnhancedFinancesSection to update defaults without causing re-render loops
  const handleDefaultsChange = useCallback((field: string, value: string | null | boolean) => {
    setGeneral((g: any) => ({ ...g, [field]: value }))
  }, [setGeneral])

  // Create refs for each section
  const financesRef = useRef<HTMLElement>(null)
  const plannedDisbursementsRef = useRef<HTMLElement>(null)
  const budgetsRef = useRef<HTMLElement>(null)

  // Track if initial scroll has happened (to prevent re-scrolling when scroll spy updates)
  const hasInitiallyScrolled = useRef(false)

  // Build section refs array for scroll spy (only if activityCreated)
  const sectionRefs: SectionRef[] = useMemo(() => activityCreated ? [
    { id: 'finances', ref: financesRef },
    { id: 'planned-disbursements', ref: plannedDisbursementsRef },
    { id: 'budgets', ref: budgetsRef },
  ] : [], [activityCreated])

  // Use scroll spy to track visible section
  const { activeSection, scrollToSection, setActiveSection, lockScrollSpy } = useScrollSpy(sectionRefs, {
    rootMargin: '-80px 0px -50% 0px', // Active zone: top 50% minus header offset
    debounceMs: 150,
    initialSection: initialSection && isFundingDeliverySection(initialSection) ? initialSection : null,
  })

  // Use lazy loader to track which sections have been scrolled into view
  const { isSectionActive, activateSection, activateSections, activeSections } = useManualLazyLoader(
    activityCreated
      ? (enablePreloading ? [...FUNDING_DELIVERY_SECTIONS] : ['finances'])
      : []
  )

  // Track if sections have been revealed (for animation)
  const [sectionsRevealed, setSectionsRevealed] = useState(activityCreated)

  // When initialSection changes (user clicked a section in this group),
  // lock scroll spy, set active section, and instantly scroll to target
  const prevInitialSection = useRef(initialSection)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (initialSection && isFundingDeliverySection(initialSection) && activityCreated) {
      lockScrollSpy(2000)
      setActiveSection(initialSection)
      if (prevInitialSection.current !== initialSection || isFirstRender.current) {
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
  // Skipped on first render — scroll spy hasn't settled yet
  useEffect(() => {
    if (isFirstRender.current) return
    if (activeSection && isFundingDeliverySection(activeSection)) {
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
      // Activate the first section
      activateSection('finances')
    }
  }, [activityCreated, sectionsRevealed, activateSection])

  // Listen for scroll events from sidebar clicks
  useEffect(() => {
    const handleScrollToSection = (event: CustomEvent<string>) => {
      const sectionId = event.detail
      if (isFundingDeliverySection(sectionId)) {
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
  // Note: activeSections (Set) is NOT in deps to avoid re-render loop — read via ref instead
  const activeSectionsRef = useRef(activeSections)
  activeSectionsRef.current = activeSections

  useEffect(() => {
    if (!activityCreated || !enablePreloading) return

    // Preload all sections in a single batch
    const sectionsToPreload = FUNDING_DELIVERY_SECTIONS.slice()

    const unloaded = sectionsToPreload.filter(id => !activeSectionsRef.current.has(id))
    if (unloaded.length > 0) {
      activateSections(unloaded)
    }
  }, [activityCreated, enablePreloading, activateSections])

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
            style={{ minHeight: getSectionMinHeight('finances') }}
          >
            {isSectionActive('finances') || activeSections.has('finances') ? (
              <div className="bg-white rounded-lg shadow-sm border border-border p-8">
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
                  onDefaultsChange={handleDefaultsChange}
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
            style={{ minHeight: getSectionMinHeight('planned-disbursements') }}
          >
            {isSectionActive('planned-disbursements') || activeSections.has('planned-disbursements') ? (
              <div className="bg-white rounded-lg shadow-sm border border-border p-8">
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
            style={{ minHeight: getSectionMinHeight('budgets') }}
          >
            {isSectionActive('budgets') || activeSections.has('budgets') ? (
              <div className="bg-white rounded-lg shadow-sm border border-border p-8">
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
