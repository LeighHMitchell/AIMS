import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { resolveUserOrgScope, resolveOrgScopeById } from '@/lib/iati/org-scope'
import {
  fetchDatastorePage,
  mapDocsToActivities,
  markExistingActivities,
  parseFiltersFromParams,
  DATASTORE_PAGE_SIZE,
  RateLimitError,
} from '@/lib/iati/datastore-helpers'
import { USER_ROLES } from '@/types/user'

const IATI_API_KEY = process.env.IATI_API_KEY || process.env.NEXT_PUBLIC_IATI_API_KEY

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/iati/fetch-org-activities/page
 *
 * Fetches a single page (up to 1000 activities) from the IATI Datastore.
 * Used by the frontend for paginated fetching of large organisations.
 *
 * Query params:
 *   page=0              — 0-indexed page number (required)
 *   organization_id=xxx — (Super users only) fetch for a specific organization
 *   country=MM          — Filter by country code
 *   country_filter_mode — 'activity' | 'transaction' | 'both'
 *   date_start=...      — Filter by start date
 *   date_end=...        — Filter by end date
 *   hierarchy=1         — Filter by hierarchy level
 */
export async function GET(request: NextRequest) {
  const { supabase, user, response: authResponse } = await requireAuth()
  if (authResponse) return authResponse
  if (!supabase || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams

    // Validate page parameter
    const pageParam = searchParams.get('page')
    if (pageParam == null) {
      return NextResponse.json({ error: 'Missing required parameter: page' }, { status: 400 })
    }
    const page = parseInt(pageParam, 10)
    if (isNaN(page) || page < 0) {
      return NextResponse.json({ error: 'Invalid page number' }, { status: 400 })
    }

    // Resolve org scope (same logic as main route)
    const requestedOrgId = searchParams.get('organization_id')

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = userData?.role || null
    const isSuperUser = userRole === USER_ROLES.SUPER_USER ||
                        userRole === 'admin' ||
                        userRole === 'super_user'

    let orgScope
    if (requestedOrgId && isSuperUser) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(requestedOrgId)) {
        return NextResponse.json({ error: 'Invalid organization ID format.' }, { status: 400 })
      }
      orgScope = await resolveOrgScopeById(supabase, requestedOrgId)
      if (!orgScope) {
        return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })
      }
    } else if (requestedOrgId && !isSuperUser) {
      return NextResponse.json(
        { error: 'You do not have permission to import for other organisations.' },
        { status: 403 }
      )
    } else {
      orgScope = await resolveUserOrgScope(supabase, user.id)
    }

    if (!orgScope) {
      return NextResponse.json(
        { error: 'Your user account is not assigned to an organisation.' },
        { status: 403 }
      )
    }

    if (orgScope.allRefs.length === 0) {
      return NextResponse.json({
        error: `${orgScope.organizationName} has no IATI identifiers configured.`,
      }, { status: 403 })
    }

    if (!IATI_API_KEY) {
      return NextResponse.json(
        { error: 'IATI API key not configured. Please contact your administrator.' },
        { status: 500 }
      )
    }

    // Parse filters
    const filters = parseFiltersFromParams(searchParams)

    // Fetch single page from IATI Datastore
    const { docs, numFound } = await fetchDatastorePage(orgScope.allRefs, filters, page, IATI_API_KEY)
    const totalPages = Math.ceil(numFound / DATASTORE_PAGE_SIZE)

    console.log(`[Fetch Page] Page ${page}/${totalPages - 1}: ${docs.length} docs (total: ${numFound})`)

    // Validate page is within range
    if (page > 0 && page >= totalPages) {
      return NextResponse.json({ error: `Page ${page} exceeds total pages (${totalPages})` }, { status: 400 })
    }

    // Map docs to ParsedActivity
    const activities = mapDocsToActivities(docs)

    // Mark existing activities in local DB
    let activitiesWithMatches = activities
    try {
      activitiesWithMatches = await markExistingActivities(supabase, activities)
    } catch (err) {
      console.warn('[Fetch Page] markExistingActivities failed (returning unmarked):', err)
    }

    return NextResponse.json({
      activities: activitiesWithMatches,
      page,
      totalPages,
      totalActivities: numFound,
      orgScope: {
        organizationId: orgScope.organizationId,
        organizationName: orgScope.organizationName,
        reportingOrgRef: orgScope.reportingOrgRef,
        allRefs: orgScope.allRefs,
      },
    })
  } catch (error) {
    console.error('[Fetch Page] Error:', error)

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: 15 },
        { status: 429, headers: { 'Retry-After': '15' } }
      )
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.toLowerCase().includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timed out fetching from IATI Datastore. Please try again.' },
          { status: 504 }
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch IATI activities page' },
      { status: 500 }
    )
  }
}
