"use client"

import { useState, useEffect } from "react"
import { User, ROLE_LABELS } from "@/types/user"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { AvatarUploader } from "@/components/AvatarUploader"
import { useUser } from "@/hooks/useUser"
import { Save, User as UserIcon, Globe, Loader2, AlertCircle, Building, Briefcase, Phone, Mail, MapPin, Lock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog"

// ISO 639-1 language codes - could be moved to a separate file
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
]

// Organization interface
interface Organization {
  id: string
  name: string
  acronym?: string
  iati_org_id?: string
}

// Simple validation helpers
const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim().length === 0) return `${fieldName} is required`
  return null
}

const validateName = (name: string): string | null => {
  if (!name || name.length < 2) return "Name must be at least 2 characters"
  if (name.length > 100) return "Name is too long"
  return null
}

const validatePhone = (phone: string): string | null => {
  if (!phone) return "Telephone is required"
  // Allow more flexible phone formats including letters for extensions
  if (phone.length < 3) return "Phone number is too short"
  return null
}

const validateEmail = (email: string): string | null => {
  if (!email) return "Email is required"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format"
  return null
}



const validateLanguage = (lang: string): string | null => {
  if (!lang || lang.length !== 2) return "Language code must be 2 characters"
  return null
}

const validateReportingOrgId = (id: string): string | null => {
  if (id && !/^[A-Z]{2}-[A-Z0-9\-]+$/i.test(id)) return "Invalid IATI organization ID format (e.g., XM-DAC-41114)"
  return null
}

// Extended user profile interface
interface UserProfile extends User {
  profilePicture?: string
  preferredLanguage?: string
  reportingOrgId?: string
}

interface UserSettingsFormProps {
  user: User
}

