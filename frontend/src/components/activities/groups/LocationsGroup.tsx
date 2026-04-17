"use client"

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react"
import { useScrollSpy, SectionRef } from "@/hooks/useScrollSpy"
import { useManualLazyLoader } from "@/hooks/useLazySectionLoader"
import { SectionHeader, getSectionLabel, getSectionHelpText } from "./SectionHeader"
import { SectionSkeleton, getSectionMinHeight } from "./SectionSkeleton"

// Import the tab components
import CountriesRegionsTab from "@/components/activities/CountriesRegionsTab"
import LocationsTab from "@/components/LocationsTab"
import { EnhancedSubnationalBreakdown } from "@/components/activities/EnhancedSubnationalBreakdown"
import { apiFetch } from "@/lib/api-fetch"

// Section IDs for the Locations group
export const LOCATIONS_SECTIONS = ['country-region', 'locations', 'subnational-allocation'] as const
export type LocationsSectionId = typeof LOCATIONS_SECTIONS[number]

/**
 * Check if a section ID belongs to the Locations group
 */
export function isLocationsSection(sectionId: string): boolean {
  return LOCATIONS_SECTIONS.includes(sectionId as LocationsSectionId)
}

// Props interface
interface LocationsGroupProps {
  // Activity context
  activityId: string
  general: any

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

  // Lazy loading control
  enablePreloading?: boolean
}

/**
 * LocationsGroup - Renders Countries & Regions, Activity Sites, and Sub-national Allocation
 * sections in a scrollable container with scroll spy integration.
 */
