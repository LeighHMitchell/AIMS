import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { TransactionSectorValidation } from '@/types/transaction';

// Validation function (reused from main route)
function validateTransactionSectors(
  lines: any[],
  transactionValue: number
): TransactionSectorValidation {
  const errors: string[] = [];
  const totalPercentage = lines.reduce((sum, line) => sum + line.percentage, 0);
  
  if (lines.length === 0) {
    return { 
      isValid: true, 
      errors: [], 
      totalPercentage: 0, 
      remainingPercentage: 0, 
      totalAmount: 0 
    };
  }
  
  if (Math.abs(totalPercentage - 100) > 0.01) {
    if (totalPercentage > 100) {
      errors.push(`Total percentage (${totalPercentage.toFixed(2)}%) exceeds 100%`);
    } else {
      errors.push(`Total percentage (${totalPercentage.toFixed(2)}%) must equal 100%`);
    }
  }
  
  const computedTotal = lines.reduce((sum, line) => 
    sum + (transactionValue * line.percentage / 100), 0
  );
  
  return {
    isValid: errors.length === 0 && Math.abs(totalPercentage - 100) <= 0.01,
    errors,
    totalPercentage,
    remainingPercentage: 100 - totalPercentage,
    totalAmount: computedTotal
  };
}

// DELETE /api/transactions/[transactionId]/sectors/[sectorLineId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { transactionId: string; sectorLineId: string } }
) {
  try {
    const { transactionId, sectorLineId } = params;
    const supabase = getSupabaseAdmin();
    
    // Verify transaction exists and get details
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('uuid, value, currency')
      .eq('uuid', transactionId)
      .single();
    
    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' }, 
        { status: 404 }
      );
    }
    
    // Verify the sector line exists and belongs to this transaction
    const { data: sectorLine, error: sectorLineError } = await supabase
      .from('transaction_sector_lines')
      .select('id, transaction_id')
      .eq('id', sectorLineId)
      .eq('transaction_id', transactionId)
      .is('deleted_at', null)
      .single();
    
    if (sectorLineError || !sectorLine) {
      return NextResponse.json(
        { error: 'Sector line not found' }, 
        { status: 404 }
      );
    }
    
    // Delete the sector line
    const { error: deleteError } = await supabase
      .from('transaction_sector_lines')
      .delete()
      .eq('id', sectorLineId)
      .eq('transaction_id', transactionId);
    
    if (deleteError) {
      console.error('Error deleting sector line:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete sector line' }, 
        { status: 500 }
      );
    }
    
    // Get remaining sector lines
    const { data: remainingLines, error: remainingError } = await supabase
      .from('transaction_sector_lines')
      .select('*')
      .eq('transaction_id', transactionId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });
    
    if (remainingError) {
      console.error('Error fetching remaining sector lines:', remainingError);
      return NextResponse.json(
        { error: 'Failed to fetch remaining sector lines' }, 
        { status: 500 }
      );
    }
    
    const lines = remainingLines || [];
    const validation = validateTransactionSectors(lines, transaction.value);
    
    return NextResponse.json({
      success: true,
      deleted_sector_line_id: sectorLineId,
      remaining_lines: lines,
      validation,
      message: `Sector line deleted successfully. ${lines.length} sectors remaining.`
    });
    
  } catch (error) {
    console.error('Unexpected error in DELETE /api/transactions/[transactionId]/sectors/[sectorLineId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// GET /api/transactions/[transactionId]/sectors/[sectorLineId] (for individual sector line details)
export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string; sectorLineId: string } }
) {
  try {
    const { transactionId, sectorLineId } = params;
    const supabase = getSupabaseAdmin();
    
    // Get the specific sector line
    const { data: sectorLine, error: sectorLineError } = await supabase
      .from('transaction_sector_lines')
      .select('*')
      .eq('id', sectorLineId)
      .eq('transaction_id', transactionId)
      .is('deleted_at', null)
      .single();
    
    if (sectorLineError || !sectorLine) {
      return NextResponse.json(
        { error: 'Sector line not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      sector_line: sectorLine
    });
    
  } catch (error) {
    console.error('Unexpected error in GET /api/transactions/[transactionId]/sectors/[sectorLineId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

