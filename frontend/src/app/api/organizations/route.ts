import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function GET(request: NextRequest) {
  console.log('[AIMS] GET /api/organizations - Starting request');
  
  try {
    // Check if supabaseAdmin is properly initialized
    if (!supabaseAdmin) {
      console.error('[AIMS] supabaseAdmin is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    const { data: organizations, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('[AIMS] Error fetching organizations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Fetched organizations count:', organizations.length);
    
    const response = NextResponse.json(organizations);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/organizations - Starting request');
  
  try {
    // Check if supabaseAdmin is properly initialized
    if (!supabaseAdmin) {
      console.error('[AIMS] supabaseAdmin is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { name, type, country } = body;
    
    console.log('[AIMS] Creating organization with data:', { name, type, country });
    
    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }
    
    // Check if organization with same name already exists
    const { data: existingOrgs, error: checkError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .ilike('name', name);
    
    if (checkError) {
      console.error('[AIMS] Error checking existing organizations:', checkError);
      return NextResponse.json({ error: 'Failed to check existing organizations' }, { status: 500 });
    }
    
    if (existingOrgs && existingOrgs.length > 0) {
      return NextResponse.json({ error: 'Organization with this name already exists' }, { status: 400 });
    }
    
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .insert([{ name, type, country }])
      .select()
      .single();
    
    if (error) {
      console.error('[AIMS] Error creating organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Created organization:', data);
    
    const response = NextResponse.json(data, { status: 201 });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  console.log('[AIMS] PUT /api/organizations - Starting request');
  
  try {
    // Check if supabaseAdmin is properly initialized
    if (!supabaseAdmin) {
      console.error('[AIMS] supabaseAdmin is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[AIMS] Error updating organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Updated organization:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  console.log('[AIMS] DELETE /api/organizations - Starting request');
  
  try {
    // Check if supabaseAdmin is properly initialized
    if (!supabaseAdmin) {
      console.error('[AIMS] supabaseAdmin is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    // Check if organization has users before deleting
    const { data: users, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('organization_id', id)
      .limit(1);
    
    if (checkError) {
      console.error('[AIMS] Error checking organization users:', checkError);
      return NextResponse.json({ error: 'Failed to check organization users' }, { status: 500 });
    }
    
    if (users && users.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete organization with existing users' },
        { status: 400 }
      );
    }
    
    const { error } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[AIMS] Error deleting organization:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Deleted organization:', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 