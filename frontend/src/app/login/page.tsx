"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ROLE_LABELS, USER_ROLES } from "@/types/user";
import { Building2, Lock, User, AlertCircle, LogIn, Shield } from "lucide-react";
import { toast } from "sonner";

interface DBUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organization_id: string | null;
  organization: {
    id: string;
    name: string;
    type: string;
    country: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Fetch users from API for development mode
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          console.error('Failed to fetch users');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsers();
  }, []);

  const handleProductionLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Fetch user by email
      const response = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Invalid email or password");
        }
        throw new Error("Login failed");
      }

      const user = await response.json();
      
      // For now, we're not checking passwords since the DB doesn't have them
      // In production, you'd implement proper authentication
      
      // Transform DB user to app user format
      const appUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        role: user.role,
        organizationId: user.organization_id,
        organization: user.organization ? {
          id: user.organization.id,
          name: user.organization.name,
          type: user.organization.type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } : undefined,
        phone: "",
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
      
      // Set the user in localStorage
      localStorage.setItem('aims_user', JSON.stringify(appUser));
      
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

    const user = users.find(u => u.id === selectedUserId);
    if (user) {
      // Transform DB user to app user format
      const appUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        role: user.role,
        organizationId: user.organization_id,
        organization: user.organization ? {
          id: user.organization.id,
          name: user.organization.name,
          type: user.organization.type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } : undefined,
        phone: "",
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
      
      // Set the user in localStorage
      localStorage.setItem('aims_user', JSON.stringify(appUser));
      toast.success(`Logged in as ${user.name} (${ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]})`);
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
                    <p className="text-muted-foreground">john@example.com / any password</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Admin (World Bank)</p>
                    <p className="text-muted-foreground">jane@worldbank.org / any password</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Viewer (No Org)</p>
                    <p className="text-muted-foreground">emily@example.com / any password</p>
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
                  {loadingUsers ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Loading users...
                    </div>
                  ) : (
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user to log in as" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center justify-between w-full">
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                              <Badge variant={user.role === "super_user" ? "destructive" : "secondary"}>
                                {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedUserId && (
                  <Card className="bg-muted">
                    <CardContent className="pt-6">
                      {(() => {
                        const selectedUser = users.find(u => u.id === selectedUserId);
                        if (!selectedUser) return null;
                        
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <User className="h-10 w-10 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{selectedUser.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {selectedUser.role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Role:</span>
                                <Badge variant={selectedUser.role === "super_user" ? "destructive" : "secondary"}>
                                  {ROLE_LABELS[selectedUser.role as keyof typeof ROLE_LABELS] || selectedUser.role}
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
                  disabled={!selectedUserId || loadingUsers}
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