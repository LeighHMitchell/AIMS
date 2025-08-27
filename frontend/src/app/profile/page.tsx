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
import { getRoleBadgeVariant, getRoleDisplayLabel } from "@/lib/role-badge-utils";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { PhoneFields } from "@/components/ui/phone-fields";
import { AddressComponents } from "@/components/ui/address-search";
import { EmailChangeConfirmDialog } from "@/components/EmailChangeConfirmDialog";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { supabase } from "@/lib/supabase";
import { CONTACT_TYPES } from "@/data/contact-types";
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
  Briefcase,
  Users,
  Key,
  Download,
  Upload,
  Eye,
  EyeOff,
  Printer
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
        phoneNumber: telephone.substring(country.code.length).trim()
      };
    }
  }
  
  return { countryCode: "+95", phoneNumber: telephone };
};

// Helper function to format phone number for display with proper spacing
const formatPhoneNumber = (phoneNumber: string) => {
  if (!phoneNumber) return "";
  
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
    if (phoneNumber.startsWith(country.code)) {
      const localNumber = phoneNumber.substring(country.code.length).trim();
      return localNumber ? `${country.code} ${localNumber}` : country.code;
    }
  }
  
  return phoneNumber;
};

// Helper function to check if phone/fax number is complete (has both country code and local number)
const isCompletePhoneNumber = (phoneNumber: string) => {
  if (!phoneNumber) return false;
  
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
    if (phoneNumber.startsWith(country.code)) {
      const localNumber = phoneNumber.substring(country.code.length).trim();
      return localNumber.length > 0; // Only return true if there's actual local number
    }
  }
  
  // If no country code match, consider it complete if it has content
  return phoneNumber.trim().length > 0;
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

// Organization interface
interface Organization {
  id: string
  name: string
  acronym?: string
  iati_org_id?: string
  logo?: string
}



// ISO 639-1 language codes
const languages = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "hi", name: "Hindi" },
  { code: "sw", name: "Swahili" },
  { code: "de", name: "German" },
  { code: "my", name: "Myanmar" },
];

