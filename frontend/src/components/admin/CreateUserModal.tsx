"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { OrganizationCombobox, Organization as ComboboxOrganization } from "@/components/ui/organization-combobox"
import { PhoneFields } from "@/components/ui/phone-fields"
import { AddressSearch, AddressComponents } from "@/components/ui/address-search"
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload"
import { User, UserRole, USER_ROLES, ROLE_LABELS } from "@/types/user"
import { Organization } from "@/types/user"
import { Eye, EyeOff, Copy, RefreshCw, UserPlus, Key, AlertCircle, CheckCircle, Loader2, Lock, Unlock, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { LockedField } from "@/components/ui/locked-field"
import { OrganizationDropdownWithLogo, OrganizationWithLogo } from "@/components/ui/organization-dropdown-with-logo"
import { useUser } from "@/hooks/useUser"

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserCreated: (user: User) => void
  organizations?: Organization[]
}

interface CreateUserForm {
  title?: string
  firstName: string
  middleName?: string
  lastName: string
  position?: string
  department?: string
  organizationId?: string
  organisation?: string
  contactType?: string
  email: string
  secondaryEmail?: string
  countryCode?: string
  phoneNumber?: string
  secondaryCountryCode?: string
  secondaryPhoneNumber?: string
  faxCountryCode?: string
  faxNumber?: string
  website?: string
  mailingAddress?: string
  addressComponents?: AddressComponents
  notes?: string
  profilePicture?: string
  role: UserRole
  password: string
  generatePassword: boolean
  sendWelcomeEmail: boolean
  createdBy?: string
  reportedByOrgId?: string
}

const initialFormState: CreateUserForm = {
  title: "",
  firstName: "",
  middleName: "",
  lastName: "",
  position: "",
  department: "",
  organizationId: undefined,
  organisation: "",
  contactType: "",
  email: "",
  secondaryEmail: "",
  countryCode: "+95",
  phoneNumber: "",
  secondaryCountryCode: "+61",
  secondaryPhoneNumber: "",
  faxCountryCode: "+95",
  faxNumber: "",
  website: "",
  mailingAddress: "",
  addressComponents: {},
  notes: "",
  profilePicture: "",
  role: USER_ROLES.DEV_PARTNER_TIER_2,
  password: "",
  generatePassword: true,
  sendWelcomeEmail: true,
  createdBy: "",
  reportedByOrgId: undefined
}

