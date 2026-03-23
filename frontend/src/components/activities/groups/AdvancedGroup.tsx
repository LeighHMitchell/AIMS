"use client"

import React, { useRef, useEffect, useState } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"
import { SectionSkeleton, getSectionMinHeight } from "./SectionSkeleton"

import LinkedActivitiesEditorTab from "@/components/activities/LinkedActivitiesEditorTab"
import { ResultsTab } from "@/components/activities/ResultsTab"
import ForwardSpendingSurveyTab from "@/components/activities/ForwardSpendingSurveyTab"
import { CapitalSpendTab } from "@/components/activities/CapitalSpendTab"
import { FinancingTermsTab } from "@/components/activities/FinancingTermsTab"
import { ConditionsTab } from "@/components/activities/ConditionsTab"
import BudgetMappingTab from "@/components/activities/BudgetMappingTab"

export const ADVANCED_SECTIONS = [
  'linked_activities',
  'results',
  'forward-spending-survey',
  'capital-spend',
  'financing-terms',
  'conditions',
  'country-budget'
] as const
export type AdvancedSectionId = typeof ADVANCED_SECTIONS[number]

export function isAdvancedSection(sectionId: string): boolean {
  return ADVANCED_SECTIONS.includes(sectionId as AdvancedSectionId)
}

interface AdvancedGroupProps {
  activityId: string
  currentUserId?: string
  userId?: string

  permissions: {
    canEditActivity?: boolean
    [key: string]: any
  } | null

  onActiveSectionChange: (sectionId: string) => void
  initialSection?: string
  activityCreated: boolean
  enablePreloading?: boolean

  // Linked Activities
  onLinkedActivitiesCountChange?: (count: number) => void

  // Results
  onResultsChange: (results: any[]) => void

  // Forward Spending Survey
  onFssChange: (count: number) => void

  // Capital Spend
  onCapitalSpendChange: (percentage: number | null) => void

  // Financing Terms
  onFinancingTermsChange: (hasData: boolean) => void

  // Conditions
  onConditionsChange: (conditions: any[]) => void

  // Budget Mapping
  general: any
  setGeneral: (fn: (prev: any) => any) => void
  onCountryBudgetItemsChange: (count: number) => void
  totalBudgetUSD: number
}

