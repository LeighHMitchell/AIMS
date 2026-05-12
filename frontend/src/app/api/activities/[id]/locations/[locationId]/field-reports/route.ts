import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { fieldReportFormSchema } from '@/lib/schemas/field-report';

type RouteParams = { params: Promise<{ id: string; locationId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id: activityId, locationId } = await params;
  if (!activityId || !locationId) {
    return NextResponse.json({ error: 'Activity and location IDs are required' }, { status: 400 });
  }

  const { data: reports, error } = await supabase!
    .from('location_field_reports')
    .select(
      `*,
       lead_organisation:lead_organisation_id(id,name,acronym),
       attachments:location_field_report_attachments(*)`,
    )
    .eq('location_id', locationId)
    .eq('activity_id', activityId)
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[FieldReports API] List error:', error);
    return NextResponse.json({ error: `Failed to fetch field reports: ${error.message}` }, { status: 500 });
  }

  const withCounts = (reports ?? []).map((r: any) => {
    const attachments = (r.attachments ?? []) as Array<{ media_type: string }>;
    return {
      ...r,
      photo_count: attachments.filter((a) => a.media_type === 'photo').length,
      document_count: attachments.filter((a) => a.media_type === 'document').length,
    };
  });

  return NextResponse.json({ success: true, fieldReports: withCounts });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id: activityId, locationId } = await params;
  if (!activityId || !locationId) {
    return NextResponse.json({ error: 'Activity and location IDs are required' }, { status: 400 });
  }

  const body = await request.json();
  const parsed = fieldReportFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid field report data',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const { data: created, error } = await supabase!
    .from('location_field_reports')
    .insert({
      location_id: locationId,
      activity_id: activityId,
      event_type: data.event_type,
      event_type_other: data.event_type === 'other' ? data.event_type_other ?? null : null,
      title: data.title.trim(),
      event_date: data.event_date || null,
      event_end_date: data.event_end_date || null,
      narrative: data.narrative ?? null,
      participants_count: data.participants_count ?? null,
      lead_organisation_id: data.lead_organisation_id || null,
      created_by: user!.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[FieldReports API] Create error:', error);
    return NextResponse.json({ error: `Failed to create field report: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, fieldReport: created });
}
