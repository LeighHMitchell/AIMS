import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
  console.log('=== Verification After Migration ===\n')

  // Check total transactions
  const { count: totalCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')

  console.log(`Total actual transactions: ${totalCount}`)

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

  console.log(`\nTransactions with BOTH finance_type AND flow_type: ${withBoth}`)
  console.log('(This is what the Financial Flows chart needs)')

  // Check for disbursements specifically
  const { count: disbursementsWithBoth } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .eq('transaction_type', '3')
    .not('finance_type', 'is', null)
    .not('flow_type', 'is', null)

  console.log(`\nDisbursements (type 3) with BOTH fields: ${disbursementsWithBoth}`)

  console.log('\n✓ Verification complete!')
}

verify()
