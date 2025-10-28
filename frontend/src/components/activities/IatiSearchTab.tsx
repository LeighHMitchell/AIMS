"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useUser } from "@/hooks/useUser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Search, Loader2, AlertCircle, Calendar, DollarSign, CheckCircle2, ArrowLeft, FileText, Check, ChevronsUpDown, Copy, Network, PieChart, MapPinned, Building2 } from "lucide-react"
import { countries } from "@/data/countries"
import { CountryCombobox } from "@/components/ui/country-combobox"
import { toast } from "sonner"
import { IATIXMLParser } from "@/lib/xml-parser"
import { cn } from "@/lib/utils"
import { ExternalPublisherModal } from "@/components/import/ExternalPublisherModal"
import { getActivityStatusByCode } from "@/data/activity-status-types"
import { getOrganizationRoleName, IATI_ORGANIZATION_ROLES } from "@/data/iati-organization-roles"

interface IatiSearchTabProps {
  activityId: string
}

interface SearchFilters {
  reportingOrgRef: string
  recipientCountry: string
  activityTitle: string
}

interface IatiActivity {
  iatiIdentifier: string
  title: string
  description?: string
  reportingOrg?: string
  reportingOrgRef?: string
  status?: string
  statusNarrative?: string
  startDatePlanned?: string
  endDatePlanned?: string
  startDateActual?: string
  endDateActual?: string
  totalBudget?: number
  currency?: string
  participatingOrgs?: Array<{ name: string; role?: string; ref?: string }>
  sectors?: string[]
  recipientCountries?: string[]
  activityScope?: string
  collaborationType?: string
  aidType?: string
  aidTypeName?: string
  financeType?: string
  financeTypeName?: string
  flowType?: string
  flowTypeName?: string
  tiedStatus?: string
  tiedStatusName?: string
  hierarchy?: string
  hierarchyName?: string
}

