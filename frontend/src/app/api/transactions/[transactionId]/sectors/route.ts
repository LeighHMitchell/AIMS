import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  TransactionSectorLine,
  TransactionSectorValidation,
  TransactionSectorsResponse,
  UpdateTransactionSectorsRequest,
  TransactionSectorLineFormData
} from '@/types/transaction';
import { inferAndApplyBudgetLines } from '@/lib/transaction-budget-inference';

// Helper function to trigger budget line inference after sector changes
async function triggerBudgetLineInference(transactionId: string) {
  try {
    console.log('[Sectors API] Triggering budget line inference for transaction:', transactionId);
    const supabase = getSupabaseAdmin();

    // Fetch transaction with its data
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .select(`
        uuid,
        value,
        currency,
        provider_org_id,
        receiver_org_id,
        finance_type,
        effective_finance_type
      `)
      .eq('uuid', transactionId)
      .single();

    if (txnError || !transaction) {
      console.error('[Sectors API] Error fetching transaction for inference:', txnError);
      return;
    }

    // Get updated transaction sectors
    const { data: sectorLines } = await supabase
      .from('transaction_sector_lines')
      .select('sector_code, sector_name, percentage')
      .eq('transaction_id', transactionId)
      .is('deleted_at', null);

    // Build inference input
    const input = {
      providerOrgId: transaction.provider_org_id,
      receiverOrgId: transaction.receiver_org_id,
      financeType: transaction.effective_finance_type || transaction.finance_type,
      sectors: (sectorLines || []).map((s: any) => ({
        code: s.sector_code,
        name: s.sector_name,
        percentage: s.percentage,
      })),
      value: transaction.value || 0,
      currency: transaction.currency || 'USD',
    };

    // Infer and apply budget lines
    const result = await inferAndApplyBudgetLines(supabase, transactionId, input);

    if (result.success) {
      console.log('[Sectors API] Budget line inference completed:', {
        transactionId,
        linesCreated: result.linesCreated,
        linesPreserved: result.linesPreserved,
      });
    } else {
      console.error('[Sectors API] Budget line inference failed');
    }
  } catch (error) {
    console.error('[Sectors API] Unexpected error during budget line inference:', error);
  }
}

// Validation function for transaction sector allocations
function validateTransactionSectors(
  lines: TransactionSectorLine[],
  transactionValue: number,
  transactionCurrency: string
): TransactionSectorValidation {
  const errors: string[] = [];
  const totalPercentage = lines.reduce((sum, line) => sum + line.percentage, 0);
  
  // Percentage validation
  if (lines.length === 0) {
    // Allow empty sectors for now (can be controlled by feature flag later)
    return { 
      isValid: true, 
      errors: [], 
      totalPercentage: 0, 
      remainingPercentage: 0, 
      totalAmount: 0 
    };
  }
  
  // Check percentage sum
  if (Math.abs(totalPercentage - 100) > 0.01) {
    if (totalPercentage > 100) {
      errors.push(`Total percentage (${totalPercentage.toFixed(2)}%) exceeds 100%`);
    } else {
      errors.push(`Total percentage (${totalPercentage.toFixed(2)}%) must equal 100%`);
    }
  }
  
  // Check for duplicates
  const seen = new Set<string>();
  lines.forEach(line => {
    const key = `${line.sector_vocabulary}:${line.sector_code}`;
    if (seen.has(key)) {
      errors.push(`Duplicate sector: ${line.sector_code}`);
    }
    seen.add(key);
  });
  
  // Check individual percentages
  lines.forEach(line => {
    if (line.percentage <= 0 || line.percentage > 100) {
      errors.push(`Invalid percentage for sector ${line.sector_code}: ${line.percentage}%`);
    }
  });
  
  // Amount reconciliation
  const computedTotal = lines.reduce((sum, line) => 
    sum + (transactionValue * line.percentage / 100), 0
  );
  
  const hasRoundingIssues = Math.abs(computedTotal - transactionValue) > 0.01;
  if (hasRoundingIssues) {
    errors.push('Sector amounts do not reconcile to transaction value due to rounding');
  }
  
  return {
    isValid: errors.length === 0 && Math.abs(totalPercentage - 100) <= 0.01,
    errors,
    totalPercentage,
    remainingPercentage: 100 - totalPercentage,
    totalAmount: computedTotal,
    hasRoundingIssues
  };
}

// Helper function to reconcile rounding issues
function reconcileRounding(
  lines: TransactionSectorLine[],
  transactionValue: number
): TransactionSectorLine[] {
  if (lines.length === 0) return lines;
  
  const totalComputed = lines.reduce((sum, line) => 
    sum + (transactionValue * line.percentage / 100), 0
  );
  
  const difference = transactionValue - totalComputed;
  if (Math.abs(difference) < 0.01) return lines; // Within tolerance
  
  // Add difference to largest allocation
  const largest = lines.reduce((max, line) => 
    line.percentage > max.percentage ? line : max
  );
  
  return lines.map(line => 
    line.id === largest.id 
      ? { 
          ...line, 
          amount_minor: Math.round((transactionValue * line.percentage / 100 + difference) * 100)
        }
      : {
          ...line,
          amount_minor: Math.round((transactionValue * line.percentage / 100) * 100)
        }
  );
}

