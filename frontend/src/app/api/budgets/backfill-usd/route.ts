import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';

/**
 * Backfill USD values for budgets that don't have them
 * This fixes the Implementation vs Plan calculation issue
 */
export async function POST(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {

    console.log('[Backfill Budgets USD] Starting backfill process');

    // Get all budgets without USD values
    const { data: budgets, error: fetchError } = await supabase
      .from('activity_budgets')
      .select('*')
      .is('usd_value', null);

    if (fetchError) {
      console.error('[Backfill Budgets USD] Error fetching budgets:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch budgets',
        details: fetchError.message
      }, { status: 500 });
    }

    if (!budgets || budgets.length === 0) {
      console.log('[Backfill Budgets USD] No budgets need backfilling');
      return NextResponse.json({
        message: 'No budgets need backfilling',
        processed: 0,
        converted: 0,
        failed: 0
      });
    }

    console.log(`[Backfill Budgets USD] Found ${budgets.length} budgets without USD values`);

    const results = {
      processed: 0,
      converted: 0,
      failed: 0,
      alreadyUSD: 0,
      errors: [] as Array<{ id: string; error: string }>
    };

    for (const budget of budgets) {
      results.processed++;

      try {
        let usdValue = null;

        // If already in USD, just copy the value
        if (budget.currency === 'USD') {
          usdValue = budget.value;
          results.alreadyUSD++;
        } else {
          // Convert to USD using the value_date or period_start
          const conversionDate = new Date(budget.value_date || budget.period_start);

          const result = await fixedCurrencyConverter.convertToUSD(
            budget.value,
            budget.currency,
            conversionDate
          );

          if (result.success && result.usd_amount !== null) {
            usdValue = result.usd_amount;
            results.converted++;
            console.log(`[Backfill Budgets USD] Converted budget ${budget.id}: ${budget.value} ${budget.currency} → $${usdValue} USD`);
          } else {
            results.failed++;
            results.errors.push({
              id: budget.id,
              error: result.error || 'Conversion failed'
            });
            console.warn(`[Backfill Budgets USD] Failed to convert budget ${budget.id}:`, result.error);
            continue;
          }
        }

        // Update the budget with USD value
        const { error: updateError } = await supabase
          .from('activity_budgets')
          .update({ usd_value: usdValue })
          .eq('id', budget.id);

        if (updateError) {
          results.failed++;
          results.errors.push({
            id: budget.id,
            error: `Update failed: ${updateError.message}`
          });
          console.error(`[Backfill Budgets USD] Error updating budget ${budget.id}:`, updateError);
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          id: budget.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`[Backfill Budgets USD] Error processing budget ${budget.id}:`, error);
      }
    }

    console.log('[Backfill Budgets USD] Backfill complete:', results);

    return NextResponse.json({
      message: 'Backfill complete',
      ...results
    });

  } catch (error) {
    console.error('[Backfill Budgets USD] Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