export default function ProfilePage() {
  const { user, setUser } = useUser();
  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [emailChangeDialogOpen, setEmailChangeDialogOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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
            suffix: freshData.suffix || "",
            email: prev.email, // Keep current email in edit mode
            jobTitle: freshData.job_title || "",
            department: freshData.department || "",
            organisation: freshData.organisation || "",
            ...splitTelephone(freshData.telephone || ""),
            website: freshData.website || "",
            mailingAddress: freshData.mailing_address || "",
            addressComponents: parseMailingAddress(freshData.mailing_address || ""),
            bio: freshData.bio || "",
            preferredLanguage: freshData.preferred_language || "en",
            timezone: freshData.timezone || "UTC",
            role: freshData.role || "",
            contactType: freshData.contact_type || "",
            faxCountryCode: splitTelephone(freshData.fax_number || "").countryCode,
            faxPhoneNumber: splitTelephone(freshData.fax_number || "").phoneNumber,
            notes: freshData.notes || ""
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
    suffix: user?.suffix || "",
    email: user?.email || "",
    jobTitle: user?.jobTitle || "",
    department: user?.department || "",
    organisation: user?.organisation || "",
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
    confirmPassword: "",
    contactType: user?.contactType || "",
    ...splitTelephone(user?.faxNumber || ""),
    faxCountryCode: splitTelephone(user?.faxNumber || "").countryCode,
    faxPhoneNumber: splitTelephone(user?.faxNumber || "").phoneNumber,
    notes: user?.notes || ""
  });

  // Fetch organizations for super users
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!supabase || user?.role !== 'super_user') return

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, acronym, iati_org_id, logo')
          .order('name')

        if (error) {
          console.error('Error fetching organizations:', error)
          return
        }

        setOrganizations(data || [])
        
        // Set the selected org ID if user has an organization
        if (user?.organizationId) {
          setSelectedOrgId(user.organizationId)
        }
      } catch (error) {
        console.error('Error fetching organizations:', error)
      }
    }

    fetchOrganizations()
  }, [user?.role, user?.organizationId])

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.email) return

      try {
        const response = await fetch(`/api/users?email=${encodeURIComponent(user.email)}`)
        
        if (response.ok) {
          const userData = await response.json()
          
          setFormData(prev => ({
            ...prev,
            organisation: userData.organisation || user.organisation || prev.organisation,
          }))
          
          if (userData.organization_id) {
            setSelectedOrgId(userData.organization_id)
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      }
    }

    loadProfile()
  }, [user?.email])

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
        organisation: user.organisation || "",
        ...splitTelephone(user.telephone || user.phone || ""),
        website: user.website || "",
        mailingAddress: user.mailingAddress || "",
        addressComponents: parseMailingAddress(user.mailingAddress || ""),
        bio: user.bio || "",
        preferredLanguage: user.preferredLanguage || "en",
        timezone: user.timezone || "UTC",
        role: user.role || "",
        organization: user.organization || null,
        contactType: user.contactType || "",
        faxCountryCode: splitTelephone(user.faxNumber || "").countryCode,
        faxPhoneNumber: splitTelephone(user.faxNumber || "").phoneNumber,
        notes: user.notes || ""
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
      const response = await fetch('/api/users/change-email-simple', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          newEmail: newEmail,
          currentUserRole: user.role
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Profile] Email change error response:', data);
        
        // Provide more specific error messages
        if (data.details) {
          throw new Error(`${data.error}: ${data.details}`);
        } else {
          throw new Error(data.error || "Failed to change email address");
        }
      }

      // Update the form data and user
      setFormData(prev => ({ ...prev, email: newEmail }));
      setUser({ ...user, email: newEmail });
      
      // Show success message
      toast.success("Email address updated successfully");
      
    } catch (error) {
      console.error('[Profile] Error changing email:', error);
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
        suffix: formData.suffix,
        job_title: formData.jobTitle,
        department: formData.department,
        organisation: formData.organisation,
        telephone: formData.countryCode + (formData.phoneNumber ? ' ' + formData.phoneNumber : ''),
        website: formData.website,
        mailing_address: formatMailingAddress(formData.addressComponents),
        bio: formData.bio,
        preferred_language: formData.preferredLanguage,
        timezone: formData.timezone,
        avatar_url: profilePhoto,
        contact_type: formData.contactType,
        fax_number: formData.faxCountryCode + (formData.faxPhoneNumber ? ' ' + formData.faxPhoneNumber : ''),
        notes: formData.notes,
      };

      // Include organisation update for super users
      if (user.role === 'super_user' && selectedOrgId) {
        (apiData as any).organization_id = selectedOrgId;
      }

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
        
        // If organization was changed, fetch the new organization data
        let organizationData = user.organization
        if (user.role === 'super_user' && selectedOrgId && selectedOrgId !== user.organizationId) {
          const selectedOrg = organizations.find(o => o.id === selectedOrgId)
          if (selectedOrg) {
            organizationData = {
              id: selectedOrg.id,
              name: selectedOrg.name,
              logo: selectedOrg.logo,
              type: 'development_partner', // Default type, should be fetched from org data
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        }

        // Update user context with the new data
        const updatedUser = {
          ...user,
          title: updatedData.title || "",
          firstName: updatedData.first_name || "",
          middleName: updatedData.middle_name || "",
          lastName: updatedData.last_name || "",
          suffix: updatedData.suffix || "",
          name: updatedData.name || `${updatedData.first_name || ''} ${updatedData.last_name || ''}`.trim(),
          jobTitle: updatedData.job_title || "",
          department: updatedData.department || "",
          organisation: updatedData.organisation || formData.organisation,
          organizationId: updatedData.organization_id || (user.role === 'super_user' && selectedOrgId ? selectedOrgId : user.organizationId),
          organization: organizationData,
          telephone: updatedData.telephone || "",
          phone: updatedData.telephone || "",
          website: updatedData.website || "",
          faxNumber: updatedData.fax_number || "",
          mailingAddress: updatedData.mailing_address || "",
          bio: updatedData.bio || "",
          preferredLanguage: updatedData.preferred_language || "en",
          timezone: updatedData.timezone || "UTC",
          profilePicture: updatedData.avatar_url,
          notes: updatedData.notes || "",
          contactType: updatedData.contact_type || "",
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
        suffix: user.suffix || "",
        email: user.email || "",
        jobTitle: user.jobTitle || "",
        department: user.department || "",
        organisation: user.organisation || "",
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
        confirmPassword: "",
        contactType: user.contactType || "",
        faxCountryCode: splitTelephone(user.faxNumber || "").countryCode,
        faxPhoneNumber: splitTelephone(user.faxNumber || "").phoneNumber,
        notes: user.notes || ""
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings and information</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System & Security
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                      Your complete profile and contact details
                </CardDescription>
                  </div>
                  <div>
                    {!isEditing ? (
                      <Button onClick={handleEditClick} size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleCancel} size="sm">
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSave} size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture Section - Smaller and to the side */}
                <div className="flex gap-6 items-start">
                  <ProfilePhotoUpload
                    currentPhoto={profilePhoto}
                    userInitials={`${formData.firstName?.[0] || ''}${formData.lastName?.[0] || user.name?.[0] || 'U'}`}
                    onPhotoChange={handlePhotoChange}
                    className="shrink-0"
                    disabled={!isEditing}
                  />
                  
                  <div className="flex-1 space-y-6">
                {isEditing ? (
                  <>
                    {/* Editing Mode */}
                        {/* Name Section */}
                    <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Name Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-2">
                              <Label htmlFor="title" className="text-xs">Title</Label>
                          <Select 
                            value={formData.title} 
                            onValueChange={(value) => setFormData({ ...formData, title: value })}
                          >
                                <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
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
                        <div className="md:col-span-3">
                              <Label htmlFor="firstName" className="text-xs">First Name *</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="h-9"
                            required
                          />
                        </div>
                        <div className="md:col-span-3">
                              <Label htmlFor="middleName" className="text-xs">Middle Name</Label>
                          <Input
                            id="middleName"
                            value={formData.middleName}
                            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                                className="h-9"
                            placeholder="Optional"
                          />
                        </div>
                        <div className="md:col-span-2">
                              <Label htmlFor="lastName" className="text-xs">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="h-9"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                              <Label htmlFor="suffix" className="text-xs">Suffix</Label>
                          <Select 
                            value={formData.suffix} 
                            onValueChange={(value) => setFormData({ ...formData, suffix: value })}
                          >
                                <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="Jr.">Jr.</SelectItem>
                              <SelectItem value="Sr.">Sr.</SelectItem>
                              <SelectItem value="II">II</SelectItem>
                              <SelectItem value="III">III</SelectItem>
                              <SelectItem value="IV">IV</SelectItem>
                              <SelectItem value="PhD">PhD</SelectItem>
                              <SelectItem value="MD">MD</SelectItem>
                              <SelectItem value="JD">JD</SelectItem>
                              <SelectItem value="MBA">MBA</SelectItem>
                              <SelectItem value="MS">MS</SelectItem>
                              <SelectItem value="MA">MA</SelectItem>
                              <SelectItem value="BS">BS</SelectItem>
                              <SelectItem value="BA">BA</SelectItem>
                              <SelectItem value="RN">RN</SelectItem>
                              <SelectItem value="CPA">CPA</SelectItem>
                              <SelectItem value="PE">PE</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      </div>

                        {/* Position Section */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Position</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                              <Label htmlFor="jobTitle" className="text-xs">Position/Role</Label>
                          <Input
                            id="jobTitle"
                            value={formData.jobTitle}
                            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                className="h-9"
                            placeholder="e.g., Aid Coordinator"
                          />
                        </div>
                        <div>
                              <Label htmlFor="department" className="text-xs">Department</Label>
                          <Input
                            id="department"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                className="h-9"
                            placeholder="e.g., International Development"
                          />
                            </div>
                        </div>
                      </div>

                        {/* Organization Section */}
                      <div className="space-y-4">
                          <Separator className="my-4" />
                          <h4 className="text-sm font-medium text-muted-foreground">Organization</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                              <Label htmlFor="userRole" className="text-xs">User Role</Label>
                              <Input
                                id="userRole"
                                value={ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                                disabled
                                className="h-9 bg-muted"
                              />
                            </div>
                        <div>
                              {user.role === 'super_user' ? (
                                <>
                                  <Label htmlFor="organisation" className="text-xs">Organisation</Label>
                      <Select
                        value={selectedOrgId}
                        onValueChange={(value) => {
                          setSelectedOrgId(value)
                          const org = organizations.find(o => o.id === value)
                          if (org) {
                            setFormData(prev => ({ ...prev, organisation: org.name }))
                          }
                        }}
                      >
                                    <SelectTrigger id="organisation" className="h-9">
                          <SelectValue placeholder="Select organisation">
                            {selectedOrgId && (() => {
                              const selectedOrg = organizations.find(o => o.id === selectedOrgId);
                              return selectedOrg ? (
                                <div className="flex items-center gap-2">
                                  {selectedOrg.logo && (
                                    <img
                                      src={selectedOrg.logo}
                                      alt={`${selectedOrg.name} logo`}
                                      className="w-4 h-4 object-contain rounded-sm flex-shrink-0"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <span className="text-sm truncate">
                                    {selectedOrg.name} {selectedOrg.acronym && `(${selectedOrg.acronym})`}
                                  </span>
                                </div>
                              ) : null;
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              <div className="flex items-center gap-2">
                                {org.logo && (
                                  <img
                                    src={org.logo}
                                    alt={`${org.name} logo`}
                                    className="w-6 h-6 object-contain rounded-sm flex-shrink-0"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="text-sm truncate">
                                    {org.name} {org.acronym && `(${org.acronym})`}
                                  </div>
                                  {org.iati_org_id && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      IATI: {org.iati_org_id}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                                </>
                ) : (
                  <>
                                  <Label className="text-xs">Organisation</Label>
                                  <div className="h-9 px-3 py-2 border rounded-md bg-muted flex items-center gap-2">
                                    {user.organization?.logo && (
                                      <img
                                        src={user.organization.logo}
                                        alt={`${user.organization.name} logo`}
                                        className="w-5 h-5 object-contain rounded-sm flex-shrink-0"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <span className="text-sm">{user.organization?.name || formData.organisation || "Not assigned"}</span>
                        </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Contact Details Section */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Contact Details</h4>
                          
                          {/* Primary Email */}
                          <div className="space-y-3">
                        <div>
                              <Label htmlFor="email" className="text-xs mb-2 block">Primary Email</Label>
                              <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                disabled
                                className="bg-muted h-9"
                              />
                      </div>
                            
                            {/* Phone and Fax on same line */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs mb-1">Phone</Label>
                                <PhoneFields
                                  countryCode={formData.countryCode}
                                  phoneNumber={formData.phoneNumber}
                                  onCountryCodeChange={(code) => setFormData({ ...formData, countryCode: code })}
                                  onPhoneNumberChange={(number) => setFormData({ ...formData, phoneNumber: number })}
                                  phoneLabel=""
                                  phonePlaceholder="Phone number"
                                />
                              </div>
                              <div>
                                <Label className="text-xs mb-1">Fax Number</Label>
                                <PhoneFields
                                  countryCode={formData.faxCountryCode}
                                  phoneNumber={formData.faxPhoneNumber}
                                  onCountryCodeChange={(code) => setFormData({ ...formData, faxCountryCode: code })}
                                  onPhoneNumberChange={(number) => setFormData({ ...formData, faxPhoneNumber: number })}
                                  phoneLabel=""
                                  phonePlaceholder="Fax number"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Notes Section */}
                        <div>
                          <Label htmlFor="notes" className="text-xs">Notes</Label>
                          <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional information or notes..."
                            rows={3}
                            className="resize-none"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* View Mode */}
                        <div className="space-y-6">
                          {/* Name and Position */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-lg">
                                {user.title && user.title !== "none" ? `${user.title} ` : ""}
                                {user.firstName && user.lastName 
                                  ? `${user.firstName}${user.middleName ? ` ${user.middleName}` : ''} ${user.lastName}${user.suffix && user.suffix !== "none" ? ` ${user.suffix}` : ''}` 
                                  : user.name || "Not specified"}
                              </h3>
                              <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                {getRoleDisplayLabel(user.role)}
                              </Badge>
                            </div>
                        <p className="text-sm text-muted-foreground">
                              {user.jobTitle || "Position not specified"} 
                              {user.department && ` • ${user.department}`}
                        </p>
                      </div>

                          {/* Organization */}
                          {(user.organization || user.contactType) && (
                            <div className="flex items-start gap-3">
                              {user.organization?.logo ? (
                                <img
                                  src={user.organization.logo}
                                  alt={`${user.organization.name} logo`}
                                  className="w-8 h-8 object-contain rounded-sm flex-shrink-0 mt-0.5"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                              )}
                              <div>
                                <p className="text-sm font-medium">{user.organization?.name || user.organisation || "No organization"}</p>
                              </div>
                            </div>
                          )}

                          {/* Contact Details */}
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-sm">{user.email}</p>

                              </div>
                            </div>

                            {user.telephone && (
                              <div className="flex items-start gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <p className="text-sm">{formatPhoneNumber(user.telephone)}</p>
                                </div>
                              </div>
                            )}

                            {user.faxNumber && isCompletePhoneNumber(user.faxNumber) && (
                              <div className="flex items-start gap-3">
                                <Printer className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <p className="text-sm text-muted-foreground">{formatPhoneNumber(user.faxNumber)} (Fax)</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Notes */}
                          {user.notes && (
                            <div className="border-t pt-4">
                              <p className="text-sm">{user.notes}</p>
                            </div>
                          )}
                        </div>
                  </>
                )}
                  </div>
                </div>
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
                    <div className="grid grid-cols-1 gap-4">
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
                    <div className="grid grid-cols-1 gap-6">
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
