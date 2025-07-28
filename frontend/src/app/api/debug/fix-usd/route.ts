import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { activityId } = await request.json();

    console.log('[Fix USD] Starting USD conversion for activity:', activityId);

    // Get transactions that need USD conversion
    const query = supabase
      .from('transactions')
      .select(`
        uuid,
        transaction_type,
        value,
        currency,
        value_usd,
        transaction_date,
        value_date
      `)
      .is('value_usd', null)
      .gt('value', 0);

    if (activityId) {
      query.eq('activity_id', activityId);
    } else {
      query.limit(50);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('[Fix USD] Error fetching transactions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Fix USD] Found transactions needing conversion:', transactions?.length);

    const results = {
      processed: 0,
      updated: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    // Process each transaction
    for (const transaction of transactions || []) {
      results.processed++;
      
      try {
        // If it's USD, just set value_usd to value
        if (transaction.currency === 'USD') {
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              value_usd: transaction.value,
              exchange_rate_used: 1.0,
              usd_conversion_date: new Date().toISOString(),
              usd_convertible: true
            })
            .eq('uuid', transaction.uuid);

          if (updateError) {
            results.errors.push(`Failed to update USD transaction ${transaction.uuid}: ${updateError.message}`);
          } else {
            results.updated++;
            results.details.push({
              uuid: transaction.uuid,
              type: transaction.transaction_type,
              originalValue: transaction.value,
              usdValue: transaction.value,
              currency: 'USD',
              rate: 1.0,
              status: 'updated'
            });
          }
        } else {
          // For non-USD currencies, we need an exchange rate
          // For now, just mark them as convertible so the API can handle them
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              usd_convertible: true
            })
            .eq('uuid', transaction.uuid);

          if (updateError) {
            results.errors.push(`Failed to mark transaction ${transaction.uuid} as convertible: ${updateError.message}`);
          } else {
            results.details.push({
              uuid: transaction.uuid,
              type: transaction.transaction_type,
              originalValue: transaction.value,
              currency: transaction.currency,
              status: 'marked_convertible'
            });
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Error processing transaction ${transaction.uuid}: ${errorMsg}`);
      }
    }

    // Now trigger the currency conversion API for non-USD transactions
    if (activityId) {
      try {
        console.log('[Fix USD] Triggering currency conversion API...');
        const conversionResponse = await fetch(`${request.nextUrl.origin}/api/currency/fix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fix_all: true })
        });
        
        if (conversionResponse.ok) {
          const conversionResult = await conversionResponse.json();
          console.log('[Fix USD] Currency conversion API result:', conversionResult);
        }
      } catch (err) {
        console.error('[Fix USD] Error calling currency conversion API:', err);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.processed} transactions, updated ${results.updated}`
    });

  } catch (error) {
    console.error('[Fix USD] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to fix USD values',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 