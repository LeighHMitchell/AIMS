import { NextRequest, NextResponse } from "next/server"

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

const IATI_API_KEY = process.env.IATI_API_KEY || process.env.NEXT_PUBLIC_IATI_API_KEY

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
    // IATI identifiers start with a 2-letter country/org code followed by hyphens and alphanumeric/underscore characters
    // Examples: AU-5-INM438, XI-IATI-EC_INTPA-2022-PC-23131, GB-GOV-1-123456
    const isIatiId = /^[A-Z]{2}-[A-Z0-9_-]+$/i.test(trimmedTitle)

    let searchQuery
    if (isIatiId) {
      // Exact match for IATI identifier
      searchQuery = `iati_identifier:"${encodeURIComponent(trimmedTitle)}"`
    } else {
      // Fuzzy search for title
      searchQuery = `title_narrative:*${encodeURIComponent(trimmedTitle)}*`
    }

    let searchUrl = `https://api.iatistandard.org/datastore/activity/select?q=${searchQuery}&rows=${limit}&wt=json`

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

    try {
      const headers: HeadersInit = {
        "Accept": "application/json",
        "User-Agent": "AIMS-IATI-Search/1.0"
      }

      if (IATI_API_KEY) {
        headers["Ocp-Apim-Subscription-Key"] = IATI_API_KEY
      }

      console.log("[IATI Search API] Making fetch request to:", searchUrl)
      console.log("[IATI Search API] Headers:", headers)

      const response = await fetch(searchUrl, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(30000)
      })

      console.log("[IATI Search API] Response status:", response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        const activities: IatiActivity[] = []

        // Parse the IATI API v3 response format
        const activitiesData = data.response?.docs || []

        console.log("[IATI Search API] Found", activitiesData.length, "activities from IATI API")
        console.log("[IATI Search API] Total found:", data.response?.numFound || 0)
        console.log("[IATI Search API] First activity fields:", activitiesData[0] ? Object.keys(activitiesData[0]) : "No activities")
        console.log("[IATI Search API] First few activities:", activitiesData.slice(0, 3))

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
                let orgRefs: string[]

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
                if (activity.participating_org_ref) {
                  if (Array.isArray(activity.participating_org_ref)) {
                    orgRefs = activity.participating_org_ref
                  } else {
                    orgRefs = [activity.participating_org_ref]
                  }
                } else if (activity.participating_org_identifier) {
                  if (Array.isArray(activity.participating_org_identifier)) {
                    orgRefs = activity.participating_org_identifier
                  } else {
                    orgRefs = [activity.participating_org_identifier]
                  }
                } else if (activity.participating_org_id) {
                  if (Array.isArray(activity.participating_org_id)) {
                    orgRefs = activity.participating_org_id
                  } else {
                    orgRefs = [activity.participating_org_id]
                  }
                } else {
                  orgRefs = []
                }

                // Combine the data
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

                  participatingOrgs.push({
                    name: orgNarratives[i],
                    role: role,
                    ref: orgRefs[i] || undefined
                  })
                }
              }
              
              // Parse sectors
              const sectors: string[] = []
              if (activity.sector_narrative) {
                if (Array.isArray(activity.sector_narrative)) {
                  sectors.push(...activity.sector_narrative.filter((s: string) => s && s.trim()))
                } else if (activity.sector_narrative) {
                  sectors.push(activity.sector_narrative)
                }
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
              
              activities.push({
                iatiIdentifier: iatiId,
                title,
                description: Array.isArray(activity.description_narrative)
                  ? activity.description_narrative[0]
                  : activity.description_narrative || undefined,
                reportingOrg: Array.isArray(activity.reporting_org_narrative)
                  ? activity.reporting_org_narrative[0]
                  : activity.reporting_org_narrative || undefined,
                reportingOrgRef: activity.reporting_org_ref || activity.reporting_org_identifier || activity.reporting_org_id || undefined,
                status: activity.activity_status_code || activity.activity_status || undefined,
                statusNarrative: activity.activity_status_narrative || activity.activity_status_name || activity.activity_status_narrative_text || undefined,
                startDatePlanned: activity.activity_date_start_planned || undefined,
                endDatePlanned: activity.activity_date_end_planned || undefined,
                startDateActual: activity.activity_date_start_actual || undefined,
                endDateActual: activity.activity_date_end_actual || undefined,
                totalBudget: activity.budget_value ? parseFloat(activity.budget_value) : undefined,
                currency: activity.budget_value_currency || activity.default_currency || undefined,
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
      } else {
        console.error("[IATI Search API] API returned status:", response.status, response.statusText)
        const errorText = await response.text()
        console.error("[IATI Search API] Error response body:", errorText)
      }
    } catch (apiError) {
      console.error("[IATI Search API] API Error:", apiError)
      console.error("[IATI Search API] Error details:", {
        message: apiError instanceof Error ? apiError.message : 'Unknown error',
        stack: apiError instanceof Error ? apiError.stack : undefined
      })
    }

    // Return empty results instead of mock data
    console.log("[IATI Search API] No results found from IATI API - returning empty results")
    return NextResponse.json({
      results: [],
      count: 0,
      total: 0,
      note: "No activities found in IATI Datastore matching your search criteria",
      source: "IATI API"
    })

  } catch (error) {
    console.error("[IATI Search] Error:", error)
    const message = error instanceof Error ? error.message : "Failed to search IATI Datastore"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
