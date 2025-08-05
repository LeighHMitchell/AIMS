import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/activities/[id]/results/[resultId]/indicators - Fetch indicators for a result
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; resultId: string } }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('[Indicators API] Supabase admin client not available');
    return NextResponse.json({ 
      error: 'Database not available',
      indicators: []
    }, { status: 500 });
  }

  try {
    const { resultId } = params;
    console.log(`[Indicators API] Fetching indicators for result: ${resultId}`);

    const { data: indicators, error } = await supabase
      .from('result_indicators')
      .select(`
        *,
        baseline:indicator_baselines(*),
        periods:indicator_periods(*)
      `)
      .eq('result_id', resultId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Indicators API] Database error:', error);
      
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json({ 
          indicators: [],
          message: 'Indicator tables not yet created. Please run the database migration.'
        });
      }
      
      return NextResponse.json({ 
        error: 'Database query failed',
        details: error.message,
        indicators: []
      }, { status: 500 });
    }

    console.log(`[Indicators API] Found ${indicators?.length || 0} indicators`);
    return NextResponse.json({ indicators: indicators || [] });

  } catch (error) {
    console.error('[Indicators API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error',
      indicators: []
    }, { status: 500 });
  }
}

// POST /api/activities/[id]/results/[resultId]/indicators - Create a new indicator
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; resultId: string } }
) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('[Indicators API] Supabase admin client not available');
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }

  try {
    const { resultId } = params;
    const body = await request.json();

    console.log(`[Indicators API] Creating indicator for result: ${resultId}`);
    console.log('[Indicators API] Request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!resultId) {
      return NextResponse.json({ 
        error: 'Result ID is required',
        details: 'Missing result ID in request parameters'
      }, { status: 400 });
    }

    // Validate measure type
    const validMeasures = ['unit', 'percentage', 'currency', 'qualitative'];
    const measure = body.measure || 'unit';
    if (!validMeasures.includes(measure)) {
      return NextResponse.json({ 
        error: 'Invalid measure type',
        details: `Measure must be one of: ${validMeasures.join(', ')}`
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
        error: 'Indicator title is required',
        details: 'Please provide a title for the indicator'
      }, { status: 400 });
    }

    // Prepare the data for insertion
    const insertData = {
      result_id: resultId,
      measure: measure,
      ascending: Boolean(body.ascending !== false), // Default to true
      aggregation_status: Boolean(body.aggregation_status),
      title: titleObj,
      description: descriptionObj,
      reference_vocab: body.reference_vocab || null,
      reference_code: body.reference_code || null,
      reference_uri: body.reference_uri || null
    };

    console.log('[Indicators API] Insert data:', JSON.stringify(insertData, null, 2));

    const { data: indicator, error } = await supabase
      .from('result_indicators')
      .insert([insertData])
      .select(`
        *,
        baseline:indicator_baselines(*),
        periods:indicator_periods(*)
      `)
      .single();

    if (error) {
      console.error('[Indicators API] Database error:', error);
      
      // Check for specific constraint violations
      if (error.message.includes('check constraint')) {
        return NextResponse.json({ 
          error: 'Invalid data format',
          details: 'One or more fields contain invalid values. Please check the measure type and other inputs.'
        }, { status: 400 });
      }

      if (error.message.includes('foreign key')) {
        return NextResponse.json({ 
          error: 'Invalid result ID',
          details: 'The specified result does not exist.'
        }, { status: 400 });
      }

      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database tables not found',
          details: 'Indicator tables have not been created yet. Please run the database migration.'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Database error',
        details: error.message 
      }, { status: 400 });
    }

    console.log('[Indicators API] Indicator created successfully:', indicator.id);
    return NextResponse.json({ indicator });

  } catch (error) {
    console.error('[Indicators API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Failed to create indicator',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}