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
import { USER_ROLES, ROLE_LABELS } from '@/types/user'
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
import { DatePicker } from '@/components/ui/date-picker'
import { format, parseISO } from 'date-fns'
import type {
  ImportSourceMode,
  BulkImportMeta,
  ParsedActivity,
} from './types'

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
  const abortControllerRef = useRef<AbortController | null>(null)

  // --- Progress tracking state ---
  const [fetchProgress, setFetchProgress] = useState(0)
  const [fetchPhase, setFetchPhase] = useState<'connecting' | 'fetching' | 'enriching' | 'processing'>('connecting')
  const [fetchProgressMessage, setFetchProgressMessage] = useState<string | null>(null)
  const [longFetchWarning, setLongFetchWarning] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState<{ count: number; seconds: number } | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [fetchDuration, setFetchDuration] = useState<number | null>(null) // Final duration in seconds
  const fetchStartTimeRef = useRef<number>(0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const estimatedSecondsRef = useRef<number>(65) // Default estimate, updated by count query

  // --- Country filter state ---
  // Default to system home country (set via useEffect when settings load)
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [countryInitialized, setCountryInitialized] = useState(false)
  const [selectedHierarchy, setSelectedHierarchy] = useState<number | null>(null)
  // Country filter mode: where to look for country code
  // - 'both': Activity-level OR transaction-level recipient country (default - most comprehensive)
  // - 'activity': Only activity-level recipient_country_code
  // - 'transaction': Only transaction-level recipient_country_code
  const [countryFilterMode, setCountryFilterMode] = useState<'both' | 'activity' | 'transaction'>('both')
  const [orgScopeData, setOrgScopeData] = useState<{ reportingOrgRef: string; organizationName: string } | null>(null)

  // --- Date filter state ---
  // Default: last 5 years to present + 2 years future (for planned dates)
  const currentYear = new Date().getFullYear()
  const [dateRangeStart, setDateRangeStart] = useState<string>(`${currentYear - 5}-01-01`)
  const [dateRangeEnd, setDateRangeEnd] = useState<string>(`${currentYear + 2}-12-31`)
  const [dateFilterEnabled, setDateFilterEnabled] = useState<boolean>(false)
  const [countryOpen, setCountryOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  // --- Preview count state (shows expected results before fetch) ---
  const [previewCount, setPreviewCount] = useState<{ activities: number; loading: boolean } | null>(null)
  const previewCountTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  const filteredActivities = useMemo(() => {
    // NOTE: Country filtering is NOT done here because it's already applied at the API level
    // (via Solr query with countryFilterMode support for activity/transaction/both).
    // Re-filtering here would incorrectly remove activities that have the country
    // at transaction level only.
    let result = datastoreActivities

    // Hierarchy filter - can be applied locally since it's simple
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
  }, [datastoreActivities, selectedHierarchy, dateFilterEnabled, dateRangeStart, dateRangeEnd])

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

    // Start elapsed time counter (update every 100ms for smooth milliseconds display)
    elapsedIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - fetchStartTimeRef.current) / 100) / 10
      setElapsedSeconds(elapsed)
    }, 100)

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
    // Record final duration before clearing
    if (success && fetchStartTimeRef.current > 0) {
      const duration = (Date.now() - fetchStartTimeRef.current) / 1000
      setFetchDuration(Math.round(duration * 10) / 10) // Round to 1 decimal
    }
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

  // Initialize country filter from system settings
  useEffect(() => {
    if (!countryInitialized && homeCountry && !settingsLoading) {
      setSelectedCountry(homeCountry)
      setCountryInitialized(true)
    }
  }, [homeCountry, settingsLoading, countryInitialized])

  // Cancel fetch function
  const cancelFetch = useCallback(() => {
    // Abort any in-progress fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    // Stop progress simulation
    stopProgressSimulation(false)
    // Reset to idle state
    setFetchStatus('idle')
    setFetchError(null)
    setEstimatedTime(null)
    setFetchProgress(0)
    setElapsedSeconds(0)
    setLongFetchWarning(false)
    setFetchProgressMessage(null)
    toast.info('Fetch cancelled')
  }, [stopProgressSimulation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current)
      }
      if (previewCountTimeoutRef.current) {
        clearTimeout(previewCountTimeoutRef.current)
      }
      // Abort any in-progress fetch on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Fetch preview count when filters change (debounced)
  useEffect(() => {
    // Only fetch preview when in idle state and we have an org configured
    if (fetchStatus !== 'idle') return
    if (!orgIatiId && !selectedOrgId) return

    // Clear previous timeout
    if (previewCountTimeoutRef.current) {
      clearTimeout(previewCountTimeoutRef.current)
    }

    // Set loading state
    setPreviewCount({ activities: 0, loading: true })

    // Debounce the API call
    previewCountTimeoutRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        params.set('count_only', 'true')

        // Add org for super users
        if (selectedOrgId && isSuperUser && selectedOrgId !== user?.organizationId) {
          params.set('organization_id', selectedOrgId)
        }

        // Add filters
        if (selectedCountry) {
          params.set('country', selectedCountry)
          params.set('country_filter_mode', countryFilterMode)
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

        const response = await apiFetch(`/api/iati/fetch-org-activities?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setPreviewCount({ activities: data.count || 0, loading: false })
        } else {
          setPreviewCount(null)
        }
      } catch {
        setPreviewCount(null)
      }
    }, 500) // 500ms debounce
  }, [fetchStatus, orgIatiId, selectedOrgId, selectedCountry, countryFilterMode, selectedHierarchy, dateFilterEnabled, dateRangeStart, dateRangeEnd, isSuperUser, user?.organizationId])

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
    // Create new abort controller for this fetch
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

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
        params.set('country_filter_mode', countryFilterMode)
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
        const countResponse = await apiFetch(countUrl, { signal })
        if (countResponse.ok) {
          const countData = await countResponse.json()
          setEstimatedTime({ count: countData.count, seconds: countData.estimatedSeconds })
          // Start progress simulation with the actual estimated time
          startProgressSimulation(countData.estimatedSeconds)
        } else {
          // Count failed, start with default estimate
          startProgressSimulation()
        }
      } catch (countErr) {
        // Check if aborted
        if (signal.aborted) throw countErr
        // Count failed, start with default estimate
        startProgressSimulation()
      }

      // Check if aborted before starting main fetch
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      // Step 2: Full fetch
      const url = `/api/iati/fetch-org-activities${params.toString() ? '?' + params.toString() : ''}`

      const response = await apiFetch(url, { signal })
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

      // Country/hierarchy filters are already applied at the API level (Solr query),
      // so we don't need to re-filter here. Just pass activities through.
      // The selectedCountry/selectedHierarchy state is used for the UI display.
      setSelectedCountry(selectedCountry || homeCountry || '')
      setSelectedHierarchy(selectedHierarchy)

      // Notify parent with fetched activities (already filtered by API)
      // For super users importing for another org, include the organizationId
      // targetOrgId is already defined above for the API request
      const meta: BulkImportMeta = {
        sourceMode: 'datastore',
        reportingOrgRef: data.orgScope?.reportingOrgRef || orgIatiId || '',
        reportingOrgName: data.orgScope?.organizationName || orgName,
        activityCount: activities.length,
        fetchedAt: data.fetchedAt,
        organizationId: targetOrgId || data.orgScope?.organizationId,
      }
      onActivitiesReady(activities, meta)
    } catch (err) {
      // Don't show error if the fetch was cancelled
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Already handled by cancelFetch
        return
      }
      stopProgressSimulation(false)
      setFetchStatus('error')
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch activities')
    } finally {
      abortControllerRef.current = null
    }
  }, [homeCountry, orgIatiId, orgName, onActivitiesReady, startProgressSimulation, stopProgressSimulation, selectedOrgId, isSuperUser, user?.organizationId, selectedCountry, countryFilterMode, selectedHierarchy, dateFilterEnabled, dateRangeStart, dateRangeEnd])

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
                            className="w-4 h-auto rounded-[2px]"
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
                  <div className="border rounded-lg p-4 bg-white space-y-4">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Pre-Fetch Filters
                    </div>

                    <div className="space-y-3">
                      {/* Country filter - one line */}
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-gray-700 w-36 shrink-0">
                          Recipient Country
                        </div>
                        <Popover open={countryOpen} onOpenChange={(open) => { setCountryOpen(open); if (!open) setCountrySearch('') }}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-56 justify-between font-normal h-9 pr-2">
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
                                      setSelectedCountry('')
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
                          <PopoverContent className="w-56 p-0" align="start">
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
                                <button
                                  onClick={() => { setSelectedCountry(''); setCountryOpen(false); setCountrySearch('') }}
                                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded text-sm hover:bg-gray-100 transition-colors"
                                >
                                  <span className="text-gray-400">All countries</span>
                                </button>
                                {searchedCountries.map((country) => (
                                  <button
                                    key={country.code}
                                    onClick={() => { setSelectedCountry(country.code); setCountryOpen(false); setCountrySearch('') }}
                                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded text-sm hover:bg-gray-100 transition-colors ${selectedCountry === country.code ? 'bg-gray-100' : ''}`}
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

                      {/* Country filter mode - only show when a country is selected */}
                      {selectedCountry && (
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium text-gray-700 w-36 shrink-0">
                            Include
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant={countryFilterMode === 'both' ? 'default' : 'outline'}
                              size="sm"
                              className={countryFilterMode === 'both' ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                              onClick={() => setCountryFilterMode('both')}
                              title="Activities where the country appears at activity-level OR transaction-level"
                            >
                              All
                            </Button>
                            <Button
                              variant={countryFilterMode === 'activity' ? 'default' : 'outline'}
                              size="sm"
                              className={countryFilterMode === 'activity' ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                              onClick={() => setCountryFilterMode('activity')}
                              title="Only activities with recipient-country at the activity level"
                            >
                              Activity-Level Only
                            </Button>
                            <Button
                              variant={countryFilterMode === 'transaction' ? 'default' : 'outline'}
                              size="sm"
                              className={countryFilterMode === 'transaction' ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                              onClick={() => setCountryFilterMode('transaction')}
                              title="Only activities with recipient-country at the transaction level"
                            >
                              Transaction-Level Only
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Hierarchy filter - one line */}
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-gray-700 w-36 shrink-0">
                          Level
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant={selectedHierarchy == null ? 'default' : 'outline'}
                            size="sm"
                            className={selectedHierarchy == null ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                            onClick={() => setSelectedHierarchy(null)}
                          >
                            All Levels
                          </Button>
                          <Button
                            variant={selectedHierarchy === 1 ? 'default' : 'outline'}
                            size="sm"
                            className={selectedHierarchy === 1 ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                            onClick={() => setSelectedHierarchy(1)}
                          >
                            Level 1 (Parent)
                          </Button>
                          <Button
                            variant={selectedHierarchy === 2 ? 'default' : 'outline'}
                            size="sm"
                            className={selectedHierarchy === 2 ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                            onClick={() => setSelectedHierarchy(2)}
                          >
                            Level 2 (Sub-Activity)
                          </Button>
                        </div>
                      </div>

                      {/* Date range filter - one line */}
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-gray-700 w-36 shrink-0">
                          Date Range
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={!dateFilterEnabled ? 'default' : 'outline'}
                            size="sm"
                            className={!dateFilterEnabled ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                            onClick={() => setDateFilterEnabled(false)}
                          >
                            All
                          </Button>
                          <DatePicker
                            value={dateRangeStart}
                            onChange={(value) => { setDateRangeStart(value); setDateFilterEnabled(true) }}
                            disabled={!dateFilterEnabled}
                            placeholder="Start"
                            className={`h-9 w-32 text-sm ${!dateFilterEnabled ? 'opacity-50' : ''}`}
                          />
                          <span className={`text-gray-400 ${!dateFilterEnabled ? 'opacity-50' : ''}`}>to</span>
                          <DatePicker
                            value={dateRangeEnd}
                            onChange={(value) => { setDateRangeEnd(value); setDateFilterEnabled(true) }}
                            disabled={!dateFilterEnabled}
                            placeholder="End"
                            className={`h-9 w-32 text-sm ${!dateFilterEnabled ? 'opacity-50' : ''}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preview count */}
                    {previewCount && (
                      <div className="text-sm text-gray-600 pt-3 border-t flex items-center gap-2">
                        {previewCount.loading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                            <span className="text-gray-400">Checking IATI Registry...</span>
                          </>
                        ) : (
                          <>
                            <Database className="h-3.5 w-3.5 text-gray-400" />
                            <span>
                              Expected: <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">{previewCount.activities.toLocaleString()}</span> activities
                            </span>
                          </>
                        )}
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
                    <p className="text-sm text-gray-500 mt-2">
                      {Math.floor(elapsedSeconds / 60)}:{Math.floor(elapsedSeconds % 60).toString().padStart(2, '0')}.{Math.floor((elapsedSeconds % 1) * 10)} elapsed
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

                  {/* Info message */}
                  <div className="mt-6 p-4 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 max-w-md text-center">
                    <p className="font-medium">You can navigate away from this screen</p>
                    <p className="text-gray-500 mt-1">
                      Just don't close this browser tab. Come back when you're ready — the fetch will continue in the background.
                    </p>
                  </div>

                  {/* Cancel button */}
                  <Button
                    variant="outline"
                    onClick={cancelFetch}
                    className="mt-4"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
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
                        Found <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">{filteredActivities.length.toLocaleString()}</span> activit{filteredActivities.length === 1 ? 'y' : 'ies'} with <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">{filteredTotals.totalTransactions.toLocaleString()}</span> transactions published by {orgDisplayName}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Database className="h-4 w-4" />
                          <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">{datastoreActivities.filter((a) => a.matched).length}</span> already in database
                        </div>
                        {fetchedAt && (
                          <div className="text-gray-400">
                            Fetched: {formatTimestamp(fetchedAt)}
                            {fetchDuration != null && !wasCached && (
                              <span className="ml-1">
                                ({fetchDuration < 60
                                  ? `${fetchDuration}s`
                                  : `${Math.floor(fetchDuration / 60)}m ${Math.round(fetchDuration % 60)}s`})
                              </span>
                            )}
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
                <span className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs text-white border-0" style={{ backgroundColor: '#DC2625' }}>
                    {ROLE_LABELS[user?.role as keyof typeof ROLE_LABELS] || 'Super User'}
                  </Badge>
                  You can fetch IATI activities for any organisation with an IATI identifier.
                  Select an organisation above and click <strong>Fetch Activities</strong> to search the IATI Registry.
                </span>
              ) : (
                <span className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-xs text-white border-0"
                    style={{
                      backgroundColor: user?.role?.includes('gov_') ? '#059669' :
                                       user?.role?.includes('dev_') ? '#2563EB' :
                                       user?.role === 'public_user' ? '#6B7280' : '#4B5563'
                    }}
                  >
                    {ROLE_LABELS[user?.role as keyof typeof ROLE_LABELS] || user?.role || 'User'}
                  </Badge>
                  Click <strong>Fetch Activities</strong> to search the IATI Registry for activities published by your organisation.
                  Only activities published by <strong>{orgName}</strong> will be shown.
                </span>
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
