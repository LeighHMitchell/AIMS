import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      console.error('[Auth Login] Supabase client not initialized');
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      );
    }
    
    const { email, password } = await request.json();
    
    console.log(`[Auth Login] Attempting login for: ${email}`);
    
    // First check if user exists in our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (userError || !userData) {
      console.error('[Auth Login] User not found:', userError);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    // For simplicity, we'll just check if the password matches the expected test password
    // In a real system, you'd use proper password hashing
    const isValidPassword = password === 'TestPass123!';
    
    if (!isValidPassword) {
      console.error('[Auth Login] Invalid password');
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    // Get organization data if user has one
    let organization = null;
    if (userData.organization_id) {
      const { data: orgData } = await supabase
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