import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface StatusData {
  status: string;
  count: number;
  percentage: number;
}

interface ActivityDetail {
  id: string;
  title: string;
  iati_identifier: string | null;
  activity_status: string;
  publication_status: string;
  submission_status: string;
}

export async function GET() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const supabaseAdmin = supabase;

    // Get all activities with their status fields and details for table view
    const { data: activities, error } = await supabaseAdmin
      .from('activities')
      .select('id, title_narrative, iati_identifier, activity_status, publication_status, submission_status');

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities data' },
        { status: 500 }
      );
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({
        data: {
          activityStatus: [],
          publicationStatus: [],
          submissionStatus: []
        }
      });
    }

    // Process activity status
    const activityStatusCounts = new Map<string, number>();
    const publicationStatusCounts = new Map<string, number>();
    const submissionStatusCounts = new Map<string, number>();

    activities.forEach((activity: any) => {
      // Activity Status - default to '1' (Pipeline) for consistency with IATI standard
      const activityStatus = activity.activity_status || '1';
      activityStatusCounts.set(activityStatus, (activityStatusCounts.get(activityStatus) || 0) + 1);

      // Publication Status
      const publicationStatus = activity.publication_status || 'Unknown';
      publicationStatusCounts.set(publicationStatus, (publicationStatusCounts.get(publicationStatus) || 0) + 1);

      // Submission Status
      const submissionStatus = activity.submission_status || 'Unknown';
      submissionStatusCounts.set(submissionStatus, (submissionStatusCounts.get(submissionStatus) || 0) + 1);
    });

    const totalActivities = activities.length;

    // Convert to arrays with percentages
    const createStatusArray = (statusMap: Map<string, number>): StatusData[] => {
      return Array.from(statusMap.entries())
        .map(([status, count]) => ({
          status,
          count,
          percentage: (count / totalActivities) * 100
        }))
        .sort((a, b) => b.count - a.count); // Sort by count descending
    };

    const activityStatus = createStatusArray(activityStatusCounts);
    const publicationStatus = createStatusArray(publicationStatusCounts);
    const submissionStatus = createStatusArray(submissionStatusCounts);

    // Create activity details list for table view
    const activityDetails: ActivityDetail[] = activities.map((activity: any) => ({
      id: activity.id,
      title: activity.title_narrative || 'Untitled Activity',
      iati_identifier: activity.iati_identifier,
      activity_status: activity.activity_status || '1', // Default to Pipeline for consistency
      publication_status: activity.publication_status || 'Unknown',
      submission_status: activity.submission_status || 'Unknown'
    }));

    return NextResponse.json({
      data: {
        activityStatus,
        publicationStatus,
        submissionStatus
      },
      activityDetails,
      summary: {
        totalActivities,
        activityStatusTypes: activityStatus.length,
        publicationStatusTypes: publicationStatus.length,
        submissionStatusTypes: submissionStatus.length
      }
    });

  } catch (error) {
    console.error('Error in activity-status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}