export function CreateUserModal({ isOpen, onClose, onUserCreated, organizations = [] }: CreateUserModalProps) {
  const { user: currentUser } = useUser()
  const [form, setForm] = useState<CreateUserForm>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [createdUser, setCreatedUser] = useState<{ user: User; password: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize created by field with current user when form opens
  React.useEffect(() => {
    if (isOpen && currentUser && !form.createdBy) {
      setForm(prev => ({ 
        ...prev, 
        createdBy: currentUser.name || `${currentUser.firstName} ${currentUser.lastName}`.trim()
      }))
    }
  }, [isOpen, currentUser, form.createdBy])

  // Generate a secure password
  const generateSecurePassword = (): string => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const symbols = '!@#$%&*'
    
    let password = ''
    
    // Ensure at least one of each type
    password += 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)]
    password += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)]
    password += '23456789'[Math.floor(Math.random() * 8)]
    password += symbols[Math.floor(Math.random() * symbols.length)]
    
    // Fill the rest (12 characters total)
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)]
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword()
    setForm(prev => ({ ...prev, password: newPassword }))
  }

  const handleFormChange = (field: keyof CreateUserForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleOrganizationChange = (orgId: string | undefined) => {
    const selectedOrg = organizations.find(org => org.id === orgId)
    setForm(prev => ({ 
      ...prev, 
      organizationId: orgId,
      organisation: selectedOrg?.name || ""
    }))
  }

  const handleAddressChange = (address: AddressComponents) => {
    setForm(prev => ({ 
      ...prev, 
      addressComponents: address,
      mailingAddress: address.fullAddress || ""
    }))
  }

  const validateForm = (): string | null => {
    if (!form.email.trim()) return "Email is required"
    if (!form.firstName.trim()) return "First name is required"
    if (form.generatePassword && !form.password.trim()) return "Password is required"
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) return "Please enter a valid email address"
    
    // Password validation (if not auto-generated)
    if (!form.generatePassword && form.password.length < 8) {
      return "Password must be at least 8 characters long"
    }
    
    return null
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Generate password if needed
      let finalPassword = form.password
      if (form.generatePassword && !finalPassword) {
        finalPassword = generateSecurePassword()
      }

      // Combine country code and phone number for telephone fields
      const primaryPhone = form.countryCode && form.phoneNumber 
        ? `${form.countryCode}${form.phoneNumber}`.replace(/\s+/g, '')
        : form.phoneNumber || ""
      
      const secondaryPhone = form.secondaryCountryCode && form.secondaryPhoneNumber 
        ? `${form.secondaryCountryCode}${form.secondaryPhoneNumber}`.replace(/\s+/g, '')
        : form.secondaryPhoneNumber || ""
      
      const faxPhone = form.faxCountryCode && form.faxNumber 
        ? `${form.faxCountryCode}${form.faxNumber}`.replace(/\s+/g, '')
        : form.faxNumber || ""

      const userData = {
        email: form.email.trim(),
        first_name: form.firstName.trim(),
        middle_name: form.middleName?.trim() || null,
        last_name: form.lastName.trim(),
        title: form.title === 'none' ? null : form.title?.trim(),
        job_title: form.position?.trim() || null, // Position maps to job_title in database
        role: form.role,
        organization_id: form.organizationId || null,
        organisation: form.organisation?.trim() || null,
        department: form.department?.trim() || null,
        contact_type: form.contactType === 'none' ? null : form.contactType?.trim(),
        telephone: primaryPhone.trim() || null,
        secondary_email: form.secondaryEmail?.trim() || null,
        secondary_phone: secondaryPhone.trim() || null,
        fax_number: faxPhone.trim() || null,
        website: form.website?.trim() || null,
        mailing_address: form.mailingAddress?.trim() || null,
        // Address component fields
        address_line_1: form.addressComponents?.addressLine1?.trim() || null,
        address_line_2: form.addressComponents?.addressLine2?.trim() || null,
        city: form.addressComponents?.city?.trim() || null,
        state_province: form.addressComponents?.state?.trim() || null,
        country: form.addressComponents?.country?.trim() || null,
        postal_code: form.addressComponents?.postalCode?.trim() || null,
        notes: form.notes?.trim() || null,
        avatar_url: form.profilePicture?.trim() || null,
        password: finalPassword,
        created_by: form.createdBy?.trim() || null,
        reported_by_org_id: form.reportedByOrgId || null
      }

      console.log('[CreateUserModal] Creating user:', userData.email)

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user')
      }

      console.log('[CreateUserModal] User created successfully:', result.email)

      // Transform the result to match our User interface
      const fullName = [result.first_name, result.middle_name, result.last_name]
        .filter(Boolean).join(' ').trim()
      
      const newUser: User = {
        id: result.id,
        email: result.email,
        name: fullName,
        firstName: result.first_name,
        middleName: result.middle_name,
        lastName: result.last_name,
        title: result.title,
        role: result.role,
        organizationId: result.organization_id,
        organization: form.organizationId ? organizations.find(org => org.id === form.organizationId) : undefined,
        organisation: result.organisation,
        department: result.department,
        jobTitle: result.position || result.job_title,
        contactType: result.contact_type,
        telephone: result.telephone,
        phone: result.telephone,

        faxNumber: result.fax_number,
        website: result.website,
        mailingAddress: result.mailing_address,
        notes: result.notes,
        profilePicture: result.avatar_url,
        isActive: result.is_active ?? true,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        createdBy: result.created_by || form.createdBy,
        reportedByOrgId: result.reported_by_org_id || form.reportedByOrgId
      }

      // Show success state with credentials
      setCreatedUser({ user: newUser, password: finalPassword })
      
      toast.success(`User ${newUser.email} created successfully!`)
      
      // Notify parent component
      onUserCreated(newUser)

    } catch (error) {
      console.error('[CreateUserModal] Error creating user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setForm(initialFormState)
    setCreatedUser(null)
    setError(null)
    setShowPassword(false)
    onClose()
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  // Auto-generate password when generatePassword is enabled
  if (form.generatePassword && !form.password && isOpen) {
    handleGeneratePassword()
  }

  // Success state - show credentials
  if (createdUser) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              User Created Successfully
            </DialogTitle>
            <DialogDescription>
              The user account has been created. Please share these login credentials securely.
            </DialogDescription>
          </DialogHeader>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Login Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">User</Label>
                <p className="text-sm text-muted-foreground">{createdUser.user.name}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-muted px-2 py-1 rounded text-sm flex-1">
                    {createdUser.user.email}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(createdUser.user.email, "Email")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Temporary Password</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-muted px-2 py-1 rounded text-sm flex-1 font-mono">
                    {createdUser.password}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(createdUser.password, "Password")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Role</Label>
                <p className="text-sm text-muted-foreground">
                  {ROLE_LABELS[createdUser.user.role as keyof typeof ROLE_LABELS]}
                </p>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              The user should change their password after first login. Share these credentials securely.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Creation form
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account with login credentials and profile information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Profile Picture */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Profile Picture</h3>
            <ProfilePhotoUpload
              currentPhoto={form.profilePicture}
              onPhotoChange={(photoUrl) => handleFormChange("profilePicture", photoUrl)}
              userInitials={`${form.firstName.charAt(0)}${form.lastName.charAt(0)}`.toUpperCase() || "NU"}
            />
          </div>

          <Separator />

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Select value={form.title} onValueChange={(value) => handleFormChange("title", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mr." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr.">Mr.</SelectItem>
                    <SelectItem value="Mrs.">Mrs.</SelectItem>
                    <SelectItem value="Ms.">Ms.</SelectItem>
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Prof.">Prof.</SelectItem>
                    <SelectItem value="Hon.">Hon.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => handleFormChange("firstName", e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  value={form.middleName}
                  onChange={(e) => handleFormChange("middleName", e.target.value)}
                  placeholder="Enter middle name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => handleFormChange("lastName", e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position">Position/Role</Label>
                <Input
                  id="position"
                  value={form.position}
                  onChange={(e) => handleFormChange("position", e.target.value)}
                  placeholder="Enter position/role"
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(e) => handleFormChange("department", e.target.value)}
                  placeholder="Enter department"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="role">User Role *</Label>
              <Select value={form.role} onValueChange={(value) => handleFormChange("role", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Organization Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Organization Information</h3>
            
            <div>
              <Label htmlFor="contactType">Contact Type</Label>
              <Select value={form.contactType} onValueChange={(value) => handleFormChange("contactType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary Contact</SelectItem>
                  <SelectItem value="secondary">Secondary Contact</SelectItem>
                  <SelectItem value="technical">Technical Contact</SelectItem>
                  <SelectItem value="administrative">Administrative Contact</SelectItem>
                  <SelectItem value="financial">Financial Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Label htmlFor="organization" className="mb-0">Organization</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[280px]">
                      <p>The organization this user belongs to or works for. This determines what activities and data the user can access.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <OrganizationCombobox
                organizations={organizations?.map(org => ({
                  id: org.id,
                  name: org.name,
                  acronym: org.acronym,
                  type: org.type,
                  country: undefined,
                  iati_org_id: undefined
                })) || []}
                value={form.organizationId}
                onValueChange={handleOrganizationChange}
                placeholder="Agence Française de Développement (AFD)"
              />
            </div>

            <div>
              <Label htmlFor="organisation">Organization Name (if not in list)</Label>
              <Input
                id="organisation"
                value={form.organisation}
                onChange={(e) => handleFormChange("organisation", e.target.value)}
                placeholder="Enter organization name"
              />
            </div>

            {/* Reported by Organization Dropdown */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Label htmlFor="reportedByOrg" className="mb-0">Reported by Organization</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[280px]">
                      <p>The organization that registered this user in the system. This may differ from the user's employer if one organization creates accounts on behalf of another.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <OrganizationDropdownWithLogo
                organizations={organizations?.map(org => ({
                  id: org.id,
                  name: org.name,
                  acronym: org.acronym,
                  type: org.type,
                  country: org.country,
                  iati_org_id: org.iati_org_id,
                  logo: org.logo
                })) || []}
                value={form.reportedByOrgId}
                onValueChange={(value) => handleFormChange("reportedByOrgId", value)}
                placeholder="Select reporting organization..."
              />
            </div>
          </div>

          <Separator />

          {/* System Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">System Information</h3>
            
            {/* Created by field with lock */}
            <LockedField
              label="Created by"
              value={form.createdBy || ""}
              onChange={(value) => handleFormChange("createdBy", value)}
              isSuperUser={currentUser?.role === USER_ROLES.SUPER_USER}
              placeholder="User who created this record"
              lockTooltip="This field is locked and can only be edited by super users"
              unlockTooltip="Click to unlock and edit the created by field"
            />
          </div>

          <Separator />

          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Primary Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="secondaryEmail">Secondary Email</Label>
                <Input
                  id="secondaryEmail"
                  type="email"
                  value={form.secondaryEmail}
                  onChange={(e) => handleFormChange("secondaryEmail", e.target.value)}
                  placeholder="secondary@example.com"
                />
              </div>
            </div>
            
            <div>
              <PhoneFields
                countryCode={form.countryCode}
                phoneNumber={form.phoneNumber}
                onCountryCodeChange={(code) => handleFormChange("countryCode", code)}
                onPhoneNumberChange={(number) => handleFormChange("phoneNumber", number)}
                phoneLabel="Primary Phone"
                phonePlaceholder="Enter phone number"
              />
            </div>

            <div>
              <PhoneFields
                countryCode={form.secondaryCountryCode}
                phoneNumber={form.secondaryPhoneNumber}
                onCountryCodeChange={(code) => handleFormChange("secondaryCountryCode", code)}
                onPhoneNumberChange={(number) => handleFormChange("secondaryPhoneNumber", number)}
                phoneLabel="Secondary Phone"
                phonePlaceholder="Enter secondary phone number"
              />
            </div>

            <div>
              <PhoneFields
                countryCode={form.faxCountryCode}
                phoneNumber={form.faxNumber}
                onCountryCodeChange={(code) => handleFormChange("faxCountryCode", code)}
                onPhoneNumberChange={(number) => handleFormChange("faxNumber", number)}
                phoneLabel="Fax Number"
                phonePlaceholder="Enter fax number"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={form.website}
                onChange={(e) => handleFormChange("website", e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <Label htmlFor="mailingAddress">Mailing Address</Label>
              <AddressSearch
                value={form.addressComponents || { fullAddress: form.mailingAddress || "" }}
                onChange={handleAddressChange}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                placeholder="Additional notes about this user"
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Login Credentials */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Login Credentials</h3>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="generatePassword"
                checked={form.generatePassword}
                onCheckedChange={(checked) => {
                  handleFormChange("generatePassword", checked)
                  if (checked) {
                    handleGeneratePassword()
                  } else {
                    handleFormChange("password", "")
                  }
                }}
              />
              <Label htmlFor="generatePassword">Generate secure password automatically</Label>
            </div>

            {form.generatePassword ? (
              <div>
                <Label>Generated Password</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePassword}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => handleFormChange("password", e.target.value)}
                    placeholder="Enter password (min 8 characters)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="sendWelcomeEmail"
                checked={form.sendWelcomeEmail}
                onCheckedChange={(checked) => handleFormChange("sendWelcomeEmail", checked)}
              />
              <Label htmlFor="sendWelcomeEmail">Send welcome email with login instructions</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
