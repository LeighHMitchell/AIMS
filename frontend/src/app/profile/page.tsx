"use client"

import { useState, useEffect } from "react";
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
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { PhoneFields } from "@/components/ui/phone-fields";
import { AddressSearch, AddressComponents } from "@/components/ui/address-search";
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

// Helper function to split telephone into country code and phone number
const splitTelephone = (telephone: string) => {
  if (!telephone) return { countryCode: "+95", phoneNumber: "" };
  
  // Import countries from the data file
  const countries = [
    { code: "+95", name: "Myanmar" },
    { code: "+1", name: "US/Canada" },
    { code: "+44", name: "UK" },
    { code: "+33", name: "France" },
    { code: "+49", name: "Germany" },
    { code: "+81", name: "Japan" },
    { code: "+86", name: "China" },
    { code: "+91", name: "India" },
    { code: "+61", name: "Australia" },
    { code: "+55", name: "Brazil" }
  ];
  
  for (const country of countries) {
    if (telephone.startsWith(country.code)) {
      return {
        countryCode: country.code,
        phoneNumber: telephone.substring(country.code.length)
      };
    }
  }
  
  // If no country code found, default to Myanmar and use full number as phone
  return { countryCode: "+95", phoneNumber: telephone };
};

// Helper function to convert mailing address string to address components
const parseMailingAddress = (mailingAddress: string): AddressComponents => {
  if (!mailingAddress) return {};
  
  // Try to parse common address formats
  // This is a simple parser - in production you might want a more sophisticated one
  const parts = mailingAddress.split(',').map(part => part.trim());
  
  if (parts.length >= 4) {
    return {
      addressLine1: parts[0] || '',
      addressLine2: parts[1] || '',
      street: parts[0] || '', // Keep for backward compatibility
      city: parts[2] || '',
      state: parts[3] || '',
      country: parts[4] || '',
      postalCode: parts[5] || '',
      fullAddress: mailingAddress
    };
  } else if (parts.length >= 2) {
    return {
      addressLine1: parts[0] || '',
      addressLine2: '',
      street: parts[0] || '', // Keep for backward compatibility
      city: parts[1] || '',
      state: parts[2] || '',
      country: parts[3] || '',
      fullAddress: mailingAddress
    };
  } else {
    return {
      addressLine1: mailingAddress,
      street: mailingAddress, // Keep for backward compatibility
      fullAddress: mailingAddress
    };
  }
};

// Helper function to convert address components back to mailing address string
const formatMailingAddress = (address: AddressComponents): string => {
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.country,
    address.postalCode
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : '';
};

