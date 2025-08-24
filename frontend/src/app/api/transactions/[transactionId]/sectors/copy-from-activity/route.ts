import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CopyFromActivityRequest, TransactionSectorsResponse } from '@/types/transaction';

// POST /api/transactions/[transactionId]/sectors/copy-from-activity
export async function POST(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const transactionId = params.transactionId;
    const body: CopyFromActivityRequest = await request.json();
    const supabase = getSupabaseAdmin();
    
    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('uuid, value, currency, activity_id')
      .eq('uuid', transactionId)
      .single();
    
    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' }, 
        { status: 404 }
      );
    }
    
    // Verify the activity ID matches (security check)
    if (body.activity_id !== transaction.activity_id) {
      return NextResponse.json(
        { error: 'Activity ID mismatch' }, 
        { status: 400 }
      );
    }
    
    // Get activity sector allocations
    const { data: activitySectors, error: sectorsError } = await supabase
      .from('activity_sectors')
      .select('sector_code, sector_name, percentage')
      .eq('activity_id', body.activity_id)
      .order('percentage', { ascending: false });
    
    if (sectorsError) {
      console.error('Error fetching activity sectors:', sectorsError);
      return NextResponse.json(
        { error: 'Failed to fetch activity sectors' }, 
        { status: 500 }
      );
    }
    
    if (!activitySectors || activitySectors.length === 0) {
      return NextResponse.json(
        { 
          error: 'No sectors found for this activity',
          message: 'The parent activity does not have any sector allocations to copy from.'
        }, 
        { status: 404 }
      );
    }
    
    // Check if activity sectors sum to 100%
    const totalActivityPercentage = activitySectors.reduce((sum, sector) => sum + (sector.percentage || 0), 0);
    if (Math.abs(totalActivityPercentage - 100) > 0.01) {
      return NextResponse.json(
        { 
          error: 'Invalid activity sectors',
          message: `Activity sector allocations total ${totalActivityPercentage.toFixed(2)}% instead of 100%. Please fix the activity sectors first.`
        }, 
        { status: 400 }
      );
    }
    
    // Delete existing transaction sector lines
    const { error: deleteError } = await supabase
      .from('transaction_sector_lines')
      .delete()
      .eq('transaction_id', transactionId);
    
    if (deleteError) {
      console.error('Error deleting existing sector lines:', deleteError);
      return NextResponse.json(
        { error: 'Failed to clear existing sector lines' }, 
        { status: 500 }
      );
    }
    
    // Create new sector lines based on activity sectors
    const newSectorLines = activitySectors.map((sector, index) => {
      const percentage = sector.percentage || 0;
      const amount = body.scale_to_transaction 
        ? (transaction.value * percentage / 100)
        : percentage; // If not scaling, just use the percentage as-is
      
      return {
        transaction_id: transactionId,
        sector_vocabulary: '1', // Default to DAC 5-digit
        sector_code: sector.sector_code,
        sector_name: sector.sector_name || 'Unknown Sector',
        percentage: percentage,
        amount_minor: Math.round(amount * 100), // Convert to minor units (cents)
        sort_order: index
      };
    });
    
    // Insert the new sector lines
    const { data: insertedLines, error: insertError } = await supabase
      .from('transaction_sector_lines')
      .insert(newSectorLines)
      .select('*');
    
    if (insertError) {
      console.error('Error inserting copied sector lines:', insertError);
      return NextResponse.json(
        { error: 'Failed to create sector lines from activity' }, 
        { status: 500 }
      );
    }
    
    // Validate the result
    const lines = insertedLines || [];
    const totalPercentage = lines.reduce((sum, line) => sum + line.percentage, 0);
    const totalAmount = lines.reduce((sum, line) => sum + (line.amount_minor / 100), 0);
    
    const validation = {
      isValid: Math.abs(totalPercentage - 100) <= 0.01,
      errors: Math.abs(totalPercentage - 100) > 0.01 
        ? [`Total percentage is ${totalPercentage.toFixed(2)}% instead of 100%`]
        : [],
      totalPercentage,
      remainingPercentage: 100 - totalPercentage,
      totalAmount,
      hasRoundingIssues: Math.abs(totalAmount - transaction.value) > 0.01
    };
    
    const response: TransactionSectorsResponse = {
      sector_lines: lines,
      metadata: {
        transaction_id: transactionId,
        transaction_value: transaction.value,
        transaction_currency: transaction.currency,
        total_allocated_percentage: totalPercentage,
        validation
      }
    };
    
    return NextResponse.json({
      ...response,
      message: `Successfully copied ${lines.length} sector allocations from activity`,
      source_activity_id: body.activity_id,
      copied_sectors: lines.length
    });
    
  } catch (error) {
    console.error('Unexpected error in POST /api/transactions/[transactionId]/sectors/copy-from-activity:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

