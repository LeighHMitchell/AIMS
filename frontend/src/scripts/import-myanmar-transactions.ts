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

async function importTransactions() {
  console.log('💰 Starting Myanmar transactions import...\n')
  
  try {
    // 1. Load transactions data
    const transactionsPath = resolve(__dirname, '../../myanmar-transactions-fixed.json')
    const transactions = JSON.parse(readFileSync(transactionsPath, 'utf-8'))
    console.log(`📋 Found ${transactions.length} transactions to import\n`)
    
    // 2. Get all Myanmar activities for mapping
    console.log('🔗 Fetching activity mappings...')
    // Get all activities that were recently created (Myanmar ones)
    const { data: activities, error: actError } = await supabase
      .from('activities')
      .select('id, iati_id')
      .order('created_at', { ascending: false })
      .limit(20)  // Get the most recent 20 activities
    
    if (actError || !activities) {
      console.error('Error fetching activities:', actError)
      return
    }
    
    // Create IATI ID to internal ID mapping
    const activityMap: Record<string, string> = {}
    activities.forEach(act => {
      activityMap[act.iati_id] = act.id
    })
    
    console.log(`✅ Found ${activities.length} Myanmar activities for mapping\n`)
    
    // 3. Import transactions in batches
    console.log('🔄 Importing transactions...')
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0
    
    // Process in batches of 50
    const batchSize = 50
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize)
      const batchTransactions = []
      
      for (const transaction of batch) {
        // Map activity IATI ID to internal ID
        const activityId = activityMap[transaction.activity_iati_id]
        
        if (!activityId) {
          console.warn(`⚠️  No activity found for IATI ID: ${transaction.activity_iati_id}`)
          skippedCount++
          continue
        }
        
        // Prepare transaction for insert
        const dbTransaction: any = {
          activity_id: activityId,
          transaction_type: transaction.transaction_type,
          transaction_date: transaction.transaction_date,
          value: transaction.value,
          currency: transaction.currency,
          description: transaction.description,
          
          // Organization IDs
          provider_org_id: transaction.provider_org_id,
          receiver_org_id: transaction.receiver_org_id,
          
          // Default values
          is_humanitarian: false
        }
        
        // Only add IATI fields if they exist and are reasonable
        // Skip finance_type for now due to enum issues
        if (transaction.aid_type) {
          dbTransaction.aid_type = transaction.aid_type
        }
        if (transaction.flow_type) {
          dbTransaction.flow_type = transaction.flow_type
        }
        
        batchTransactions.push(dbTransaction)
      }
      
      if (batchTransactions.length > 0) {
        const { data, error } = await supabase
          .from('transactions')
          .insert(batchTransactions)
          .select()
        
        if (error) {
          console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message)
          errorCount += batchTransactions.length
        } else {
          successCount += batchTransactions.length
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: Imported ${batchTransactions.length} transactions`)
        }
      }
    }
    
    // 4. Summary
    console.log('\n' + '='.repeat(60))
    console.log('🎉 Transaction import complete!')
    console.log('\n📊 Summary:')
    console.log(`- Transactions processed: ${transactions.length}`)
    console.log(`- Successfully imported: ${successCount}`)
    console.log(`- Failed: ${errorCount}`)
    console.log(`- Skipped (no activity mapping): ${skippedCount}`)
    
    if (successCount > 0) {
      // Calculate some statistics
      const { data: stats, error: statsError } = await supabase
        .from('transactions')
        .select('activity_id, transaction_type, value')
        .in('activity_id', Object.values(activityMap))
      
      if (!statsError && stats) {
        const totalValue = stats.reduce((sum, t) => sum + t.value, 0)
        const byType = stats.reduce((acc, t) => {
          acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        console.log(`\n💵 Total transaction value: $${totalValue.toLocaleString()}`)
        console.log('\n📈 Transactions by type:')
        Object.entries(byType).forEach(([type, count]) => {
          const typeName = {
            '2': 'Commitment',
            '3': 'Disbursement',
            '4': 'Expenditure',
            '7': 'Reimbursement'
          }[type] || type
          console.log(`  - ${typeName}: ${count}`)
        })
      }
    }
    
    console.log('\n✨ Next steps:')
    console.log('1. View transactions at http://localhost:3002/transactions')
    console.log('2. Check activity finance tabs for transaction details')
    console.log('3. Organization summary should now show committed funding')
    
  } catch (error) {
    console.error('❌ Import error:', error)
  }
}

// Run the import
importTransactions() 