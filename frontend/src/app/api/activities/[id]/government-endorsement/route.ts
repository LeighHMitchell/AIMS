import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { data: endorsement, error } = await supabase
      .from('government_endorsements')
      .select('*')
      .eq('activity_id', params.id)
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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const body = await request.json();

    // Validate required fields
    const endorsementData = {
      activity_id: params.id,
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
    const { data: endorsement, error } = await supabase
      .from('government_endorsements')
      .upsert(endorsementData, { 
        onConflict: 'activity_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving government endorsement:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ endorsement });
  } catch (error) {
    console.error('Error in government endorsement POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // PUT uses the same logic as POST for upsert
  return POST(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { error } = await supabase
      .from('government_endorsements')
      .delete()
      .eq('activity_id', params.id);

    if (error) {
      console.error('Error deleting government endorsement:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in government endorsement DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
