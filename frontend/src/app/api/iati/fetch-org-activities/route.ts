import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { resolveUserOrgScope, resolveOrgScopeById } from '@/lib/iati/org-scope'
import { mapDatastoreDocToParsedActivity } from '@/lib/iati/datastore-mapper'
import crypto from 'crypto'
import type { ParsedActivity } from '@/components/iati/bulk-import/types'
import { USER_ROLES } from '@/types/user'

// IATI Datastore is the PRIMARY source (has everything except sector percentages)
const IATI_DATASTORE_BASE = 'https://api.iatistandard.org/datastore/activity/select'
// D-portal is used ONLY for sector percentages (not available in Datastore)
const DPORTAL_BASE = 'https://d-portal.org/q.json'

const IATI_API_KEY = process.env.IATI_API_KEY || process.env.NEXT_PUBLIC_IATI_API_KEY
const CACHE_TTL_HOURS = 1

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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

    // Check if user is a super user
    const isSuperUser = user.role === USER_ROLES.SUPER_USER || user.role === 'admin'

    let orgScope

    // If a specific organization is requested and user is super user, use that org
    if (requestedOrgId && isSuperUser) {
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

    // 2. Build query hash for caching
    const queryKey = `datastore-v3:${orgScope.allRefs.sort().join(',')}`
    const queryHash = crypto.createHash('sha256').update(queryKey).digest('hex').substring(0, 64)

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
    }

    console.log('[Fetch Org Activities] Fetching from IATI Datastore for refs:', orgScope.allRefs)

    // 4. Fetch ALL data from IATI Datastore (primary source)
    const activities = await fetchFromDatastore(orgScope.allRefs)

    console.log(`[Fetch Org Activities] Fetched ${activities.length} activities from IATI Datastore`)

    // 5. Enrich with sector percentages from d-portal (only data not in Datastore)
    if (activities.length > 0) {
      await enrichWithSectorPercentages(activities, orgScope.allRefs)
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

    // Cache the aggregated activities
    await supabase.from('iati_datastore_cache').insert({
      organization_id: orgScope.organizationId,
      query_hash: queryHash,
      total_activities: activities.length,
      response_data: { activities },
      fetched_at: fetchedAt,
      expires_at: expiresAt,
    })

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
 * Fetch all activities from IATI Datastore for the given org refs.
 * Returns ParsedActivity[] with all data EXCEPT sector percentages.
 */
async function fetchFromDatastore(orgRefs: string[]): Promise<ParsedActivity[]> {
  // IATI Datastore has a hard limit of 1000 rows per request
  const PAGE_SIZE = 1000
  const MAX_RETRIES = 10
  const activities: ParsedActivity[] = []

  // Build Solr query for all org refs
  const refQuery = orgRefs.map(ref => `"${ref}"`).join(' OR ')

  let start = 0
  let total = Infinity
  let retryCount = 0

  while (start < total) {
    // Request all fields we need (Datastore has everything except sector_percentage)
    const fields = [
      'iati_identifier',
      'title_narrative',
      'description_narrative',
      'activity_status_code',
      'hierarchy',
      'default_currency',
      // Dates
      'activity_date_type',
      'activity_date_iso_date',
      // Countries (with percentages!)
      'recipient_country_code',
      'recipient_country_percentage',
      // Sectors (no percentages in Datastore)
      'sector_code',
      'sector_vocabulary',
      'sector_narrative',
      // Transactions
      'transaction_transaction_type_code',
      'transaction_transaction_date_iso_date',
      'transaction_value',
      'transaction_value_currency',
      'transaction_value_value_date',
      'transaction_description_narrative',
      'transaction_provider_org_narrative',
      'transaction_provider_org_ref',
      'transaction_receiver_org_narrative',
      'transaction_receiver_org_ref',
      // Participating orgs
      'participating_org_ref',
      'participating_org_narrative',
      'participating_org_role',
      'participating_org_type',
      // Budgets
      'budget_value',
      'budget_value_currency',
      'budget_period_start_iso_date',
      'budget_period_end_iso_date',
      'budget_type',
      'budget_status',
      'budget_value_value_date',
      // Locations
      'location_point_pos',
      'location_name_narrative',
      'location_description_narrative',
      'location_reach_code',
      'location_exactness_code',
      'location_location_class_code',
      'location_feature_designation_code',
      // DAC/CRS classification
      'collaboration_type_code',
      'default_aid_type_code',
      'default_finance_type_code',
      'default_flow_type_code',
      'default_tied_status_code',
      // Note: capital_spend and planned_disbursement fields are NOT indexed in IATI Datastore
      // They would need to be fetched from d-portal or raw XML if needed
      // Reporting org
      'reporting_org_ref',
      'reporting_org_narrative',
    ].join(',')

    const url = `${IATI_DATASTORE_BASE}?q=reporting_org_ref:(${encodeURIComponent(refQuery)})&rows=${PAGE_SIZE}&start=${start}&wt=json&fl=${encodeURIComponent(fields)}`

    if (start === 0) {
      console.log('[Fetch Org Activities] Datastore query:', url.substring(0, 200) + '...')
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
 * Mark which activities already exist in the local database.
 */
async function markExistingActivities(
  supabase: any,
  activities: ParsedActivity[]
): Promise<ParsedActivity[]> {
  if (activities.length === 0) return activities

  const iatiIds = activities
    .map(a => a.iatiIdentifier)
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

  return activities.map(a => ({
    ...a,
    matched: existingMap.has(a.iatiIdentifier),
    matchedActivityId: existingMap.get(a.iatiIdentifier) || undefined,
  }))
}
