import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error && data.session) {
        console.log('[Auth Callback] Successfully authenticated user:', data.user?.email);
        
        // Optionally create/update user record in your database
        if (data.user) {
          // You can add user to your users table here if needed
          console.log('[Auth Callback] User data:', {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name,
            avatar: data.user.user_metadata?.avatar_url
          });
        }
        
        // Redirect to the intended destination
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (error) {
      console.error('[Auth Callback] Error exchanging code for session:', error);
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}