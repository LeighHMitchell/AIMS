import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDetails() {
  console.log('=== Detailed Check ===\n')

  // Get transactions with disbursement type (type 3)
  const { data: disbursements, error } = await supabase
    .from('transactions')
    .select('id, transaction_type, finance_type, flow_type, value, value_usd, transaction_date')
    .eq('status', 'actual')
    .eq('transaction_type', '3')
    .not('finance_type', 'is', null)
    .not('flow_type', 'is', null)
    .limit(10)

  console.log('Disbursements with both finance_type and flow_type:')
  console.log(JSON.stringify(disbursements, null, 2))
  console.log('\nError:', error)
  console.log('\nCount:', disbursements ? disbursements.length : 0)

  // Check all disbursements
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .eq('transaction_type', '3')

  console.log('\nTotal disbursement transactions:', count)

  // Check disbursements with finance_type
  const { count: withFinance } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .eq('transaction_type', '3')
    .not('finance_type', 'is', null)

  console.log('Disbursements with finance_type:', withFinance)

  // Check disbursements with flow_type
  const { count: withFlow } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actual')
    .eq('transaction_type', '3')
    .not('flow_type', 'is', null)

  console.log('Disbursements with flow_type:', withFlow)
}

checkDetails()
