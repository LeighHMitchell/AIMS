import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'

/**
 * Unified Funding Over Time API
 * 
 * Blends multiple IATI-aligned data sources to provide a complete funding time series:
 * 
 * - Past years: Activity-level transactions (disbursements + expenditures) by provider org
 *   Data source: transactions table, aggregated by provider_org_id
 *   Data type: 'actual'
 * 
 * - Current year: Transaction totals year-to-date
 *   Data source: transactions table
 *   Data type: 'partial' (incomplete year)
 * 
 * - Future years: Organisation-level indicative budgets
 *   Data source: organization_funding_envelopes table
 *   Data type: 'indicative'
 * 
 * Transaction types included:
 * - '3' (Disbursement): Actual cash transferred
 * - '4' (Expenditure): Actual spend recorded
 * 
 * EXCLUDED: '2' (Commitment) - Not included in actuals to avoid
 * double-counting and ensure actual cash flow representation.
 * Commitments represent intent, not flow.
 * 
 * Attribution: Uses provider_org_id (not reporting_org_id) to align with
 * DAC-style flow attribution and avoid overcounting when organisations
 * report on behalf of others.
 */

interface FundingTimeSeriesPoint {
  organization_id: string
  organization_name: string
  organization_acronym: string | null
  year: number
  amount_usd: number
  data_source: 'transactions' | 'organization_budgets'
  data_type: 'actual' | 'partial' | 'indicative'
  transaction_count?: number
}

