import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Simple in-memory cache for analytics data
interface CacheEntry {
  data: any
  expiresAt: number
}
const fundingSourceCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached(key: string): any | null {
  const entry = fundingSourceCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    fundingSourceCache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: any): void {
  fundingSourceCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL
  })
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const sourceType = searchParams.get('sourceType') || 'transactions' // 'transactions' or 'planned'
    const transactionTypesParam = searchParams.get('transactionTypes') // comma-separated: '1,2,3,4'
    const transactionTypes = transactionTypesParam 
      ? transactionTypesParam.split(',').filter(Boolean) 
      : []

    // Check cache first
    const cacheKey = `funding-source:${dateFrom}:${dateTo}:${sourceType}:${transactionTypes.join(',')}`
    const cached = getCached(cacheKey)
    if (cached) {
      console.log('[Funding Source Breakdown] Returning cached data')
      return NextResponse.json(cached)
    }

    console.log('[Funding Source Breakdown] Request params:', { dateFrom, dateTo, sourceType, transactionTypes })

    if (sourceType === 'planned') {
      // Fetch planned disbursements for all activities
      let plannedQuery = supabase
        .from('planned_disbursements')
        .select(`
          id,
          amount,
          currency,
          usd_amount,
          period_start,
          period_end,
          provider_org_name,
          provider_org_ref,
          receiver_org_name,
          receiver_org_ref
        `)

      // Apply date range filter
      if (dateFrom) {
        plannedQuery = plannedQuery.gte('period_start', dateFrom)
      }
      if (dateTo) {
        plannedQuery = plannedQuery.lte('period_end', dateTo)
      }

      const { data: plannedDisbursements, error: plannedError } = await plannedQuery

      if (plannedError) {
        console.error('[Funding Source Breakdown] Error fetching planned disbursements:', plannedError)
        return NextResponse.json(
          { error: `Failed to fetch planned disbursements: ${plannedError.message || 'Unknown error'}` },
          { status: 500 }
        )
      }

      // Group by provider and receiver
      const byOrg: { [key: string]: number } = {}
      const byReceiver: { [key: string]: number } = {}
      const flowsMap = new Map<string, number>() // Key: "provider|||receiver"

      // Process planned disbursements - use only USD-converted values, no fallback
      for (const pd of plannedDisbursements || []) {
        const provider = pd.provider_org_name || pd.provider_org_ref || 'Unknown Provider'
        const receiver = pd.receiver_org_name || pd.receiver_org_ref || 'Unknown Receiver'

        // Use only stored USD values - no fallback to original currency
        const amount = parseFloat(pd.usd_amount) || 0

        if (amount > 0) {
          byOrg[provider] = (byOrg[provider] || 0) + amount
          byReceiver[receiver] = (byReceiver[receiver] || 0) + amount
          
          // Aggregate flows by provider-receiver pair
          const flowKey = `${provider}|||${receiver}`
          flowsMap.set(flowKey, (flowsMap.get(flowKey) || 0) + amount)
        }
      }

      // Convert flows map to array
      const flows = Array.from(flowsMap.entries()).map(([key, value]) => {
        const [provider, receiver] = key.split('|||')
        return { provider, receiver, value }
      })

      console.log(`[Funding Source Breakdown] Planned: ${plannedDisbursements?.length || 0} records, ${flows.length} flows`)

      const result = {
        providers: Object.entries(byOrg)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        receivers: Object.entries(byReceiver)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        flows
      }
      
      // Cache the result
      setCache(cacheKey, result)
      
      return NextResponse.json(result)
    } else {
      // Fetch transactions for all activities
      let transactionsQuery = supabase
        .from('transactions')
        .select(`
          uuid,
          value,
          currency,
          value_usd,
          value_date,
          transaction_date,
          transaction_type,
          provider_org_id,
          provider_org_ref,
          provider_org_name,
          receiver_org_id,
          receiver_org_ref,
          receiver_org_name,
          provider_organization:organizations!provider_org_id(name),
          receiver_organization:organizations!receiver_org_id(name)
        `)
        .eq('status', 'actual')

      // Filter by transaction types if specified
      if (transactionTypes.length > 0) {
        transactionsQuery = transactionsQuery.in('transaction_type', transactionTypes)
      } else {
        // Default to all IATI transaction types
        transactionsQuery = transactionsQuery.in('transaction_type', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '12', '13'])
      }

      // Apply date range filter
      if (dateFrom) {
        transactionsQuery = transactionsQuery.gte('transaction_date', dateFrom)
      }
      if (dateTo) {
        transactionsQuery = transactionsQuery.lte('transaction_date', dateTo)
      }

      const { data: transactions, error: transactionsError } = await transactionsQuery

      if (transactionsError) {
        console.error('[Funding Source Breakdown] Error fetching transactions:', transactionsError)
        return NextResponse.json(
          { error: `Failed to fetch transactions: ${transactionsError.message || 'Unknown error'}` },
          { status: 500 }
        )
      }

      // Group by provider and receiver
      const byOrg: { [key: string]: number } = {}
      const byReceiver: { [key: string]: number } = {}
      const flowsMap = new Map<string, number>() // Key: "provider|||receiver"

      // Process transactions - use only USD-converted values, no fallback
      for (const t of transactions || []) {
        // Use organization name from join, then denormalized name, then ref, then 'Unknown'
        const provider = t.provider_organization?.name || t.provider_org_name || t.provider_org_ref || 'Unknown Provider'
        const receiver = t.receiver_organization?.name || t.receiver_org_name || t.receiver_org_ref || 'Unknown Receiver'

        // Use only stored USD values - no fallback to original currency
        const amount = parseFloat(t.value_usd) || 0

        if (amount > 0) {
          byOrg[provider] = (byOrg[provider] || 0) + amount
          byReceiver[receiver] = (byReceiver[receiver] || 0) + amount
          
          // Aggregate flows by provider-receiver pair
          const flowKey = `${provider}|||${receiver}`
          flowsMap.set(flowKey, (flowsMap.get(flowKey) || 0) + amount)
        }
      }

      // Convert flows map to array
      const aggregatedFlowsArray = Array.from(flowsMap.entries()).map(([key, value]) => {
        const [provider, receiver] = key.split('|||')
        return { provider, receiver, value }
      })

      console.log(`[Funding Source Breakdown] Transactions: ${transactions?.length || 0} records, ${aggregatedFlowsArray.length} flows`)

      const result = {
        providers: Object.entries(byOrg)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        receivers: Object.entries(byReceiver)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        flows: aggregatedFlowsArray
      }
      
      // Cache the result
      setCache(cacheKey, result)
      
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('[Funding Source Breakdown] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

