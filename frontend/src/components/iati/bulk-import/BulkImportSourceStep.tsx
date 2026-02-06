'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Globe,
  Upload,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Building2,
  ExternalLink,
  Filter,
  ChevronsUpDown,
  X,
} from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { useHomeCountry, useSystemSettings } from '@/contexts/SystemSettingsContext'
import { apiFetch } from '@/lib/api-fetch'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { USER_ROLES } from '@/types/user'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { COUNTRY_COORDINATES } from '@/data/country-coordinates'
import { ALPHA2_TO_ALPHA3 } from '@/data/country-alpha3'
import BulkUploadStep from './BulkUploadStep'
import BulkValidationStep from './BulkValidationStep'
import { OrganizationCombobox, type Organization } from '@/components/ui/organization-combobox'
import type {
  ImportSourceMode,
  BulkImportMeta,
  ParsedActivity,
} from './types'

/**
 * Approximate bounding boxes for countries (for location-based country inference).
 * Used when activities don't have recipient-country but do have location coordinates.
 * These are approximate and meant for filtering, not precise boundary detection.
 * Format: { minLat, maxLat, minLng, maxLng }
 */
const COUNTRY_BOUNDING_BOXES: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  // Southeast Asia
  MM: { minLat: 9.5, maxLat: 28.5, minLng: 92.0, maxLng: 101.5 },   // Myanmar
  TH: { minLat: 5.5, maxLat: 20.5, minLng: 97.3, maxLng: 105.7 },   // Thailand
  VN: { minLat: 8.2, maxLat: 23.4, minLng: 102.1, maxLng: 109.5 },  // Vietnam
  KH: { minLat: 10.0, maxLat: 14.7, minLng: 102.3, maxLng: 107.7 }, // Cambodia
  LA: { minLat: 13.9, maxLat: 22.5, minLng: 100.0, maxLng: 107.7 }, // Laos
  PH: { minLat: 4.5, maxLat: 21.2, minLng: 116.9, maxLng: 126.6 },  // Philippines
  ID: { minLat: -11.0, maxLat: 6.1, minLng: 95.0, maxLng: 141.0 },  // Indonesia

  // South Asia
  BD: { minLat: 20.6, maxLat: 26.6, minLng: 88.0, maxLng: 92.7 },   // Bangladesh
  IN: { minLat: 6.7, maxLat: 35.5, minLng: 68.1, maxLng: 97.4 },    // India
  NP: { minLat: 26.3, maxLat: 30.5, minLng: 80.0, maxLng: 88.2 },   // Nepal
  PK: { minLat: 23.6, maxLat: 37.1, minLng: 60.8, maxLng: 77.8 },   // Pakistan
  LK: { minLat: 5.9, maxLat: 9.9, minLng: 79.5, maxLng: 82.0 },     // Sri Lanka
  AF: { minLat: 29.4, maxLat: 38.5, minLng: 60.5, maxLng: 75.0 },   // Afghanistan

  // East Africa
  ET: { minLat: 3.4, maxLat: 15.0, minLng: 32.9, maxLng: 48.0 },    // Ethiopia
  KE: { minLat: -4.7, maxLat: 5.0, minLng: 33.9, maxLng: 41.9 },    // Kenya
  UG: { minLat: -1.5, maxLat: 4.2, minLng: 29.5, maxLng: 35.0 },    // Uganda
  TZ: { minLat: -11.7, maxLat: -1.0, minLng: 29.3, maxLng: 40.5 },  // Tanzania
  RW: { minLat: -2.8, maxLat: -1.0, minLng: 28.8, maxLng: 30.9 },   // Rwanda

  // West Africa
  NG: { minLat: 4.2, maxLat: 13.9, minLng: 2.7, maxLng: 14.7 },     // Nigeria
  GH: { minLat: 4.7, maxLat: 11.2, minLng: -3.3, maxLng: 1.2 },     // Ghana
  SN: { minLat: 12.3, maxLat: 16.7, minLng: -17.5, maxLng: -11.4 }, // Senegal
  ML: { minLat: 10.1, maxLat: 25.0, minLng: -12.2, maxLng: 4.3 },   // Mali
  BF: { minLat: 9.4, maxLat: 15.1, minLng: -5.5, maxLng: 2.4 },     // Burkina Faso
  NE: { minLat: 11.7, maxLat: 23.5, minLng: 0.1, maxLng: 16.0 },    // Niger

  // Central/Southern Africa
  CD: { minLat: -13.5, maxLat: 5.4, minLng: 12.2, maxLng: 31.3 },   // DR Congo
  ZA: { minLat: -34.8, maxLat: -22.1, minLng: 16.5, maxLng: 32.9 }, // South Africa
  MZ: { minLat: -26.9, maxLat: -10.5, minLng: 30.2, maxLng: 41.0 }, // Mozambique
  MW: { minLat: -17.1, maxLat: -9.4, minLng: 32.7, maxLng: 35.9 },  // Malawi
  ZM: { minLat: -18.1, maxLat: -8.2, minLng: 22.0, maxLng: 33.7 },  // Zambia
  ZW: { minLat: -22.4, maxLat: -15.6, minLng: 25.2, maxLng: 33.1 }, // Zimbabwe

  // Middle East
  YE: { minLat: 12.1, maxLat: 19.0, minLng: 42.5, maxLng: 54.5 },   // Yemen
  JO: { minLat: 29.2, maxLat: 33.4, minLng: 34.9, maxLng: 39.3 },   // Jordan
  LB: { minLat: 33.1, maxLat: 34.7, minLng: 35.1, maxLng: 36.6 },   // Lebanon
  SY: { minLat: 32.3, maxLat: 37.3, minLng: 35.7, maxLng: 42.4 },   // Syria
  IQ: { minLat: 29.1, maxLat: 37.4, minLng: 38.8, maxLng: 48.6 },   // Iraq

  // Latin America
  CO: { minLat: -4.2, maxLat: 13.4, minLng: -81.7, maxLng: -66.9 }, // Colombia
  PE: { minLat: -18.4, maxLat: -0.0, minLng: -81.3, maxLng: -68.7 }, // Peru
  BR: { minLat: -33.8, maxLat: 5.3, minLng: -73.9, maxLng: -28.8 }, // Brazil
  MX: { minLat: 14.5, maxLat: 32.7, minLng: -117.1, maxLng: -86.7 }, // Mexico
  GT: { minLat: 13.7, maxLat: 17.8, minLng: -92.2, maxLng: -88.2 }, // Guatemala
  HN: { minLat: 12.9, maxLat: 16.5, minLng: -89.4, maxLng: -83.1 }, // Honduras
  HT: { minLat: 18.0, maxLat: 20.1, minLng: -74.5, maxLng: -71.6 }, // Haiti
}

