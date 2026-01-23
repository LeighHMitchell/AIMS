import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/auth/logout - Starting Supabase logout');

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    // Collect cookies to set on the response (for clearing session)
    const cookiesToSet: Array<{ name: string; value: string; options: any }> = [];
    
    // Create server client with cookie handling to properly sign out
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(newCookies) {
          // Collect cookies to be cleared on the response
          newCookies.forEach((cookie) => {
            cookiesToSet.push(cookie);
          });
        },
      },
    });

    // Sign out from Supabase - this will clear session cookies
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[AIMS] Logout error:', error);
    }

    console.log('[AIMS] User logged out successfully');

    // Create response and set/clear cookies on it
    const response = NextResponse.json({ success: true });
    
    // Set all cookies (Supabase sets empty values to clear them)
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    
    console.log('[AIMS] Cleared', cookiesToSet.length, 'cookies');

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