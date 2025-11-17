/**
 * Migration Script: Backfill Transaction Default Values
 *
 * This script updates existing transactions to inherit flow_type, aid_type, and tied_status
 * from their parent activity's default values when these fields are not already set.
 *
 * This mirrors the logic already implemented in the IATI import process.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/backfill-transaction-defaults.ts
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
  flowTypeUpdates: number
  aidTypeUpdates: number
  tiedStatusUpdates: number
  errors: string[]
  updated: number
  skipped: number
}

async function backfillTransactionDefaults(dryRun: boolean = true): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalTransactions: 0,
    transactionsNeedingUpdates: 0,
    flowTypeUpdates: 0,
    aidTypeUpdates: 0,
    tiedStatusUpdates: 0,
    errors: [],
    updated: 0,
    skipped: 0
  }

  console.log('========================================')
  console.log('Transaction Defaults Backfill Migration')
  console.log('========================================')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE UPDATE'}`)
  console.log('')

  try {
    // Step 1: Get all transactions with their activity's default values
    console.log('Step 1: Fetching all transactions...')

    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        uuid,
        activity_id,
        flow_type,
        aid_type,
        tied_status,
        finance_type,
        finance_type_inherited,
        activities!transactions_activity_id_fkey1!inner (
          id,
          default_flow_type,
          default_aid_type,
          default_tied_status,
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
    console.log('Step 2: Analyzing transactions for missing default values...')
    console.log('')

    const transactionsToUpdate: Array<{
      uuid: string
      updates: {
        flow_type?: string
        aid_type?: string
        tied_status?: string
      }
      activityDefaults: any
    }> = []

    for (const transaction of transactions) {
      const activity = (transaction.activities as any)
      const updates: any = {}
      let needsUpdate = false

      // Check flow_type
      if (!transaction.flow_type && activity.default_flow_type) {
        updates.flow_type = activity.default_flow_type
        stats.flowTypeUpdates++
        needsUpdate = true
      }

      // Check aid_type
      if (!transaction.aid_type && activity.default_aid_type) {
        updates.aid_type = activity.default_aid_type
        stats.aidTypeUpdates++
        needsUpdate = true
      }

      // Check tied_status
      if (!transaction.tied_status && activity.default_tied_status) {
        updates.tied_status = activity.default_tied_status
        stats.tiedStatusUpdates++
        needsUpdate = true
      }

      if (needsUpdate) {
        transactionsToUpdate.push({
          uuid: transaction.uuid,
          updates,
          activityDefaults: activity
        })
        stats.transactionsNeedingUpdates++
      }
    }

    console.log('Analysis Results:')
    console.log(`  Total transactions analyzed: ${stats.totalTransactions}`)
    console.log(`  Transactions needing updates: ${stats.transactionsNeedingUpdates}`)
    console.log(`  Flow type inheritances needed: ${stats.flowTypeUpdates}`)
    console.log(`  Aid type inheritances needed: ${stats.aidTypeUpdates}`)
    console.log(`  Tied status inheritances needed: ${stats.tiedStatusUpdates}`)
    console.log('')

    if (stats.transactionsNeedingUpdates === 0) {
      console.log('✓ All transactions already have required values. No updates needed.')
      return stats
    }

    // Step 3: Apply updates
    if (dryRun) {
      console.log('DRY RUN: Showing sample updates that would be applied...')
      console.log('')

      // Show first 5 examples
      const samplesToShow = Math.min(5, transactionsToUpdate.length)
      for (let i = 0; i < samplesToShow; i++) {
        const tx = transactionsToUpdate[i]
        console.log(`Transaction ${tx.uuid}:`)
        if (tx.updates.flow_type) {
          console.log(`  → Would inherit flow_type: ${tx.updates.flow_type}`)
        }
        if (tx.updates.aid_type) {
          console.log(`  → Would inherit aid_type: ${tx.updates.aid_type}`)
        }
        if (tx.updates.tied_status) {
          console.log(`  → Would inherit tied_status: ${tx.updates.tied_status}`)
        }
        console.log('')
      }

      if (transactionsToUpdate.length > samplesToShow) {
        console.log(`... and ${transactionsToUpdate.length - samplesToShow} more transactions`)
        console.log('')
      }

      console.log('To apply these changes, run with --live flag:')
      console.log('  NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/backfill-transaction-defaults.ts --live')
    } else {
      console.log('Step 3: Applying updates to transactions...')
      console.log('')

      let progressCounter = 0
      const totalToUpdate = transactionsToUpdate.length

      for (const tx of transactionsToUpdate) {
        progressCounter++

        // Update the transaction with inherited values
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            ...tx.updates,
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
    console.log('Updates by field:')
    console.log(`  Flow Type inherited: ${stats.flowTypeUpdates}`)
    console.log(`  Aid Type inherited: ${stats.aidTypeUpdates}`)
    console.log(`  Tied Status inherited: ${stats.tiedStatusUpdates}`)

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
    const stats = await backfillTransactionDefaults(dryRun)

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
      console.log('    COUNT(flow_type) as with_flow_type,')
      console.log('    COUNT(aid_type) as with_aid_type,')
      console.log('    COUNT(tied_status) as with_tied_status')
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
