import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

interface FocalPoint {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  type: 'government_focal_point' | 'development_partner_focal_point';
}

interface ActivityWithFocalPoints {
  id: string;
  title: string;
  iatiIdentifier?: string;
  governmentFocalPoints: FocalPoint[];
  developmentPartnerFocalPoints: FocalPoint[];
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organization_id');

  if (!organizationId) {
    return NextResponse.json(
      { error: 'organization_id is required' },
      { status: 400 }
    );
  }

  try {
    console.log('[Focal Points Data Clinic] Fetching activities for org:', organizationId);

    // 1. Fetch activities where reporting_org_id matches the organization
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, title_narrative, iati_identifier')
      .eq('reporting_org_id', organizationId)
      .order('updated_at', { ascending: false });

    if (activitiesError) {
      console.error('[Focal Points Data Clinic] Activities query error:', activitiesError);
      throw activitiesError;
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({
        activities: [],
        total: 0,
        missingCount: 0,
        message: 'No activities found for this organization'
      });
    }

    console.log('[Focal Points Data Clinic] Found activities:', activities.length);

    // 2. Get all activity IDs for batch query
    const activityIds = activities.map(a => a.id);

    // 3. Batch fetch focal points for all activities
    const { data: focalPoints, error: focalPointsError } = await supabase
      .from('activity_contacts')
      .select('id, activity_id, type, first_name, last_name, email, profile_photo')
      .in('activity_id', activityIds)
      .in('type', ['government_focal_point', 'development_partner_focal_point']);

    if (focalPointsError) {
      console.error('[Focal Points Data Clinic] Focal points query error:', focalPointsError);
      throw focalPointsError;
    }

    console.log('[Focal Points Data Clinic] Found focal points:', focalPoints?.length || 0);

    // 4. Group focal points by activity_id and type
    const focalPointsByActivity = new Map<string, {
      government: FocalPoint[];
      developmentPartner: FocalPoint[];
    }>();

    // Initialize all activities with empty arrays
    activityIds.forEach(id => {
      focalPointsByActivity.set(id, { government: [], developmentPartner: [] });
    });

    // Populate focal points
    (focalPoints || []).forEach((fp: any) => {
      const activityFPs = focalPointsByActivity.get(fp.activity_id);
      if (!activityFPs) return;

      const focalPoint: FocalPoint = {
        id: fp.id,
        name: `${fp.first_name || ''} ${fp.last_name || ''}`.trim() || fp.email,
        email: fp.email,
        avatar_url: fp.profile_photo,
        type: fp.type,
      };

      if (fp.type === 'government_focal_point') {
        activityFPs.government.push(focalPoint);
      } else if (fp.type === 'development_partner_focal_point') {
        activityFPs.developmentPartner.push(focalPoint);
      }
    });

    // 5. Filter activities that are missing at least one focal point type
    const activitiesWithMissingFPs: ActivityWithFocalPoints[] = [];

    activities.forEach((activity: any) => {
      const fps = focalPointsByActivity.get(activity.id);
      if (!fps) return;

      const missingGovernment = fps.government.length === 0;
      const missingDevelopmentPartner = fps.developmentPartner.length === 0;

      // Include if missing either type
      if (missingGovernment || missingDevelopmentPartner) {
        activitiesWithMissingFPs.push({
          id: activity.id,
          title: activity.title_narrative || 'Untitled Activity',
          iatiIdentifier: activity.iati_identifier,
          governmentFocalPoints: fps.government,
          developmentPartnerFocalPoints: fps.developmentPartner,
        });
      }
    });

    console.log('[Focal Points Data Clinic] Activities missing focal points:', activitiesWithMissingFPs.length);

    return NextResponse.json({
      activities: activitiesWithMissingFPs,
      total: activities.length,
      missingCount: activitiesWithMissingFPs.length,
    });

  } catch (error) {
    console.error('[Focal Points Data Clinic] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch focal points data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

