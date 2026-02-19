import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { OrgDashboardStats, RecencyItem, EditedRecencyItem, ValidationEvent } from '@/types/dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
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

      // Last activity created (with creator info)
      supabase
        .from('activities')
        .select('id, title_narrative, iati_identifier, created_at, created_by')
        .eq('reporting_org_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Last activity edited
      supabase
        .from('activities')
        .select('id, title_narrative, iati_identifier, updated_at, updated_by')
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
          comments,
          updated_at,
          updated_by,
          activities!inner (
            id,
            title_narrative,
            iati_identifier,
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

    // Collect user IDs that need profile lookups
    const userIdsToLookup: string[] = [];
    if (lastCreatedResult.data?.created_by) userIdsToLookup.push(lastCreatedResult.data.created_by);
    if (lastEditedResult.data?.updated_by) userIdsToLookup.push(lastEditedResult.data.updated_by);
    if (lastValidationResult.data?.updated_by) userIdsToLookup.push(lastValidationResult.data.updated_by);

    // Fetch all user profiles in one query
    const uniqueUserIds = [...new Set(userIdsToLookup.filter(Boolean))];
    const userProfileMap = new Map<string, { first_name: string; last_name: string; job_title: string; department: string }>();
    if (uniqueUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, first_name, last_name, job_title, department')
        .in('id', uniqueUserIds);

      (usersData || []).forEach((u: any) => {
        userProfileMap.set(u.id, u);
      });
    }

    // Helper to build UserProfile
    const buildProfile = (userId2: string | null) => {
      if (!userId2) return undefined;
      const u = userProfileMap.get(userId2);
      if (!u) return undefined;
      return {
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown',
        jobTitle: u.job_title || undefined,
        department: u.department || undefined,
      };
    };

    // Process last created activity
    let lastActivityCreated: RecencyItem | null = null;
    if (lastCreatedResult.data && !lastCreatedResult.error) {
      lastActivityCreated = {
        id: lastCreatedResult.data.id,
        title: lastCreatedResult.data.title_narrative || 'Untitled Activity',
        timestamp: lastCreatedResult.data.created_at,
        iatiIdentifier: lastCreatedResult.data.iati_identifier || undefined,
        creatorProfile: buildProfile(lastCreatedResult.data.created_by),
      };
    }

    // Process last edited activity
    let lastActivityEdited: EditedRecencyItem | null = null;
    if (lastEditedResult.data && !lastEditedResult.error) {
      const editedByYou = userId ? lastEditedResult.data.updated_by === userId : false;
      const editorProfile = buildProfile(lastEditedResult.data.updated_by);
      lastActivityEdited = {
        id: lastEditedResult.data.id,
        title: lastEditedResult.data.title_narrative || 'Untitled Activity',
        timestamp: lastEditedResult.data.updated_at,
        iatiIdentifier: lastEditedResult.data.iati_identifier || undefined,
        editedByYou,
        editedByName: editorProfile?.name || 'Colleague',
        editorProfile: editedByYou ? undefined : editorProfile,
      };
    }

    // Process last validation event
    let lastValidationEvent: ValidationEvent | null = null;
    if (lastValidationResult.data && !lastValidationResult.error) {
      const activity = lastValidationResult.data.activities as { id: string; title_narrative: string; iati_identifier?: string } | null;
      const validatorProfile = buildProfile(lastValidationResult.data.updated_by);
      lastValidationEvent = {
        activityId: lastValidationResult.data.activity_id,
        activityTitle: activity?.title_narrative || 'Untitled Activity',
        iatiIdentifier: activity?.iati_identifier || undefined,
        eventType: lastValidationResult.data.validation_status as ValidationEvent['eventType'],
        timestamp: lastValidationResult.data.validation_date || lastValidationResult.data.updated_at,
        validatingAuthority: lastValidationResult.data.validating_authority,
        validatorName: validatorProfile?.name,
        rejectionReason: lastValidationResult.data.comments || undefined,
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
