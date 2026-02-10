import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { resolveUserOrgScope, resolveOrgScopeById } from '@/lib/iati/org-scope'
import { mapDatastoreDocToParsedActivity } from '@/lib/iati/datastore-mapper'
import {
  type DatastoreFilters,
  buildSolrFilterQuery,
  parseFiltersFromParams,
  getDatastoreCount,
  markExistingActivities,
  IATI_DATASTORE_BASE,
  DATASTORE_PAGE_SIZE,
  DATASTORE_FIELDS,
} from '@/lib/iati/datastore-helpers'
import crypto from 'crypto'
import type { ParsedActivity } from '@/components/iati/bulk-import/types'
import { USER_ROLES } from '@/types/user'

// D-portal is used ONLY for sector percentages (not available in Datastore)
const DPORTAL_BASE = 'https://d-portal.org/q.json'

const IATI_API_KEY = process.env.IATI_API_KEY || process.env.NEXT_PUBLIC_IATI_API_KEY
const CACHE_TTL_HOURS = 1

/** Threshold above which the frontend should use paginated fetching */
const PAGINATION_THRESHOLD = 5000

export const dynamic = 'force-dynamic'
// Large organizations can take several minutes due to IATI Datastore rate limiting
// Each page (1000 activities) requires 13s delay
// Vercel Hobby plan max is 300s (5 min) - orgs with >20,000 activities may timeout
export const maxDuration = 300 // 5 minutes (Vercel Hobby plan maximum)

/**
 * GET /api/iati/fetch-org-activities
 *
 * Fetches an organisation's IATI activities from the IATI Datastore API
 * (primary source) and enriches with sector percentages from d-portal.
 *
 * Query params:
 *   force_refresh=true   — bypass cache
 *   organization_id=xxx  — (Super users only) fetch for a specific organization
 */