// GET /api/transactions/[transactionId]/sectors
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;
    const supabase = getSupabaseAdmin();
    
    // First, get the transaction to validate access and get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('uuid, value, currency, activity_id')
      .eq('uuid', transactionId)
      .single();
    
    if (transactionError || !transaction) {
      console.error('Transaction not found:', transactionError);
      return NextResponse.json(
        { error: 'Transaction not found' }, 
        { status: 404 }
      );
    }
    
    // Fetch sector lines for this transaction
    const { data: sectorLines, error: sectorsError } = await supabase
      .from('transaction_sector_lines')
      .select('*')
      .eq('transaction_id', transactionId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });
    
    if (sectorsError) {
      console.error('Error fetching sector lines:', sectorsError);
      return NextResponse.json(
        { error: 'Failed to fetch sector lines' }, 
        { status: 500 }
      );
    }
    
    const lines = sectorLines || [];
    const validation = validateTransactionSectors(
      lines, 
      transaction.value, 
      transaction.currency
    );
    
    const response: TransactionSectorsResponse = {
      sector_lines: lines,
      metadata: {
        transaction_id: transactionId,
        transaction_value: transaction.value,
        transaction_currency: transaction.currency,
        total_allocated_percentage: validation.totalPercentage,
        validation
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/transactions/[transactionId]/sectors:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// PUT /api/transactions/[transactionId]/sectors
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;
    const body: UpdateTransactionSectorsRequest = await request.json();
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
    
    // Validate the incoming sector lines
    const tempLines: TransactionSectorLine[] = body.sector_lines.map((line, index) => ({
      id: line.id || `temp-${index}`,
      transaction_id: transactionId,
      sector_vocabulary: line.sector_vocabulary || '1',
      sector_code: line.sector_code,
      sector_name: line.sector_name || 'Unknown Sector',
      percentage: line.percentage,
      amount_minor: Math.round((transaction.value * line.percentage / 100) * 100),
      sort_order: index
    }));
    
    const validation = validateTransactionSectors(
      tempLines,
      transaction.value,
      transaction.currency
    );
    
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          validation,
          details: validation.errors 
        }, 
        { status: 400 }
      );
    }
    
    // Reconcile any rounding issues
    const reconciledLines = reconcileRounding(tempLines, transaction.value);
    
    // Start transaction to update sector lines atomically
    const { error: deleteError } = await supabase
      .from('transaction_sector_lines')
      .delete()
      .eq('transaction_id', transactionId);
    
    if (deleteError) {
      console.error('Error deleting existing sector lines:', deleteError);
      return NextResponse.json(
        { error: 'Failed to update sector lines' }, 
        { status: 500 }
      );
    }
    
    let newLines: TransactionSectorLine[] = [];
    let changes = { created: 0, updated: 0, deleted: 0 };
    
    if (reconciledLines.length > 0) {
      // Insert new sector lines
      const linesToInsert = reconciledLines.map(line => ({
        transaction_id: transactionId,
        sector_vocabulary: line.sector_vocabulary,
        sector_code: line.sector_code,
        sector_name: line.sector_name,
        percentage: line.percentage,
        amount_minor: line.amount_minor,
        sort_order: line.sort_order
      }));
      
      const { data: insertedLines, error: insertError } = await supabase
        .from('transaction_sector_lines')
        .insert(linesToInsert)
        .select('*');
      
      if (insertError) {
        console.error('Error inserting sector lines:', insertError);
        return NextResponse.json(
          { error: 'Failed to create sector lines' }, 
          { status: 500 }
        );
      }
      
      newLines = insertedLines || [];
      changes.created = newLines.length;
    }
    
    const finalValidation = validateTransactionSectors(
      newLines,
      transaction.value,
      transaction.currency
    );
    
    const response: TransactionSectorsResponse = {
      sector_lines: newLines,
      metadata: {
        transaction_id: transactionId,
        transaction_value: transaction.value,
        transaction_currency: transaction.currency,
        total_allocated_percentage: finalValidation.totalPercentage,
        validation: finalValidation
      }
    };

    // Trigger budget line inference (runs in background, doesn't block response)
    triggerBudgetLineInference(transactionId).catch(err =>
      console.error('[Sectors API] Background budget inference failed:', err)
    );

    return NextResponse.json({
      ...response,
      changes
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/transactions/[transactionId]/sectors:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[transactionId]/sectors (delete all)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;
    const supabase = getSupabaseAdmin();
    
    // Verify transaction exists
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
    
    // Delete all sector lines for this transaction
    const { error: deleteError } = await supabase
      .from('transaction_sector_lines')
      .delete()
      .eq('transaction_id', transactionId);
    
    if (deleteError) {
      console.error('Error deleting sector lines:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete sector lines' },
        { status: 500 }
      );
    }

    // Trigger budget line inference (runs in background, doesn't block response)
    // This will update budget lines now that sectors are cleared
    triggerBudgetLineInference(transactionId).catch(err =>
      console.error('[Sectors API] Background budget inference failed:', err)
    );

    return NextResponse.json({
      success: true,
      remaining_lines: [],
      validation: {
        isValid: true,
        errors: [],
        totalPercentage: 0,
        remainingPercentage: 0,
        totalAmount: 0
      }
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/transactions/[transactionId]/sectors:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

