"use client"

import { useState, useEffect, useMemo } from "react";
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
import { DeleteAccountModal } from "@/components/DeleteAccountModal";
import { OrganizationCombobox } from "@/components/ui/organization-combobox";
import { supabase } from "@/lib/supabase";
import { CONTACT_TYPES } from "@/data/contact-types";
import { LoadingText } from "@/components/ui/loading-text";
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  AlertCircle, 
  AlertTriangle,
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
  Printer,
  Trash2,
  Loader2,
  Columns3,
  RotateCcw
} from "lucide-react";
import { apiFetch } from '@/lib/api-fetch';
import { Checkbox } from "@/components/ui/checkbox";
import {
  activityColumns,
  activityColumnGroups,
  defaultVisibleActivityColumns,
  ActivityColumnId
} from "@/app/activities/columns";

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
  const { user, setUser, refreshUser } = useUser();
  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [emailChangeDialogOpen, setEmailChangeDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);
  const [columnPrefs, setColumnPrefs] = useState<ActivityColumnId[]>(defaultVisibleActivityColumns);
  const [columnPrefsLoading, setColumnPrefsLoading] = useState(true);
  const [columnPrefsSaving, setColumnPrefsSaving] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phoneDropdownOpen, setPhoneDropdownOpen] = useState(false);
  const [faxDropdownOpen, setFaxDropdownOpen] = useState(false);

  // Handlers to ensure only one phone/fax dropdown is open at a time
  const handlePhoneDropdownChange = (open: boolean) => {
    setPhoneDropdownOpen(open);
    if (open) setFaxDropdownOpen(false);
  };

  const handleFaxDropdownChange = (open: boolean) => {
    setFaxDropdownOpen(open);
    if (open) setPhoneDropdownOpen(false);
  };
  
  // Function to enter edit mode and refresh data
  const handleEditClick = async () => {
    console.log('[Profile] Entering edit mode, refreshing data...');
    setIsEditing(true);
    
    // Refresh form data when entering edit mode
    if (user?.email) {
      try {
        const response = await apiFetch(`/api/users?email=${encodeURIComponent(user.email)}`);
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
        const response = await apiFetch(`/api/users?email=${encodeURIComponent(user.email)}`)
        
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

  // Load column preferences from API on mount
  useEffect(() => {
    const loadColumnPrefs = async () => {
      try {
        const res = await apiFetch('/api/users/column-preferences');
        const data = await res.json();
        if (data.columns && Array.isArray(data.columns)) {
          const valid = (data.columns as string[]).filter(id =>
            activityColumns.some(c => c.id === id)
          ) as ActivityColumnId[];
          // Ensure always-visible columns are included
          const alwaysVisible = activityColumns.filter(c => c.alwaysVisible).map(c => c.id);
          setColumnPrefs([...new Set([...alwaysVisible, ...valid])]);
        }
      } catch {
        // Silently fall back to system defaults
      } finally {
        setColumnPrefsLoading(false);
      }
    };
    loadColumnPrefs();
  }, []);

  // Helpers for column preferences
  const orderedColumnGroups = useMemo(() => {
    const seen = new Set<string>();
    const groups: string[] = [];
    for (const col of activityColumns) {
      if (!seen.has(col.group)) {
        seen.add(col.group);
        groups.push(col.group);
      }
    }
    return groups;
  }, []);

  const toggleColumnPref = (columnId: ActivityColumnId) => {
    const column = activityColumns.find(c => c.id === columnId);
    if (column?.alwaysVisible) return;
    setColumnPrefs(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const toggleColumnGroupPref = (group: string) => {
    const groupCols = activityColumns.filter(c => c.group === group && !c.alwaysVisible);
    const allVisible = groupCols.every(c => columnPrefs.includes(c.id));
    if (allVisible) {
      setColumnPrefs(prev => prev.filter(id => !groupCols.find(c => c.id === id)));
    } else {
      setColumnPrefs(prev => {
        const newCols = [...prev];
        groupCols.forEach(c => {
          if (!newCols.includes(c.id)) newCols.push(c.id);
        });
        return newCols;
      });
    }
  };

  const saveColumnPrefs = async () => {
    setColumnPrefsSaving(true);
    try {
      const res = await apiFetch('/api/users/column-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns: columnPrefs })
      });
      if (res.ok) {
        toast.success("Default columns saved");
      } else {
        toast.error("Failed to save column preferences");
      }
    } catch {
      toast.error("Failed to save column preferences");
    } finally {
      setColumnPrefsSaving(false);
    }
  };

  const resetColumnPrefsToSystem = async () => {
    setColumnPrefsSaving(true);
    try {
      const res = await apiFetch('/api/users/column-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns: null })
      });
      if (res.ok) {
        setColumnPrefs(defaultVisibleActivityColumns);
        toast.success("Reset to system defaults");
      } else {
        toast.error("Failed to reset column preferences");
      }
    } catch {
      toast.error("Failed to reset column preferences");
    } finally {
      setColumnPrefsSaving(false);
    }
  };

  const handlePhotoChange = async (photoUrl: string) => {
    setProfilePhoto(photoUrl);
  };

  const handleEmailChange = async (newEmail: string) => {
    if (!user) {
      throw new Error("User not found");
    }

    try {
      const response = await apiFetch('/api/users/change-email-simple', {
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

  const handleExportData = async () => {
    if (!user) return;
    
    setIsExportingData(true);
    try {
      const response = await apiFetch(`/api/users/export-data?userId=${user.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export data');
      }

      // Get the filename from content-disposition header or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `aims-data-export-${new Date().toISOString().split('T')[0]}.json`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          fileName = match[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Data exported successfully");
    } catch (err) {
      console.error('Export error:', err);
      toast.error(err instanceof Error ? err.message : "Failed to export data");
    } finally {
      setIsExportingData(false);
    }
  };

  const handleAccountDeleted = () => {
    // Clear local storage and redirect to login
    localStorage.removeItem('user');
    localStorage.removeItem('supabase.auth.token');
    window.location.href = '/login?deleted=true';
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

      const response = await apiFetch('/api/users', {
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
          <LoadingText>Loading profile...</LoadingText>
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
          <TabsList className="p-1 h-auto bg-background gap-1 border mb-6">
            <TabsTrigger value="personal" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="h-4 w-4" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Columns3 className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
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
                    userId={user.id || user.email}
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                              <Label htmlFor="userRole" className="text-xs">User Role</Label>
                              <div className="relative">
                                <Input
                                  id="userRole"
                                  value={ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                                  disabled
                                  className="h-9 bg-muted pr-8"
                                />
                                <Lock className="h-3 w-3 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2" />
                              </div>
                            </div>
                        <div>
                              {user.role === 'super_user' ? (
                                <>
                                  <Label htmlFor="organisation" className="text-xs">Organisation</Label>
                                  <OrganizationCombobox
                                    organizations={organizations.map(org => ({
                                      id: org.id,
                                      name: org.name,
                                      acronym: org.acronym,
                                      logo: org.logo,
                                      iati_org_id: org.iati_org_id
                                    }))}
                                    value={selectedOrgId}
                                    onValueChange={setSelectedOrgId}
                                    placeholder="Select organisation..."
                                  />
                                </>
                              ) : (
                                <>
                                  <Label className="text-xs">Organisation</Label>
                                  <div className="relative">
                                    <div className="h-9 px-3 py-2 pr-8 border rounded-md bg-muted flex items-center gap-2">
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
                                    <Lock className="h-3 w-3 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2" />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Contact Details Section */}
                        <div className="space-y-4">
                          {/* Primary Email */}
                          <div className="space-y-3">
                        <div>
                              <Label htmlFor="email" className="text-xs mb-2 block">Primary Email</Label>
                              <div className="relative">
                                <Input
                                  id="email"
                                  type="email"
                                  value={formData.email}
                                  disabled
                                  className="bg-muted h-9 pr-8"
                                />
                                <Lock className="h-3 w-3 text-muted-foreground absolute right-3 top-1/2 transform -translate-y-1/2" />
                              </div>
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
                                  dropdownOpen={phoneDropdownOpen}
                                  onDropdownOpenChange={handlePhoneDropdownChange}
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
                                  dropdownOpen={faxDropdownOpen}
                                  onDropdownOpenChange={handleFaxDropdownChange}
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

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Columns3 className="h-5 w-5" />
                      Default Activity Columns
                    </CardTitle>
                    <CardDescription>
                      Choose which columns are visible by default on the Activities list. These defaults apply when you haven't customised columns in the current session.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetColumnPrefsToSystem}
                      disabled={columnPrefsSaving}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to System Defaults
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveColumnPrefs}
                      disabled={columnPrefsSaving}
                    >
                      {columnPrefsSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save as My Defaults
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {columnPrefsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingText>Loading column preferences...</LoadingText>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground mb-4">
                      {columnPrefs.length} of {activityColumns.length} columns selected
                    </p>
                    {orderedColumnGroups.map((groupKey) => {
                      const groupCols = activityColumns.filter(c => c.group === groupKey);
                      if (groupCols.length === 0) return null;

                      const toggleable = groupCols.filter(c => !c.alwaysVisible);
                      const allVisible = toggleable.length > 0 && toggleable.every(c => columnPrefs.includes(c.id));
                      const someVisible = toggleable.some(c => columnPrefs.includes(c.id));

                      return (
                        <div key={groupKey} className="border rounded-md mb-2">
                          <div
                            className="flex items-center gap-2 px-3 py-2 bg-muted/50 cursor-pointer hover:bg-muted/80"
                            onClick={() => toggleable.length > 0 && toggleColumnGroupPref(groupKey)}
                          >
                            <Checkbox
                              checked={allVisible}
                              indeterminate={someVisible && !allVisible}
                              onCheckedChange={() => toggleColumnGroupPref(groupKey)}
                              disabled={toggleable.length === 0}
                            />
                            <span className="text-sm font-medium">
                              {activityColumnGroups[groupKey] || groupKey}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
                            {groupCols.map(column => (
                              <div
                                key={column.id}
                                className={`flex items-start gap-2 px-3 py-2 hover:bg-muted/30 ${
                                  column.alwaysVisible ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                                onClick={() => !column.alwaysVisible && toggleColumnPref(column.id)}
                              >
                                <Checkbox
                                  checked={columnPrefs.includes(column.id)}
                                  onCheckedChange={() => toggleColumnPref(column.id)}
                                  disabled={column.alwaysVisible}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm">{column.label}</span>
                                  {column.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{column.description}</p>
                                  )}
                                  {column.alwaysVisible && (
                                    <span className="text-xs text-muted-foreground">(Required)</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

            {/* Danger Zone */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions for your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Export Data */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Download My Data</p>
                      <p className="text-sm text-muted-foreground">
                        Export all your personal data as a JSON file
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={handleExportData}
                    disabled={isExportingData}
                  >
                    {isExportingData ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </>
                    )}
                  </Button>
                </div>

                {/* Delete Account */}
                <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">Delete Account</p>
                      {user.role === 'super_user' || user.role === 'admin' ? (
                        <p className="text-sm text-muted-foreground">
                          Admin accounts must be deleted by another administrator from Admin → Users
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all associated data
                        </p>
                      )}
                    </div>
                  </div>
                  {user.role !== 'super_user' && user.role !== 'admin' && (
                    <Button 
                      variant="destructive"
                      onClick={() => setDeleteAccountDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
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

        {/* Delete Account Dialog */}
        <DeleteAccountModal
          isOpen={deleteAccountDialogOpen}
          onClose={() => setDeleteAccountDialogOpen(false)}
          onDeleted={handleAccountDeleted}
          userEmail={user.email}
          userId={user.id}
          userName={user.name || user.email}
        />
      </div>
    </MainLayout>
  );
}
