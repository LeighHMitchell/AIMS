import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkActivitySpending() {
  // First, list all activities to find the right one
  const { data: allActivities } = await supabase
    .from('activities')
    .select('id, iati_identifier, title')
    .limit(20)

  console.log('=== ALL ACTIVITIES ===')
  allActivities?.forEach((a: any) => {
    console.log(`${a.iati_identifier}`)
  })

  const iatiId = 'XM-DAC-46004-50218-002-GRNT0677'

  // Find the activity
  const { data: activity, error: actError } = await supabase
    .from('activities')
    .select('id, iati_identifier, title, default_currency')
    .eq('iati_identifier', iatiId)
    .single()

  if (actError || !activity) {
    console.log('\nActivity not found with exact match, trying partial match...')
    const { data: activities } = await supabase
      .from('activities')
      .select('id, iati_identifier, title')
      .ilike('iati_identifier', '%GRNT0677%')

    console.log('Found activities:', activities)

    if (!activities || activities.length === 0) {
      console.log('No activities found')
      return
    }

    // Use first match
    const matched = activities[0]
    const { data: act } = await supabase
      .from('activities')
      .select('id, iati_identifier, title, default_currency')
      .eq('id', matched.id)
      .single()

    if (act) {
      console.log('\nUsing activity:', act.iati_identifier)
      await analyzeActivity(act)
    }
    return
  }

  await analyzeActivity(activity)
}

async function analyzeActivity(activity: any) {

  console.log('Activity:', activity)

  // Get all transactions
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('activity_id', activity.id)

  if (txError) {
    console.error('Transaction error:', txError)
    return
  }

  console.log('\n=== TRANSACTIONS ===')
  console.log(`Total transactions: ${transactions?.length || 0}`)

  // Group by transaction type
  const byType: any = {}
  let totalUsd = 0
  let totalRaw = 0

  transactions?.forEach((t: any) => {
    if (!byType[t.transaction_type]) {
      byType[t.transaction_type] = {
        count: 0,
        usd_total: 0,
        raw_total: 0,
        currencies: new Set()
      }
    }

    const usdValue = parseFloat(t.usd_value || t.value_usd) || 0
    const rawValue = parseFloat(t.value) || 0

    byType[t.transaction_type].count++
    byType[t.transaction_type].usd_total += usdValue
    byType[t.transaction_type].raw_total += rawValue
    byType[t.transaction_type].currencies.add(t.currency)

    if (t.transaction_type === '3' || t.transaction_type === '4') {
      totalUsd += usdValue
      totalRaw += rawValue
    }
  })

  console.log('\nBy Transaction Type:')
  Object.entries(byType).forEach(([type, data]: [string, any]) => {
    const typeNames: any = {
      '1': 'Incoming Funds',
      '2': 'Outgoing Commitment',
      '3': 'Disbursement',
      '4': 'Expenditure',
      '11': 'Incoming Commitment'
    }
    console.log(`\n${typeNames[type] || `Type ${type}`}:`)
    console.log(`  Count: ${data.count}`)
    console.log(`  USD Total: $${data.usd_total.toLocaleString()}`)
    console.log(`  Raw Total: ${data.raw_total.toLocaleString()}`)
    console.log(`  Currencies: ${Array.from(data.currencies).join(', ')}`)
  })

  console.log('\n=== ACTUAL SPENDING (Disbursements + Expenditures) ===')
  console.log(`Total USD: $${totalUsd.toLocaleString()}`)
  console.log(`Total Raw: ${totalRaw.toLocaleString()}`)

  // Show some sample transactions with high values
  console.log('\n=== HIGH VALUE TRANSACTIONS ===')
  const highValue = transactions
    ?.filter((t: any) => parseFloat(t.value) > 1000000000)
    .sort((a: any, b: any) => parseFloat(b.value) - parseFloat(a.value))
    .slice(0, 10)

  highValue?.forEach((t: any) => {
    console.log(`\nType: ${t.transaction_type}`)
    console.log(`  Value: ${parseFloat(t.value).toLocaleString()} ${t.currency}`)
    console.log(`  USD Value: $${parseFloat(t.usd_value || t.value_usd || 0).toLocaleString()}`)
    console.log(`  Date: ${t.transaction_date}`)
  })
}

checkActivitySpending().catch(console.error)
