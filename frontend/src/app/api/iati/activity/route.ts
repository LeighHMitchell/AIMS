import { NextRequest, NextResponse } from "next/server"

// IATI Datastore API configuration
const IATI_DATASTORE_URL = process.env.IATI_DATASTORE_URL || "https://api.iatistandard.org/datastore"
const IATI_API_KEY = process.env.IATI_API_KEY || process.env.NEXT_PUBLIC_IATI_API_KEY

/**
 * GET /api/iati/activity/[iatiId]
 * Fetch a specific activity's XML from the IATI Datastore
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { iatiId: string } }
) {
  try {
    const { iatiId } = params

    if (!iatiId) {
      return NextResponse.json(
        { error: "IATI identifier is required" },
        { status: 400 }
      )
    }

    console.log("[IATI Activity Fetch] Fetching activity:", iatiId)

    // Build URL to fetch specific activity XML
    const queryParams = new URLSearchParams()
    queryParams.append("iati-identifier", iatiId)
    queryParams.append("format", "xml")

    const fetchUrl = `${IATI_DATASTORE_URL}/api/1/access/activity.xml?${queryParams.toString()}`
    
    console.log("[IATI Activity Fetch] API URL:", fetchUrl)

    // Add API key to headers if available
    const headers: HeadersInit = {
      "Accept": "application/xml",
      "User-Agent": "AIMS-IATI-Search/1.0"
    }
    
    if (IATI_API_KEY) {
      headers["Authorization"] = `Bearer ${IATI_API_KEY}`
    }

    const response = await fetch(fetchUrl, {
      method: "GET",
      headers,
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      console.error("[IATI Activity Fetch] API error:", response.status, response.statusText)
      
      // Try to get error details
      let errorMessage = `IATI Datastore returned ${response.status}`
      try {
        const errorText = await response.text()
        if (errorText) {
          errorMessage = errorText
        }
      } catch {
        // Ignore parse errors
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    const xml = await response.text()
    
    if (!xml || xml.trim().length === 0) {
      return NextResponse.json(
        { error: "No XML data returned from IATI Datastore" },
        { status: 404 }
      )
    }

    console.log(`[IATI Activity Fetch] Successfully fetched XML (${xml.length} bytes)`)

    return NextResponse.json({
      xml,
      iatiIdentifier: iatiId,
      source: "IATI Datastore",
      fetchedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error("[IATI Activity Fetch] Error:", error)
    
    const message = error instanceof Error ? error.message : "Failed to fetch activity from IATI Datastore"
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
