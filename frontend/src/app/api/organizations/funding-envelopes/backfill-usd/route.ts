import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { convertTransactionToUSD } from '@/lib/transaction-usd-helper';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Maintenance endpoint: backfill / repair the USD figures on funding envelopes.
 *
 * Legacy rows can have a null or implausible `amount_usd` (e.g. saved before the
 * exchange-rate handling was fixed). This recomputes them using the SAME helper
 * the editor uses, so the table and the Data View chart agree.
 *
 * Auth: requires a logged-in user. Reads/writes go through the admin client so
 * every organisation is covered regardless of RLS.
 *
 * Usage:
 *   - Dry run (no writes):  POST /api/organizations/funding-envelopes/backfill-usd?dryRun=1
 *   - Apply:                POST /api/organizations/funding-envelopes/backfill-usd
 *   - Single org:           ...?organizationId=<uuid>
 */

// Mirrors isValidUSDConversion in OrganizationFundingVisualization.tsx
function hasValidUsd(amount: number, currency: string, amountUsd: number | null | undefined): boolean {
  if (amountUsd === null || amountUsd === undefined || amountUsd <= 0) return false;
  if (currency === 'USD') return Math.abs(amountUsd - amount) < 0.01;
  const ratio = amountUsd / amount;
  return ratio >= 0.1 && ratio <= 10;
}

export async function POST(request: NextRequest) {
  // Must be authenticated (any logged-in user can run this maintenance task)
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const dryRun = ['1', 'true', 'yes'].includes((searchParams.get('dryRun') || '').toLowerCase());
  const organizationId = searchParams.get('organizationId');

  try {
    let query = supabase
      .from('organization_funding_envelopes')
      .select('id, organization_id, amount, currency, value_date, year_start, amount_usd');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error('[Backfill USD] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch envelopes', details: error.message }, { status: 500 });
    }

    const envelopes = rows || [];
    let alreadyValid = 0;
    let fixed = 0;
    let failed = 0;
    let skipped = 0;
    const failures: Array<{ id: string; currency: string; reason: string }> = [];
    const wouldFix: Array<{ id: string; currency: string; amount: number; oldUsd: number | null; newUsd: number }> = [];

    for (const env of envelopes) {
      const amount = Number(env.amount);

      // Nothing sensible to convert
      if (!amount || amount <= 0) {
        skipped++;
        continue;
      }

      // Already correct — leave it alone
      if (hasValidUsd(amount, env.currency, env.amount_usd)) {
        alreadyValid++;
        continue;
      }

      // Same conversion date the editor/API uses: value_date, else Jan 1 of year_start
      const conversionDate = env.value_date
        ? new Date(env.value_date)
        : new Date(env.year_start, 0, 1);

      const result = await convertTransactionToUSD(amount, env.currency, conversionDate);

      if (!result.success || result.value_usd === null || result.value_usd === undefined) {
        failed++;
        failures.push({ id: env.id, currency: env.currency, reason: result.error || 'No exchange rate available' });
        // Mark as not convertible so the UI/chart can reason about it (skip in dry run)
        if (!dryRun) {
          await supabase
            .from('organization_funding_envelopes')
            .update({ usd_convertible: false, updated_at: new Date().toISOString() })
            .eq('id', env.id);
        }
        continue;
      }

      wouldFix.push({
        id: env.id,
        currency: env.currency,
        amount,
        oldUsd: env.amount_usd ?? null,
        newUsd: result.value_usd,
      });

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('organization_funding_envelopes')
          .update({
            amount_usd: result.value_usd,
            exchange_rate_used: result.exchange_rate_used,
            usd_conversion_date: result.usd_conversion_date,
            usd_convertible: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', env.id);

        if (updateError) {
          failed++;
          failures.push({ id: env.id, currency: env.currency, reason: `Update failed: ${updateError.message}` });
          continue;
        }
      }
      fixed++;
    }

    return NextResponse.json({
      dryRun,
      organizationId: organizationId || 'all',
      total: envelopes.length,
      alreadyValid,
      fixed,
      failed,
      skipped,
      failures,
      ...(dryRun ? { wouldFix } : {}),
    });
  } catch (err: any) {
    console.error('[Backfill USD] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err?.message }, { status: 500 });
  }
}
