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
import { useUser, mockUsers } from "@/hooks/useUser";
import { usePartners } from "@/hooks/usePartners";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { User, UserRole, USER_ROLES, ROLE_LABELS } from "@/types/user";
import { 
  Users, 
  Building2, 
  Edit, 
  Trash2, 
  Plus, 
  Search, 
  UserCheck, 
  UserX,
  Shield,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// Role badge color mapping
const getRoleBadgeVariant = (role: UserRole): "default" | "secondary" | "destructive" | "outline" => {
  if (role === USER_ROLES.SUPER_USER) return "destructive";
  if (role.includes("tier_1")) return "default";
  if (role.includes("tier_2")) return "secondary";
  return "outline";
};

export default function UserManagement() {
  const { user: currentUser, permissions } = useUser();
  const { partners, getDevelopmentPartners, loading: partnersLoading } = usePartners();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [filterOrg, setFilterOrg] = useState<string | "all">("all");
  const [activeTab, setActiveTab] = useState("users");

  const developmentPartners = getDevelopmentPartners();

  // Update users with partner information
  const usersWithPartners = users.map(user => {
    const partner = user.organizationId ? partners.find(p => p.id === user.organizationId) : null;
    return {
      ...user,
      organization: partner ? {
        id: partner.id,
        name: partner.name,
        type: partner.type,
        createdAt: partner.createdAt,
        updatedAt: partner.updatedAt
      } : user.organization,
      isOrganizationOrphaned: user.organizationId && !partner && user.organization
    };
  });

  // Filter users based on search and filters
  const filteredUsers = usersWithPartners.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesOrg = filterOrg === "all" || user.organizationId === filterOrg;
    return matchesSearch && matchesRole && matchesOrg;
  });

  const handleUserUpdate = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    toast.success("User updated successfully");
    setEditingUser(null);
  };

  const handleUserDelete = (userId: string) => {
    if (userId === currentUser?.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    setUsers(users.filter(u => u.id !== userId));
    toast.success("User deleted successfully");
  };

  if (partnersLoading) {
    return (
      <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_USER]}>
        <MainLayout>
          <div className="min-h-screen bg-slate-50">
            <div className="flex items-center justify-center min-h-screen">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.SUPER_USER]}>
      <MainLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="p-8 max-w-7xl mx-auto">
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
                {/* User Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-white">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{users.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {users.filter(u => u.isActive).length} active
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Super Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {users.filter(u => u.role === USER_ROLES.SUPER_USER).length}
                      </div>
                      <Badge variant="destructive" className="mt-1">
                        <Shield className="h-3 w-3 mr-1" />
                        Full Access
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card className="bg-white">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Orphan Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {users.filter(u => u.role === USER_ROLES.ORPHAN).length}
                      </div>
                      <Badge variant="outline" className="mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Need Assignment
                      </Badge>
                    </CardContent>
                  </Card>
                  <Card className="bg-white">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{partners.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {partners.filter(o => o.type === "development_partner").length} dev partners
                      </p>
                    </CardContent>
                  </Card>
                </div>

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
                          {partners.map((org) => (
                            <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Users Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-4 font-medium">User</th>
                            <th className="text-left p-4 font-medium">Role</th>
                            <th className="text-left p-4 font-medium">Organization</th>
                            <th className="text-left p-4 font-medium">Status</th>
                            <th className="text-left p-4 font-medium">Last Login</th>
                            <th className="text-right p-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((user) => (
                            <tr key={user.id} className="border-t hover:bg-muted/50 transition-colors">
                              <td className="p-4">
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-sm text-muted-foreground">{user.email}</div>
                                  {user.title && (
                                    <div className="text-sm text-muted-foreground">{user.title}</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge variant={getRoleBadgeVariant(user.role)}>
                                  {ROLE_LABELS[user.role]}
                                </Badge>
                              </td>
                              <td className="p-4">
                                {user.organization ? (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span>{user.organization.name}</span>
                                    {(user as any).isOrganizationOrphaned && (
                                      <Badge variant="destructive" className="text-xs">
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
                              <td className="p-4">
                                {user.isActive ? (
                                  <Badge variant="outline" className="text-green-600">
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-red-600">
                                    <UserX className="h-3 w-3 mr-1" />
                                    Inactive
                                  </Badge>
                                )}
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">
                                {user.lastLogin ? format(new Date(user.lastLogin), "PPp") : "Never"}
                              </td>
                              <td className="p-4">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingUser(user)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUserDelete(user.id)}
                                    disabled={user.id === currentUser?.id}
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
              <DialogContent className="max-w-md">
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
                    onSave={handleUserUpdate}
                    onClose={() => setEditingUser(null)} 
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

function UserEditor({ 
  user, 
  partners,
  onSave, 
  onClose 
}: { 
  user: User; 
  partners: any[];
  onSave: (user: User) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    title: user.title || "",
    phone: user.phone || "",
    role: user.role || USER_ROLES.ORPHAN,
    organizationId: user.organizationId || "",
    isActive: user.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...user,
      ...formData,
      id: user.id || Math.random().toString(36).substring(7),
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(updatedUser);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={!!user.id}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Title/Position</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Phone</label>
        <Input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Role</label>
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
        <label className="text-sm font-medium">Organization</label>
        <Select 
          value={formData.organizationId || "none"} 
          onValueChange={(v) => setFormData({ ...formData, organizationId: v === "none" ? "" : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Organization (Orphan)</SelectItem>
            {partners.map((org) => (
              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Active Status</label>
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked: boolean) => setFormData({ ...formData, isActive: checked })}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          {user.id ? "Update" : "Create"} User
        </Button>
      </DialogFooter>
    </form>
  );
} 