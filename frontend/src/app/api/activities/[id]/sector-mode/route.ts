import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export interface SectorModeResponse {
  success: boolean
  mode: 'activity' | 'transaction'
  canSwitchToActivity: boolean
  canSwitchToTransaction: boolean
  transactionCount: number
  hasTransactionSectorData: boolean
  hasActivitySectors: boolean
  error?: string
}

export interface SwitchModeRequest {
  mode: 'activity' | 'transaction'
}

// GET - Returns current mode and switching eligibility
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    const activityId = id
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not initialized' },
        { status: 500 }
      )
    }

    // Get activity with its current mode
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, sector_allocation_mode')
      .eq('id', activityId)
      .single()

    if (activityError || !activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      )
    }

    // Get transaction count for this activity
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', activityId)

    // Check if there's any transaction sector data
    const { data: transactionSectorData } = await supabase
      .from('transaction_sector_lines')
      .select('id, transaction_id')
      .in('transaction_id', 
        supabase
          .from('transactions')
          .select('uuid')
          .eq('activity_id', activityId)
      )
      .is('deleted_at', null)
      .limit(1)

    // Check more thoroughly for transaction sector data
    const { data: transactions } = await supabase
      .from('transactions')
      .select('uuid')
      .eq('activity_id', activityId)

    let hasTransactionSectorData = false
    if (transactions && transactions.length > 0) {
      const txIds = transactions.map(t => t.uuid)
      const { count: sectorCount } = await supabase
        .from('transaction_sector_lines')
        .select('*', { count: 'exact', head: true })
        .in('transaction_id', txIds)
        .is('deleted_at', null)

      hasTransactionSectorData = (sectorCount || 0) > 0
    }

    // Check if activity has sectors defined
    const { count: activitySectorCount } = await supabase
      .from('activity_sectors')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', activityId)

    const hasActivitySectors = (activitySectorCount || 0) > 0

    // Determine switching eligibility
    // Can switch to activity mode if there are transactions (will aggregate)
    const canSwitchToActivity = (transactionCount || 0) >= 0 // Always can switch
    // Can switch to transaction mode if there are activity sectors to copy from
    const canSwitchToTransaction = hasActivitySectors || (transactionCount || 0) > 0

    const response: SectorModeResponse = {
      success: true,
      mode: (activity.sector_allocation_mode || 'activity') as 'activity' | 'transaction',
      canSwitchToActivity,
      canSwitchToTransaction,
      transactionCount: transactionCount || 0,
      hasTransactionSectorData,
      hasActivitySectors
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[SectorMode] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sector mode' },
      { status: 500 }
    )
  }
}

// PUT - Switches mode with validation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    const activityId = id
    const body: SwitchModeRequest = await request.json()
    const { mode } = body

    if (!mode || !['activity', 'transaction'].includes(mode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mode. Must be "activity" or "transaction"' },
        { status: 400 }
      )
    }
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not initialized' },
        { status: 500 }
      )
    }

    // Get current activity
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, sector_allocation_mode')
      .eq('id', activityId)
      .single()

    if (activityError || !activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      )
    }

    const currentMode = activity.sector_allocation_mode || 'activity'

    // If already in the requested mode, no change needed
    if (currentMode === mode) {
      return NextResponse.json({
        success: true,
        mode,
        message: `Already in ${mode} mode`
      })
    }

    // Update the mode - triggers will handle syncing
    const { error: updateError } = await supabase
      .from('activities')
      .update({ 
        sector_allocation_mode: mode,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId)

    if (updateError) {
      console.error('[SectorMode] Update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update sector mode' },
        { status: 500 }
      )
    }

    // If switching to transaction mode, we need to copy activity sectors to transactions
    if (mode === 'transaction') {
      // Get all transactions for this activity
      const { data: transactions } = await supabase
        .from('transactions')
        .select('uuid, value')
        .eq('activity_id', activityId)

      // Get activity sectors
      const { data: activitySectors } = await supabase
        .from('activity_sectors')
        .select('sector_code, sector_name, percentage')
        .eq('activity_id', activityId)

      // For each transaction, ensure it has sector lines from activity sectors
      if (transactions && activitySectors && activitySectors.length > 0) {
        for (const tx of transactions) {
          // Check if transaction already has sector lines
          const { count: existingCount } = await supabase
            .from('transaction_sector_lines')
            .select('*', { count: 'exact', head: true })
            .eq('transaction_id', tx.uuid)
            .is('deleted_at', null)

          // Only copy if no existing sector lines
          if (!existingCount || existingCount === 0) {
            const sectorLines = activitySectors.map(sector => ({
              transaction_id: tx.uuid,
              sector_vocabulary: '1',
              sector_code: sector.sector_code,
              sector_name: sector.sector_name,
              percentage: sector.percentage || 100,
              amount_minor: Math.round((tx.value || 0) * (sector.percentage || 100) / 100 * 100),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))

            if (sectorLines.length > 0) {
              await supabase
                .from('transaction_sector_lines')
                .insert(sectorLines)
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      message: `Switched to ${mode} mode`
    })

  } catch (error) {
    console.error('[SectorMode] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to switch sector mode' },
      { status: 500 }
    )
  }
}


