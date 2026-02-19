import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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

    // We'll collect cookies to set on the response
    const cookiesToSet: Array<{ name: string; value: string; options: any }> = [];
    
    // Create server client with cookie handling for authentication
    const cookieStore = await cookies();
    const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(newCookies) {
          // Collect cookies to be set on the response
          newCookies.forEach((cookie) => {
            cookiesToSet.push(cookie);
          });
        },
      },
    });

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
      
      // Log failed login attempt
      try {
        const { ActivityLogger } = await import('@/lib/activity-logger');
        await ActivityLogger.userLoginFailed(email, authError?.message || 'Invalid credentials');
      } catch (logError) {
        console.error('[Auth Login] Failed to log failed login event:', logError);
      }
      
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    console.log('[Auth Login] Supabase auth successful, session established');
    console.log('[Auth Login] Cookies to set:', cookiesToSet.length);
    
    // Update last_login and get user profile data from our users table
    const now = new Date().toISOString();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .update({ last_login: now, updated_at: now })
      .eq('id', authData.user.id)
      .select('*')
      .single();
    
    if (userError || !userData) {
      console.error('[Auth Login] User profile not found or update failed:', userError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 401 });
    }
    
    console.log('[Auth Login] Updated last_login for user:', userData.email);
    
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
      department: userData.department || '',
      role: userData.role,
      organizationId: userData.organization_id,
      organisation: organization?.name || '',
      organization: organization,
      profilePicture: userData.avatar_url, // Map avatar_url to profilePicture
      phone: userData.phone || '',
      telephone: userData.telephone || userData.phone || '',
      isActive: userData.is_active !== false,
      lastLogin: userData.last_login,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };
    
    console.log('[Auth Login] Login successful for:', user.email, 'Role:', user.role);
    
    // Log successful login
    try {
      const { ActivityLogger } = await import('@/lib/activity-logger');
      const userAgent = request.headers.get('user-agent') || undefined;
      const forwardedFor = request.headers.get('x-forwarded-for');
      const ipAddress = forwardedFor?.split(',')[0]?.trim() || undefined;
      
      await ActivityLogger.userLoggedIn(user, { 
        ipAddress, 
        userAgent 
      });
    } catch (logError) {
      console.error('[Auth Login] Failed to log login event:', logError);
    }
    
    // Create response and set cookies on it
    const response = NextResponse.json({ 
      success: true, 
      user,
      message: 'Login successful' 
    });
    
    // Set all Supabase session cookies on the response with explicit options
    // for better cross-browser compatibility (especially Edge on Windows)
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, {
        ...cookie.options,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
    }
    
    console.log('[Auth Login] Set', cookiesToSet.length, 'cookies on response');
    
    return response;
    
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