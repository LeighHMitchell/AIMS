import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

interface Activity {
  id: string;
  title: string;
  iati_identifier?: string;
  activity_status?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  created_at: string;
  updated_at: string;
  default_aid_type?: string;
  default_finance_type?: string;
  default_flow_type?: string;
  activity_sectors?: Array<{
    id: string;
    sector_id: string;
    percentage: number;
  }>;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const missingFields = searchParams.get('missing_fields') === 'true';

  try {
    console.log('[Data Clinic API] Fetching activities...');
    
    // First, try to get basic activity data that should always exist
    let query = supabase
      .from('activities')
      .select(`
        id,
        title,
        iati_identifier,
        activity_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        created_at,
        updated_at
      `)
      .order('updated_at', { ascending: false })
      .limit(100);

    const { data: basicActivities, error: basicError } = await query;

    if (basicError) {
      console.error('[Data Clinic API] Basic query error:', basicError);
      throw basicError;
    }

    console.log('[Data Clinic API] Found basic activities:', basicActivities?.length || 0);

    if (!basicActivities || basicActivities.length === 0) {
      return NextResponse.json({ 
        activities: [], 
        dataGaps: [],
        message: 'No activities found in database'
      });
    }

    // Now try to get the IATI fields - this might fail if columns don't exist
    let activities = basicActivities;
    let hasIatiFields = false;

    try {
      const { data: fullActivities, error: fullError } = await supabase
        .from('activities')
        .select(`
          id,
          title,
          iati_identifier,
          activity_status,
          planned_start_date,
          planned_end_date,
          actual_start_date,
          actual_end_date,
          created_at,
          updated_at,
          default_aid_type,
          default_finance_type,
          default_flow_type,
          activity_sectors (
            id,
            sector_id,
            percentage
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (!fullError && fullActivities) {
        activities = fullActivities;
        hasIatiFields = true;
        console.log('[Data Clinic API] Successfully loaded IATI fields');
      }
    } catch (e) {
      console.log('[Data Clinic API] IATI fields not available yet - migration may be needed');
    }

    // For debugging - return all activities if missing_fields is false
    if (!missingFields) {
      const formattedActivities = activities.map((activity: Activity) => ({
        ...activity,
        sectors: activity.activity_sectors || [],
        iatiIdentifier: activity.iati_identifier,
        activityStatus: activity.activity_status,
        plannedStartDate: activity.planned_start_date,
        plannedEndDate: activity.planned_end_date,
        actualStartDate: activity.actual_start_date,
        actualEndDate: activity.actual_end_date,
        createdAt: activity.created_at,
        updatedAt: activity.updated_at,
        hasIatiFields
      }));
      
      return NextResponse.json({ 
        activities: formattedActivities,
        dataGaps: [],
        totalCount: activities.length,
        hasIatiFields,
        message: hasIatiFields ? 'All fields available' : 'IATI fields missing - please run migration'
      });
    }

    // Check if we want to show all activities (for debugging)
    const showAll = searchParams.get('show_all') === 'true';

    // Calculate data gaps only if we have IATI fields
    const dataGaps = [];
    let activitiesWithGaps = [];

    if (hasIatiFields) {
      let missingAidType = 0;
      let missingFinanceType = 0;
      let missingFlowType = 0;
      let missingSector = 0;
      let missingStartDate = 0;
      let missingStatus = 0;

      for (const activity of activities) {
        let hasGap = false;

        // Check only fields that might exist
        if (!activity.default_aid_type) {
          missingAidType++;
          hasGap = true;
        }
        if (!activity.default_finance_type) {
          missingFinanceType++;
          hasGap = true;
        }
        if (!activity.default_flow_type) {
          missingFlowType++;
          hasGap = true;
        }
        if (!activity.activity_sectors || activity.activity_sectors.length === 0) {
          missingSector++;
          hasGap = true;
        }
        if (!activity.planned_start_date && !activity.actual_start_date) {
          missingStartDate++;
          hasGap = true;
        }
        if (!activity.activity_status) {
          missingStatus++;
          hasGap = true;
        }

        // Include activity if it has gaps OR if show_all is true
        if (hasGap || showAll) {
          activitiesWithGaps.push({
            ...activity,
            sectors: activity.activity_sectors || [],
            iatiIdentifier: activity.iati_identifier,
            activityStatus: activity.activity_status,
            plannedStartDate: activity.planned_start_date,
            plannedEndDate: activity.planned_end_date,
            actualStartDate: activity.actual_start_date,
            actualEndDate: activity.actual_end_date,
            createdAt: activity.created_at,
            updatedAt: activity.updated_at
          });
        }
      }

      // Add data gaps summary
      if (missingAidType > 0) {
        dataGaps.push({ field: 'missing_aid_type', label: 'Missing Aid Type', count: missingAidType });
      }
      if (missingFinanceType > 0) {
        dataGaps.push({ field: 'missing_finance_type', label: 'Missing Finance Type', count: missingFinanceType });
      }
      if (missingFlowType > 0) {
        dataGaps.push({ field: 'missing_default_flow_type', label: 'Missing Default Flow Type', count: missingFlowType });
      }
      if (missingSector > 0) {
        dataGaps.push({ field: 'missing_sector', label: 'Missing Sector', count: missingSector });
      }
      if (missingStartDate > 0) {
        dataGaps.push({ field: 'missing_start_date', label: 'Missing Start Date', count: missingStartDate });
      }
      if (missingStatus > 0) {
        dataGaps.push({ field: 'missing_status', label: 'Missing Status', count: missingStatus });
      }
    } else {
      // If no IATI fields, show all activities as potentially having gaps
      activitiesWithGaps = activities.map((activity: Activity) => ({
        ...activity,
        sectors: [],
        iatiIdentifier: activity.iati_identifier,
        activityStatus: activity.activity_status,
        plannedStartDate: activity.planned_start_date,
        plannedEndDate: activity.planned_end_date,
        actualStartDate: activity.actual_start_date,
        actualEndDate: activity.actual_end_date,
        createdAt: activity.created_at,
        updatedAt: activity.updated_at
      }));

      // Add a special data gap for missing columns
      dataGaps.push({ 
        field: 'missing_columns', 
        label: 'Database Migration Required', 
        count: activities.length 
      });
    }

    console.log('[Data Clinic API] Activities with gaps:', activitiesWithGaps.length);
    console.log('[Data Clinic API] Data gaps summary:', dataGaps);

    return NextResponse.json({
      activities: activitiesWithGaps,
      dataGaps,
      totalCount: activities.length,
      gapsCount: activitiesWithGaps.length,
      hasIatiFields,
      message: hasIatiFields ? null : 'IATI fields missing - please run migration'
    });

  } catch (error) {
    console.error('[Data Clinic API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch activities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 