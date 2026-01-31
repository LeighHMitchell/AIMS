"use client"

import React, { useRef, useEffect, useState } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"

// Import the tab components
import { EnhancedFinancesSection } from "@/components/activities/EnhancedFinancesSection"
import PlannedDisbursementsTab from "@/components/activities/PlannedDisbursementsTab"
import ActivityBudgetsTab from "@/components/activities/ActivityBudgetsTab"
import ForwardSpendingSurveyTab from "@/components/activities/ForwardSpendingSurveyTab"
import { ResultsTab } from "@/components/activities/ResultsTab"
import { CapitalSpendTab } from "@/components/activities/CapitalSpendTab"
import { FinancingTermsTab } from "@/components/activities/FinancingTermsTab"
import { ConditionsTab } from "@/components/activities/ConditionsTab"

// Section IDs for the Funding & Delivery group
export const FUNDING_DELIVERY_SECTIONS = [
  'finances',
  'planned-disbursements',
  'budgets',
  'forward-spending-survey',
  'results',
  'capital-spend',
  'financing-terms',
  'conditions'
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

  // Forward Spending Survey props
  onFssChange: (count: number) => void

  // Results props
  onResultsChange: (results: any[]) => void

  // Capital Spend props
  onCapitalSpendChange: (percentage: number | null) => void

  // Financing Terms props
  onFinancingTermsChange: (hasData: boolean) => void

  // Conditions props
  onConditionsChange: (conditions: any[]) => void
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
  onFssChange,
  onResultsChange,
  onCapitalSpendChange,
  onFinancingTermsChange,
  onConditionsChange,
}: FundingDeliveryGroupProps) {

  // Create refs for each section
  const financesRef = useRef<HTMLElement>(null)
  const plannedDisbursementsRef = useRef<HTMLElement>(null)
  const budgetsRef = useRef<HTMLElement>(null)
  const forwardSpendRef = useRef<HTMLElement>(null)
  const resultsRef = useRef<HTMLElement>(null)
  const capitalSpendRef = useRef<HTMLElement>(null)
  const financingTermsRef = useRef<HTMLElement>(null)
  const conditionsRef = useRef<HTMLElement>(null)

  // Track if initial scroll has happened (to prevent re-scrolling when scroll spy updates)
  const hasInitiallyScrolled = useRef(false)

  // Build section refs array for scroll spy (only if activityCreated)
  const sectionRefs: SectionRef[] = activityCreated ? [
    { id: 'finances', ref: financesRef },
    { id: 'planned-disbursements', ref: plannedDisbursementsRef },
    { id: 'budgets', ref: budgetsRef },
    { id: 'forward-spending-survey', ref: forwardSpendRef },
    { id: 'results', ref: resultsRef },
    { id: 'capital-spend', ref: capitalSpendRef },
    { id: 'financing-terms', ref: financingTermsRef },
    { id: 'conditions', ref: conditionsRef },
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
      forwardSpendRef.current,
      resultsRef.current,
      capitalSpendRef.current,
      financingTermsRef.current,
      conditionsRef.current
    ]
    sectionElements.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [activityCreated, activateSection])

  // Aggressive preloading - load all sections quickly for seamless scrolling
  useEffect(() => {
    if (!activityCreated) return

    // Preload all sections with minimal staggering
    const sectionsToPreload = FUNDING_DELIVERY_SECTIONS.slice()

    sectionsToPreload.forEach((sectionId, index) => {
      setTimeout(() => {
        if (!activeSections.has(sectionId)) {
          activateSection(sectionId)
        }
      }, 400 + (50 * index)) // Start after 400ms, 50ms stagger between sections
    })
  }, [activityCreated, activateSection, activeSections])

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
            <SectionHeader
              id="finances"
              title={getSectionLabel('finances')}
              helpText={getSectionHelpText('finances')}
              showDivider={false}
            />
            {isSectionActive('finances') || activeSections.has('finances') ? (
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
            <SectionHeader
              id="planned-disbursements"
              title={getSectionLabel('planned-disbursements')}
              helpText={getSectionHelpText('planned-disbursements')}
              showDivider={false}
            />
            {isSectionActive('planned-disbursements') || activeSections.has('planned-disbursements') ? (
              <PlannedDisbursementsTab
                activityId={activityId}
                startDate={general.plannedStartDate || general.actualStartDate || ""}
                endDate={general.plannedEndDate || general.actualEndDate || ""}
                defaultCurrency={general.defaultCurrency || "USD"}
                readOnly={!permissions?.canEditActivity}
                onDisbursementsChange={onDisbursementsChange}
              />
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
            <SectionHeader
              id="budgets"
              title={getSectionLabel('budgets')}
              helpText={getSectionHelpText('budgets')}
              showDivider={false}
            />
            {isSectionActive('budgets') || activeSections.has('budgets') ? (
              <ActivityBudgetsTab
                activityId={activityId}
                startDate={general.plannedStartDate || general.actualStartDate || ""}
                endDate={general.plannedEndDate || general.actualEndDate || ""}
                defaultCurrency={general.defaultCurrency || "USD"}
                onBudgetsChange={onBudgetsChange}
              />
            ) : (
              <SectionSkeleton sectionId="budgets" />
            )}
          </section>

          {/* Forward Spending Survey Section */}
          <section
            id="forward-spending-survey"
            ref={forwardSpendRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            <SectionHeader
              id="forward-spending-survey"
              title={getSectionLabel('forward-spending-survey')}
              helpText={getSectionHelpText('forward-spending-survey')}
              showDivider={false}
            />
            {isSectionActive('forward-spending-survey') || activeSections.has('forward-spending-survey') ? (
              <ForwardSpendingSurveyTab
                activityId={activityId}
                readOnly={!permissions?.canEditActivity}
                onFssChange={onFssChange}
              />
            ) : (
              <SectionSkeleton sectionId="forward-spending-survey" />
            )}
          </section>

          {/* Results Section */}
          <section
            id="results"
            ref={resultsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            <SectionHeader
              id="results"
              title={getSectionLabel('results')}
              helpText={getSectionHelpText('results')}
              showDivider={false}
            />
            {isSectionActive('results') || activeSections.has('results') ? (
              <ResultsTab
                activityId={activityId}
                readOnly={!permissions?.canEditActivity}
                onResultsChange={onResultsChange}
                defaultLanguage="en"
              />
            ) : (
              <SectionSkeleton sectionId="results" />
            )}
          </section>

          {/* Capital Spend Section */}
          <section
            id="capital-spend"
            ref={capitalSpendRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            <SectionHeader
              id="capital-spend"
              title={getSectionLabel('capital-spend')}
              helpText={getSectionHelpText('capital-spend')}
              showDivider={false}
            />
            {isSectionActive('capital-spend') || activeSections.has('capital-spend') ? (
              <CapitalSpendTab
                activityId={activityId}
                readOnly={!permissions?.canEditActivity}
                onCapitalSpendChange={onCapitalSpendChange}
              />
            ) : (
              <SectionSkeleton sectionId="capital-spend" />
            )}
          </section>

          {/* Financing Terms Section */}
          <section
            id="financing-terms"
            ref={financingTermsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            <SectionHeader
              id="financing-terms"
              title={getSectionLabel('financing-terms')}
              helpText={getSectionHelpText('financing-terms')}
              showDivider={false}
            />
            {isSectionActive('financing-terms') || activeSections.has('financing-terms') ? (
              <FinancingTermsTab
                activityId={activityId}
                readOnly={!permissions?.canEditActivity}
                onFinancingTermsChange={(hasData) => {
                  onFinancingTermsChange(hasData)
                }}
              />
            ) : (
              <SectionSkeleton sectionId="financing-terms" />
            )}
          </section>

          {/* Conditions Section */}
          <section
            id="conditions"
            ref={conditionsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
          >
            <SectionHeader
              id="conditions"
              title={getSectionLabel('conditions')}
              helpText={getSectionHelpText('conditions')}
              showDivider={false}
            />
            {isSectionActive('conditions') || activeSections.has('conditions') ? (
              <ConditionsTab
                activityId={activityId}
                readOnly={!permissions?.canEditActivity}
                defaultLanguage="en"
                onConditionsChange={onConditionsChange}
              />
            ) : (
              <SectionSkeleton sectionId="conditions" />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default FundingDeliveryGroup
