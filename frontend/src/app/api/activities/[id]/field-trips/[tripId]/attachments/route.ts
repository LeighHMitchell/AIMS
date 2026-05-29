import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import { FIELD_REPORT_MEDIA_TYPES } from '@/lib/schemas/field-report';

type RouteParams = { params: Promise<{ id: string; tripId: string }> };

const createAttachmentSchema = z.object({
  media_type: z.enum(FIELD_REPORT_MEDIA_TYPES),
  url: z.string().min(1),
  file_name: z.string().nullable().optional(),
  file_size: z.number().int().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  file_path: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
});

async function assertTripInScope(
  supabase: any,
  tripId: string,
  activityId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('location_field_reports')
    .select('id')
    .eq('id', tripId)
    .eq('activity_id', activityId)
    .is('location_id', null)
    .maybeSingle();
  return !error && !!data;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id: activityId, tripId } = await params;
  if (!(await assertTripInScope(supabase, tripId, activityId))) {
    return NextResponse.json({ error: 'Field trip not found' }, { status: 404 });
  }

  const { data, error } = await supabase!
    .from('location_field_report_attachments')
    .select('*')
    .eq('field_report_id', tripId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, attachments: data ?? [] });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { id: activityId, tripId } = await params;
  if (!(await assertTripInScope(supabase, tripId, activityId))) {
    return NextResponse.json({ error: 'Field trip not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  const parsed = createAttachmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid attachment data',
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
    .from('location_field_report_attachments')
    .insert({
      field_report_id: tripId,
      media_type: data.media_type,
      url: data.url,
      file_name: data.file_name ?? null,
      file_size: data.file_size ?? null,
      mime_type: data.mime_type ?? null,
      file_path: data.file_path ?? null,
      thumbnail_url: data.thumbnail_url ?? null,
      caption: data.caption ?? null,
      title: data.title ?? null,
      description: data.description ?? null,
      sort_order: data.sort_order ?? 0,
      uploaded_by: user!.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[FieldTripAttachments API] Create error:', error);
    return NextResponse.json(
      { error: `Failed to create attachment: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, attachment: created });
}
