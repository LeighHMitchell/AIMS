import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { readFileSync } from 'fs'

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTransactionRequirements() {
  console.log('🔍 Checking transaction import requirements...\n')
  
  try {
    // 1. Check existing transaction table structure
    console.log('📊 Checking transactions table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_columns', { table_name: 'transactions' })
      .select('*')
    
    if (tableError) {
      // Try a different approach
      const { data: sampleTransaction, error: sampleError } = await supabase
        .from('transactions')
        .select('*')
        .limit(1)
      
      if (sampleError) {
        console.error('Error checking transactions table:', sampleError)
      } else {
        console.log('\nExisting transaction columns:')
        if (sampleTransaction && sampleTransaction.length > 0) {
          Object.keys(sampleTransaction[0]).forEach(col => {
            console.log(`  - ${col}`)
          })
        } else {
          console.log('  (No sample transactions found)')
        }
      }
    }
    
    // 2. Load and analyze the Myanmar transaction data
    console.log('\n📋 Analyzing Myanmar transaction data...')
    const transactionsPath = resolve(__dirname, '../../myanmar-transactions-fixed.json')
    const transactions = JSON.parse(readFileSync(transactionsPath, 'utf-8'))
    
    if (transactions.length > 0) {
      console.log('\nFields in Myanmar transactions:')
      Object.keys(transactions[0]).forEach(field => {
        console.log(`  - ${field}: ${typeof transactions[0][field]} (example: ${JSON.stringify(transactions[0][field])})`)
      })
    }
    
    // 3. Check if we can map activity IATI IDs to internal IDs
    console.log('\n🔗 Checking activity mapping...')
    const { data: activities, error: actError } = await supabase
      .from('activities')
      .select('id, iati_id')
      .in('iati_id', [
        'XM-OCHA-CBPF-MMR59-001',
        'XM-DAC-47010-002',
        'XM-DAC-21013-003'
      ])
    
    if (!actError && activities) {
      console.log(`\nFound ${activities.length} matching activities:`)
      activities.forEach(act => {
        console.log(`  - ${act.iati_id} → ${act.id}`)
      })
    }
    
    // 4. Test a minimal transaction insert
    console.log('\n🧪 Testing minimal transaction insert...')
    
    // Get a valid activity ID
    const { data: testActivity, error: testActError } = await supabase
      .from('activities')
      .select('id')
      .limit(1)
      .single()
    
    if (testActivity) {
      const testTransaction = {
        activity_id: testActivity.id,
        transaction_type: '3', // Disbursement
        transaction_date: '2024-01-01',
        value: 10000,
        currency: 'USD'
      }
      
      console.log('\nTrying to insert test transaction:')
      console.log(JSON.stringify(testTransaction, null, 2))
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(testTransaction)
        .select()
      
      if (error) {
        console.error('\n❌ Test insert failed:', error.message)
        console.log('\nMissing required fields or constraints:')
        if (error.message.includes('null value')) {
          console.log('  - Some required fields are missing')
        }
        if (error.message.includes('foreign key')) {
          console.log('  - Foreign key constraints need valid references')
        }
      } else {
        console.log('\n✅ Test insert succeeded!')
        
        // Clean up
        if (data && data[0]) {
          await supabase
            .from('transactions')
            .delete()
            .eq('id', data[0].id)
          console.log('  (Test transaction cleaned up)')
        }
      }
    }
    
    // 5. Summary and recommendations
    console.log('\n📝 Summary and Recommendations:')
    console.log('\nTo import Myanmar transactions, you need to:')
    console.log('1. Map activity_iati_id to actual activity IDs in your database')
    console.log('2. Ensure all required fields are provided')
    console.log('3. Consider if these optional IATI fields exist in your table:')
    console.log('   - aid_type')
    console.log('   - finance_type') 
    console.log('   - flow_type')
    console.log('4. Organization IDs (provider_org_id, receiver_org_id) must exist in the organizations table')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Custom RPC function fallback if needed
async function getTableColumns() {
  const { data, error } = await supabase.rpc('query_information_schema', {
    query: `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `
  })
  
  if (!error && data) {
    console.log('\nTransactions table columns:')
    data.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`)
    })
  }
}

// Run the check
checkTransactionRequirements() 