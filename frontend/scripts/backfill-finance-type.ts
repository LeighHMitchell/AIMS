/**
 * Migration Script: Backfill Finance Type for Existing Transactions
 *
 * This script updates existing transactions to inherit finance_type from their parent
 * activity's default_finance_type when the transaction doesn't have one set.
 *
 * This complements the earlier backfill script which only handled flow_type, aid_type, and tied_status.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/backfill-finance-type.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing required environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface MigrationStats {
  totalTransactions: number
  transactionsNeedingUpdates: number
  financeTypeUpdates: number
  errors: string[]
  updated: number
  skipped: number
}

async function backfillFinanceType(dryRun: boolean = true): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalTransactions: 0,
    transactionsNeedingUpdates: 0,
    financeTypeUpdates: 0,
    errors: [],
    updated: 0,
    skipped: 0
  }

  console.log('========================================')
  console.log('Finance Type Backfill Migration')
  console.log('========================================')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE UPDATE'}`)
  console.log('')

  try {
    // Step 1: Get all transactions with their activity's default finance type
    console.log('Step 1: Fetching all transactions...')

    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        uuid,
        activity_id,
        finance_type,
        finance_type_inherited,
        activities!transactions_activity_id_fkey1!inner (
          id,
          default_finance_type
        )
      `)
      .eq('status', 'actual')

    if (fetchError) {
      console.error('Error fetching transactions:', fetchError)
      throw fetchError
    }

    stats.totalTransactions = transactions?.length || 0
    console.log(`✓ Found ${stats.totalTransactions} actual transactions`)
    console.log('')

    if (!transactions || transactions.length === 0) {
      console.log('No transactions found to process.')
      return stats
    }

    // Step 2: Identify transactions that need updates
    console.log('Step 2: Analyzing transactions for missing finance type...')
    console.log('')

    const transactionsToUpdate: Array<{
      uuid: string
      financeType: string
      activityDefaults: any
    }> = []

    for (const transaction of transactions) {
      const activity = (transaction.activities as any)

      // Check finance_type - only update if NULL and activity has default
      if (!transaction.finance_type && activity.default_finance_type) {
        transactionsToUpdate.push({
          uuid: transaction.uuid,
          financeType: activity.default_finance_type,
          activityDefaults: activity
        })
        stats.financeTypeUpdates++
        stats.transactionsNeedingUpdates++
      }
    }

    console.log('Analysis Results:')
    console.log(`  Total transactions analyzed: ${stats.totalTransactions}`)
    console.log(`  Transactions needing updates: ${stats.transactionsNeedingUpdates}`)
    console.log(`  Finance type inheritances needed: ${stats.financeTypeUpdates}`)
    console.log('')

    if (stats.transactionsNeedingUpdates === 0) {
      console.log('✓ All transactions already have finance_type. No updates needed.')
      return stats
    }

    // Step 3: Apply updates
    if (dryRun) {
      console.log('DRY RUN: Showing sample updates that would be applied...')
      console.log('')

      // Show first 10 examples
      const samplesToShow = Math.min(10, transactionsToUpdate.length)
      for (let i = 0; i < samplesToShow; i++) {
        const tx = transactionsToUpdate[i]
        console.log(`Transaction ${tx.uuid}:`)
        console.log(`  → Would inherit finance_type: ${tx.financeType}`)
        console.log(`  → Would set finance_type_inherited: true`)
        console.log('')
      }

      if (transactionsToUpdate.length > samplesToShow) {
        console.log(`... and ${transactionsToUpdate.length - samplesToShow} more transactions`)
        console.log('')
      }

      console.log('To apply these changes, run with --live flag:')
      console.log('  NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/backfill-finance-type.ts --live')
    } else {
      console.log('Step 3: Applying updates to transactions...')
      console.log('')

      let progressCounter = 0
      const totalToUpdate = transactionsToUpdate.length

      for (const tx of transactionsToUpdate) {
        progressCounter++

        // Update the transaction with inherited finance type
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            finance_type: tx.financeType,
            finance_type_inherited: true,
            updated_at: new Date().toISOString()
          })
          .eq('uuid', tx.uuid)

        if (updateError) {
          const errorMsg = `Failed to update transaction ${tx.uuid}: ${updateError.message}`
          console.error(`✗ ${errorMsg}`)
          stats.errors.push(errorMsg)
          stats.skipped++
        } else {
          stats.updated++

          // Show progress every 10 transactions
          if (progressCounter % 10 === 0 || progressCounter === totalToUpdate) {
            console.log(`  Progress: ${progressCounter}/${totalToUpdate} transactions updated`)
          }
        }
      }

      console.log('')
      console.log('✓ Migration completed!')
      console.log('')
    }

    // Step 4: Show final summary
    console.log('========================================')
    console.log('Migration Summary')
    console.log('========================================')
    console.log(`Total transactions processed: ${stats.totalTransactions}`)
    console.log(`Transactions requiring updates: ${stats.transactionsNeedingUpdates}`)

    if (!dryRun) {
      console.log(`Successfully updated: ${stats.updated}`)
      console.log(`Skipped (errors): ${stats.skipped}`)
    }

    console.log('')
    console.log('Updates:')
    console.log(`  Finance Type inherited: ${stats.financeTypeUpdates}`)
    console.log(`  Finance Type Inherited flag set: ${stats.financeTypeUpdates}`)

    if (stats.errors.length > 0) {
      console.log('')
      console.log('Errors encountered:')
      stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    }

    console.log('========================================')

    return stats

  } catch (error) {
    console.error('Fatal error during migration:', error)
    throw error
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const isLive = args.includes('--live')
  const dryRun = !isLive

  if (dryRun) {
    console.log('⚠️  Running in DRY RUN mode - no changes will be made')
    console.log('')
  } else {
    console.log('⚠️  Running in LIVE mode - changes will be applied to the database')
    console.log('   Press Ctrl+C within 5 seconds to cancel...')
    console.log('')

    // Give user 5 seconds to cancel
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  try {
    const stats = await backfillFinanceType(dryRun)

    if (dryRun) {
      console.log('')
      console.log('✓ Dry run completed successfully')
    } else {
      console.log('')
      console.log('✓ Migration completed successfully')

      // Show verification query
      console.log('')
      console.log('To verify the changes, you can run:')
      console.log('  SELECT')
      console.log('    COUNT(*) as total,')
      console.log('    COUNT(finance_type) as with_finance_type,')
      console.log('    COUNT(CASE WHEN finance_type_inherited THEN 1 END) as inherited')
      console.log('  FROM transactions')
      console.log('  WHERE status = \'actual\';')
    }

    process.exit(0)
  } catch (error) {
    console.error('')
    console.error('✗ Migration failed:', error)
    process.exit(1)
  }
}

main()
