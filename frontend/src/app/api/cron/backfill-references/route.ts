import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { backfillReferences } from '@/lib/reference-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cron/backfill-references
 *
 * One-time backfill to assign BUD-xxx and PD-xxx references
 * to existing budgets and planned disbursements that don't have one.
 * Safe to run multiple times — only fills in missing references.
 */
export async function GET(request: NextRequest) {
  try {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const budgetResults = await backfillReferences(supabase, 'activity_budgets', 'BUD');
    const pdResults = await backfillReferences(supabase, 'planned_disbursements', 'PD');

    return NextResponse.json({
      success: true,
      budgets: budgetResults,
      planned_disbursements: pdResults,
    });
  } catch (error) {
    console.error('[BackfillReferences] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
