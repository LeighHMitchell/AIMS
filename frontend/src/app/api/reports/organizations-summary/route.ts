import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Organization type mapping
const ORG_TYPE_MAP: Record<string, string> = {
  '10': 'Government',
  '11': 'Local Government',
  '15': 'Other Public Sector',
  '21': 'International NGO',
  '22': 'National NGO',
  '23': 'Regional NGO',
  '24': 'Partner Country based NGO',
  '30': 'Public Private Partnership',
  '40': 'Multilateral',
  '60': 'Foundation',
  '70': 'Private Sector',
  '71': 'Private Sector in Provider Country',
  '72': 'Private Sector in Aid Recipient Country',
  '73': 'Private Sector in Third Country',
  '80': 'Academic, Training and Research',
  '90': 'Other',
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Fetch all organizations
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, acronym, type, iati_org_id')
      .order('name', { ascending: true })

    if (orgsError) {
      console.error('[Reports API] Error fetching organizations:', orgsError)
      return NextResponse.json(
        { error: 'Failed to fetch organizations', details: orgsError.message },
        { status: 500 }
      )
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({ data: [], error: null })
    }

    const orgIds = organizations.map(o => o.id)

    // Fetch activities where org is reporting org
    const { data: activities } = await supabase
      .from('activities')
      .select('id, reporting_org_id, activity_status')
      .in('reporting_org_id', orgIds)

    // Fetch budgets for activities
    const activityIds = activities?.map(a => a.id) || []
    const { data: budgets } = activityIds.length > 0
      ? await supabase
          .from('activity_budgets')
          .select('activity_id, value')
          .in('activity_id', activityIds)
      : { data: [] }

    // Fetch transactions as provider
    const { data: transactions } = await supabase
      .from('transactions')
      .select('provider_org_id, transaction_type, value_usd')
      .in('provider_org_id', orgIds)

    // Build activity counts and budget totals by org
    const activityCountByOrg = new Map<string, number>()
    const activeActivityCountByOrg = new Map<string, number>()
    const activityIdsByOrg = new Map<string, string[]>()
    
    activities?.forEach(a => {
      if (!a.reporting_org_id) return
      
      activityCountByOrg.set(
        a.reporting_org_id,
        (activityCountByOrg.get(a.reporting_org_id) || 0) + 1
      )
      
      // Active = status '2' (Implementation)
      if (a.activity_status === '2') {
        activeActivityCountByOrg.set(
          a.reporting_org_id,
          (activeActivityCountByOrg.get(a.reporting_org_id) || 0) + 1
        )
      }
      
      const ids = activityIdsByOrg.get(a.reporting_org_id) || []
      ids.push(a.id)
      activityIdsByOrg.set(a.reporting_org_id, ids)
    })

    // Budget totals by activity
    const budgetByActivity = new Map<string, number>()
    budgets?.forEach(b => {
      budgetByActivity.set(
        b.activity_id,
        (budgetByActivity.get(b.activity_id) || 0) + (b.value || 0)
      )
    })

    // Calculate total budget by org
    const budgetByOrg = new Map<string, number>()
    activityIdsByOrg.forEach((actIds, orgId) => {
      let total = 0
      actIds.forEach(actId => {
        total += budgetByActivity.get(actId) || 0
      })
      budgetByOrg.set(orgId, total)
    })

    // Calculate disbursement totals by org
    const disbursementByOrg = new Map<string, number>()
    transactions?.forEach(t => {
      if (!t.provider_org_id) return
      if (t.transaction_type === '3' || t.transaction_type === '4') {
        disbursementByOrg.set(
          t.provider_org_id,
          (disbursementByOrg.get(t.provider_org_id) || 0) + (t.value_usd || 0)
        )
      }
    })

    // Transform data for export
    const reportData = organizations.map(org => ({
      organization_name: org.acronym || org.name,
      organization_type: org.type ? (ORG_TYPE_MAP[org.type] || org.type) : '',
      iati_ref: org.iati_org_id || '',
      active_activities: activeActivityCountByOrg.get(org.id) || 0,
      total_budget: Math.round(budgetByOrg.get(org.id) || 0),
      total_disbursed: Math.round(disbursementByOrg.get(org.id) || 0),
    }))
    .filter(org => org.active_activities > 0 || org.total_budget > 0 || org.total_disbursed > 0)
    .sort((a, b) => b.total_disbursed - a.total_disbursed)

    const response = NextResponse.json({ data: reportData, error: null })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response

  } catch (error) {
    console.error('[Reports API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}