export function AdvancedGroup({
  activityId,
  currentUserId,
  userId,
  permissions,

  onActiveSectionChange,
  initialSection,
  activityCreated,
  enablePreloading = false,

  onLinkedActivitiesCountChange,
  onResultsChange,
  onFssChange,
  onCapitalSpendChange,
  onFinancingTermsChange,
  onConditionsChange,

  general,
  setGeneral,
  onCountryBudgetItemsChange,
  totalBudgetUSD,
}: AdvancedGroupProps) {

  const linkedActivitiesRef = useRef<HTMLElement>(null)
  const resultsRef = useRef<HTMLElement>(null)
  const forwardSpendRef = useRef<HTMLElement>(null)
  const capitalSpendRef = useRef<HTMLElement>(null)
  const financingTermsRef = useRef<HTMLElement>(null)
  const conditionsRef = useRef<HTMLElement>(null)
  const countryBudgetRef = useRef<HTMLElement>(null)

  const hasInitiallyScrolled = useRef(false)

  const sectionRefs: SectionRef[] = activityCreated ? [
    { id: 'linked_activities', ref: linkedActivitiesRef },
    { id: 'results', ref: resultsRef },
    { id: 'forward-spending-survey', ref: forwardSpendRef },
    { id: 'capital-spend', ref: capitalSpendRef },
    { id: 'financing-terms', ref: financingTermsRef },
    { id: 'conditions', ref: conditionsRef },
    { id: 'country-budget', ref: countryBudgetRef },
  ] : []

  const { activeSection, scrollToSection, setActiveSection, lockScrollSpy } = useScrollSpy(sectionRefs, {
    rootMargin: '-80px 0px -60% 0px',
    debounceMs: 100,
  })

  const { isSectionActive, activateSection, activateSections, activeSections } = useManualLazyLoader(
    activityCreated
      ? (enablePreloading ? [...ADVANCED_SECTIONS] : ['linked_activities'])
      : []
  )

  const [sectionsRevealed, setSectionsRevealed] = useState(activityCreated)

  // When initialSection changes (user clicked a section in this group),
  // lock scroll spy, set active section, and instantly scroll to target
  const prevInitialSection = useRef(initialSection)
  useEffect(() => {
    if (initialSection && isAdvancedSection(initialSection) && activityCreated) {
      lockScrollSpy(500)
      setActiveSection(initialSection)
      if (initialSection !== 'linked_activities' || prevInitialSection.current !== initialSection) {
        requestAnimationFrame(() => {
          const el = document.getElementById(initialSection)
          if (el) el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' })
        })
      }
      prevInitialSection.current = initialSection
    }
  }, [initialSection, activityCreated, lockScrollSpy, setActiveSection])

  useEffect(() => {
    if (activeSection && isAdvancedSection(activeSection)) {
      onActiveSectionChange(activeSection)

      const params = new URLSearchParams(window.location.search)
      params.set('section', activeSection)
      window.history.replaceState({}, '', `?${params.toString()}`)
    }
  }, [activeSection, onActiveSectionChange])

  useEffect(() => {
    if (activityCreated && !sectionsRevealed) {
      setSectionsRevealed(true)
      activateSection('linked_activities')
    }
  }, [activityCreated, sectionsRevealed, activateSection])

  useEffect(() => {
    const handleScrollToSection = (event: CustomEvent<string>) => {
      const sectionId = event.detail
      if (isAdvancedSection(sectionId)) {
        scrollToSection(sectionId)
        activateSection(sectionId)
      }
    }

    window.addEventListener('scrollToSection', handleScrollToSection as EventListener)
    return () => {
      window.removeEventListener('scrollToSection', handleScrollToSection as EventListener)
    }
  }, [scrollToSection, activateSection])

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
        rootMargin: '1500px 0px 1500px 0px',
        threshold: 0,
      }
    )

    const sectionElements = [
      linkedActivitiesRef.current,
      resultsRef.current,
      forwardSpendRef.current,
      capitalSpendRef.current,
      financingTermsRef.current,
      conditionsRef.current,
      countryBudgetRef.current,
    ]
    sectionElements.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [activityCreated, activateSection])

  useEffect(() => {
    if (!activityCreated || !enablePreloading) return

    const sectionsToPreload = ADVANCED_SECTIONS.slice()

    const unloaded = sectionsToPreload.filter(id => !activeSections.has(id))
    if (unloaded.length > 0) {
      activateSections(unloaded)
    }
  }, [activityCreated, enablePreloading, activateSection, activeSections])

  return (
    <div className="advanced-group space-y-0">
      {!activityCreated && (
        <div className="text-center py-12 text-gray-500">
          <p>Please save the activity first to access advanced sections.</p>
        </div>
      )}

      {activityCreated && (
        <div className={`transition-all duration-500 ${sectionsRevealed ? 'opacity-100' : 'opacity-0'}`}>
          {/* Linked Activities Section */}
          <section
            id="linked_activities"
            ref={linkedActivitiesRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pb-16"
            style={{ minHeight: getSectionMinHeight('linked_activities') }}
          >
            {isSectionActive('linked_activities') || activeSections.has('linked_activities') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="linked_activities"
                  title={getSectionLabel('linked_activities')}
                  helpText={getSectionHelpText('linked_activities')}
                  showDivider={false}
                />
                <LinkedActivitiesEditorTab
                  activityId={activityId}
                  currentUserId={currentUserId}
                  canEdit={permissions?.canEditActivity ?? true}
                  onCountChange={onLinkedActivitiesCountChange}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="linked_activities" />
            )}
          </section>

          {/* Results Section */}
          <section
            id="results"
            ref={resultsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('results') }}
          >
            {isSectionActive('results') || activeSections.has('results') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="results"
                  title={getSectionLabel('results')}
                  helpText={getSectionHelpText('results')}
                  showDivider={false}
                />
                <ResultsTab
                  activityId={activityId}
                  readOnly={!permissions?.canEditActivity}
                  onResultsChange={onResultsChange}
                  defaultLanguage="en"
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="results" />
            )}
          </section>

          {/* Forward Spending Survey Section */}
          <section
            id="forward-spending-survey"
            ref={forwardSpendRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('forward-spending-survey') }}
          >
            {isSectionActive('forward-spending-survey') || activeSections.has('forward-spending-survey') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="forward-spending-survey"
                  title={getSectionLabel('forward-spending-survey')}
                  helpText={getSectionHelpText('forward-spending-survey')}
                  showDivider={false}
                />
                <ForwardSpendingSurveyTab
                  activityId={activityId}
                  readOnly={!permissions?.canEditActivity}
                  onFssChange={onFssChange}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="forward-spending-survey" />
            )}
          </section>

          {/* Capital Spend Section */}
          <section
            id="capital-spend"
            ref={capitalSpendRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('capital-spend') }}
          >
            {isSectionActive('capital-spend') || activeSections.has('capital-spend') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="capital-spend"
                  title={getSectionLabel('capital-spend')}
                  helpText={getSectionHelpText('capital-spend')}
                  showDivider={false}
                />
                <CapitalSpendTab
                  activityId={activityId}
                  readOnly={!permissions?.canEditActivity}
                  onCapitalSpendChange={onCapitalSpendChange}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="capital-spend" />
            )}
          </section>

          {/* Financing Terms Section */}
          <section
            id="financing-terms"
            ref={financingTermsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('financing-terms') }}
          >
            {isSectionActive('financing-terms') || activeSections.has('financing-terms') ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <SectionHeader
                  id="financing-terms"
                  title={getSectionLabel('financing-terms')}
                  helpText={getSectionHelpText('financing-terms')}
                  showDivider={false}
                />
                <FinancingTermsTab
                  activityId={activityId}
                  readOnly={!permissions?.canEditActivity}
                  onFinancingTermsChange={(hasData) => {
                    onFinancingTermsChange(hasData)
                  }}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="financing-terms" />
            )}
          </section>

          {/* Conditions Section */}
          <section
            id="conditions"
            ref={conditionsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('conditions') }}
          >
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

          {/* Country Budget Mapping Section */}
          <section
            id="country-budget"
            ref={countryBudgetRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('country-budget') }}
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
        </div>
      )}
    </div>
  )
}

export default AdvancedGroup
