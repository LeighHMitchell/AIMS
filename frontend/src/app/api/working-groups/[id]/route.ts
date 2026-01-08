import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API] GET /api/working-groups/[id] - Starting request');
  
  try {
    const { id } = await params;
    const { data, error } = await getSupabaseAdmin()
      .from('working_groups')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('[API] Error fetching working group:', error);
      
      // If table doesn't exist, try to find in predefined list
      if (error.message.includes('does not exist')) {
        const { WORKING_GROUPS } = await import('@/lib/workingGroups');
        const workingGroup = WORKING_GROUPS.find(wg => wg.id === id);
        
        if (workingGroup) {
          return NextResponse.json(workingGroup);
        }
        
        return NextResponse.json(
          { error: 'Working group not found' },
          { status: 404 }
        );
      }
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Working group not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('[API] Successfully fetched working group:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    
    // Fallback to predefined list
    try {
      const { WORKING_GROUPS } = await import('@/lib/workingGroups');
      const workingGroup = WORKING_GROUPS.find(wg => wg.id === id);
      
      if (workingGroup) {
        return NextResponse.json(workingGroup);
      }
      
      return NextResponse.json(
        { error: 'Working group not found' },
        { status: 404 }
      );
    } catch {
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API] PUT /api/working-groups/[id] - Starting request');
  
  try {
    const { id } = await params;
    const body = await request.json();
    
    const { data, error } = await getSupabaseAdmin()
      .from('working_groups')
      .update({
        label: body.label,
        description: body.description,
        sector_code: body.sector_code,
        is_active: body.is_active,
        status: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[API] Error updating working group:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Working group not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('[API] Successfully updated working group:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[API] DELETE /api/working-groups/[id] - Starting request');
  
  try {
    const { id } = await params;
    const { error } = await getSupabaseAdmin()
      .from('working_groups')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[API] Error deleting working group:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Working group not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('[API] Successfully deleted working group');
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 