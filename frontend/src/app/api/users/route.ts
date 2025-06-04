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
    
    // Validate organization_id if provided
    if (organization_id) {
      console.log('[AIMS] Validating organization_id:', organization_id);
      
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .eq('id', organization_id)
        .single();
        
      if (orgError || !org) {
        console.error('[AIMS] Organization not found:', { organization_id, error: orgError });
        
        // Create user as orphan if organization is invalid
        console.log('[AIMS] Creating user as orphan due to invalid organization_id');
        const { data, error } = await supabaseAdmin
          .from('users')
          .insert([{ name, email, role, organization_id: null }])
          .select(`
            *,
            organization:organizations(*)
          `)
          .single();
          
        if (error) {
          console.error('[AIMS] Error creating orphan user:', error);
          if (error.code === '23505') {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
          }
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        console.log('[AIMS] Created orphan user (invalid org):', data.email);
        return NextResponse.json({
          ...data,
          warning: 'User created without organization - provided organization ID was invalid'
        }, { status: 201 });
      }
      
      console.log('[AIMS] Organization validated:', org.name);
    }
    
    // Create user with validated organization_id
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
      console.error('[AIMS] Error details:', JSON.stringify(error, null, 2));
      
      if (error.code === '23505') {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
      
      // Handle foreign key constraint error specifically
      if (error.code === '23503' && error.message.includes('users_organization_id_fkey')) {
        console.error('[AIMS] Foreign key constraint violation - organization does not exist');
        
        // Try to create user as orphan
        const { data: orphanUser, error: orphanError } = await supabaseAdmin
          .from('users')
          .insert([{ name, email, role, organization_id: null }])
          .select(`
            *,
            organization:organizations(*)
          `)
          .single();
          
        if (orphanError) {
          console.error('[AIMS] Error creating orphan user:', orphanError);
          return NextResponse.json({ error: orphanError.message }, { status: 500 });
        }
        
        console.log('[AIMS] Created orphan user (FK error):', orphanUser.email);
        return NextResponse.json({
          ...orphanUser,
          warning: 'User created without organization due to invalid organization reference'
        }, { status: 201 });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Created user:', data.email, 'with org:', data.organization?.name || 'none');
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
    
    console.log('[AIMS] Update request for user:', id);
    console.log('[AIMS] Updates:', JSON.stringify(updates, null, 2));
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Check current user state before update
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('[AIMS] Error fetching current user:', fetchError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('[AIMS] Current user state:', JSON.stringify(currentUser, null, 2));
    
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
      console.error('[AIMS] Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[AIMS] Updated user:', JSON.stringify(data, null, 2));
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