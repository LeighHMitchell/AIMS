"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, UserPlus, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import { GmailLogin } from "@/components/auth/GmailLogin";
import { WavesBackground } from "@/components/landing/WavesBackground";

type RegistrationState = 'form' | 'success';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registrationState, setRegistrationState] = useState<RegistrationState>('form');

  const validateForm = (): string | null => {
    if (!email) {
      return "Email is required";
    }
    if (!password) {
      return "Password is required";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Client-side validation
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      console.log("[Register] Attempting registration for:", email);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      console.log("[Register] Registration successful");

      // Show success state with email verification instructions
      setRegistrationState('success');
      toast.success("Account created successfully!");

    } catch (err) {
      console.error("[Register] Registration error:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred during registration";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Success state - show email verification message
  if (registrationState === 'success') {
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
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              We've sent a verification link to
            </CardDescription>
            <p className="font-medium text-gray-900 mt-1">{email}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                Click the link in your email to verify your account and complete registration.
                The link will expire in 24 hours.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 pt-4">
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-gray-900 hover:bg-black text-white border-0"
              >
                Go to Sign In
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRegistrationState('form');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setFirstName('');
                  setLastName('');
                }}
                className="w-full"
              >
                Register Another Account
              </Button>
            </div>

            <p className="text-center text-sm text-gray-500 pt-4">
              Didn't receive the email?{" "}
              <button
                onClick={() => toast.info("Please wait a few minutes and check your spam folder. If you still don't receive it, try registering again.")}
                className="text-gray-700 hover:text-gray-900 underline"
              >
                Learn more
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Registration form
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
            Create your account
          </CardTitle>
          <CardDescription className="text-gray-600">
            Join æther to access development finance information
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

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                  First Name
                </label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
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

          {/* Google Sign-Up */}
          <GmailLogin redirectTo="/auth/callback?next=/activities" />

          {/* Sign In Link */}
          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-gray-900 hover:text-black font-medium underline"
            >
              Sign in
            </Link>
          </div>

          {/* Terms and Privacy Links */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500 mb-2">
              By creating an account, you agree to our
            </p>
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
