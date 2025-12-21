"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Building2,
  Palette,
  Mail,
  Link2,
  DollarSign,
  FileText,
  Settings,
  Clock,
  CheckCircle,
  Eye,
  Copy,
  HelpCircle,
  ImageIcon,
  Upload,
  X,
  Phone,
  Globe,
  MapPin,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  Merge,
  Loader2,
  ArrowLeft,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useDropzone } from 'react-dropzone'
import Flag from 'react-world-flags'
import { IATIBudgetManager } from './IATIBudgetManager'
import { IATIDocumentManager } from './IATIDocumentManager'
import IATIImportPreferences from './IATIImportPreferences'
import IATIOrgImportTab from './IATIOrgImportTab'
import OrganizationFundingEnvelopeTab from './OrganizationFundingEnvelopeTab'
import { StringArrayInput } from '@/components/ui/string-array-input'
import { IATI_COUNTRIES } from '@/data/iati-countries'
import { OrganizationCombobox, Organization as ComboboxOrganization } from '@/components/ui/organization-combobox'
import OrganizationEditorNavigation from './OrganizationEditorNavigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const REGIONAL_OPTIONS = [
  { code: '998', name: 'Global or Regional', isRegion: true }
]

const ALL_COUNTRY_AND_REGION_CODES = [
  ...IATI_COUNTRIES.map(c => c.code),
  ...IATI_COUNTRIES.map(c => c.name),
  ...REGIONAL_OPTIONS.map(r => r.code),
  ...REGIONAL_OPTIONS.map(r => r.name),
  'Myanmar', 'Burma', 'Rwanda',
  'Global or Regional'
]

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
  { code: '70', label: 'Private Sector (Legacy)', description: 'Deprecated - use 71/72/73 instead', is_active: true, sort_order: 10.5 },
  { code: '71', label: 'Private Sector in Provider Country', description: 'Private companies', is_active: true, sort_order: 11 },
  { code: '72', label: 'Private Sector in Aid Recipient Country', description: 'Local companies', is_active: true, sort_order: 12 },
  { code: '73', label: 'Private Sector in Third Country', description: 'Third country companies', is_active: true, sort_order: 13 },
  { code: '80', label: 'Academic, Training and Research', description: 'Universities, research institutes', is_active: true, sort_order: 14 },
  { code: '90', label: 'Other', description: 'Other organisations', is_active: true, sort_order: 15 }
]

// Save indicator component - defined outside to prevent re-renders
const SaveIndicator = ({
  fieldName,
  saving,
  lastSaved,
  isCreating
}: {
  fieldName: string
  saving: Record<string, boolean>
  lastSaved: Record<string, Date>
  isCreating: boolean
}) => {
  const isSaving = saving[fieldName]
  const lastSave = lastSaved[fieldName]

  if (isSaving) {
    return (
      <div className="flex items-center gap-1 text-blue-600 text-xs">
        <Clock className="h-3 w-3 animate-spin" />
        Saving...
      </div>
    )
  }

  if (lastSave && !isCreating) {
    return (
      <div className="flex items-center gap-1 text-green-600 text-xs">
        <CheckCircle className="h-3 w-3" />
        Saved {lastSave.toLocaleTimeString()}
      </div>
    )
  }

  return null
}

// Field wrapper component - defined outside to prevent re-renders
const FieldWrapper = ({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    {children}
  </div>
)

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
  alias_refs?: string[]
  name_aliases?: string[]
  social_twitter?: string
  social_facebook?: string
  social_linkedin?: string
  social_instagram?: string
  social_youtube?: string
  [key: string]: any
}

