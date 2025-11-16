import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkFinanceFlowTypes() {
  console.log('=== Checking Finance Type and Flow Type Data ===\n')

  // Check total transactions
  const { count: totalCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')

  console.log(`Total actual transactions: ${totalCount}`)

  // Check transactions with finance_type
  const { count: withFinanceType } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .not('finance_type', 'is', null)

  console.log(`Transactions with finance_type: ${withFinanceType}`)

  // Check transactions with flow_type
  const { count: withFlowType } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .not('flow_type', 'is', null)

  console.log(`Transactions with flow_type: ${withFlowType}`)

  // Check transactions with both
  const { count: withBoth } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .not('finance_type', 'is', null)
    .not('flow_type', 'is', null)

  console.log(`Transactions with BOTH finance_type AND flow_type: ${withBoth}`)

  // Get sample transactions with both fields
  const { data: samples } = await supabase
    .from('transactions')
    .select('id, transaction_type, finance_type, flow_type, value, value_usd, transaction_date')
    .eq('status', 'actual')
    .not('finance_type', 'is', null)
    .not('flow_type', 'is', null)
    .limit(5)

  console.log('\nSample transactions with both fields:')
  console.log(JSON.stringify(samples, null, 2))

  // Check unique finance_type values
  const { data: financeTypes } = await supabase
    .from('transactions')
    .select('finance_type')
    .eq('status', 'actual')
    .not('finance_type', 'is', null)

  const uniqueFinanceTypes = [...new Set(financeTypes?.map(t => t.finance_type))]
  console.log('\nUnique finance_type values in database:')
  console.log(uniqueFinanceTypes.sort())

  // Check unique flow_type values
  const { data: flowTypes } = await supabase
    .from('transactions')
    .select('flow_type')
    .eq('status', 'actual')
    .not('flow_type', 'is', null)

  const uniqueFlowTypes = [...new Set(flowTypes?.map(t => t.flow_type))]
  console.log('\nUnique flow_type values in database:')
  console.log(uniqueFlowTypes.sort())
}

checkFinanceFlowTypes()
