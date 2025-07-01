"use client"

import { useState } from "react";
import { useUser } from "@/hooks/useUser";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ROLE_LABELS, USER_ROLES } from "@/types/user";
import { Building2, User, Mail, Phone, Shield, AlertCircle } from "lucide-react";

export default function ProfilePage() {
  const { user, setUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    title: user?.title || "",
    phone: user?.phone || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const updatedUser = {
        ...user,
        ...formData,
        updatedAt: new Date().toISOString(),
      };
      setUser(updatedUser);
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        
        <div className="space-y-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your account details and role</CardDescription>
                </div>
                <Badge variant={user.role === USER_ROLES.SUPER_USER ? "destructive" : "secondary"}>
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!user.organizationId && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <p className="text-sm font-medium text-orange-800">Organization Assignment Pending</p>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    Contact your administrator to be assigned to an organization.
                  </p>
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-1">
                      <User className="h-4 w-4" />
                      Name
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4" />
                      Email
                    </label>
                    <Input value={user.email} disabled />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4" />
                      Title/Position
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Aid Coordinator"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-1">
                      <Phone className="h-4 w-4" />
                      Phone
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g., +1 234 567 8900"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">Save Changes</Button>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: user.name,
                        title: user.title || "",
                        phone: user.phone || "",
                      });
                    }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="mt-1">{user.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="mt-1">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Title/Position</p>
                      <p className="mt-1">{user.title || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="mt-1">{user.phone || "Not specified"}</p>
                    </div>
                  </div>
                  <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organization Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.organization ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Organization Name</p>
                    <p className="mt-1">{user.organization.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <Badge variant="secondary">
                      {user.organization.type === "development_partner" 
                        ? "Development Partner" 
                        : user.organization.type === "partner_government"
                        ? "Partner Government"
                        : "Other"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No organization assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Account Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                  <Badge variant={user.isActive ? "default" : "destructive"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Login</p>
                  <p className="mt-1 text-sm">
                    {user.lastLogin 
                      ? new Date(user.lastLogin).toLocaleString() 
                      : "Never"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account Created</p>
                  <p className="mt-1 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                  <p className="mt-1 text-sm">
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
} 