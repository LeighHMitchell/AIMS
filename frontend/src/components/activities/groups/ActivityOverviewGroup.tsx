"use client"

import React, { useRef, useEffect, useCallback, useState } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"
import { Skeleton } from "@/components/ui/skeleton"

// Import the tab components
import ImprovedSectorAllocationForm from "@/components/activities/ImprovedSectorAllocationForm"
import { HumanitarianTab } from "@/components/activities/HumanitarianTab"
import CountriesRegionsTab from "@/components/activities/CountriesRegionsTab"
import CombinedLocationsTab from "@/components/CombinedLocationsTab"

// Section IDs for the Activity Overview group
export const ACTIVITY_OVERVIEW_SECTIONS = ['general', 'sectors', 'humanitarian', 'country-region', 'locations'] as const
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
  
  // Countries/Regions props
  countries: any[]
  regions: any[]
  setCountries: (countries: any[]) => void
  setRegions: (regions: any[]) => void
  onGeographyLevelChange: (level: string) => void
  
  // Locations props
  specificLocations: any[]
  coverageAreas: any[]
  advancedLocations: any[]
  setSpecificLocations: (locations: any[]) => void
  setCoverageAreas: (areas: any[]) => void
  setAdvancedLocations: (locations: any[]) => void
  subnationalBreakdowns: any[]
  setSubnationalBreakdowns: (breakdowns: any[]) => void
  
  // Permissions
  permissions: {
    canEditActivity?: boolean
    [key: string]: any
  } | null
  
  // Scroll integration
  onActiveSectionChange: (sectionId: string) => void
  initialSection?: string
  activityCreated: boolean
  
  // Render function for GeneralSection (since it's defined inline in page.tsx)
  renderGeneralSection: () => React.ReactNode
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
  
  // Countries/Regions
  countries,
  regions,
  setCountries,
  setRegions,
  onGeographyLevelChange,
  
  // Locations
  specificLocations,
  coverageAreas,
  advancedLocations,
  setSpecificLocations,
  setCoverageAreas,
  setAdvancedLocations,
  subnationalBreakdowns,
  setSubnationalBreakdowns,
  
  // Permissions
  permissions,
  
  // Scroll integration
  onActiveSectionChange,
  initialSection,
  activityCreated,
  
  // Render function for GeneralSection
  renderGeneralSection,
}: ActivityOverviewGroupProps) {
  
  // Create refs for each section
  const generalRef = useRef<HTMLElement>(null)
  const sectorsRef = useRef<HTMLElement>(null)
  const humanitarianRef = useRef<HTMLElement>(null)
  const countryRegionRef = useRef<HTMLElement>(null)
  const locationsRef = useRef<HTMLElement>(null)
  
  // Track if initial scroll has happened (to prevent re-scrolling when scroll spy updates)
  const hasInitiallyScrolled = useRef(false)
  
  // Build section refs array for scroll spy
  const sectionRefs: SectionRef[] = [
    { id: 'general', ref: generalRef },
    ...(activityCreated ? [
      { id: 'sectors', ref: sectorsRef },
      { id: 'humanitarian', ref: humanitarianRef },
      { id: 'country-region', ref: countryRegionRef },
      { id: 'locations', ref: locationsRef },
    ] : []),
  ]
  
  // Use scroll spy to track visible section
  const { activeSection, scrollToSection, setActiveSection } = useScrollSpy(sectionRefs, {
    rootMargin: '-80px 0px -60% 0px', // Account for sticky headers
    debounceMs: 100,
  })
  
  // Use lazy loader to track which sections have been scrolled into view
  const { isSectionActive, activateSection, activeSections } = useManualLazyLoader(['general'])
  
  // Track if sections have been revealed (for animation)
  const [sectionsRevealed, setSectionsRevealed] = useState(activityCreated)
  
  // Update parent when active section changes (for sidebar highlighting)
  useEffect(() => {
    if (activeSection) {
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
      initialSection !== 'general' && 
      activityCreated
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
      // Activate the first section after general
      activateSection('sectors')
    }
  }, [activityCreated, sectionsRevealed, activateSection])
  
  // Listen for scroll events from sidebar clicks
  useEffect(() => {
    const handleScrollToSection = (event: CustomEvent<string>) => {
      const sectionId = event.detail
      if (isActivityOverviewSection(sectionId)) {
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
        rootMargin: '200px 0px 200px 0px', // Preload 200px before visible
        threshold: 0,
      }
    )
    
    // Observe all section elements
    const sectionElements = [sectorsRef.current, humanitarianRef.current, countryRegionRef.current, locationsRef.current]
    sectionElements.forEach((el) => {
      if (el) observer.observe(el)
    })
    
    return () => observer.disconnect()
  }, [activityCreated, activateSection])
  
  return (
    <div className="activity-overview-group space-y-0">
      {/* General Section - Always visible */}
      <section 
        id="general" 
        ref={generalRef as React.RefObject<HTMLElement>}
        className="scroll-mt-0 pb-8"
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
            className="scroll-mt-0 pt-8 pb-8"
          >
            <SectionHeader 
              id="sectors"
              title={getSectionLabel('sectors')}
              helpText={getSectionHelpText('sectors')}
              showDivider={true}
            />
            {isSectionActive('sectors') || activeSections.has('sectors') ? (
              <div className="w-full">
                <ImprovedSectorAllocationForm
                  allocations={sectors}
                  onChange={(newSectors) => {
                    console.log('🎯 [AIMS] === SECTORS CHANGED IN FORM ===')
                    console.log('📊 [AIMS] New sectors:', JSON.stringify(newSectors, null, 2))
                    console.log('📈 [AIMS] Sector count:', newSectors.length)
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
            className="scroll-mt-0 pt-8 pb-8"
          >
            <SectionHeader 
              id="humanitarian"
              title={getSectionLabel('humanitarian')}
              helpText={getSectionHelpText('humanitarian')}
              showDivider={true}
            />
            {isSectionActive('humanitarian') || activeSections.has('humanitarian') ? (
              <HumanitarianTab 
                activityId={general.id || ''}
                readOnly={!permissions?.canEditActivity}
                onDataChange={(data) => {
                  setHumanitarian(data.humanitarian)
                  setHumanitarianScopes(data.humanitarianScopes)
                }}
              />
            ) : (
              <SectionSkeleton sectionId="humanitarian" />
            )}
          </section>
          
          {/* Country/Region Section */}
          <section 
            id="country-region" 
            ref={countryRegionRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-8 pb-8"
          >
            <SectionHeader 
              id="country-region"
              title={getSectionLabel('country-region')}
              helpText={getSectionHelpText('country-region')}
              showDivider={true}
            />
            {isSectionActive('country-region') || activeSections.has('country-region') ? (
              <CountriesRegionsTab
                activityId={general.id || ''}
                countries={countries}
                regions={regions}
                onCountriesChange={setCountries}
                onRegionsChange={setRegions}
                canEdit={permissions?.canEditActivity ?? true}
                geographyLevel={general.geographyLevel || 'activity'}
                onGeographyLevelChange={onGeographyLevelChange}
              />
            ) : (
              <SectionSkeleton sectionId="country-region" />
            )}
          </section>
          
          {/* Locations Section */}
          <section 
            id="locations" 
            ref={locationsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pt-8 pb-8"
          >
            <SectionHeader 
              id="locations"
              title={getSectionLabel('locations')}
              helpText={getSectionHelpText('locations')}
              showDivider={true}
            />
            {isSectionActive('locations') || activeSections.has('locations') ? (
              <CombinedLocationsTab 
                specificLocations={specificLocations}
                coverageAreas={coverageAreas}
                onSpecificLocationsChange={setSpecificLocations}
                onCoverageAreasChange={setCoverageAreas}
                advancedLocations={advancedLocations}
                onAdvancedLocationsChange={setAdvancedLocations}
                activityId={general.id}
                canEdit={permissions?.canEditActivity ?? true}
                onSubnationalDataChange={setSubnationalBreakdowns}
                subnationalBreakdowns={subnationalBreakdowns}
                activityTitle={general.title}
                activitySector={general.primarySector}
              />
            ) : (
              <SectionSkeleton sectionId="locations" />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default ActivityOverviewGroup
