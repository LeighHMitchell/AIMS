"use client"

import { useState, useEffect } from "react"
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
import { Edit, AlertCircle, Loader2, Save, X, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"
import { LockedField } from "@/components/ui/locked-field"
import { OrganizationDropdownWithLogo, OrganizationWithLogo } from "@/components/ui/organization-dropdown-with-logo"
import { useUser } from "@/hooks/useUser"

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserUpdated: (user: User) => void
  user: User | null
  organizations?: Organization[]
}

interface EditUserForm {
  id: string
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
  countryCode?: string
  phoneNumber?: string
  faxCountryCode?: string
  faxNumber?: string
  website?: string
  mailingAddress?: string
  addressComponents?: AddressComponents
  notes?: string
  profilePicture?: string
  role: UserRole
  isActive: boolean
  createdBy?: string
}

// Helper function to parse phone number into country code and number
const parsePhoneNumber = (fullPhone: string): { countryCode: string; phoneNumber: string } => {
  if (!fullPhone) return { countryCode: "+95", phoneNumber: "" }
  
  // Common country codes
  const countryCodes = ["+95", "+61", "+1", "+44", "+33", "+49", "+81", "+86", "+91"]
  
  for (const code of countryCodes) {
    if (fullPhone.startsWith(code)) {
      return {
        countryCode: code,
        phoneNumber: fullPhone.substring(code.length).trim()
      }
    }
  }
  
  // Default to Myanmar if no match
  return { countryCode: "+95", phoneNumber: fullPhone }
}

// Helper function to build address components from user data
const buildAddressComponents = (user: User | null): AddressComponents => {
  if (!user) return {}
  
  return {
    fullAddress: user.mailingAddress || '',
    addressLine1: user.addressLine1 || '',
    addressLine2: user.addressLine2 || '',
    city: user.city || '',
    state: user.stateProvince || '',
    country: user.country || '',
    postalCode: user.postalCode || ''
  }
}

export function EditUserModal({ isOpen, onClose, onUserUpdated, user, organizations = [] }: EditUserModalProps) {
  const { user: currentUser, refreshUser } = useUser()
  const [form, setForm] = useState<EditUserForm | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form when user changes
  useEffect(() => {
    if (user && isOpen) {
      const primaryPhone = parsePhoneNumber(user.telephone || user.phone || "")

      const faxPhone = parsePhoneNumber(user.faxNumber || "")

      setForm({
        id: user.id,
        title: user.title || "none",
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        position: user.jobTitle || "",
        department: user.department || "",
        organizationId: user.organizationId,
        organisation: user.organisation || "",
        contactType: user.contactType || "none",
        email: user.email,

        countryCode: primaryPhone.countryCode,
        phoneNumber: primaryPhone.phoneNumber,

        faxCountryCode: faxPhone.countryCode,
        faxNumber: faxPhone.phoneNumber,
        website: user.website || "",
        mailingAddress: user.mailingAddress || "",
        addressComponents: buildAddressComponents(user),
        notes: user.notes || "",
        profilePicture: user.profilePicture || "",
        role: user.role as UserRole,
        isActive: user.isActive,
        createdBy: user.createdBy || currentUser?.name || ""
      })
    }
  }, [user, isOpen])

  const handleFormChange = (field: keyof EditUserForm, value: any) => {
    if (!form) return
    setForm(prev => ({ ...prev!, [field]: value }))
    setError(null)
  }

  const handleOrganizationChange = (orgId: string | undefined) => {
    const selectedOrg = organizations.find(org => org.id === orgId)
    setForm(prev => ({ 
      ...prev!, 
      organizationId: orgId,
      organisation: selectedOrg?.name || ""
    }))
  }

  const handleAddressChange = (address: AddressComponents) => {
    setForm(prev => ({ 
      ...prev!, 
      addressComponents: address,
      mailingAddress: address.fullAddress || ""
    }))
  }

  const validateForm = (): string | null => {
    if (!form) return "Form not initialized"
    if (!form.email.trim()) return "Email is required"
    if (!form.firstName.trim()) return "First name is required"
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) return "Please enter a valid email address"
    
    return null
  }

  const handleSubmit = async () => {
    if (!form) return
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Combine country code and phone number for telephone fields
      const primaryPhone = form.countryCode && form.phoneNumber 
        ? `${form.countryCode}${form.phoneNumber}`.replace(/\s+/g, '')
        : form.phoneNumber || ""
      

      
      const faxPhone = form.faxCountryCode && form.faxNumber 
        ? `${form.faxCountryCode}${form.faxNumber}`.replace(/\s+/g, '')
        : form.faxNumber || ""

      const userData = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        title: form.title === 'none' ? null : form.title,
        middle_name: form.middleName?.trim() || null,
        job_title: form.position?.trim() || null, // Position maps to job_title in database
        role: form.role,
        organization_id: form.organizationId || null,
        organisation: form.organisation?.trim() || null,
        department: form.department?.trim() || null,
        contact_type: form.contactType === 'none' ? null : form.contactType,
        telephone: primaryPhone.trim() || null,
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
        avatar_url: form.profilePicture || null,
        updated_at: new Date().toISOString(),
        created_by: form.createdBy?.trim() || null,
        reported_by_org_id: form.organizationId || null // Use same org for reporting
      }

      console.log('[EditUserModal] Updating user:', form.email)

      const response = await fetch(`/api/users/${form.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user')
      }

      console.log('[EditUserModal] User updated successfully:', result.email)

      // Transform the result to match our User interface
      const fullName = [result.first_name, result.middle_name, result.last_name]
        .filter(Boolean).join(' ').trim()
      
      const updatedUser: User = {
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
        lastLogin: result.last_login,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        createdBy: result.created_by || form.createdBy
      }

      toast.success(`User ${updatedUser.email} updated successfully!`)
      
      // If the updated user is the current user, refresh the user context
      if (currentUser?.id === updatedUser.id) {
        console.log('[EditUserModal] Refreshing current user context after self-update')
        await refreshUser()
      }
      
      // Notify parent component
      onUserUpdated(updatedUser)
      onClose()

    } catch (error) {
      console.error('[EditUserModal] Error updating user:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setForm(null)
    setError(null)
    onClose()
  }

  if (!form || !user) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit User: {user.name}
          </DialogTitle>
          <DialogDescription>
            Update user profile information and settings.
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
              userInitials={`${form?.firstName?.charAt(0) || ''}${form?.lastName?.charAt(0) || ''}`.toUpperCase() || "U"}
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
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
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

            <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(checked) => handleFormChange("isActive", checked)}
                />
                <Label htmlFor="isActive">Account Active</Label>
              </div>
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
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="primary">Primary Contact</SelectItem>
                  <SelectItem value="secondary">Secondary Contact</SelectItem>
                  <SelectItem value="technical">Technical Contact</SelectItem>
                  <SelectItem value="administrative">Administrative Contact</SelectItem>
                  <SelectItem value="financial">Financial Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="organization">Organization</Label>
              <OrganizationCombobox
                organizations={organizations?.map(org => ({
                  id: org.id,
                  name: org.name,
                  acronym: org.acronym,
                  type: org.type,
                  country: org.country,
                  iati_org_id: org.iati_org_id,
                  logo: org.logo
                })) || []}
                value={form.organizationId}
                onValueChange={handleOrganizationChange}
                placeholder="Select or search for an organization"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select the organization this user belongs to. This determines their access and reporting scope.
              </p>
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
                value={form?.addressComponents || { fullAddress: form?.mailingAddress || "" }}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Update User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
