import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';

export interface AggregatedSector {
  sector_code: string
  sector_name: string
  weighted_percentage: number
  simple_average_percentage: number
  transaction_count: number
  total_value: number
}

export interface AggregateTransactionSectorsResponse {
  success: boolean
  sectors: AggregatedSector[]
  totalTransactionValue: number
  transactionCount: number
  error?: string
}

// GET - Calculate weighted average of sector percentages across all transactions
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

    // Get all transactions for this activity with their values
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('uuid, value, value_usd')
      .eq('activity_id', activityId)

    if (txError) {
      console.error('[AggregateTransactionSectors] Error fetching transactions:', txError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        sectors: [],
        totalTransactionValue: 0,
        transactionCount: 0
      } as AggregateTransactionSectorsResponse)
    }

    const transactionIds = transactions.map(t => t.uuid)
    const totalTransactionValue = transactions.reduce((sum, t) => {
      const value = parseFloat(t.value_usd?.toString() || t.value?.toString() || '0') || 0
      return sum + value
    }, 0)

    // Get all sector lines for these transactions
    const { data: sectorLines, error: sectorError } = await supabase
      .from('transaction_sector_lines')
      .select('transaction_id, sector_code, sector_name, percentage, amount_minor')
      .in('transaction_id', transactionIds)
      .is('deleted_at', null)

    if (sectorError) {
      console.error('[AggregateTransactionSectors] Error fetching sector lines:', sectorError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transaction sectors' },
        { status: 500 }
      )
    }

    if (!sectorLines || sectorLines.length === 0) {
      return NextResponse.json({
        success: true,
        sectors: [],
        totalTransactionValue,
        transactionCount: transactions.length
      } as AggregateTransactionSectorsResponse)
    }

    // Create a map of transaction values
    const txValueMap = new Map<string, number>()
    transactions.forEach(t => {
      const value = parseFloat(t.value_usd?.toString() || t.value?.toString() || '0') || 0
      txValueMap.set(t.uuid, value)
    })

    // Aggregate sectors with weighted average
    const sectorMap = new Map<string, {
      sector_name: string
      total_weighted_value: number
      total_percentage_sum: number
      transaction_count: number
      transactions_with_sector: Set<string>
    }>()

    sectorLines.forEach(line => {
      const txValue = txValueMap.get(line.transaction_id) || 0
      const percentage = parseFloat(line.percentage?.toString() || '0') || 0
      const weightedValue = txValue * (percentage / 100)

      if (!sectorMap.has(line.sector_code)) {
        sectorMap.set(line.sector_code, {
          sector_name: line.sector_name,
          total_weighted_value: 0,
          total_percentage_sum: 0,
          transaction_count: 0,
          transactions_with_sector: new Set()
        })
      }

      const sector = sectorMap.get(line.sector_code)!
      sector.total_weighted_value += weightedValue
      sector.total_percentage_sum += percentage
      sector.transactions_with_sector.add(line.transaction_id)
    })

    // Calculate final aggregated sectors
    const aggregatedSectors: AggregatedSector[] = Array.from(sectorMap.entries()).map(([code, data]) => {
      // Weighted percentage = (sum of weighted values) / total transaction value * 100
      const weighted_percentage = totalTransactionValue > 0 
        ? (data.total_weighted_value / totalTransactionValue) * 100 
        : 0

      // Simple average = sum of percentages / number of transactions with this sector
      const simple_average_percentage = data.transactions_with_sector.size > 0
        ? data.total_percentage_sum / data.transactions_with_sector.size
        : 0

      return {
        sector_code: code,
        sector_name: data.sector_name,
        weighted_percentage: Math.round(weighted_percentage * 100) / 100, // Round to 2 decimals
        simple_average_percentage: Math.round(simple_average_percentage * 100) / 100,
        transaction_count: data.transactions_with_sector.size,
        total_value: data.total_weighted_value
      }
    })

    // Sort by weighted percentage descending
    aggregatedSectors.sort((a, b) => b.weighted_percentage - a.weighted_percentage)

    // Normalize percentages to ensure they sum to 100
    const totalWeightedPercentage = aggregatedSectors.reduce((sum, s) => sum + s.weighted_percentage, 0)
    if (totalWeightedPercentage > 0 && Math.abs(totalWeightedPercentage - 100) > 0.1) {
      // Normalize
      const factor = 100 / totalWeightedPercentage
      aggregatedSectors.forEach(s => {
        s.weighted_percentage = Math.round(s.weighted_percentage * factor * 100) / 100
      })
    }

    return NextResponse.json({
      success: true,
      sectors: aggregatedSectors,
      totalTransactionValue,
      transactionCount: transactions.length
    } as AggregateTransactionSectorsResponse)

  } catch (error) {
    console.error('[AggregateTransactionSectors] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to aggregate transaction sectors' },
      { status: 500 }
    )
  }
}

// POST - Apply aggregated sectors to activity_sectors table
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    const activityId = id
    const body = await request.json()
    const { sectors } = body as { sectors: AggregatedSector[] }

    if (!sectors || !Array.isArray(sectors)) {
      return NextResponse.json(
        { success: false, error: 'Invalid sectors data' },
        { status: 400 }
      )
    }
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database connection not initialized' },
        { status: 500 }
      )
    }

    // Delete existing activity sectors
    const { error: deleteError } = await supabase
      .from('activity_sectors')
      .delete()
      .eq('activity_id', activityId)

    if (deleteError) {
      console.error('[AggregateTransactionSectors] Error deleting existing sectors:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to clear existing sectors' },
        { status: 500 }
      )
    }

    // Insert new sectors from aggregated data
    if (sectors.length > 0) {
      const sectorRecords = sectors.map(s => ({
        activity_id: activityId,
        sector_code: s.sector_code,
        sector_name: s.sector_name,
        percentage: s.weighted_percentage,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: insertError } = await supabase
        .from('activity_sectors')
        .insert(sectorRecords)

      if (insertError) {
        console.error('[AggregateTransactionSectors] Error inserting sectors:', insertError)
        return NextResponse.json(
          { success: false, error: 'Failed to save aggregated sectors' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: `Applied ${sectors.length} aggregated sectors to activity`
    })

  } catch (error) {
    console.error('[AggregateTransactionSectors] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to apply aggregated sectors' },
      { status: 500 }
    )
  }
}


