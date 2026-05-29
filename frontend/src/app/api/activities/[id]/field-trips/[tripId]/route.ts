import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { fieldTripFormSchema } from '@/lib/schemas/field-report';

type RouteParams = { params: Promise<{ id: string; tripId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id: activityId, tripId } = await params;

  const { data: trip, error } = await supabase!
    .from('location_field_reports')
    .select(
      `*,
       lead_organisation:lead_organisation_id(id,name,acronym),
       attachments:location_field_report_attachments(*)`,
    )
    .eq('id', tripId)
    .eq('activity_id', activityId)
    .is('location_id', null)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === 'PGRST116' ? 404 : 500 },
    );
  }

  return NextResponse.json({ success: true, fieldTrip: trip });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id: activityId, tripId } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  const parsed = fieldTripFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid field trip data',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const { data: updated, error } = await supabase!
    .from('location_field_reports')
    .update({
      event_type: data.event_type,
      event_type_other: data.event_type === 'other' ? data.event_type_other ?? null : null,
      title: data.title.trim(),
      place_name: data.place_name.trim(),
      latitude: data.latitude,
      longitude: data.longitude,
      event_date: data.event_date || null,
      event_end_date: data.event_end_date || null,
      narrative: data.narrative ?? null,
      participants_count: data.participants_count ?? null,
      lead_organisation_id: data.lead_organisation_id || null,
    })
    .eq('id', tripId)
    .eq('activity_id', activityId)
    .is('location_id', null)
    .select()
    .single();

  if (error) {
    console.error('[FieldTrips API] Update error:', error);
    return NextResponse.json(
      { error: `Failed to update field trip: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, fieldTrip: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id: activityId, tripId } = await params;

  const { error } = await supabase!
    .from('location_field_reports')
    .delete()
    .eq('id', tripId)
    .eq('activity_id', activityId)
    .is('location_id', null);

  if (error) {
    console.error('[FieldTrips API] Delete error:', error);
    return NextResponse.json(
      { error: `Failed to delete field trip: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
