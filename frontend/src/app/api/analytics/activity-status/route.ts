import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface StatusData {
  status: string;
  count: number;
  percentage: number;
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }

    // Get all activities with their status fields
    const { data: activities, error } = await supabaseAdmin
      .from('activities')
      .select('activity_status, publication_status, submission_status');

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
      // Activity Status
      const activityStatus = activity.activity_status || 'Unknown';
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

    return NextResponse.json({
      data: {
        activityStatus,
        publicationStatus,
        submissionStatus
      },
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