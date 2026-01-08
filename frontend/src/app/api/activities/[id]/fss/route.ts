import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET - Fetch FSS with forecasts for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id: activityId } = await params;

    console.log('[FSS API] GET request for activityId:', activityId);

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    // Fetch FSS record
    const { data: fss, error: fssError } = await supabase
      .from('forward_spending_survey')
      .select('*')
      .eq('activity_id', activityId)
      .single();

    if (fssError && fssError.code !== 'PGRST116') { // PGRST116 = Not found, which is OK
      console.error('[FSS API] Error fetching FSS:', fssError);
      return NextResponse.json({ error: 'Failed to fetch FSS' }, { status: 500 });
    }

    if (!fss) {
      console.log('[FSS API] No FSS found for activity');
      return NextResponse.json(null);
    }

    // Fetch forecasts
    const { data: forecasts, error: forecastsError } = await supabase
      .from('fss_forecasts')
      .select('*')
      .eq('fss_id', fss.id)
      .order('forecast_year', { ascending: true });

    if (forecastsError) {
      console.error('[FSS API] Error fetching forecasts:', forecastsError);
      return NextResponse.json({ error: 'Failed to fetch forecasts' }, { status: 500 });
    }

    console.log('[FSS API] Returning FSS with', forecasts?.length || 0, 'forecasts');
    return NextResponse.json({ ...fss, forecasts: forecasts || [] });
  } catch (error) {
    console.error('[FSS API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Create or update FSS
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id: activityId } = await params;
    const body = await request.json();

    console.log('[FSS API] PUT request for activityId:', activityId, 'body:', body);

    // Validate required fields
    if (!body.extraction_date) {
      return NextResponse.json({ error: 'Extraction date is required' }, { status: 400 });
    }

    // Validate priority if provided
    if (body.priority !== undefined && body.priority !== null) {
      const priority = parseInt(body.priority);
      if (isNaN(priority) || priority < 1 || priority > 5) {
        return NextResponse.json({ error: 'Priority must be between 1 and 5' }, { status: 400 });
      }
    }

    // Validate phaseout year if provided
    if (body.phaseout_year) {
      const year = parseInt(body.phaseout_year);
      if (isNaN(year) || year < 2000 || year > 2100) {
        return NextResponse.json({ error: 'Invalid phaseout year' }, { status: 400 });
      }
    }

    // Upsert FSS record
    const { data: fss, error: fssError } = await supabase
      .from('forward_spending_survey')
      .upsert({
        activity_id: activityId,
        extraction_date: body.extraction_date,
        priority: body.priority || null,
        phaseout_year: body.phaseout_year || null,
        notes: body.notes || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'activity_id' })
      .select()
      .single();

    if (fssError) {
      console.error('[FSS API] Error upserting FSS:', fssError);
      return NextResponse.json({ error: 'Failed to save FSS', details: fssError.message }, { status: 500 });
    }

    console.log('[FSS API] Successfully saved FSS:', fss.id);
    return NextResponse.json(fss);
  } catch (error) {
    console.error('[FSS API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove FSS and all forecasts
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id: activityId } = await params;

    console.log('[FSS API] DELETE request for activityId:', activityId);

    const { error } = await supabase
      .from('forward_spending_survey')
      .delete()
      .eq('activity_id', activityId);

    if (error) {
      console.error('[FSS API] Error deleting FSS:', error);
      return NextResponse.json({ error: 'Failed to delete FSS' }, { status: 500 });
    }

    console.log('[FSS API] Successfully deleted FSS');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FSS API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

