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
  { params }: { params: { id: string } }
) {
  console.log('[API] GET /api/custom-groups/[id] - Starting request');
  
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('custom_groups_with_stats')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (error) {
      console.error('[API] Error fetching custom group:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Custom group not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('[API] Successfully fetched custom group:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('[API] PUT /api/custom-groups/[id] - Starting request');
  
  try {
    const body = await request.json();
    
    // Update the custom group
    const { data, error } = await getSupabaseAdmin()
      .from('custom_groups')
      .update({
        name: body.name,
        description: body.description,
        purpose: body.purpose,
        tags: body.tags,
        group_code: body.group_code,
        is_public: body.is_public,
        logo: body.logo,
        banner: body.banner,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      console.error('[API] Error updating custom group:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Custom group not found' },
          { status: 404 }
        );
      }
      
      if (error.code === '23505') { // Unique violation
        if (error.message.includes('group_code')) {
          return NextResponse.json(
            { error: 'A group with this code already exists' },
            { status: 400 }
          );
        }
        if (error.message.includes('slug')) {
          return NextResponse.json(
            { error: 'A group with this name already exists' },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Update organization memberships if provided
    if (body.organization_ids && Array.isArray(body.organization_ids)) {
      // First, remove all existing memberships
      await getSupabaseAdmin()
        .from('custom_group_memberships')
        .delete()
        .eq('group_id', params.id);
      
      // Then add new memberships
      if (body.organization_ids.length > 0) {
        const memberships = body.organization_ids.map((orgId: string) => ({
          group_id: params.id,
          organization_id: orgId
        }));
        
        const { error: membershipError } = await getSupabaseAdmin()
          .from('custom_group_memberships')
          .insert(memberships);
        
        if (membershipError) {
          console.error('[API] Error updating group memberships:', membershipError);
          // Don't fail the entire request, but log the error
        }
      }
    }
    
    console.log('[API] Successfully updated custom group:', data);
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
  { params }: { params: { id: string } }
) {
  console.log('[API] DELETE /api/custom-groups/[id] - Starting request');
  
  try {
    const { error } = await getSupabaseAdmin()
      .from('custom_groups')
      .delete()
      .eq('id', params.id);
    
    if (error) {
      console.error('[API] Error deleting custom group:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Custom group not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('[API] Successfully deleted custom group');
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 