export function UserSettingsForm({ user }: UserSettingsFormProps) {
  const { setUser } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  
  // Split user.name into first and last name if not available
  const nameParts = user.name?.split(' ') || []
  const defaultFirstName = user.firstName || nameParts[0] || ''
  const defaultLastName = user.lastName || nameParts.slice(1).join(' ') || ''
  
  const [formData, setFormData] = useState<UserProfile>({
    ...user,
    firstName: defaultFirstName,
    lastName: defaultLastName,
    organisation: user.organisation || '',
    department: user.department || '',
    jobTitle: user.jobTitle || user.title || '',
    telephone: user.telephone || user.phone || '',
    mailingAddress: user.mailingAddress || '',
    preferredLanguage: "en",
    reportingOrgId: "",
  })
  
  const [changeEmail, setChangeEmail] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [profilePictureChanged, setProfilePictureChanged] = useState(false)

  // Load existing profile data from Supabase
  useEffect(() => {
    const loadProfile = async () => {
      if (!user.email) {
        setIsLoadingProfile(false)
        return
      }

      try {
        // Get user data from Supabase API
        const response = await fetch(`/api/users?email=${encodeURIComponent(user.email)}`)
        
        if (response.ok) {
          const userData = await response.json()
          
          // Use data from response
          setFormData(prev => ({
            ...prev,
            firstName: userData.first_name || user.firstName || prev.firstName,
            lastName: userData.last_name || user.lastName || prev.lastName,
            organisation: userData.organisation || user.organisation || prev.organisation,
            department: userData.department || user.department || prev.department,
            jobTitle: userData.job_title || user.jobTitle || prev.jobTitle,
            telephone: userData.telephone || user.telephone || prev.telephone,
            mailingAddress: userData.mailing_address || user.mailingAddress || prev.mailingAddress,
            profilePicture: userData.avatar_url || userData.profilePicture || prev.profilePicture,
            preferredLanguage: userData.preferred_language || 'en',
            reportingOrgId: userData.reporting_org_id || '',
          }))
          
          // Set selected org ID for super users
          if (userData.organization_id) {
            setSelectedOrgId(userData.organization_id)
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        // Don't show error - use local user data
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadProfile()
  }, [user.email])

  // Fetch organizations for super users
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!supabase || formData.role !== 'super_user') return

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, acronym, iati_org_id')
          .order('name')

        if (error) {
          console.error('Error fetching organizations:', error)
          toast.error('Failed to load organizations')
          return
        }

        setOrganizations(data || [])
        
        // Set the selected org ID if user has an organization
        if (user.organizationId) {
          setSelectedOrgId(user.organizationId)
        }
      } catch (error) {
        console.error('Error fetching organizations:', error)
      }
    }

    fetchOrganizations()
  }, [formData.role, user.organizationId])

  // Validate a single field
  const validateField = (field: string, value: any) => {
    let error: string | null = null

    switch (field) {
      case 'firstName':
        error = validateRequired(value, 'First name')
        break
      case 'lastName':
        error = validateRequired(value, 'Last name')
        break
      case 'email':
        error = validateEmail(value)
        break
      case 'telephone':
        error = validatePhone(value)
        break

      case 'preferredLanguage':
        error = validateLanguage(value)
        break
      case 'reportingOrgId':
        error = validateReportingOrgId(value)
        break
    }

    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Debounced validation
    setTimeout(() => validateField(field, value), 300)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Form submitted with data:', formData)
    
    // Validate all required fields
    const validationErrors: Record<string, string> = {}
    
    const firstNameError = validateRequired(formData.firstName || '', 'First name')
    if (firstNameError) validationErrors.firstName = firstNameError
    
    const lastNameError = validateRequired(formData.lastName || '', 'Last name')
    if (lastNameError) validationErrors.lastName = lastNameError
    
    const telephoneError = validatePhone(formData.telephone || '')
    if (telephoneError) validationErrors.telephone = telephoneError

    // Validate email only if changing it
    if (formData.role === 'super_user' && changeEmail) {
      const emailError = validateEmail(formData.email || '')
      if (emailError) validationErrors.email = emailError
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error('Please fix the validation errors')
      return
    }

    setIsLoading(true)

    try {
      // Prepare update data for Supabase
      const userUpdate: any = {
        id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        telephone: formData.telephone,
        department: formData.department,
        job_title: formData.jobTitle,
        organisation: formData.organisation,
        mailing_address: formData.mailingAddress,
      }
      
      // Only include profile picture if it has changed (to avoid large payloads)
      if (profilePictureChanged) {
        userUpdate.avatar_url = formData.profilePicture
      }

      // Include email update only if checkbox is checked
      if (formData.role === 'super_user' && changeEmail && formData.email !== user.email) {
        userUpdate.email = formData.email
      }

      // Include organization_id update for super users
      if (formData.role === 'super_user' && selectedOrgId) {
        userUpdate.organization_id = selectedOrgId
      }

      // Update user via Supabase API
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userUpdate),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      // Fetch updated user data from Supabase to get the latest profile info
      const userResponse = await fetch(`/api/users?email=${encodeURIComponent(user.email)}`)
      const updatedUserData = await userResponse.json()

      // If organization was changed, fetch the new organization data
      let organizationData = user.organization
      if (formData.role === 'super_user' && selectedOrgId && selectedOrgId !== user.organizationId) {
        const selectedOrg = organizations.find(o => o.id === selectedOrgId)
        if (selectedOrg) {
          organizationData = {
            id: selectedOrg.id,
            name: selectedOrg.name,
            type: 'development_partner', // Default type, should be fetched from org data
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      }

      // Update local user state with fresh data from server
      const updatedUser = {
        ...user,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        firstName: updatedUserData.first_name || formData.firstName,
        lastName: updatedUserData.last_name || formData.lastName,
        email: (formData.role === 'super_user' && changeEmail) ? formData.email : user.email,
        organisation: updatedUserData.organisation || formData.organisation,
        organizationId: updatedUserData.organization_id || (formData.role === 'super_user' && selectedOrgId ? selectedOrgId : user.organizationId), // Include organization ID
        organization: organizationData, // Include full organization object
        department: updatedUserData.department || formData.department,
        jobTitle: updatedUserData.job_title || formData.jobTitle,
        telephone: updatedUserData.telephone || formData.telephone,
        mailingAddress: updatedUserData.mailing_address || formData.mailingAddress,
        title: updatedUserData.job_title || formData.jobTitle, // For backward compatibility
        phone: updatedUserData.telephone || formData.telephone, // For backward compatibility
        profilePicture: updatedUserData.avatar_url || formData.profilePicture, // Ensure profile picture is included
        updatedAt: updatedUserData.updated_at || new Date().toISOString(),
      }
      
      setUser(updatedUser)
      
      // Update localStorage with new user data
      localStorage.setItem('aims_user', JSON.stringify(updatedUser))
      
      toast.success("Settings saved successfully!")
      
      if (formData.role === 'super_user' && changeEmail && formData.email !== user.email) {
        toast.info('Email has been updated successfully.')
      }
      
      // Force a small delay then refresh to ensure avatar updates everywhere
      if (profilePictureChanged) {
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
      
    } catch (error: any) {
      console.error("Error saving settings:", error)
      toast.error(error.message || "Failed to save settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = (url: string) => {
    setFormData({ ...formData, profilePicture: url })
    setProfilePictureChanged(true)
  }

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Show warning if Supabase is not configured */}
      {!supabase && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Supabase is not configured. Settings will be saved locally only.
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Profile Picture
          </CardTitle>
          <CardDescription>
            Upload a profile picture for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader
            currentAvatar={formData.profilePicture}
            userName={`${formData.firstName} ${formData.lastName}`.trim() || 'User'}
            userId={user.id}
            onUpload={handleAvatarUpload}
          />
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Your personal details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="John"
                required
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Doe"
                required
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              {formData.role === 'super_user' ? (
                <>
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id="changeEmail"
                      checked={changeEmail}
                      onCheckedChange={(checked) => setChangeEmail(checked as boolean)}
                    />
                    <label
                      htmlFor="changeEmail"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Change email address
                    </label>
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => changeEmail ? handleInputChange('email', e.target.value) : undefined}
                    disabled={!changeEmail}
                    className={!changeEmail ? "bg-gray-50" : errors.email ? "border-red-500" : ""}
                    required={changeEmail}
                  />
                  {changeEmail ? (
                    <>
                      <p className="text-xs text-muted-foreground">Email change will require confirmation via email</p>
                      {errors.email && (
                        <p className="text-sm text-red-500">{errors.email}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Check the box above to change your email</p>
                  )}
                </>
              ) : (
                <>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground">Contact your administrator to change your email</p>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telephone *
              </Label>
              <Input
                id="telephone"
                type="tel"
                value={formData.telephone}
                onChange={(e) => handleInputChange('telephone', e.target.value)}
                placeholder="+1 234 567 8900"
                required
                className={errors.telephone ? "border-red-500" : ""}
              />
              {errors.telephone && (
                <p className="text-sm text-red-500">{errors.telephone}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mailingAddress" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Mailing Address
              </Label>
              <Textarea
                id="mailingAddress"
                value={formData.mailingAddress}
                onChange={(e) => handleInputChange('mailingAddress', e.target.value)}
                placeholder="Enter your mailing address"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Professional Information
          </CardTitle>
          <CardDescription>
            Your organization and role details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organisation" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Organisation {formData.role === 'super_user' && '*'}
              </Label>
              {formData.role === 'super_user' ? (
                <>
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
                    <SelectTrigger id="organisation">
                      <SelectValue placeholder="Select organisation" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          <div className="flex flex-col">
                            <div>
                              {org.name} {org.acronym && `(${org.acronym})`}
                            </div>
                            {org.iati_org_id && (
                              <div className="text-xs text-muted-foreground">
                                IATI: {org.iati_org_id}
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">As a Super User, you can change your organisation</p>
                </>
              ) : (
                <>
                  <Input
                    id="organisation"
                    value={formData.organisation}
                    disabled
                    className="bg-gray-50"
                  />
                  {formData.organisation && (
                    <p className="text-xs text-muted-foreground">Contact your administrator to change your organisation</p>
                  )}
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="e.g., Finance Department"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                placeholder="e.g., Program Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={ROLE_LABELS[formData.role as keyof typeof ROLE_LABELS] || formData.role}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">
                Contact your administrator to change your role
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IATI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            IATI Settings
          </CardTitle>
          <CardDescription>
            Configure your IATI (International Aid Transparency Initiative) preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Preferred Language (ISO 639-1) *</Label>
              <Select
                value={formData.preferredLanguage}
                onValueChange={(value) => {
                  setFormData({ ...formData, preferredLanguage: value })
                  validateField('preferredLanguage', value)
                }}
              >
                <SelectTrigger id="language" className={errors.preferredLanguage ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.preferredLanguage && (
                <p className="text-sm text-red-500">{errors.preferredLanguage}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportingOrgId">Reporting Organisation ID</Label>
              <Input
                id="reportingOrgId"
                value={formData.reportingOrgId || ""}
                onChange={(e) => handleInputChange('reportingOrgId', e.target.value)}
                placeholder="e.g., XM-DAC-41114"
                className={errors.reportingOrgId ? "border-red-500" : ""}
              />
              {errors.reportingOrgId && (
                <p className="text-sm text-red-500">{errors.reportingOrgId}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Your IATI organization identifier. Contact your administrator if you're unsure.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage your account security and authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Password</Label>
              <p className="text-sm text-muted-foreground">
                Last changed: Never (using Django default)
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPasswordDialog(true)}
            >
              <Lock className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || Object.keys(errors).length > 0}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Password Change Dialog */}
      <PasswordChangeDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
      />
    </form>
  )
} 