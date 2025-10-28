import { NextRequest, NextResponse } from "next/server"

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

      const response = await fetch(fetchUrl, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(30000)
      })

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
      } else {
        console.error("[IATI Activity Fetch] API returned status:", response.status, response.statusText)
      }
    } catch (apiError) {
      console.error("[IATI Activity Fetch] API Error:", apiError)
    }

    // Return error instead of mock data
    console.log("[IATI Activity Fetch] Activity not found in IATI Datastore")

    return NextResponse.json({
      error: "Activity not found in IATI Datastore",
      iatiIdentifier: iatiId,
      source: "IATI API",
      fetchedAt: new Date().toISOString(),
      note: "This IATI identifier was not found in the IATI Datastore"
    }, { status: 404 })

  } catch (error) {
    console.error("[IATI Activity Fetch] Error:", error)

    const message = error instanceof Error ? error.message : "Failed to fetch activity from IATI Datastore"

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
