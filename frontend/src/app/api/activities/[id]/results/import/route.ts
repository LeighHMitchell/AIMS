import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { importResultsForActivity } from '@/lib/iati/results-importer';

/**
 * POST /api/activities/[id]/results/import
 *
 * Bulk import results from parsed IATI XML.
 * Accepts an array of result objects with nested indicators, baselines, periods, etc.
 * DB write logic is in the shared results-importer module.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!supabase) {
      console.error('[Results Import API] Supabase admin client not available');
      return NextResponse.json({
        error: 'Database not available'
      }, { status: 500 });
    }

    const { id: activityId } = await params;
    const body = await request.json();
    const { results, mode = 'create' } = body;

    console.log(`[Results Import API] Starting import for activity: ${activityId}`);
    console.log(`[Results Import API] Import mode: ${mode}, Results count: ${results?.length || 0}`);

    // Validation
    if (!activityId) {
      return NextResponse.json({
        error: 'Activity ID is required'
      }, { status: 400 });
    }

    if (!results || !Array.isArray(results)) {
      return NextResponse.json({
        error: 'Results array is required',
        details: 'Body must contain a "results" array'
      }, { status: 400 });
    }

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          results_created: 0,
          indicators_created: 0,
          baselines_created: 0,
          periods_created: 0,
          errors: [],
        }
      });
    }

    // Verify activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({
        error: 'Activity not found',
        details: `No activity exists with ID: ${activityId}`
      }, { status: 404 });
    }

    const summary = await importResultsForActivity(supabase, activityId, results);

    console.log('[Results Import API] Import complete:', summary);

    return NextResponse.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('[Results Import API] Unexpected error:', error);
    return NextResponse.json({
      error: 'Import failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