export function LocationsGroup({
  activityId,
  general,

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

  // Lazy loading control
  enablePreloading = false,
}: LocationsGroupProps) {

  // Create refs for each section
  const countryRegionRef = useRef<HTMLElement>(null)
  const locationsRef = useRef<HTMLElement>(null)
  const subnationalRef = useRef<HTMLElement>(null)

  // Track locations for suggested regions flow to subnational
  const [currentLocations, setCurrentLocations] = useState<any[]>([])

  // Fetch locations from the API on mount so suggestedRegions/Townships
  // are available even if the Activity Sites tab hasn't been rendered yet
  useEffect(() => {
    if (!activityId) return
    let cancelled = false

    async function fetchLocations() {
      try {
        const response = await apiFetch(`/api/activities/${activityId}/locations`)
        if (response.ok && !cancelled) {
          const data = await response.json()
          const allLocations = data.locations || data || []
          // Filter out coverage-type locations (same as LocationsTab)
          const siteLocations = Array.isArray(allLocations)
            ? allLocations.filter((loc: any) => loc.location_type !== 'coverage')
            : []
          if (siteLocations.length > 0) {
            setCurrentLocations(siteLocations)
          }
        }
      } catch (e) {
        // Non-critical — suggestedRegions will just be empty until LocationsTab loads
        console.log('[LocationsGroup] Could not pre-fetch locations:', e)
      }
    }

    fetchLocations()
    return () => { cancelled = true }
  }, [activityId])

  // Derive suggested regions and townships from Activity Sites locations
  const suggestedRegions = useMemo(() => {
    const regionSet = new Set<string>()
    currentLocations.forEach(loc => {
      if (loc.state_region_name) {
        regionSet.add(loc.state_region_name)
      }
    })
    return Array.from(regionSet)
  }, [currentLocations])

  const suggestedTownships = useMemo(() => {
    const townships: Array<{ townshipName: string; regionName: string }> = []
    currentLocations.forEach(loc => {
      if (loc.township_name && loc.state_region_name) {
        // Avoid duplicates
        if (!townships.some(t => t.townshipName === loc.township_name && t.regionName === loc.state_region_name)) {
          townships.push({ townshipName: loc.township_name, regionName: loc.state_region_name })
        }
      }
    })
    return townships
  }, [currentLocations])

  // Debug: log location fields to diagnose suggested regions/townships
  useEffect(() => {
    if (currentLocations.length > 0) {
      const mapped = currentLocations.map(loc => ({
        name: loc.location_name,
        state_region_name: loc.state_region_name || '(empty)',
        township_name: loc.township_name || '(empty)',
        city: loc.city || '(empty)',
      }))
      console.log('[LocationsGroup] currentLocations fields:', JSON.stringify(mapped, null, 2))
      console.log('[LocationsGroup] suggestedRegions:', JSON.stringify(suggestedRegions))
      console.log('[LocationsGroup] suggestedTownships:', JSON.stringify(suggestedTownships))
    }
  }, [currentLocations, suggestedRegions, suggestedTownships])

  // Handle locations change from LocationsTab
  const handleLocationsChange = useCallback((newLocations: any[]) => {
    setCurrentLocations(newLocations)
    if (setSpecificLocations) {
      setSpecificLocations(newLocations)
    }
  }, [setSpecificLocations])

  // Handle subnational data change
  const handleSubnationalDataChange = useCallback((breakdowns: Record<string, number>) => {
    if (setSubnationalBreakdowns) {
      setSubnationalBreakdowns(breakdowns as any)
    }
  }, [setSubnationalBreakdowns])

  // Build section refs array for scroll spy
  const sectionRefs: SectionRef[] = useMemo(() => activityCreated ? [
    { id: 'country-region', ref: countryRegionRef },
    { id: 'locations', ref: locationsRef },
    { id: 'subnational-allocation', ref: subnationalRef },
  ] : [], [activityCreated])

  // Use scroll spy to track visible section
  const { activeSection, scrollToSection, setActiveSection, lockScrollSpy } = useScrollSpy(sectionRefs, {
    rootMargin: '-80px 0px -50% 0px',
    debounceMs: 150,
    initialSection: initialSection && isLocationsSection(initialSection) ? initialSection : null,
  })

  // Use lazy loader to track which sections have been scrolled into view
  const { isSectionActive, activateSection, activateSections, activeSections } = useManualLazyLoader(
    activityCreated
      ? (enablePreloading ? [...LOCATIONS_SECTIONS] : ['country-region'])
      : []
  )

  // Track if sections have been revealed (for animation)
  const [sectionsRevealed, setSectionsRevealed] = useState(activityCreated)

  // When initialSection changes (user clicked a section in this group),
  // lock scroll spy, set active section, and instantly scroll to target
  const prevInitialSection = useRef(initialSection)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (initialSection && isLocationsSection(initialSection) && activityCreated) {
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
  useEffect(() => {
    if (isFirstRender.current) return
    if (activeSection && isLocationsSection(activeSection)) {
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
      activateSection('country-region')
    }
  }, [activityCreated, sectionsRevealed, activateSection])

  // Listen for scroll events from sidebar clicks
  useEffect(() => {
    const handleScrollToSection = (event: CustomEvent<string>) => {
      const sectionId = event.detail
      if (isLocationsSection(sectionId)) {
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
        rootMargin: '1500px 0px 1500px 0px',
        threshold: 0,
      }
    )

    const sectionElements = [
      countryRegionRef.current,
      locationsRef.current,
      subnationalRef.current,
    ]
    sectionElements.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [activityCreated, activateSection])

  const activeSectionsRef = useRef(activeSections)
  activeSectionsRef.current = activeSections

  // Batch preloading
  useEffect(() => {
    if (!activityCreated || !enablePreloading) return

    const sectionsToPreload = ['country-region', 'locations', 'subnational-allocation']
    const unloaded = sectionsToPreload.filter(id => !activeSectionsRef.current.has(id))
    if (unloaded.length > 0) {
      activateSections(unloaded)
    }
  }, [activityCreated, enablePreloading, activateSections])

  return (
    <div className="locations-group space-y-0">
      {/* Show message if activity not created */}
      {!activityCreated && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Please save the activity first to access location sections.</p>
        </div>
      )}

      {/* Sections revealed after activity creation */}
      {activityCreated && (
        <div className={`transition-all duration-500 ${sectionsRevealed ? 'opacity-100' : 'opacity-0'}`}>
          {/* Countries & Regions Section */}
          <section
            id="country-region"
            ref={countryRegionRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 pb-16"
            style={{ minHeight: getSectionMinHeight('country-region') }}
          >
            {isSectionActive('country-region') || activeSections.has('country-region') ? (
              <div className="bg-white rounded-lg shadow-sm border border-border p-8">
                <SectionHeader
                  id="country-region"
                  title={getSectionLabel('country-region')}
                  helpText={getSectionHelpText('country-region')}
                  showDivider={false}
                />
                <CountriesRegionsTab
                  activityId={activityId}
                  countries={countries}
                  regions={regions}
                  onCountriesChange={setCountries}
                  onRegionsChange={setRegions}
                  canEdit={permissions?.canEditActivity ?? true}
                  geographyLevel={general.geographyLevel || 'activity'}
                  onGeographyLevelChange={onGeographyLevelChange}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="country-region" />
            )}
          </section>

          {/* Activity Sites Section */}
          <section
            id="locations"
            ref={locationsRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 mt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('locations') }}
          >
            {isSectionActive('locations') || activeSections.has('locations') ? (
              <div className="bg-white rounded-lg shadow-sm border border-border p-8">
                <SectionHeader
                  id="locations"
                  title={getSectionLabel('locations')}
                  helpText={getSectionHelpText('locations')}
                  showDivider={false}
                />
                <LocationsTab
                  activityId={activityId}
                  activityTitle={general.title}
                  activitySector={general.primarySector}
                  canEdit={permissions?.canEditActivity ?? true}
                  onLocationsChange={handleLocationsChange}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="locations" />
            )}
          </section>

          {/* Sub-national Allocation Section */}
          <section
            id="subnational-allocation"
            ref={subnationalRef as React.RefObject<HTMLElement>}
            className="scroll-mt-0 mt-16 pb-16"
            style={{ minHeight: getSectionMinHeight('subnational-allocation') || 400 }}
          >
            {isSectionActive('subnational-allocation') || activeSections.has('subnational-allocation') ? (
              <div className="bg-white rounded-lg shadow-sm border border-border p-8">
                <EnhancedSubnationalBreakdown
                  activityId={activityId}
                  canEdit={permissions?.canEditActivity ?? true}
                  onDataChange={handleSubnationalDataChange}
                  suggestedRegions={suggestedRegions}
                  suggestedTownships={suggestedTownships}
                />
              </div>
            ) : (
              <SectionSkeleton sectionId="subnational-allocation" />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default LocationsGroup
