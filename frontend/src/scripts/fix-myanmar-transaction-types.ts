import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Transaction type mapping from letters to IATI numeric codes
const TRANSACTION_TYPE_MAP: Record<string, string> = {
  'C': '2',  // Commitment
  'D': '3',  // Disbursement
  'E': '4',  // Expenditure
  'R': '7'   // Reimbursement
}

async function fixTransactionTypes() {
  console.log('🔧 Fixing transaction types in Myanmar data files...\n')
  
  try {
    // Fix activities file
    const activitiesPath = resolve(__dirname, '../../myanmar-activities-2025-06-25.json')
    const activities = JSON.parse(readFileSync(activitiesPath, 'utf-8'))
    
    // Update transaction types in embedded transactions
    let fixedCount = 0
    for (const activity of activities) {
      if (activity.transactions) {
        for (const transaction of activity.transactions) {
          if (transaction.transaction_type in TRANSACTION_TYPE_MAP) {
            transaction.transaction_type = TRANSACTION_TYPE_MAP[transaction.transaction_type]
            fixedCount++
          }
        }
      }
    }
    
    // Save fixed activities
    const fixedActivitiesPath = resolve(__dirname, '../../myanmar-activities-fixed.json')
    writeFileSync(fixedActivitiesPath, JSON.stringify(activities, null, 2))
    console.log(`✅ Fixed ${fixedCount} transaction types in activities file`)
    console.log(`   Saved to: ${fixedActivitiesPath}`)
    
    // Fix transactions file
    const transactionsPath = resolve(__dirname, '../../myanmar-transactions-2025-06-25.json')
    const transactions = JSON.parse(readFileSync(transactionsPath, 'utf-8'))
    
    fixedCount = 0
    for (const transaction of transactions) {
      if (transaction.transaction_type in TRANSACTION_TYPE_MAP) {
        transaction.transaction_type = TRANSACTION_TYPE_MAP[transaction.transaction_type]
        fixedCount++
      }
    }
    
    // Save fixed transactions
    const fixedTransactionsPath = resolve(__dirname, '../../myanmar-transactions-fixed.json')
    writeFileSync(fixedTransactionsPath, JSON.stringify(transactions, null, 2))
    console.log(`✅ Fixed ${fixedCount} transaction types in transactions file`)
    console.log(`   Saved to: ${fixedTransactionsPath}`)
    
    console.log('\n🎉 Transaction type conversion complete!')
    console.log('\nTransaction type mapping used:')
    console.log('- C (Commitment) → 2')
    console.log('- D (Disbursement) → 3')
    console.log('- E (Expenditure) → 4')
    console.log('- R (Reimbursement) → 7')
    
  } catch (error) {
    console.error('❌ Error fixing transaction types:', error)
    process.exit(1)
  }
}

// Run the fix
fixTransactionTypes() 