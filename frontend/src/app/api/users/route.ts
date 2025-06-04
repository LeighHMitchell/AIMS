import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('[AIMS] GET /api/users - Starting request');
  
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
    const email = searchParams.get('email');
    
    if (email) {
      // Get specific user by email
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('email', email)
        .single();
      
      if (error) {
        console.error('[AIMS] Error fetching user:', error);
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      console.log('[AIMS] Found user:', user.email);
      return NextResponse.json(user);
    } else {
      // Get all users
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          organization:organizations(*)
        `)
        .order('name');
      
      if (error) {
        console.error('[AIMS] Error fetching users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      console.log('[AIMS] Fetched users count:', users.length);
      return NextResponse.json(users);
    }
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/users - Starting request');
  
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
    const { name, email, role, organization_id } = body;
    
    console.log('[AIMS] Creating user with data:', { name, email, role, organization_id });
    
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Name, email, and role are required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{ name, email, role, organization_id }])
      .select(`
        *,
        organization:organizations(*)
      `)
      .single();
    
    if (error) {
      console.error('[AIMS] Error creating user:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Created user:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  console.log('[AIMS] PUT /api/users - Starting request');
  
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
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        organization:organizations(*)
      `)
      .single();
    
    if (error) {
      console.error('[AIMS] Error updating user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Updated user:', data.email);
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
  console.log('[AIMS] DELETE /api/users - Starting request');
  
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
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[AIMS] Error deleting user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Deleted user:', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 