export default function IatiSearchTab({ activityId }: IatiSearchTabProps) {
  const { user } = useUser()
  
  // Deduplicate countries to avoid key conflicts
  const uniqueCountries = React.useMemo(() => {
    const seen = new Set<string>()
    return countries.filter(country => {
      if (seen.has(country.code)) {
        return false
      }
      seen.add(country.code)
      return true
    })
  }, [])
  
  // State management
  const [filters, setFilters] = useState<SearchFilters>({
    reportingOrgRef: "",
    recipientCountry: "",
    activityTitle: ""
  })
  
  const [searchResults, setSearchResults] = useState<IatiActivity[]>([])
  const [selectedActivity, setSelectedActivity] = useState<IatiActivity | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isFetchingXml, setIsFetchingXml] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [userOrgIatiId, setUserOrgIatiId] = useState<string>("")
  const [fetchedXml, setFetchedXml] = useState<string | null>(null)
  const [showImportView, setShowImportView] = useState(false)
  
  // Organization search state
  const [orgSearch, setOrgSearch] = useState("")
  const [orgSuggestions, setOrgSuggestions] = useState<Array<{ ref: string, count: number }>>([])
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false)
  const [orgPopoverOpen, setOrgPopoverOpen] = useState(false)
  
  // External publisher modal state
  const [showExternalPublisherModal, setShowExternalPublisherModal] = useState(false)
  const [externalPublisherMeta, setExternalPublisherMeta] = useState<any>(null)
  const [existingActivity, setExistingActivity] = useState<any>(null)
  const [parsedFields, setParsedFields] = useState<any[]>([])
  const [importedXml, setImportedXml] = useState<string>("")

  // Organization details modal state
  const [showOrgDetailsModal, setShowOrgDetailsModal] = useState(false)
  const [selectedActivityForModal, setSelectedActivityForModal] = useState<IatiActivity | null>(null)
  
  // Fetch user's organization IATI ID
  useEffect(() => {
    const fetchUserOrgIatiId = async () => {
      if (!user?.organizationId) return
      
      try {
        const response = await fetch(`/api/organizations/${user.organizationId}`)
        if (response.ok) {
          const org = await response.json()
          if (org.iati_identifier) {
            setUserOrgIatiId(org.iati_identifier)
            setFilters(prev => ({ ...prev, reportingOrgRef: org.iati_identifier }))
          }
        }
      } catch (error) {
        console.error("Failed to fetch organization IATI ID:", error)
      }
    }
    
    fetchUserOrgIatiId()
  }, [user?.organizationId])
  
  // Reset search when popover closes
  useEffect(() => {
    if (!orgPopoverOpen) {
      setOrgSearch("")
      setOrgSuggestions([])
    }
  }, [orgPopoverOpen])
  
  // Debounced organization search from IATI Datastore
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      console.log("[IATI Org Search Frontend] Search term:", orgSearch, "Length:", orgSearch.trim().length)
      
      if (orgSearch.trim().length < 2) {
        setOrgSuggestions([])
        return
      }
      
      setIsLoadingOrgs(true)
      console.log("[IATI Org Search Frontend] Fetching organizations for:", orgSearch)
      
      try {
        const url = `/api/iati/organizations?q=${encodeURIComponent(orgSearch)}`
        console.log("[IATI Org Search Frontend] API URL:", url)
        
        const response = await fetch(url)
        console.log("[IATI Org Search Frontend] Response status:", response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log("[IATI Org Search Frontend] Got data:", data)
          setOrgSuggestions(data.organizations || [])
        } else {
          console.error("[IATI Org Search Frontend] API returned error:", response.status, response.statusText)
          setOrgSuggestions([])
        }
      } catch (error) {
        console.error("[IATI Org Search Frontend] Error fetching organizations:", error)
        setOrgSuggestions([])
      } finally {
        setIsLoadingOrgs(false)
      }
    }, 500) // 500ms debounce
    
    return () => clearTimeout(delayDebounce)
  }, [orgSearch])
  
  // Debounced search function
  const handleSearch = useCallback(async () => {
    console.log("[IATI Search Frontend] Starting search with filters:", filters)

    if (!filters.activityTitle.trim()) {
      toast.error("Please enter an activity title to search")
      return
    }
    
    setIsSearching(true)
    setSearchError(null)
    setSearchResults([])
    
    try {
      console.log("[IATI Search Frontend] Making API call to /api/iati/search")
      const response = await fetch("/api/iati/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportingOrgRef: filters.reportingOrgRef,
          recipientCountry: filters.recipientCountry,
          activityTitle: filters.activityTitle,
          limit: 20
        })
      })

      console.log("[IATI Search Frontend] API response status:", response.status)
      
      if (!response.ok) {
        const error = await response.json()
        console.error("[IATI Search Frontend] API error response:", error)
        throw new Error(error.error || "Search failed")
      }
      
      const data = await response.json()
      console.log("[IATI Search Frontend] API response data:", data)

      if (data.error) {
        throw new Error(data.error)
      }

      setSearchResults(data.results || [])
      console.log("[IATI Search Frontend] Set search results:", data.results?.length || 0, "activities")

      if (data.results && data.results.length === 0) {
        toast.info(data.note || "No activities found matching your search criteria")
      } else if (data.results && data.results.length > 0) {
        toast.success(`Found ${data.results.length} matching activities`)
      }
    } catch (error) {
      console.error("[IATI Search Frontend] Search error:", error)
      const message = error instanceof Error ? error.message : "Failed to search IATI Datastore"
      setSearchError(message)
      toast.error(message)
    } finally {
      setIsSearching(false)
    }
  }, [filters])
  
  // Handle activity selection and XML fetch with import flow
  const handleSelectActivity = async (activity: IatiActivity) => {
    setSelectedActivity(activity)
    setIsFetchingXml(true)
    
    try {
      const response = await fetch(`/api/iati/activity/${encodeURIComponent(activity.iatiIdentifier)}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch activity XML")
      }
      
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }
      
      if (!data.xml) {
        throw new Error("No XML data received from IATI Datastore")
      }
      
      console.log("[IATI Search] Fetched XML for:", activity.iatiIdentifier)
      setImportedXml(data.xml)
      
      // Parse the XML
      let parsed, meta;
      try {
        const parser = new IATIXMLParser(data.xml)
        parsed = parser.parseActivity()
        console.log("[IATI Search] Parsed activity:", parsed.title)

        // Extract metadata directly from parsed data
        meta = {
          iatiId: parsed.iatiIdentifier || activity.iatiIdentifier,
          reportingOrgRef: parsed.reportingOrg?.ref || '',
          reportingOrgName: parsed.reportingOrg?.narrative || '',
          lastUpdated: new Date().toISOString(),
          linkedDataUri: parsed.linkedDataUri || ''
        }
        console.log("[IATI Search] Extracted metadata:", meta)
        setParsedFields([]) // Will be populated when user chooses to import
      } catch (parseError) {
        console.error("[IATI Search] Parse error:", parseError)
        throw new Error(`Failed to parse activity XML: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`)
      }
      
      // Get user's publisher refs
      const userPublisherRefs: string[] = []
      if (user?.organizationId) {
        try {
          const orgResponse = await fetch(`/api/organizations/${user.organizationId}`)
          if (orgResponse.ok) {
            const org = await orgResponse.json()
            if (org.iati_identifier) {
              userPublisherRefs.push(org.iati_identifier)
            }
            if (org.iati_org_id) {
              userPublisherRefs.push(org.iati_org_id)
            }
          }
        } catch (err) {
          console.error("[IATI Search] Error fetching user org:", err)
        }
      }
      
      // Check if this is an external publisher
      const isOwnedActivity = meta.reportingOrgRef && userPublisherRefs.some(ref => 
        ref && meta.reportingOrgRef && ref.toLowerCase() === meta.reportingOrgRef.toLowerCase()
      )
      
      if (!isOwnedActivity) {
        console.log("[IATI Search] External publisher detected!")
        
        // Check if this IATI ID already exists in the database
        let existingAct = null
        if (meta.iatiId) {
          try {
            const searchResponse = await fetch(`/api/activities/search?iatiId=${encodeURIComponent(meta.iatiId)}`)
            if (searchResponse.ok) {
              const searchData = await searchResponse.json()
              if (searchData.activities && searchData.activities.length > 0) {
                existingAct = searchData.activities[0]
              }
            }
          } catch (err) {
            console.error("[IATI Search] Error checking for existing activity:", err)
          }
        }
        
        // Set up modal data
        setExternalPublisherMeta(meta)
        setExistingActivity(existingAct)
        setShowExternalPublisherModal(true)
        
        toast.info('External publisher detected', {
          description: `This activity is reported by ${meta.reportingOrgName || meta.reportingOrgRef}. Choose how to handle it.`
        })
      } else {
        // Activity is owned by user - store XML and show import view
        console.log("[IATI Search] Activity is owned by user, proceeding with import")
      setFetchedXml(data.xml)
      setShowImportView(true)
        toast.success('Activity loaded successfully!')
      }
      
    } catch (error) {
      console.error("[IATI Search] Fetch error:", error)
      const message = error instanceof Error ? error.message : "Failed to fetch activity data"
      toast.error(message)
    } finally {
      setIsFetchingXml(false)
    }
  }
  
  // Handle external publisher choice
  const handleExternalPublisherChoice = async (choice: 'reference' | 'fork' | 'merge') => {
    console.log("[IATI Search] User chose:", choice)
    console.log("[IATI Search] ImportedXml available:", !!importedXml, "Length:", importedXml?.length || 0)
    console.log("[IATI Search] External publisher meta:", externalPublisherMeta)
    
    setShowExternalPublisherModal(false)
    
    if (choice === 'reference') {
      // Just save as a reference without importing fields
      try {
        const response = await fetch(`/api/activities/${activityId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            iati_identifier: externalPublisherMeta.iatiId,
            external_reference: true
          })
        })
        
        if (response.ok) {
          toast.success('External activity referenced successfully')
        }
      } catch (error) {
        toast.error('Failed to save reference')
      }
    } else if (choice === 'fork' || choice === 'merge') {
      // Both fork and merge go to XML Import tab, but merge will auto-parse
      // Check if we have the XML
      if (!importedXml) {
        console.error('[IATI Search] No imported XML available!')
        toast.error('No XML data available. Please try selecting the activity again.')
        return
      }
      
      const actionText = choice === 'fork' ? 'Forking' : 'Merging'
      console.log('[IATI Search] Proceeding with', actionText, 'XML length:', importedXml.length)
      
      // Store XML data for the XML Import tab using localStorage (persists across page reloads)
      localStorage.setItem('iati_import_xml', importedXml)
      localStorage.setItem('iati_import_source', 'iati-datastore')
      localStorage.setItem('iati_import_choice', choice)
      localStorage.setItem('iati_import_activity_id', activityId)
      localStorage.setItem('iati_import_timestamp', Date.now().toString())
      
      console.log('[IATI Search] localStorage items set:', {
        xml_length: localStorage.getItem('iati_import_xml')?.length,
        source: localStorage.getItem('iati_import_source'),
        choice: localStorage.getItem('iati_import_choice'),
        timestamp: localStorage.getItem('iati_import_timestamp')
      })
      
      // Use URL parameter to switch to XML Import tab
      console.log('[IATI Search] Switching to XML Import tab via URL parameter')
      const url = new URL(window.location.href)
      url.searchParams.set('section', 'xml-import')
      
      // Need to use location.replace to ensure component remounts and detects localStorage
      console.log('[IATI Search] Navigating to:', url.toString())
      window.location.replace(url.toString())
    }
  }
  
  // Handle back to search
  const handleBackToSearch = () => {
    setShowImportView(false)
    setFetchedXml(null)
    setSelectedActivity(null)
  }
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A"
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return dateStr
    }
  }
  
  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return "N/A"
    const curr = currency || "USD"
    return `${curr} ${amount.toLocaleString()}`
  }
  
  // If showing import view, render the XML import interface
  if (showImportView && fetchedXml) {
    return (
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToSearch}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Import from IATI</h2>
            {selectedActivity && (
              <p className="text-sm text-gray-600 mt-1">
                {selectedActivity.title}
              </p>
            )}
          </div>
        </div>
        
        {/* Import interface - reuse XmlImportTab with pre-loaded XML */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Activity data loaded from IATI Datastore. Select the fields you want to import below.
          </AlertDescription>
        </Alert>
        
        {/* Note: XmlImportTab will need to accept XML content directly */}
        {/* For now, we'll show the user to use XML Import tab with the fetched data */}
        <Card>
          <CardHeader>
            <CardTitle>Import Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              The activity XML has been successfully fetched from the IATI Datastore.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                To import this activity:
              </p>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Copy the XML content below</li>
                <li>Navigate to the "XML Import" tab</li>
                <li>Select "XML Snippet" as the import method</li>
                <li>Paste the XML and proceed with field selection</li>
              </ol>
            </div>
            <div className="mt-4">
              <Label>Activity XML</Label>
              <div className="relative">
                <textarea
                  readOnly
                  value={fetchedXml}
                  className="w-full h-64 p-3 border rounded-md font-mono text-xs bg-gray-50"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    navigator.clipboard.writeText(fetchedXml)
                    toast.success("XML copied to clipboard")
                  }}
                >
                  Copy XML
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">IATI Search</h2>
        <p className="text-sm text-gray-600 mt-1">
          Search the IATI Datastore for activities by title and import their data into your activity.
        </p>
      </div>
      
      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong> Enter filters and an activity title to search the IATI Datastore. 
          The search uses fuzzy matching, so you don't need to enter the exact title.
          {!userOrgIatiId && (
            <span className="block mt-2 text-amber-600">
              <strong>Note:</strong> Your organization doesn't have an IATI identifier set. 
              You can still search, but filtering by reporting organization may be less accurate.
            </span>
          )}
        </AlertDescription>
      </Alert>
      
      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
          <CardDescription>
            Filter activities by reporting organization and country, then search by activity title
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reporting Organization and Country - on same row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reporting Organization */}
            <div className="space-y-2">
              <Label htmlFor="reporting-org">Reporting Organization (IATI Identifier)</Label>
              <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
                <PopoverTrigger className="w-full">
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={orgPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">{filters.reportingOrgRef || "Search organizations..."}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <div className="flex flex-col">
                    {/* Search Input */}
                    <div className="p-3 border-b">
              <Input
                        placeholder="Type USAID, US-GOV-1, etc..."
                        value={orgSearch}
                        onChange={(e) => {
                          console.log("[IATI Org Search Frontend] Search input changed to:", e.target.value)
                          setOrgSearch(e.target.value)
                        }}
                        autoFocus
                        className="h-9"
                      />
                    </div>
                    
                    {/* Results */}
                    <div className="max-h-[300px] overflow-y-auto">
                      {isLoadingOrgs && (
                        <div className="p-4 text-sm text-center text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                          Searching IATI Datastore...
                        </div>
                      )}
                      
                      {!isLoadingOrgs && orgSuggestions.length === 0 && orgSearch.length >= 2 && (
                        <div className="p-4 text-sm text-center text-gray-500">
                          No organizations found. Try different search terms.
                        </div>
                      )}
                      
                      {!isLoadingOrgs && orgSuggestions.length === 0 && orgSearch.length < 2 && (
                        <div className="p-4 text-sm text-center text-gray-500">
                          Type at least 2 characters to search
                        </div>
                      )}
                      
                      {!isLoadingOrgs && orgSuggestions.length > 0 && (
                        <div className="py-1">
                          {orgSuggestions.map((org) => (
                            <div
                              key={org.ref}
                              onClick={() => {
                                setFilters({ ...filters, reportingOrgRef: org.ref })
                                setOrgPopoverOpen(false)
                              }}
                              className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <Check 
                                className={cn(
                                  "mr-2 h-4 w-4 flex-shrink-0", 
                                  filters.reportingOrgRef === org.ref ? "opacity-100" : "opacity-0"
                                )} 
                              />
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="font-mono text-sm truncate">{org.ref}</span>
                                <span className="text-xs text-gray-500">{org.count.toLocaleString()} activities</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
                <p className="text-xs text-gray-500">
                Search by organization name (e.g., USAID) or IATI identifier (e.g., US-GOV-1)
                </p>
            </div>
            
            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Recipient Country (Optional)</Label>
              <CountryCombobox
                countries={uniqueCountries}
                value={filters.recipientCountry}
                  onValueChange={(value) => setFilters({ ...filters, recipientCountry: value })}
                placeholder="All Countries"
                allowClear={true}
              />
            </div>
          </div>
          
          {/* Activity Title Search - Full Width */}
          <div className="space-y-2">
            <Label htmlFor="activity-title">Activity Title or IATI Identifier</Label>
            <div className="relative">
              <Input
                id="activity-title"
                placeholder="e.g., Technical Assistance on Social Protection or AU-5-INM438"
                value={filters.activityTitle}
                onChange={(e) => {
                  console.log("[IATI Search Frontend] Activity title changed to:", e.target.value)
                  setFilters({ ...filters, activityTitle: e.target.value })
                }}
                onKeyDown={(e) => {
                  console.log("[IATI Search Frontend] Enter key pressed, calling handleSearch")
                  if (e.key === "Enter" && !isSearching) {
                    handleSearch()
                  }
                }}
                className="w-full pr-20"
              />
              <Button 
                onClick={() => {
                  console.log("[IATI Search Frontend] Search button clicked")
                  handleSearch()
                }}
                disabled={isSearching || !filters.activityTitle.trim()}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8"
                size="sm"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2">Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span className="ml-2">Search</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Search Error */}
      {searchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{searchError}</AlertDescription>
        </Alert>
      )}
      
      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({searchResults.length})</CardTitle>
            <CardDescription>
              Click on an activity to view details and import its data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.map((activity, index) => (
                <div
                  key={`${activity.iatiIdentifier}-${index}`}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={() => handleSelectActivity(activity)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                      {activity.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-4">
                          {activity.description}
                        </p>
                      )}
                      
                      {/* Primary metadata row */}
                      <div className="flex flex-wrap gap-4 mt-3 text-xs">
                        {activity.reportingOrg && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Building2 className="h-3 w-3" />
                            <span className="font-medium">{activity.reportingOrg}</span>
                          </div>
                        )}
                        {activity.status && (() => {
                          const statusInfo = getActivityStatusByCode(activity.status)
                          const displayName = activity.statusNarrative || statusInfo?.name || 'Unknown Status'
                          return (
                            <div className="flex items-center gap-1 text-gray-600">
                            <CheckCircle2 className="h-3 w-3" />
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700">
                                {activity.status}
                              </span>
                              <span>{displayName}</span>
                          </div>
                          )
                        })()}
                        {(activity.startDatePlanned || activity.startDateActual) && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatDate(activity.startDateActual || activity.startDatePlanned)}
                              {" - "}
                              {formatDate(activity.endDateActual || activity.endDatePlanned)}
                            </span>
                          </div>
                        )}
                        {activity.totalBudget && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-medium">Total Budget: {formatCurrency(activity.totalBudget, activity.currency)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Additional details */}
                      <div className="mt-2 space-y-1 text-xs">
                        {activity.recipientCountries && activity.recipientCountries.length > 0 && (
                          <div className="flex items-start gap-1 text-gray-500">
                            <MapPinned className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="flex-1">{activity.recipientCountries.join(', ')}</span>
                          </div>
                        )}
                        {activity.sectors && activity.sectors.length > 0 && (
                          <div className="flex items-start gap-1 text-gray-500">
                            <PieChart className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="flex-1 line-clamp-1">{activity.sectors.slice(0, 3).join(', ')}{activity.sectors.length > 3 ? ` +${activity.sectors.length - 3} more` : ''}</span>
                          </div>
                        )}
                        {activity.participatingOrgs && activity.participatingOrgs.length > 0 && (() => {
                          // Group organizations by role
                          const roleGroups: Record<string, Array<{ name: string; ref?: string }>> = {}
                          activity.participatingOrgs.forEach(org => {
                            if (org.role) {
                              if (!roleGroups[org.role]) {
                                roleGroups[org.role] = []
                              }
                              roleGroups[org.role].push({ name: org.name, ref: org.ref })
                            }
                          })

                          return (
                            <div
                              className="flex items-start gap-1 text-gray-500"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Network className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <div className="flex flex-col gap-1 flex-1">
                                {Object.entries(roleGroups)
                                  .filter(([_, orgs]) => orgs.length > 0) // Only show roles that have organizations
                                  .map(([roleCode, orgs]) => {
                                  const roleName = getOrganizationRoleName(roleCode)
                                  const roleDescription = (() => {
                                    const role = IATI_ORGANIZATION_ROLES.find(r => r.code === roleCode)
                                    return role?.description || ''
                                  })()

                                  return (
                                    <div
                                      key={roleCode}
                                      className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedActivityForModal(activity)
                                        setShowOrgDetailsModal(true)
                                      }}
                                      title={`${roleName}: ${roleDescription}`}
                                    >
                                      <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-xs font-mono font-medium min-w-fit">
                                        {roleCode} {roleName}
                                      </span>
                                      <span className="text-xs text-gray-600">
                                        {orgs.slice(0, 3).map((org, index) => (
                                          <span key={index} className="mr-2">
                                            {org.name}
                                          </span>
                                        ))}
                                        {orgs.length > 3 && (
                                          <span className="text-gray-400">
                                            +{orgs.length - 3} more
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })()}
                        {/* IATI Classification Fields */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          {activity.collaborationType && (
                            <span className="inline-flex items-center gap-1">
                              <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-xs font-mono">
                                {activity.collaborationType}
                              </span>
                              <span className="text-gray-600">Collaboration</span>
                            </span>
                          )}
                          {activity.aidType && (
                            <span className="inline-flex items-center gap-1">
                              <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-xs font-mono">
                                {activity.aidType}
                              </span>
                              <span className="text-gray-600">{activity.aidTypeName || 'Aid Type'}</span>
                            </span>
                          )}
                          {activity.financeType && (
                            <span className="inline-flex items-center gap-1">
                              <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-xs font-mono">
                                {activity.financeType}
                              </span>
                              <span className="text-gray-600">{activity.financeTypeName || 'Finance Type'}</span>
                            </span>
                          )}
                          {activity.flowType && (
                            <span className="inline-flex items-center gap-1">
                              <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-xs font-mono">
                                {activity.flowType}
                              </span>
                              <span className="text-gray-600">{activity.flowTypeName || 'Flow Type'}</span>
                            </span>
                          )}
                          {activity.tiedStatus && (
                            <span className="inline-flex items-center gap-1">
                              <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-xs font-mono">
                                {activity.tiedStatus}
                              </span>
                              <span className="text-gray-600">{activity.tiedStatusName || 'Tied Status'}</span>
                            </span>
                          )}
                          {activity.hierarchy && (
                            <span className="inline-flex items-center gap-1">
                              <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-xs font-mono">
                                {activity.hierarchy}
                              </span>
                              <span className="text-gray-600">{activity.hierarchyName || 'Hierarchy'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Button size="sm" variant="outline">
                        Select
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-700">
                      {activity.iatiIdentifier}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(activity.iatiIdentifier)
                        toast.success("IATI ID copied to clipboard")
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Copy IATI ID"
                    >
                      <Copy className="h-3 w-3 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Loading state when fetching XML */}
      {isFetchingXml && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Fetching activity data from IATI Datastore...
          </AlertDescription>
        </Alert>
      )}
      
      {/* Empty State */}
      {!isSearching && searchResults.length === 0 && !searchError && (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center text-gray-500">
              <Search className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-lg font-medium">No search results yet</p>
              <p className="text-sm mt-1 mb-4">
                Enter an activity title or IATI identifier and click Search to find activities in the IATI Datastore
              </p>
              <div className="max-w-md mx-auto text-left bg-gray-50 rounded-lg p-4 mt-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Search Tips:</p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Search by activity title (e.g., "Technical Assistance on Social Protection")</li>
                  <li>Search by IATI identifier (e.g., "AU-5-INM438")</li>
                  <li>The system automatically detects IATI IDs and searches exactly</li>
                  <li>Click on role names (e.g., "4 Implementing") to see full organization details</li>
                  <li>Add country filter to narrow results</li>
                  <li>If no results, try different keywords or check the IATI identifier format</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* External Publisher Modal */}
      {showExternalPublisherModal && externalPublisherMeta && (
        <ExternalPublisherModal
          isOpen={showExternalPublisherModal}
          onClose={() => setShowExternalPublisherModal(false)}
          meta={externalPublisherMeta}
          userOrgName={user?.organization?.name || user?.organisation || ""}
          userPublisherRefs={[userOrgIatiId].filter(Boolean)}
          onChoose={handleExternalPublisherChoice}
          currentActivityId={activityId}
          currentActivityIatiId={undefined}
          existingActivity={existingActivity}
        />
      )}

      {/* Organization Details Modal */}
      <Dialog open={showOrgDetailsModal} onOpenChange={setShowOrgDetailsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Organizations by Role</DialogTitle>
            <DialogDescription>
              All organizations grouped by their IATI role types with descriptions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              if (!selectedActivityForModal || !selectedActivityForModal.participatingOrgs) return null

              // Group organizations by role
              const roleGroups: Record<string, Array<{ name: string; ref?: string }>> = {}
              const unassignedOrgs: Array<{ name: string; ref?: string }> = []

              selectedActivityForModal.participatingOrgs.forEach(org => {
                if (org.role) {
                  if (!roleGroups[org.role]) {
                    roleGroups[org.role] = []
                  }
                  roleGroups[org.role].push({ name: org.name, ref: org.ref })
                } else {
                  unassignedOrgs.push({ name: org.name, ref: org.ref })
                }
              })

              const allGroups = [
                ...Object.entries(roleGroups).map(([roleCode, orgs]) => ({
                  roleCode,
                  roleName: getOrganizationRoleName(roleCode),
                  roleDescription: (() => {
                    const role = IATI_ORGANIZATION_ROLES.find(r => r.code === roleCode)
                    return role?.description || ''
                  })(),
                  orgs
                })),
                ...(unassignedOrgs.length > 0 ? [{
                  roleCode: 'unknown',
                  roleName: 'Other',
                  roleDescription: 'Organizations without assigned roles',
                  orgs: unassignedOrgs
                }] : [])
              ]

              return allGroups.map((group) => (
                <div key={group.roleCode} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm font-medium">
                        <span className="bg-gray-200 text-gray-600 px-1 py-0.5 rounded text-xs font-mono">
                          {group.roleCode}
                        </span>
                        <span>{group.roleName}</span>
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        {group.orgs.map((org, index) => (
                          <span key={index} className="mr-3 font-medium text-gray-900">
                            {org.name}
                            {org.ref && (
                              <span className="text-xs text-gray-500 font-mono ml-1">
                                ({org.ref})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">{group.roleDescription}</p>
                    </div>
                  </div>
                </div>
              ))
            })()}

            {/* IATI Classification Details */}
            {selectedActivityForModal && (selectedActivityForModal.collaborationType || selectedActivityForModal.aidType || selectedActivityForModal.financeType || selectedActivityForModal.flowType || selectedActivityForModal.tiedStatus || selectedActivityForModal.hierarchy) && (
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">IATI Classification</h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {selectedActivityForModal.collaborationType && (
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs font-mono min-w-fit">
                        {selectedActivityForModal.collaborationType}
                      </span>
                      <span className="text-gray-600">Collaboration Type</span>
                    </div>
                  )}
                  {selectedActivityForModal.aidType && (
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs font-mono min-w-fit">
                        {selectedActivityForModal.aidType}
                      </span>
                      <span className="text-gray-600">{selectedActivityForModal.aidTypeName || 'Aid Type'}</span>
                    </div>
                  )}
                  {selectedActivityForModal.financeType && (
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs font-mono min-w-fit">
                        {selectedActivityForModal.financeType}
                      </span>
                      <span className="text-gray-600">{selectedActivityForModal.financeTypeName || 'Finance Type'}</span>
                    </div>
                  )}
                  {selectedActivityForModal.flowType && (
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs font-mono min-w-fit">
                        {selectedActivityForModal.flowType}
                      </span>
                      <span className="text-gray-600">{selectedActivityForModal.flowTypeName || 'Flow Type'}</span>
                    </div>
                  )}
                  {selectedActivityForModal.tiedStatus && (
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs font-mono min-w-fit">
                        {selectedActivityForModal.tiedStatus}
                      </span>
                      <span className="text-gray-600">{selectedActivityForModal.tiedStatusName || 'Tied Status'}</span>
                    </div>
                  )}
                  {selectedActivityForModal.hierarchy && (
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs font-mono min-w-fit">
                        {selectedActivityForModal.hierarchy}
                      </span>
                      <span className="text-gray-600">{selectedActivityForModal.hierarchyName || 'Hierarchy'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}