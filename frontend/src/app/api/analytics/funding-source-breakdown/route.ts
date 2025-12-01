import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const sourceType = searchParams.get('sourceType') || 'transactions' // 'transactions' or 'planned'
    const transactionType = searchParams.get('transactionType') // '1', '2', '3', '4', etc.

    console.log('[Funding Source Breakdown] Request params:', { dateFrom, dateTo, sourceType, transactionType })

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

      // Process planned disbursements with conversions
      for (const pd of plannedDisbursements || []) {
        const provider = pd.provider_org_name || pd.provider_org_ref || 'Unknown Provider'
        const receiver = pd.receiver_org_name || pd.receiver_org_ref || 'Unknown Receiver'

        // ONLY use USD values
        let amount = parseFloat(pd.usd_amount) || 0
        if (!amount && pd.currency === 'USD' && pd.amount) {
          amount = parseFloat(pd.amount) || 0
        }

        // Convert to USD if needed (for non-USD amounts without usd_amount)
        if (!amount && pd.amount && pd.currency && pd.currency !== 'USD') {
          try {
            const conversionDate = pd.period_start ? new Date(pd.period_start) : new Date()
            const result = await fixedCurrencyConverter.convertToUSD(
              parseFloat(pd.amount),
              pd.currency,
              conversionDate
            )
            if (result.success && result.usd_amount) {
              amount = result.usd_amount
            }
          } catch (error) {
            // Skip if conversion fails
            console.warn('[Funding Source Breakdown] Conversion failed for planned disbursement:', error)
          }
        }

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

      return NextResponse.json({
        providers: Object.entries(byOrg)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        receivers: Object.entries(byReceiver)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        flows
      })
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

      // Filter by transaction type if specified
      if (transactionType) {
        transactionsQuery = transactionsQuery.eq('transaction_type', transactionType)
      } else {
        // Default to incoming funds, commitments, and disbursements
        transactionsQuery = transactionsQuery.in('transaction_type', ['1', '2', '3', '11', '12'])
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

      // Process transactions with conversions
      for (const t of transactions || []) {
        // Use organization name from join, then denormalized name, then ref, then 'Unknown'
        const provider = t.provider_organization?.name || t.provider_org_name || t.provider_org_ref || 'Unknown Provider'
        const receiver = t.receiver_organization?.name || t.receiver_org_name || t.receiver_org_ref || 'Unknown Receiver'

        // ONLY use USD values
        let amount = parseFloat(t.value_usd) || 0
        if (!amount && t.currency === 'USD' && t.value) {
          amount = parseFloat(t.value) || 0
        }

        // Convert to USD if needed (for transactions without USD value)
        if (!amount && t.value && t.currency && t.currency !== 'USD') {
          try {
            const valueDate = t.value_date 
              ? new Date(t.value_date) 
              : t.transaction_date 
              ? new Date(t.transaction_date) 
              : new Date()
            
            const result = await fixedCurrencyConverter.convertToUSD(
              parseFloat(t.value),
              t.currency,
              valueDate
            )
            if (result.success && result.usd_amount) {
              amount = result.usd_amount
            }
          } catch (error) {
            // Skip if conversion fails
            console.warn('[Funding Source Breakdown] Conversion failed for transaction:', error)
          }
        }

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

      return NextResponse.json({
        providers: Object.entries(byOrg)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        receivers: Object.entries(byReceiver)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        flows: aggregatedFlowsArray
      })
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

