import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/activities/[id]/results - Fetch all results for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('[Results API] Supabase admin client not available');
    return NextResponse.json({ 
      error: 'Database not available',
      results: []
    }, { status: 500 });
  }

  try {
    const activityId = params.id;
    console.log(`[Results API] Fetching results for activity: ${activityId}`);

    // First check if the activity_results table exists by doing a simple query
    const { data: results, error } = await supabase
      .from('activity_results')
      .select(`
        *,
        indicators:result_indicators(
          *,
          baseline:indicator_baselines(*),
          periods:indicator_periods(*)
        )
      `)
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Results API] Database error:', error);
      
      // Check if it's a table doesn't exist error
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('[Results API] Tables do not exist yet - returning empty results');
        return NextResponse.json({ 
          results: [],
          message: 'Results tables not yet created. Please run the database migration.'
        });
      }
      
      return NextResponse.json({ 
        error: 'Database query failed',
        details: error.message,
        results: []
      }, { status: 500 });
    }

    console.log(`[Results API] Found ${results?.length || 0} results`);
    return NextResponse.json({ results: results || [] });

  } catch (error) {
    console.error('[Results API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error',
      results: []
    }, { status: 500 });
  }
}

// POST /api/activities/[id]/results - Create a new result
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('[Results API] Supabase admin client not available');
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const activityId = params.id;
    const body = await request.json();

    console.log(`[Results API] Creating result for activity: ${activityId}`);
    console.log('[Results API] Request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!activityId) {
      return NextResponse.json({ 
        error: 'Activity ID is required',
        details: 'Missing activity ID in request parameters'
      }, { status: 400 });
    }

    // Validate result type
    const validTypes = ['output', 'outcome', 'impact', 'other'];
    const resultType = body.type || 'output';
    if (!validTypes.includes(resultType)) {
      return NextResponse.json({ 
        error: 'Invalid result type',
        details: `Result type must be one of: ${validTypes.join(', ')}`
      }, { status: 400 });
    }

    // Ensure title is properly formatted as JSONB
    let titleObj = body.title;
    if (typeof titleObj === 'string') {
      titleObj = { en: titleObj };
    } else if (!titleObj || typeof titleObj !== 'object') {
      titleObj = { en: '' };
    }

    // Ensure description is properly formatted as JSONB
    let descriptionObj = body.description;
    if (typeof descriptionObj === 'string') {
      descriptionObj = { en: descriptionObj };
    } else if (!descriptionObj || typeof descriptionObj !== 'object') {
      descriptionObj = { en: '' };
    }

    // Validate that title has some content
    const titleValues = Object.values(titleObj);
    if (!titleValues.some(val => val && typeof val === 'string' && val.trim().length > 0)) {
      return NextResponse.json({ 
        error: 'Result title is required',
        details: 'Please provide a title for the result'
      }, { status: 400 });
    }

    // Prepare the data for insertion
    const insertData = {
      activity_id: activityId,
      type: resultType,
      aggregation_status: Boolean(body.aggregation_status),
      title: titleObj,
      description: descriptionObj
    };

    console.log('[Results API] Insert data:', JSON.stringify(insertData, null, 2));

    const { data: result, error } = await supabase
      .from('activity_results')
      .insert([insertData])
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

      if (error.message.includes('foreign key')) {
        return NextResponse.json({ 
          error: 'Invalid activity ID',
          details: 'The specified activity does not exist.'
        }, { status: 400 });
      }

      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database tables not found',
          details: 'Results tables have not been created yet. Please run the database migration.'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Database error',
        details: error.message 
      }, { status: 400 });
    }

    console.log('[Results API] Result created successfully:', result.id);
    return NextResponse.json({ result });

  } catch (error) {
    console.error('[Results API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to create result',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}