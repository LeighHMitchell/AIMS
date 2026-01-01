import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { FLOW_TYPES } from '@/utils/transactionMigrationHelper'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// IATI Finance Types
const FINANCE_TYPES: Record<string, string> = {
  "110": "Aid grant excluding debt reorganisation",
  "111": "Aid grant excluding debt reorganisation, excluding import support",
  "210": "Standard grant",
  "211": "Subsidies to national private investors",
  "212": "Subsidies to national private investors, including loans to national private investors",
  "220": "Capital subscription on deposit basis",
  "230": "Capital subscription on encashment basis",
  "310": "Loan excluding debt reorganisation",
  "311": "Loan excluding debt reorganisation, excluding import support",
  "320": "Loan in a joint venture with the recipient",
  "410": "Aid loan excluding debt reorganisation",
  "411": "Aid loan excluding debt reorganisation, excluding import support",
  "421": "Standard loan",
  "422": "Reimbursable grant",
  "423": "Bonds",
  "424": "Asset-backed securities",
  "425": "Other debt securities",
  "510": "Common equity",
  "520": "Non-bank guaranteed export credits",
  "530": "Foreign direct investment, new capital",
  "531": "Foreign direct investment, addition to reserves",
  "610": "Debt forgiveness: OOF claims (P)",
  "620": "Debt forgiveness: OOF claims (I)",
  "630": "Debt forgiveness: Private claims (P)",
  "631": "Debt forgiveness: Private claims (I)"
}

// Simple in-memory cache
interface CacheEntry {
  data: any
  expiresAt: number
}
const financeTypeFlowCache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached(key: string): any | null {
  const entry = financeTypeFlowCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    financeTypeFlowCache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: any): void {
  financeTypeFlowCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL
  })
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    
    // Check cache first
    const cacheKey = `finance-type-flow:${dateFrom}:${dateTo}`
    const cached = getCached(cacheKey)
    if (cached) {
      console.log('[FinanceTypeFlowData API] Returning cached data')
      return NextResponse.json(cached)
    }

    console.log('[FinanceTypeFlowData API] Fetching data with params:', { dateFrom, dateTo })

    // Build transactions query with activity defaults join
    let query = supabase
      .from('transactions')
      .select(`
        transaction_date,
        finance_type,
        flow_type,
        value,
        value_usd,
        currency,
        transaction_type,
        activity_id,
        activities!transactions_activity_id_fkey1 (
          default_finance_type,
          default_flow_type
        )
      `)
      .eq('status', 'actual')
      .order('transaction_date', { ascending: true })

    // Apply date range filter
    if (dateFrom) {
      query = query.gte('transaction_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('transaction_date', dateTo)
    }

    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) {
      console.error('[FinanceTypeFlowData API] Error fetching transactions:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch transaction data' },
        { status: 500 }
      )
    }

    // Process transactions to extract relevant data
    const processedData: Array<{
      year: number
      flowType: string
      financeType: string
      transactionType: string
      value: number
      date: string
    }> = []

    const uniqueFlowTypes = new Set<string>()
    const uniqueFinanceTypes = new Set<string>()

    for (const t of transactions || []) {
      // Try value_usd first, then fall back to raw value
      let value = parseFloat(String(t.value_usd)) || 0
      if (!value && t.value) {
        value = parseFloat(String(t.value)) || 0
      }
      if (!value) continue

      // Get activity defaults
      const activityDefaults = t.activities || {}

      // Use transaction value if set, otherwise fall back to activity default
      const effectiveFinanceType = t.finance_type || activityDefaults.default_finance_type
      const effectiveFlowType = t.flow_type || activityDefaults.default_flow_type

      // Skip if we don't have both finance_type and flow_type
      if (!effectiveFinanceType || !effectiveFlowType) continue

      const financeType = String(effectiveFinanceType)
      const flowType = String(effectiveFlowType)
      const transactionType = String(t.transaction_type || 'Unknown')

      // Extract year from transaction_date
      const date = t.transaction_date
      const year = new Date(date).getFullYear()

      uniqueFlowTypes.add(flowType)
      uniqueFinanceTypes.add(financeType)

      processedData.push({
        year,
        flowType,
        financeType,
        transactionType,
        value,
        date
      })
    }

    // Build flow types array (only those present in data)
    const flowTypes = Object.entries(FLOW_TYPES)
      .filter(([code]) => uniqueFlowTypes.has(code))
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code))

    // Build finance types array (only those present in data)
    const financeTypes = Object.entries(FINANCE_TYPES)
      .filter(([code]) => uniqueFinanceTypes.has(code))
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code))

    const result = {
      transactions: processedData,
      flowTypes,
      financeTypes,
      totalCount: processedData.length
    }

    // Cache the result
    setCache(cacheKey, result)
    console.log('[FinanceTypeFlowData API] Cached result with', processedData.length, 'transactions')

    return NextResponse.json(result)

  } catch (error) {
    console.error('[FinanceTypeFlowData API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

