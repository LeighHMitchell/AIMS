import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { data: endorsement, error } = await supabase
      .from('government_endorsements')
      .select('*')
      .eq('activity_id', id)
      .single();

    // Handle missing table or no data found
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - return null
        return NextResponse.json({ endorsement: null });
      }
      if (error.code === '42P01') {
        // Table does not exist - return null instead of error
        console.log('[AIMS API ERROR LOG] ===== ROUTE CALLED =====');
        console.log('Error fetching government endorsement:', error);
        return NextResponse.json({ endorsement: null });
      }
      // Other errors
      console.error('Error fetching government endorsement:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ endorsement: endorsement || null });
  } catch (error) {
    console.error('Error in government endorsement GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[Government Endorsement API] POST called for activity:', id);

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.error('[Government Endorsement API] Database connection failed');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const body = await request.json();
    console.log('[Government Endorsement API] Request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    const endorsementData = {
      activity_id: id,
      effective_date: body.effective_date || null,
      validation_status: body.validation_status || null,
      validating_authority: body.validating_authority || null,
      validation_notes: body.validation_notes || null,
      validation_date: body.validation_date || null,
      document_title: body.document_title || null,
      document_description: body.document_description || null,
      document_url: body.document_url || null,
      document_category: body.document_category || 'A09',
      document_language: body.document_language || 'en',
      document_date: body.document_date || null,
    };

    // Use upsert to handle both insert and update
    console.log('[Government Endorsement API] Upserting endorsement data:', JSON.stringify(endorsementData, null, 2));

    const result = await supabase
      .from('government_endorsements')
      .upsert(endorsementData, {
        onConflict: 'activity_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    console.log('[Government Endorsement API] Supabase result:', JSON.stringify(result, null, 2));

    const { data: endorsement, error } = result;

    if (error) {
      console.error('[Government Endorsement API] Error saving - full error:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
    }

    if (!endorsement) {
      console.error('[Government Endorsement API] No endorsement returned from upsert');
      return NextResponse.json({ error: 'No data returned from database' }, { status: 500 });
    }

    console.log('[Government Endorsement API] Endorsement saved successfully:', endorsement?.id);

    // Sync validation_status to the activity's submission_status
    // This ensures the Activity List "Validated" column and Pending Validations panel
    // reflect the validation status set in the Government Endorsement tab
    if (body.validation_status) {
      const submissionStatus = body.validation_status === 'validated'
        ? 'validated'
        : body.validation_status === 'rejected'
          ? 'rejected'
          : 'draft'; // 'more_info_requested' maps to 'draft' (not validated yet)

      const { error: activityError } = await supabase
        .from('activities')
        .update({
          submission_status: submissionStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (activityError) {
        console.error('Error syncing validation status to activity:', activityError);
        // Don't fail the request, endorsement was saved successfully
      }
    }

    return NextResponse.json({ endorsement });
  } catch (error) {
    console.error('[Government Endorsement API] Unexpected error in POST:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // PUT uses the same logic as POST for upsert
  return POST(request, context);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { error } = await supabase
      .from('government_endorsements')
      .delete()
      .eq('activity_id', id);

    if (error) {
      console.error('Error deleting government endorsement:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Reset the activity's submission_status to draft when endorsement is deleted
    const { error: activityError } = await supabase
      .from('activities')
      .update({
        submission_status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (activityError) {
      console.error('Error resetting activity submission status:', activityError);
      // Don't fail the request, endorsement was deleted successfully
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in government endorsement DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
