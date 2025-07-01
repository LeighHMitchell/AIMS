import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection unavailable' }, { status: 503 })
    }
    
    // Check transactions with org data
    const { data: transactionSample, error: transError } = await supabase
      .from('transactions')
      .select('id, transaction_type, value, provider_org_id, receiver_org_id, provider_org_name, receiver_org_name, aid_type, flow_type')
      .not('value', 'is', null)
      .order('value', { ascending: false })
      .limit(10)
    
    if (transError) {
      console.error('[Test Aid Flow] Error fetching transactions:', transError)
    }
    
    // Count transactions by type
    const { data: transactionStats } = await supabase
      .from('transactions')
      .select('transaction_type')
      .not('value', 'is', null)
    
    const typeCount = transactionStats?.reduce((acc: any, t: any) => {
      acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1
      return acc
    }, {}) || {}
    
    // Check how many have org IDs vs names
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('provider_org_id, receiver_org_id, provider_org_name, receiver_org_name, value')
      .not('value', 'is', null)
      .limit(1000)
    
    const stats = {
      total: allTransactions?.length || 0,
      withProviderIds: allTransactions?.filter((t: any) => t.provider_org_id).length || 0,
      withReceiverIds: allTransactions?.filter((t: any) => t.receiver_org_id).length || 0,
      withProviderNames: allTransactions?.filter((t: any) => t.provider_org_name).length || 0,
      withReceiverNames: allTransactions?.filter((t: any) => t.receiver_org_name).length || 0,
      withBothIds: allTransactions?.filter((t: any) => t.provider_org_id && t.receiver_org_id).length || 0,
      withBothNames: allTransactions?.filter((t: any) => t.provider_org_name && t.receiver_org_name).length || 0,
      largeTransactions: allTransactions?.filter((t: any) => parseFloat(t.value) > 10000).length || 0
    }
    
    // Get organizations count
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
    
    // Sample organization
    const { data: orgSample } = await supabase
      .from('organizations')
      .select('id, name, acronym, organization_type')
      .limit(5)
    
    return NextResponse.json({
      summary: {
        transactionCount: stats.total,
        organizationCount: orgCount || 0,
        transactionTypes: typeCount
      },
      transactionDataQuality: stats,
      sampleTransactions: transactionSample || [],
      sampleOrganizations: orgSample || [],
      recommendation: stats.withBothIds < 10 
        ? 'Most transactions lack organization IDs. The visualization will attempt to use organization names instead.'
        : 'Transactions have organization IDs and should visualize properly.'
    })
  } catch (error) {
    console.error('[Test Aid Flow] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to diagnose aid flow data' }, { status: 500 })
  }
} 