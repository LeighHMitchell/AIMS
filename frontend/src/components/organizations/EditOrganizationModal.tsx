"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  AlertTriangle,
  Copy,
  HelpCircle,
  ImageIcon,
  Upload,
  X,
  Mail,
  Phone,
  Globe,
  MapPin,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  Youtube
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDropzone } from 'react-dropzone'
import Flag from 'react-world-flags'
import { getCountryCode } from '@/lib/country-utils'

// ISO 3166-1 alpha-2 country codes with names
const ISO_COUNTRIES = [
  { code: 'MM', name: 'Myanmar' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei Darussalam' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'EE', name: 'Estonia' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KR', name: 'Korea, Republic of' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russian Federation' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' }
]

const REGIONAL_OPTIONS = [
  { code: '998', name: 'Global or Regional', isRegion: true }
]

// Combine all options for validation
const ALL_COUNTRY_AND_REGION_CODES = [
  ...ISO_COUNTRIES.map(c => c.code),
  ...ISO_COUNTRIES.map(c => c.name),
  ...REGIONAL_OPTIONS.map(r => r.code),
  ...REGIONAL_OPTIONS.map(r => r.name),
  'Myanmar', 'Burma', 'Rwanda',
  'Global or Regional'
]

// Default organization types
const DEFAULT_ORGANIZATION_TYPES = [
  { code: '10', label: 'Government', description: 'National governments', is_active: true, sort_order: 1 },
  { code: '11', label: 'Local Government', description: 'Sub-national authorities', is_active: true, sort_order: 2 },
  { code: '15', label: 'Other Public Sector', description: 'Government-linked bodies', is_active: true, sort_order: 3 },
  { code: '21', label: 'International NGO', description: 'NGOs operating internationally', is_active: true, sort_order: 4 },
  { code: '22', label: 'National NGO', description: 'NGOs within one country', is_active: true, sort_order: 5 },
  { code: '23', label: 'Partner Country based NGO', description: 'Local CSOs', is_active: true, sort_order: 6 },
  { code: '30', label: 'Regional Organisation', description: 'Regional bodies', is_active: true, sort_order: 7 },
  { code: '31', label: 'Public Private Partnership', description: 'Hybrid organisations', is_active: true, sort_order: 8 },
  { code: '40', label: 'Multilateral', description: 'UN agencies, MDBs', is_active: true, sort_order: 9 },
  { code: '60', label: 'Foundation', description: 'Philanthropic organisations', is_active: true, sort_order: 10 },
  { code: '71', label: 'Private Sector in Provider Country', description: 'Private companies', is_active: true, sort_order: 11 },
  { code: '72', label: 'Private Sector in Aid Recipient Country', description: 'Local companies', is_active: true, sort_order: 12 },
  { code: '73', label: 'Private Sector in Third Country', description: 'Third country companies', is_active: true, sort_order: 13 },
  { code: '80', label: 'Academic, Training and Research', description: 'Universities, research institutes', is_active: true, sort_order: 14 },
  { code: '90', label: 'Other', description: 'Other organisations', is_active: true, sort_order: 15 }
]

// Myanmar-specific cooperation modality calculation
const deriveCooperationModality = (orgTypeCode: string, country: string): string => {
  const typeCode = orgTypeCode?.trim();
  const countryValue = country?.trim().toLowerCase();
  
  const isRegional = REGIONAL_OPTIONS.some(r => 
    r.name.toLowerCase() === countryValue || 
    r.code === country
  )

  if (isRegional || countryValue === 'global or regional' || countryValue?.includes('global') || countryValue?.includes('regional')) {
    return 'Global or Regional';
  } else if (typeCode === '10' && countryValue !== 'myanmar') {
    return 'External';
  } else if (['22', '40'].includes(typeCode)) {
    return 'Global or Regional';
  } else if (typeCode === '15' && countryValue === 'myanmar') {
    return 'Internal';
  } else if (typeCode === '23') {
    return 'External';
  } else if (countryValue === 'myanmar') {
    return 'Internal';
  } else {
    return 'Other';
  }
}

// Get Partner Classification
const getPartnerClassification = (orgTypeCode: string, location: string): string => {
  const isMyanmar = location?.toLowerCase() === "myanmar";
  const typeCode = parseInt(orgTypeCode) || 0;

  if (typeCode === 10 && !isMyanmar) return "External Government";
  if ((typeCode === 10 || typeCode === 11) && isMyanmar) return "Partner Government";
  if (typeCode === 40) return "Multilateral";
  if ([30, 60, 70, 71, 72, 73].includes(typeCode)) return "Private Sector";
  if (typeCode === 21 && !isMyanmar) return "International NGO";
  if ([22, 23, 24].includes(typeCode) || (typeCode === 21 && isMyanmar)) return "Local/Partner Country NGO";
  if (typeCode === 15) return "Other Public Sector";

  return "Unclassified";
}

