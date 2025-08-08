import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// PATCH /api/activities/[id]/results/[resultId] - Update a result
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; resultId: string } }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('[Results API] Supabase admin client not available');
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { resultId } = params;
    const body = await request.json();

    console.log(`[Results API] Updating result: ${resultId}`);
    console.log('[Results API] Update data:', JSON.stringify(body, null, 2));

    // Validate result type if provided
    if (body.type) {
      const validTypes = ['output', 'outcome', 'impact', 'other'];
      if (!validTypes.includes(body.type)) {
        return NextResponse.json({ 
          error: 'Invalid result type',
          details: `Result type must be one of: ${validTypes.join(', ')}`
        }, { status: 400 });
      }
    }

    // Ensure title is properly formatted as JSONB if provided
    let updateData = { ...body };
    if (body.title) {
      if (typeof body.title === 'string') {
        updateData.title = { en: body.title };
      } else if (!body.title || typeof body.title !== 'object') {
        updateData.title = { en: '' };
      }

      // Validate that title has some content
      const titleValues = Object.values(updateData.title);
      if (!titleValues.some(val => val && typeof val === 'string' && val.trim())) {
        return NextResponse.json({ 
          error: 'Result title is required',
          details: 'Please provide a title for the result'
        }, { status: 400 });
      }
    }

    // Ensure description is properly formatted as JSONB if provided
    if (body.description !== undefined) {
      if (typeof body.description === 'string') {
        updateData.description = { en: body.description };
      } else if (body.description && typeof body.description !== 'object') {
        updateData.description = { en: '' };
      }
    }

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    console.log('[Results API] Final update data:', JSON.stringify(updateData, null, 2));

    const { data: result, error } = await supabase
      .from('activity_results')
      .update(updateData)
      .eq('id', resultId)
      .select()
      .single();

    if (error) {
      console.error('[Results API] Database error:', error);
      
      // Check for specific constraint violations
      if (error.message.includes('check constraint')) {
        return NextResponse.json({ 
          error: 'Invalid data format',
          details: 'One or more fields contain invalid values. Please check the result type and other inputs.'
        }, { status: 400 });
      }

      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database tables not found',
          details: 'Results tables have not been created yet. Please run the database migration.'
        }, { status: 500 });
      }

      // Check if result not found
      if (error.message.includes('JSON object requested, multiple (or no) rows returned')) {
        return NextResponse.json({ 
          error: 'Result not found',
          details: 'The specified result does not exist.'
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Database error',
        details: error.message 
      }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ 
        error: 'Result not found',
        details: 'The specified result does not exist.'
      }, { status: 404 });
    }

    console.log('[Results API] Result updated successfully:', result.id);
    return NextResponse.json({ result });

  } catch (error) {
    console.error('[Results API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/activities/[id]/results/[resultId] - Delete a result
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; resultId: string } }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('[Results API] Supabase admin client not available');
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { resultId } = params;

    console.log(`[Results API] Deleting result: ${resultId}`);

    // Delete the result (this should cascade to indicators, baselines, and periods)
    const { error } = await supabase
      .from('activity_results')
      .delete()
      .eq('id', resultId);

    if (error) {
      console.error('[Results API] Database error:', error);
      
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database tables not found',
          details: 'Results tables have not been created yet.'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Database error',
        details: error.message 
      }, { status: 400 });
    }

    console.log('[Results API] Result deleted successfully:', resultId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Results API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}