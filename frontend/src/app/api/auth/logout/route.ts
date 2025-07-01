import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/auth/logout - Starting Supabase logout');
  
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[AIMS] Logout error:', error);
    }
    
    console.log('[AIMS] User logged out successfully');
    
    // Clear cookies
    const response = NextResponse.json({ success: true });
    response.cookies.delete('supabase-auth-token');
    
    return response;
    
  } catch (error) {
    console.error('[AIMS] Unexpected error during logout:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
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