// Validation helper
const validateOrganizationForm = (data: any) => {
  const errors: string[] = []
  
  if (!data.name?.trim()) {
    errors.push('Name is required')
  }
  
  if (!data.acronym?.trim()) {
    errors.push('Acronym / Short Name is required')
  }
  
  if (!data.Organisation_Type_Code?.trim()) {
    errors.push('Organisation Type is required')
  }
  
  if (!data.country_represented?.trim()) {
    errors.push('Location Represented is required')
  }
  
  if (data.country_represented?.trim()) {
    const country = data.country_represented.trim()
    if (!ALL_COUNTRY_AND_REGION_CODES.includes(country)) {
      errors.push(`Invalid country or region: ${country}`)
    }
  }
  
  return errors
}

interface OrganizationType {
  code: string
  label: string
  description: string
  is_active: boolean
  sort_order: number
}

interface Organization {
  id?: string
  name: string
  acronym?: string
  Organisation_Type_Code?: string
  organisation_type?: string
  description?: string
  website?: string
  email?: string
  phone?: string
  address?: string
  logo?: string
  banner?: string
  country?: string
  country_represented?: string
  cooperation_modality?: string
  iati_org_id?: string
  [key: string]: any
}

interface EditOrganizationModalProps {
  organization: Organization | null
  isOpen?: boolean
  open?: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  onSave?: (data: Partial<Organization>) => Promise<void>
  onSuccess?: () => void
  onDelete?: (org: Organization) => void
}

// Drag and Drop Image Upload Component
const ImageUpload: React.FC<{
  value: string
  onChange: (value: string) => void
  label: string
  recommendedSize: string
  isLogo?: boolean
}> = ({ value, onChange, label, recommendedSize, isLogo = false }) => {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    setUploading(true)

    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setPreview(base64String)
        onChange(base64String)
        toast.success(`${label} uploaded successfully`)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error(`Failed to upload ${label.toLowerCase()}`)
    } finally {
      setUploading(false)
    }
  }, [onChange, label])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    disabled: uploading
  })

  const removeImage = () => {
    setPreview(null)
    onChange('')
  }

  useEffect(() => {
    setPreview(value || null)
  }, [value])

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      
      {preview ? (
        <div className="relative">
          <div className={`rounded-lg overflow-hidden border-2 border-dashed border-gray-300 ${isLogo ? 'w-32 h-32' : 'w-full h-40'}`}>
            <img 
              src={preview} 
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={removeImage}
            className="absolute top-2 right-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            ${isLogo ? 'h-32' : 'h-40'}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Upload className="h-8 w-8 text-gray-400 animate-pulse" />
              <p className="text-sm text-gray-600 mt-2">Uploading...</p>
            </div>
          ) : isDragActive ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Upload className="h-8 w-8 text-primary" />
              <p className="text-sm text-primary mt-2">Drop image here</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <ImageIcon className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600 mt-2">Drag & drop or click to upload</p>
            </div>
          )}
        </div>
      )}
      
      <p className="text-xs text-gray-500 text-center">
        Recommended size: {recommendedSize}
      </p>
    </div>
  )
}

