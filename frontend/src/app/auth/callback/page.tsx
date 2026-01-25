"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { Loader2 } from 'lucide-react';
import { getHomeRouteFromApiData } from '@/lib/navigation-utils';

// Determine the auth type from URL parameters
type AuthType = 'oauth' | 'signup' | 'recovery' | 'magiclink' | 'unknown';

function getAuthType(searchParams: URLSearchParams, hash: string): AuthType {
  const type = searchParams.get('type');
  if (type === 'signup' || type === 'email') return 'signup';
  if (type === 'recovery') return 'recovery';
  if (type === 'magiclink') return 'magiclink';
  // OAuth typically has access_token in hash or no type parameter with code
  if (hash.includes('access_token') || searchParams.get('code')) return 'oauth';
  return 'unknown';
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUser();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [authType, setAuthType] = useState<AuthType>('unknown');
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleAuthCallback = async () => {
      try {
        const detectedAuthType = getAuthType(searchParams, window.location.hash);
        setAuthType(detectedAuthType);

        console.log('[Auth Callback] Starting auth callback processing...');
        console.log('[Auth Callback] Detected auth type:', detectedAuthType);
        console.log('[Auth Callback] Current URL hash:', window.location.hash ? 'Present (tokens in hash)' : 'Empty');
        console.log('[Auth Callback] Search params:', Object.fromEntries(searchParams.entries()));
        
        // Small delay to ensure Supabase client processes the hash tokens
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // First, try to get an existing session
        let session = null;
        let sessionError = null;
        
        // Retry logic for getting session (Supabase may need time to process tokens)
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(`[Auth Callback] Attempt ${attempt} to get session...`);
          const result = await supabase.auth.getSession();
          session = result.data?.session;
          sessionError = result.error;
          
          if (session) {
            console.log('[Auth Callback] Session found on attempt', attempt);
            break;
          }
          
          if (attempt < 3) {
            console.log('[Auth Callback] No session yet, waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          }
        }
        
        if (sessionError) {
          console.error('[Auth Callback] Session error:', sessionError);
          setErrorMessage(sessionError.message);
          setStatus('error');
          return;
        }

        // If no session from getSession, try to exchange code (PKCE flow)
        if (!session) {
          const code = searchParams.get('code');
          if (code) {
            console.log('[Auth Callback] No session from getSession, trying code exchange...');
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('[Auth Callback] Code exchange error:', error);
              setErrorMessage(error.message);
              setStatus('error');
              return;
            }
            session = data.session;
            console.log('[Auth Callback] Session obtained via code exchange');
          }
        }
        
        if (!session) {
          console.error('[Auth Callback] No session found after all attempts');
          console.error('[Auth Callback] Hash present:', !!window.location.hash);
          console.error('[Auth Callback] Code present:', !!searchParams.get('code'));
          setErrorMessage('No session found. Please try signing in again.');
          setStatus('error');
          return;
        }

        await handleSession(session);
        
      } catch (error) {
        console.error('[Auth Callback] Unexpected error:', error);
        console.error('[Auth Callback] Error stack:', error instanceof Error ? error.stack : 'No stack');
        setErrorMessage('An unexpected error occurred during authentication');
        setStatus('error');
      }
    };

    const handleSession = async (session: any) => {
      const user = session.user;
      console.log('[Auth Callback] ========================================');
      console.log('[Auth Callback] User authenticated successfully');
      console.log('[Auth Callback] User ID:', user.id);
      console.log('[Auth Callback] User email:', user.email);
      console.log('[Auth Callback] User metadata:', JSON.stringify(user.user_metadata, null, 2));
      console.log('[Auth Callback] ========================================');

      // Always call create-oauth-user for OAuth logins
      // This endpoint handles both creating new users AND updating last_login for existing users
      let userProfile = null;
      
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const nameParts = fullName.split(' ').filter(Boolean);
      
      const payload = {
        id: user.id,
        email: user.email,
        first_name: nameParts[0] || user.email.split('@')[0],
        last_name: nameParts.slice(1).join(' ') || '',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      };
      
      console.log('[Auth Callback] Calling create-oauth-user to create/update user and last_login...');
      console.log('[Auth Callback] Payload:', JSON.stringify(payload, null, 2));
      
      try {
        const response = await fetch('/api/auth/create-oauth-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log('[Auth Callback] Response status:', response.status);

        if (response.ok) {
          try {
            userProfile = JSON.parse(responseText);
            console.log('[Auth Callback] User profile retrieved/created:', userProfile.email);
            console.log('[Auth Callback] Last login updated:', userProfile.lastLogin || userProfile.last_login);
          } catch (parseError) {
            console.error('[Auth Callback] Failed to parse response:', parseError);
          }
        } else {
          console.error('[Auth Callback] Failed to create/update user:', response.status, responseText);
        }
      } catch (error) {
        console.error('[Auth Callback] Error calling create-oauth-user:', error);
      }

      // Set user in context (use profile data if available, otherwise create minimal user)
      if (userProfile && userProfile.email) {
        console.log('[Auth Callback] Setting user from profile data');
        setUser(userProfile);
      } else {
        console.warn('[Auth Callback] Using minimal user data (profile creation may have failed)');
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const nameParts = fullName.split(' ').filter(Boolean);
        setUser({
          id: user.id,
          email: user.email,
          name: fullName || user.email.split('@')[0],
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          profilePicture: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          role: 'public_user',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setStatus('success');
      
      // Redirect to the intended destination
      // If no specific destination, route based on organization assignment
      const next = searchParams.get('next');
      const defaultRoute = getHomeRouteFromApiData(userProfile);
      const redirectTo = next || defaultRoute;
      console.log('[Auth Callback] Redirecting to:', redirectTo, 'organizationId:', userProfile?.organizationId);
      
      // Small delay before redirect to ensure state is saved
      await new Promise(resolve => setTimeout(resolve, 100));
      router.push(redirectTo);
    };

    handleAuthCallback();
  }, [searchParams, router, setUser]);

  if (status === 'error') {
    // Customize error message based on auth type
    const getErrorTitle = () => {
      switch (authType) {
        case 'signup':
          return 'Email Verification Error';
        case 'recovery':
          return 'Password Reset Error';
        case 'magiclink':
          return 'Magic Link Error';
        default:
          return 'Authentication Error';
      }
    };

    const getErrorDescription = () => {
      switch (authType) {
        case 'signup':
          return 'There was a problem verifying your email address';
        case 'recovery':
          return 'There was a problem resetting your password';
        case 'magiclink':
          return 'There was a problem with your magic link';
        default:
          return 'There was a problem signing you in';
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{getErrorTitle()}</h2>
          <p className="text-gray-600 mb-2">{getErrorDescription()}</p>
          <p className="text-sm text-gray-500 mb-6">{errorMessage}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-gray-900 text-white py-2 px-4 rounded-md hover:bg-black transition"
          >
            {authType === 'signup' ? 'Go to Sign In' : 'Try Again'}
          </button>
          {authType === 'signup' && (
            <button
              onClick={() => router.push('/register')}
              className="w-full mt-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition"
            >
              Register Again
            </button>
          )}
          <button
            onClick={() => router.push('/')}
            className="w-full mt-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Completing sign in...</p>
        <p className="text-sm text-gray-400 mt-2">Please wait while we set up your account</p>
      </div>
    </div>
  );
}
