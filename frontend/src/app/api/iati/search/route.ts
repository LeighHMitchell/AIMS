import { NextRequest, NextResponse } from "next/server"
import { sanitizeIatiDescriptionServerSafe } from "@/lib/sanitize-server"

// Force dynamic rendering - critical for production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

interface SearchParams {
  reportingOrgRef?: string
  recipientCountry?: string
  activityTitle: string
  limit?: number
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
  totalPlannedDisbursement?: number
  totalOutgoingCommitment?: number
  totalDisbursement?: number
  currency?: string
  sectors?: Array<{ code?: string; name?: string; percentage?: number } | string>
  participatingOrgs?: Array<{ name: string; role?: string; ref?: string }>
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

// Read API key at runtime to ensure we get the latest value from Vercel environment
const getIatiApiKey = () => process.env.IATI_API_KEY || process.env.NEXT_PUBLIC_IATI_API_KEY

// Helper function to extract date from activity_date array by type
// IATI date types: '1' = start-planned, '2' = start-actual, '3' = end-planned, '4' = end-actual
const extractActivityDate = (activityDates: any, dateType: string): string | undefined => {
  if (!activityDates) return undefined
  
  // Handle array format
  if (Array.isArray(activityDates)) {
    const dateObj = activityDates.find((d: any) => {
      const type = d['@_type'] || d.type || d['@type'] || d['_type']
      return type === dateType
    })
    return dateObj?.['@_iso-date'] || dateObj?.['iso-date'] || dateObj?.['iso_date'] || dateObj?.isoDate || undefined
  }
  
  // Handle object format
  if (typeof activityDates === 'object') {
    const dateObj = activityDates[dateType] || activityDates[`type_${dateType}`]
    return dateObj?.['@_iso-date'] || dateObj?.['iso-date'] || dateObj?.['iso_date'] || dateObj?.isoDate || dateObj || undefined
  }
  
  return undefined
}

// Helper function to extract date from Solr parallel arrays format
// The IATI Datastore Solr API returns dates in parallel arrays:
// - activity_date_iso_date: ["2020-01-01", "2021-12-31", ...]
// - activity_date_type: ["1", "3", ...]
const extractDateFromSolrArrays = (
  activity: any, 
  dateType: string
): string | undefined => {
  const dateValues = activity.activity_date_iso_date
  const dateTypes = activity.activity_date_type
  
  if (!dateValues || !dateTypes) return undefined
  
  // Ensure both are arrays
  const valuesArr = Array.isArray(dateValues) ? dateValues : [dateValues]
  const typesArr = Array.isArray(dateTypes) ? dateTypes : [dateTypes]
  
  // Find the index where type matches
  const idx = typesArr.findIndex((t: any) => String(t) === dateType)
  
  if (idx !== -1 && valuesArr[idx]) {
    return valuesArr[idx]
  }
  
  return undefined
}

/**
 * POST /api/iati/search
 * Search the IATI Datastore using the correct API v3 format
 */
export async function POST(request: NextRequest) {
  console.log("[IATI Search API] POST request received")

  try {
    const body: SearchParams = await request.json()
    const { reportingOrgRef, recipientCountry, activityTitle, limit = 20 } = body

    console.log("[IATI Search API] Parsed body:", body)

    if (!activityTitle?.trim()) {
      console.log("[IATI Search API] Missing activity title")
      return NextResponse.json(
        { error: "Activity title is required" },
        { status: 400 }
      )
    }

    console.log("[IATI Search API] Starting search for:", activityTitle)
    console.log("[IATI Search API] Filters:", { reportingOrgRef, recipientCountry, limit })

    // Build the correct IATI Datastore API URL (v3 format)
    const trimmedTitle = activityTitle.trim()

    // Check if the search term looks like an IATI identifier
    // IATI identifiers can start with:
    // - 2+ letter country/org code (GB-GOV-1-123456, AU-5-INM438)
    // - Numeric org code (44000-P156634 for World Bank)
    // Followed by hyphens and alphanumeric/underscore/period/colon characters
    // Examples: AU-5-INM438, XI-IATI-EC_INTPA-2022-PC-23131, GB-GOV-1-123456, DAC-1601-INV-083532, 44000-P156634, XM-DAC-928-CZ-2024-25-13.003.EU01.CZH02, NL-KVK-27108436-A-06801-02:KH
    const isIatiId = /^[A-Z0-9]{2,}-[A-Z0-9_.\-:]+$/i.test(trimmedTitle)

    // Helper function to escape special Solr characters for wildcard searches
    const escapeSolrWildcard = (str: string) => {
      // For wildcard searches, escape special chars but keep * and ? for wildcards
      // Escape: + - && || ! ( ) { } [ ] ^ " ~ : \ /
      return str.replace(/[+\-&|!(){}[\]^"~:\\\/]/g, '\\$&')
    }

    // Helper function to escape hyphens for Solr exact matching
    // Hyphens are interpreted as NOT operators in Solr unless escaped
    const escapeSolrHyphens = (str: string) => {
      return str.replace(/-/g, '\\-')
    }

    let searchQuery
    if (isIatiId) {
      // Search by IATI identifier using multiple strategies for reliability:
      // The IATI Datastore tokenizes identifiers on hyphens, so we use multiple approaches:
      // 1. Wildcard search on the last segment (e.g., *P174951*) - most reliable
      // 2. iati_identifier_exact for activities that have this field indexed
      // Extract the last segment of the identifier (after the last hyphen) for wildcard search
      const lastSegment = trimmedTitle.split('-').pop() || trimmedTitle
      searchQuery = `iati_identifier:*${lastSegment}* OR iati_identifier_exact:"${trimmedTitle}"`
    } else {
      // Try multiple search strategies for better results
      // 1. Remove words shorter than 3 chars (except acronyms in parentheses)
      const words = trimmedTitle.split(/\s+/).filter(w => {
        // Keep words 3+ chars, or words in parentheses (like GPP)
        return w.length >= 3 || /^\(.+\)$/.test(w)
      })
      
      if (words.length === 0) {
        // Fallback to simple wildcard search
        searchQuery = `title_narrative:*${escapeSolrWildcard(trimmedTitle)}*`
      } else if (words.length === 1) {
        // Single word search
        searchQuery = `title_narrative:*${escapeSolrWildcard(words[0])}*`
      } else {
        // Multi-word search: try each word individually (more lenient than AND)
        // This finds activities that contain ANY of the significant words
        searchQuery = words.map(word => {
          const cleaned = escapeSolrWildcard(word)
          return `title_narrative:*${cleaned}*`
        }).join(' OR ')
      }
    }

    let searchUrl = `https://api.iatistandard.org/datastore/activity/select?q=${encodeURIComponent(searchQuery)}&rows=${limit}&wt=json`

    // Add debug info
    console.log("[IATI Search API] Search term:", trimmedTitle)
    console.log("[IATI Search API] Detected as IATI ID:", isIatiId)
    console.log("[IATI Search API] Search query:", searchQuery)

    // Add filters using fq (filter query) parameter
    if (reportingOrgRef?.trim()) {
      searchUrl += `&fq=reporting_org_ref:${encodeURIComponent(reportingOrgRef.trim())}`
    }

    if (recipientCountry?.trim()) {
      searchUrl += `&fq=recipient_country_code:${encodeURIComponent(recipientCountry.trim())}`
    }

    console.log("[IATI Search API] Final search URL:", searchUrl)

    // Create abort controller for timeout (more compatible than AbortSignal.timeout)
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 30000)

    try {
      // Get API key at runtime to ensure we have the latest value
      const IATI_API_KEY = getIatiApiKey()
      
      const headers: HeadersInit = {
        "Accept": "application/json",
        "User-Agent": "AIMS-IATI-Search/1.0"
      }

      if (IATI_API_KEY) {
        headers["Ocp-Apim-Subscription-Key"] = IATI_API_KEY
      }

      console.log("[IATI Search API] Making fetch request to:", searchUrl)
      console.log("[IATI Search API] Headers:", Object.keys(headers))
      console.log("[IATI Search API] Has API key:", !!IATI_API_KEY)
      console.log("[IATI Search API] API key length:", IATI_API_KEY ? IATI_API_KEY.length : 0)
      console.log("[IATI Search API] API key first 4 chars:", IATI_API_KEY ? IATI_API_KEY.substring(0, 4) : 'N/A')
      console.log("[IATI Search API] All env vars starting with IATI:", Object.keys(process.env).filter(k => k.includes('IATI')))

      const response = await fetch(searchUrl, {
        method: "GET",
        headers,
        signal: abortController.signal
      })

      clearTimeout(timeoutId)

      console.log("[IATI Search API] Response status:", response.status, response.statusText)

      if (response.status === 401) {
        const errorText = await response.text().catch(() => '')
        // Re-read API key for debug info
        const IATI_API_KEY = getIatiApiKey()
        
        // Check all possible env var sources
        const directEnv = process.env.IATI_API_KEY
        const publicEnv = process.env.NEXT_PUBLIC_IATI_API_KEY
        const allEnvKeys = Object.keys(process.env).filter(k => k.includes('IATI'))
        
        console.error("[IATI Search API] 401 Unauthorized - API key may be missing or invalid")
        console.error("[IATI Search API] Error response:", errorText)
        console.error("[IATI Search API] Debug - IATI_API_KEY exists:", !!IATI_API_KEY)
        console.error("[IATI Search API] Debug - process.env.IATI_API_KEY:", !!directEnv, directEnv ? `length: ${directEnv.length}` : 'undefined')
        console.error("[IATI Search API] Debug - process.env.NEXT_PUBLIC_IATI_API_KEY:", !!publicEnv)
        console.error("[IATI Search API] Debug - All IATI env vars:", allEnvKeys)
        console.error("[IATI Search API] Debug - VERCEL_ENV:", process.env.VERCEL_ENV)
        console.error("[IATI Search API] Debug - NODE_ENV:", process.env.NODE_ENV)
        
        // Provide helpful error message with debug info
        const errorMessage = !IATI_API_KEY 
          ? "IATI API key is not configured. Please set IATI_API_KEY in your environment variables."
          : "IATI API key is invalid or expired. Please check your IATI_API_KEY configuration."
        
        return NextResponse.json(
          { 
            error: errorMessage,
            details: "The IATI Datastore API requires authentication. Please configure IATI_API_KEY in your Vercel environment variables.",
            debug: {
              hasKey: !!IATI_API_KEY,
              keyLength: IATI_API_KEY ? IATI_API_KEY.length : 0,
              envVarExists: !!directEnv,
              publicEnvVarExists: !!publicEnv,
              allIatiEnvVars: allEnvKeys,
              vercelEnv: process.env.VERCEL_ENV,
              nodeEnv: process.env.NODE_ENV
            }
          },
          { status: 401 }
        )
      }

      if (response.ok) {
        const data = await response.json()
        const activities: IatiActivity[] = []

        // Parse the IATI API v3 response format
        const activitiesData = data.response?.docs || []

        console.log("[IATI Search API] Found", activitiesData.length, "activities from IATI API")
        console.log("[IATI Search API] Total found:", data.response?.numFound || 0)
        console.log("[IATI Search API] First activity fields:", activitiesData[0] ? Object.keys(activitiesData[0]) : "No activities")
        console.log("[IATI Search API] First few activities:", activitiesData.slice(0, 3))
        
        // Log date-related fields from first activity for debugging
        if (activitiesData[0]) {
          console.log("[IATI Search API] Date-related fields in first activity:")
          Object.keys(activitiesData[0]).forEach(key => {
            if (key.toLowerCase().includes('date') || key.toLowerCase().includes('activity_date')) {
              console.log(`  ${key}:`, activitiesData[0][key])
            }
          })
          // Try to extract dates using our helper
          const testDates = {
            startPlanned: extractDateFromSolrArrays(activitiesData[0], '1'),
            startActual: extractDateFromSolrArrays(activitiesData[0], '2'),
            endPlanned: extractDateFromSolrArrays(activitiesData[0], '3'),
            endActual: extractDateFromSolrArrays(activitiesData[0], '4'),
          }
          console.log("[IATI Search API] Extracted dates from first activity:", testDates)
        }

        // Log organization-related fields specifically
        if (activitiesData[0]) {
          console.log("[IATI Search API] Organization fields in first activity:")
          Object.keys(activitiesData[0]).forEach(key => {
            if (key.includes('org') || key.includes('participating') || key.includes('reporting')) {
              console.log(`  ${key}:`, activitiesData[0][key])
            }
          })
        }

        // Track seen IATI identifiers to avoid duplicates (same activity matched by other-identifier)
        const seenIdentifiers = new Set<string>()
        
        for (const activity of activitiesData) {
          try {
            const iatiId = activity.iati_identifier
            const title = Array.isArray(activity.title_narrative)
              ? activity.title_narrative[0]
              : activity.title_narrative

            // Skip if we've already seen this IATI identifier (deduplication)
            if (iatiId && seenIdentifiers.has(iatiId)) {
              console.log("[IATI Search API] Skipping duplicate activity:", iatiId)
              continue
            }

            // If searching by IATI ID, only include results where the search term matches the actual iati_identifier
            // This filters out matches from other-identifier fields
            if (isIatiId && iatiId !== trimmedTitle) {
              console.log("[IATI Search API] Skipping other-identifier match:", iatiId, "!==", trimmedTitle)
              continue
            }

            if (iatiId && title) {
              seenIdentifiers.add(iatiId)
              // Parse participating organizations (implementing partners, etc.)
              const participatingOrgs: Array<{ name: string; role?: string; ref?: string }> = []
              if (activity.participating_org_narrative) {
                let orgNarratives: string[]
                let orgRoles: string[]
                let orgRefs: (string | null)[]
                
                // Debug logging for this specific activity
                if (iatiId === 'XI-IATI-EC_INTPA-2022-PC-15203') {
                  console.log('[IATI Search API] DEBUG - Activity:', iatiId);
                  console.log('[IATI Search API] DEBUG - participating_org_narrative:', activity.participating_org_narrative);
                  console.log('[IATI Search API] DEBUG - participating_org_ref:', activity.participating_org_ref);
                  console.log('[IATI Search API] DEBUG - participating_org_role:', activity.participating_org_role);
                  console.log('[IATI Search API] DEBUG - All participating org fields:', 
                    Object.keys(activity).filter(k => k.includes('participating')));
                }

                // Handle arrays
                if (Array.isArray(activity.participating_org_narrative)) {
                  orgNarratives = activity.participating_org_narrative.filter((org: string) => org && org.trim())
                } else {
                  orgNarratives = [activity.participating_org_narrative].filter(Boolean)
                }

                // Get roles if available (try multiple field name variations)
                if (activity.participating_org_role) {
                  if (Array.isArray(activity.participating_org_role)) {
                    orgRoles = activity.participating_org_role
                  } else {
                    orgRoles = [activity.participating_org_role]
                  }
                } else if (activity.participating_org_role_code) {
                  if (Array.isArray(activity.participating_org_role_code)) {
                    orgRoles = activity.participating_org_role_code
                  } else {
                    orgRoles = [activity.participating_org_role_code]
                  }
                } else if (activity.participating_org_type) {
                  if (Array.isArray(activity.participating_org_type)) {
                    orgRoles = activity.participating_org_type
                  } else {
                    orgRoles = [activity.participating_org_type]
                  }
                } else {
                  orgRoles = []
                }

                // Get refs if available (try multiple field name variations)
                // Important: The IATI Datastore API returns arrays that should align by index
                // However, if an org doesn't have a ref, that index might be missing, null, or empty
                // We need to preserve refs with spaces (like "FR-RCS-523 369 619") and ensure proper alignment
                // Try ALL possible field name variations - the API might use different names
                const possibleRefFields = [
                  'participating_org_ref',
                  'participating_org_identifier', 
                  'participating_org_id',
                  'participating_org_ref_raw',
                  'participating_org_ref_norm'
                ];
                
                let foundRefField = null;
                for (const fieldName of possibleRefFields) {
                  if (activity[fieldName]) {
                    foundRefField = fieldName;
                    if (iatiId === 'XI-IATI-EC_INTPA-2022-PC-15203') {
                      console.log('[IATI Search API] DEBUG - Found ref field:', fieldName, 'value:', activity[fieldName]);
                    }
                    break;
                  }
                }
                
                if (foundRefField) {
                  const refData = activity[foundRefField];
                  if (Array.isArray(refData)) {
                    // Preserve refs with spaces - only trim leading/trailing whitespace
                    orgRefs = refData.map((ref: any) => {
                      if (ref && typeof ref === 'string') {
                        const trimmed = ref.trim()
                        return trimmed.length > 0 ? trimmed : null
                      }
                      return null
                    })
                  } else {
                    const refStr = refData
                    orgRefs = (refStr && typeof refStr === 'string' && refStr.trim().length > 0)
                      ? [refStr.trim()]
                      : []
                  }
                } else {
                  orgRefs = []
                  if (iatiId === 'XI-IATI-EC_INTPA-2022-PC-15203') {
                    console.log('[IATI Search API] DEBUG - No ref field found. Available fields:', 
                      Object.keys(activity).filter(k => k.toLowerCase().includes('participating') || k.toLowerCase().includes('org')));
                  }
                }

                // Ensure orgRefs array has the same length as orgNarratives
                // Fill with null for missing refs to maintain alignment
                // This preserves the index-based alignment from the API
                while (orgRefs.length < orgNarratives.length) {
                  orgRefs.push(null)
                }
                // Truncate if somehow longer (shouldn't happen, but be safe)
                orgRefs = orgRefs.slice(0, orgNarratives.length)

                // Ensure orgRoles array has the same length as orgNarratives
                while (orgRoles.length < orgNarratives.length) {
                  orgRoles.push(undefined)
                }
                orgRoles = orgRoles.slice(0, orgNarratives.length)

                // Combine the data - arrays are now guaranteed to be aligned by index
                // NOTE: The IATI Datastore API should maintain index alignment between narratives, roles, and refs
                // However, if refs are missing or in a different order, there may be misalignment
                // For 100% accuracy, fetch the full XML and parse it with the XML parser
                
                // Debug logging for alignment issues
                if (iatiId === 'XI-IATI-EC_INTPA-2022-PC-15203') {
                  console.log('[IATI Search API] DEBUG - Array lengths:', {
                    narratives: orgNarratives.length,
                    roles: orgRoles.length,
                    refs: orgRefs.length
                  });
                  console.log('[IATI Search API] DEBUG - First 15 narratives:', orgNarratives.slice(0, 15));
                  console.log('[IATI Search API] DEBUG - First 15 refs:', orgRefs.slice(0, 15));
                  console.log('[IATI Search API] DEBUG - Looking for "EXPERTISE ADVISORS" at index:', 
                    orgNarratives.findIndex(n => n && n.includes('EXPERTISE ADVISORS')));
                }
                
                for (let i = 0; i < orgNarratives.length; i++) {
                  let role = orgRoles[i] || undefined

                  // Convert numeric role codes to IATI standard format
                  if (role && typeof role === 'string' && /^\d+$/.test(role)) {
                    // If it's a numeric code, keep it as is (IATI standard uses 1, 2, 3, 4)
                    role = role
                  } else if (role && typeof role === 'number') {
                    // If it's already a number, convert to string
                    role = String(role)
                  }

                  // Only include ref if it's not null/undefined/empty
                  // Check for null explicitly since we're using null as placeholder
                  // Preserve spaces within refs (e.g., "FR-RCS-523 369 619")
                  const refValue = orgRefs[i]
                  let ref: string | undefined = undefined
                  
                  if (refValue && typeof refValue === 'string') {
                    const trimmed = refValue.trim()
                    // Include ref if it's not empty and not just "0"
                    if (trimmed.length > 0 && trimmed !== '0') {
                      ref = trimmed // Preserve spaces within the ref
                    }
                  }

                  // Debug logging for specific org
                  if (iatiId === 'XI-IATI-EC_INTPA-2022-PC-15203' && orgNarratives[i] && orgNarratives[i].includes('EXPERTISE ADVISORS')) {
                    console.log('[IATI Search API] DEBUG - Found EXPERTISE ADVISORS:', {
                      index: i,
                      name: orgNarratives[i],
                      role: role,
                      refValue: orgRefs[i],
                      ref: ref,
                      allRefsAtThisIndex: orgRefs.slice(Math.max(0, i-2), i+3)
                    });
                  }
                  
                  participatingOrgs.push({
                    name: orgNarratives[i],
                    role: role,
                    ref: ref
                  })
                }
              }
              
              // Parse sectors with codes and percentages
              const sectors: Array<{ code?: string; name?: string; percentage?: number } | string> = []
              
              // Try to get sector codes
              let sectorCodes: string[] = []
              if (activity.sector_code) {
                if (Array.isArray(activity.sector_code)) {
                  sectorCodes = activity.sector_code.filter((c: string) => c && c.trim())
                } else {
                  sectorCodes = [activity.sector_code]
                }
              }
              
              // Get sector narratives (names)
              let sectorNarratives: string[] = []
              if (activity.sector_narrative) {
                if (Array.isArray(activity.sector_narrative)) {
                  sectorNarratives = activity.sector_narrative.filter((s: string) => s && s.trim())
                } else if (activity.sector_narrative) {
                  sectorNarratives = [activity.sector_narrative]
                }
              }
              
              // Get sector percentages if available
              let sectorPercentages: number[] = []
              if (activity.sector_percentage) {
                if (Array.isArray(activity.sector_percentage)) {
                  sectorPercentages = activity.sector_percentage.map((p: any) => {
                    const num = typeof p === 'number' ? p : parseFloat(p)
                    return isNaN(num) ? undefined : num
                  }).filter((p: number | undefined): p is number => p !== undefined)
                } else {
                  const num = typeof activity.sector_percentage === 'number' 
                    ? activity.sector_percentage 
                    : parseFloat(activity.sector_percentage)
                  if (!isNaN(num)) {
                    sectorPercentages = [num]
                  }
                }
              }
              
              // Combine sector data
              const maxLength = Math.max(sectorCodes.length, sectorNarratives.length, sectorPercentages.length)
              for (let i = 0; i < maxLength; i++) {
                const code = sectorCodes[i]
                const name = sectorNarratives[i]
                const percentage = sectorPercentages[i]
                
                if (code || name) {
                  if (code && (percentage !== undefined || name)) {
                    // Structured object with code and optionally percentage
                    sectors.push({
                      code: code,
                      name: name,
                      percentage: percentage
                    })
                  } else if (code) {
                    // Just code
                    sectors.push(code)
                  } else if (name) {
                    // Just name (fallback)
                    sectors.push(name)
                  }
                }
              }
              
              // Fallback: if no structured data, use narratives
              if (sectors.length === 0 && sectorNarratives.length > 0) {
                sectors.push(...sectorNarratives)
              }
              
              // Parse recipient countries
              const recipientCountries: string[] = []
              if (activity.recipient_country_narrative) {
                if (Array.isArray(activity.recipient_country_narrative)) {
                  recipientCountries.push(...activity.recipient_country_narrative.filter((c: string) => c && c.trim()))
                } else if (activity.recipient_country_narrative) {
                  recipientCountries.push(activity.recipient_country_narrative)
                }
              }
              
              // Extract and sanitize description HTML
              const rawDescription = Array.isArray(activity.description_narrative)
                ? activity.description_narrative[0]
                : activity.description_narrative;
              const sanitizedDescription = rawDescription 
                ? sanitizeIatiDescriptionServerSafe(rawDescription) 
                : undefined;

              activities.push({
                iatiIdentifier: iatiId,
                title,
                description: sanitizedDescription,
                reportingOrg: Array.isArray(activity.reporting_org_narrative)
                  ? activity.reporting_org_narrative[0]
                  : activity.reporting_org_narrative || undefined,
                reportingOrgRef: activity.reporting_org_ref || activity.reporting_org_identifier || activity.reporting_org_id || undefined,
                status: activity.activity_status_code || activity.activity_status || undefined,
                statusNarrative: activity.activity_status_narrative || activity.activity_status_name || activity.activity_status_narrative_text || undefined,
                startDatePlanned: 
                  extractDateFromSolrArrays(activity, '1') ||
                  extractActivityDate(activity.activity_date, '1') ||
                  activity.activity_date_start_planned || 
                  activity.activity_date_start_planned_iso_date || 
                  activity['activity-date-start-planned'] || 
                  activity['activity-date-start-planned-iso-date'] || 
                  undefined,
                endDatePlanned: 
                  extractDateFromSolrArrays(activity, '3') ||
                  extractActivityDate(activity.activity_date, '3') ||
                  activity.activity_date_end_planned || 
                  activity.activity_date_end_planned_iso_date || 
                  activity['activity-date-end-planned'] || 
                  activity['activity-date-end-planned-iso-date'] || 
                  undefined,
                startDateActual: 
                  extractDateFromSolrArrays(activity, '2') ||
                  extractActivityDate(activity.activity_date, '2') ||
                  activity.activity_date_start_actual || 
                  activity.activity_date_start_actual_iso_date || 
                  activity['activity-date-start-actual'] || 
                  activity['activity-date-start-actual-iso-date'] || 
                  undefined,
                endDateActual: 
                  extractDateFromSolrArrays(activity, '4') ||
                  extractActivityDate(activity.activity_date, '4') ||
                  activity.activity_date_end_actual || 
                  activity.activity_date_end_actual_iso_date || 
                  activity['activity-date-end-actual'] || 
                  activity['activity-date-end-actual-iso-date'] || 
                  undefined,
                totalBudget: activity.budget_value ? parseFloat(activity.budget_value) : undefined,
                totalPlannedDisbursement: activity.planned_disbursement_value ? parseFloat(activity.planned_disbursement_value) : undefined,
                totalOutgoingCommitment: activity.transaction_value ? (() => {
                  // Try to get commitment transactions (type 2)
                  // Note: IATI Datastore may not provide this granularity in search results
                  // This is a fallback - full calculation would require fetching full XML
                  return undefined
                })() : undefined,
                totalDisbursement: activity.transaction_value ? (() => {
                  // Try to get disbursement transactions (type 3)
                  // Note: IATI Datastore may not provide this granularity in search results
                  // This is a fallback - full calculation would require fetching full XML
                  return undefined
                })() : undefined,
                currency: activity.budget_value_currency || activity.planned_disbursement_value_currency || activity.default_currency || undefined,
                participatingOrgs: participatingOrgs.length > 0 ? participatingOrgs : undefined,
                sectors: sectors.length > 0 ? sectors : undefined,
                recipientCountries: recipientCountries.length > 0 ? recipientCountries : undefined,
                activityScope: activity.activity_scope_narrative || undefined,
                collaborationType: activity.collaboration_type_narrative || undefined,
                aidType: activity.default_aid_type_code || activity.aid_type_code || undefined,
                aidTypeName: activity.default_aid_type_narrative || activity.aid_type_narrative || undefined,
                financeType: activity.default_finance_type_code || activity.finance_type_code || undefined,
                financeTypeName: activity.default_finance_type_narrative || activity.finance_type_narrative || undefined,
                flowType: activity.default_flow_type_code || activity.flow_type_code || undefined,
                flowTypeName: activity.default_flow_type_narrative || activity.flow_type_narrative || undefined,
                tiedStatus: activity.default_tied_status_code || activity.tied_status_code || undefined,
                tiedStatusName: activity.default_tied_status_narrative || activity.tied_status_narrative || undefined,
                hierarchy: activity.hierarchy || undefined,
                hierarchyName: activity.hierarchy_narrative || undefined
              })
            }
          } catch (error) {
            console.error("[IATI Search] Error parsing activity:", error)
          }
        }

        if (activities.length > 0) {
          console.log("[IATI Search] Successfully parsed", activities.length, "activities from IATI API")
          return NextResponse.json({
            results: activities,
            count: activities.length,
            total: data.response?.numFound || activities.length,
            source: "IATI API"
          })
        }

        console.log("[IATI Search API] No activities found from IATI API")
        console.log("[IATI Search API] Response data:", data)
        return NextResponse.json({
          results: [],
          count: 0,
          total: data.response?.numFound || 0,
          note: "No activities found in IATI Datastore matching your search criteria",
          source: "IATI API"
        })
      } else {
        console.error("[IATI Search API] API returned status:", response.status, response.statusText)
        const errorText = await response.text()
        console.error("[IATI Search API] Error response body:", errorText)
        
        // Return proper error response
        return NextResponse.json(
          { 
            error: `IATI API returned error: ${response.status} ${response.statusText}`,
            details: errorText.length > 0 ? errorText : undefined
          },
          { status: response.status >= 500 ? 502 : response.status }
        )
      }
    } catch (apiError) {
      clearTimeout(timeoutId)
      
      console.error("[IATI Search API] API Error:", apiError)
      console.error("[IATI Search API] Error details:", {
        message: apiError instanceof Error ? apiError.message : 'Unknown error',
        stack: apiError instanceof Error ? apiError.stack : undefined,
        name: apiError instanceof Error ? apiError.name : undefined
      })
      
      // Check if it's a timeout error
      if (apiError instanceof Error && (apiError.name === 'AbortError' || apiError.message.includes('timeout'))) {
        return NextResponse.json(
          { error: "Request to IATI API timed out. Please try again." },
          { status: 504 }
        )
      }
      
      // Check if it's a network error
      if (apiError instanceof TypeError || (apiError instanceof Error && apiError.message.includes('fetch'))) {
        return NextResponse.json(
          { error: "Failed to connect to IATI API. Please check your connection and try again." },
          { status: 503 }
        )
      }
      
      // Return generic error
      return NextResponse.json(
        { 
          error: "Failed to search IATI Datastore",
          details: apiError instanceof Error ? apiError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("[IATI Search] Error:", error)
    const message = error instanceof Error ? error.message : "Failed to search IATI Datastore"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
