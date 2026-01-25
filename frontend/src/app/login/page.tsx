"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";
import { GmailLogin } from "@/components/auth/GmailLogin";
import { supabase } from "@/lib/supabase";
import { WavesBackground } from "@/components/landing/WavesBackground";
import { getHomeRouteFromApiData } from "@/lib/navigation-utils";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("[Login] Attempting login for:", email);
      
      // IMPORTANT: Sign out of any existing Supabase OAuth session first
      // This prevents OAuth sessions from hijacking email/password logins
      try {
        await supabase.auth.signOut();
        console.log("[Login] Cleared any existing Supabase session");
      } catch (signOutError) {
        console.log("[Login] No existing session to clear");
      }
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      console.log("[Login] Login successful:", data.user);
      
      // Mark this as an email/password login (prevents OAuth session from overriding)
      localStorage.setItem('aims_auth_source', 'email_password');
      
      // Set user in context (this will also save to localStorage)
      setUser(data.user);
      
      toast.success("Login successful!");
      
      // Redirect to dashboard if user has an organization, otherwise to activities
      const homeRoute = getHomeRouteFromApiData(data.user);
      console.log("[Login] Redirecting to:", homeRoute, "organizationId:", data.user?.organizationId);
      router.push(homeRoute);
    } catch (err) {
      console.error("[Login] Login error:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred during login";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
      }}
    >
      <WavesBackground />
      <Card className="w-full max-w-md relative z-10 shadow-xl" style={{ backgroundColor: '#F6F5F4' }}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/images/Logo - No Text 2.jpeg" 
              alt="æther logo" 
              className="h-24 w-24 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            <span className="font-bold">æther</span>
          </CardTitle>
          <CardDescription className="text-gray-600">
            Development Finance Information, Simplified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-black text-white border-0"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#F6F5F4] px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In */}
          <GmailLogin redirectTo="/auth/callback" />

          {/* Create Account Link */}
          <div className="mt-6 text-center text-sm text-gray-600">
            New to æther?{" "}
            <Link
              href="/register"
              className="text-gray-900 hover:text-black font-medium underline"
            >
              Create an account
            </Link>
          </div>

          {/* Terms and Privacy Links */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-center gap-4 text-sm text-gray-600">
              <Link 
                href="/terms-of-service" 
                className="hover:text-gray-900 underline"
              >
                Terms of Service
              </Link>
              <span className="text-gray-400">•</span>
              <Link 
                href="/privacy-policy" 
                className="hover:text-gray-900 underline"
              >
                Privacy Policy
              </Link>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
} 