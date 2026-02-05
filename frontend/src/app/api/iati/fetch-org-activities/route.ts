import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { resolveUserOrgScope } from '@/lib/iati/org-scope'
import { mapDatastoreDocToParsedActivity } from '@/lib/iati/datastore-mapper'
import crypto from 'crypto'

const IATI_API_KEY = process.env.IATI_API_KEY || process.env.NEXT_PUBLIC_IATI_API_KEY
const DATASTORE_BASE = 'https://api.iatistandard.org/datastore/activity/select'
const CACHE_TTL_HOURS = 1

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * GET /api/iati/fetch-org-activities
 *
 * Fetches the authenticated user's organisation's IATI activities from the
 * IATI Datastore API. The organisation is resolved from the auth session —
 * the client cannot specify which org to query.
 *
 * Query params:
 *   force_refresh=true   — bypass cache
 */
export async function GET(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth()
  if (authResponse) return authResponse
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // 1. Resolve org from auth session — never from client
    const orgScope = await resolveUserOrgScope(supabase, user.id)

    if (!orgScope) {
      return NextResponse.json(
        { error: 'Your user account is not assigned to an organisation.' },
        { status: 403 }
      )
    }

    if (orgScope.allRefs.length === 0) {
      return NextResponse.json(
        {
          error: 'Your organisation has no IATI identifiers configured. Ask your administrator to set up IATI identifiers in organisation settings.',
          orgScope: {
            organizationId: orgScope.organizationId,
            organizationName: orgScope.organizationName,
          },
        },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const forceRefresh = searchParams.get('force_refresh') === 'true'

    // 2. Build Solr query from org's refs (escape quotes for Solr safety)
    const refsQuery = orgScope.allRefs
      .map((ref) => `"${ref.replace(/"/g, '\\"')}"`)
      .join(' OR ')
    const solrQuery = `reporting_org_ref:(${refsQuery})`
    const queryHash = crypto.createHash('sha256').update(solrQuery).digest('hex').substring(0, 64)

    // 3. Check cache (unless force_refresh)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('iati_datastore_cache')
        .select('response_data, total_activities, fetched_at')
        .eq('organization_id', orgScope.organizationId)
        .eq('query_hash', queryHash)
        .gt('expires_at', new Date().toISOString())
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single()

      if (cached) {
        // Cache stores raw Solr docs — always re-map so mapper changes take effect
        const cachedDocs: any[] = cached.response_data?.docs || []
        const activities = cachedDocs.map(mapDatastoreDocToParsedActivity)
        const activitiesWithMatches = await markExistingActivities(
          supabase,
          activities
        )

        return NextResponse.json({
          activities: activitiesWithMatches,
          total: cached.total_activities,
          orgScope: {
            organizationId: orgScope.organizationId,
            organizationName: orgScope.organizationName,
            reportingOrgRef: orgScope.reportingOrgRef,
            allRefs: orgScope.allRefs,
          },
          fetchedAt: cached.fetched_at,
          cached: true,
        })
      }
    }

    // 4. Fetch ALL pages from IATI Datastore
    if (!IATI_API_KEY) {
      return NextResponse.json(
        { error: 'IATI API key is not configured. Please set IATI_API_KEY in environment variables.' },
        { status: 500 }
      )
    }

    console.log('[Fetch Org Activities] Query:', solrQuery)

    const PAGE_SIZE = 1000
    const DELAY_BETWEEN_PAGES_MS = 1500 // Stay under 5 calls/min rate limit
    const MAX_RETRIES = 2
    let allDocs: any[] = []
    let total = 0
    let start = 0

    // Paginate through all results with rate-limit-safe delays
    while (true) {
      const datastoreUrl =
        `${DATASTORE_BASE}?q=${encodeURIComponent(solrQuery)}` +
        `&rows=${PAGE_SIZE}&start=${start}` +
        `&wt=json&sort=iati_identifier%20asc`

      let response: Response | null = null

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => abortController.abort(), 30000)

        response = await fetch(datastoreUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Ocp-Apim-Subscription-Key': IATI_API_KEY,
            'User-Agent': 'AIMS-IATI-Import/1.0',
          },
          signal: abortController.signal,
        })

        clearTimeout(timeoutId)

        if (response.status === 429 && attempt < MAX_RETRIES) {
          // Rate limited — wait and retry
          const retryDelay = (attempt + 1) * 5000
          console.log(`[Fetch Org Activities] Rate limited, retrying in ${retryDelay}ms...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue
        }

        break
      }

      if (!response) {
        return NextResponse.json({ error: 'Failed to fetch from IATI Datastore' }, { status: 502 })
      }

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'IATI API key is invalid or expired. Please check your IATI_API_KEY configuration.' },
          { status: 502 }
        )
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.error('[Fetch Org Activities] Datastore error:', response.status, errorText)
        return NextResponse.json(
          { error: `IATI Datastore returned error: ${response.status} ${response.statusText}` },
          { status: 502 }
        )
      }

      const data = await response.json()
      const docs = data.response?.docs || []
      total = data.response?.numFound || 0

      allDocs = allDocs.concat(docs)

      console.log(`[Fetch Org Activities] Page at offset ${start}: ${docs.length} docs (${allDocs.length}/${total})`)

      // Stop if we've fetched all docs or this page was empty
      if (allDocs.length >= total || docs.length === 0) break
      start += PAGE_SIZE

      // Delay between pages to respect rate limits
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PAGES_MS))
    }

    const docs = allDocs
    console.log(`[Fetch Org Activities] Total: ${total} activities, fetched ${docs.length}`)

    // 5. Map Datastore JSON to ParsedActivity[]
    const activities = docs.map(mapDatastoreDocToParsedActivity)

    // 6. Check local DB for existing matches
    const activitiesWithMatches = await markExistingActivities(supabase, activities)

    // 7. Cache the result
    const fetchedAt = new Date().toISOString()
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString()

    // Delete old cache entries for this org+query
    await supabase
      .from('iati_datastore_cache')
      .delete()
      .eq('organization_id', orgScope.organizationId)
      .eq('query_hash', queryHash)

    // Cache raw Solr docs (not mapped activities) so mapper changes apply to cached data
    await supabase.from('iati_datastore_cache').insert({
      organization_id: orgScope.organizationId,
      query_hash: queryHash,
      total_activities: total,
      response_data: { docs },
      fetched_at: fetchedAt,
      expires_at: expiresAt,
    })

    // 8. Return
    return NextResponse.json({
      activities: activitiesWithMatches,
      total,
      orgScope: {
        organizationId: orgScope.organizationId,
        organizationName: orgScope.organizationName,
        reportingOrgRef: orgScope.reportingOrgRef,
        allRefs: orgScope.allRefs,
      },
      fetchedAt,
      cached: false,
    })
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      return NextResponse.json(
        { error: 'Request to IATI Datastore timed out. Please try again.' },
        { status: 504 }
      )
    }
    console.error('[Fetch Org Activities] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch IATI activities' },
      { status: 500 }
    )
  }
}

/**
 * Mark which activities already exist in the local database.
 */
async function markExistingActivities(
  supabase: any,
  activities: any[]
): Promise<any[]> {
  if (activities.length === 0) return activities

  const iatiIds = activities
    .map((a: any) => a.iatiIdentifier)
    .filter(Boolean)

  if (iatiIds.length === 0) return activities

  const { data: existing } = await supabase
    .from('activities')
    .select('id, iati_identifier')
    .in('iati_identifier', iatiIds)

  const existingMap = new Map<string, string>()
  if (existing) {
    for (const row of existing) {
      if (row.iati_identifier) existingMap.set(row.iati_identifier, row.id)
    }
  }

  return activities.map((a: any) => ({
    ...a,
    matched: existingMap.has(a.iatiIdentifier),
    matchedActivityId: existingMap.get(a.iatiIdentifier) || undefined,
  }))
}
