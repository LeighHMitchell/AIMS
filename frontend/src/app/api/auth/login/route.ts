import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Create a regular Supabase client for authentication
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Auth Login] Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Authentication service not configured' },
        { status: 503 }
      );
    }
    
    // Create client for authentication (uses anon key)
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get admin client for database queries (uses service role key)
    const adminClient = getSupabaseAdmin();
    
    if (!adminClient) {
      console.error('[Auth Login] Admin client not initialized');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      );
    }
    
    const { email, password } = await request.json();
    
    console.log(`[Auth Login] Attempting login for: ${email}`);
    
    // Authenticate with Supabase Auth using regular client
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError || !authData.user) {
      console.error('[Auth Login] Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    // Get user profile data from our users table using admin client
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (userError || !userData) {
      console.error('[Auth Login] User profile not found:', userError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 401 });
    }
    
    // Get organization data if user has one
    let organization = null;
    if (userData.organization_id) {
      const { data: orgData } = await adminClient
        .from('organizations')
        .select('*')
        .eq('id', userData.organization_id)
        .single();
      
      organization = orgData;
    }
    
    // Transform user data to match frontend expectations
    const user = {
      id: userData.id,
      name: userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown User',
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      email: userData.email,
      title: userData.title || '',
      jobTitle: userData.job_title || userData.title || '',
      role: userData.role,
      organizationId: userData.organization_id,
      organisation: organization?.name || '',
      organization: organization,
      profilePicture: userData.avatar_url, // Map avatar_url to profilePicture
      phone: userData.phone || '',
      telephone: userData.telephone || userData.phone || '',
      isActive: userData.is_active !== false,
      lastLogin: new Date().toISOString(),
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };
    
    console.log('[Auth Login] Login successful for:', user.email, 'Role:', user.role);
    
    return NextResponse.json({ 
      success: true, 
      user,
      message: 'Login successful' 
    });
    
  } catch (error) {
    console.error('[Auth Login] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 