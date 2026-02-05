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
  FileText,
  Database,
  Building2,
  ExternalLink,
  Filter,
  ChevronsUpDown,
  X,
} from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'
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
import type {
  ImportSourceMode,
  BulkImportMeta,
  ParsedActivity,
} from './types'

function LoadingTextRoller({ orgName }: { orgName: string }) {
  const [index, setIndex] = useState(0)
  const messages = [
    'Connecting to IATI Registry...',
    `Querying activities for ${orgName}...`,
    'Downloading activity data...',
    'Mapping fields and metadata...',
    'Processing recipient countries...',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [messages.length])

  return (
    <div className="overflow-hidden h-6">
      <div
        className="transition-transform duration-700 ease-in-out"
        style={{ transform: `translateY(-${index * 1.5}rem)` }}
      >
        {messages.map((msg, i) => (
          <p
            key={i}
            className="h-6 flex items-center justify-center text-sm text-gray-500"
          >
            {msg}
          </p>
        ))}
      </div>
    </div>
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

  // --- Datastore mode state ---
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [datastoreActivities, setDatastoreActivities] = useState<ParsedActivity[]>([])
  const [datastoreTotal, setDatastoreTotal] = useState(0)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [wasCached, setWasCached] = useState(false)
  const fetchedRef = useRef(false)

  // --- Country filter state ---
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedHierarchy, setSelectedHierarchy] = useState<number | null>(null)
  const [orgScopeData, setOrgScopeData] = useState<{ reportingOrgRef: string; organizationName: string } | null>(null)
  const [countryOpen, setCountryOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  // --- XML mode state ---
  const [xmlFile, setXmlFile] = useState<File | null>(null)
  const [xmlMeta, setXmlMeta] = useState<BulkImportMeta | null>(null)
  const [xmlParsedActivities, setXmlParsedActivities] = useState<ParsedActivity[]>([])
  const [xmlValidated, setXmlValidated] = useState(false)

  const orgName = user?.organization?.name || user?.organisation || 'Your Organisation'
  const orgIatiId = user?.organization?.iati_org_id

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

  const filteredActivities = useMemo(() => {
    let result = datastoreActivities
    if (selectedCountry) {
      result = result.filter(a =>
        a.recipientCountries?.some(rc => rc.code === selectedCountry)
      )
    }
    if (selectedHierarchy != null) {
      result = result.filter(a => a.hierarchy === selectedHierarchy)
    }
    return result
  }, [datastoreActivities, selectedCountry, selectedHierarchy])

  const searchedCountries = useMemo(() => {
    if (!countrySearch) return availableCountries
    const term = countrySearch.toLowerCase()
    return availableCountries.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term) ||
      (ALPHA2_TO_ALPHA3[c.code] || '').toLowerCase().includes(term)
    )
  }, [availableCountries, countrySearch])

  // --- Datastore fetch ---
  const fetchFromDatastore = useCallback(async (forceRefresh = false) => {
    setFetchStatus('fetching')
    setFetchError(null)

    try {
      const url = forceRefresh
        ? '/api/iati/fetch-org-activities?force_refresh=true'
        : '/api/iati/fetch-org-activities'

      const response = await apiFetch(url)
      const data = await response.json()

      if (!response.ok) {
        setFetchStatus('error')
        setFetchError(data.error || 'Failed to fetch activities')
        return
      }

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

      // Reset filters on fresh fetch
      setSelectedCountry('')
      setSelectedHierarchy(null)

      // Notify parent with all activities (no filter on initial load)
      const meta: BulkImportMeta = {
        sourceMode: 'datastore',
        reportingOrgRef: data.orgScope?.reportingOrgRef || orgIatiId || '',
        reportingOrgName: data.orgScope?.organizationName || orgName,
        activityCount: activities.length,
        fetchedAt: data.fetchedAt,
      }
      onActivitiesReady(activities, meta)
    } catch (err) {
      setFetchStatus('error')
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch activities')
    }
  }, [orgIatiId, orgName, onActivitiesReady])

  // Auto-fetch on mount for datastore mode (only once)
  useEffect(() => {
    if (sourceMode === 'datastore' && !activitiesLoaded && !fetchedRef.current && fetchStatus === 'idle') {
      fetchedRef.current = true
      fetchFromDatastore()
    }
  }, [sourceMode, activitiesLoaded, fetchStatus, fetchFromDatastore])

  // --- Shared filter helper ---
  const applyFiltersAndNotify = useCallback((country: string, hierarchy: number | null) => {
    let filtered = datastoreActivities
    if (country) {
      filtered = filtered.filter(a => a.recipientCountries?.some(rc => rc.code === country))
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
    applyFiltersAndNotify(country, selectedHierarchy)
  }, [selectedHierarchy, applyFiltersAndNotify])

  // --- Hierarchy filter handler ---
  const handleHierarchyChange = useCallback((hierarchy: number | null) => {
    setSelectedHierarchy(hierarchy)
    applyFiltersAndNotify(selectedCountry, hierarchy)
  }, [selectedCountry, applyFiltersAndNotify])

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
            <div className="p-2 bg-gray-900 rounded-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{orgName}</p>
              {orgIatiId ? (
                <p className="text-sm text-gray-500">IATI Identifier: {orgIatiId}</p>
              ) : (
                <p className="text-sm text-amber-600">No IATI identifier configured</p>
              )}
            </div>
            <Badge variant="outline" className="bg-white text-gray-700 border-gray-300">
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
          {fetchStatus === 'fetching' && (
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-gray-900" />
                  <div className="text-center">
                    <p className="font-medium text-lg">
                      Fetching activities published by {orgName}
                    </p>
                    <LoadingTextRoller orgName={orgName} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {fetchStatus === 'success' && (
            <>
              <Card className="border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-green-800">
                        Found {datastoreTotal} activit{datastoreTotal === 1 ? 'y' : 'ies'} published by {orgName}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {datastoreActivities.length} loaded for review
                        </div>
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
                    {/* Country filter row */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 shrink-0 w-36">
                        <Filter className="h-4 w-4" />
                        Recipient country:
                      </div>
                      <div className="flex items-center gap-2">
                        <Popover open={countryOpen} onOpenChange={(open) => { setCountryOpen(open); if (!open) setCountrySearch('') }}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-80 justify-between font-normal h-10">
                              {selectedCountry ? (
                                <span className="flex items-center gap-2">
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
                                <span className="text-gray-500">All countries</span>
                              )}
                              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
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
                        {selectedCountry && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCountryChange('')}
                            title="Clear country filter"
                            className="shrink-0 h-10 w-10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Hierarchy filter row */}
                    {availableHierarchies.length > 1 && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 shrink-0 w-36">
                          Activity level:
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant={selectedHierarchy == null ? 'default' : 'outline'}
                            size="sm"
                            className={selectedHierarchy == null ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                            onClick={() => handleHierarchyChange(null)}
                          >
                            All levels
                          </Button>
                          {availableHierarchies.map((level) => (
                            <Button
                              key={level}
                              variant={selectedHierarchy === level ? 'default' : 'outline'}
                              size="sm"
                              className={selectedHierarchy === level ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                              onClick={() => handleHierarchyChange(level)}
                            >
                              {level === 1 ? 'Level 1 (Parent)' : level === 2 ? 'Level 2 (Sub-activity)' : `Level ${level}`}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Filter summary */}
                    {(selectedCountry || selectedHierarchy != null) && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                        <div className="text-sm text-gray-500">
                          Showing <span className="font-semibold text-gray-700">{filteredActivities.length}</span> of {datastoreActivities.length} activities
                          {selectedCountry && (
                            <span> in <span className="font-medium">{COUNTRY_COORDINATES[selectedCountry]?.name || selectedCountry}</span></span>
                          )}
                          {selectedHierarchy != null && (
                            <span> at level {selectedHierarchy}</span>
                          )}
                        </div>
                        {(selectedCountry || selectedHierarchy != null) && (
                          <button
                            onClick={() => {
                              setSelectedCountry('')
                              setSelectedHierarchy(null)
                              applyFiltersAndNotify('', null)
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600 underline"
                          >
                            Clear all filters
                          </button>
                        )}
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
                    {selectedCountry && ` with spend in ${COUNTRY_COORDINATES[selectedCountry]?.name || selectedCountry}`}
                    {selectedHierarchy != null && ` at hierarchy level ${selectedHierarchy}`}
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
              The system automatically fetches your organisation&apos;s IATI activities from the
              IATI Registry. Only activities published by <strong>{orgName}</strong> are shown.
              You cannot browse or import data from other organisations.
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
