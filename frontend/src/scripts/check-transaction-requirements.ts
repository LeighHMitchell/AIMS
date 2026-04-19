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
  
  try {
    // 1. Check existing transaction table structure
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
        if (sampleTransaction && sampleTransaction.length > 0) {
          Object.keys(sampleTransaction[0]).forEach(col => {
          })
        } else {
        }
      }
    }
    
    // 2. Load and analyze the Myanmar transaction data
    const transactionsPath = resolve(__dirname, '../../myanmar-transactions-fixed.json')
    const transactions = JSON.parse(readFileSync(transactionsPath, 'utf-8'))
    
    if (transactions.length > 0) {
      Object.keys(transactions[0]).forEach(field => {
      })
    }
    
    // 3. Check if we can map activity IATI IDs to internal IDs
    const { data: activities, error: actError } = await supabase
      .from('activities')
      .select('id, iati_id')
      .in('iati_id', [
        'XM-OCHA-CBPF-MMR59-001',
        'XM-DAC-47010-002',
        'XM-DAC-21013-003'
      ])
    
    if (!actError && activities) {
      activities.forEach(act => {
      })
    }
    
    // 4. Test a minimal transaction insert
    
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
      
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(testTransaction)
        .select()
      
      if (error) {
        console.error('\n❌ Test insert failed:', error.message)
        if (error.message.includes('null value')) {
        }
        if (error.message.includes('foreign key')) {
        }
      } else {
        
        // Clean up
        if (data && data[0]) {
          await supabase
            .from('transactions')
            .delete()
            .eq('id', data[0].id)
        }
      }
    }
    
    // 5. Summary and recommendations
    
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
    data.forEach((col: any) => {
    })
  }
}

// Run the check
checkTransactionRequirements() 