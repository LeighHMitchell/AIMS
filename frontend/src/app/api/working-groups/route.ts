import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  console.log('[API] GET /api/working-groups - Starting request');

  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('active');
    const sectorCode = searchParams.get('sector');

    let query = supabase
      .from('working_groups')
      .select('*')
      .order('label', { ascending: true });
    
    // Filter by active status if specified
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }
    
    // Filter by sector code if specified
    if (sectorCode) {
      query = query.eq('sector_code', sectorCode);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[API] Error fetching working groups:', error);
      
      // If table doesn't exist, return predefined list from our lib
      if (error.message.includes('does not exist')) {
        const { WORKING_GROUPS } = await import('@/lib/workingGroups');
        console.log('[API] Returning predefined working groups:', WORKING_GROUPS.length);
        return NextResponse.json(WORKING_GROUPS);
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('[API] Successfully fetched working groups:', data?.length || 0);
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    
    // Fallback to predefined list
    try {
      const { WORKING_GROUPS } = await import('@/lib/workingGroups');
      console.log('[API] Returning predefined working groups as fallback:', WORKING_GROUPS.length);
      return NextResponse.json(WORKING_GROUPS);
    } catch {
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: Request) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  console.log('[API] POST /api/working-groups - Starting request');

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.code || !body.label) {
      return NextResponse.json(
        { error: 'Code and label are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('working_groups')
      .insert([{
        code: body.code,
        label: body.label,
        sector_code: body.sector_code || null,
        description: body.description || null,
        is_active: body.is_active !== false // Default to true
      }])
      .select()
      .single();
    
    if (error) {
      console.error('[API] Error creating working group:', error);
      
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'A working group with this code already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('[API] Successfully created working group:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 