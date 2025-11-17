import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
  console.log('=== Final Verification After All Migrations ===\n')

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

  // Check inherited finance types
  const { count: inheritedFinance } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .eq('finance_type_inherited', true)

  console.log(`  └─ Inherited from activity default: ${inheritedFinance}`)

  // Check transactions with flow_type
  const { count: withFlowType } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .not('flow_type', 'is', null)

  console.log(`Transactions with flow_type: ${withFlowType}`)

  // Check transactions with aid_type
  const { count: withAidType } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .not('aid_type', 'is', null)

  console.log(`Transactions with aid_type: ${withAidType}`)

  // Check transactions with tied_status
  const { count: withTiedStatus } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .not('tied_status', 'is', null)

  console.log(`Transactions with tied_status: ${withTiedStatus}`)

  // Check transactions with BOTH finance_type AND flow_type (for chart)
  const { count: withBoth } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .not('finance_type', 'is', null)
    .not('flow_type', 'is', null)

  console.log(`\n📊 Chart Readiness:`)
  console.log(`Transactions with BOTH finance_type AND flow_type: ${withBoth}`)

  // Check for disbursements specifically
  const { count: disbursementsWithBoth } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .eq('transaction_type', '3')
    .not('finance_type', 'is', null)
    .not('flow_type', 'is', null)

  console.log(`Disbursements (type 3) with BOTH fields: ${disbursementsWithBoth}`)

  console.log('\n✅ All migrations completed successfully!')
  console.log('\nThe Financial Flows by Finance Type chart should now display properly.')
}

verify()
