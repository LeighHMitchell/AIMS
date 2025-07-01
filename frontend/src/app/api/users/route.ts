import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';

// Set maximum request body size to 10MB for profile pictures
export const maxDuration = 60; // Maximum allowed duration for Vercel Hobby is 60 seconds

// Configure route segment for larger body size
export const runtime = 'nodejs'; // Use Node.js runtime for better body parsing

export async function GET(request: NextRequest) {
  console.log('[AIMS] GET /api/users - Starting request (Supabase)');
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    
    let query = supabase.from('users').select(`
      *,
      organizations:organization_id (
        id,
        name,
        type,
        country
      )
    `);
    
    if (email) {
      query = query.eq('email', email).single();
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[AIMS] Error from Supabase:', error);
      if (error.code === 'PGRST116' && email) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('[AIMS] Successfully fetched from Supabase');
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/users - Starting request (Supabase)');
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    // Create auth user first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password || `TempPass${Date.now()}!`,
      email_confirm: true,
    });
    
    if (authError) {
      console.error('[AIMS] Error creating auth user:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }
    
    // Create user profile
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: body.email,
        first_name: body.first_name || '',
        last_name: body.last_name || '',
        role: body.role || 'dev_partner_tier_1',
        organisation: body.organisation || null,
        department: body.department || null,
        job_title: body.job_title || null,
        telephone: body.telephone || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('[AIMS] Error creating user profile:', error);
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    console.log('[AIMS] Created user in Supabase:', data.email);
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  console.log('[AIMS] PUT /api/users - Starting request (Supabase)');
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    // Handle potentially large request body
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Request body too large. Maximum size is 10MB.' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Update user profile
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[AIMS] Error updating user:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    console.log('[AIMS] Updated user in Supabase');
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  console.log('[AIMS] DELETE /api/users - Starting request (Supabase)');
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
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
    
    // Delete from users table first
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (profileError) {
      console.error('[AIMS] Error deleting user profile:', profileError);
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }
    
    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    
    if (authError) {
      console.error('[AIMS] Error deleting auth user:', authError);
      // Profile already deleted, so we continue
    }
    
    console.log('[AIMS] Deleted user in Supabase');
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[AIMS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 