export default function ProfilePage() {
  const { user, setUser } = useUser();
  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  
  // Function to enter edit mode and refresh data
  const handleEditClick = async () => {
    console.log('[Profile] Entering edit mode, refreshing data...');
    setIsEditing(true);
    
    // Refresh form data when entering edit mode
    if (user?.email) {
      try {
        const response = await fetch(`/api/users?email=${encodeURIComponent(user.email)}`);
        if (response.ok) {
          const freshData = await response.json();
          console.log('[Profile] Fresh data for edit mode:', freshData);
          
          setFormData(prev => ({
            ...prev,
            firstName: freshData.first_name || "",
            lastName: freshData.last_name || "",
            email: prev.email, // Keep current email in edit mode
            jobTitle: freshData.job_title || "",
            department: freshData.department || "",
            ...splitTelephone(freshData.telephone || ""),
            website: freshData.website || "",
            mailingAddress: freshData.mailing_address || "",
            addressComponents: parseMailingAddress(freshData.mailing_address || ""),
            bio: freshData.bio || "",
            preferredLanguage: freshData.preferred_language || "en",
            timezone: freshData.timezone || "UTC",
            role: freshData.role || ""
          }));
          
          // Preserve profile photo when entering edit mode
          if (freshData.avatar_url && freshData.avatar_url !== profilePhoto) {
            setProfilePhoto(freshData.avatar_url);
            console.log('[Profile] Updated profile photo for edit mode:', freshData.avatar_url);
          }
        }
      } catch (error) {
        console.log('[Profile] Could not refresh data for edit mode:', error);
      }
    }
  };
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form data for editing
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    department: "",
    countryCode: "+95",
    phoneNumber: "",
    website: "",
    mailingAddress: "",
    addressComponents: {} as AddressComponents,
    bio: "",
    preferredLanguage: "en",
    timezone: "UTC",
    role: "",
    notifications: {
      email: true,
      browser: true,
      activities: true,
      reports: true,
      security: true
    }
  });

  // Load fresh profile data when component mounts or user changes
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.email) return;
      
      try {
        console.log('[Profile] Loading fresh profile data for:', user.email);
        
        // Fetch fresh data from API
        const response = await fetch(`/api/users?email=${encodeURIComponent(user.email)}`);
        
        if (response.ok) {
          const freshData = await response.json();
          console.log('[Profile] Fresh data loaded:', freshData);
          
          // Update form data with fresh database values
          setFormData(prev => ({
            ...prev,
            firstName: freshData.first_name || user.firstName || "",
            lastName: freshData.last_name || user.lastName || "",
            email: user.email || "",
            jobTitle: freshData.job_title || user.jobTitle || user.title || "",
            department: freshData.department || user.department || "",
            ...splitTelephone(freshData.telephone || user.telephone || user.phone || ""),
            website: freshData.website || user.website || "",
            mailingAddress: freshData.mailing_address || user.mailingAddress || "",
            addressComponents: parseMailingAddress(freshData.mailing_address || user.mailingAddress || ""),
            bio: freshData.bio || "",
            preferredLanguage: freshData.preferred_language || "en",
            timezone: freshData.timezone || "UTC",
            role: freshData.role || user.role || ""
          }));
          
          // Also update profile photo state if available in fresh data
          if (freshData.avatar_url) {
            setProfilePhoto(freshData.avatar_url);
            console.log('[Profile] Updated profile photo from fresh data:', freshData.avatar_url);
          }
        } else {
          console.warn('[Profile] Failed to load fresh data, using user context');
          // Fallback to user context data
          setFormData(prev => ({
            ...prev,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            jobTitle: user.jobTitle || user.title || "",
            department: user.department || "",
            ...splitTelephone(user.telephone || user.phone || ""),
            website: user.website || "",
            mailingAddress: user.mailingAddress || "",
          addressComponents: parseMailingAddress(user.mailingAddress || ""),
            role: user.role || ""
          }));
        }
      } catch (error) {
        console.error('[Profile] Error loading profile data:', error);
        // Fallback to user context data
        setFormData(prev => ({
          ...prev,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          jobTitle: user.jobTitle || user.title || "",
          department: user.department || "",
          ...splitTelephone(user.telephone || user.phone || ""),
          website: user.website || "",
          mailingAddress: user.mailingAddress || "",
          addressComponents: parseMailingAddress(user.mailingAddress || ""),
          role: user.role || ""
        }));
      }
    };

    loadProfileData();
  }, [user?.email, user?.firstName, user?.lastName]); // Re-run when user data changes

  // Profile photo state
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePicture || "");
  
  // Sync profile photo state with user context
  useEffect(() => {
    if (user?.profilePicture && user.profilePicture !== profilePhoto) {
      console.log('[Profile] Syncing profile photo from user context:', user.profilePicture);
      setProfilePhoto(user.profilePicture);
    }
  }, [user?.profilePicture, profilePhoto]);

  // Handle profile photo change
  const handlePhotoChange = async (photoUrl: string) => {
    setProfilePhoto(photoUrl);
    
    // Save to database immediately
    if (user) {
      try {
        const response = await fetch('/api/users', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: user.id,
            profile_picture: photoUrl
          }),
        });

        if (response.ok) {
          // Update the user context after successful database save
          const updatedUser = {
            ...user,
            profilePicture: photoUrl,
          };
          setUser(updatedUser);
          console.log('[Profile] Updated user context with new profile picture:', photoUrl);
          console.log('[Profile] Updated user object:', updatedUser);
          toast.success('Profile picture updated successfully!');
        } else {
          toast.error('Failed to save profile picture');
        }
      } catch (error) {
        console.error('Error saving profile picture:', error);
        toast.error('Failed to save profile picture');
      }
    }
  };

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
      console.log('[Profile] Saving profile with photo:', profilePhoto || user?.profilePicture);
      
      // Prepare update data - preserve existing profile picture if current state is empty
      const updateData: any = {
        id: user?.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        job_title: formData.jobTitle,
        department: formData.department,
        telephone: formData.countryCode + formData.phoneNumber,
        website: formData.website,
        mailing_address: formatMailingAddress(formData.addressComponents),
        preferred_language: formData.preferredLanguage,
        timezone: formData.timezone,
      };
      
      // Super users can change their email and role
      if (user?.role === 'super_user') {
        if (formData.email !== user.email) {
          updateData.email = formData.email;
          console.log('[Profile] Super user changing email to:', formData.email);
        }
        if (formData.role !== user.role) {
          updateData.role = formData.role;
          console.log('[Profile] Super user changing role to:', formData.role);
        }
      }
      
      // Only include profile_picture in the update if we have a value
      // This prevents overwriting existing photos with empty values
      const currentPhoto = profilePhoto || user?.profilePicture;
      if (currentPhoto) {
        updateData.profile_picture = currentPhoto;
      }
      
      // Update user data via API
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
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
          email: formData.email, // Update email if changed
          jobTitle: formData.jobTitle,
          title: formData.jobTitle, // For backward compatibility
          department: formData.department,
          telephone: formData.countryCode + formData.phoneNumber,
          phone: formData.countryCode + formData.phoneNumber, // For backward compatibility
          website: formData.website,
          mailingAddress: formatMailingAddress(formData.addressComponents),
          role: formData.role as any, // Update role if changed
          // Preserve existing profile picture if current state is empty
          profilePicture: profilePhoto || user.profilePicture,
          updatedAt: new Date().toISOString(),
        };

        setUser(updatedUser);
        console.log('[Profile] User context updated after save:', updatedUser);
      }
      
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      
      // Optionally reload fresh data from database to ensure sync
      // This ensures the form will have the latest data next time
      try {
        if (user?.email) {
          const response = await fetch(`/api/users?email=${encodeURIComponent(user.email)}`);
          if (response.ok) {
            const freshData = await response.json();
            console.log('[Profile] Reloaded fresh data after save:', freshData);
          }
        }
      } catch (error) {
        console.log('[Profile] Could not reload fresh data after save:', error);
      }
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
                  <ProfilePhotoUpload
                    currentPhoto={profilePhoto || user.profilePicture}
                    userInitials={`${user.firstName?.[0] || ''}${user.lastName?.[0] || user.name?.[0] || 'U'}`}
                    onPhotoChange={handlePhotoChange}
                    className="mb-2"
                  />
                  
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
                      <div className="flex flex-col items-center space-y-2 mt-2">
                        {/* Organization Logo */}
                        {(user.organization as any).logo ? (
                          <img
                            src={(user.organization as any).logo}
                            alt={`${user.organization.name} logo`}
                            className="w-12 h-12 object-contain rounded-lg border border-gray-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Organization Name and Acronym */}
                        <div className="text-center">
                          <p className="text-sm font-medium">{user.organization.name}</p>
                          {(user.organization as any).acronym && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {(user.organization as any).acronym}
                            </Badge>
                          )}
                        </div>
                      </div>
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
                        <Button onClick={handleEditClick} variant="outline" size="sm">
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
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={user?.role !== 'super_user'}
                            className={user?.role !== 'super_user' ? "bg-muted" : ""}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {user?.role === 'super_user' 
                              ? "As a super user, you can change your email address" 
                              : "Contact your administrator to change your email address"
                            }
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

                        <div className="space-y-4">
                          <PhoneFields
                            countryCode={formData.countryCode}
                            phoneNumber={formData.phoneNumber}
                            onCountryCodeChange={(code) => setFormData({ ...formData, countryCode: code })}
                            onPhoneNumberChange={(number) => setFormData({ ...formData, phoneNumber: number })}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <AddressSearch
                            value={formData.addressComponents}
                            onChange={(address) => setFormData({ 
                              ...formData, 
                              addressComponents: address,
                              mailingAddress: formatMailingAddress(address)
                            })}
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
                                ...splitTelephone(user.telephone || user.phone || ""),
                                website: user.website || "",
                                mailingAddress: user.mailingAddress || "",
          addressComponents: parseMailingAddress(user.mailingAddress || ""),
                                bio: "",
                                preferredLanguage: "en",
                                timezone: "UTC",
                                role: user.role || "",
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
                        <div className="flex items-start gap-4">
                          {/* Organization Logo */}
                          <div className="flex-shrink-0">
                            {(user.organization as any).logo ? (
                              <img
                                src={(user.organization as any).logo}
                                alt={`${user.organization.name} logo`}
                                className="w-16 h-16 object-contain rounded-lg border border-gray-200"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                <Building2 className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* Organization Info */}
                          <div className="flex-1 space-y-3">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Organization</p>
                              <div className="mt-1 flex items-center gap-2">
                                <p className="font-medium">{user.organization.name}</p>
                                {(user.organization as any).acronym && (
                                  <Badge variant="outline" className="text-xs">
                                    {(user.organization as any).acronym}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Super User Role Management */}
                {user?.role === 'super_user' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Role Management
                      </CardTitle>
                      <CardDescription>
                        As a super user, you can change your own role assignment
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="role">Your Role</Label>
                          <Select 
                            value={formData.role} 
                            onValueChange={(value) => setFormData({ ...formData, role: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="super_user">Super User</SelectItem>
                              <SelectItem value="gov_partner_tier_1">Government Partner (Tier 1)</SelectItem>
                              <SelectItem value="gov_partner_tier_2">Government Partner (Tier 2)</SelectItem>
                              <SelectItem value="dev_partner_tier_1">Development Partner (Tier 1)</SelectItem>
                              <SelectItem value="dev_partner_tier_2">Development Partner (Tier 2)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Current: <Badge variant={formData.role === USER_ROLES.SUPER_USER ? "destructive" : "secondary"}>
                              {ROLE_LABELS[formData.role as keyof typeof ROLE_LABELS] || formData.role}
                            </Badge>
                          </p>
                        </div>
                        
                        {formData.role !== user.role && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              <strong>Warning:</strong> Changing your role will affect your permissions. 
                              Make sure you understand the implications before saving.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Save Button for Super User Changes */}
                {user?.role === 'super_user' && (formData.role !== user.role || formData.email !== user.email) && (
                  <div className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
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