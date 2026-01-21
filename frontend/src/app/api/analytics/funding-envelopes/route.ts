import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'

/**
 * GET - Fetch funding envelope data for analytics visualization
 * Query parameters:
 * - organizationIds: Comma-separated UUIDs (optional, if not provided returns all)
 * Returns: Array of funding envelope data grouped by year and organization
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const organizationIdsParam = searchParams.get('organizationIds')

    // Parse organization IDs if provided
    const organizationIds = organizationIdsParam
      ? organizationIdsParam.split(',').filter(Boolean)
      : []

    // Build query for funding envelopes
    let query = supabase
      .from('organization_funding_envelopes')
      .select(`
        id,
        organization_id,
        year_start,
        year_end,
        amount,
        currency,
        amount_usd,
        status,
        period_type,
        organizations (
          id,
          name,
          acronym
        )
      `)
      .order('year_start', { ascending: true })

    // Filter by organization IDs if provided
    if (organizationIds.length > 0) {
      query = query.in('organization_id', organizationIds)
    }

    const { data: envelopes, error } = await query

    if (error) {
      console.error('[Funding Envelopes Analytics] Error fetching:', error)
      return NextResponse.json(
        { error: 'Failed to fetch funding envelope data' },
        { status: 500 }
      )
    }

    if (!envelopes || envelopes.length === 0) {
      return NextResponse.json([])
    }

    const currentYear = new Date().getFullYear()

    // Transform data to year-by-year format
    const yearDataMap = new Map<string, {
      organization_id: string
      organization_name: string
      organization_acronym: string | null
      year: number
      amount: number
      amount_usd: number
      currency: string
      status: string
      category: 'past' | 'current' | 'future'
    }>()

    envelopes.forEach((envelope: any) => {
      const org = envelope.organizations
      if (!org) return

      const amount = envelope.amount_usd || envelope.amount || 0
      // Determine category based on year vs current year
      const endYear = envelope.year_end || envelope.year_start
      let category: 'past' | 'current' | 'future' = 'past'
      if (endYear < currentYear) {
        category = 'past'
      } else if (envelope.year_start <= currentYear && endYear >= currentYear) {
        category = 'current'
      } else {
        category = 'future'
      }

      // Handle single year vs multi-year
      if (envelope.period_type === 'single_year' || !envelope.year_end) {
        const key = `${envelope.organization_id}-${envelope.year_start}`
        if (!yearDataMap.has(key)) {
          yearDataMap.set(key, {
            organization_id: envelope.organization_id,
            organization_name: org.name,
            organization_acronym: org.acronym,
            year: envelope.year_start,
            amount: envelope.amount || 0,
            amount_usd: envelope.amount_usd || envelope.amount || 0,
            currency: envelope.currency || 'USD',
            status: envelope.status,
            category: category as 'past' | 'current' | 'future'
          })
        } else {
          // If multiple envelopes for same org/year, sum them
          const existing = yearDataMap.get(key)!
          existing.amount += envelope.amount || 0
          existing.amount_usd += envelope.amount_usd || envelope.amount || 0
        }
      } else {
        // Multi-year: create entry for each year in range
        for (let year = envelope.year_start; year <= envelope.year_end; year++) {
          const key = `${envelope.organization_id}-${year}`
          if (!yearDataMap.has(key)) {
            yearDataMap.set(key, {
              organization_id: envelope.organization_id,
              organization_name: org.name,
              organization_acronym: org.acronym,
              year: year,
              amount: envelope.amount || 0,
              amount_usd: envelope.amount_usd || envelope.amount || 0,
              currency: envelope.currency || 'USD',
              status: envelope.status,
              category: category as 'past' | 'current' | 'future'
            })
          } else {
            const existing = yearDataMap.get(key)!
            existing.amount += envelope.amount || 0
            existing.amount_usd += envelope.amount_usd || envelope.amount || 0
          }
        }
      }
    })

    // Convert to array and sort
    const result = Array.from(yearDataMap.values())
      .sort((a, b) => {
        // Sort by organization name, then by year
        const orgCompare = a.organization_name.localeCompare(b.organization_name)
        if (orgCompare !== 0) return orgCompare
        return a.year - b.year
      })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Funding Envelopes Analytics] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