interface ApiResponse {
  data: FundingTimeSeriesPoint[]
  metadata: {
    currentYear: number
    organizationCount: number
    dataSourcesUsed: string[]
    note: string
  }
}

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
    const organizationIds = organizationIdsParam
      ? organizationIdsParam.split(',').filter(Boolean)
      : []

    const currentYear = new Date().getFullYear()
    const results: FundingTimeSeriesPoint[] = []

    // Track which organizations we need to fetch
    let targetOrgIds: string[] = organizationIds

    // If no specific orgs requested, get orgs that have either transactions or envelopes
    if (targetOrgIds.length === 0) {
      // Get orgs with funding envelopes
      const { data: envelopeOrgs } = await supabase
        .from('organization_funding_envelopes')
        .select('organization_id')
      
      // Get orgs that are providers on transactions (disbursements + expenditures)
      const { data: transactionOrgs } = await supabase
        .from('transactions')
        .select('provider_org_id')
        .in('transaction_type', ['3', '4'])
        .not('provider_org_id', 'is', null)

      const orgSet = new Set<string>()
      envelopeOrgs?.forEach((e: any) => e.organization_id && orgSet.add(e.organization_id))
      transactionOrgs?.forEach((t: any) => t.provider_org_id && orgSet.add(t.provider_org_id))
      targetOrgIds = Array.from(orgSet)
    }

    if (targetOrgIds.length === 0) {
      return NextResponse.json({
        data: [],
        metadata: {
          currentYear,
          organizationCount: 0,
          dataSourcesUsed: [],
          note: 'No organizations with funding data found.'
        }
      } as ApiResponse)
    }

    // Fetch organization details
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name, acronym')
      .in('id', targetOrgIds)

    const orgMap = new Map<string, { name: string; acronym: string | null }>()
    organizations?.forEach((org: any) => {
      orgMap.set(org.id, { name: org.name, acronym: org.acronym })
    })

    // ============================================
    // PAST YEARS + CURRENT YEAR: Activity Transactions
    // Aggregate disbursements (type 3) and expenditures (type 4) by provider org and year
    // ============================================
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('provider_org_id, provider_org_name, transaction_type, transaction_date, value_usd, value')
      .in('transaction_type', ['3', '4']) // Disbursements and Expenditures only
      .not('provider_org_id', 'is', null)
      .in('provider_org_id', targetOrgIds)

    if (txError) {
      console.error('[Funding Over Time] Transaction query error:', txError)
    }

    // Aggregate transactions by org and year
    // Also track organization names from transactions as fallback
    const txAggregation = new Map<string, {
      amount_usd: number
      count: number
      org_name: string | null
    }>()

    transactions?.forEach((tx: any) => {
      if (!tx.transaction_date || !tx.provider_org_id) return
      
      const txDate = new Date(tx.transaction_date)
      if (isNaN(txDate.getTime())) return // Skip invalid dates
      
      const year = txDate.getFullYear()
      const key = `${tx.provider_org_id}-${year}`
      const value = parseFloat(tx.value_usd) || parseFloat(tx.value) || 0

      if (!txAggregation.has(key)) {
        txAggregation.set(key, { amount_usd: 0, count: 0, org_name: tx.provider_org_name || null })
      }
      
      const agg = txAggregation.get(key)!
      agg.amount_usd += value
      agg.count++
      // Update org_name if we have it and don't have one yet
      if (tx.provider_org_name && !agg.org_name) {
        agg.org_name = tx.provider_org_name
      }
    })

    // Convert transaction aggregations to results
    txAggregation.forEach((agg, key) => {
      const parts = key.split('-')
      const orgId = parts.slice(0, -1).join('-') // Handle UUIDs with dashes
      const yearStr = parts[parts.length - 1]
      const year = parseInt(yearStr, 10)
      
      if (isNaN(year)) return

      // Get organization info from orgMap, or use fallback from transaction
      const org = orgMap.get(orgId)
      const orgName = org?.name || agg.org_name || 'Unknown Organization'
      const orgAcronym = org?.acronym || null

      // Determine data_type based on year relative to current year
      // Past years = actual, current year = partial (YTD)
      // Future transactions shouldn't exist but handle gracefully
      let dataType: 'actual' | 'partial' | 'indicative' = 'actual'
      if (year === currentYear) {
        dataType = 'partial' // Current year is year-to-date
      } else if (year > currentYear) {
        // Future transactions are unusual but treat as partial
        return // Skip future-dated transactions
      }

      results.push({
        organization_id: orgId,
        organization_name: orgName,
        organization_acronym: orgAcronym,
        year,
        amount_usd: agg.amount_usd,
        data_source: 'transactions',
        data_type: dataType,
        transaction_count: agg.count
      })
    })

    // ============================================
    // FUTURE YEARS: Organisation-level Indicative Budgets
    // Only include years strictly after current year
    // ============================================
    const { data: envelopes, error: envError } = await supabase
      .from('organization_funding_envelopes')
      .select(`
        organization_id,
        year_start,
        year_end,
        amount_usd,
        amount,
        period_type
      `)
      .gt('year_start', currentYear) // Only future years
      .in('organization_id', targetOrgIds)

    if (envError) {
      console.error('[Funding Over Time] Envelope query error:', envError)
    }

    // Process envelopes for future years
    envelopes?.forEach((envelope: any) => {
      const org = orgMap.get(envelope.organization_id)
      if (!org) return

      const amount = parseFloat(envelope.amount_usd) || parseFloat(envelope.amount) || 0

      if (envelope.period_type === 'single_year' || !envelope.year_end) {
        // Single year entry
        results.push({
          organization_id: envelope.organization_id,
          organization_name: org.name,
          organization_acronym: org.acronym,
          year: envelope.year_start,
          amount_usd: amount,
          data_source: 'organization_budgets',
          data_type: 'indicative'
        })
      } else {
        // Multi-year: create entry for each year in range (only future years)
        for (let year = envelope.year_start; year <= envelope.year_end; year++) {
          if (year > currentYear) {
            results.push({
              organization_id: envelope.organization_id,
              organization_name: org.name,
              organization_acronym: org.acronym,
              year,
              amount_usd: amount, // Full amount per year (could divide if needed)
              data_source: 'organization_budgets',
              data_type: 'indicative'
            })
          }
        }
      }
    })

    // Aggregate results by org+year (in case of multiple entries from different sources)
    const finalAggregation = new Map<string, FundingTimeSeriesPoint>()
    
    results.forEach(point => {
      const key = `${point.organization_id}-${point.year}`
      
      if (!finalAggregation.has(key)) {
        finalAggregation.set(key, { ...point })
      } else {
        const existing = finalAggregation.get(key)!
        existing.amount_usd += point.amount_usd
        if (point.transaction_count) {
          existing.transaction_count = (existing.transaction_count || 0) + point.transaction_count
        }
        // If merging transaction data with envelope data for same year, prioritize transaction source
        if (point.data_source === 'transactions') {
          existing.data_source = 'transactions'
          existing.data_type = point.data_type
        }
      }
    })

    // Convert to array and sort
    const finalResults = Array.from(finalAggregation.values())
      .sort((a, b) => {
        const orgCompare = a.organization_name.localeCompare(b.organization_name)
        if (orgCompare !== 0) return orgCompare
        return a.year - b.year
      })

    // Determine which data sources were actually used
    const dataSourcesUsed = new Set<string>()
    finalResults.forEach(r => dataSourcesUsed.add(r.data_source))

    const response: ApiResponse = {
      data: finalResults,
      metadata: {
        currentYear,
        organizationCount: orgMap.size,
        dataSourcesUsed: Array.from(dataSourcesUsed),
        note: 'Past years aggregated from activity transactions (disbursements + expenditures). Current year shows year-to-date totals. Future years from organisation-level indicative budgets.'
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Funding Over Time] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



