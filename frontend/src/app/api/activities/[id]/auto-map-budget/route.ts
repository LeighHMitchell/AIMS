import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  getSuggestionsForActivity,
  applyAutoMapping,
  getMappingCoverageStats,
} from '@/lib/sector-budget-mapping-service';
import { ClassificationType } from '@/types/aid-on-budget';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/activities/[id]/auto-map-budget
 * Get suggested budget mappings based on activity sectors
 * Does NOT apply mappings - just returns suggestions for preview
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: activityId } = await params;

    // Verify the activity exists
    const supabase = getSupabaseAdmin();
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, title')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Get suggestions
    const result = await getSuggestionsForActivity(activityId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[auto-map-budget] Error getting suggestions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities/[id]/auto-map-budget
 * Apply auto-mapping to create budget items from sector mappings
 *
 * Request body:
 * {
 *   overwriteExisting?: boolean,  // If true, replace existing auto-mapped items
 *   classificationTypes?: ClassificationType[], // Which types to apply (default: all)
 *   preview?: boolean  // If true, only return what would be created (dry run)
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: activityId } = await params;
    const supabase = getSupabaseAdmin();

    // Verify the activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, title')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      overwriteExisting = false,
      classificationTypes,
      preview = false,
    } = body;

    // Validate classification types if provided
    const validTypes: ClassificationType[] = ['functional', 'administrative', 'economic', 'programme'];
    if (classificationTypes) {
      const invalidTypes = classificationTypes.filter(
        (t: string) => !validTypes.includes(t as ClassificationType)
      );
      if (invalidTypes.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid classification types: ${invalidTypes.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    if (preview) {
      // Just return suggestions without applying
      const result = await getSuggestionsForActivity(activityId);
      return NextResponse.json({
        success: true,
        data: result,
        preview: true,
      });
    }

    // Apply the auto-mapping
    const result = await applyAutoMapping(activityId, 'system', {
      overwriteExisting,
      classificationTypes: classificationTypes as ClassificationType[] | undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: result.created
        ? `Created ${result.created} budget mapping(s) from ${result.suggestions.length} sector suggestion(s)`
        : 'No new mappings created',
    });
  } catch (error: any) {
    console.error('[auto-map-budget] Error applying mappings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activities/[id]/auto-map-budget
 * Remove all auto-mapped budget items (keeps manual ones)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: activityId } = await params;
    const supabase = getSupabaseAdmin();

    // Find country_budget_items for vocabulary "4"
    const { data: cbi } = await supabase
      .from('country_budget_items')
      .select('id')
      .eq('activity_id', activityId)
      .eq('vocabulary', '4')
      .single();

    if (!cbi) {
      return NextResponse.json({
        success: true,
        message: 'No auto-mapped items to delete',
        deleted: 0,
      });
    }

    // Delete only auto-mapped items (those with source_sector_code)
    const { data: deleted, error } = await supabase
      .from('budget_items')
      .delete()
      .eq('country_budget_items_id', cbi.id)
      .not('source_sector_code', 'is', null)
      .select('id');

    if (error) {
      console.error('[auto-map-budget] Error deleting auto-mapped items:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const deletedCount = deleted?.length || 0;

    // Check if there are any remaining items in this vocabulary
    const { data: remaining } = await supabase
      .from('budget_items')
      .select('id')
      .eq('country_budget_items_id', cbi.id)
      .limit(1);

    // If no items remain, delete the country_budget_items entry too
    if (!remaining || remaining.length === 0) {
      await supabase
        .from('country_budget_items')
        .delete()
        .eq('id', cbi.id);
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} auto-mapped budget item(s)`,
      deleted: deletedCount,
    });
  } catch (error: any) {
    console.error('[auto-map-budget] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