export function EditOrganizationModal({
  organization,
  isOpen,
  open,
  onClose,
  onOpenChange,
  onSave,
  onSuccess,
  onDelete
}: EditOrganizationModalProps) {
  const [formData, setFormData] = useState<Partial<Organization>>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [organizationTypes, setOrganizationTypes] = useState<OrganizationType[]>(DEFAULT_ORGANIZATION_TYPES)
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // Handle both isOpen and open props
  const modalOpen = isOpen ?? open ?? false
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) onOpenChange(newOpen)
    if (onClose && !newOpen) onClose()
  }

  // Fetch organization types from API
  const fetchOrganizationTypes = async () => {
    setLoadingTypes(true)
    try {
      const response = await fetch('/api/organization-types')
      if (response.ok) {
        const types = await response.json()
        setOrganizationTypes(types)
      } else {
        setOrganizationTypes(DEFAULT_ORGANIZATION_TYPES)
      }
    } catch (error) {
      console.error('[Modal] Error fetching organization types:', error)
      setOrganizationTypes(DEFAULT_ORGANIZATION_TYPES)
    } finally {
      setLoadingTypes(false)
    }
  }

  // Fetch organization types when modal opens
  useEffect(() => {
    if (modalOpen) {
      fetchOrganizationTypes()
    }
  }, [modalOpen])

  // Reset form when organization changes
  useEffect(() => {
    if (organization) {
      setFormData({
        iati_org_id: organization.iati_org_id || '',
        id: organization.id,
        name: organization.name || '',
        acronym: organization.acronym || '',
        country_represented: organization.country_represented || organization.country || '',
        Organisation_Type_Code: organization.Organisation_Type_Code || organization.organisation_type || '',
        cooperation_modality: organization.cooperation_modality || '',
        description: organization.description || '',
        logo: organization.logo || '',
        banner: organization.banner || '',
        website: organization.website || '',
        email: organization.email || '',
        phone: organization.phone || '',
        address: organization.address || '',
        // Social media fields
        social_twitter: organization.social_twitter || '',
        social_facebook: organization.social_facebook || '',
        social_linkedin: organization.social_linkedin || '',
        social_instagram: organization.social_instagram || '',
        social_youtube: organization.social_youtube || ''
      })
      setValidationErrors([])
    } else {
      setFormData({
        iati_org_id: '',
        name: '',
        acronym: '',
        country_represented: '',
        Organisation_Type_Code: '',
        cooperation_modality: '',
        description: '',
        logo: '',
        banner: '',
        website: '',
        email: '',
        phone: '',
        address: '',
        // Social media fields
        social_twitter: '',
        social_facebook: '',
        social_linkedin: '',
        social_instagram: '',
        social_youtube: ''
      })
      setValidationErrors([])
    }
  }, [organization])

  // Clear form when modal closes, reset tab when it opens
  useEffect(() => {
    if (!modalOpen) {
      setValidationErrors([])
      setSaving(false)
    } else {
      setActiveTab('basic') // Reset to Basic Info tab when opening
    }
  }, [modalOpen])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  const handleSave = async () => {
    const derivedModality = deriveCooperationModality(
      formData.Organisation_Type_Code || '', 
      formData.country_represented || ''
    )
    
    const dataToSave = {
      ...formData,
      id: organization?.id,
      cooperation_modality: derivedModality
    }
    
    const errors = validateOrganizationForm(dataToSave)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    
    setSaving(true)
    setValidationErrors([])
    
    try {
      if (onSave) {
        await onSave(dataToSave)
      } else if (organization?.id) {
        const response = await fetch(`/api/organizations/${organization.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSave),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update organization')
        }

        if (onSuccess) {
          onSuccess()
        }
      }
      
      handleOpenChange(false)
      toast.success('Organization updated successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update organization'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (organization && onDelete) {
      onDelete(organization)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  // Auto-calculate cooperation modality
  useEffect(() => {
    if (formData.Organisation_Type_Code && formData.country_represented) {
      const calculatedModality = deriveCooperationModality(
        formData.Organisation_Type_Code,
        formData.country_represented
      )
      if (calculatedModality !== formData.cooperation_modality) {
        setFormData(prev => ({ ...prev, cooperation_modality: calculatedModality }))
      }
    }
  }, [formData.Organisation_Type_Code, formData.country_represented])

  const isCreating = !organization

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            {isCreating ? 'Add New Organization' : 'Edit Organization Profile'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isCreating ? 'Create a new organization profile' : 'Update organization information and details'}
          </p>
        </DialogHeader>
        
        {/* Validation Error Banner */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 mb-1">Please fix the validation errors</p>
              <ul className="text-sm text-red-700 space-y-0.5">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="contact">Contact & Social</TabsTrigger>
            <TabsTrigger value="classification">Classification</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="h-full overflow-y-auto px-2 mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name (Required) */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Danish International Development Agency"
                  className={validationErrors.some(e => e.includes('Name')) ? 'border-red-500' : ''}
                />
              </div>

              {/* Acronym / Short Name (Required) */}
              <div className="space-y-2">
                <Label htmlFor="acronym" className="text-sm font-medium">
                  Acronym / Short Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="acronym"
                  value={formData.acronym || ''}
                  onChange={(e) => handleInputChange('acronym', e.target.value)}
                  placeholder="DANIDA"
                  className={validationErrors.some(e => e.includes('Acronym')) ? 'border-red-500' : ''}
                />
              </div>

              {/* Location Represented */}
              <div className="space-y-2">
                <Label htmlFor="country_represented" className="text-sm font-medium">
                  Location Represented <span className="text-red-500">*</span>
                </Label>
                <Select 
                  key={`country-${organization?.id || 'new'}`}
                  value={formData.country_represented || ''} 
                  onValueChange={(value) => handleInputChange('country_represented', value)}
                >
                  <SelectTrigger className={validationErrors.some(e => e.includes('Location Represented')) ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select country or region">
                      {formData.country_represented && (
                        <span className="flex items-center gap-2">
                          {ISO_COUNTRIES.some(c => c.name === formData.country_represented) && getCountryCode(formData.country_represented) && (
                            <Flag 
                              code={getCountryCode(formData.country_represented)!} 
                              height="12" 
                              width="18"
                              className="rounded-sm"
                            />
                          )}
                          {formData.country_represented}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {/* Regional/Global Options */}
                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-600">
                      Region / Global
                    </div>
                    {REGIONAL_OPTIONS.map((region) => (
                      <SelectItem key={region.code} value={region.name}>
                        {region.name}
                      </SelectItem>
                    ))}
                    
                    <div className="my-1 border-t" />
                    
                    {/* Country Options */}
                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-600">
                      Countries
                    </div>
                    {ISO_COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        <div className="flex items-center gap-2">
                          {getCountryCode(country.name) && (
                            <Flag 
                              code={getCountryCode(country.name)!} 
                              height="12" 
                              width="18"
                              className="rounded-sm"
                            />
                          )}
                          <span>{country.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a specific country or choose a regional/global option for global or regional organizations
                </p>
              </div>

              {/* Organisation Type (Required) */}
              <div className="space-y-2">
                <Label htmlFor="Organisation_Type_Code" className="text-sm font-medium">
                  Organisation Type <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.Organisation_Type_Code || ''} 
                  onValueChange={(value) => handleInputChange('Organisation_Type_Code', value)}
                  disabled={loadingTypes}
                >
                  <SelectTrigger 
                    className={`${validationErrors.some(e => e.includes('Organisation Type')) ? 'border-red-500' : ''} [&>span]:line-clamp-none [&>span]:whitespace-nowrap`}
                  >
                    <SelectValue placeholder={loadingTypes ? "Loading types..." : "Select organisation type"}>
                      {formData.Organisation_Type_Code && (
                        <span>
                          {formData.Organisation_Type_Code} - {organizationTypes.find(t => t.code === formData.Organisation_Type_Code)?.label || 'Unknown'}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {organizationTypes
                      .filter(type => type.is_active)
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((type) => (
                        <SelectItem 
                          key={type.code} 
                          value={type.code}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{type.code}</span>
                            <span className="font-medium text-foreground">{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Partner Origin (Auto-calculated) */}
              <div className="space-y-2">
                <Label htmlFor="partner_origin" className="flex items-center gap-2 text-sm font-medium">
                  Partner Origin
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Indicates whether the organisation is internal (Myanmar-based), external (foreign), or global/regional.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="text-sm font-normal text-gray-800">
                    {formData.cooperation_modality || 'Awaiting calculation...'}
                  </div>
                </div>
              </div>

              {/* Partner Classification (Auto-calculated) */}
              <div className="space-y-2">
                <Label htmlFor="partner_classification" className="flex items-center gap-2 text-sm font-medium">
                  Partner Classification
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>A detailed, descriptive label combining organisation type and country.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="text-sm font-normal text-gray-700">
                    {formData.Organisation_Type_Code && formData.country_represented 
                      ? getPartnerClassification(formData.Organisation_Type_Code, formData.country_represented)
                      : 'Awaiting calculation...'}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the organization"
                rows={6}
                className="resize-none"
              />
            </div>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="h-full overflow-y-auto px-2 mt-4 space-y-6">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">Upload logos and banner images for your organization profile</p>
              
              {/* Logo and Banner */}
              <div className="flex gap-4 items-start">
                {/* Partner Logo - Smaller fixed width */}
                <div className="w-48 flex-shrink-0">
                  <ImageUpload
                    value={formData.logo || ''}
                    onChange={(value) => handleInputChange('logo', value)}
                    label="Logo"
                    recommendedSize="512×512px"
                    isLogo={true}
                  />
                </div>
                
                {/* Banner Image - Larger flexible width */}
                <div className="flex-grow">
                  <ImageUpload
                    value={formData.banner || ''}
                    onChange={(value) => handleInputChange('banner', value)}
                    label="Banner"
                    recommendedSize="1200×300px"
                    isLogo={false}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Contact & Social Media Tab */}
          <TabsContent value="contact" className="h-full overflow-y-auto px-2 mt-4 space-y-6">
            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="contact@organization.org"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://www.organization.org"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    Mailing Address
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Full mailing address"
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Social Media Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Social Media</h3>
              <p className="text-sm text-muted-foreground">Add social media profiles for your organization</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="social_twitter" className="text-sm font-medium flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-gray-500" />
                    Twitter / X
                  </Label>
                  <Input
                    id="social_twitter"
                    value={formData.social_twitter || ''}
                    onChange={(e) => handleInputChange('social_twitter', e.target.value)}
                    placeholder="https://twitter.com/yourorg or @yourorg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="social_facebook" className="text-sm font-medium flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-gray-500" />
                    Facebook
                  </Label>
                  <Input
                    id="social_facebook"
                    value={formData.social_facebook || ''}
                    onChange={(e) => handleInputChange('social_facebook', e.target.value)}
                    placeholder="https://facebook.com/yourorg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="social_linkedin" className="text-sm font-medium flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-gray-500" />
                    LinkedIn
                  </Label>
                  <Input
                    id="social_linkedin"
                    value={formData.social_linkedin || ''}
                    onChange={(e) => handleInputChange('social_linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/yourorg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="social_instagram" className="text-sm font-medium flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-gray-500" />
                    Instagram
                  </Label>
                  <Input
                    id="social_instagram"
                    value={formData.social_instagram || ''}
                    onChange={(e) => handleInputChange('social_instagram', e.target.value)}
                    placeholder="https://instagram.com/yourorg or @yourorg"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="social_youtube" className="text-sm font-medium flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-gray-500" />
                    YouTube
                  </Label>
                  <Input
                    id="social_youtube"
                    value={formData.social_youtube || ''}
                    onChange={(e) => handleInputChange('social_youtube', e.target.value)}
                    placeholder="https://youtube.com/@yourorg"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Classification Tab */}
          <TabsContent value="classification" className="h-full overflow-y-auto px-2 mt-4 space-y-4">
            <p className="text-sm text-muted-foreground mb-4">IATI identifiers and auto-calculated classification fields</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* IATI Organisation Identifier */}
              <div className="space-y-2">
                <Label htmlFor="iati_org_id_class" className="text-sm font-medium">IATI Organisation Identifier</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="iati_org_id_class"
                      value={formData.iati_org_id || ''}
                      onChange={(e) => handleInputChange('iati_org_id', e.target.value)}
                      placeholder="DK-CVR-20228799"
                      className="pr-10"
                    />
                    {formData.iati_org_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(formData.iati_org_id || '')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        title="Copy IATI ID"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Organization UUID (Read-only) */}
              {organization?.id && (
                <div className="space-y-2">
                  <Label htmlFor="uuid_class" className="text-sm font-medium">Organization UUID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="uuid_class"
                      value={formData.id || ''}
                      readOnly
                      className="bg-gray-50 text-gray-600"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(formData.id || '')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">This unique identifier is used internally by the system</p>
                </div>
              )}

              {/* Partner Origin (Auto-calculated) */}
              <div className="space-y-2">
                <Label htmlFor="partner_origin_class" className="flex items-center gap-2 text-sm font-medium">
                  Partner Origin (Auto-calculated)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Automatically calculated based on organization type and location. Indicates whether the organisation is internal (Myanmar-based), external (foreign), or global/regional.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="text-sm font-semibold text-gray-800">
                    {formData.cooperation_modality || 'Select type and country to calculate'}
                  </div>
                </div>
              </div>

              {/* Partner Classification (Auto-calculated) */}
              <div className="space-y-2">
                <Label htmlFor="partner_classification_class" className="flex items-center gap-2 text-sm font-medium">
                  Partner Classification (Auto-calculated)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-gray-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Automatically calculated. A detailed, descriptive label combining organisation type and country for reporting purposes.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="text-sm font-semibold text-gray-700">
                    {formData.Organisation_Type_Code && formData.country_represented 
                      ? getPartnerClassification(formData.Organisation_Type_Code, formData.country_represented)
                      : 'Select type and country to calculate'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Partner Origin and Classification are automatically calculated based on the organization type and location you selected in the Basic Info tab. These fields help with reporting and filtering.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer with Delete option */}
        <DialogFooter className="flex-shrink-0 gap-2">
          {!isCreating && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="mr-auto"
            >
              Delete Organization
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : (isCreating ? 'Create Organization' : 'Save Changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