function LoadingTextRoller({ orgName }: { orgName: string }) {
  const messages = useMemo(() => [
    'Connecting to IATI Registry...',
    `Searching for ${orgName}...`,
    'Querying the IATI Datastore...',
    'Parsing activity identifiers...',
    'Reading transaction data...',
    'Extracting sector codes...',
    'Processing recipient countries...',
    'Mapping participating organisations...',
    'Checking for budget information...',
    'Validating IATI format...',
    'Resolving organisation references...',
    'Fetching activity metadata...',
    'Parsing location data...',
    'Processing date fields...',
    'Preparing activity preview...',
    'Analysing transaction types...',
    'Checking activity hierarchies...',
    'Reading document links...',
    'Processing result indicators...',
    'Finalising data extraction...',
  ], [orgName])

  const [currentMessage, setCurrentMessage] = useState(messages[0])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(prev => {
        // Pick a random message that's different from the current one
        const otherMessages = messages.filter(m => m !== prev)
        return otherMessages[Math.floor(Math.random() * otherMessages.length)]
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [messages])

  return (
    <p className="h-6 flex items-center justify-center text-sm text-gray-500 animate-pulse">
      {currentMessage}
    </p>
  )
}

interface BulkImportSourceStepProps {
  sourceMode: ImportSourceMode
  onSourceModeChange: (mode: ImportSourceMode) => void
  onActivitiesReady: (activities: ParsedActivity[], meta: BulkImportMeta) => void
  /** Whether activities have already been loaded (to avoid re-fetch on step navigation) */
  activitiesLoaded: boolean
}

export default function BulkImportSourceStep({
  sourceMode,
  onSourceModeChange,
  onActivitiesReady,
  activitiesLoaded,
}: BulkImportSourceStepProps) {
  const { user } = useUser()
  const { settings: systemSettings, loading: settingsLoading } = useSystemSettings()
  const homeCountry = systemSettings?.homeCountry || ''

  // --- Super user state ---
  const isSuperUser = user?.role === USER_ROLES.SUPER_USER || user?.role === 'admin'
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [loadingOrgs, setLoadingOrgs] = useState(true) // Start true, set false after fetch
  const [orgsFetched, setOrgsFetched] = useState(false)

  // --- Datastore mode state ---
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [datastoreActivities, setDatastoreActivities] = useState<ParsedActivity[]>([])
  const [datastoreTotal, setDatastoreTotal] = useState(0)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [wasCached, setWasCached] = useState(false)
  const fetchedRef = useRef(false)

  // --- Progress tracking state ---
  const [fetchProgress, setFetchProgress] = useState(0)
  const [fetchPhase, setFetchPhase] = useState<'connecting' | 'fetching' | 'enriching' | 'processing'>('connecting')
  const [fetchProgressMessage, setFetchProgressMessage] = useState<string | null>(null)
  const [longFetchWarning, setLongFetchWarning] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState<{ count: number; seconds: number } | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const fetchStartTimeRef = useRef<number>(0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const estimatedSecondsRef = useRef<number>(65) // Default estimate, updated by count query

  // --- Country filter state ---
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedHierarchy, setSelectedHierarchy] = useState<number | null>(null)
  const [countryScope, setCountryScope] = useState<'all' | '100' | 'regional'>('all') // 100% vs regional allocation
  const [orgScopeData, setOrgScopeData] = useState<{ reportingOrgRef: string; organizationName: string } | null>(null)

  // --- Date filter state ---
  // Default: last 5 years to present + 2 years future (for planned dates)
  const currentYear = new Date().getFullYear()
  const [dateRangeStart, setDateRangeStart] = useState<string>(`${currentYear - 5}-01-01`)
  const [dateRangeEnd, setDateRangeEnd] = useState<string>(`${currentYear + 2}-12-31`)
  const [dateFilterEnabled, setDateFilterEnabled] = useState<boolean>(true)
  const [countryOpen, setCountryOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  // --- XML mode state ---
  const [xmlFile, setXmlFile] = useState<File | null>(null)
  const [xmlMeta, setXmlMeta] = useState<BulkImportMeta | null>(null)
  const [xmlParsedActivities, setXmlParsedActivities] = useState<ParsedActivity[]>([])
  const [xmlValidated, setXmlValidated] = useState(false)

  // Determine which organization to use (selected for super users, or user's own)
  const selectedOrg = selectedOrgId
    ? organizations.find(o => o.id === selectedOrgId)
    : null

  const orgName = selectedOrg?.name || user?.organization?.name || user?.organisation || 'Your Organisation'
  const orgAcronym = selectedOrg?.acronym || user?.organization?.acronym
  const orgDisplayName = orgAcronym ? `${orgName} (${orgAcronym})` : orgName
  const orgIatiId = selectedOrg?.iati_org_id || user?.organization?.iati_org_id
  const orgLogo = selectedOrg?.logo || user?.organization?.logo
  const orgCountry = selectedOrg?.country || user?.organization?.country
  const currentOrgId = selectedOrgId || user?.organizationId

  // --- Country filter computed values ---
  const availableCountries = useMemo(() => {
    return Object.values(COUNTRY_COORDINATES)
      .map(c => ({ code: c.code, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const availableHierarchies = useMemo(() => {
    const levels = new Set<number>()
    for (const a of datastoreActivities) {
      if (a.hierarchy != null) levels.add(a.hierarchy)
    }
    return Array.from(levels).sort((a, b) => a - b)
  }, [datastoreActivities])

  // Count transactions per hierarchy level (respecting country filter with IATI geography rules)
  const transactionCountsByLevel = useMemo(() => {
    const counts: Record<number | 'all', number> = { all: 0 }

    // Filter by country first if selected (using IATI geography rules)
    let activities = datastoreActivities
    if (selectedCountry) {
      const countryBounds = COUNTRY_BOUNDING_BOXES[selectedCountry]
      const alpha3Code = ALPHA2_TO_ALPHA3[selectedCountry] || selectedCountry

      // Helper: check if a country code matches (handles alpha-2 and alpha-3)
      const countryCodeMatches = (code: string | undefined): boolean => {
        if (!code) return false
        const upperCode = code.toUpperCase()
        return upperCode === selectedCountry.toUpperCase() || upperCode === alpha3Code.toUpperCase()
      }

      // Helper: check if coordinates fall within country bounds
      const coordsInCountry = (lat: number, lng: number): boolean => {
        if (!countryBounds) return false
        return lat >= countryBounds.minLat && lat <= countryBounds.maxLat &&
               lng >= countryBounds.minLng && lng <= countryBounds.maxLng
      }

      // Helper: check if activity is in country via locations
      const activityInCountryViaLocations = (a: ParsedActivity): boolean => {
        if (a.recipientCountries && a.recipientCountries.length > 0) return false
        if (!a.locations || a.locations.length === 0) return false
        const locationsWithCoords = a.locations.filter(l => l.coordinates)
        if (locationsWithCoords.length === 0) return false
        return locationsWithCoords.every(l =>
          l.coordinates && coordsInCountry(l.coordinates.latitude, l.coordinates.longitude)
        )
      }

      activities = activities.filter(a =>
        a.recipientCountries?.some(rc => countryCodeMatches(rc.code)) ||
        activityInCountryViaLocations(a)
      )
    }

    for (const a of activities) {
      const txCount = a.transactions?.length || 0
      counts.all += txCount
      if (a.hierarchy != null) {
        counts[a.hierarchy] = (counts[a.hierarchy] || 0) + txCount
      }
    }
    return counts
  }, [datastoreActivities, selectedCountry])

  const filteredActivities = useMemo(() => {
    let result = datastoreActivities
    if (selectedCountry) {
      // IATI Geography Rules Implementation:
      // An activity is considered to be in a country if EITHER:
      // Condition A: recipient-country includes the country code
      // Condition B: recipient-country is empty AND all locations resolve to that country
      //
      // For location-based inference, we use country bounding boxes.
      // Note: This is approximate - a more precise approach would use GeoJSON boundaries.
      const countryBounds = COUNTRY_BOUNDING_BOXES[selectedCountry]
      const alpha3Code = ALPHA2_TO_ALPHA3[selectedCountry] || selectedCountry

      // Helper: check if a country code matches (handles alpha-2 and alpha-3)
      const countryCodeMatches = (code: string | undefined): boolean => {
        if (!code) return false
        const upperCode = code.toUpperCase()
        return upperCode === selectedCountry.toUpperCase() || upperCode === alpha3Code.toUpperCase()
      }

      // Helper: check if coordinates fall within country bounds
      const coordsInCountry = (lat: number, lng: number): boolean => {
        if (!countryBounds) return false
        return lat >= countryBounds.minLat && lat <= countryBounds.maxLat &&
               lng >= countryBounds.minLng && lng <= countryBounds.maxLng
      }

      // Helper: check if activity is in country via locations (Condition B)
      const activityInCountryViaLocations = (a: ParsedActivity): boolean => {
        // Must have no recipient-country data
        if (a.recipientCountries && a.recipientCountries.length > 0) return false
        // Must have at least one location with coordinates
        if (!a.locations || a.locations.length === 0) return false
        const locationsWithCoords = a.locations.filter(l => l.coordinates)
        if (locationsWithCoords.length === 0) return false
        // ALL locations must be in the selected country
        return locationsWithCoords.every(l =>
          l.coordinates && coordsInCountry(l.coordinates.latitude, l.coordinates.longitude)
        )
      }

      // Debug: count what's being filtered
      const beforeFilter = result.length
      const withRecipientCountry = result.filter(a => a.recipientCountries?.some(rc => countryCodeMatches(rc.code))).length
      const withLocationInference = result.filter(a => activityInCountryViaLocations(a)).length
      console.log('[Filter Debug] Country filter:', {
        selectedCountry,
        alpha3Code,
        beforeFilter,
        withRecipientCountry,
        withLocationInference,
      })

      result = result.filter(a => {
        // Condition A: Has recipient-country with selected code (check both alpha-2 and alpha-3)
        const hasRecipientCountry = a.recipientCountries?.some(rc => countryCodeMatches(rc.code))
        if (hasRecipientCountry) return true

        // Condition B: No recipient-country, but all locations in selected country
        return activityInCountryViaLocations(a)
      })

      console.log('[Filter Debug] After country filter:', result.length, 'activities')

      // Apply country scope filter (100% vs regional)
      if (countryScope === '100') {
        // Debug: show what percentages exist
        const percentages = result.map(a => a.recipientCountries?.find(rc => countryCodeMatches(rc.code))?.percentage)
        console.log('[Filter Debug] Percentages for selected country:', Array.from(new Set(percentages)))

        // Only activities where selected country is 100% (or only country listed, or inferred from locations)
        result = result.filter(a => {
          const countryAlloc = a.recipientCountries?.find(rc => countryCodeMatches(rc.code))

          // If activity was matched via locations (no recipient-country), treat as 100%
          if (!a.recipientCountries || a.recipientCountries.length === 0) {
            return activityInCountryViaLocations(a)
          }

          // 100% if: explicit 100% (handle string/number), or it's the only country
          const pct = countryAlloc?.percentage
          const is100 = pct !== undefined && pct !== null && Number(pct) >= 99.9
          const isSingleCountry = a.recipientCountries?.length === 1
          return countryAlloc && (is100 || (isSingleCountry && (pct == null || Number(pct) >= 99.9)))
        })
        console.log('[Filter Debug] After 100% filter:', result.length, 'activities')
      } else if (countryScope === 'regional') {
        // Only activities where selected country has partial allocation (<100%)
        // Activities matched via locations are NOT regional (they're 100% by inference)
        result = result.filter(a => {
          // Skip activities matched via locations (they're 100%, not regional)
          if (!a.recipientCountries || a.recipientCountries.length === 0) return false

          const countryAlloc = a.recipientCountries?.find(rc => countryCodeMatches(rc.code))
          const hasMultipleCountries = (a.recipientCountries?.length || 0) > 1
          // Regional if: explicit <100%, or multiple countries listed
          return countryAlloc && (
            (countryAlloc.percentage != null && countryAlloc.percentage < 100) ||
            hasMultipleCountries
          )
        })
      }
    }
    if (selectedHierarchy != null) {
      const beforeHierarchyFilter = result.length
      result = result.filter(a => a.hierarchy === selectedHierarchy)
      console.log(`[Filter Debug] Hierarchy filter (level ${selectedHierarchy}): ${beforeHierarchyFilter} → ${result.length} activities`)
    }

    // Date range filter - include activities that overlap with the date range
    // An activity overlaps if ANY of its dates fall within the range
    if (dateFilterEnabled && dateRangeStart && dateRangeEnd) {
      const startDate = new Date(dateRangeStart)
      const endDate = new Date(dateRangeEnd)
      const beforeDateFilter = result.length

      result = result.filter(a => {
        // Get all relevant dates from the activity
        const dates: Date[] = []

        if (a.planned_start_date) dates.push(new Date(a.planned_start_date))
        if (a.planned_end_date) dates.push(new Date(a.planned_end_date))
        if (a.actual_start_date) dates.push(new Date(a.actual_start_date))
        if (a.actual_end_date) dates.push(new Date(a.actual_end_date))

        // If no dates at all, include the activity (can't filter without data)
        if (dates.length === 0) return true

        // Activity overlaps if:
        // - Any date falls within the range, OR
        // - Activity spans across the range (start before range, end after range)
        const hasDateInRange = dates.some(d => d >= startDate && d <= endDate)

        // Check if activity spans the range (started before, ends after)
        const activityStart = a.actual_start_date ? new Date(a.actual_start_date)
          : a.planned_start_date ? new Date(a.planned_start_date) : null
        const activityEnd = a.actual_end_date ? new Date(a.actual_end_date)
          : a.planned_end_date ? new Date(a.planned_end_date) : null

        const spansRange = activityStart && activityEnd &&
          activityStart <= endDate && activityEnd >= startDate

        return hasDateInRange || spansRange
      })

      console.log(`[Filter Debug] Date filter (${dateRangeStart} to ${dateRangeEnd}): ${beforeDateFilter} → ${result.length} activities`)
    }

    return result
  }, [datastoreActivities, selectedCountry, selectedHierarchy, countryScope, dateFilterEnabled, dateRangeStart, dateRangeEnd])

  // Diagnostic: count Level 2 activities without recipient-country data
  const level2DiagnosticInfo = useMemo(() => {
    if (selectedHierarchy !== 2 || !selectedCountry) return null

    const allLevel2 = datastoreActivities.filter(a => a.hierarchy === 2)
    const level2WithCountryData = allLevel2.filter(a => a.recipientCountries && a.recipientCountries.length > 0)

    // Check for both alpha-2 (MM) and alpha-3 (MMR) codes
    const alpha3Code = ALPHA2_TO_ALPHA3[selectedCountry] || selectedCountry

    const level2WithSelectedCountry = allLevel2.filter(a =>
      a.recipientCountries?.some(rc =>
        rc.code === selectedCountry ||
        rc.code === alpha3Code ||
        rc.code?.toUpperCase() === selectedCountry.toUpperCase() ||
        rc.code?.toUpperCase() === alpha3Code.toUpperCase()
      )
    )

    return {
      totalLevel2: allLevel2.length,
      withCountryData: level2WithCountryData.length,
      withSelectedCountry: level2WithSelectedCountry.length,
      percentWithCountryData: allLevel2.length > 0
        ? Math.round((level2WithCountryData.length / allLevel2.length) * 100)
        : 0,
    }
  }, [datastoreActivities, selectedHierarchy, selectedCountry])

  // Calculate totals for filtered activities
  const filteredTotals = useMemo(() => {
    let totalTransactions = 0
    for (const a of filteredActivities) {
      totalTransactions += a.transactions?.length || 0
    }
    return { totalTransactions }
  }, [filteredActivities])

  const searchedCountries = useMemo(() => {
    if (!countrySearch) return availableCountries
    const term = countrySearch.toLowerCase()
    return availableCountries.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term) ||
      (ALPHA2_TO_ALPHA3[c.code] || '').toLowerCase().includes(term)
    )
  }, [availableCountries, countrySearch])

  // --- Progress simulation helpers ---
  // Since the API call is a single long request without streaming progress,
  // we simulate progress based on expected duration from the count query
  const startProgressSimulation = useCallback((estimatedSeconds?: number) => {
    setFetchProgress(0)
    setFetchPhase('connecting')
    setFetchProgressMessage(null)
    setLongFetchWarning(false)
    setElapsedSeconds(0)
    fetchStartTimeRef.current = Date.now()

    // Use estimated seconds from count query, or default to 65s
    const totalEstimate = estimatedSeconds || estimatedSecondsRef.current || 65
    estimatedSecondsRef.current = totalEstimate

    // Clear any existing intervals
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current)
    }

    // Start elapsed time counter
    elapsedIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - fetchStartTimeRef.current) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)

    // Dynamic progress phases based on estimated duration:
    // - connecting: 0-3s (0-5%)
    // - fetching: 3s to (estimate * 0.85) (5-80%)
    // - enriching: (estimate * 0.85) to (estimate * 0.95) (80-95%)
    // - processing: (estimate * 0.95) to estimate (95-99%)
    const fetchEnd = Math.max(10, totalEstimate * 0.85)
    const enrichEnd = Math.max(15, totalEstimate * 0.95)
    const processEnd = totalEstimate

    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - fetchStartTimeRef.current) / 1000

      if (elapsed < 3) {
        // Connecting phase
        setFetchPhase('connecting')
        setFetchProgress(Math.min(5, (elapsed / 3) * 5))
      } else if (elapsed < fetchEnd) {
        // Fetching phase (main duration)
        setFetchPhase('fetching')
        // Progress from 5 to 80 over the fetch duration
        const fetchProgress = 5 + ((elapsed - 3) / (fetchEnd - 3)) * 75
        setFetchProgress(Math.min(80, fetchProgress))
      } else if (elapsed < enrichEnd) {
        // Enriching phase
        setFetchPhase('enriching')
        const enrichProgress = 80 + ((elapsed - fetchEnd) / (enrichEnd - fetchEnd)) * 15
        setFetchProgress(Math.min(95, enrichProgress))
      } else if (elapsed < processEnd * 1.2) {
        // Processing phase (allow 20% buffer)
        setFetchPhase('processing')
        const processProgress = 95 + ((elapsed - enrichEnd) / (processEnd * 0.2)) * 4
        setFetchProgress(Math.min(99, processProgress))
      } else {
        // Extended fetch - taking longer than estimated
        setFetchPhase('processing')
        setFetchProgress(99)
        setLongFetchWarning(true)

        // When elapsed exceeds estimated, don't show the estimate anymore
        // Just show elapsed time
        setFetchProgressMessage(null)
      }
    }, 200)
  }, [])

  const stopProgressSimulation = useCallback((success: boolean) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current)
      elapsedIntervalRef.current = null
    }
    setLongFetchWarning(false)
    setFetchProgressMessage(null)
    setEstimatedTime(null)
    setElapsedSeconds(0)
    if (success) {
      setFetchProgress(100)
      setFetchPhase('processing')
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current)
      }
    }
  }, [])

  // Fetch organizations list for super users
  useEffect(() => {
    // Wait for user data to be loaded
    if (!user) {
      console.log('[IATI Import] Waiting for user data...')
      return
    }

    // If not super user, just set loading to false
    if (!isSuperUser) {
      setLoadingOrgs(false)
      setOrgsFetched(true)
      return
    }

    // Don't fetch again if already fetched
    if (orgsFetched) return

    const fetchOrganizations = async () => {
      setLoadingOrgs(true)
      console.log('[IATI Import] Starting organization fetch for super user...', { user: user?.id, role: user?.role })

      try {
        // Fetch all organizations directly from Supabase (same pattern as profile page)
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, acronym, iati_org_id, reporting_org_ref, logo, country, Organisation_Type_Code, Organisation_Type_Name')
          .order('name')

        if (error) {
          console.error('[IATI Import] Supabase error fetching organizations:', error)
          throw error
        }

        console.log('[IATI Import] Fetched organizations from Supabase:', {
          count: data?.length,
          sample: data?.slice(0, 3).map((o: { id: string; name: string }) => ({ id: o.id, name: o.name }))
        })

        // Filter to only organizations with IATI identifiers
        let orgList: Organization[] = (data || [])
          .filter((org: { iati_org_id: string | null }) => org.iati_org_id && org.iati_org_id.trim() !== '')
          .map((org: {
            id: string;
            name: string;
            acronym: string | null;
            iati_org_id: string | null;
            logo: string | null;
            country: string | null;
            Organisation_Type_Code: string | null;
            Organisation_Type_Name: string | null;
          }) => ({
            id: org.id,
            name: org.name,
            acronym: org.acronym || undefined,
            iati_org_id: org.iati_org_id || undefined,
            logo: org.logo || undefined,
            country: org.country || undefined,
            Organisation_Type_Code: org.Organisation_Type_Code || undefined,
            Organisation_Type_Name: org.Organisation_Type_Name || undefined,
          }))

        // Ensure user's own organization is in the list
        if (user?.organizationId && user?.organization) {
          const userOrgExists = orgList.some(o => o.id === user.organizationId)
          if (!userOrgExists) {
            // Add user's org at the beginning
            orgList = [{
              id: user.organizationId,
              name: user.organization.name || '',
              acronym: user.organization.acronym,
              logo: user.organization.logo,
              iati_org_id: user.organization.iati_org_id,
            }, ...orgList]
            console.log('[IATI Import] Added user org to list (was missing)')
          }
        }

        console.log('[IATI Import] Loaded', orgList.length, 'organizations for super user selection')
        setOrganizations(orgList)
        // Note: Don't set selectedOrgId here - empty means "use your own org"
        // We only set selectedOrgId when user explicitly selects a DIFFERENT org
      } catch (err) {
        console.error('[IATI Import] Failed to fetch organizations:', err)

        // Fallback: at least show user's own org
        if (user?.organizationId && user?.organization) {
          console.log('[IATI Import] Using fallback after error - user org only')
          setOrganizations([{
            id: user.organizationId,
            name: user.organization.name || '',
            acronym: user.organization.acronym,
            logo: user.organization.logo,
            iati_org_id: user.organization.iati_org_id,
          }])
          setSelectedOrgId(user.organizationId)
        }
      } finally {
        setLoadingOrgs(false)
        setOrgsFetched(true)
      }
    }

    fetchOrganizations()
  }, [isSuperUser, orgsFetched, user, user?.organizationId, user?.organization, selectedOrgId])

  // --- Datastore fetch ---
  const fetchFromDatastore = useCallback(async (forceRefresh = false, orgId?: string) => {
    setFetchStatus('fetching')
    setFetchError(null)
    setEstimatedTime(null)

    try {
      const params = new URLSearchParams()
      if (forceRefresh) params.set('force_refresh', 'true')
      // Only include organization_id for super users who selected a DIFFERENT org
      // Empty selectedOrgId means "use your own org" (no parameter needed)
      const targetOrgId = orgId ?? selectedOrgId
      if (targetOrgId && isSuperUser && targetOrgId !== user?.organizationId) {
        params.set('organization_id', targetOrgId)
      }

      // Add pre-fetch filters (applied at IATI Datastore level for performance)
      if (selectedCountry) {
        params.set('country', selectedCountry)
      }
      if (dateFilterEnabled && dateRangeStart) {
        params.set('date_start', dateRangeStart)
      }
      if (dateFilterEnabled && dateRangeEnd) {
        params.set('date_end', dateRangeEnd)
      }
      if (selectedHierarchy != null) {
        params.set('hierarchy', selectedHierarchy.toString())
      }

      // Step 1: Quick count query to get estimated time
      const countParams = new URLSearchParams(params)
      countParams.set('count_only', 'true')
      const countUrl = `/api/iati/fetch-org-activities?${countParams.toString()}`

      try {
        const countResponse = await apiFetch(countUrl)
        if (countResponse.ok) {
          const countData = await countResponse.json()
          setEstimatedTime({ count: countData.count, seconds: countData.estimatedSeconds })
          // Start progress simulation with the actual estimated time
          startProgressSimulation(countData.estimatedSeconds)
        } else {
          // Count failed, start with default estimate
          startProgressSimulation()
        }
      } catch {
        // Count failed, start with default estimate
        startProgressSimulation()
      }

      // Step 2: Full fetch
      const url = `/api/iati/fetch-org-activities${params.toString() ? '?' + params.toString() : ''}`

      const response = await apiFetch(url)
      const data = await response.json()

      if (!response.ok) {
        stopProgressSimulation(false)
        setFetchStatus('error')
        setFetchError(data.error || 'Failed to fetch activities')
        return
      }

      stopProgressSimulation(true)

      const activities: ParsedActivity[] = data.activities || []
      setDatastoreActivities(activities)
      setDatastoreTotal(data.total || activities.length)
      setFetchedAt(data.fetchedAt || new Date().toISOString())
      setWasCached(data.cached || false)
      setFetchStatus('success')
      setOrgScopeData({
        reportingOrgRef: data.orgScope?.reportingOrgRef || '',
        organizationName: data.orgScope?.organizationName || '',
      })

      // Set default country filter to home country from system settings
      const defaultCountry = homeCountry || ''

      setSelectedCountry(defaultCountry)
      setSelectedHierarchy(null)

      // Filter activities by home country if applicable (using IATI geography rules)
      let filteredByCountry = activities
      if (defaultCountry) {
        const countryBounds = COUNTRY_BOUNDING_BOXES[defaultCountry]
        const alpha3Code = ALPHA2_TO_ALPHA3[defaultCountry] || defaultCountry

        const countryCodeMatches = (code: string | undefined): boolean => {
          if (!code) return false
          const upperCode = code.toUpperCase()
          return upperCode === defaultCountry.toUpperCase() || upperCode === alpha3Code.toUpperCase()
        }

        const coordsInCountry = (lat: number, lng: number): boolean => {
          if (!countryBounds) return false
          return lat >= countryBounds.minLat && lat <= countryBounds.maxLat &&
                 lng >= countryBounds.minLng && lng <= countryBounds.maxLng
        }

        const activityInCountryViaLocations = (a: ParsedActivity): boolean => {
          if (a.recipientCountries && a.recipientCountries.length > 0) return false
          if (!a.locations || a.locations.length === 0) return false
          const locationsWithCoords = a.locations.filter(l => l.coordinates)
          if (locationsWithCoords.length === 0) return false
          return locationsWithCoords.every(l =>
            l.coordinates && coordsInCountry(l.coordinates.latitude, l.coordinates.longitude)
          )
        }

        filteredByCountry = activities.filter((a: ParsedActivity) =>
          a.recipientCountries?.some(rc => countryCodeMatches(rc.code)) ||
          activityInCountryViaLocations(a)
        )
      }

      // Notify parent with filtered activities
      // For super users importing for another org, include the organizationId
      // targetOrgId is already defined above for the API request
      const meta: BulkImportMeta = {
        sourceMode: 'datastore',
        reportingOrgRef: data.orgScope?.reportingOrgRef || orgIatiId || '',
        reportingOrgName: data.orgScope?.organizationName || orgName,
        activityCount: filteredByCountry.length,
        fetchedAt: data.fetchedAt,
        organizationId: targetOrgId || data.orgScope?.organizationId,
      }
      onActivitiesReady(filteredByCountry, meta)
    } catch (err) {
      stopProgressSimulation(false)
      setFetchStatus('error')
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch activities')
    }
  }, [homeCountry, orgIatiId, orgName, onActivitiesReady, startProgressSimulation, stopProgressSimulation, selectedOrgId, isSuperUser, user?.organizationId, selectedCountry, selectedHierarchy, dateFilterEnabled, dateRangeStart, dateRangeEnd])

  // Note: Auto-fetch removed - user must click "Fetch Activities" button to start

  // --- Handle organization selection change (for super users) ---
  const handleOrgChange = useCallback((newOrgId: string) => {
    // If selecting own org (empty string), clear selectedOrgId
    const effectiveOrgId = newOrgId === user?.organizationId ? '' : newOrgId
    setSelectedOrgId(effectiveOrgId)

    // Clear current data - user must click Fetch button to load new org's activities
    setDatastoreActivities([])
    setFetchStatus('idle')
    fetchedRef.current = false
  }, [user?.organizationId])

  // --- Shared filter helper ---
  const applyFiltersAndNotify = useCallback((country: string, hierarchy: number | null, scope: 'all' | '100' | 'regional') => {
    let filtered = datastoreActivities

    if (country) {
      // IATI Geography Rules: match by recipient-country OR location coordinates
      const countryBounds = COUNTRY_BOUNDING_BOXES[country]
      const alpha3Code = ALPHA2_TO_ALPHA3[country] || country

      // Helper: check if a country code matches (handles alpha-2 and alpha-3)
      const countryCodeMatches = (code: string | undefined): boolean => {
        if (!code) return false
        const upperCode = code.toUpperCase()
        return upperCode === country.toUpperCase() || upperCode === alpha3Code.toUpperCase()
      }

      const coordsInCountry = (lat: number, lng: number): boolean => {
        if (!countryBounds) return false
        return lat >= countryBounds.minLat && lat <= countryBounds.maxLat &&
               lng >= countryBounds.minLng && lng <= countryBounds.maxLng
      }

      const activityInCountryViaLocations = (a: ParsedActivity): boolean => {
        if (a.recipientCountries && a.recipientCountries.length > 0) return false
        if (!a.locations || a.locations.length === 0) return false
        const locationsWithCoords = a.locations.filter(l => l.coordinates)
        if (locationsWithCoords.length === 0) return false
        return locationsWithCoords.every(l =>
          l.coordinates && coordsInCountry(l.coordinates.latitude, l.coordinates.longitude)
        )
      }

      // Filter by country (recipient-country OR location inference)
      filtered = filtered.filter(a => {
        // Condition A: Has recipient-country with selected code
        if (a.recipientCountries?.some(rc => countryCodeMatches(rc.code))) return true

        // Condition B: No recipient-country, but all locations in selected country
        return activityInCountryViaLocations(a)
      })

      // Apply country scope filter (100% vs regional)
      if (scope === '100') {
        filtered = filtered.filter(a => {
          const countryAlloc = a.recipientCountries?.find(rc => countryCodeMatches(rc.code))
          // Activities without recipient-country data were matched via locations - treat as 100%
          if (!a.recipientCountries || a.recipientCountries.length === 0) {
            return activityInCountryViaLocations(a)
          }
          const pct = countryAlloc?.percentage
          const is100 = pct !== undefined && pct !== null && Number(pct) >= 99.9
          const isSingleCountry = a.recipientCountries?.length === 1
          return countryAlloc && (is100 || (isSingleCountry && (pct == null || Number(pct) >= 99.9)))
        })
      } else if (scope === 'regional') {
        filtered = filtered.filter(a => {
          if (!a.recipientCountries || a.recipientCountries.length === 0) return false
          const countryAlloc = a.recipientCountries?.find(rc => countryCodeMatches(rc.code))
          const hasMultipleCountries = (a.recipientCountries?.length || 0) > 1
          return countryAlloc && (
            (countryAlloc.percentage != null && countryAlloc.percentage < 100) ||
            hasMultipleCountries
          )
        })
      }
    }

    if (hierarchy != null) {
      filtered = filtered.filter(a => a.hierarchy === hierarchy)
    }

    if (fetchStatus === 'success') {
      const meta: BulkImportMeta = {
        sourceMode: 'datastore',
        reportingOrgRef: orgScopeData?.reportingOrgRef || orgIatiId || '',
        reportingOrgName: orgScopeData?.organizationName || orgName,
        activityCount: filtered.length,
        fetchedAt: fetchedAt || undefined,
      }
      onActivitiesReady(filtered, meta)
    }
  }, [datastoreActivities, fetchStatus, orgScopeData, orgIatiId, orgName, fetchedAt, onActivitiesReady])

  // --- Country filter handler ---
  const handleCountryChange = useCallback((country: string) => {
    setSelectedCountry(country)
    // Reset country scope when clearing country filter
    const newScope = country ? countryScope : 'all'
    if (!country) {
      setCountryScope('all')
    }
    applyFiltersAndNotify(country, selectedHierarchy, newScope)
  }, [selectedHierarchy, countryScope, applyFiltersAndNotify])

  // --- Hierarchy filter handler ---
  const handleHierarchyChange = useCallback((hierarchy: number | null) => {
    setSelectedHierarchy(hierarchy)
    applyFiltersAndNotify(selectedCountry, hierarchy, countryScope)
  }, [selectedCountry, countryScope, applyFiltersAndNotify])

  // --- Country scope filter handler ---
  const handleCountryScopeChange = useCallback((scope: 'all' | '100' | 'regional') => {
    setCountryScope(scope)
    applyFiltersAndNotify(selectedCountry, selectedHierarchy, scope)
  }, [selectedCountry, selectedHierarchy, applyFiltersAndNotify])

  // --- XML mode handlers ---
  const handleXmlFileReady = useCallback((file: File, meta: BulkImportMeta) => {
    if (!file || !meta) {
      setXmlFile(null)
      setXmlMeta(null)
      setXmlParsedActivities([])
      setXmlValidated(false)
      return
    }
    // Ensure sourceMode is set
    const fullMeta: BulkImportMeta = { ...meta, sourceMode: 'xml_upload' }
    setXmlFile(file)
    setXmlMeta(fullMeta)
    setXmlParsedActivities([])
    setXmlValidated(false)
  }, [])

  const handleXmlValidationComplete = useCallback((activities: ParsedActivity[], allParsedData: any) => {
    setXmlParsedActivities(activities)
    setXmlValidated(true)

    if (xmlMeta) {
      const meta: BulkImportMeta = {
        ...xmlMeta,
        activityCount: activities.length,
      }
      onActivitiesReady(activities, meta)
    }
  }, [xmlMeta, onActivitiesReady])

  const formatTimestamp = (iso: string) => {
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  return (
    <div className="space-y-6">
      {/* Organisation Identity Banner */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              {isSuperUser ? (
                // Super user: show organization selector
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Importing for:</span>
                    <Badge variant="outline" className="text-xs text-white border-0" style={{ backgroundColor: '#DC2625' }}>
                      Super User
                    </Badge>
                  </div>
                  {loadingOrgs ? (
                    <div className="flex items-center gap-2 h-10 px-3 text-sm text-gray-500 border border-gray-200 rounded-md bg-gray-50">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading organizations...
                    </div>
                  ) : organizations.length === 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 h-10 px-3 text-sm text-amber-600 border border-amber-200 rounded-md bg-amber-50">
                        <AlertCircle className="h-4 w-4" />
                        Could not load organizations. Check console for details.
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOrgsFetched(false)
                          setLoadingOrgs(true)
                        }}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full max-w-lg">
                      <OrganizationCombobox
                        organizations={organizations}
                        value={selectedOrgId || user?.organizationId || ''}
                        onValueChange={handleOrgChange}
                        placeholder="Select organization to import..."
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {organizations.length} organization{organizations.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Regular user: show fixed organization info
                <>
                  <p className="font-semibold text-gray-900">{orgDisplayName}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500">
                    {orgIatiId && (
                      <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700">
                        {orgIatiId}
                      </span>
                    )}
                    {orgCountry && (
                      <>
                        {orgIatiId && <span className="text-gray-300">·</span>}
                        <span className="flex items-center gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://flagcdn.com/w20/${orgCountry.toLowerCase()}.png`}
                            alt=""
                            className="w-4 h-auto rounded-sm"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          {COUNTRY_COORDINATES[orgCountry]?.name || orgCountry}
                        </span>
                      </>
                    )}
                    {!orgIatiId && !orgCountry && (
                      <span className="text-amber-600">No IATI identifier configured</span>
                    )}
                  </div>
                </>
              )}
            </div>
            <Badge variant="outline" className="text-white border-0" style={{ backgroundColor: '#4C5568' }}>
              Logged in
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Source Mode Tabs */}
      <Tabs
        value={sourceMode}
        onValueChange={(v) => onSourceModeChange(v as ImportSourceMode)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="datastore" className="gap-2">
            <Globe className="h-4 w-4" />
            IATI Registry
          </TabsTrigger>
          <TabsTrigger value="xml_upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload XML
          </TabsTrigger>
        </TabsList>

        {/* --- DATASTORE MODE --- */}
        <TabsContent value="datastore" className="space-y-4 mt-4">
          {/* Idle state - show pre-fetch filters and Fetch button */}
          {fetchStatus === 'idle' && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-100 rounded-full">
                      <Globe className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        Fetch IATI Activities
                      </h3>
                      <p className="text-sm text-gray-500">
                        Configure filters below, then fetch from the IATI Registry
                      </p>
                    </div>
                  </div>

                  {/* Pre-fetch filters */}
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Pre-Fetch Filters
                      <span className="text-xs text-gray-400 font-normal">(applied at IATI Datastore for faster results)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Country filter */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600">Recipient Country</label>
                        <Popover open={countryOpen} onOpenChange={(open) => { setCountryOpen(open); if (!open) setCountrySearch('') }}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between font-normal h-9 text-sm">
                              {selectedCountry ? (
                                <span className="flex items-center gap-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`https://flagcdn.com/w40/${selectedCountry.toLowerCase()}.png`}
                                    alt=""
                                    className="w-4 h-auto rounded-sm"
                                  />
                                  <span>{COUNTRY_COORDINATES[selectedCountry]?.name || selectedCountry}</span>
                                </span>
                              ) : (
                                <span className="text-gray-400">All countries</span>
                              )}
                              <ChevronsUpDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0" align="start">
                            <div className="p-2 border-b">
                              <Input
                                placeholder="Search..."
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                className="h-8"
                                autoFocus
                              />
                            </div>
                            <ScrollArea className="h-48">
                              <div className="p-1">
                                <button
                                  onClick={() => { setSelectedCountry(''); setCountryOpen(false) }}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-gray-100"
                                >
                                  <span className="text-gray-400">All countries</span>
                                </button>
                                {searchedCountries.map((country) => (
                                  <button
                                    key={country.code}
                                    onClick={() => { setSelectedCountry(country.code); setCountryOpen(false); setCountrySearch('') }}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-gray-100 ${selectedCountry === country.code ? 'bg-gray-100' : ''}`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`} alt="" className="w-4 h-auto rounded-sm" />
                                    <span>{country.name}</span>
                                  </button>
                                ))}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Hierarchy filter */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600">Activity Level</label>
                        <select
                          value={selectedHierarchy ?? ''}
                          onChange={(e) => setSelectedHierarchy(e.target.value ? parseInt(e.target.value, 10) : null)}
                          className="w-full h-9 px-3 text-sm border rounded-md bg-white"
                        >
                          <option value="">All levels</option>
                          <option value="1">Level 1 (Parent)</option>
                          <option value="2">Level 2 (Sub-Activity)</option>
                        </select>
                      </div>

                      {/* Date range start */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={dateFilterEnabled}
                            onChange={(e) => setDateFilterEnabled(e.target.checked)}
                            className="h-3 w-3 rounded"
                          />
                          Date From
                        </label>
                        <Input
                          type="date"
                          value={dateRangeStart}
                          onChange={(e) => setDateRangeStart(e.target.value)}
                          disabled={!dateFilterEnabled}
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* Date range end */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-600">Date To</label>
                        <Input
                          type="date"
                          value={dateRangeEnd}
                          onChange={(e) => setDateRangeEnd(e.target.value)}
                          disabled={!dateFilterEnabled}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* Active filters summary */}
                    {(selectedCountry || selectedHierarchy != null || dateFilterEnabled) && (
                      <div className="text-xs text-gray-500 pt-2 border-t">
                        Fetching activities
                        {selectedCountry && <> in <strong>{COUNTRY_COORDINATES[selectedCountry]?.name || selectedCountry}</strong></>}
                        {selectedHierarchy != null && <> at <strong>Level {selectedHierarchy}</strong></>}
                        {dateFilterEnabled && <> from <strong>{dateRangeStart}</strong> to <strong>{dateRangeEnd}</strong></>}
                      </div>
                    )}
                  </div>

                  {/* Fetch button */}
                  <div className="flex justify-center">
                    <Button
                      onClick={() => fetchFromDatastore(false, selectedOrgId || undefined)}
                      className="bg-gray-900 hover:bg-gray-800 text-white px-8"
                      size="lg"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Fetch Activities from IATI Registry
                    </Button>
                  </div>

                  <p className="text-xs text-center text-gray-400">
                    Searching for activities published by <strong>{orgDisplayName}</strong>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {fetchStatus === 'fetching' && (
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col items-center gap-6">
                  <div className="text-center">
                    <p className="font-medium text-lg mb-1">
                      Fetching activities published by {orgName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {fetchPhase === 'connecting' && 'Connecting to IATI Registry...'}
                      {fetchPhase === 'fetching' && 'Downloading activity data from IATI Datastore...'}
                      {fetchPhase === 'enriching' && 'Enriching with sector percentages...'}
                      {fetchPhase === 'processing' && 'Processing and validating data...'}
                    </p>
                    {estimatedTime && (
                      <p className="text-sm text-gray-400 mt-2">
                        {estimatedTime.count.toLocaleString()} activities found — estimated time: ~{
                          estimatedTime.seconds < 60
                            ? `${estimatedTime.seconds} seconds`
                            : estimatedTime.seconds < 120
                              ? '1-2 minutes'
                              : `${Math.ceil(estimatedTime.seconds / 60)} minutes`
                        }
                      </p>
                    )}
                    {/* Elapsed timer */}
                    <p className="text-sm font-mono text-gray-500 mt-2 bg-gray-100 px-3 py-1 rounded-full inline-block">
                      {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')} elapsed
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full max-w-md">
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-out ${longFetchWarning ? 'bg-amber-500' : 'bg-gray-800'}`}
                        style={{ width: `${fetchProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>{Math.round(fetchProgress)}%</span>
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {fetchPhase === 'connecting' && 'Step 1 of 4'}
                        {fetchPhase === 'fetching' && 'Step 2 of 4'}
                        {fetchPhase === 'enriching' && 'Step 3 of 4'}
                        {fetchPhase === 'processing' && 'Step 4 of 4'}
                      </span>
                    </div>
                    {fetchProgressMessage && (
                      <p className="mt-2 text-xs text-amber-600 text-center">
                        {fetchProgressMessage}
                      </p>
                    )}
                  </div>

                  {/* Phase indicators */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`flex items-center gap-1 ${fetchPhase === 'connecting' ? 'text-gray-900 font-medium' : fetchProgress >= 5 ? 'text-green-600' : 'text-gray-400'}`}>
                      {fetchProgress >= 5 ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current inline-block" />}
                      Connecting
                    </div>
                    <div className="w-4 h-px bg-gray-300" />
                    <div className={`flex items-center gap-1 ${fetchPhase === 'fetching' ? 'text-gray-900 font-medium' : fetchProgress >= 80 ? 'text-green-600' : 'text-gray-400'}`}>
                      {fetchProgress >= 80 ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current inline-block" />}
                      Fetching
                    </div>
                    <div className="w-4 h-px bg-gray-300" />
                    <div className={`flex items-center gap-1 ${fetchPhase === 'enriching' ? 'text-gray-900 font-medium' : fetchProgress >= 95 ? 'text-green-600' : 'text-gray-400'}`}>
                      {fetchProgress >= 95 ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current inline-block" />}
                      Enriching
                    </div>
                    <div className="w-4 h-px bg-gray-300" />
                    <div className={`flex items-center gap-1 ${fetchPhase === 'processing' ? 'text-gray-900 font-medium' : fetchProgress >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
                      {fetchProgress >= 100 ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-current inline-block" />}
                      Processing
                    </div>
                  </div>

                  <LoadingTextRoller orgName={orgName} />
                </div>
              </CardContent>
            </Card>
          )}

          {fetchStatus === 'success' && (
            <>
              <Card className="border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <CheckCircle2 className="h-8 w-8 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        Found {datastoreTotal.toLocaleString()} activit{datastoreTotal === 1 ? 'y' : 'ies'} published by {orgDisplayName}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Database className="h-4 w-4" />
                          {datastoreActivities.filter((a) => a.matched).length} already in database
                        </div>
                        {fetchedAt && (
                          <div className="text-gray-400">
                            Fetched: {formatTimestamp(fetchedAt)}
                            {wasCached && ' (cached)'}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchFromDatastore(true)}
                      className="shrink-0"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Refresh
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              {datastoreActivities.length > 0 && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    {/* Filters row */}
                    <div className="flex items-start gap-8">
                      {/* Country filter */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Filter className="h-4 w-4" />
                          Recipient Country
                        </div>
                        <Popover open={countryOpen} onOpenChange={(open) => { setCountryOpen(open); if (!open) setCountrySearch('') }}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-72 justify-between font-normal h-10 pr-2">
                              {selectedCountry ? (
                                <span className="flex items-center gap-2 flex-1">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`https://flagcdn.com/w40/${selectedCountry.toLowerCase()}.png`}
                                    alt=""
                                    className="w-5 h-auto rounded-sm"
                                  />
                                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-600">
                                    {ALPHA2_TO_ALPHA3[selectedCountry] || selectedCountry}
                                  </span>
                                  <span>{COUNTRY_COORDINATES[selectedCountry]?.name || selectedCountry}</span>
                                </span>
                              ) : (
                                <span className="text-gray-500 flex-1 text-left">All countries</span>
                              )}
                              <div className="flex items-center gap-1 shrink-0">
                                {selectedCountry && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCountryChange('')
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded"
                                    title="Clear country filter"
                                  >
                                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                  </button>
                                )}
                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                              </div>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-0" align="start">
                            <div className="p-2 border-b">
                              <Input
                                placeholder="Search countries..."
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                className="h-8"
                                autoFocus
                              />
                            </div>
                            <ScrollArea className="h-64">
                              <div className="p-1">
                                {searchedCountries.map((country) => (
                                  <button
                                    key={country.code}
                                    onClick={() => {
                                      handleCountryChange(country.code)
                                      setCountryOpen(false)
                                      setCountrySearch('')
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded text-sm hover:bg-gray-100 transition-colors ${
                                      selectedCountry === country.code ? 'bg-gray-100' : ''
                                    }`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                                      alt=""
                                      className="w-5 h-auto rounded-sm shrink-0"
                                    />
                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-500 shrink-0">
                                      {ALPHA2_TO_ALPHA3[country.code] || country.code}
                                    </span>
                                    <span className="text-gray-900">{country.name}</span>
                                  </button>
                                ))}
                                {searchedCountries.length === 0 && (
                                  <p className="text-sm text-gray-400 text-center py-4">No countries found</p>
                                )}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Country scope filter - only show when country is selected */}
                      {selectedCountry && (
                        <div className="space-y-1.5">
                          <div className="text-sm font-medium text-gray-700">
                            Country Scope
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant={countryScope === 'all' ? 'default' : 'outline'}
                              size="sm"
                              className={countryScope === 'all' ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                              onClick={() => handleCountryScopeChange('all')}
                            >
                              All
                            </Button>
                            <Button
                              variant={countryScope === '100' ? 'default' : 'outline'}
                              size="sm"
                              className={countryScope === '100' ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                              onClick={() => handleCountryScopeChange('100')}
                            >
                              100% {COUNTRY_COORDINATES[selectedCountry]?.name || selectedCountry}
                            </Button>
                            <Button
                              variant={countryScope === 'regional' ? 'default' : 'outline'}
                              size="sm"
                              className={countryScope === 'regional' ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                              onClick={() => handleCountryScopeChange('regional')}
                            >
                              Regional
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Hierarchy filter */}
                      {availableHierarchies.length > 1 && (
                        <div className="space-y-1.5">
                          <div className="text-sm font-medium text-gray-700">
                            Activity Level
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant={selectedHierarchy == null ? 'default' : 'outline'}
                              size="sm"
                              className={selectedHierarchy == null ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                              onClick={() => handleHierarchyChange(null)}
                            >
                              All Levels
                            </Button>
                            {availableHierarchies.map((level) => (
                              <Button
                                key={level}
                                variant={selectedHierarchy === level ? 'default' : 'outline'}
                                size="sm"
                                className={selectedHierarchy === level ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                                onClick={() => handleHierarchyChange(level)}
                              >
                                {level === 1 ? 'Level 1 (Parent)' : level === 2 ? 'Level 2 (Sub-Activity)' : `Level ${level}`}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Date range filter */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="dateFilterEnabled"
                            checked={dateFilterEnabled}
                            onChange={(e) => setDateFilterEnabled(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label htmlFor="dateFilterEnabled" className="text-sm font-medium text-gray-700">
                            Date Range
                          </label>
                        </div>
                        {dateFilterEnabled && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              value={dateRangeStart}
                              onChange={(e) => setDateRangeStart(e.target.value)}
                              className="h-9 w-36 text-sm"
                            />
                            <span className="text-gray-400">to</span>
                            <Input
                              type="date"
                              value={dateRangeEnd}
                              onChange={(e) => setDateRangeEnd(e.target.value)}
                              className="h-9 w-36 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Filter summary */}
                    {(selectedCountry || selectedHierarchy != null || dateFilterEnabled) && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                        <div className="text-sm text-gray-500">
                          Showing <span className="font-semibold text-gray-700">{filteredActivities.length}</span> of {datastoreActivities.length.toLocaleString()} activities
                          {selectedCountry && (
                            <span>
                              {countryScope === '100' ? ' (100%)' : countryScope === 'regional' ? ' (regional)' : ''} in <span className="font-medium">{COUNTRY_COORDINATES[selectedCountry]?.name || selectedCountry}</span>
                            </span>
                          )}
                          {selectedHierarchy != null && (
                            <span> at Level {selectedHierarchy}</span>
                          )}
                          {dateFilterEnabled && (
                            <span> from {dateRangeStart} to {dateRangeEnd}</span>
                          )}
                          <span> with <span className="font-semibold text-gray-700">{filteredTotals.totalTransactions.toLocaleString()}</span> transactions</span>
                        </div>
                        {(selectedCountry || selectedHierarchy != null) && (
                          <button
                            onClick={() => {
                              setSelectedCountry('')
                              setSelectedHierarchy(null)
                              setCountryScope('all')
                              applyFiltersAndNotify('', null, 'all')
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600 underline"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    )}

                    {/* Level 2 + Country warning */}
                    {selectedHierarchy === 2 && selectedCountry && level2DiagnosticInfo && level2DiagnosticInfo.percentWithCountryData < 50 && filteredActivities.length > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          Note: Only {level2DiagnosticInfo.percentWithCountryData}% of Level 2 sub-activities have explicit country data. Others inherit from their parent.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {datastoreActivities.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No IATI activities were found for your organisation in the IATI Registry.
                    This may mean your organisation has not published IATI data yet.
                    You can try uploading an XML file instead.
                  </AlertDescription>
                </Alert>
              )}

              {(selectedCountry || selectedHierarchy != null) && filteredActivities.length === 0 && datastoreActivities.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No activities found
                    {selectedCountry && ` in ${COUNTRY_COORDINATES[selectedCountry]?.name || selectedCountry}`}
                    {selectedHierarchy != null && ` at Level ${selectedHierarchy}`}
                    . Try adjusting the filters or clear them to see all activities.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {fetchStatus === 'error' && (
            <Card className="border-red-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800">
                      Could not fetch IATI activities
                    </h3>
                    <p className="text-sm text-red-600 mt-1">
                      {fetchError}
                    </p>
                    {fetchError?.includes('no IATI identifiers') && (
                      <a
                        href={`/organizations/${user?.organizationId}/edit`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Configure IATI identifiers in organisation settings
                      </a>
                    )}
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchFromDatastore(true)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              {isSuperUser ? (
                <>
                  As a super user, you can fetch IATI activities for any organisation with an IATI identifier.
                  Select an organisation above and click <strong>Fetch Activities</strong> to search the IATI Registry.
                </>
              ) : (
                <>
                  Click <strong>Fetch Activities</strong> to search the IATI Registry for activities published by your organisation.
                  Only activities published by <strong>{orgName}</strong> will be shown.
                </>
              )}
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* --- XML UPLOAD MODE --- */}
        <TabsContent value="xml_upload" className="space-y-4 mt-4">
          {!xmlValidated ? (
            <>
              <BulkUploadStep
                onFileReady={handleXmlFileReady}
                currentFile={xmlFile}
                currentMeta={xmlMeta}
              />
              {xmlFile && xmlMeta && !xmlValidated && (
                <BulkValidationStep
                  file={xmlFile}
                  onValidationComplete={handleXmlValidationComplete}
                  parsedActivities={xmlParsedActivities}
                />
              )}
            </>
          ) : (
            <Card className="border-green-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-green-800">
                      Validated {xmlParsedActivities.length} activities from {xmlMeta?.fileName}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                      <div>
                        Valid: {xmlParsedActivities.filter((a) => !a.validationIssues?.some((i) => i.severity === 'error')).length}
                      </div>
                      <div>
                        Errors: {xmlParsedActivities.filter((a) => a.validationIssues?.some((i) => i.severity === 'error')).length}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setXmlFile(null)
                        setXmlMeta(null)
                        setXmlParsedActivities([])
                        setXmlValidated(false)
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 underline mt-2"
                    >
                      Choose a different file
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>
              Upload an IATI XML file as an alternative to the automatic registry fetch.
              Only activities published by your organisation ({orgName}) will be accepted.
              Activities from other organisations will be rejected.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}
