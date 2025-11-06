import { NextRequest, NextResponse } from "next/server"

// Force dynamic rendering - critical for production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

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

    // Build the correct IATI Datastore API URL for fetching XML
    const fetchUrl = `https://api.iatistandard.org/datastore/activity/iati?q=iati_identifier:${encodeURIComponent(iatiId)}`

    console.log("[IATI Activity Fetch] API URL:", fetchUrl)

    try {
      const headers: HeadersInit = {
        "Accept": "application/xml",
        "User-Agent": "AIMS-IATI-Search/1.0"
      }

      if (IATI_API_KEY) {
        headers["Ocp-Apim-Subscription-Key"] = IATI_API_KEY
      }

      // Create abort controller for timeout (more compatible than AbortSignal.timeout)
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), 30000)

      try {
        const response = await fetch(fetchUrl, {
          method: "GET",
          headers,
          signal: abortController.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const xml = await response.text()

          if (xml && xml.trim().length > 0 && xml.includes('<iati-activity')) {
            console.log(`[IATI Activity Fetch] Successfully fetched XML from IATI API (${xml.length} bytes)`)
            return NextResponse.json({
              xml,
              iatiIdentifier: iatiId,
              source: "IATI API",
              fetchedAt: new Date().toISOString()
            })
          }

          console.log("[IATI Activity Fetch] No valid XML returned from IATI API")
          return NextResponse.json({
            error: "No valid XML returned from IATI API",
            iatiIdentifier: iatiId
          }, { status: 404 })
        } else {
          console.error("[IATI Activity Fetch] API returned status:", response.status, response.statusText)
          const errorText = await response.text().catch(() => '')
          return NextResponse.json({
            error: `IATI API returned error: ${response.status} ${response.statusText}`,
            iatiIdentifier: iatiId,
            details: errorText || undefined
          }, { status: response.status >= 500 ? 502 : response.status })
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        
        // Check if it's a timeout error
        if (fetchError instanceof Error && (fetchError.name === 'AbortError' || fetchError.message.includes('timeout'))) {
          return NextResponse.json({
            error: "Request to IATI API timed out. Please try again.",
            iatiIdentifier: iatiId
          }, { status: 504 })
        }
        
        // Re-throw to outer catch block for other errors
        throw fetchError
      }
    } catch (apiError) {
      console.error("[IATI Activity Fetch] API Error:", apiError)
      
      // If it's a network error, return appropriate response
      if (apiError instanceof TypeError || (apiError instanceof Error && apiError.message.includes('fetch'))) {
        return NextResponse.json({
          error: "Failed to connect to IATI API. Please check your connection and try again.",
          iatiIdentifier: iatiId
        }, { status: 503 })
      }
      
      // If we get here, it means the activity wasn't found
      return NextResponse.json({
        error: "Activity not found in IATI Datastore",
        iatiIdentifier: iatiId,
        source: "IATI API",
        fetchedAt: new Date().toISOString(),
        note: "This IATI identifier was not found in the IATI Datastore"
      }, { status: 404 })
    }

  } catch (error) {
    console.error("[IATI Activity Fetch] Error:", error)

    const message = error instanceof Error ? error.message : "Failed to fetch activity from IATI Datastore"

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
