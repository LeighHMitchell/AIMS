/**
 * Script to check why a specific transaction is not appearing in Funding Over Time chart
 * Usage: npx tsx scripts/check-transaction-funding-over-time.ts
 */

import { getSupabaseAdmin } from '../src/lib/supabase'

const TRANSACTION_UUID = 'c80c425f-f306-4dd7-b59c-383ec4acf8db'

async function checkTransaction() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.error('❌ Database connection not initialized')
    return
  }

  console.log(`\n🔍 Checking transaction: ${TRANSACTION_UUID}\n`)

  // Fetch the transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('uuid', TRANSACTION_UUID)
    .single()

  if (txError) {
    console.error('❌ Error fetching transaction:', txError)
    return
  }

  if (!transaction) {
    console.error('❌ Transaction not found')
    return
  }

  console.log('✅ Transaction found:')
  console.log('  - Transaction Type:', transaction.transaction_type)
  console.log('  - Transaction Date:', transaction.transaction_date)
  console.log('  - Value:', transaction.value)
  console.log('  - Currency:', transaction.currency)
  console.log('  - Value USD:', transaction.value_usd)
  console.log('  - Provider Org ID:', transaction.provider_org_id)
  console.log('  - Receiver Org ID:', transaction.receiver_org_id)
  console.log('  - Status:', transaction.status)
  console.log('  - Finance Type:', transaction.finance_type)
  console.log('  - Aid Type:', transaction.aid_type)
  console.log('  - Activity ID:', transaction.activity_id)

  // Check if it's a disbursement (type 3)
  const isDisbursement = transaction.transaction_type === '3' || transaction.transaction_type === 3
  console.log(`\n📊 Transaction Type Check:`)
  console.log(`  - Is Disbursement (type 3): ${isDisbursement}`)

  // Check required fields for Funding Over Time
  console.log(`\n🔎 Funding Over Time Requirements:`)
  
  const hasValidType = isDisbursement || transaction.transaction_type === '4' || transaction.transaction_type === 4
  console.log(`  - Has valid transaction type (3 or 4): ${hasValidType}`)
  
  const hasProviderOrg = !!transaction.provider_org_id
  console.log(`  - Has provider_org_id: ${hasProviderOrg} (${transaction.provider_org_id || 'MISSING'})`)
  
  const hasTransactionDate = !!transaction.transaction_date
  console.log(`  - Has transaction_date: ${hasTransactionDate} (${transaction.transaction_date || 'MISSING'})`)
  
  if (transaction.transaction_date) {
    const txDate = new Date(transaction.transaction_date)
    const isValidDate = !isNaN(txDate.getTime())
    const currentYear = new Date().getFullYear()
    const txYear = txDate.getFullYear()
    const isFuture = txYear > currentYear
    
    console.log(`  - Valid date: ${isValidDate}`)
    console.log(`  - Transaction year: ${txYear}`)
    console.log(`  - Current year: ${currentYear}`)
    console.log(`  - Is future date: ${isFuture} (will be excluded if true)`)
  }
  
  const hasValue = !!(parseFloat(transaction.value_usd) || parseFloat(transaction.value))
  const valueUsd = parseFloat(transaction.value_usd) || parseFloat(transaction.value) || 0
  console.log(`  - Has value: ${hasValue} (USD: ${valueUsd})`)

  // Check if provider org exists and is in the organizations table
  if (transaction.provider_org_id) {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, acronym')
      .eq('id', transaction.provider_org_id)
      .single()

    if (orgError) {
      console.log(`\n⚠️  Provider organization not found in organizations table`)
      console.log(`  - Error: ${orgError.message}`)
    } else {
      console.log(`\n✅ Provider organization found:`)
      console.log(`  - Name: ${org.name}`)
      console.log(`  - Acronym: ${org.acronym || 'N/A'}`)
    }
  }

  // Check if this org would be included in the organization list
  if (transaction.provider_org_id) {
    console.log(`\n🔍 Checking if organization would be included in Funding Over Time query:`)
    
    // Check if org has funding envelopes
    const { data: envelopes } = await supabase
      .from('organization_funding_envelopes')
      .select('organization_id')
      .eq('organization_id', transaction.provider_org_id)
      .limit(1)

    const hasEnvelopes = (envelopes?.length || 0) > 0
    console.log(`  - Has funding envelopes: ${hasEnvelopes}`)

    // Check if org has other transactions
    const { data: otherTransactions } = await supabase
      .from('transactions')
      .select('uuid')
      .in('transaction_type', ['3', '4'])
      .eq('provider_org_id', transaction.provider_org_id)
      .neq('uuid', TRANSACTION_UUID)
      .limit(1)

    const hasOtherTransactions = (otherTransactions?.length || 0) > 0
    console.log(`  - Has other transactions (type 3 or 4): ${hasOtherTransactions}`)

    const wouldBeIncluded = hasEnvelopes || hasOtherTransactions || hasValidType
    console.log(`  - Would be included in org list: ${wouldBeIncluded}`)
    
    if (!wouldBeIncluded) {
      console.log(`\n⚠️  ISSUE FOUND: Organization would NOT be included in the organization list`)
      console.log(`  - This means the transaction won't appear unless the org is explicitly selected`)
    }
  }

  // Summary
  console.log(`\n📋 Summary:`)
  const issues: string[] = []
  
  if (!hasValidType) {
    issues.push('Transaction type is not 3 (Disbursement) or 4 (Expenditure)')
  }
  if (!hasProviderOrg) {
    issues.push('Missing provider_org_id')
  }
  if (!hasTransactionDate) {
    issues.push('Missing transaction_date')
  } else if (transaction.transaction_date) {
    const txDate = new Date(transaction.transaction_date)
    if (isNaN(txDate.getTime())) {
      issues.push('Invalid transaction_date')
    } else if (txDate.getFullYear() > new Date().getFullYear()) {
      issues.push('Transaction date is in the future (will be excluded)')
    }
  }
  if (!hasValue || valueUsd === 0) {
    issues.push('Missing or zero value (will appear but with 0 amount)')
  }

  if (issues.length === 0) {
    console.log('✅ Transaction should appear in Funding Over Time chart')
    console.log('   (assuming the organization is selected in the chart)')
  } else {
    console.log('❌ Issues found that prevent transaction from appearing:')
    issues.forEach(issue => console.log(`   - ${issue}`))
  }

  console.log('\n')
}

checkTransaction().catch(console.error)
