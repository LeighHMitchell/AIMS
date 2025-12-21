import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { OrgDashboardStats, RecencyItem, EditedRecencyItem, ValidationEvent } from '@/types/dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');
    const userId = searchParams.get('userId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organizationId format' },
        { status: 400 }
      );
    }

    // Fetch all stats in parallel for better performance
    const [
      totalCountResult,
      statusCountsResult,
      lastCreatedResult,
      lastEditedResult,
      lastValidationResult,
    ] = await Promise.all([
      // Total activities count
      supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('reporting_org_id', organizationId),

      // Status counts (unpublished, pending validation, validated)
      supabase
        .from('activities')
        .select('publication_status, submission_status')
        .eq('reporting_org_id', organizationId),

      // Last activity created
      supabase
        .from('activities')
        .select('id, title_narrative, created_at')
        .eq('reporting_org_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Last activity edited
      supabase
        .from('activities')
        .select('id, title_narrative, updated_at, updated_by')
        .eq('reporting_org_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single(),

      // Last validation event from government_endorsements
      supabase
        .from('government_endorsements')
        .select(`
          activity_id,
          validation_status,
          validation_date,
          validating_authority,
          updated_at,
          activities!inner (
            id,
            title_narrative,
            reporting_org_id
          )
        `)
        .eq('activities.reporting_org_id', organizationId)
        .not('validation_status', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    // Process status counts
    const statusCounts = statusCountsResult.data || [];
    const unpublishedCount = statusCounts.filter(
      (a: { publication_status: string; submission_status: string }) =>
        a.publication_status === 'draft' || a.publication_status === 'unpublished'
    ).length;
    const pendingValidationCount = statusCounts.filter(
      (a: { publication_status: string; submission_status: string }) =>
        a.submission_status === 'submitted'
    ).length;
    const validatedCount = statusCounts.filter(
      (a: { publication_status: string; submission_status: string }) =>
        a.submission_status === 'validated'
    ).length;

    // Process last created activity
    let lastActivityCreated: RecencyItem | null = null;
    if (lastCreatedResult.data && !lastCreatedResult.error) {
      lastActivityCreated = {
        id: lastCreatedResult.data.id,
        title: lastCreatedResult.data.title_narrative || 'Untitled Activity',
        timestamp: lastCreatedResult.data.created_at,
      };
    }

    // Process last edited activity
    let lastActivityEdited: EditedRecencyItem | null = null;
    if (lastEditedResult.data && !lastEditedResult.error) {
      const editedByYou = userId ? lastEditedResult.data.updated_by === userId : false;
      lastActivityEdited = {
        id: lastEditedResult.data.id,
        title: lastEditedResult.data.title_narrative || 'Untitled Activity',
        timestamp: lastEditedResult.data.updated_at,
        editedByYou,
      };

      // If not edited by the current user, fetch the editor's name
      if (!editedByYou && lastEditedResult.data.updated_by) {
        const { data: editorData } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', lastEditedResult.data.updated_by)
          .single();

        if (editorData) {
          lastActivityEdited.editedByName =
            `${editorData.first_name || ''} ${editorData.last_name || ''}`.trim() || 'Colleague';
        }
      }
    }

    // Process last validation event
    let lastValidationEvent: ValidationEvent | null = null;
    if (lastValidationResult.data && !lastValidationResult.error) {
      const activity = lastValidationResult.data.activities as { id: string; title_narrative: string } | null;
      lastValidationEvent = {
        activityId: lastValidationResult.data.activity_id,
        activityTitle: activity?.title_narrative || 'Untitled Activity',
        eventType: lastValidationResult.data.validation_status as ValidationEvent['eventType'],
        timestamp: lastValidationResult.data.validation_date || lastValidationResult.data.updated_at,
        validatingAuthority: lastValidationResult.data.validating_authority,
      };
    }

    // Construct response
    const stats: OrgDashboardStats = {
      totalActivities: totalCountResult.count || 0,
      unpublishedCount,
      pendingValidationCount,
      validatedCount,
      lastActivityCreated,
      lastActivityEdited,
      lastValidationEvent,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Dashboard Org Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization dashboard stats' },
      { status: 500 }
    );
  }
}
