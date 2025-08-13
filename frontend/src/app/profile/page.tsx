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
import { EmailChangeConfirmDialog } from "@/components/EmailChangeConfirmDialog";
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
  
  return { countryCode: "+95", phoneNumber: telephone };
};

// Helper function to convert mailing address string to address components
const parseMailingAddress = (mailingAddress: string): AddressComponents => {
  if (!mailingAddress) return {};
  
  const parts = mailingAddress.split(',').map(part => part.trim());
  
  if (parts.length >= 4) {
    return {
      addressLine1: parts[0] || '',
      addressLine2: parts[1] || '',
      street: parts[0] || '',
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
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      country: parts[3] || '',
      fullAddress: mailingAddress
    };
  } else {
    return {
      addressLine1: mailingAddress,
      street: mailingAddress,
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
  const [emailChangeDialogOpen, setEmailChangeDialogOpen] = useState(false);
  
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
            title: freshData.title || "",
            firstName: freshData.first_name || "",
            middleName: freshData.middle_name || "",
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
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePicture || "");
  
  // Form state
  const [formData, setFormData] = useState({
    title: user?.title || "",
    firstName: user?.firstName || "",
    middleName: user?.middleName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    jobTitle: user?.jobTitle || "",
    department: user?.department || "",
    ...splitTelephone(user?.telephone || user?.phone || ""),
    website: user?.website || "",
    mailingAddress: user?.mailingAddress || "",
    addressComponents: parseMailingAddress(user?.mailingAddress || ""),
    bio: user?.bio || "",
    preferredLanguage: user?.preferredLanguage || "en",
    timezone: user?.timezone || "UTC",
    role: user?.role || "",
    organization: user?.organization || null,
    password: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Refresh form data when user prop changes
  useEffect(() => {
    if (user) {
      console.log('[Profile] User data changed, updating form data');
      setFormData(prev => ({
        ...prev,
        title: user.title || "",
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        jobTitle: user.jobTitle || "",
        department: user.department || "",
        ...splitTelephone(user.telephone || user.phone || ""),
        website: user.website || "",
        mailingAddress: user.mailingAddress || "",
        addressComponents: parseMailingAddress(user.mailingAddress || ""),
        bio: user.bio || "",
        preferredLanguage: user.preferredLanguage || "en",
        timezone: user.timezone || "UTC",
        role: user.role || "",
        organization: user.organization || null
      }));
      
      if (user.profilePicture) {
        setProfilePhoto(user.profilePicture);
      }
    }
  }, [user]);

  const handlePhotoChange = async (photoUrl: string) => {
    setProfilePhoto(photoUrl);
  };

  const handleEmailChange = async (newEmail: string) => {
    if (!user) {
      throw new Error("User not found");
    }

    try {
      const response = await fetch('/api/users/change-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          newEmail: newEmail,
          currentUserRole: user.role
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change email address");
      }

      // Update the form data and user
      setFormData(prev => ({ ...prev, email: newEmail }));
      setUser({ ...user, email: newEmail });
      
    } catch (error) {
      console.error('Error changing email:', error);
      throw error; // Re-throw to be handled by the dialog
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      console.log('[Profile] Saving profile changes...');
      
      // Prepare data for API
      const apiData = {
        id: user.id,
        title: formData.title,
        first_name: formData.firstName,
        middle_name: formData.middleName,
        last_name: formData.lastName,
        job_title: formData.jobTitle,
        department: formData.department,
        telephone: formData.countryCode + formData.phoneNumber,
        website: formData.website,
        mailing_address: formatMailingAddress(formData.addressComponents),
        bio: formData.bio,
        preferred_language: formData.preferredLanguage,
        timezone: formData.timezone,
        avatar_url: profilePhoto,
      };

      console.log('[Profile] Sending API data:', apiData);

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (response.ok) {
        const updatedData = await response.json();
        console.log('[Profile] Profile updated successfully:', updatedData);
        
        // Update user context with the new data
        const updatedUser = {
          ...user,
          title: updatedData.title || "",
          firstName: updatedData.first_name || "",
          middleName: updatedData.middle_name || "",
          lastName: updatedData.last_name || "",
          name: updatedData.name || `${updatedData.first_name || ''} ${updatedData.last_name || ''}`.trim(),
          jobTitle: updatedData.job_title || "",
          department: updatedData.department || "",
          telephone: updatedData.telephone || "",
          phone: updatedData.telephone || "",
          website: updatedData.website || "",
          mailingAddress: updatedData.mailing_address || "",
          bio: updatedData.bio || "",
          preferredLanguage: updatedData.preferred_language || "en",
          timezone: updatedData.timezone || "UTC",
          profilePicture: updatedData.avatar_url,
        };
        
        setUser(updatedUser);
        setIsEditing(false);
        toast.success("Profile updated successfully");
      } else {
        const errorData = await response.json();
        console.error('[Profile] Error updating profile:', errorData);
        toast.error(errorData.error || "Failed to update profile");
      }
    } catch (error) {
      console.error('[Profile] Error updating profile:', error);
      toast.error("Failed to update profile");
    }
  };

  const handleCancel = () => {
    if (user) {
      // Reset form data to current user data
      setFormData({
        title: user.title || "",
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        jobTitle: user.jobTitle || "",
        department: user.department || "",
        ...splitTelephone(user.telephone || user.phone || ""),
        website: user.website || "",
        mailingAddress: user.mailingAddress || "",
        addressComponents: parseMailingAddress(user.mailingAddress || ""),
        bio: user.bio || "",
        preferredLanguage: user.preferredLanguage || "en",
        timezone: user.timezone || "UTC",
        role: user.role || "",
        organization: user.organization || null,
        password: "",
        newPassword: "",
        confirmPassword: ""
      });
      setProfilePhoto(user.profilePicture || "");
    }
    setIsEditing(false);
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Profile</h1>
              <p className="text-muted-foreground mt-1">Manage your account settings and information</p>
            </div>
            {!isEditing ? (
              <Button onClick={handleEditClick}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact & Address
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System & Security
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Your basic profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex flex-col items-center space-y-4">
                  <ProfilePhotoUpload
                    currentPhoto={profilePhoto}
                    userInitials={`${formData.firstName?.[0] || ''}${formData.lastName?.[0] || user.name?.[0] || 'U'}`}
                    onPhotoChange={handlePhotoChange}
                    className="mb-2"
                    disabled={!isEditing}
                  />
                </div>

                {/* Role Badge */}
                <div className="flex justify-center">
                  <Badge variant={user.role === USER_ROLES.SUPER_USER ? "destructive" : "secondary"}>
                    <Shield className="h-3 w-3 mr-1" />
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
                </div>

                {isEditing ? (
                  <>
                    {/* Editing Mode */}
                    <div className="space-y-4">
                      {/* Title and Name fields */}
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="title">Title</Label>
                          <Select 
                            value={formData.title} 
                            onValueChange={(value) => setFormData({ ...formData, title: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              <SelectItem value="Mr.">Mr.</SelectItem>
                              <SelectItem value="Ms.">Ms.</SelectItem>
                              <SelectItem value="Mrs.">Mrs.</SelectItem>
                              <SelectItem value="Dr.">Dr.</SelectItem>
                              <SelectItem value="Prof.">Prof.</SelectItem>
                              <SelectItem value="Eng.">Eng.</SelectItem>
                              <SelectItem value="Daw">Daw</SelectItem>
                              <SelectItem value="U">U</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
                          <Label htmlFor="middleName">Middle Name</Label>
                          <Input
                            id="middleName"
                            value={formData.middleName}
                            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                            placeholder="Optional"
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
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email">Email Address</Label>
                          {user.role === 'super_user' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEmailChangeDialogOpen(true)}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              Change Email
                            </Button>
                          )}
                        </div>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.role === 'super_user' 
                            ? "Use the 'Change Email' button to safely update your email address" 
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
                        <div>
                          <Label htmlFor="bio">Bio / Description</Label>
                          <Textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Brief description about yourself..."
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                          <p className="text-lg">
                            {user.title && user.title !== "none" ? `${user.title} ` : ""}
                            {user.firstName && user.lastName 
                              ? `${user.firstName}${user.middleName ? ` ${user.middleName}` : ''} ${user.lastName}` 
                              : user.name || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
                          <p className="text-lg">{user.email}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Job Title</Label>
                          <p className="text-lg">{user.jobTitle || "Not specified"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                          <p className="text-lg">{user.department || "Not specified"}</p>
                        </div>
                      </div>

                      {user.bio && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Bio</Label>
                          <p className="text-lg mt-1">{user.bio}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Organization Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization
                </CardTitle>
                <CardDescription>
                  Your organization affiliation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user.organization ? (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{user.organization.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.organization.type === 'development_partner' ? 'Development Partner' : 
                         user.organization.type === 'partner_government' ? 'Government Partner' : 
                         user.organization.type === 'bilateral' ? 'Bilateral Partner' :
                         'Other Organization'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No organization assigned</p>
                    <p className="text-sm text-muted-foreground">Contact your administrator for organization assignment</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact & Address Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
                <CardDescription>
                  Your contact details and address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing ? (
                  <>
                    {/* Editing Mode */}
                    <div className="space-y-4">
                      <PhoneFields
                        countryCode={formData.countryCode}
                        phoneNumber={formData.phoneNumber}
                        onCountryCodeChange={(code) => setFormData({ ...formData, countryCode: code })}
                        onPhoneNumberChange={(number) => setFormData({ ...formData, phoneNumber: number })}
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
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Phone Number</Label>
                        <p className="text-lg">{user.telephone || user.phone || "Not specified"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Website</Label>
                        <p className="text-lg">
                          {user.website ? (
                            <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {user.website}
                            </a>
                          ) : (
                            "Not specified"
                          )}
                        </p>
                      </div>
                    </div>

                    {user.mailingAddress && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Mailing Address</Label>
                        <p className="text-lg mt-1">{user.mailingAddress}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System & Security Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Preferences
                </CardTitle>
                <CardDescription>
                  Language, timezone, and other system settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing ? (
                  <>
                    {/* Editing Mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="language">Preferred Language</Label>
                        <Select 
                          value={formData.preferredLanguage} 
                          onValueChange={(value) => setFormData({ ...formData, preferredLanguage: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="my">Myanmar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select 
                          value={formData.timezone} 
                          onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="Asia/Yangon">Myanmar Time</SelectItem>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Preferred Language</Label>
                        <p className="text-lg">
                          {user.preferredLanguage === 'en' ? 'English' :
                           user.preferredLanguage === 'es' ? 'Español' :
                           user.preferredLanguage === 'fr' ? 'Français' :
                           user.preferredLanguage === 'my' ? 'Myanmar' :
                           'English'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Timezone</Label>
                        <p className="text-lg">
                          {user.timezone === 'UTC' ? 'UTC' :
                           user.timezone === 'Asia/Yangon' ? 'Myanmar Time' :
                           user.timezone === 'America/New_York' ? 'Eastern Time' :
                           user.timezone === 'America/Chicago' ? 'Central Time' :
                           user.timezone === 'America/Denver' ? 'Mountain Time' :
                           user.timezone === 'America/Los_Angeles' ? 'Pacific Time' :
                           user.timezone || 'UTC'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Account Security
                </CardTitle>
                <CardDescription>
                  Manage your account security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Password</p>
                      <p className="text-sm text-muted-foreground">Change your account password</p>
                    </div>
                  </div>
                  <Button variant="outline">
                    Change Password
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email Address</p>
                      <p className="text-sm text-muted-foreground">
                        {user.role === 'super_user' 
                          ? "Update your login email address" 
                          : "Contact administrator to change email"
                        }
                      </p>
                    </div>
                  </div>
                  {user.role === 'super_user' && (
                    <Button 
                      variant="outline"
                      onClick={() => setEmailChangeDialogOpen(true)}
                    >
                      Change Email
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Email Change Dialog */}
        <EmailChangeConfirmDialog
          isOpen={emailChangeDialogOpen}
          onClose={() => setEmailChangeDialogOpen(false)}
          onConfirm={handleEmailChange}
          currentEmail={user.email}
          userName={user.name || user.email}
          userId={user.id}
        />
      </div>
    </MainLayout>
  );
}
