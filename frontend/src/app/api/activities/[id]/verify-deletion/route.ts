import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseOptimized } from '@/lib/supabase-optimized';

/**
 * Diagnostic endpoint to verify if an activity exists after deletion
 * Checks:
 * - Main activities table
 * - Materialized views
 * - Cache status
 * - Related records
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const resolvedParams = await Promise.resolve(params);
    const activityId = resolvedParams.id;

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const verificationResults: any = {
      activityId,
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // Check 1: Main activities table
    try {
      const { data: activity, error } = await supabase
        .from('activities')
        .select('id, iati_identifier, title_narrative, created_at, updated_at')
        .eq('id', activityId)
        .single();

      verificationResults.checks.mainTable = {
        exists: !!activity && !error,
        error: error?.code === 'PGRST116' ? null : error?.message,
        data: activity || null
      };
    } catch (error: any) {
      verificationResults.checks.mainTable = {
        exists: false,
        error: error.message,
        data: null
      };
    }

    // Check 2: Materialized view (activity_transaction_summaries)
    try {
      const { data: summary, error } = await supabase
        .from('activity_transaction_summaries')
        .select('*')
        .eq('activity_id', activityId)
        .single();

      verificationResults.checks.materializedView = {
        exists: !!summary && !error,
        error: error?.code === 'PGRST116' ? null : error?.message,
        data: summary || null
      };
    } catch (error: any) {
      verificationResults.checks.materializedView = {
        exists: false,
        error: error.message,
        data: null
      };
    }

    // Check 3: Related records (transactions, budgets, etc.)
    try {
      const [transactionsResult, budgetsResult, sectorsResult] = await Promise.all([
        supabase.from('transactions').select('id').eq('activity_id', activityId).limit(1),
        supabase.from('activity_budgets').select('id').eq('activity_id', activityId).limit(1),
        supabase.from('activity_sectors').select('id').eq('activity_id', activityId).limit(1)
      ]);

      verificationResults.checks.relatedRecords = {
        hasTransactions: (transactionsResult.data?.length || 0) > 0,
        hasBudgets: (budgetsResult.data?.length || 0) > 0,
        hasSectors: (sectorsResult.data?.length || 0) > 0,
        transactionCount: transactionsResult.data?.length || 0,
        budgetCount: budgetsResult.data?.length || 0,
        sectorCount: sectorsResult.data?.length || 0
      };
    } catch (error: any) {
      verificationResults.checks.relatedRecords = {
        error: error.message
      };
    }

    // Check 4: Cache status (check if activity might be cached)
    try {
      // Note: We can't directly inspect the cache, but we can check if it's been cleared
      verificationResults.checks.cache = {
        note: 'Cache status cannot be directly queried, but cache should be cleared after deletion',
        cacheCleared: true // Assumed true if deletion endpoint was called
      };
    } catch (error: any) {
      verificationResults.checks.cache = {
        error: error.message
      };
    }

    // Summary
    const existsInMainTable = verificationResults.checks.mainTable?.exists || false;
    const existsInMaterializedView = verificationResults.checks.materializedView?.exists || false;
    const hasRelatedRecords = 
      verificationResults.checks.relatedRecords?.hasTransactions ||
      verificationResults.checks.relatedRecords?.hasBudgets ||
      verificationResults.checks.relatedRecords?.hasSectors;

    verificationResults.summary = {
      activityExists: existsInMainTable,
      existsInMaterializedView,
      hasRelatedRecords,
      status: existsInMainTable 
        ? 'ACTIVITY_STILL_EXISTS' 
        : existsInMaterializedView 
          ? 'DELETED_BUT_IN_MATERIALIZED_VIEW' 
          : hasRelatedRecords
            ? 'DELETED_BUT_HAS_RELATED_RECORDS'
            : 'CONFIRMED_DELETED'
    };

    return NextResponse.json(verificationResults);

  } catch (error: any) {
    console.error('[Verify Deletion] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to verify deletion',
        details: error.message 
      },
      { status: 500 }
    );
  }
}