export async function GET(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth()
  if (authResponse) return authResponse
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const requestedOrgId = searchParams.get('organization_id')

    // Fetch user's role from the users table (not from Supabase Auth user)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = userData?.role || null

    // Check if user is a super user
    const isSuperUser = userRole === USER_ROLES.SUPER_USER ||
                        userRole === 'admin' ||
                        userRole === 'super_user'

    console.log('[Fetch Org Activities] Auth check:', {
      userId: user.id,
      userRole,
      expectedSuperUserRole: USER_ROLES.SUPER_USER,
      isSuperUser,
      requestedOrgId
    })

    let orgScope

    // If a specific organization is requested and user is super user, use that org
    if (requestedOrgId && isSuperUser) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(requestedOrgId)) {
        return NextResponse.json(
          { error: 'Invalid organization ID format.' },
          { status: 400 }
        )
      }
      orgScope = await resolveOrgScopeById(supabase, requestedOrgId)
      if (!orgScope) {
        return NextResponse.json(
          { error: 'Organization not found.' },
          { status: 404 }
        )
      }
    } else if (requestedOrgId && !isSuperUser) {
      // Non-super users cannot specify an organization
      return NextResponse.json(
        { error: 'You do not have permission to import for other organisations.' },
        { status: 403 }
      )
    } else {
      // Default: resolve org from auth session
      orgScope = await resolveUserOrgScope(supabase, user.id)
    }

    if (!orgScope) {
      return NextResponse.json(
        { error: 'Your user account is not assigned to an organisation.' },
        { status: 403 }
      )
    }

    if (orgScope.allRefs.length === 0) {
      return NextResponse.json(
        {
          error: `${orgScope.organizationName} has no IATI identifiers configured. Ask an administrator to set up IATI identifiers in organisation settings.`,
          orgScope: {
            organizationId: orgScope.organizationId,
            organizationName: orgScope.organizationName,
          },
        },
        { status: 403 }
      )
    }

    if (!IATI_API_KEY) {
      return NextResponse.json(
        { error: 'IATI API key not configured. Please contact your administrator.' },
        { status: 500 }
      )
    }

    const forceRefresh = searchParams.get('force_refresh') === 'true'
    const countOnly = searchParams.get('count_only') === 'true'

    // Pre-fetch filters (applied at Datastore level for performance)
    const filterOptions = parseFiltersFromParams(searchParams)

    // Quick count query - just return total activities without fetching data
    if (countOnly) {
      const count = await getDatastoreCount(orgScope.allRefs, filterOptions, IATI_API_KEY!)
      // Estimate breakdown:
      // - 15s per 1000 activities for IATI Datastore (13s rate limit delay + API time)
      // - 10s per 1000 activities for d-portal sector enrichment
      // - 5s per 1000 activities for d-portal hierarchy enrichment
      // - 20s overhead for initial setup, database checks, cache writes
      const pagesNeeded = Math.ceil(count / DATASTORE_PAGE_SIZE)
      const estimatedSeconds = (pagesNeeded * 30) + 20 // 30s per page + 20s overhead
      return NextResponse.json({
        count,
        estimatedSeconds,
        usePagination: count > PAGINATION_THRESHOLD,
        totalPages: pagesNeeded,
        filters: filterOptions,
        orgScope: {
          organizationId: orgScope.organizationId,
          organizationName: orgScope.organizationName,
          reportingOrgRef: orgScope.reportingOrgRef,
          allRefs: orgScope.allRefs,
        },
      })
    }

    // Check if filters are applied (skip cache for filtered queries)
    const hasFilters = filterOptions.country || filterOptions.dateStart || filterOptions.dateEnd || filterOptions.hierarchy != null

    // 2. Build query hash for caching (only for unfiltered queries)
    const queryKey = `datastore-v3:${orgScope.allRefs.sort().join(',')}`
    const queryHash = crypto.createHash('sha256').update(queryKey).digest('hex').substring(0, 64)

    // 3. Check cache (unless force_refresh or filters applied)
    if (!forceRefresh && !hasFilters) {
      try {
        const { data: cached, error: cacheError } = await supabase
          .from('iati_datastore_cache')
          .select('response_data, total_activities, fetched_at')
          .eq('organization_id', orgScope.organizationId)
          .eq('query_hash', queryHash)
          .gt('expires_at', new Date().toISOString())
          .order('fetched_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cacheError) {
          console.warn('[Fetch Org Activities] Cache lookup error (skipping cache):', cacheError.message)
        } else if (cached) {
          const cachedActivities: ParsedActivity[] = cached.response_data?.activities || []
          const activitiesWithMatches = await markExistingActivities(
            supabase,
            cachedActivities
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
      } catch (cacheErr) {
        console.warn('[Fetch Org Activities] Cache query threw (skipping cache):', cacheErr)
      }
    }

    console.log('[Fetch Org Activities] Fetching from IATI Datastore for refs:', orgScope.allRefs, 'filters:', filterOptions)

    // 4. Fetch data from IATI Datastore with filters (primary source)
    const activities = await fetchFromDatastore(orgScope.allRefs, filterOptions)

    console.log(`[Fetch Org Activities] Fetched ${activities.length} activities from IATI Datastore`)

    // 5. Enrich with data from d-portal (not available in IATI Datastore)
    if (activities.length > 0) {
      // Sector percentages (only available in d-portal)
      await enrichWithSectorPercentages(activities, orgScope.allRefs)
      // Hierarchy (IATI Datastore doesn't index this attribute)
      await enrichWithHierarchy(activities, orgScope.allRefs)
    }

    if (activities.length === 0) {
      return NextResponse.json({
        activities: [],
        total: 0,
        orgScope: {
          organizationId: orgScope.organizationId,
          organizationName: orgScope.organizationName,
          reportingOrgRef: orgScope.reportingOrgRef,
          allRefs: orgScope.allRefs,
        },
        fetchedAt: new Date().toISOString(),
        cached: false,
        note: 'No activities found in IATI Registry for this organisation',
      })
    }

    // 6. Check local DB for existing matches (non-critical — fall back to unmarked if it fails)
    let activitiesWithMatches: ParsedActivity[]
    try {
      activitiesWithMatches = await markExistingActivities(supabase, activities)
    } catch (matchErr) {
      console.warn('[Fetch Org Activities] markExistingActivities threw (returning unmarked):', matchErr)
      activitiesWithMatches = activities
    }

    // 7. Cache the result (non-critical — don't let cache errors crash the response)
    const fetchedAt = new Date().toISOString()
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString()

    try {
      // Delete old cache entries for this org+query
      const { error: deleteErr } = await supabase
        .from('iati_datastore_cache')
        .delete()
        .eq('organization_id', orgScope.organizationId)
        .eq('query_hash', queryHash)
      if (deleteErr) console.warn('[Fetch Org Activities] Cache delete error:', deleteErr.message)

      // Cache the aggregated activities
      const { error: insertErr } = await supabase.from('iati_datastore_cache').insert({
        organization_id: orgScope.organizationId,
        query_hash: queryHash,
        total_activities: activities.length,
        response_data: { activities },
        fetched_at: fetchedAt,
        expires_at: expiresAt,
      })
      if (insertErr) console.warn('[Fetch Org Activities] Cache insert error:', insertErr.message)
    } catch (cacheErr) {
      console.warn('[Fetch Org Activities] Cache write threw (non-critical):', cacheErr)
    }

    // 8. Return
    return NextResponse.json({
      activities: activitiesWithMatches,
      total: activities.length,
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
    console.error('[Fetch Org Activities] Error:', error)
    console.error('[Fetch Org Activities] Error type:', error instanceof Error ? error.constructor.name : typeof error)
    if (error instanceof Error) {
      console.error('[Fetch Org Activities] Error message:', error.message)
      console.error('[Fetch Org Activities] Error stack:', error.stack?.substring(0, 500))
    }

    // Check for various network/timeout errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      const errorCause = (error as any).cause
      const causeCode = errorCause?.code || ''
      const causeName = errorCause?.name || ''

      // PostgREST / Supabase errors (invalid type casting, pattern mismatch)
      if (errorMessage.includes('did not match the expected pattern') ||
          errorMessage.includes('invalid input syntax')) {
        console.error('[Fetch Org Activities] Supabase/PostgREST type error — likely a UUID/type mismatch in a database query')
        return NextResponse.json(
          { error: 'A database query failed due to a type mismatch. Please try again or contact support.' },
          { status: 500 }
        )
      }

      // Connection timeout
      if (error.name === 'AbortError' ||
          errorMessage.includes('timeout') ||
          causeCode === 'UND_ERR_CONNECT_TIMEOUT' ||
          causeName === 'ConnectTimeoutError') {
        return NextResponse.json(
          { error: 'Connection to IATI Datastore timed out. The server may be busy or your network may be slow. Please try again.' },
          { status: 504 }
        )
      }

      // DNS resolution failure
      if (causeCode === 'ENOTFOUND' || errorMessage.includes('enotfound')) {
        return NextResponse.json(
          { error: 'Could not connect to IATI Datastore. Please check your internet connection and try again.' },
          { status: 503 }
        )
      }

      // Socket/network errors
      if (causeCode === 'UND_ERR_SOCKET' ||
          causeName === 'SocketError' ||
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('network')) {
        return NextResponse.json(
          { error: 'Network error while fetching from IATI Datastore. Please check your internet connection and try again.' },
          { status: 503 }
        )
      }

      // Rate limit exceeded
      if (errorMessage.includes('rate limit')) {
        return NextResponse.json(
          { error: 'IATI Datastore rate limit exceeded. Please wait a minute and try again.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch IATI activities' },
      { status: 500 }
    )
  }
}

// buildSolrFilterQuery, getDatastoreCount, and markExistingActivities
// are now imported from @/lib/iati/datastore-helpers

/**
 * Fetch activities from IATI Datastore for the given org refs with optional filters.
 * Returns ParsedActivity[] with all data EXCEPT sector percentages.
 */
async function fetchFromDatastore(orgRefs: string[], filters: DatastoreFilters = {}): Promise<ParsedActivity[]> {
  const PAGE_SIZE = DATASTORE_PAGE_SIZE
  const MAX_RETRIES = 10
  const activities: ParsedActivity[] = []

  const refQuery = orgRefs.map(ref => `"${ref}"`).join(' OR ')
  const fqParams = buildSolrFilterQuery(filters)
  const fqString = fqParams.length > 0 ? `&${fqParams.map(f => `fq=${encodeURIComponent(f)}`).join('&')}` : ''

  let start = 0
  let total = Infinity
  let retryCount = 0

  while (start < total) {
    const url = `${IATI_DATASTORE_BASE}?q=reporting_org_ref:(${encodeURIComponent(refQuery)})${fqString}&rows=${PAGE_SIZE}&start=${start}&wt=json&fl=${encodeURIComponent(DATASTORE_FIELDS)}`

    if (start === 0) {
      console.log('[Fetch Org Activities] Datastore query:', url.substring(0, 300) + '...')
    }

    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 60000)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AIMS-IATI-Import/1.0',
          'Ocp-Apim-Subscription-Key': IATI_API_KEY!,
        },
        signal: abortController.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')

        // Handle rate limiting with retry
        if (response.status === 429) {
          retryCount++
          if (retryCount > MAX_RETRIES) {
            console.error('[Fetch Org Activities] Max retries exceeded for rate limiting')
            throw new Error('IATI Datastore rate limit exceeded after multiple retries')
          }
          const waitTime = Math.min(2000 * retryCount, 15000) // Exponential backoff, max 15s
          console.log(`[Fetch Org Activities] Rate limited, retry ${retryCount}/${MAX_RETRIES}, waiting ${waitTime/1000}s...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue // Retry same page
        }

        console.error('[Fetch Org Activities] Datastore error:', response.status, errorText.substring(0, 200))
        throw new Error(`IATI Datastore returned ${response.status}`)
      }

      // Reset retry count on success
      retryCount = 0

      const data = await response.json()
      const docs = data.response?.docs || []
      total = data.response?.numFound || 0

      console.log(`[Fetch Org Activities] Datastore page ${start / PAGE_SIZE + 1}: ${docs.length} docs (total: ${total})`)

      // Map each doc to ParsedActivity
      for (const doc of docs) {
        const activity = mapDatastoreDocToParsedActivity(doc)
        activities.push(activity)
      }

      start += PAGE_SIZE

      // Delay between pages to respect rate limits (5 calls/min = 12s between calls)
      // With PAGE_SIZE=1000 (Datastore hard limit), we need proper pacing
      if (start < total) {
        console.log(`[Fetch Org Activities] Fetched ${Math.min(start, total)}/${total}, waiting 13s for rate limit...`)
        await new Promise(resolve => setTimeout(resolve, 13000))
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  return activities
}

/**
 * Enrich activities with sector percentages from d-portal.
 * D-portal is the ONLY source for sector percentages (not in IATI Datastore).
 */
async function enrichWithSectorPercentages(
  activities: ParsedActivity[],
  orgRefs: string[]
): Promise<void> {
  console.log('[Fetch Org Activities] Enriching with sector percentages from d-portal')

  const PAGE_SIZE = 1000
  const sectorPercentageMap = new Map<string, Map<string, number>>() // aid -> (sector_code -> percentage)

  // Fetch sector data from d-portal for each org ref
  for (const ref of orgRefs) {
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const dportalUrl = `${DPORTAL_BASE}?from=act,sector&reporting_ref=${encodeURIComponent(ref)}&limit=${PAGE_SIZE}&offset=${offset}`

      try {
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => abortController.abort(), 30000)

        const response = await fetch(dportalUrl, {
          method: 'GET',
          headers: { Accept: 'application/json', 'User-Agent': 'AIMS-IATI-Import/1.0' },
          signal: abortController.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          console.warn(`[Fetch Org Activities] d-portal sector error for ${ref}:`, response.status)
          break
        }

        const data = await response.json()
        const rows = data.rows || []

        if (offset === 0) {
          console.log(`[Fetch Org Activities] d-portal sectors for ${ref}: ${rows.length} rows`)
        }

        // Build map of sector percentages
        for (const row of rows) {
          if (row.aid && row.sector_code && row.sector_percent != null) {
            if (!sectorPercentageMap.has(row.aid)) {
              sectorPercentageMap.set(row.aid, new Map())
            }
            sectorPercentageMap.get(row.aid)!.set(row.sector_code.toString(), Number(row.sector_percent))
          }
        }

        hasMore = rows.length >= PAGE_SIZE
        offset += PAGE_SIZE

        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      } catch (error) {
        console.warn(`[Fetch Org Activities] Error fetching sectors from d-portal for ${ref}:`, error)
        break
      }
    }
  }

  console.log(`[Fetch Org Activities] Got sector percentages for ${sectorPercentageMap.size} activities from d-portal`)

  // Apply sector percentages to activities
  let enrichedCount = 0
  for (const activity of activities) {
    const sectorMap = sectorPercentageMap.get(activity.iatiIdentifier)
    if (sectorMap && activity.sectors) {
      for (const sector of activity.sectors) {
        const pct = sectorMap.get(sector.code)
        if (pct != null) {
          sector.percentage = pct
          enrichedCount++
        }
      }
    }
  }

  console.log(`[Fetch Org Activities] Enriched ${enrichedCount} sector entries with percentages`)
}

/**
 * Enrich activities with hierarchy from d-portal.
 * The IATI Datastore doesn't index the hierarchy attribute, but d-portal's jml table has it.
 */
async function enrichWithHierarchy(
  activities: ParsedActivity[],
  orgRefs: string[]
): Promise<void> {
  console.log('[Fetch Org Activities] Enriching with hierarchy from d-portal jml table')

  const PAGE_SIZE = 1000
  const hierarchyMap = new Map<string, number>() // aid -> hierarchy

  // Fetch hierarchy data from d-portal for each org ref
  for (const ref of orgRefs) {
    let offset = 0
    let hasMore = true

    while (hasMore) {
      // Query jml table joined with act to get hierarchy
      const dportalUrl = `${DPORTAL_BASE}?from=jml,act&reporting_ref=${encodeURIComponent(ref)}&limit=${PAGE_SIZE}&offset=${offset}`

      try {
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => abortController.abort(), 30000)

        const response = await fetch(dportalUrl, {
          method: 'GET',
          headers: { Accept: 'application/json', 'User-Agent': 'AIMS-IATI-Import/1.0' },
          signal: abortController.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          console.warn(`[Fetch Org Activities] d-portal jml error for ${ref}:`, response.status)
          break
        }

        const data = await response.json()
        const rows = data.rows || []

        if (offset === 0) {
          console.log(`[Fetch Org Activities] d-portal jml for ${ref}: ${data.count || rows.length} total activities`)
        }

        // Parse hierarchy from jml JSON
        for (const row of rows) {
          if (row.aid && row.jml) {
            try {
              const jmlData = typeof row.jml === 'string' ? JSON.parse(row.jml) : row.jml
              const hierarchy = jmlData.hierarchy
              if (hierarchy != null) {
                hierarchyMap.set(row.aid, parseInt(hierarchy, 10))
              }
            } catch {
              // Skip if jml parsing fails
            }
          }
        }

        hasMore = rows.length >= PAGE_SIZE
        offset += PAGE_SIZE

        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      } catch (error) {
        console.warn(`[Fetch Org Activities] Error fetching hierarchy from d-portal for ${ref}:`, error)
        break
      }
    }
  }

  console.log(`[Fetch Org Activities] Got hierarchy for ${hierarchyMap.size} activities from d-portal`)

  // Apply hierarchy to activities
  let enrichedCount = 0
  for (const activity of activities) {
    const hierarchy = hierarchyMap.get(activity.iatiIdentifier)
    if (hierarchy != null) {
      activity.hierarchy = hierarchy
      enrichedCount++
    }
  }

  console.log(`[Fetch Org Activities] Enriched ${enrichedCount} activities with hierarchy`)
}

// markExistingActivities is now imported from @/lib/iati/datastore-helpers
