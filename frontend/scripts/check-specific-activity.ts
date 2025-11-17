import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkActivity() {
  const iatiId = 'US-GOV-1-720BHA24GR00259'
  
  console.log('=== Checking Activity ===')
  console.log('IATI Identifier:', iatiId)
  console.log('')

  // Get the activity
  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .select('id, iati_identifier, default_finance_type, default_flow_type, default_aid_type, default_tied_status')
    .eq('iati_identifier', iatiId)
    .single()

  if (activityError) {
    console.error('Error fetching activity:', activityError)
    return
  }

  if (!activity) {
    console.log('Activity not found!')
    return
  }

  console.log('Activity Details:')
  console.log('  ID:', activity.id)
  console.log('  IATI Identifier:', activity.iati_identifier)
  console.log('  Default Finance Type:', activity.default_finance_type || 'NULL')
  console.log('  Default Flow Type:', activity.default_flow_type || 'NULL')
  console.log('  Default Aid Type:', activity.default_aid_type || 'NULL')
  console.log('  Default Tied Status:', activity.default_tied_status || 'NULL')
  console.log('')

  // Get transactions for this activity
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('uuid, transaction_type, finance_type, finance_type_inherited, flow_type, aid_type, tied_status, value, currency')
    .eq('activity_id', activity.id)

  if (transactionsError) {
    console.error('Error fetching transactions:', transactionsError)
    return
  }

  console.log('Transactions found:', transactions ? transactions.length : 0)
  console.log('')

  if (transactions && transactions.length > 0) {
    console.log('Transaction Details:')
    transactions.forEach((tx, index) => {
      console.log('')
      console.log('  Transaction', index + 1)
      console.log('    UUID:', tx.uuid)
      console.log('    Type:', tx.transaction_type)
      console.log('    Finance Type:', tx.finance_type || 'NULL')
      console.log('    Finance Type Inherited:', tx.finance_type_inherited)
      console.log('    Flow Type:', tx.flow_type || 'NULL')
      console.log('    Aid Type:', tx.aid_type || 'NULL')
      console.log('    Tied Status:', tx.tied_status || 'NULL')
      console.log('    Value:', tx.currency, tx.value)
    })
  }
}

checkActivity()
