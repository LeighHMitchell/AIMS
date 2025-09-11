import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS API] GET /api/activities/[id]/countries-regions - Fetching countries/regions for activity:', id);
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('[AIMS API] Supabase client is null');
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }
    
    // Fetch activity with countries, regions, and custom geographies data
    const { data: activity, error } = await supabase
      .from('activities')
      .select('id, recipient_countries, recipient_regions, custom_geographies')
      .eq('id', id)
      .single();
    
    if (error || !activity) {
      console.error('[AIMS API] Activity not found:', error);
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    console.log('[AIMS API] Countries/regions data retrieved successfully');
    
    return NextResponse.json({
      countries: activity.recipient_countries || [],
      regions: activity.recipient_regions || [],
      customGeographies: activity.custom_geographies || []
    });
    
  } catch (error) {
    console.error('[AIMS API] Error fetching countries/regions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries/regions data' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { countries, regions, customGeographies } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    console.log('[AIMS API] PATCH /api/activities/[id]/countries-regions - Updating countries/regions for activity:', id);
    console.log('[AIMS API] Countries:', countries);
    console.log('[AIMS API] Regions:', regions);
    console.log('[AIMS API] Custom Geographies:', customGeographies);
    
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('[AIMS API] Supabase client is null');
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 503 }
      );
    }
    
    // Update activity with countries, regions, and custom geographies data
    const { data, error } = await supabase
      .from('activities')
      .update({
        recipient_countries: countries || [],
        recipient_regions: regions || [],
        custom_geographies: customGeographies || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, recipient_countries, recipient_regions, custom_geographies')
      .single();
    
    if (error) {
      console.error('[AIMS API] Error updating countries/regions:', error);
      return NextResponse.json(
        { error: 'Failed to update countries/regions data' },
        { status: 500 }
      );
    }

    console.log('[AIMS API] Countries/regions data updated successfully');
    
    return NextResponse.json({
      success: true,
      countries: data.recipient_countries || [],
      regions: data.recipient_regions || [],
      customGeographies: data.custom_geographies || []
    });
    
  } catch (error) {
    console.error('[AIMS API] Error updating countries/regions:', error);
    return NextResponse.json(
      { error: 'Failed to update countries/regions data' },
      { status: 500 }
    );
  }
}
