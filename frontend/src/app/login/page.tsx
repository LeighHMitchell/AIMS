"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, AlertCircle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";

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
      
      // Set user in context (this will also save to localStorage)
      setUser(data.user);
      
      toast.success("Login successful!");
      router.push("/activities");
    } catch (err) {
      console.error("[Login] Login error:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred during login";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to AIMS
          </CardTitle>
          <CardDescription className="text-gray-600">
            Aid Information Management System
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Demo Credentials
              </span>
            </div>
          </div>

          <div className="space-y-2 text-sm mt-4">
            <div 
              className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => handleDemoLogin("testuser@aims.local", "TestPass123!")}
            >
              <p className="font-medium">Super User (Test Account)</p>
              <p className="text-muted-foreground">testuser@aims.local / TestPass123!</p>
              <p className="text-xs text-green-600 mt-1">Click to auto-fill</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-center">
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Test Login:</strong></p>
            <p>Email: testuser@aims.local</p>
            <p>Password: TestPass123!</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 