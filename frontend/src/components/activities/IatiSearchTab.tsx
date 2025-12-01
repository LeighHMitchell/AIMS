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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SafeHtml } from "@/components/ui/safe-html"
import { htmlToPlainText } from "@/lib/sanitize"
import { Search, Loader2, AlertCircle, Calendar, DollarSign, CheckCircle2, ArrowLeft, FileText, Check, ChevronsUpDown, Copy, Network, PieChart, MapPinned, Building2, ChevronDown, ChevronUp, ExternalLink, DownloadCloud } from "lucide-react"
import { countries } from "@/data/countries"
import { CountryCombobox } from "@/components/ui/country-combobox"
import { toast } from "sonner"
import { IATIXMLParser } from "@/lib/xml-parser"
import { cn } from "@/lib/utils"
import { ExternalPublisherModal } from "@/components/import/ExternalPublisherModal"
import { getActivityStatusByCode } from "@/data/activity-status-types"
import { getOrganizationRoleName, IATI_ORGANIZATION_ROLES } from "@/data/iati-organization-roles"
import { getCurrencyByCode } from "@/data/currencies"
import { normaliseOrgRef, isValidIatiRef, getOrgRefDisplay } from "@/lib/org-ref-normalizer"
import aidTypesData from "@/data/aid-types.json"
import flowTypesData from "@/data/flow-types.json"
import financeTypesData from "@/data/finance-types.json"
import { devLog, devError, prodError } from "@/lib/debug"

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
  
  // Track which activities are expanded
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set())

  // Track which activity descriptions are expanded (show full text)
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  
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
        prodError("Failed to fetch organization IATI ID:", error)
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
      devLog("[IATI Org Search Frontend] Search term:", orgSearch, "Length:", orgSearch.trim().length)
      
      if (orgSearch.trim().length < 2) {
        setOrgSuggestions([])
        return
      }
      
      setIsLoadingOrgs(true)
      devLog("[IATI Org Search Frontend] Fetching organizations for:", orgSearch)
      
      try {
        const url = `/api/iati/organizations?q=${encodeURIComponent(orgSearch)}`
        devLog("[IATI Org Search Frontend] API URL:", url)
        
        const response = await fetch(url)
        devLog("[IATI Org Search Frontend] Response status:", response.status)
        
        if (response.ok) {
          const data = await response.json()
          devLog("[IATI Org Search Frontend] Got data:", data)
          setOrgSuggestions(data.organizations || [])
        } else {
          prodError("[IATI Org Search Frontend] API returned error:", response.status, response.statusText)
          setOrgSuggestions([])
        }
      } catch (error) {
        prodError("[IATI Org Search Frontend] Error fetching organizations:", error)
        setOrgSuggestions([])
      } finally {
        setIsLoadingOrgs(false)
      }
    }, 500) // 500ms debounce
    
    return () => clearTimeout(delayDebounce)
  }, [orgSearch])
  
  // Debounced search function
  const handleSearch = useCallback(async () => {
    devLog("[IATI Search Frontend] Starting search with filters:", filters)

    if (!filters.activityTitle.trim()) {
      toast.error("Please enter an activity title to search")
      return
    }
    
    setIsSearching(true)
    setSearchError(null)
    setSearchResults([])
    
    try {
      devLog("[IATI Search Frontend] Making API call to /api/iati/search")
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

      devLog("[IATI Search Frontend] API response status:", response.status)
      
      if (!response.ok) {
        const error = await response.json()
        prodError("[IATI Search Frontend] API error response:", error)
        throw new Error(error.error || "Search failed")
      }
      
      const data = await response.json()
      devLog("[IATI Search Frontend] API response data:", data)

      if (data.error) {
        throw new Error(data.error)
      }

      setSearchResults(data.results || [])
      devLog("[IATI Search Frontend] Set search results:", data.results?.length || 0, "activities")

      if (data.results && data.results.length === 0) {
        toast.info(data.note || "No activities found matching your search criteria")
      } else if (data.results && data.results.length > 0) {
        toast.success(`Found ${data.results.length} matching activities`)
      }
    } catch (error) {
      prodError("[IATI Search Frontend] Search error:", error)
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
        let errorMessage = 'Failed to fetch activity XML';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (parseError) {
          // Response isn't JSON, try text
          try {
            const text = await response.text();
            errorMessage = text || `Server error: ${response.status} ${response.statusText}`;
          } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }
      
      if (!data.xml) {
        throw new Error("No XML data received from IATI Datastore")
      }
      
      devLog("[IATI Search] Fetched XML for:", activity.iatiIdentifier)
      setImportedXml(data.xml)
      
      // Parse the XML
      let parsed, meta;
      try {
        const parser = new IATIXMLParser(data.xml)
        parsed = parser.parseActivity()
        devLog("[IATI Search] Parsed activity:", parsed.title)

        // Extract metadata directly from parsed data
        meta = {
          iatiId: parsed.iatiIdentifier || activity.iatiIdentifier,
          reportingOrgRef: parsed.reportingOrg?.ref || '',
          reportingOrgName: parsed.reportingOrg?.narrative || '',
          lastUpdated: new Date().toISOString(),
          linkedDataUri: parsed.linkedDataUri || ''
        }
        devLog("[IATI Search] Extracted metadata:", meta)
        setParsedFields([]) // Will be populated when user chooses to import
      } catch (parseError) {
        prodError("[IATI Search] Parse error:", parseError)
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
          prodError("[IATI Search] Error fetching user org:", err)
        }
      }
      
      // Check if this is an external publisher
      const isOwnedActivity = meta.reportingOrgRef && userPublisherRefs.some(ref => 
        ref && meta.reportingOrgRef && ref.toLowerCase() === meta.reportingOrgRef.toLowerCase()
      )
      
      if (!isOwnedActivity) {
        devLog("[IATI Search] External publisher detected!")
        
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
            prodError("[IATI Search] Error checking for existing activity:", err)
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
        devLog("[IATI Search] Activity is owned by user, proceeding with import")
      setFetchedXml(data.xml)
      setShowImportView(true)
        toast.success('Activity loaded successfully!')
      }
      
    } catch (error) {
      prodError("[IATI Search] Fetch error:", error)
      const message = error instanceof Error ? error.message : "Failed to fetch activity data"
      toast.error(message)
    } finally {
      setIsFetchingXml(false)
    }
  }
  
  // Handle external publisher choice
  const handleExternalPublisherChoice = async (choice: 'reference' | 'fork' | 'merge') => {
    devLog("[IATI Search] User chose:", choice)
    devLog("[IATI Search] ImportedXml available:", !!importedXml, "Length:", importedXml?.length || 0)
    devLog("[IATI Search] External publisher meta:", externalPublisherMeta)
    
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
      // Both fork and merge go to IATI Import tab, but merge will auto-parse
      // Check if we have the XML
      if (!importedXml) {
        prodError('[IATI Search] No imported XML available!')
        toast.error('No XML data available. Please try selecting the activity again.')
        return
      }
      
      const actionText = choice === 'fork' ? 'Forking' : 'Merging'
      devLog('[IATI Search] Proceeding with', actionText, 'XML length:', importedXml.length)
      
      // Store XML data for the IATI Import tab using localStorage (persists across page reloads)
      localStorage.setItem('iati_import_xml', importedXml)
      localStorage.setItem('iati_import_source', 'iati-datastore')
      localStorage.setItem('iati_import_choice', choice)
      localStorage.setItem('iati_import_activity_id', activityId)
      localStorage.setItem('iati_import_timestamp', Date.now().toString())
      
      devLog('[IATI Search] localStorage items set:', {
        xml_length: localStorage.getItem('iati_import_xml')?.length,
        source: localStorage.getItem('iati_import_source'),
        choice: localStorage.getItem('iati_import_choice'),
        timestamp: localStorage.getItem('iati_import_timestamp')
      })
      
      // Use URL parameter to switch to IATI Import tab
      devLog('[IATI Search] Switching to IATI Import tab via URL parameter')
      const url = new URL(window.location.href)
      url.searchParams.set('section', 'xml-import')
      
      // Need to use location.replace to ensure component remounts and detects localStorage
      devLog('[IATI Search] Navigating to:', url.toString())
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
    const curr = currency && /^[A-Z]{3}$/.test(currency) ? currency : "USD"
    
    // Format number with commas
    const formattedValue = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
    
    // Return JSX with grey, smaller currency code
    return (
      <>
        <span className="text-xs text-muted-foreground">{curr}</span> {formattedValue}
      </>
    )
  }

  // Helper to format code with name: code in monospace gray, name normal
  // If name contains code at start (e.g., "110 Standard grant"), extract just the name part
  const formatCodeWithName = (code?: string, name?: string) => {
    if (!code) return null
    if (!name || name === code) {
      return (
        <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
          {code}
        </code>
      )
    }
    
    // Check if name starts with the code followed by a space
    const nameTrimmed = name.trim()
    const codeWithSpace = `${code} `
    let displayName = nameTrimmed
    
    if (nameTrimmed.startsWith(codeWithSpace)) {
      // Extract name part after code (e.g., "110 Standard grant" -> "Standard grant")
      displayName = nameTrimmed.substring(codeWithSpace.length).trim()
    }
    
    return (
      <span className="inline-flex items-center gap-1">
        <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
          {code}
        </code>
        {displayName && displayName !== code && (
          <span className="text-slate-900">{displayName}</span>
        )}
      </span>
    )
  }

  // Get country name from code
  const getCountryName = (code?: string) => {
    if (!code) return null
    const country = countries.find(c => c.code === code)
    return country?.name || code
  }

  // Helper to find aid type name from JSON structure
  const getAidTypeName = (code?: string): string | null => {
    if (!code) return null
    // Remove 'C' prefix if present (e.g., 'CC01' -> 'C01')
    const normalizedCode = code.startsWith('CC') ? code.substring(1) : code
    
    const findInTree = (items: any[]): any | undefined => {
      for (const item of items) {
        if (item.code === normalizedCode) return item
        if (item.children) {
          const found = findInTree(item.children)
          if (found) return found
        }
      }
      return undefined
    }
    
    const aidType = findInTree(aidTypesData as any[])
    return aidType?.name || null
  }
  
  const toggleExpand = (iatiId: string) => {
    setExpandedActivities(prev => {
      const newSet = new Set(prev)
      if (newSet.has(iatiId)) {
        newSet.delete(iatiId)
      } else {
        newSet.add(iatiId)
      }
      return newSet
    })
  }

  const isExpanded = (iatiId: string) => expandedActivities.has(iatiId)

  const toggleDescriptionExpand = (iatiId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(iatiId)) {
        newSet.delete(iatiId)
      } else {
        newSet.add(iatiId)
      }
      return newSet
    })
  }

  const isDescriptionExpanded = (iatiId: string) => expandedDescriptions.has(iatiId)
  
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
        
        {/* Note: IatiImportTab will need to accept XML content directly */}
        {/* For now, we'll show the user to use IATI Import tab with the fetched data */}
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
                <li>Navigate to the "IATI Import" tab</li>
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
                <PopoverTrigger asChild className="w-full">
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
                          devLog("[IATI Org Search Frontend] Search input changed to:", e.target.value)
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
                  devLog("[IATI Search Frontend] Activity title changed to:", e.target.value)
                  setFilters({ ...filters, activityTitle: e.target.value })
                }}
                onKeyDown={(e) => {
                  devLog("[IATI Search Frontend] Enter key pressed, calling handleSearch")
                  if (e.key === "Enter" && !isSearching) {
                    handleSearch()
                  }
                }}
                className="w-full pr-20"
              />
              <Button 
                onClick={() => {
                  devLog("[IATI Search Frontend] Search button clicked")
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
              {searchResults.map((activity, index) => {
                const expanded = isExpanded(activity.iatiIdentifier)
                const statusInfo = activity.status ? getActivityStatusByCode(activity.status) : null
                const statusDisplay = activity.statusNarrative || statusInfo?.name || 'Unknown Status'
                
                // Get Funding and Implementing orgs
                // IATI Roles: 1=Funding, 2=Accountable, 3=Extending, 4=Implementing
                const fundingOrgs = activity.participatingOrgs?.filter(org => org.role === '1') || []
                const implementingOrgs = activity.participatingOrgs?.filter(org => org.role === '4') || []
                
                return (
                  <div
                    key={`${activity.iatiIdentifier}-${index}`}
                    className="rounded-lg border border-gray-400 bg-white hover:border-gray-500 transition-colors shadow-sm"
                  >
                    {/* Collapsed View */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Title and Import Button Row */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 text-lg leading-tight">{activity.title}</h3>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectActivity(activity)
                              }}
                              className="shrink-0"
                            >
                              <DownloadCloud className="h-4 w-4 mr-2" />
                              Import
                            </Button>
                          </div>
                          
                          {/* Essential Info Grid - 3 Columns */}
                          <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-xs" data-layout="three-column-updated-v2">
                            {/* Column 1: Reported by, Implementing Org, and IATI ID */}
                            <div className="col-span-1 space-y-3">
                              <div>
                                <span className="text-slate-600 font-medium">IATI ID:</span>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                    {activity.iatiIdentifier}
                                  </code>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigator.clipboard.writeText(activity.iatiIdentifier)
                                      toast.success("IATI ID copied to clipboard")
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                                    title="Copy IATI ID"
                                  >
                                    <Copy className="h-3 w-3 text-slate-500" />
                                  </button>
                                </div>
                              </div>
                              {activity.reportingOrg && (
                                <div>
                                  <span className="text-slate-600 font-medium">Reported by:</span>
                                  <div className="mt-0.5">
                                    <div className="text-slate-900">{activity.reportingOrg}</div>
                                    {activity.reportingOrgRef && (
                                      <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 mt-0.5 block">
                                        {activity.reportingOrgRef}
                                      </code>
                                    )}
                                  </div>
                                </div>
                              )}
                              {implementingOrgs.length > 0 && (
                                <div>
                                  <span className="text-slate-600 font-medium">Implementing Org:</span>
                                  <div className="mt-0.5">
                                    {implementingOrgs[0] && (
                                      <>
                                        <div className="text-slate-900">{implementingOrgs[0].name}</div>
                                        {implementingOrgs[0].ref && (
                                          <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 mt-0.5 block">
                                            {implementingOrgs[0].ref}
                                          </code>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Column 2: Total Value */}
                            <div className="col-span-1">
                              {activity.totalBudget ? (
                                <>
                                  <span className="text-slate-600 font-medium">Total Value:</span>
                                  <div className="mt-0.5 text-slate-900 font-medium">
                                    {formatCurrency(activity.totalBudget, activity.currency)}
                                  </div>
                                </>
                              ) : null}
                            </div>

                            {/* Column 3: Empty for now, other fields will flow here */}
                            <div className="col-span-1">
                            </div>
                            
                            {/* Funding Org */}
                            {fundingOrgs.length > 0 && (
                              <div className="col-span-1">
                                <span className="text-slate-600 font-medium">Funding Org:</span>
                                <div className="mt-0.5 space-y-1">
                                  {fundingOrgs.slice(0, 2).map((org, idx) => (
                                    <div key={idx}>
                                      <div className="text-slate-900">{org.name}</div>
                                      {org.ref && (
                                        <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                          {org.ref}
                                        </code>
                                      )}
                                    </div>
                                  ))}
                                  {fundingOrgs.length > 2 && (
                                    <span className="text-slate-500">+{fundingOrgs.length - 2} more</span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Classification Summary */}
                            {(activity.aidType || activity.financeType || activity.flowType || activity.tiedStatus) && (
                              <div className="col-span-1">
                                <span className="text-slate-600 font-medium">Classifications:</span>
                                <div className="mt-0.5 flex flex-wrap gap-1.5">
                                  {activity.aidType && formatCodeWithName(`C${activity.aidType}`, activity.aidTypeName)}
                                  {activity.financeType && formatCodeWithName(activity.financeType, activity.financeTypeName)}
                                  {activity.flowType && formatCodeWithName(activity.flowType, activity.flowTypeName)}
                                  {activity.tiedStatus && formatCodeWithName(activity.tiedStatus, activity.tiedStatusName)}
                                </div>
                              </div>
                            )}
                            
                            {/* Hierarchy & Status */}
                            {(activity.hierarchy || activity.status) && (
                              <div className="col-span-1">
                                <span className="text-slate-600 font-medium">Meta:</span>
                                <div className="mt-0.5 space-y-1">
                                  {activity.hierarchy && (
                                    <div>
                                      <span className="text-slate-600">Hierarchy:</span>{' '}
                                      <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                        {activity.hierarchy}
                                      </code>
                                    </div>
                                  )}
                                  {activity.status && (
                                    <div>
                                      <span className="text-slate-600">Status:</span>{' '}
                                      <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                        {activity.status}
                                      </code>
                                      <span className="text-slate-900 ml-2">({statusDisplay})</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Expand/Collapse Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpand(activity.iatiIdentifier)
                        }}
                        className="mt-3 flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        {expanded ? (
                          <>
                            <ChevronUp className="h-3 w-3" />
                            <span>Show less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            <span>Show more details</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Expanded View - All data in 3 columns */}
                    {expanded && (
                      <div className="border-t border-slate-200 bg-white p-4">
                        <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-xs">
                          {/* Description spans across all 3 columns with truncation */}
                          {activity.description && (() => {
                            const cleanDescription = htmlToPlainText(activity.description)
                            const isExpanded = isDescriptionExpanded(activity.iatiIdentifier)
                            const shouldTruncate = cleanDescription.length > 200
                            const displayText = shouldTruncate && !isExpanded
                              ? cleanDescription.substring(0, 200) + '...'
                              : cleanDescription

                            return (
                              <div className="col-span-3">
                                <span className="text-slate-600 font-medium">Description:</span>
                                <div className="mt-0.5 text-slate-900">
                                  {isExpanded ? (
                                    <SafeHtml html={activity.description} />
                                  ) : (
                                    <span className="whitespace-pre-wrap">{displayText}</span>
                                  )}
                                  {shouldTruncate && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleDescriptionExpand(activity.iatiIdentifier)
                                      }}
                                      className="ml-2 text-blue-600 hover:text-blue-700 underline"
                                    >
                                      {isExpanded ? 'show less' : 'show more'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })()}

                          {activity.recipientCountries && activity.recipientCountries.length > 0 && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Recipient Country:</span>
                              <div className="mt-0.5 text-slate-900">
                                {activity.recipientCountries.map((country, idx) => {
                                  const countryName = getCountryName(country)
                                  return (
                                    <span key={idx} className="whitespace-nowrap">
                                      {idx > 0 && ', '}
                                      <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                        {country}
                                      </code>
                                      {countryName && countryName !== country && (
                                        <span className="ml-1.5">{countryName}</span>
                                      )}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {activity.startDatePlanned && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Planned Start:</span>
                              <div className="mt-0.5 text-slate-900">{formatDate(activity.startDatePlanned)}</div>
                            </div>
                          )}

                          {activity.startDateActual && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Actual Start:</span>
                              <div className="mt-0.5 text-slate-900">{formatDate(activity.startDateActual)}</div>
                            </div>
                          )}

                          {activity.currency && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Default Currency:</span>
                              <div className="mt-0.5 text-slate-900">
                                {(() => {
                                  const currencyInfo = getCurrencyByCode(activity.currency);
                                  const currencyName = currencyInfo?.name || activity.currency;
                                  return (
                                    <>
                                      <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                        {activity.currency}
                                      </code>
                                      {' '}
                                      <span>{currencyName}</span>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {activity.activityScope && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Activity Scope:</span>
                              <div className="mt-0.5 text-slate-900">{activity.activityScope}</div>
                            </div>
                          )}

                          {activity.participatingOrgs && activity.participatingOrgs.length > 0 && (() => {
                            const roleGroups: Record<string, Array<{ name: string; ref?: string }>> = {}
                            activity.participatingOrgs!.forEach(org => {
                              if (org.role) {
                                if (!roleGroups[org.role]) {
                                  roleGroups[org.role] = []
                                }
                                roleGroups[org.role].push({ name: org.name, ref: org.ref })
                              }
                            })
                            
                            return (
                              <div className="col-span-1">
                                <span className="text-slate-600 font-medium">Participating Organisations:</span>
                                <div className="mt-0.5 space-y-1">
                                  {Object.entries(roleGroups).map(([roleCode, orgs]) => {
                                    const roleName = getOrganizationRoleName(roleCode)
                                    return orgs.map((org, idx) => (
                                      <div key={`${roleCode}-${idx}`} className="flex flex-wrap items-baseline gap-2 text-slate-900">
                                        <span className="whitespace-nowrap">
                                          <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{roleCode}</code>
                                          {' '}
                                          <span className="font-semibold text-slate-600">{roleName}</span>
                                        </span>
                                        <span className="whitespace-nowrap">{org.name}</span>
                                        {(() => {
                                          const refDisplay = getOrgRefDisplay(org.ref);
                                          if (!refDisplay.normalized) return null;
                                          
                                          return (
                                            <span className="whitespace-nowrap flex items-center gap-1">
                                              <code className={`text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 ${!refDisplay.isValid ? 'border border-red-300' : ''}`}>
                                                {refDisplay.normalized}
                                              </code>
                                              {!refDisplay.isValid && (
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <span className="text-red-500 text-xs cursor-help">⚠</span>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p className="text-xs">Invalid IATI organization identifier format</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              )}
                                            </span>
                                          );
                                        })()}
                                      </div>
                                    ))
                                  })}
                                </div>
                              </div>
                            )
                          })()}

                          {activity.sectors && activity.sectors.length > 0 && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Sectors:</span>
                              <div className="mt-0.5 space-y-1">
                                {(Array.isArray(activity.sectors) ? activity.sectors : []).slice(0, 5).map((sector: any, idx: number) => {
                                  const sectorCode = typeof sector === 'string' ? sector : sector.code || sector;
                                  const sectorName = typeof sector === 'object' && sector.name ? sector.name : null;
                                  const sectorPercentage = typeof sector === 'object' && sector.percentage !== undefined ? sector.percentage : null;
                                  return (
                                    <div key={idx} className="text-slate-900 text-xs">
                                      <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                        {sectorCode}
                                      </code>
                                      {sectorName && sectorName !== sectorCode && (
                                        <span> {sectorName}</span>
                                      )}
                                      {sectorPercentage !== null && sectorPercentage !== undefined && (
                                        <span className="text-slate-600 font-medium"> ({sectorPercentage}%)</span>
                                      )}
                                    </div>
                                  );
                                })}
                                {activity.sectors.length > 5 && (
                                  <span className="text-slate-500">+{activity.sectors.length - 5} more</span>
                                )}
                              </div>
                            </div>
                          )}

                          {activity.endDatePlanned && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Planned End:</span>
                              <div className="mt-0.5 text-slate-900">{formatDate(activity.endDatePlanned)}</div>
                            </div>
                          )}

                          {activity.endDateActual && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Actual End:</span>
                              <div className="mt-0.5 text-slate-900">{formatDate(activity.endDateActual)}</div>
                            </div>
                          )}

                          {activity.collaborationType && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Collaboration Type:</span>
                              <div className="mt-0.5">{formatCodeWithName(activity.collaborationType)}</div>
                            </div>
                          )}

                          {activity.totalBudget && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Total Value:</span>
                              <div className="mt-0.5 text-slate-900 font-medium">
                                {formatCurrency(activity.totalBudget, activity.currency)}
                              </div>
                            </div>
                          )}

                          {(activity.aidType || activity.financeType || activity.flowType || activity.tiedStatus) && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Classifications:</span>
                              <div className="mt-0.5 space-y-1">
                                {activity.aidType && (() => {
                                  // Handle CC01 format - remove extra C
                                  const aidTypeStr = String(activity.aidType);
                                  const aidCode = aidTypeStr.startsWith('CC') ? aidTypeStr.substring(1) : (aidTypeStr.startsWith('C') ? aidTypeStr : `C${aidTypeStr}`);
                                  const aidTypeName = getAidTypeName(aidCode) || activity.aidTypeName
                                  if (aidTypeName) {
                                    return (
                                      <div>
                                        <span className="text-slate-600">Aid Type: </span>
                                        <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                          {aidCode}
                                        </code>
                                        {' '}
                                        <span className="text-slate-900">{aidTypeName}</span>
                                      </div>
                                    )
                                  }
                                  return (
                                    <div>
                                      <span className="text-slate-600">Aid Type: </span>
                                      {formatCodeWithName(aidCode, activity.aidTypeName)}
                                    </div>
                                  )
                                })()}
                                {activity.financeType && (() => {
                                  const financeTypeData = financeTypesData.find((item: any) => item.code === activity.financeType)
                                  const financeTypeName = financeTypeData?.name || activity.financeTypeName
                                  return (
                                    <div>
                                      <span className="text-slate-600">Finance Type: </span>
                                      {formatCodeWithName(activity.financeType, financeTypeName)}
                                    </div>
                                  )
                                })()}
                                {activity.flowType && (() => {
                                  const flowTypeData = flowTypesData.find((item: any) => item.code === activity.flowType)
                                  const flowTypeName = flowTypeData?.name || activity.flowTypeName
                                  // For codes below 10, show text after the code
                                  const flowCode = activity.flowType
                                  const isBelowTen = flowCode && /^\d+$/.test(flowCode) && parseInt(flowCode) < 10
                                  if (isBelowTen && flowTypeName) {
                                    return (
                                      <div>
                                        <span className="text-slate-600">Flow Type: </span>
                                        <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                          {flowCode}
                                        </code>
                                        {' '}
                                        <span className="text-slate-900">{flowTypeName}</span>
                                      </div>
                                    )
                                  }
                                  return (
                                    <div>
                                      <span className="text-slate-600">Flow Type: </span>
                                      {formatCodeWithName(activity.flowType, flowTypeName)}
                                    </div>
                                  )
                                })()}
                                {activity.tiedStatus && (() => {
                                  const tiedStatusCode = String(activity.tiedStatus);
                                  const tiedStatusLabels: Record<string, string> = {
                                    '3': 'Partially tied',
                                    '4': 'Tied',
                                    '5': 'Untied'
                                  };
                                  const tiedStatusName = tiedStatusLabels[tiedStatusCode] || activity.tiedStatusName;
                                  return (
                                    <div>
                                      <span className="text-slate-600">Tied Status: </span>
                                      <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                        {tiedStatusCode}
                                      </code>
                                      {tiedStatusName && (
                                        <>
                                          {' '}
                                          <span className="text-slate-900">{tiedStatusName}</span>
                                        </>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {activity.hierarchy && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Hierarchy:</span>
                              <div className="mt-0.5">
                                <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                  {activity.hierarchy}
                                </code>
                              </div>
                            </div>
                          )}

                          {activity.status && (
                            <div className="col-span-1">
                              <span className="text-slate-600 font-medium">Status:</span>
                              <div className="mt-0.5">
                                <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                  {activity.status}
                                </code>
                                <span className="text-slate-900 ml-2">({statusDisplay})</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
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
          userRole={user?.role}
          userId={user?.id}
          xmlContent={importedXml}
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