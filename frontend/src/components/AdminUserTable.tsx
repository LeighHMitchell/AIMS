"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { mockUsers } from "@/hooks/useUser"
import { User, ROLE_LABELS, USER_ROLES, Organization } from "@/types/user"
import { Search, UserPlus, Edit, Mail, Phone, Building2, Loader2, AlertCircle, Shield } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useUser } from "@/hooks/useUser"
import { Skeleton } from "@/components/ui/skeleton"

interface ExtendedUser extends User {
  // Extended user includes all fields from User type
}

export function AdminUserTable() {
  const { user: currentUser } = useUser()
  const [users, setUsers] = useState<ExtendedUser[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [filteredUsers, setFilteredUsers] = useState<ExtendedUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [orgFilter, setOrgFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Security check - only super users can access this
  const canAccess = currentUser?.role === USER_ROLES.SUPER_USER

  useEffect(() => {
    if (!canAccess) return
    fetchUsersAndOrganizations()
  }, [canAccess])

  const fetchUsersAndOrganizations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!supabase) {
        // Use mock data if Supabase is not configured
        setUsers(mockUsers)
        setFilteredUsers(mockUsers)
        const mockOrgs = Array.from(
          new Map(
            mockUsers
              .filter(u => u.organization)
              .map(u => [u.organizationId, u.organization!])
          ).values()
        )
        setOrganizations(mockOrgs)
        return
      }

      // Fetch users with their organizations
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          *,
          organizations (
            id,
            name,
            type,
            created_at,
            updated_at
          )
        `)
        .order('created_at', { ascending: false })

      if (usersError) {
        throw usersError
      }

      // Map the data to our User interface
      const mappedUsers: ExtendedUser[] = (usersData || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name || 'Unnamed User',
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role as any,
        organizationId: user.organization_id,
        organization: user.organizations ? {
          id: user.organizations.id,
          name: user.organizations.name,
          type: user.organizations.type,
          createdAt: user.organizations.created_at,
          updatedAt: user.organizations.updated_at
        } : undefined,
        organisation: user.organisation,
        department: user.department,
        jobTitle: user.job_title,
        title: user.title || user.job_title,
        telephone: user.telephone,
        phone: user.phone || user.telephone,
        website: user.website,
        mailingAddress: user.mailing_address,
        isActive: user.is_active ?? true,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }))

      setUsers(mappedUsers)
      setFilteredUsers(mappedUsers)

      // Fetch organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name')

      if (orgsError) {
        throw orgsError
      }

      const mappedOrgs: Organization[] = (orgsData || []).map((org: any) => ({
        id: org.id,
        name: org.name,
        type: org.type || 'other',
        createdAt: org.created_at,
        updatedAt: org.updated_at
      }))

      setOrganizations(mappedOrgs)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      setError(error.message || 'Failed to load users')
      // Fallback to mock data on error
      setUsers(mockUsers)
      setFilteredUsers(mockUsers)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let filtered = [...users]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.organization?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Apply organization filter
    if (orgFilter !== "all") {
      filtered = filtered.filter(user => user.organizationId === orgFilter)
    }

    setFilteredUsers(filtered)
  }, [searchQuery, roleFilter, orgFilter, users])

  const getRoleBadgeVariant = (role: string): any => {
    switch (role) {
      case USER_ROLES.SUPER_USER:
        return "destructive"
      case USER_ROLES.DEV_PARTNER_TIER_1:
      case USER_ROLES.GOV_PARTNER_TIER_1:
        return "default"
      case USER_ROLES.DEV_PARTNER_TIER_2:
      case USER_ROLES.GOV_PARTNER_TIER_2:
        return "secondary"

      default:
        return "secondary"
    }
  }

  const handleEditUser = (userId: string) => {
    // TODO: Implement user editing modal or navigation
    toast.info("User editing feature coming soon")
  }

  const handleAddUser = () => {
    // TODO: Implement user creation modal
    toast.info("User creation feature coming soon")
  }

  // Security check
  if (!canAccess) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Access Denied</p>
            <p className="text-muted-foreground">Only super users can access user management</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
            </div>
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage user accounts and permissions
              {!supabase && " (Demo Mode)"}
            </CardDescription>
          </div>
          <Button onClick={handleAddUser}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}. Showing demo data instead.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredUsers.length} of {users.length} users
        </p>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </span>
                          {(user.telephone || user.phone) && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.telephone || user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.organization ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{user.organization.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No organization</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "success" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.lastLogin
                          ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                          : "Never"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditUser(user.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No users found matching your filters</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 