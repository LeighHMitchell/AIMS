import { NextRequest, NextResponse } from 'next/server';
import { enhancedCurrencyConverter } from '@/lib/currency-converter-enhanced';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Comprehensive Currency Conversion Fix API
 * Diagnoses and repairs currency conversion issues
 */

interface TransactionSummary {
  currency: string;
  value_usd: number | null;
  usd_convertible: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        return await getConversionStatus();
      
      case 'diagnose':
        const currency = searchParams.get('currency') || 'EUR';
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
        return await diagnoseCurrency(currency, date);
      
      case 'reset':
        return await resetFailedTransactions();
      
      case 'test':
        const testCurrency = searchParams.get('currency') || 'EUR';
        const testAmount = parseFloat(searchParams.get('amount') || '100');
        const testDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
        return await testConversion(testAmount, testCurrency, testDate);
      
      default:
        return NextResponse.json({
          error: 'Invalid action. Use: status, diagnose, reset, or test'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[Currency Fix API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, transactionId, transactionIds } = body;

    switch (action) {
      case 'convert':
        if (!transactionId) {
          return NextResponse.json({
            error: 'transactionId is required for convert action'
          }, { status: 400 });
        }
        return await convertSingleTransaction(transactionId);
      
      case 'bulk-convert':
        if (!transactionIds || !Array.isArray(transactionIds)) {
          return NextResponse.json({
            error: 'transactionIds array is required for bulk-convert action'
          }, { status: 400 });
        }
        return await bulkConvertTransactions(transactionIds);
      
      case 'fix-all':
        return await fixAllFailedTransactions();
      
      default:
        return NextResponse.json({
          error: 'Invalid action. Use: convert, bulk-convert, or fix-all'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[Currency Fix API] POST Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getConversionStatus() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      error: 'Database connection not available'
    }, { status: 500 });
  }

  try {
    // Get overall statistics
    const { data: stats, error: statsError } = await supabase
      .from('transactions')
      .select('currency, value_usd, usd_convertible')
      .gt('value', 0);

    if (statsError) {
      throw new Error(`Stats query failed: ${statsError.message}`);
    }

    const summary = {
      total_transactions: stats.length,
      usd_transactions: stats.filter((t: TransactionSummary) => t.currency === 'USD').length,
      converted_transactions: stats.filter((t: TransactionSummary) => t.currency !== 'USD' && t.value_usd !== null).length,
      failed_transactions: stats.filter((t: TransactionSummary) => t.currency !== 'USD' && t.usd_convertible === false).length,
      pending_transactions: stats.filter((t: TransactionSummary) => t.currency !== 'USD' && t.value_usd === null && t.usd_convertible !== false).length
    };

    // Get currency breakdown
    const currencyBreakdown = stats.reduce((acc: any, t: TransactionSummary) => {
      if (!acc[t.currency]) {
        acc[t.currency] = {
          total: 0,
          converted: 0,
          failed: 0,
          pending: 0
        };
      }
      acc[t.currency].total++;
      
      if (t.currency === 'USD') {
        acc[t.currency].converted++;
      } else if (t.value_usd !== null) {
        acc[t.currency].converted++;
      } else if (t.usd_convertible === false) {
        acc[t.currency].failed++;
      } else {
        acc[t.currency].pending++;
      }
      
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      summary,
      currency_breakdown: currencyBreakdown,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function diagnoseCurrency(currency: string, date: string) {
  try {
    const diagnostic = await enhancedCurrencyConverter.diagnoseConversion(currency, date);
    
    return NextResponse.json({
      success: true,
      diagnostic,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Diagnostic failed'
    }, { status: 500 });
  }
}

async function testConversion(amount: number, currency: string, date: string) {
  try {
    const result = await enhancedCurrencyConverter.convertToUSD(
      amount,
      currency,
      new Date(date)
    );

    return NextResponse.json({
      success: true,
      test_input: { amount, currency, date },
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test conversion failed'
    }, { status: 500 });
  }
}

async function resetFailedTransactions() {
  try {
    const result = await enhancedCurrencyConverter.resetFailedTransactions();
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Reset ${result.count} failed transactions for retry`
        : 'Failed to reset transactions',
      count: result.count,
      error: result.error,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Reset failed'
    }, { status: 500 });
  }
}

async function convertSingleTransaction(transactionId: string) {
  try {
    const result = await enhancedCurrencyConverter.convertTransaction(transactionId);
    
    return NextResponse.json({
      success: result.success,
      transaction_id: transactionId,
      error: result.error,
      diagnostic: result.diagnostic,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Conversion failed'
    }, { status: 500 });
  }
}

async function bulkConvertTransactions(transactionIds: string[]) {
  const results = {
    total: transactionIds.length,
    successful: 0,
    failed: 0,
    details: [] as any[]
  };

  for (const transactionId of transactionIds) {
    try {
      const result = await enhancedCurrencyConverter.convertTransaction(transactionId);
      
      results.details.push({
        transaction_id: transactionId,
        success: result.success,
        error: result.error
      });

      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
      results.details.push({
        transaction_id: transactionId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    timestamp: new Date().toISOString()
  });
}

async function fixAllFailedTransactions() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      error: 'Database connection not available'
    }, { status: 500 });
  }

  try {
    // Step 1: Reset failed transactions
    const resetResult = await enhancedCurrencyConverter.resetFailedTransactions();
    
    if (!resetResult.success) {
      return NextResponse.json({
        success: false,
        error: `Failed to reset transactions: ${resetResult.error}`
      }, { status: 500 });
    }

    // Step 2: Get all pending transactions
    const { data: pendingTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('uuid, currency, value, transaction_date, value_date')
      .neq('currency', 'USD')
      .is('value_usd', null)
      .eq('usd_convertible', true)
      .gt('value', 0)
      .limit(100); // Process in batches

    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch pending transactions: ${fetchError.message}`
      }, { status: 500 });
    }

    // Step 3: Convert each transaction
    const results = {
      reset_count: resetResult.count,
      total_pending: pendingTransactions?.length || 0,
      successful: 0,
      failed: 0,
      details: [] as any[]
    };

    if (pendingTransactions) {
      for (const transaction of pendingTransactions) {
        try {
          const result = await enhancedCurrencyConverter.convertTransaction(transaction.uuid);
          
          results.details.push({
            transaction_id: transaction.uuid,
            currency: transaction.currency,
            success: result.success,
            error: result.error
          });

          if (result.success) {
            results.successful++;
          } else {
            results.failed++;
          }
        } catch (error) {
          results.failed++;
          results.details.push({
            transaction_id: transaction.uuid,
            currency: transaction.currency,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${results.successful} transactions, ${results.failed} failed`,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Fix all failed'
    }, { status: 500 });
  }
} 