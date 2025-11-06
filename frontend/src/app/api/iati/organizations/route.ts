import { NextRequest, NextResponse } from "next/server"

const IATI_API_KEY = process.env.IATI_API_KEY || process.env.NEXT_PUBLIC_IATI_API_KEY

interface OrganizationResult {
  ref: string
  name?: string
  count: number
}

/**
 * GET /api/iati/organizations
 * Search IATI Datastore for reporting organizations by name or identifier
 * Returns list of organization IATI identifiers with activity counts
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  
  if (!query.trim()) {
    return NextResponse.json({ organizations: [] })
  }
  
  console.log("[IATI Org Search] Searching for:", query)
  
  try {
    // Query IATI Datastore for organizations matching the search term
    // Use faceting to get unique reporting organizations with their activity counts
    // Search both by narrative (name) and ref (identifier)
    // Use Solr wildcard syntax: *term* for contains search
    const searchTerm = query.toLowerCase()
    
    // Search in both reporting_org_narrative (name) AND reporting_org_ref (identifier)
    // This allows finding organizations by name (e.g., "USAID", "World Bank") or ID (e.g., "US-GOV-1")
    const searchQuery = `reporting_org_narrative:*${searchTerm}* OR reporting_org_ref:*${searchTerm}*`
    const searchUrl = `https://api.iatistandard.org/datastore/activity/select?q=${encodeURIComponent(searchQuery)}&rows=0&wt=json&facet=true&facet.field=reporting_org_ref&facet.limit=50&facet.mincount=1`
    
    const headers: HeadersInit = {
      "Accept": "application/json",
      "User-Agent": "AIMS-IATI-Search/1.0"
    }
    
    if (IATI_API_KEY) {
      headers["Ocp-Apim-Subscription-Key"] = IATI_API_KEY
    }
    
    console.log("[IATI Org Search] Search term:", searchTerm)
    console.log("[IATI Org Search] Search query:", searchQuery)
    console.log("[IATI Org Search] API URL:", searchUrl)
    
    // Create abort controller for timeout (more compatible than AbortSignal.timeout)
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 10000)
    
    try {
      const response = await fetch(searchUrl, {
        method: "GET",
        headers,
        signal: abortController.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        
        console.log("[IATI Org Search] Raw response:", JSON.stringify(data, null, 2))
        
        // Parse facets to get organization list
        // Facets come as alternating array: [ref1, count1, ref2, count2, ...]
        const facets = data.facet_counts?.facet_fields?.reporting_org_ref || []
        const organizations: OrganizationResult[] = []
        
        console.log("[IATI Org Search] Facets array:", facets)
        console.log("[IATI Org Search] Facets length:", facets.length)
        
        for (let i = 0; i < facets.length; i += 2) {
          const ref = facets[i]
          const count = facets[i + 1]
          if (ref && count > 0) {
            organizations.push({ ref, count })
          }
        }
        
        console.log("[IATI Org Search] Found", organizations.length, "organizations")
        
        return NextResponse.json({ organizations })
      } else {
        console.error("[IATI Org Search] API returned status:", response.status, response.statusText)
        const errorText = await response.text()
        console.error("[IATI Org Search] Error response:", errorText)
        return NextResponse.json({ 
          organizations: [],
          error: `IATI API returned error: ${response.status} ${response.statusText}`
        }, { status: response.status >= 500 ? 502 : 200 })
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      // Check if it's a timeout error
      if (fetchError instanceof Error && (fetchError.name === 'AbortError' || fetchError.message.includes('timeout'))) {
        console.error("[IATI Org Search] Timeout error:", fetchError)
        return NextResponse.json({ 
          organizations: [],
          error: "Request to IATI API timed out"
        })
      }
      
      // Re-throw to outer catch block for other errors
      throw fetchError
    }
  } catch (error) {
    console.error("[IATI Org Search] Error:", error)
    return NextResponse.json({ 
      organizations: [],
      error: error instanceof Error ? error.message : "Failed to search organizations"
    })
  }
}

