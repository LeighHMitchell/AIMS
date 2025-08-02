"use client"

import { useState } from "react";
import { useUser } from "@/hooks/useUser";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ROLE_LABELS, USER_ROLES } from "@/types/user";
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  AlertCircle, 
  Settings, 
  Bell, 
  Lock, 
  Globe, 
  Activity,
  Camera,
  Save,
  Edit,
  X,
  Check,
  Clock,
  MapPin,
  Briefcase,
  Users,
  Key,
  Download,
  Upload,
  Eye,
  EyeOff
} from "lucide-react";

export default function ProfilePage() {
  const { user, setUser } = useUser();
  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form data for editing
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    jobTitle: user?.jobTitle || user?.title || "",
    department: user?.department || "",
    telephone: user?.telephone || user?.phone || "",
    website: user?.website || "",
    mailingAddress: user?.mailingAddress || "",
    bio: "",
    preferredLanguage: "en",
    timezone: "UTC",
    notifications: {
      email: true,
      browser: true,
      activities: true,
      reports: true,
      security: true
    }
  });

  // Password change form
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Update user data via API
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user?.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          job_title: formData.jobTitle,
          department: formData.department,
          telephone: formData.telephone,
          website: formData.website,
          mailing_address: formData.mailingAddress,
          preferred_language: formData.preferredLanguage,
          timezone: formData.timezone,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Update local user state
      if (user) {
        const updatedUser = {
          ...user,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          jobTitle: formData.jobTitle,
          title: formData.jobTitle, // For backward compatibility
          department: formData.department,
          telephone: formData.telephone,
          phone: formData.telephone, // For backward compatibility
          website: formData.website,
          mailingAddress: formData.mailingAddress,
          updatedAt: new Date().toISOString(),
        };

        setUser(updatedUser);
      }
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to change password');
      }

      toast.success("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error("Failed to change password. Please try again.");
    } finally {
      setIsLoading(false);
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
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings, personal information, and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Summary Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.profilePicture} />
                    <AvatarFallback className="text-lg">
                      {user.firstName?.[0]}{user.lastName?.[0] || user.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h3 className="text-lg font-semibold">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge 
                      variant={user.role === USER_ROLES.SUPER_USER ? "destructive" : "secondary"}
                      className="mt-2"
                    >
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </div>

                  {user.organization && (
                    <div className="w-full pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground">Organization</p>
                      <p className="text-sm">{user.organization.name}</p>
                    </div>
                  )}

                  <div className="w-full pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                    <p className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="organization">Organization</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Personal Information
                        </CardTitle>
                        <CardDescription>
                          Update your personal details and contact information
                        </CardDescription>
                      </div>
                      {!isEditing && (
                        <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              value={formData.lastName}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            value={formData.email}
                            disabled
                            className="bg-muted"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Contact your administrator to change your email address
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="jobTitle">Job Title</Label>
                            <Input
                              id="jobTitle"
                              value={formData.jobTitle}
                              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                              placeholder="e.g., Aid Coordinator"
                            />
                          </div>
                          <div>
                            <Label htmlFor="department">Department</Label>
                            <Input
                              id="department"
                              value={formData.department}
                              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                              placeholder="e.g., International Development"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="telephone">Phone Number</Label>
                            <Input
                              id="telephone"
                              value={formData.telephone}
                              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                              placeholder="+1 234 567 8900"
                            />
                          </div>
                          <div>
                            <Label htmlFor="website">Website</Label>
                            <Input
                              id="website"
                              value={formData.website}
                              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                              placeholder="https://example.com"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="mailingAddress">Mailing Address</Label>
                          <Textarea
                            id="mailingAddress"
                            value={formData.mailingAddress}
                            onChange={(e) => setFormData({ ...formData, mailingAddress: e.target.value })}
                            placeholder="Enter your mailing address"
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setIsEditing(false);
                              setFormData({
                                firstName: user.firstName || "",
                                lastName: user.lastName || "",
                                email: user.email || "",
                                jobTitle: user.jobTitle || user.title || "",
                                department: user.department || "",
                                telephone: user.telephone || user.phone || "",
                                website: user.website || "",
                                mailingAddress: user.mailingAddress || "",
                                bio: "",
                                preferredLanguage: "en",
                                timezone: "UTC",
                                notifications: {
                                  email: true,
                                  browser: true,
                                  activities: true,
                                  reports: true,
                                  security: true
                                }
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                            <p className="mt-1">{user.name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Email</p>
                            <p className="mt-1">{user.email}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Job Title</p>
                            <p className="mt-1">{user.jobTitle || user.title || "Not specified"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Department</p>
                            <p className="mt-1">{user.department || "Not specified"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Phone</p>
                            <p className="mt-1">{user.telephone || user.phone || "Not specified"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Website</p>
                            <p className="mt-1">{user.website || "Not specified"}</p>
                          </div>
                        </div>
                        {user.mailingAddress && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Mailing Address</p>
                            <p className="mt-1">{user.mailingAddress}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Organization Tab */}
              <TabsContent value="organization" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Organization & Role
                    </CardTitle>
                    <CardDescription>
                      Your organization assignment and role information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user.organization ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Organization</p>
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
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Your Role</p>
                            <Badge variant={user.role === USER_ROLES.SUPER_USER ? "destructive" : "secondary"}>
                              {ROLE_LABELS[user.role]}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                            <p className="mt-1">{new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-orange-600" />
                          <p className="text-sm font-medium text-orange-800">Organization Assignment Pending</p>
                        </div>
                        <p className="text-sm text-orange-700 mt-1">
                          Contact your administrator to be assigned to an organization.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      Password & Security
                    </CardTitle>
                    <CardDescription>
                      Change your password and manage security settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPassword ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          required
                        />
                      </div>

                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Changing Password..." : "Change Password"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Security</CardTitle>
                    <CardDescription>
                      Additional security settings for your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-muted-foreground">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Enable 2FA
                        </Button>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Active Sessions</p>
                          <p className="text-sm text-muted-foreground">
                            Manage your active login sessions
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          View Sessions
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Preferences
                    </CardTitle>
                    <CardDescription>
                      Customize your experience and notification settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Select value={formData.preferredLanguage} onValueChange={(value) => setFormData({ ...formData, preferredLanguage: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium mb-4">Notification Preferences</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Email Notifications</p>
                              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                            </div>
                            <Switch checked={formData.notifications.email} onCheckedChange={(checked) => setFormData({ ...formData, notifications: { ...formData.notifications, email: checked } })} />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Browser Notifications</p>
                              <p className="text-sm text-muted-foreground">Receive notifications in your browser</p>
                            </div>
                            <Switch checked={formData.notifications.browser} onCheckedChange={(checked) => setFormData({ ...formData, notifications: { ...formData.notifications, browser: checked } })} />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Activity Updates</p>
                              <p className="text-sm text-muted-foreground">Notifications about activity changes</p>
                            </div>
                            <Switch checked={formData.notifications.activities} onCheckedChange={(checked) => setFormData({ ...formData, notifications: { ...formData.notifications, activities: checked } })} />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Security Alerts</p>
                              <p className="text-sm text-muted-foreground">Important security notifications</p>
                            </div>
                            <Switch checked={formData.notifications.security} onCheckedChange={(checked) => setFormData({ ...formData, notifications: { ...formData.notifications, security: checked } })} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>
                      Your recent actions and system activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Profile Updated</p>
                          <p className="text-xs text-muted-foreground">Just now</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Logged In</p>
                          <p className="text-xs text-muted-foreground">2 hours ago</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Activity Created</p>
                          <p className="text-xs text-muted-foreground">Yesterday</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Statistics</CardTitle>
                    <CardDescription>
                      Overview of your account usage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">12</p>
                        <p className="text-xs text-muted-foreground">Activities Created</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">45</p>
                        <p className="text-xs text-muted-foreground">Days Active</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">8</p>
                        <p className="text-xs text-muted-foreground">Reports Generated</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">156</p>
                        <p className="text-xs text-muted-foreground">API Calls</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 