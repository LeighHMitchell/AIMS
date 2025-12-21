"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { mockUsers } from "@/hooks/useUser"
import { User, ROLE_LABELS, USER_ROLES, Organization } from "@/types/user"
import { getRoleBadgeVariant } from "@/lib/role-badge-utils"
import { Search, UserPlus, Edit, Mail, Phone, Building2, Loader2, AlertCircle, Shield, Key, Lock, ArrowUpDown, ArrowUp, ArrowDown, Check, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useUser } from "@/hooks/useUser"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateUserModal } from "@/components/admin/CreateUserModal"
import { EditUserModal } from "@/components/admin/EditUserModal"
import { ResetPasswordModal } from "@/components/ResetPasswordModal"

type SortField = 'name' | 'organization' | 'role' | 'status' | 'lastLogin'
type SortOrder = 'asc' | 'desc'

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
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<ExtendedUser | null>(null)

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Inline editing state
  const [editingPhoneUserId, setEditingPhoneUserId] = useState<string | null>(null)
  const [editingEmailUserId, setEditingEmailUserId] = useState<string | null>(null)
  const [editPhoneValue, setEditPhoneValue] = useState("")
  const [editEmailValue, setEditEmailValue] = useState("")
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  const phoneInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

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

      // Fetch users using the API endpoint that includes organization data
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const usersData = await response.json()

      // Map the data to our User interface
      const mappedUsers: ExtendedUser[] = (usersData || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 'Unnamed User',
        firstName: user.firstName || user.first_name,
        middleName: user.middleName || user.middle_name,
        lastName: user.lastName || user.last_name,
        title: user.title,
        role: user.role as any,
        organizationId: user.organizationId || user.organization_id,
        organization: user.organization, // Now includes organization data from API
        organisation: user.organisation,
        department: user.department,
        jobTitle: user.jobTitle || user.job_title,
        contactType: user.contactType || user.contact_type,
        telephone: user.telephone,
        phone: user.telephone,
        secondaryEmail: user.secondaryEmail || user.secondary_email,
        secondaryPhone: user.secondaryPhone || user.secondary_phone,
        faxNumber: user.faxNumber || user.fax_number,
        website: user.website,
        mailingAddress: user.mailingAddress || user.mailing_address,
        notes: user.notes,
        profilePicture: user.profilePicture || user.avatar_url,
        isActive: user.isActive ?? user.is_active ?? true,
        lastLogin: user.lastLogin || user.last_login,
        createdAt: user.createdAt || user.created_at,
        updatedAt: user.updatedAt || user.updated_at
      }))

      console.log('[AdminUserTable] Fetched users:', mappedUsers.length)

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
        (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
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

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          const nameA = a.firstName && a.lastName
            ? `${a.firstName} ${a.lastName}`
            : a.name || ''
          const nameB = b.firstName && b.lastName
            ? `${b.firstName} ${b.lastName}`
            : b.name || ''
          comparison = nameA.localeCompare(nameB)
          break
        case 'organization':
          comparison = (a.organization?.name || '').localeCompare(b.organization?.name || '')
          break
        case 'role':
          comparison = (a.role || '').localeCompare(b.role || '')
          break
        case 'status':
          comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0)
          break
        case 'lastLogin':
          const dateA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0
          const dateB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0
          comparison = dateA - dateB
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredUsers(filtered)
  }, [searchQuery, roleFilter, orgFilter, users, sortField, sortOrder])

  // Removed local getRoleBadgeVariant function - now using unified utility

  const handleEditUser = (userId: string) => {
    const userToEdit = users.find(user => user.id === userId)
    if (userToEdit) {
      setEditingUser(userToEdit)
    } else {
      toast.error("User not found")
    }
  }

  const handleResetPassword = (userId: string) => {
    const userToReset = users.find(user => user.id === userId)
    if (userToReset) {
      setResetPasswordUser(userToReset)
    } else {
      toast.error("User not found")
    }
  }

  const handleAddUser = () => {
    setIsCreateUserModalOpen(true)
  }

  const handleUserCreated = (newUser: User) => {
    // Add the new user to our local state
    const extendedUser: ExtendedUser = newUser
    setUsers(prev => [extendedUser, ...prev])
    setIsCreateUserModalOpen(false)
    
    // Refresh the data to ensure we have the latest from the server
    fetchUsersAndOrganizations()
  }

  const handleUserUpdated = (updatedUser: User) => {
    // Update the user in our local state
    const extendedUser: ExtendedUser = updatedUser
    setUsers(prev => prev.map(user => 
      user.id === updatedUser.id ? extendedUser : user
    ))
    setEditingUser(null)
    
    // Refresh the data to ensure we have the latest from the server
    fetchUsersAndOrganizations()
  }

  const handlePasswordReset = () => {
    setResetPasswordUser(null)
    // No need to refresh data as password reset doesn't change user profile data
  }

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Get sort icon for column headers
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return sortOrder === 'desc'
      ? <ArrowDown className="h-4 w-4 ml-1" />
      : <ArrowUp className="h-4 w-4 ml-1" />
  }

  // Inline status toggle handler
  const handleStatusToggle = async (userId: string, newStatus: boolean) => {
    setSavingUserId(userId)
    try {
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, is_active: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, isActive: newStatus } : user
      ))
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`)
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update user status')
    } finally {
      setSavingUserId(null)
    }
  }

  // Inline phone editing handlers
  const startPhoneEdit = (user: ExtendedUser) => {
    setEditingPhoneUserId(user.id)
    setEditPhoneValue(user.telephone || user.phone || '')
    setTimeout(() => phoneInputRef.current?.focus(), 0)
  }

  const cancelPhoneEdit = () => {
    setEditingPhoneUserId(null)
    setEditPhoneValue('')
  }

  const savePhoneEdit = async (userId: string) => {
    setSavingUserId(userId)
    try {
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, telephone: editPhoneValue })
      })

      if (!response.ok) {
        throw new Error('Failed to update phone')
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, telephone: editPhoneValue, phone: editPhoneValue } : user
      ))
      toast.success('Phone number updated')
      setEditingPhoneUserId(null)
      setEditPhoneValue('')
    } catch (error) {
      console.error('Error updating phone:', error)
      toast.error('Failed to update phone number')
    } finally {
      setSavingUserId(null)
    }
  }

  // Inline email editing handlers
  const startEmailEdit = (user: ExtendedUser) => {
    setEditingEmailUserId(user.id)
    setEditEmailValue(user.email || '')
    setTimeout(() => emailInputRef.current?.focus(), 0)
  }

  const cancelEmailEdit = () => {
    setEditingEmailUserId(null)
    setEditEmailValue('')
  }

  const saveEmailEdit = async (userId: string) => {
    if (!editEmailValue || !editEmailValue.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setSavingUserId(userId)
    try {
      const response = await fetch('/api/users/change-email-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newEmail: editEmailValue })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update email')
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, email: editEmailValue } : user
      ))
      toast.success('Email updated successfully')
      setEditingEmailUserId(null)
      setEditEmailValue('')
    } catch (error: any) {
      console.error('Error updating email:', error)
      toast.error(error.message || 'Failed to update email')
    } finally {
      setSavingUserId(null)
    }
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
          <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    User
                    {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <span
                      className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('role')}
                    >
                      Role
                      {getSortIcon('role')}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Only Super Users can modify roles</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('organization')}
                >
                  <div className="flex items-center">
                    Organization
                    {getSortIcon('organization')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('lastLogin')}
                >
                  <div className="flex items-center">
                    Last Login
                    {getSortIcon('lastLogin')}
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    {/* User column with name, email (clickable/editable), phone (editable) */}
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {user.firstName && user.lastName
                            ? `${user.firstName}${user.middleName ? ` ${user.middleName}` : ''} ${user.lastName}`
                            : user.name}
                        </p>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground mt-1">
                          {/* Email - clickable or inline editable */}
                          {editingEmailUserId === user.id ? (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <Input
                                ref={emailInputRef}
                                type="email"
                                value={editEmailValue}
                                onChange={(e) => setEditEmailValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEmailEdit(user.id)
                                  if (e.key === 'Escape') cancelEmailEdit()
                                }}
                                onBlur={() => {
                                  // Save on blur if value changed
                                  if (editEmailValue !== user.email) {
                                    saveEmailEdit(user.id)
                                  } else {
                                    cancelEmailEdit()
                                  }
                                }}
                                className="h-6 text-xs w-48"
                                disabled={savingUserId === user.id}
                              />
                              {savingUserId === user.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => saveEmailEdit(user.id)}
                                  >
                                    <Check className="h-3 w-3 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={cancelEmailEdit}
                                  >
                                    <X className="h-3 w-3 text-red-600" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="flex items-center gap-1 group">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <a
                                href={`mailto:${user.email}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {user.email}
                              </a>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEmailEdit(user)
                                }}
                                title="Edit email"
                              >
                                <Edit className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </span>
                          )}

                          {/* Phone - editable */}
                          {editingPhoneUserId === user.id ? (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <Input
                                ref={phoneInputRef}
                                type="tel"
                                value={editPhoneValue}
                                onChange={(e) => setEditPhoneValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') savePhoneEdit(user.id)
                                  if (e.key === 'Escape') cancelPhoneEdit()
                                }}
                                onBlur={() => {
                                  const originalPhone = user.telephone || user.phone || ''
                                  if (editPhoneValue !== originalPhone) {
                                    savePhoneEdit(user.id)
                                  } else {
                                    cancelPhoneEdit()
                                  }
                                }}
                                className="h-6 text-xs w-36"
                                disabled={savingUserId === user.id}
                                placeholder="Enter phone number"
                              />
                              {savingUserId === user.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => savePhoneEdit(user.id)}
                                  >
                                    <Check className="h-3 w-3 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={cancelPhoneEdit}
                                  >
                                    <X className="h-3 w-3 text-red-600" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : (user.telephone || user.phone) ? (
                            <span className="flex items-center gap-1 group">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span>{user.telephone || user.phone}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startPhoneEdit(user)
                                }}
                                title="Edit phone"
                              >
                                <Edit className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 group">
                              <Phone className="h-3 w-3 flex-shrink-0 text-gray-300" />
                              <span className="text-gray-400 italic text-xs">No phone</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startPhoneEdit(user)
                                }}
                                title="Add phone"
                              >
                                <Edit className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Role with lock icon */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="h-3 w-3 text-muted-foreground/50" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Use Edit button to change role</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>

                    {/* Organization with logo */}
                    <TableCell>
                      {user.organization ? (
                        <div className="flex items-center gap-2">
                          {user.organization.logo ? (
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.organization.logo} alt={user.organization.name} />
                              <AvatarFallback className="text-xs">
                                {user.organization.acronym?.slice(0, 2) || user.organization.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span className="text-sm">
                            {user.organization.name}
                            {user.organization.acronym && ` (${user.organization.acronym})`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No organization</span>
                      )}
                    </TableCell>

                    {/* Status with inline toggle */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.isActive ?? true}
                          onCheckedChange={(checked) => handleStatusToggle(user.id, checked)}
                          disabled={savingUserId === user.id}
                          aria-label={`Toggle ${user.name} active status`}
                        />
                        <span className={`text-xs ${user.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                          {savingUserId === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            user.isActive ? 'Active' : 'Inactive'
                          )}
                        </span>
                      </div>
                    </TableCell>

                    {/* Last Login */}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.lastLogin
                          ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                          : "Never"}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit user details</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPassword(user.id)}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Reset password</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
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
          </TooltipProvider>
        </div>
      </CardContent>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onUserCreated={handleUserCreated}
        organizations={organizations}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onUserUpdated={handleUserUpdated}
        user={editingUser}
        organizations={organizations}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={!!resetPasswordUser}
        onClose={handlePasswordReset}
        userId={resetPasswordUser?.id || ''}
        userName={resetPasswordUser?.name || ''}
        userEmail={resetPasswordUser?.email || ''}
      />
    </Card>
  )
} 