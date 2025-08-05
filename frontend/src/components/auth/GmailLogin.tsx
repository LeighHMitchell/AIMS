"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';

interface GmailLoginProps {
  redirectTo?: string;
  className?: string;
}

export function GmailLogin({ redirectTo = '/', className = '' }: GmailLoginProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGmailLogin = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Gmail login error:', error);
        toast.error('Failed to sign in with Gmail');
        return;
      }

      // The user will be redirected to Google for authentication
      toast.success('Redirecting to Gmail...');
      
    } catch (error) {
      console.error('Unexpected error during Gmail login:', error);
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
      className={`w-full flex items-center justify-center gap-2 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mail className="h-4 w-4" />
      )}
      {isLoading ? 'Signing in...' : 'Continue with Gmail'}
    </Button>
  );
}

export function GmailLoginCard({ redirectTo = '/' }: { redirectTo?: string }) {
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

export default GmailLogin;