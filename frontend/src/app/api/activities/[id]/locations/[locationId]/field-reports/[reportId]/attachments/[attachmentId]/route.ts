import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

type RouteParams = {
  params: Promise<{ id: string; locationId: string; reportId: string; attachmentId: string }>;
};

const updateAttachmentSchema = z.object({
  caption: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { reportId, attachmentId } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  const parsed = updateAttachmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid attachment update',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const { data: updated, error } = await supabase!
    .from('location_field_report_attachments')
    .update(parsed.data)
    .eq('id', attachmentId)
    .eq('field_report_id', reportId)
    .select()
    .single();

  if (error) {
    console.error('[FieldReportAttachments API] Update error:', error);
    return NextResponse.json({ error: `Failed to update attachment: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, attachment: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const { reportId, attachmentId } = await params;

  const { error } = await supabase!
    .from('location_field_report_attachments')
    .delete()
    .eq('id', attachmentId)
    .eq('field_report_id', reportId);

  if (error) {
    console.error('[FieldReportAttachments API] Delete error:', error);
    return NextResponse.json({ error: `Failed to delete attachment: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
