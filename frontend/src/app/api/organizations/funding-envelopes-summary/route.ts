import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'

/**
 * GET - List organizations that have funding envelope data
 * Returns organizations with their funding envelope counts and summary statistics
 */
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Query organizations that have funding envelopes
    const { data, error } = await supabase
      .from('organization_funding_envelopes')
      .select(`
        organization_id,
        organizations (
          id,
          name,
          acronym,
          Organisation_Type_Code,
          country,
          country_represented
        ),
        year_start,
        year_end,
        amount_usd,
        status,
        organization_role
      `)

    if (error) {
      console.error('[Funding Envelopes Summary] Error fetching:', error)
      return NextResponse.json(
        { error: 'Failed to fetch funding envelope data' },
        { status: 500 }
      )
    }

    // Group by organization and calculate statistics
    const orgMap = new Map<string, {
      id: string
      name: string
      acronym: string | null
      Organisation_Type_Code: string | null
      country: string | null
      country_represented: string | null
      envelope_count: number
      earliest_year: number
      latest_year: number
      total_amount_usd: number
      statuses: Set<string>
      roles: Set<string>
    }>()

    data?.forEach((envelope: any) => {
      const org = envelope.organizations
      if (!org) return

      const orgId = org.id
      if (!orgMap.has(orgId)) {
        orgMap.set(orgId, {
          id: orgId,
          name: org.name,
          acronym: org.acronym,
          Organisation_Type_Code: org.Organisation_Type_Code,
          country: org.country,
          country_represented: org.country_represented,
          envelope_count: 0,
          earliest_year: Infinity,
          latest_year: -Infinity,
          total_amount_usd: 0,
          statuses: new Set(),
          roles: new Set()
        })
      }

      const orgData = orgMap.get(orgId)!
      orgData.envelope_count++
      
      if (envelope.year_start && envelope.year_start < orgData.earliest_year) {
        orgData.earliest_year = envelope.year_start
      }
      
      const endYear = envelope.year_end || envelope.year_start
      if (endYear && endYear > orgData.latest_year) {
        orgData.latest_year = endYear
      }
      
      if (envelope.amount_usd) {
        orgData.total_amount_usd += parseFloat(String(envelope.amount_usd))
      }
      
      if (envelope.status) {
        orgData.statuses.add(envelope.status)
      }
      
      if (envelope.organization_role) {
        orgData.roles.add(envelope.organization_role)
      }
    })

    // Convert to array and format
    const organizations = Array.from(orgMap.values())
      .map(org => ({
        ...org,
        earliest_year: org.earliest_year === Infinity ? null : org.earliest_year,
        latest_year: org.latest_year === -Infinity ? null : org.latest_year,
        statuses: Array.from(org.statuses),
        roles: Array.from(org.roles),
        total_amount_usd: org.total_amount_usd || null
      }))
      .sort((a, b) => b.envelope_count - a.envelope_count || a.name.localeCompare(b.name))

    return NextResponse.json({
      organizations,
      total: organizations.length
    })
  } catch (error) {
    console.error('[Funding Envelopes Summary] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