interface OrganizationEditorProps {
  organizationId?: string
  initialData?: Partial<Organization>
  isCreating?: boolean
  onSuccess?: () => void
  onCreate?: (orgId: string) => void
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
          <div className={`rounded-lg overflow-hidden border-2 border-dashed border-gray-300 ${isLogo ? 'w-32 h-40' : 'w-full h-40'}`}>
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
            h-40`}
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

export function OrganizationEditor({
  organizationId: initialOrganizationId,
  initialData,
  isCreating = false,
  onSuccess,
  onCreate
}: OrganizationEditorProps) {
  const [organizationId, setOrganizationId] = useState<string | undefined>(initialOrganizationId)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState('general')
  const [showOrgDetails, setShowOrgDetails] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<Organization>>({
    name: initialData?.name || '',
    acronym: initialData?.acronym || '',
    country_represented: initialData?.country_represented || initialData?.country || '',
    Organisation_Type_Code: initialData?.Organisation_Type_Code || initialData?.organisation_type || '',
    cooperation_modality: initialData?.cooperation_modality || '',
    description: initialData?.description || '',
    logo: initialData?.logo || '',
    banner: initialData?.banner || '',
    website: initialData?.website || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    alias_refs: initialData?.alias_refs || [],
    name_aliases: initialData?.name_aliases || [],
    social_twitter: initialData?.social_twitter || '',
    social_facebook: initialData?.social_facebook || '',
    social_linkedin: initialData?.social_linkedin || '',
    social_instagram: initialData?.social_instagram || '',
    social_youtube: initialData?.social_youtube || '',
    reporting_org_ref: initialData?.reporting_org_ref || '',
    reporting_org_type: initialData?.reporting_org_type || '',
    reporting_org_name: initialData?.reporting_org_name || '',
    reporting_org_secondary_reporter: initialData?.reporting_org_secondary_reporter || false,
    last_updated_datetime: initialData?.last_updated_datetime || undefined,
    default_currency: initialData?.default_currency || 'USD',
    default_language: initialData?.default_language || 'en',
    iati_org_id: initialData?.iati_org_id || '',
  })

  // Loading states for individual fields
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [lastSaved, setLastSaved] = useState<Record<string, Date>>({})
  const [organizationTypes, setOrganizationTypes] = useState<OrganizationType[]>(DEFAULT_ORGANIZATION_TYPES)
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [iatiBudgets, setIatiBudgets] = useState<any[]>([])
  const [iatiDocuments, setIatiDocuments] = useState<any[]>([])
  const [countrySearchTerm, setCountrySearchTerm] = useState('')
  const [countrySelectOpen, setCountrySelectOpen] = useState(false)
  
  // Merge organization state
  const [allOrganizations, setAllOrganizations] = useState<ComboboxOrganization[]>([])
  const [mergeSourceOrgId, setMergeSourceOrgId] = useState<string | null>(null)
  const [mergePreview, setMergePreview] = useState<{
    sourceOrg: {
      id: string;
      name: string;
      acronym: string | null;
      iati_org_id: string | null;
      type: string | null;
      country: string | null;
    };
    totals: {
      activities: number;
      transactions: number;
      plannedDisbursements: number;
      users: number;
      otherReferences: number;
    };
    willAddAlias: string | null;
  } | null>(null)
  const [isMerging, setIsMerging] = useState(false)
  const [showMergeConfirm, setShowMergeConfirm] = useState(false)
  const [loadingMergePreview, setLoadingMergePreview] = useState(false)

  // Set initial section from URL parameter
  useEffect(() => {
    const sectionParam = searchParams?.get('section')
    if (sectionParam) {
      setActiveSection(sectionParam)
    }
  }, [searchParams])

  // Handle section change with URL synchronization
  const handleSectionChange = (sectionValue: string) => {
    setActiveSection(sectionValue)
    
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('section', sectionValue)
    
    router.replace(`?${params.toString()}`, { scroll: false })
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
      console.error('[OrgEditor] Error fetching organization types:', error)
      setOrganizationTypes(DEFAULT_ORGANIZATION_TYPES)
    } finally {
      setLoadingTypes(false)
    }
  }

  useEffect(() => {
    fetchOrganizationTypes()
  }, [])

  // Auto-calculate cooperation modality
  useEffect(() => {
    if (formData.Organisation_Type_Code && formData.country_represented) {
      const calculatedModality = deriveCooperationModality(
        formData.Organisation_Type_Code,
        formData.country_represented
      )
      if (calculatedModality !== formData.cooperation_modality) {
        setFormData(prev => ({ ...prev, cooperation_modality: calculatedModality }))
        // Auto-save if organization exists
        if (organizationId && !isCreating) {
          updateField('cooperation_modality', calculatedModality, 'Cooperation Modality')
        }
      }
    }
  }, [formData.Organisation_Type_Code, formData.country_represented])

  // Utility function to update a single field
  const updateField = async (fieldName: string, value: any, displayName: string) => {
    // If creating and no organizationId yet, try to create organization if we have required fields
    if (isCreating && !organizationId) {
      const updatedFormData = { ...formData, [fieldName]: value }
      
      // Check if we have all required fields to create
      if (updatedFormData.name?.trim() && updatedFormData.acronym?.trim() && 
          updatedFormData.Organisation_Type_Code?.trim() && updatedFormData.country_represented?.trim()) {
        
        setSaving(prev => ({ ...prev, [fieldName]: true }))
        
        try {
          const response = await fetch('/api/organizations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedFormData),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to create organization')
          }

          const newOrganization = await response.json()
          setOrganizationId(newOrganization.id)
          
          if (onCreate) {
            onCreate(newOrganization.id)
          }
          
          setLastSaved(prev => ({ ...prev, [fieldName]: new Date() }))
          toast.success('Organization created successfully', {
            position: 'top-right',
            duration: 2000
          })
          
          // Update form data with the new org data
          setFormData(prev => ({ ...prev, ...newOrganization, [fieldName]: value }))
        } catch (error) {
          console.error(`Error creating organization:`, error)
          toast.error(`Failed to create organization`, {
            position: 'top-right',
            duration: 3000
          })
        } finally {
          setSaving(prev => ({ ...prev, [fieldName]: false }))
        }
        return
      } else {
        // Just update local state for now
        setFormData(prev => ({ ...prev, [fieldName]: value }))
        return
      }
    }

    if (!organizationId) return

    setSaving(prev => ({ ...prev, [fieldName]: true }))
    
    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [fieldName]: value }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update organization')
      }

      setLastSaved(prev => ({ ...prev, [fieldName]: new Date() }))
      toast.success(`${displayName} saved successfully`, {
        position: 'top-right',
        duration: 2000
      })
    } catch (error) {
      console.error(`Error saving ${fieldName}:`, error)
      toast.error(`Failed to save ${displayName}`, {
        position: 'top-right',
        duration: 3000
      })
    } finally {
      setSaving(prev => ({ ...prev, [fieldName]: false }))
    }
  }

  // Handle form changes with optimistic updates
  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
  }

  // Handle field blur events for saving
  const handleFieldBlur = async (fieldName: string, value: string, displayName: string) => {
    if (!isCreating || organizationId) {
      await updateField(fieldName, value, displayName)
    }
  }

  // Fetch all organizations for merge dropdown
  useEffect(() => {
    if (activeSection === 'aliases' && organizationId && !isCreating) {
      const fetchOrganizations = async () => {
        try {
          const response = await fetch('/api/organizations')
          if (response.ok) {
            const data = await response.json()
            const filtered = (data || [])
              .filter((org: any) => org.id !== organizationId)
              .map((org: any) => ({
                id: org.id,
                name: org.name,
                acronym: org.acronym,
                type: org.type || org.Organisation_Type_Name,
                org_type: org.org_type,
                Organisation_Type_Code: org.Organisation_Type_Code,
                Organisation_Type_Name: org.Organisation_Type_Name,
                country: org.country,
                iati_org_id: org.iati_org_id,
                logo: org.logo,
              }))
            setAllOrganizations(filtered)
          }
        } catch (error) {
          console.error('[OrgEditor] Error fetching organizations for merge:', error)
        }
      }
      fetchOrganizations()
    }
  }, [activeSection, organizationId, isCreating])

  // Fetch merge preview when source org is selected
  useEffect(() => {
    if (mergeSourceOrgId && organizationId) {
      const fetchMergePreview = async () => {
        setLoadingMergePreview(true)
        try {
          const response = await fetch(
            `/api/organizations/merge/preview?sourceOrgId=${mergeSourceOrgId}&targetOrgId=${organizationId}`
          )
          if (response.ok) {
            const preview = await response.json()
            setMergePreview(preview)
          } else {
            const error = await response.json()
            toast.error(error.error || 'Failed to load merge preview')
            setMergeSourceOrgId(null)
          }
        } catch (error) {
          console.error('[OrgEditor] Error fetching merge preview:', error)
          toast.error('Failed to load merge preview')
        } finally {
          setLoadingMergePreview(false)
        }
      }
      fetchMergePreview()
    } else {
      setMergePreview(null)
    }
  }, [mergeSourceOrgId, organizationId])

  // Execute merge operation
  const handleMerge = async () => {
    if (!mergeSourceOrgId || !organizationId) return
    
    setIsMerging(true)
    try {
      const response = await fetch('/api/organizations/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceOrgId: mergeSourceOrgId,
          targetOrgId: organizationId,
          mergeNameAliases: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to merge organizations')
      }

      const result = await response.json()
      
      // Update local form data with new aliases
      const sourceIatiId = result.sourceOrg.iati_org_id
      if (sourceIatiId) {
        const currentAliases = formData.alias_refs || []
        if (!currentAliases.includes(sourceIatiId)) {
          setFormData(prev => ({
            ...prev,
            alias_refs: [...(prev.alias_refs || []), sourceIatiId],
          }))
        }
      }
      
      // Remove merged org from the dropdown list
      setAllOrganizations(prev => prev.filter(org => org.id !== mergeSourceOrgId))
      
      // Reset merge state
      setMergeSourceOrgId(null)
      setMergePreview(null)
      setShowMergeConfirm(false)
      
      toast.success(
        `Successfully merged "${result.sourceOrg.name}" into this organization. ` +
        `Updated ${result.summary.activitiesUpdated} activities, ` +
        `${result.summary.transactionsProviderUpdated + result.summary.transactionsReceiverUpdated} transactions.`
      )
      
      // Trigger refresh if callback provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to merge organizations'
      toast.error(errorMessage)
    } finally {
      setIsMerging(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const organizationType = organizationTypes.find(t => t.code === formData.Organisation_Type_Code)

  // Helper to get section label
  const getSectionLabel = (sectionId: string): string => {
    const labels: Record<string, string> = {
      general: 'General Information',
      branding: 'Branding',
      contact: 'Contact & Social Media',
      aliases: 'Aliases',
      'funding-envelope': 'Organisation Funding Envelope',
      budgets: 'IATI Budgets',
      documents: 'IATI Documents',
      'iati-prefs': 'IATI Import Preferences'
    }
    return labels[sectionId] || sectionId
  }

  // Tab completion status calculation
  const tabCompletionStatus = useMemo(() => ({
    general: {
      isComplete: !!(formData.name && formData.acronym && 
                     formData.Organisation_Type_Code && formData.country_represented),
      isInProgress: !!(formData.name || formData.acronym)
    },
    branding: {
      isComplete: !!(formData.logo || formData.banner),
      isInProgress: false
    },
    contact: {
      isComplete: !!(formData.email || formData.website || formData.phone),
      isInProgress: false
    },
    aliases: {
      isComplete: ((formData.alias_refs?.length || 0) > 0 || (formData.name_aliases?.length || 0) > 0),
      isInProgress: false
    },
    'funding-envelope': {
      isComplete: false, // Always optional - component manages its own state
      isInProgress: false
    },
    budgets: {
      isComplete: iatiBudgets.length > 0,
      isInProgress: false
    },
    documents: {
      isComplete: iatiDocuments.length > 0,
      isInProgress: false
    },
    'iati-prefs': {
      isComplete: false, // Always optional
      isInProgress: false
    }
  }), [formData, iatiBudgets, iatiDocuments])

  return (
    <>
      <div className="flex h-[calc(100vh-6rem)] overflow-hidden gap-x-6 lg:gap-x-8">
        {/* Organization Editor Navigation Panel */}
        <aside className="w-80 flex-shrink-0 bg-white overflow-y-auto pb-24">
          {/* Organization Metadata Summary - Only show when editing */}
          {!isCreating && organizationId && (
            <div className="bg-white p-4 border-b border-gray-200">
              <div className="space-y-2 text-sm">
                <div className="mb-3">
                  <div className="flex items-center gap-1">
                    <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                      {formData.name || 'Untitled Organization'}
                      {formData.acronym && (
                        <span className="text-sm text-gray-500"> ({formData.acronym})</span>
                      )}
                    </h2>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const titleText = `${formData.name || 'Untitled Organization'}${formData.acronym ? ` (${formData.acronym})` : ''}`;
                        navigator.clipboard.writeText(titleText);
                        toast.success('Organization name copied to clipboard');
                      }}
                      className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors inline-flex items-center"
                      title="Copy organization name"
                    >
                      <Copy className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                  {/* Organization ID and IATI ID */}
                  <div className="mt-2 space-y-1">
                    {organizationId && (
                      <div className="text-xs">
                        <span className="text-gray-600">Organization ID: </span>
                        <code className="inline px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-mono break-all" style={{ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' as const }}>
                          {organizationId}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(organizationId);
                            toast.success('Organization ID copied to clipboard');
                          }}
                          className="ml-1 p-1 hover:bg-gray-100 rounded transition-colors inline-flex items-center align-middle"
                          title="Copy Organization ID"
                        >
                          <Copy className="h-3 w-3 text-gray-600" />
                        </button>
                      </div>
                    )}
                    {formData.iati_org_id && (
                      <div className="text-xs">
                        <code className="inline px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-mono break-all" style={{ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' as const }}>
                          {formData.iati_org_id}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(formData.iati_org_id || '');
                            toast.success('IATI ID copied to clipboard');
                          }}
                          className="ml-1 p-1 hover:bg-gray-100 rounded transition-colors inline-flex items-center align-middle"
                          title="Copy IATI ID"
                        >
                          <Copy className="h-3 w-3 text-gray-600" />
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowOrgDetails(!showOrgDetails)}
                    className="text-xs text-gray-600 hover:text-gray-900 mt-2"
                  >
                    {showOrgDetails ? 'Show less' : 'Show more'}
                  </button>
                </div>
                {showOrgDetails && (
                  <div className="space-y-3 text-sm border-t border-gray-200 pt-3">
                    {formData.description && (
                      <div>
                        <p className="text-gray-600 text-xs leading-relaxed">
                          {formData.description}
                        </p>
                      </div>
                    )}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 shrink-0">Type:</span>
                        <span className="text-gray-900 font-medium">
                          {organizationType?.label || 'Not set'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 shrink-0">Location:</span>
                        <span className="text-gray-900 font-medium">
                          {formData.country_represented || 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Organization Editor Navigation */}
          <div>
            <OrganizationEditorNavigation
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              organizationCreated={!!organizationId}
              tabCompletionStatus={tabCompletionStatus}
              disabled={Object.values(saving).some(v => v)}
            />
          </div>
        </aside>

        {/* Main Content Panel */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="organization-editor pl-0 pr-6 md:pr-8 py-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (organizationId) {
                      router.push(`/organizations/${organizationId}`)
                    } else {
                      router.push('/organizations')
                    }
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {isCreating ? 'Add New Organization' : 'Edit Organization Profile'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {isCreating ? 'Create a new organization profile' : 'All changes are saved automatically'}
                  </p>
                </div>
              </div>
            </div>

            {/* Section Content */}
            <div className="fade-in">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-semibold">{getSectionLabel(activeSection)}</h2>
            </div>

            {/* General Section */}
            {activeSection === 'general' && (
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    General Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name (Required) */}
                    <FieldWrapper label="Name *">
                      <div className="space-y-1">
                        <Input
                          type="text"
                          value={formData.name || ''}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          onBlur={(e) => handleFieldBlur('name', e.target.value, 'Name')}
                          disabled={saving.name}
                          placeholder="Danish International Development Agency"
                          className="w-full"
                        />
                        <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="name" />
                      </div>
                    </FieldWrapper>

                    {/* Acronym / Short Name (Required) */}
                    <FieldWrapper label="Acronym / Short Name *">
                      <div className="space-y-1">
                        <Input
                          type="text"
                          value={formData.acronym || ''}
                          onChange={(e) => handleFieldChange('acronym', e.target.value)}
                          onBlur={(e) => handleFieldBlur('acronym', e.target.value, 'Acronym')}
                          disabled={saving.acronym}
                          placeholder="DANIDA"
                          className="w-full"
                        />
                        <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="acronym" />
                      </div>
                    </FieldWrapper>

                    {/* Location Represented */}
                    <FieldWrapper label="Location Represented *">
                      <div className="space-y-1">
                        <Select
                          value={formData.country_represented || ''}
                          onValueChange={(value) => {
                            handleFieldChange('country_represented', value)
                            handleFieldBlur('country_represented', value, 'Location Represented')
                            setCountrySearchTerm('')
                          }}
                          open={countrySelectOpen}
                          onOpenChange={setCountrySelectOpen}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select country or region">
                              {formData.country_represented && (
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const country = IATI_COUNTRIES.find(c => c.name === formData.country_represented)
                                    if (country) {
                                      return (
                                        <>
                                          <Flag code={country.code} className="h-4 w-6 object-cover rounded" />
                                          <span>{formData.country_represented}</span>
                                        </>
                                      )
                                    }
                                    return <span>{formData.country_represented}</span>
                                  })()}
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <div className="flex items-center border-b px-3 py-2 sticky top-0 bg-white z-10">
                              <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                              <Input
                                placeholder="Search countries..."
                                value={countrySearchTerm}
                                onChange={(e) => setCountrySearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  e.stopPropagation()
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                  }
                                }}
                                onKeyUp={(e) => e.stopPropagation()}
                                onKeyPress={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                                className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                              />
                              {countrySearchTerm && (
                                <X
                                  className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCountrySearchTerm('')
                                  }}
                                />
                              )}
                            </div>

                            {(() => {
                              const searchLower = countrySearchTerm.toLowerCase()
                              const filteredRegions = REGIONAL_OPTIONS.filter(region =>
                                region.name.toLowerCase().includes(searchLower) ||
                                region.code.toLowerCase().includes(searchLower)
                              )
                              const filteredCountries = IATI_COUNTRIES.filter(country =>
                                !country.withdrawn && (
                                  country.name.toLowerCase().includes(searchLower) ||
                                  country.code.toLowerCase().includes(searchLower)
                                )
                              )

                              return (
                                <>
                                  {filteredRegions.length > 0 && (
                                    <>
                                      <div className="px-2 py-1.5 text-sm font-semibold text-gray-600">
                                        Region / Global
                                      </div>
                                      {filteredRegions.map((region) => (
                                        <SelectItem key={region.code} value={region.name}>
                                          {region.name}
                                        </SelectItem>
                                      ))}
                                      {filteredCountries.length > 0 && <div className="my-1 border-t" />}
                                    </>
                                  )}

                                  {filteredCountries.length > 0 && (
                                    <>
                                      <div className="px-2 py-1.5 text-sm font-semibold text-gray-600">
                                        Countries
                                      </div>
                                      {filteredCountries.map((country) => (
                                        <SelectItem key={country.code} value={country.name}>
                                          <div className="flex items-center gap-2">
                                            <Flag code={country.code} className="h-4 w-6 object-cover rounded flex-shrink-0" />
                                            <span>{country.name}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </>
                                  )}

                                  {filteredRegions.length === 0 && filteredCountries.length === 0 && (
                                    <div className="px-2 py-6 text-center text-sm text-gray-500">
                                      No countries found for "{countrySearchTerm}"
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </SelectContent>
                        </Select>
                        <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="country_represented" />
                      </div>
                    </FieldWrapper>

                    {/* Organisation Type (Required) */}
                    <FieldWrapper label="Organisation Type *">
                      <div className="space-y-1">
                        <Select 
                          value={formData.Organisation_Type_Code || ''} 
                          onValueChange={(value) => {
                            handleFieldChange('Organisation_Type_Code', value)
                            handleFieldBlur('Organisation_Type_Code', value, 'Organisation Type')
                          }}
                          disabled={loadingTypes}
                        >
                          <SelectTrigger className="w-full [&>span]:line-clamp-none [&>span]:whitespace-nowrap">
                            <SelectValue placeholder={loadingTypes ? "Loading types..." : "Select organisation type"}>
                              {formData.Organisation_Type_Code && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {formData.Organisation_Type_Code}
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {organizationType?.label || 'Unknown'}
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
                        <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="Organisation_Type_Code" />
                      </div>
                    </FieldWrapper>
                  </div>

                  {/* Description */}
                  <FieldWrapper label="Description">
                    <div className="space-y-1">
                      <Textarea
                        rows={6}
                        value={formData.description || ''}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        onBlur={(e) => handleFieldBlur('description', e.target.value, 'Description')}
                        disabled={saving.description}
                        placeholder="Brief description of the organization"
                        className="resize-y min-h-[120px]"
                      />
                      <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="description" />
                    </div>
                  </FieldWrapper>

                  <Separator />

                  {/* IATI Classification Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* IATI Organisation Identifier */}
                    <FieldWrapper label="IATI Organisation Identifier">
                      <div className="space-y-1">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              value={formData.iati_org_id || ''}
                              onChange={(e) => handleFieldChange('iati_org_id', e.target.value)}
                              onBlur={(e) => handleFieldBlur('iati_org_id', e.target.value, 'IATI Organisation Identifier')}
                              disabled={saving.iati_org_id}
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
                        <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="iati_org_id" />
                      </div>
                    </FieldWrapper>

                    {/* Organization UUID (Read-only) */}
                    {organizationId && (
                      <FieldWrapper label="Organization UUID">
                        <div className="space-y-1">
                          <div className="flex gap-2">
                            <Input
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
                      </FieldWrapper>
                    )}

                    {/* Default Currency */}
                    <FieldWrapper label="Default Currency">
                      <div className="space-y-1">
                        <Select
                          value={formData.default_currency || 'USD'}
                          onValueChange={(value) => {
                            handleFieldChange('default_currency', value)
                            handleFieldBlur('default_currency', value, 'Default Currency')
                          }}
                        >
                          <SelectTrigger className="w-full [&>span]:line-clamp-none [&>span]:whitespace-nowrap">
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
                        <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="default_currency" />
                      </div>
                    </FieldWrapper>

                    {/* Default Language */}
                    <FieldWrapper label="Default Language">
                      <div className="space-y-1">
                        <Select
                          value={formData.default_language || 'en'}
                          onValueChange={(value) => {
                            handleFieldChange('default_language', value)
                            handleFieldBlur('default_language', value, 'Default Language')
                          }}
                        >
                          <SelectTrigger className="w-full [&>span]:line-clamp-none [&>span]:whitespace-nowrap">
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
                        <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="default_language" />
                      </div>
                    </FieldWrapper>
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {/* Branding Section */}
            {activeSection === 'branding' && (
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Branding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground">Upload logos and banner images for your organization profile</p>
                  
                  <div className="flex gap-4 items-start">
                    <div className="w-48 flex-shrink-0">
                      <ImageUpload
                        value={formData.logo || ''}
                        onChange={(value) => {
                          handleFieldChange('logo', value)
                          handleFieldBlur('logo', value, 'Logo')
                        }}
                        label="Logo"
                        recommendedSize="512×512px"
                        isLogo={true}
                      />
                      <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="logo" />
                    </div>

                    <div className="flex-grow">
                      <ImageUpload
                        value={formData.banner || ''}
                        onChange={(value) => {
                          handleFieldChange('banner', value)
                          handleFieldBlur('banner', value, 'Banner')
                        }}
                        label="Banner"
                        recommendedSize="1200×300px"
                        isLogo={false}
                      />
                      <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="banner" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {/* Contact & Social Media Section */}
            {activeSection === 'contact' && (
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Contact & Social Media
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Contact Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FieldWrapper label="Email">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <Input
                              type="email"
                              value={formData.email || ''}
                              onChange={(e) => handleFieldChange('email', e.target.value)}
                              onBlur={(e) => handleFieldBlur('email', e.target.value, 'Email')}
                              disabled={saving.email}
                              placeholder="contact@organization.org"
                              className="flex-1"
                            />
                          </div>
                          <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="email" />
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="Phone">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <Input
                              value={formData.phone || ''}
                              onChange={(e) => handleFieldChange('phone', e.target.value)}
                              onBlur={(e) => handleFieldBlur('phone', e.target.value, 'Phone')}
                              disabled={saving.phone}
                              placeholder="+1 234 567 8900"
                              className="flex-1"
                            />
                          </div>
                          <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="phone" />
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="Website">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-500" />
                            <Input
                              type="url"
                              value={formData.website || ''}
                              onChange={(e) => handleFieldChange('website', e.target.value)}
                              onBlur={(e) => handleFieldBlur('website', e.target.value, 'Website')}
                              disabled={saving.website}
                              placeholder="https://www.organization.org"
                              className="flex-1"
                            />
                          </div>
                          <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="website" />
                        </div>
                      </FieldWrapper>

                      <div className="md:col-span-2">
                        <FieldWrapper label="Mailing Address">
                          <div className="space-y-1">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-500 mt-2" />
                              <Textarea
                                value={formData.address || ''}
                                onChange={(e) => handleFieldChange('address', e.target.value)}
                                onBlur={(e) => handleFieldBlur('address', e.target.value, 'Address')}
                                disabled={saving.address}
                                placeholder="Full mailing address"
                                rows={3}
                                className="resize-y min-h-[80px] flex-1"
                              />
                            </div>
                            <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="address" />
                          </div>
                        </FieldWrapper>
                      </div>
                    </div>
                  </div>

                  {/* Social Media Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Social Media</h3>
                    <p className="text-sm text-muted-foreground">Add social media profiles for your organization</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FieldWrapper label="Twitter / X">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Twitter className="h-4 w-4 text-gray-500" />
                            <Input
                              value={formData.social_twitter || ''}
                              onChange={(e) => handleFieldChange('social_twitter', e.target.value)}
                              onBlur={(e) => handleFieldBlur('social_twitter', e.target.value, 'Twitter')}
                              disabled={saving.social_twitter}
                              placeholder="https://twitter.com/yourorg or @yourorg"
                              className="flex-1"
                            />
                          </div>
                          <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="social_twitter" />
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="Facebook">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Facebook className="h-4 w-4 text-gray-500" />
                            <Input
                              value={formData.social_facebook || ''}
                              onChange={(e) => handleFieldChange('social_facebook', e.target.value)}
                              onBlur={(e) => handleFieldBlur('social_facebook', e.target.value, 'Facebook')}
                              disabled={saving.social_facebook}
                              placeholder="https://facebook.com/yourorg"
                              className="flex-1"
                            />
                          </div>
                          <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="social_facebook" />
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="LinkedIn">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Linkedin className="h-4 w-4 text-gray-500" />
                            <Input
                              value={formData.social_linkedin || ''}
                              onChange={(e) => handleFieldChange('social_linkedin', e.target.value)}
                              onBlur={(e) => handleFieldBlur('social_linkedin', e.target.value, 'LinkedIn')}
                              disabled={saving.social_linkedin}
                              placeholder="https://linkedin.com/company/yourorg"
                              className="flex-1"
                            />
                          </div>
                          <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="social_linkedin" />
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="Instagram">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Instagram className="h-4 w-4 text-gray-500" />
                            <Input
                              value={formData.social_instagram || ''}
                              onChange={(e) => handleFieldChange('social_instagram', e.target.value)}
                              onBlur={(e) => handleFieldBlur('social_instagram', e.target.value, 'Instagram')}
                              disabled={saving.social_instagram}
                              placeholder="https://instagram.com/yourorg or @yourorg"
                              className="flex-1"
                            />
                          </div>
                          <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="social_instagram" />
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="YouTube">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Youtube className="h-4 w-4 text-gray-500" />
                            <Input
                              value={formData.social_youtube || ''}
                              onChange={(e) => handleFieldChange('social_youtube', e.target.value)}
                              onBlur={(e) => handleFieldBlur('social_youtube', e.target.value, 'YouTube')}
                              disabled={saving.social_youtube}
                              placeholder="https://youtube.com/@yourorg"
                              className="flex-1"
                            />
                          </div>
                          <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="social_youtube" />
                        </div>
                      </FieldWrapper>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {/* Aliases Section */}
            {activeSection === 'aliases' && (
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Aliases
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800 mb-1">About Aliases</p>
                      <p className="text-sm text-blue-700">
                        Aliases help AIMS automatically recognize this organization when importing IATI data, 
                        even if the source uses legacy codes or alternate names. This ensures consistent data 
                        linking across different reporting sources.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Legacy or Internal Codes */}
                    <FieldWrapper label="Legacy or Internal Codes">
                      <StringArrayInput
                        label=""
                        description="Alternative organization identifiers used in IATI data (e.g., 010712, KR-GOV-OLD)"
                        placeholder="e.g., 010712, KR-MOFA-OLD"
                        value={formData.alias_refs || []}
                        onChange={(value) => {
                          handleFieldChange('alias_refs', value)
                          if (organizationId && !isCreating) {
                            updateField('alias_refs', value, 'Legacy or Internal Codes')
                          }
                        }}
                        id="alias_refs"
                      />
                      <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="alias_refs" />
                    </FieldWrapper>

                    {/* Alternate Names */}
                    <FieldWrapper label="Alternate Names">
                      <StringArrayInput
                        label=""
                        description="Other names this organization is known by in IATI data (e.g., KOICA, Korea Intern. Cooperation Agency)"
                        placeholder="e.g., KOICA, Korea Intern. Cooperation Agency"
                        value={formData.name_aliases || []}
                        onChange={(value) => {
                          handleFieldChange('name_aliases', value)
                          if (organizationId && !isCreating) {
                            updateField('name_aliases', value, 'Alternate Names')
                          }
                        }}
                        id="name_aliases"
                      />
                      <SaveIndicator saving={saving} lastSaved={lastSaved} isCreating={isCreating} fieldName="name_aliases" />
                    </FieldWrapper>
                  </div>

                  {/* Merge Another Organization Section */}
                  {!isCreating && organizationId && (
                    <div className="border-t pt-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <Merge className="h-5 w-5 text-gray-600" />
                        <h3 className="text-base font-semibold text-gray-900">Merge Another Organization</h3>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        Merge a duplicate organization into this one. All activities, transactions, and references 
                        will be transferred to this organization, and the duplicate will be deleted.
                      </p>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Search for organization to merge</Label>
                        <OrganizationCombobox
                          organizations={allOrganizations}
                          value={mergeSourceOrgId || ''}
                          onValueChange={(value) => setMergeSourceOrgId(value || null)}
                          placeholder="Search by name, acronym, or IATI ID..."
                        />
                      </div>

                      {loadingMergePreview && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading impact preview...
                        </div>
                      )}

                      {mergePreview && !loadingMergePreview && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <Building2 className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium text-amber-900">
                                {mergePreview.sourceOrg.name}
                                {mergePreview.sourceOrg.acronym && ` (${mergePreview.sourceOrg.acronym})`}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {mergePreview.sourceOrg.iati_org_id && (
                                  <span className="text-xs font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                    {mergePreview.sourceOrg.iati_org_id}
                                  </span>
                                )}
                                {mergePreview.sourceOrg.type && (
                                  <span className="text-xs text-amber-700">
                                    {mergePreview.sourceOrg.type}
                                  </span>
                                )}
                                {mergePreview.sourceOrg.country && (
                                  <span className="text-xs text-amber-700">
                                    • {mergePreview.sourceOrg.country}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Separator className="bg-amber-200" />

                          <div className="space-y-2">
                            <p className="text-sm font-medium text-amber-900">This will reassign:</p>
                            <ul className="text-sm text-amber-800 space-y-1">
                              <li>• {mergePreview.totals.activities} activity reference{mergePreview.totals.activities !== 1 ? 's' : ''}</li>
                              <li>• {mergePreview.totals.transactions} transaction{mergePreview.totals.transactions !== 1 ? 's' : ''}</li>
                              <li>• {mergePreview.totals.plannedDisbursements} planned disbursement{mergePreview.totals.plannedDisbursements !== 1 ? 's' : ''}</li>
                              <li>• {mergePreview.totals.users} user{mergePreview.totals.users !== 1 ? 's' : ''}</li>
                              {mergePreview.totals.otherReferences > 0 && (
                                <li>• {mergePreview.totals.otherReferences} other reference{mergePreview.totals.otherReferences !== 1 ? 's' : ''}</li>
                              )}
                            </ul>
                            {mergePreview.willAddAlias && (
                              <p className="text-sm text-amber-800 mt-2">
                                The IATI ID <span className="font-mono font-medium">{mergePreview.willAddAlias}</span> will be added as an alias.
                              </p>
                            )}
                          </div>

                          <Button
                            onClick={() => setShowMergeConfirm(true)}
                            variant="destructive"
                            className="w-full mt-2"
                            disabled={isMerging}
                          >
                            {isMerging ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Merging...
                              </>
                            ) : (
                              <>
                                <Merge className="mr-2 h-4 w-4" />
                                Merge into this Organization
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-600">
                        <p className="font-medium text-gray-700 mb-1">Note:</p>
                        <p>
                          Merging is permanent and cannot be undone. The source organization will be deleted 
                          after all its references are transferred to this organization.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            )}

            {/* Organisation Funding Envelope Section */}
            {activeSection === 'funding-envelope' && organizationId && (
              <div className="space-y-6">
                <OrganizationFundingEnvelopeTab
                  organizationId={organizationId}
                  readOnly={false}
                />
              </div>
            )}

            {/* IATI Org Import Section */}
            {activeSection === 'iati-import' && organizationId && (
              <div className="space-y-6">
                <IATIOrgImportTab
                  organizationId={organizationId}
                  currentOrgData={formData}
                  onImportComplete={() => {
                    // Refresh organization data after import
                    // You may want to add a refresh mechanism here
                    toast.success('Import completed. Please refresh to see updated data.')
                  }}
                />
              </div>
            )}

            {/* IATI Budgets Section */}
            {activeSection === 'budgets' && (
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    IATI Budgets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <IATIBudgetManager
                    organizationId={organizationId}
                    budgets={iatiBudgets}
                    onChange={setIatiBudgets}
                    defaultCurrency={formData.default_currency || 'USD'}
                    readOnly={false}
                  />
                </CardContent>
              </Card>
              </div>
            )}

            {/* IATI Documents Section */}
            {activeSection === 'documents' && (
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    IATI Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <IATIDocumentManager
                    organizationId={organizationId}
                    documents={iatiDocuments}
                    onChange={setIatiDocuments}
                    readOnly={false}
                  />
                </CardContent>
              </Card>
              </div>
            )}

            {/* IATI Import Preferences Section */}
            {activeSection === 'iati-prefs' && (
              <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    IATI Import Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <IATIImportPreferences organizationId={organizationId} />
                </CardContent>
              </Card>
              </div>
            )}

            </div>
          </div>
        </main>
      </div>

      {/* Merge Confirmation Dialog */}
      <AlertDialog open={showMergeConfirm} onOpenChange={setShowMergeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-red-500" />
              Confirm Organization Merge
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>
                  You are about to merge <strong>{mergePreview?.sourceOrg.name}</strong> into{' '}
                  <strong>{formData.name}</strong>.
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
                  <p className="font-medium text-red-800">This action will:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Transfer all activities, transactions, and references</li>
                    <li>• Add the source IATI ID as an alias</li>
                    <li>• <strong>Permanently delete</strong> the source organization</li>
                  </ul>
                </div>
                
                <p className="font-medium text-red-600">
                  This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMerging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleMerge()
              }}
              disabled={isMerging}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isMerging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                'Yes, Merge Organizations'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

