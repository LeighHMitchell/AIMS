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
import { Separator } from "@/components/ui/separator"
import { useDropzone } from 'react-dropzone'
import Flag from 'react-world-flags'
import { getCountryCode } from '@/lib/country-utils'
import { IATIBudgetManager } from './IATIBudgetManager'
import { IATIDocumentManager } from './IATIDocumentManager'
import IATIImportPreferences from './IATIImportPreferences'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'

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
  reporting_org_ref?: string
  reporting_org_type?: string
  reporting_org_name?: string
  reporting_org_secondary_reporter?: boolean
  last_updated_datetime?: string
  default_currency?: string
  default_language?: string
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
  const [iatiBudgets, setIatiBudgets] = useState<any[]>([])
  const [iatiDocuments, setIatiDocuments] = useState<any[]>([])
  const [showIatiImport, setShowIatiImport] = useState(false)

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
    <>
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {isCreating ? 'Add New Organization' : 'Edit Organization Profile'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {isCreating ? 'Create a new organization profile' : 'Update organization information and details'}
              </p>
            </div>
            {isCreating && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIatiImport(true)}
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Import from IATI
              </Button>
            )}
          </div>
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
          <TabsList className="grid w-full grid-cols-6 flex-shrink-0">
            <TabsTrigger value="basic">General</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="contact">Contact & Social</TabsTrigger>
            <TabsTrigger value="budgets">IATI Budgets</TabsTrigger>
            <TabsTrigger value="documents">IATI Documents</TabsTrigger>
            <TabsTrigger value="iati-prefs">IATI Import Preferences</TabsTrigger>
          </TabsList>

          {/* General Tab */}
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
                        <div className="flex items-center gap-2">
                          {ISO_COUNTRIES.find(c => c.name === formData.country_represented) && (
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {ISO_COUNTRIES.find(c => c.name === formData.country_represented)?.code}
                        </span>
                          )}
                          <span>{formData.country_represented}</span>
                        </div>
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
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {country.code}
                          </span>
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {formData.Organisation_Type_Code}
                        </span>
                          <span className="font-medium text-foreground">
                            {organizationTypes.find(t => t.code === formData.Organisation_Type_Code)?.label || 'Unknown'}
                          </span>
                        </div>
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

            <Separator />
            
            {/* IATI Classification Fields */}
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

              {/* Default Currency */}
              <div className="space-y-2">
                <Label htmlFor="default_currency" className="text-sm font-medium">
                  Default Currency
                </Label>
                <Select
                  value={formData.default_currency || 'USD'}
                  onValueChange={(value) => handleInputChange('default_currency', value)}
                >
                  <SelectTrigger className="[&>span]:line-clamp-none [&>span]:whitespace-nowrap">
                    <SelectValue placeholder="Select currency">
                      {formData.default_currency && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {formData.default_currency}
                          </span>
                          <span>
                            {formData.default_currency === 'USD' && 'US Dollar'}
                            {formData.default_currency === 'EUR' && 'Euro'}
                            {formData.default_currency === 'GBP' && 'British Pound'}
                            {formData.default_currency === 'JPY' && 'Japanese Yen'}
                            {formData.default_currency === 'CAD' && 'Canadian Dollar'}
                            {formData.default_currency === 'AUD' && 'Australian Dollar'}
                            {formData.default_currency === 'CHF' && 'Swiss Franc'}
                            {formData.default_currency === 'CNY' && 'Chinese Yuan'}
                            {formData.default_currency === 'SEK' && 'Swedish Krona'}
                            {formData.default_currency === 'NOK' && 'Norwegian Krone'}
                            {formData.default_currency === 'DKK' && 'Danish Krone'}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">USD</span>
                        <span>US Dollar</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="EUR">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">EUR</span>
                        <span>Euro</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="GBP">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">GBP</span>
                        <span>British Pound</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="JPY">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">JPY</span>
                        <span>Japanese Yen</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="CAD">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">CAD</span>
                        <span>Canadian Dollar</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="AUD">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">AUD</span>
                        <span>Australian Dollar</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="CHF">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">CHF</span>
                        <span>Swiss Franc</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="CNY">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">CNY</span>
                        <span>Chinese Yuan</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="SEK">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">SEK</span>
                        <span>Swedish Krona</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="NOK">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">NOK</span>
                        <span>Norwegian Krone</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="DKK">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">DKK</span>
                        <span>Danish Krone</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Default Language */}
              <div className="space-y-2">
                <Label htmlFor="default_language" className="text-sm font-medium">
                  Default Language
                </Label>
                <Select
                  value={formData.default_language || 'en'}
                  onValueChange={(value) => handleInputChange('default_language', value)}
                >
                  <SelectTrigger className="[&>span]:line-clamp-none [&>span]:whitespace-nowrap">
                    <SelectValue placeholder="Select language">
                      {formData.default_language && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {formData.default_language.toUpperCase()}
                          </span>
                          <span>
                            {formData.default_language === 'en' && 'English'}
                            {formData.default_language === 'fr' && 'French'}
                            {formData.default_language === 'es' && 'Spanish'}
                            {formData.default_language === 'de' && 'German'}
                            {formData.default_language === 'pt' && 'Portuguese'}
                            {formData.default_language === 'ar' && 'Arabic'}
                            {formData.default_language === 'zh' && 'Chinese'}
                            {formData.default_language === 'ru' && 'Russian'}
                            {formData.default_language === 'ja' && 'Japanese'}
                            {formData.default_language === 'ko' && 'Korean'}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">EN</span>
                        <span>English</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="fr">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">FR</span>
                        <span>French</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="es">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ES</span>
                        <span>Spanish</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="de">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">DE</span>
                        <span>German</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pt">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">PT</span>
                        <span>Portuguese</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ar">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">AR</span>
                        <span>Arabic</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="zh">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ZH</span>
                        <span>Chinese</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ru">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">RU</span>
                        <span>Russian</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ja">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">JA</span>
                        <span>Japanese</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ko">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">KO</span>
                        <span>Korean</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

          {/* IATI Budgets Tab */}
          <TabsContent value="budgets" className="h-full overflow-y-auto px-2 mt-4">
            <IATIBudgetManager
              organizationId={organization?.id}
              budgets={iatiBudgets}
              onChange={setIatiBudgets}
              defaultCurrency={formData.default_currency || 'USD'}
              readOnly={false}
            />
          </TabsContent>

          {/* IATI Documents Tab */}
          <TabsContent value="documents" className="h-full overflow-y-auto px-2 mt-4">
            <IATIDocumentManager
              organizationId={organization?.id}
              documents={iatiDocuments}
              onChange={setIatiDocuments}
              readOnly={false}
            />
          </TabsContent>

          {/* IATI Import Preferences Tab */}
          <TabsContent value="iati-prefs" className="h-full overflow-y-auto px-2 mt-4">
            <IATIImportPreferences organizationId={organization?.id} />
          </TabsContent>
        </Tabs>

        {/* Dialog Footer */}
        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-600 hover:bg-slate-700"
          >
            {saving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* IATI Import Modal */}
    <Dialog open={showIatiImport} onOpenChange={setShowIatiImport}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import from IATI</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Enter an IATI organization identifier to import data automatically
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="iati_import_id">IATI Organization ID</Label>
            <Input
              id="iati_import_id"
              placeholder="e.g., DK-CVR-20228799"
              // TODO: Add state for IATI import ID and functionality
            />
            <p className="text-xs text-muted-foreground">
              Example: DK-CVR-20228799 (DANIDA), GB-GOV-1 (FCDO)
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowIatiImport(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              // TODO: Implement IATI import functionality
              console.log('IATI import functionality not yet implemented');
              setShowIatiImport(false);
            }}
          >
            Import Organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
