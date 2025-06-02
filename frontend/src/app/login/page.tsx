"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mockUsers } from "@/hooks/useUser";
import { ROLE_LABELS, USER_ROLES } from "@/types/user";
import { Building2, Lock, User, AlertCircle, LogIn, Shield } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter out inactive users
  const activeUsers = mockUsers.filter(u => u.isActive);

  const handleProductionLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // In production, this would make an API call to authenticate
      // For now, we'll simulate login with mock data
      const user = mockUsers.find(u => u.email === email && u.isActive);
      
      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set the user in localStorage directly
      localStorage.setItem('aims_user', JSON.stringify(user));
      
      // Update last login
      user.lastLogin = new Date().toISOString();
      
      toast.success(`Welcome back, ${user.name}!`);
      // Force a hard navigation to ensure the app reloads with the new user
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDevelopmentLogin = () => {
    if (!selectedUserId) {
      setError("Please select a user to log in as");
      return;
    }

    const user = mockUsers.find(u => u.id === selectedUserId);
    if (user) {
      // Set the user in localStorage directly
      localStorage.setItem('aims_user', JSON.stringify(user));
      user.lastLogin = new Date().toISOString();
      toast.success(`Logged in as ${user.name} (${ROLE_LABELS[user.role]})`);
      // Force a hard navigation to ensure the app reloads with the new user
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary rounded-full p-3">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">AIMS</h1>
          <p className="text-muted-foreground mt-2">Aid Information Management System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Access your AIMS account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="production" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="production">Production Login</TabsTrigger>
                <TabsTrigger value="development">
                  <Shield className="h-4 w-4 mr-1" />
                  Dev Mode
                </TabsTrigger>
              </TabsList>

              <TabsContent value="production" className="space-y-4">
                <form onSubmit={handleProductionLogin} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@organization.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <a href="#" className="text-primary hover:underline">
                      Forgot password?
                    </a>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>Signing in...</>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Demo Credentials
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Super User</p>
                    <p className="text-muted-foreground">john@example.com / password</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Dev Partner Tier 1</p>
                    <p className="text-muted-foreground">jane@worldbank.org / password</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Orphan User</p>
                    <p className="text-muted-foreground">emily@example.com / password</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="development" className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Development mode: Select any user to log in without authentication
                  </AlertDescription>
                </Alert>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select User</label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user to log in as" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                            <Badge variant={user.role === USER_ROLES.SUPER_USER ? "destructive" : "secondary"}>
                              {ROLE_LABELS[user.role]}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedUserId && (
                  <Card className="bg-muted">
                    <CardContent className="pt-6">
                      {(() => {
                        const selectedUser = activeUsers.find(u => u.id === selectedUserId);
                        if (!selectedUser) return null;
                        
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <User className="h-10 w-10 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{selectedUser.name}</p>
                                <p className="text-sm text-muted-foreground">{selectedUser.title}</p>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Role:</span>
                                <Badge variant={selectedUser.role === USER_ROLES.SUPER_USER ? "destructive" : "secondary"}>
                                  {ROLE_LABELS[selectedUser.role]}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Organization:</span>
                                <span className="font-medium">
                                  {selectedUser.organization?.name || "None (Orphan)"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                <Button 
                  onClick={handleDevelopmentLogin} 
                  className="w-full"
                  disabled={!selectedUserId}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Log In as Selected User
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground">
            <p className="w-full">
              Need help? Contact your system administrator
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 