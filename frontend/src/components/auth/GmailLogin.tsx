"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Google "G" logo as SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

interface GmailLoginProps {
  redirectTo?: string;
  className?: string;
}

export function GmailLogin({ redirectTo = '/', className = '' }: GmailLoginProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Fix for Safari: replace 0.0.0.0 with localhost
  const getRedirectOrigin = () => {
    const origin = window.location.origin;
    // Replace 0.0.0.0 with localhost (Safari blocks 0.0.0.0)
    if (origin.includes('0.0.0.0')) {
      return origin.replace('0.0.0.0', 'localhost');
    }
    return origin;
  };

  const handleGmailLogin = async () => {
    try {
      setIsLoading(true);
      
      const redirectOrigin = getRedirectOrigin();
      console.log('[Google Login] Redirect URL:', `${redirectOrigin}${redirectTo}`);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectOrigin}${redirectTo}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google login error:', error);
        toast.error('Failed to sign in with Google');
        return;
      }

      // The user will be redirected to Google for authentication
      toast.success('Redirecting to Google...');
      
    } catch (error) {
      console.error('Unexpected error during Google login:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleGmailLogin}
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border-gray-300 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <GoogleIcon className="h-5 w-5" />
      )}
      <span className="text-gray-700 font-medium">
        {isLoading ? 'Signing in...' : 'Continue with Google'}
      </span>
    </Button>
  );
}

export function GoogleLoginCard({ redirectTo = '/' }: { redirectTo?: string }) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Welcome to æther</CardTitle>
        <CardDescription>
          Sign in to your account to access the Aid Information Management System
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GmailLogin redirectTo={redirectTo} />
        
        <div className="text-center text-sm text-muted-foreground">
          <p>By signing in, you agree to our terms of service</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Export with both old and new names for backward compatibility
export { GmailLogin as GoogleLogin };
export default GmailLogin;