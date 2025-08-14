"use client"

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/hooks/useUser";
import { usePartners } from "@/hooks/usePartners";
import { useOrganizations } from "@/hooks/use-organizations";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { User, UserRole, USER_ROLES, ROLE_LABELS } from "@/types/user";
import { 
  Users, 
  Edit, 
  Trash2, 
  Plus, 
  Search, 
  Shield,
  AlertCircle,
  CheckCircle,
  Key,
  Mail,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { PhoneFields } from "@/components/ui/phone-fields";
import { AddressSearch, AddressComponents } from "@/components/ui/address-search";
import { OrganizationCombobox } from "@/components/ui/organization-combobox";
import { toast } from "sonner";
import { format } from "date-fns";
import { UserManagementSkeleton } from "@/components/skeletons";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import { EmailChangeConfirmDialog } from "@/components/EmailChangeConfirmDialog";

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

// Role badge color mapping with custom colors for different partner types
const getRoleBadgeVariant = (role: UserRole | 'admin'): "default" | "secondary" | "destructive" | "outline" | "dark-blue" | "light-blue" | "dark-green" | "light-green" => {
  if (role === USER_ROLES.SUPER_USER || role === 'admin') return "destructive";
  
  // Development Partner colors (blue shades)
  if (role === USER_ROLES.DEV_PARTNER_TIER_1) return "dark-blue";
  if (role === USER_ROLES.DEV_PARTNER_TIER_2) return "light-blue";
  
  // Government Partner colors (green shades)
  if (role === USER_ROLES.GOV_PARTNER_TIER_1) return "dark-green";
  if (role === USER_ROLES.GOV_PARTNER_TIER_2) return "light-green";
  
  return "outline";
};

export default function UserManagement() {
  const { user: currentUser, permissions } = useUser();
  const { partners, getDevelopmentPartners, loading: partnersLoading } = usePartners();
  const { organizations, loading: organizationsLoading } = useOrganizations();
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [emailChangeUser, setEmailChangeUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [filterOrg, setFilterOrg] = useState<string | "all">("all");
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{
    key: 'user' | 'role' | 'organization' | 'lastLogin' | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc'
  });

  const developmentPartners = getDevelopmentPartners();

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          // Transform API users to match User type
          const transformedUsers = data.map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            firstName: user.first_name,
            middleName: user.middle_name,
            lastName: user.last_name,
            profilePicture: user.avatar_url,
            title: user.title || "",
            jobTitle: user.job_title || "",
            department: user.department || "",
            telephone: user.telephone,
            website: user.website || "",
            mailingAddress: user.mailing_address || "",
            bio: user.bio || "",
            preferredLanguage: user.preferred_language || "en",
            timezone: user.timezone || "UTC",
            role: user.role,
            organizationId: user.organization_id,
            organization: user.organization ? {
              id: user.organization.id,
              name: user.organization.name,
              type: user.organization.type || 'other',
              createdAt: user.organization.created_at || new Date().toISOString(),
              updatedAt: user.organization.updated_at || new Date().toISOString(),
            } : undefined,
            phone: user.telephone || "",
            isActive: true,
            lastLogin: user.updated_at,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
          }));
          setUsers(transformedUsers);
        } else {
          toast.error("Failed to fetch users");
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Update users with partner information
  const usersWithPartners = users.map(user => {
    const partner = user.organizationId ? partners.find(p => p.id === user.organizationId) : null;
    return {
      ...user,
      organization: partner ? {
        id: partner.id,
        name: partner.name,
        type: partner.type || 'other',
        createdAt: partner.createdAt || new Date().toISOString(),
        updatedAt: partner.updatedAt || new Date().toISOString()
      } : user.organization,
      isOrganizationOrphaned: user.organizationId && !partner && user.organization
    };
  });

  // Handle sorting
  const handleSort = (key: 'user' | 'role' | 'organization' | 'lastLogin') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort users
  const filteredAndSortedUsers = usersWithPartners
    .filter(user => {
      const matchesSearch = 
        (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesRole = filterRole === "all" || user.role === filterRole;
      const matchesOrg = filterOrg === "all" || user.organizationId === filterOrg;
      return matchesSearch && matchesRole && matchesOrg;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortConfig.key) {
        case 'user':
          aValue = (a.firstName && a.lastName 
            ? `${a.firstName}${a.middleName ? ` ${a.middleName}` : ''} ${a.lastName}` 
            : a.name || '').toLowerCase();
          bValue = (b.firstName && b.lastName 
            ? `${b.firstName}${b.middleName ? ` ${b.middleName}` : ''} ${b.lastName}` 
            : b.name || '').toLowerCase();
          break;
        case 'role':
          aValue = (ROLE_LABELS[a.role] || '').toLowerCase();
          bValue = (ROLE_LABELS[b.role] || '').toLowerCase();
          break;
        case 'organization':
          aValue = (a.organization?.name || 'Unassigned').toLowerCase();
          bValue = (b.organization?.name || 'Unassigned').toLowerCase();
          break;
        case 'lastLogin':
          aValue = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          bValue = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          break;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

  const handleUserUpdate = async (updatedUser: User) => {
    try {
      console.log('[AIMS Frontend] Updating user with organizationId:', updatedUser.organizationId);
      
      // Split name into first_name and last_name for database
      const nameParts = updatedUser.name?.split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const requestBody = {
        id: updatedUser.id,
        title: updatedUser.title,
        first_name: firstName,
        middle_name: updatedUser.middleName,
        last_name: lastName,
        email: updatedUser.email,
        job_title: updatedUser.jobTitle,
        department: updatedUser.department,
        telephone: updatedUser.telephone,
        website: updatedUser.website,
        mailing_address: updatedUser.mailingAddress,
        bio: updatedUser.bio,
        preferred_language: updatedUser.preferredLanguage,
        timezone: updatedUser.timezone,
        profile_picture: updatedUser.profilePicture,
        role: updatedUser.role,
        organization_id: updatedUser.organizationId || null,
      };
      
      console.log('[AIMS Frontend] Request body organization_id:', requestBody.organization_id);
      console.log('[AIMS Frontend] Full request body:', requestBody);

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('[AIMS Frontend] Response status:', response.status);
      console.log('[AIMS Frontend] Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[AIMS Frontend] Response data:', data);
        // Transform and update the user in state
        const transformedUser = {
          ...updatedUser,
          id: data.id,
          firstName: data.first_name,
          middleName: data.middle_name,
          lastName: data.last_name,
          name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          title: data.title || "",
          jobTitle: data.job_title || "",
          department: data.department || "",
          telephone: data.telephone || "",
          phone: data.telephone || "",
          website: data.website || "",
          mailingAddress: data.mailing_address || "",
          bio: data.bio || "",
          preferredLanguage: data.preferred_language || "en",
          timezone: data.timezone || "UTC",
          profilePicture: data.avatar_url,
          organizationId: data.organization_id,
          organization: data.organization ? {
            id: data.organization.id,
            name: data.organization.name,
            type: data.organization.type || 'other',
            createdAt: data.organization.created_at || new Date().toISOString(),
            updatedAt: data.organization.updated_at || new Date().toISOString(),
          } : undefined,
          updatedAt: data.updated_at,
        };
        setUsers(users.map(u => u.id === transformedUser.id ? transformedUser : u));
        toast.success("User updated successfully");
        setEditingUser(null);
      } else {
        const error = await response.json();
        console.error('[AIMS Frontend] User update error:', error);
        console.error('[AIMS Frontend] Response status:', response.status);
        console.error('[AIMS Frontend] Response headers:', response.headers);
        toast.error(error.error || "Failed to update user");
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error("Failed to update user");
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast.error("You cannot delete your own account");
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId));
        toast.success("User deleted successfully");
      } else {
        toast.error("Failed to delete user");
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error("Failed to delete user");
    }
  };

  const handleUserCreate = async (newUser: User) => {
    try {
      console.log('[AIMS Frontend] Creating user with organizationId:', newUser.organizationId);
      
      // Split name into first_name and last_name for database
      const nameParts = newUser.name?.split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newUser.title,
          first_name: firstName,
          middle_name: newUser.middleName,
          last_name: lastName,
          email: newUser.email,
          job_title: newUser.jobTitle,
          department: newUser.department,
          telephone: newUser.telephone,
          website: newUser.website,
          mailing_address: newUser.mailingAddress,
          bio: newUser.bio,
          preferred_language: newUser.preferredLanguage,
          timezone: newUser.timezone,
          profile_picture: newUser.profilePicture,
          role: newUser.role,
          organization_id: newUser.organizationId || null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check for warnings
        if (data.warning) {
          console.warn('[AIMS Frontend] User creation warning:', data.warning);
          toast.warning(data.warning);
        }
        
        // Transform and add the user to state
        const transformedUser = {
          id: data.id,
          name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          firstName: data.first_name,
          middleName: data.middle_name,
          lastName: data.last_name,
          email: data.email,
          title: data.title || "",
          jobTitle: data.job_title || "",
          department: data.department || "",
          telephone: data.telephone || "",
          website: data.website || "",
          mailingAddress: data.mailing_address || "",
          bio: data.bio || "",
          preferredLanguage: data.preferred_language || "en",
          timezone: data.timezone || "UTC",
          profilePicture: data.avatar_url,
          role: data.role,
          organizationId: data.organization_id,
          organization: data.organization ? {
            id: data.organization.id,
            name: data.organization.name,
            type: data.organization.type || 'other',
            createdAt: data.organization.created_at || new Date().toISOString(),
            updatedAt: data.organization.updated_at || new Date().toISOString(),
          } : undefined,
          phone: data.telephone || "",
          isActive: true,
          lastLogin: data.updated_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setUsers([...users, transformedUser]);
        toast.success("User created successfully");
        setEditingUser(null);
      } else {
        const error = await response.json();
        console.error('[AIMS Frontend] User creation error:', error);
        toast.error(error.error || "Failed to create user");
      }
    } catch (error) {
      console.error('[AIMS Frontend] Error creating user:', error);
      toast.error("Failed to create user");
    }
  };

  const handleEmailChange = async (newEmail: string) => {
    if (!emailChangeUser || !currentUser) {
      throw new Error("Missing user information");
    }

    try {
      const response = await fetch('/api/users/change-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: emailChangeUser.id,
          newEmail: newEmail,
          currentUserRole: currentUser.role
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change email address");
      }

      const data = await response.json();
      
      // Update the user in the local state
      setUsers(users.map(u => 
        u.id === emailChangeUser.id 
          ? { ...u, email: newEmail, updatedAt: new Date().toISOString() }
          : u
      ));

      // Update the editing user if it's the same user
      if (editingUser?.id === emailChangeUser.id) {
        setEditingUser({ ...editingUser, email: newEmail });
      }

    } catch (error) {
      console.error('Error changing email:', error);
      throw error; // Re-throw to be handled by the dialog
    }
  };

  if (loading || partnersLoading || organizationsLoading) {
    return (
      <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_USER]}>
        <MainLayout>
          <UserManagementSkeleton />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_USER]}>
      <MainLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="p-8 max-w-full mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">User & Organization Management</h1>
              <p className="text-muted-foreground">Manage system users, roles, and organizations</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                {/* User Filters */}
                <Card className="mb-6 bg-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Users</CardTitle>
                        <CardDescription>Manage user accounts and permissions</CardDescription>
                      </div>
                      <Button onClick={() => setEditingUser({} as User)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <Select value={filterRole} onValueChange={(v) => setFilterRole(v as UserRole | "all")}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Filter by role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={filterOrg} onValueChange={setFilterOrg}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Filter by organization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Organizations</SelectItem>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name && org.acronym && org.name !== org.acronym 
                                ? `${org.name} (${org.acronym})` 
                                : org.name || org.acronym}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Users Table */}
                    <div className="border rounded-lg overflow-hidden overflow-x-auto">
                      <table className="w-full min-w-[1000px] table-auto">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-4 font-medium w-80">
                              <button
                                onClick={() => handleSort('user')}
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                              >
                                User
                                {sortConfig.key === 'user' ? (
                                  sortConfig.direction === 'asc' ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )
                                ) : (
                                  <div className="h-4 w-4" />
                                )}
                              </button>
                            </th>
                            <th className="text-left p-4 font-medium w-72">
                              <button
                                onClick={() => handleSort('role')}
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                              >
                                Role
                                {sortConfig.key === 'role' ? (
                                  sortConfig.direction === 'asc' ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )
                                ) : (
                                  <div className="h-4 w-4" />
                                )}
                              </button>
                            </th>
                            <th className="text-left p-4 font-medium w-68">
                              <button
                                onClick={() => handleSort('organization')}
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                              >
                                Organization
                                {sortConfig.key === 'organization' ? (
                                  sortConfig.direction === 'asc' ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )
                                ) : (
                                  <div className="h-4 w-4" />
                                )}
                              </button>
                            </th>
                            <th className="text-left p-4 font-medium w-48">
                              <button
                                onClick={() => handleSort('lastLogin')}
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                              >
                                Last Login
                                {sortConfig.key === 'lastLogin' ? (
                                  sortConfig.direction === 'asc' ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )
                                ) : (
                                  <div className="h-4 w-4" />
                                )}
                              </button>
                            </th>
                            <th className="text-right p-4 font-medium w-32">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAndSortedUsers.map((user) => (
                            <tr key={user.id} className="border-t hover:bg-muted/50 transition-colors">
                              <td className="p-4 w-80">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-12 w-12 flex-shrink-0">
                                    <AvatarImage src={user.profilePicture} alt={user.name} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                                      {user.firstName && user.lastName 
                                        ? `${user.firstName[0]}${user.middleName ? user.middleName[0] : ''}${user.lastName[0]}`.toUpperCase().slice(0, 2)
                                        : user.name 
                                          ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                          : 'U'
                                      }
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-base truncate">
                                      {user.title && user.title !== "none" ? `${user.title} ` : ""}{user.firstName && user.lastName 
                                        ? `${user.firstName}${user.middleName ? ` ${user.middleName}` : ''} ${user.lastName}` 
                                        : user.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                                    {user.jobTitle && (
                                      <div className="text-sm text-muted-foreground truncate">{user.jobTitle}</div>
                                    )}
                                    {user.department && (
                                      <div className="text-xs text-muted-foreground truncate">{user.department}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 w-72">
                                <Badge variant={getRoleBadgeVariant(user.role)}>
                                  {ROLE_LABELS[user.role]}
                                </Badge>
                              </td>
                              <td className="p-4 w-68">
                                {user.organization ? (
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="truncate flex-1">{user.organization.name}</span>
                                    {(user as any).isOrganizationOrphaned && (
                                      <Badge variant="destructive" className="text-xs flex-shrink-0">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Deleted
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-orange-600">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Unassigned
                                  </Badge>
                                )}
                              </td>
                              <td className="p-4 text-sm text-muted-foreground w-48">
                                {user.lastLogin ? (
                                  <div>
                                    <div className="truncate">{format(new Date(user.lastLogin), "MMM d, yyyy")}</div>
                                    <div className="truncate text-xs">{format(new Date(user.lastLogin), "h:mm a")}</div>
                                  </div>
                                ) : (
                                  <div className="truncate">Never</div>
                                )}
                              </td>
                              <td className="p-4 w-32">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingUser(user)}
                                    title="Edit user"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {currentUser?.role === 'super_user' && user.id && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEmailChangeUser(user)}
                                      title="Change email"
                                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Mail className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setResetPasswordUser(user)}
                                    disabled={user.id === currentUser?.id}
                                    title="Reset password"
                                    className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  >
                                    <Key className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUserDelete(user.id)}
                                    disabled={user.id === currentUser?.id}
                                    title="Delete user"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* User Edit Dialog */}
            <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser?.id ? "Edit User" : "Add New User"}
                  </DialogTitle>
                  <DialogDescription>
                    Update user information and permissions
                  </DialogDescription>
                </DialogHeader>
                {editingUser && (
                  <UserEditor 
                    user={editingUser} 
                    partners={developmentPartners}
                    organizations={organizations}
                    currentUser={currentUser}
                    onSave={editingUser.id ? handleUserUpdate : handleUserCreate}
                    onClose={() => setEditingUser(null)}
                    onEmailChange={handleEmailChange}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Reset Password Modal */}
            {resetPasswordUser && (
              <ResetPasswordModal
                isOpen={!!resetPasswordUser}
                onClose={() => setResetPasswordUser(null)}
                userId={resetPasswordUser.id}
                userName={resetPasswordUser.name || resetPasswordUser.email}
                userEmail={resetPasswordUser.email}
              />
            )}

            {/* Email Change Modal */}
            {emailChangeUser && (
              <EmailChangeConfirmDialog
                isOpen={!!emailChangeUser}
                onClose={() => setEmailChangeUser(null)}
                onConfirm={handleEmailChange}
                currentEmail={emailChangeUser.email}
                userName={emailChangeUser.name || emailChangeUser.email}
                userId={emailChangeUser.id}
              />
            )}
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

function UserEditor({ 
  user, 
  partners,
  organizations,
  currentUser,
  onSave, 
  onClose,
  onEmailChange
}: { 
  user: User; 
  partners: any[];
  organizations: any[];
  currentUser: User | null;
  onSave: (user: User) => void;
  onClose: () => void;
  onEmailChange: (newEmail: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState("personal");
  const [profilePhoto, setProfilePhoto] = useState(user.profilePicture || "");
  const [emailChangeDialogOpen, setEmailChangeDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: user.title || "none",
    firstName: user.firstName || "",
    middleName: user.middleName || "",
    lastName: user.lastName || "",
    name: user.name || "",
    email: user.email || "",
    jobTitle: user.jobTitle || user.title || "",
    department: user.department || "",
    ...splitTelephone(user.telephone || user.phone || ""),
    website: user.website || "",
    mailingAddress: user.mailingAddress || "",
    addressComponents: parseMailingAddress(user.mailingAddress || ""),
    bio: user.bio || "",
    preferredLanguage: user.preferredLanguage || "en",
    timezone: user.timezone || "UTC",
    role: user.role || USER_ROLES.DEV_PARTNER_TIER_2,
    organizationId: user.organizationId || "",
  });

  const handlePhotoChange = async (photoUrl: string) => {
    setProfilePhoto(photoUrl);
    
    // Auto-save the profile photo immediately
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          profile_picture: photoUrl,
        }),
      });
      
      if (response.ok) {
        toast.success("Profile picture updated!");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile picture');
      }
    } catch (error) {
      console.error("Failed to save profile picture:", error);
      toast.error("Failed to save profile picture");
    }
  };

  const handleEmailChangeClick = () => {
    setEmailChangeDialogOpen(true);
  };

  const handleEmailChangeConfirm = async (newEmail: string) => {
    await onEmailChange(newEmail);
    setFormData({ ...formData, email: newEmail });
    setEmailChangeDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine first and last name for the name field
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    
    const updatedUser: User = {
      ...user,
      title: formData.title === "none" ? "" : formData.title,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      name: fullName || formData.name,
      email: formData.email,
      jobTitle: formData.jobTitle,
      department: formData.department,
      telephone: formData.countryCode + formData.phoneNumber,
      phone: formData.countryCode + formData.phoneNumber, // backward compatibility
      website: formData.website,
      mailingAddress: formatMailingAddress(formData.addressComponents),
      bio: formData.bio,
      preferredLanguage: formData.preferredLanguage,
      timezone: formData.timezone,
      profilePicture: profilePhoto,
      role: formData.role,
      organizationId: formData.organizationId === "" ? undefined : formData.organizationId,
      id: user.id || Math.random().toString(36).substring(7),
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
    onSave(updatedUser);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="contact">Contact & Address</TabsTrigger>
          <TabsTrigger value="system">System & Role</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-4">
          {/* Profile Picture */}
          <div className="flex flex-col items-center space-y-4">
            <ProfilePhotoUpload
              currentPhoto={profilePhoto}
              userInitials={`${formData.firstName?.[0] || ''}${formData.lastName?.[0] || user.name?.[0] || 'U'}`}
              onPhotoChange={handlePhotoChange}
              className="mb-2"
            />
          </div>

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
            <div className="flex flex-row items-center justify-between w-full mb-2">
              <Label htmlFor="email" className="flex-shrink-0">Email Address</Label>
              {user.id && currentUser?.role === 'super_user' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleEmailChangeClick}
                  className="text-orange-600 hover:text-orange-700 text-xs px-2 py-1 ml-auto"
                >
                  Change Email
                </Button>
              )}
            </div>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={!!user.id}
            />
            {user.id && currentUser?.role !== 'super_user' && (
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed for existing users
              </p>
            )}
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

          <div>
            <Label htmlFor="bio">Bio / Description</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Brief description of the user..."
              rows={3}
            />
          </div>
        </TabsContent>

        {/* Contact & Address Tab */}
        <TabsContent value="contact" className="space-y-4">
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
        </TabsContent>

        {/* System & Role Tab */}
        <TabsContent value="system" className="space-y-4">
          <div>
            <Label htmlFor="role">Role</Label>
            <Select 
              value={formData.role} 
              onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="organization">Organization</Label>
            <OrganizationCombobox
              organizations={organizations}
              value={formData.organizationId || ""}
              onValueChange={(v) => setFormData({ ...formData, organizationId: v })}
              placeholder="Select organization..."
              className="w-full"
            />
            {!formData.organizationId && (
              <p className="text-xs text-muted-foreground mt-1">
                No organization selected (Orphan user)
              </p>
            )}
          </div>

          <Separator />

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
        </TabsContent>
      </Tabs>

      <Separator />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          {user.id ? "Update" : "Create"} User
        </Button>
      </DialogFooter>

      {/* Email Change Dialog */}
      <EmailChangeConfirmDialog
        isOpen={emailChangeDialogOpen}
        onClose={() => setEmailChangeDialogOpen(false)}
        onConfirm={handleEmailChangeConfirm}
        currentEmail={user.email || ''}
        userName={user.name || user.email || ''}
        userId={user.id}
      />
    </div>
  );
}