import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { ActionItem, ActionType } from '@/types/dashboard';
import { ACTION_PRIORITY, IATI_FIELD_LABELS } from '@/types/dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Generate unique action ID
function generateActionId(type: ActionType, activityId: string, extra?: string): string {
  return `${type}-${activityId}${extra ? `-${extra}` : ''}`;
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '7', 10), 50);

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

    const actions: ActionItem[] = [];
    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // 1. VALIDATION RETURNED (Priority 1)
    // Activities with validation_status = 'rejected' or 'more_info_requested'
    const { data: validationReturned } = await supabase
      .from('government_endorsements')
      .select(`
        activity_id,
        validation_status,
        validation_notes,
        updated_at,
        activities!inner (
          id,
          title_narrative,
          reporting_org_id,
          updated_at
        )
      `)
      .eq('activities.reporting_org_id', organizationId)
      .in('validation_status', ['rejected', 'more_info_requested']);

    if (validationReturned) {
      for (const item of validationReturned) {
        const activity = item.activities as { id: string; title_narrative: string; updated_at: string } | null;
        // Only include if the validation is newer than the last activity update (not yet addressed)
        if (activity && new Date(item.updated_at) > new Date(activity.updated_at)) {
          const statusLabel = item.validation_status === 'rejected' ? 'rejected' : 'returned for more information';
          actions.push({
            id: generateActionId('validation_returned', activity.id),
            type: 'validation_returned',
            priority: ACTION_PRIORITY.validation_returned,
            activityId: activity.id,
            activityTitle: activity.title_narrative || 'Untitled Activity',
            message: `Activity has been ${statusLabel} by government reviewer`,
            createdAt: item.updated_at,
            metadata: {
              validationStatus: item.validation_status,
              validationNotes: item.validation_notes,
            },
          });
        }
      }
    }

    // 2. MISSING REQUIRED DATA (Priority 2)
    // Fetch activities with their related data to check for missing IATI mandatory fields
    const { data: activitiesForMissingData } = await supabase
      .from('activities')
      .select(`
        id,
        title_narrative,
        iati_identifier,
        reporting_org_id,
        description_narrative,
        activity_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        updated_at,
        activity_sectors (id),
        activity_recipient_countries (id),
        activity_recipient_regions (id),
        participating_organizations (id),
        transactions (id)
      `)
      .eq('reporting_org_id', organizationId)
      .in('activity_status', ['1', '2', '3']); // Pipeline, Implementation, Finalisation

    if (activitiesForMissingData) {
      for (const activity of activitiesForMissingData) {
        const missingFields: string[] = [];

        // Check IATI mandatory fields
        if (!activity.iati_identifier) missingFields.push(IATI_FIELD_LABELS.iati_identifier);
        if (!activity.title_narrative) missingFields.push(IATI_FIELD_LABELS.title_narrative);
        if (!activity.description_narrative) missingFields.push(IATI_FIELD_LABELS.description_narrative);
        if (!activity.activity_status) missingFields.push(IATI_FIELD_LABELS.activity_status);

        // Check activity dates
        const hasActivityDates = activity.planned_start_date || activity.planned_end_date ||
                                  activity.actual_start_date || activity.actual_end_date;
        if (!hasActivityDates) missingFields.push(IATI_FIELD_LABELS.activity_dates);

        // Check sectors
        if (!activity.activity_sectors || activity.activity_sectors.length === 0) {
          missingFields.push(IATI_FIELD_LABELS.sector);
        }

        // Check recipient location (country OR region)
        const hasCountry = activity.activity_recipient_countries && activity.activity_recipient_countries.length > 0;
        const hasRegion = activity.activity_recipient_regions && activity.activity_recipient_regions.length > 0;
        if (!hasCountry && !hasRegion) {
          missingFields.push(IATI_FIELD_LABELS.recipient_location);
        }

        // Check participating organizations
        if (!activity.participating_organizations || activity.participating_organizations.length === 0) {
          missingFields.push(IATI_FIELD_LABELS.participating_org);
        }

        // Check transactions
        if (!activity.transactions || activity.transactions.length === 0) {
          missingFields.push(IATI_FIELD_LABELS.transaction);
        }

        if (missingFields.length > 0) {
          actions.push({
            id: generateActionId('missing_data', activity.id),
            type: 'missing_data',
            priority: ACTION_PRIORITY.missing_data,
            activityId: activity.id,
            activityTitle: activity.title_narrative || 'Untitled Activity',
            message: `Missing required fields: ${missingFields.slice(0, 3).join(', ')}${missingFields.length > 3 ? ` (+${missingFields.length - 3} more)` : ''}`,
            createdAt: activity.updated_at,
            metadata: {
              missingFields,
            },
          });
        }
      }
    }

    // 3. CLOSING SOON (Priority 3)
    // Activities with end date within 90 days
    const { data: closingSoon } = await supabase
      .from('activities')
      .select('id, title_narrative, planned_end_date, updated_at')
      .eq('reporting_org_id', organizationId)
      .in('activity_status', ['2', '3']) // Implementation or Finalisation
      .lte('planned_end_date', ninetyDaysFromNow.toISOString())
      .gte('planned_end_date', now.toISOString());

    if (closingSoon) {
      for (const activity of closingSoon) {
        const endDate = new Date(activity.planned_end_date);
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        actions.push({
          id: generateActionId('closing_soon', activity.id),
          type: 'closing_soon',
          priority: ACTION_PRIORITY.closing_soon,
          activityId: activity.id,
          activityTitle: activity.title_narrative || 'Untitled Activity',
          message: `Activity ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
          createdAt: activity.updated_at,
          metadata: {
            endDate: activity.planned_end_date,
            daysRemaining,
          },
        });
      }
    }

    // 4. OUT OF DATE (Priority 4)
    // Activities not updated in 90 days
    const { data: outOfDate } = await supabase
      .from('activities')
      .select('id, title_narrative, updated_at')
      .eq('reporting_org_id', organizationId)
      .in('activity_status', ['1', '2', '3']) // Active statuses
      .lt('updated_at', ninetyDaysAgo.toISOString());

    if (outOfDate) {
      for (const activity of outOfDate) {
        const lastUpdated = new Date(activity.updated_at);
        const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (24 * 60 * 60 * 1000));

        actions.push({
          id: generateActionId('out_of_date', activity.id),
          type: 'out_of_date',
          priority: ACTION_PRIORITY.out_of_date,
          activityId: activity.id,
          activityTitle: activity.title_narrative || 'Untitled Activity',
          message: `Activity has not been updated in ${daysSinceUpdate} days`,
          createdAt: activity.updated_at,
          metadata: {
            lastUpdated: activity.updated_at,
            daysSinceUpdate,
          },
        });
      }
    }

    // 5. NEW COMMENTS (Priority 5)
    // Unread comments mentioning user or organization
    // Note: This depends on the comment notification system structure
    if (userId) {
      const { data: newComments } = await supabase
        .from('user_notifications')
        .select(`
          id,
          title,
          message,
          metadata,
          created_at,
          link
        `)
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('type', 'mention')
        .order('created_at', { ascending: false })
        .limit(10);

      if (newComments) {
        for (const notification of newComments) {
          const metadata = notification.metadata as { activityId?: string; activityTitle?: string; commenterName?: string } | null;
          if (metadata?.activityId) {
            actions.push({
              id: generateActionId('new_comment', metadata.activityId, notification.id),
              type: 'new_comment',
              priority: ACTION_PRIORITY.new_comment,
              activityId: metadata.activityId,
              activityTitle: metadata.activityTitle || 'Activity',
              message: notification.message || 'New comment on your activity',
              createdAt: notification.created_at,
              metadata: {
                commentId: notification.id,
                commenterName: metadata.commenterName,
              },
            });
          }
        }
      }
    }

    // Sort by priority, then by createdAt (most recent first)
    actions.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Limit results
    const limitedActions = actions.slice(0, limit);

    return NextResponse.json({
      actions: limitedActions,
      total: actions.length,
      hasMore: actions.length > limit,
    });
  } catch (error) {
    console.error('[Dashboard Actions Required] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actions required' },
      { status: 500 }
    );
  }
}
