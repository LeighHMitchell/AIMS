"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertTriangle,
  Copy,
  Check,
  HelpCircle,
  X,
  Mail,
  Phone,
  Globe,
  MapPin,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  Merge,
  Building2,
  Loader2
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Flag from 'react-world-flags'
import { IATIBudgetManager } from './IATIBudgetManager'
import { IATIDocumentManager } from './IATIDocumentManager'
import IATIImportPreferences from './IATIImportPreferences'
import { StringArrayInput } from '@/components/ui/string-array-input'
import { OrganizationBannerUpload, OrganizationLogoUpload } from '@/components/ui/enhanced-image-upload'
import { IATI_COUNTRIES } from '@/data/iati-countries'
import { 
  INSTITUTIONAL_GROUPS, 
  getAllInstitutionalGroupNames,
  isInstitutionalGroup,
  type InstitutionalGroup 
} from '@/data/location-groups'
import { OrganizationCombobox, Organization as ComboboxOrganization } from '@/components/ui/organization-combobox'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { LabelSaveIndicator } from '@/components/ui/save-indicator'
import { useOrganizationAutosave } from '@/hooks/use-organization-autosave'

// Combine all options for validation (countries + institutional groups)
const ALL_COUNTRY_AND_REGION_CODES = [
  ...IATI_COUNTRIES.map(c => c.code),
  ...IATI_COUNTRIES.map(c => c.name),
  ...getAllInstitutionalGroupNames(),
  'Myanmar', 'Burma', 'Rwanda',
  // Legacy support for old "Global or Regional" value
  'Global or Regional',
  // Legacy support for country name variations
  'United States',
  'United Kingdom'
]

// Default organization types
export const DEFAULT_ORGANIZATION_TYPES = [
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

// Myanmar-specific cooperation modality calculation
export const deriveCooperationModality = (orgTypeCode: string, country: string): string => {
  const typeCode = orgTypeCode?.trim();
  const countryValue = country?.trim().toLowerCase();
  
  // Check if it's an institutional group (multilateral organization)
  const isInstitutional = isInstitutionalGroup(country);
  
  // Also check for legacy "Global or Regional" value
  const isLegacyGlobal = countryValue === 'global or regional' || 
    countryValue?.includes('global') || 
    countryValue?.includes('regional');

  if (isInstitutional || isLegacyGlobal) {
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
export const getPartnerClassification = (orgTypeCode: string, location: string): string => {
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
export const validateOrganizationForm = (data: any) => {
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

export interface OrganizationType {
  code: string
  label: string
  description: string
  is_active: boolean
  sort_order: number
}

export interface Organization {
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
  logo_scale?: number
  banner?: string
  banner_position?: number
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
  twitter?: string
  facebook?: string
  linkedin?: string
  instagram?: string
  youtube?: string
  [key: string]: any
}

export interface OrganizationFormContentProps {
  organization: Organization | null
  /** 'inline' for page layout, 'modal' for dialog layout */
  renderMode: 'inline' | 'modal'
  /** Called when form data should be saved */
  onSave?: (data: Partial<Organization>) => Promise<void>
  /** Called after successful save */
  onSuccess?: () => void
  /** Called when delete is requested */
  onDelete?: (org: Organization) => void
  /** Pre-select an organization to merge (opens to Aliases tab) */
  initialMergeSourceOrgId?: string
  /** Start on a specific tab when opening */
  initialTab?: string
  /** For modal mode: called when modal should close */
  onCancel?: () => void
  /** Whether the form is currently saving */
  externalSaving?: boolean
  /** Called to navigate to next section (for Save and Next) */
  onNextSection?: () => void
}

export function OrganizationFormContent({
  organization,
  renderMode,
  onSave,
  onSuccess,
  onDelete,
  initialMergeSourceOrgId,
  initialTab,
  onCancel,
  externalSaving,
  onNextSection
}: OrganizationFormContentProps) {
  const [formData, setFormData] = useState<Partial<Organization>>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [organizationTypes, setOrganizationTypes] = useState<OrganizationType[]>(DEFAULT_ORGANIZATION_TYPES)
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [activeTab, setActiveTab] = useState(initialTab || 'basic')
  const [iatiBudgets, setIatiBudgets] = useState<any[]>([])
  const [iatiDocuments, setIatiDocuments] = useState<any[]>([])
  const [showIatiImport, setShowIatiImport] = useState(false)
  const [countrySearchTerm, setCountrySearchTerm] = useState('')
  const [countrySelectOpen, setCountrySelectOpen] = useState(false)
  
  // Merge organization state
  const [allOrganizations, setAllOrganizations] = useState<ComboboxOrganization[]>([])
  const [mergeSourceOrgId, setMergeSourceOrgId] = useState<string | null>(initialMergeSourceOrgId || null)
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
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Get organization ID for autosave
  const organizationId = organization?.id

  // Autosave hooks for each field (only active when editing existing organization)
  const nameAutosave = useOrganizationAutosave('name', { 
    organizationId, 
    debounceMs: 1000,
    enabled: !!organizationId 
  })
  const acronymAutosave = useOrganizationAutosave('acronym', { 
    organizationId, 
    debounceMs: 1000,
    enabled: !!organizationId 
  })
  const descriptionAutosave = useOrganizationAutosave('description', { 
    organizationId, 
    debounceMs: 2000,
    enabled: !!organizationId 
  })
  const orgTypeAutosave = useOrganizationAutosave('organisation_type', { 
    organizationId, 
    debounceMs: 500,
    enabled: !!organizationId,
    showToast: true
  })
  const countryAutosave = useOrganizationAutosave('country', { 
    organizationId, 
    debounceMs: 500,
    enabled: !!organizationId,
    showToast: true
  })
  const iatiOrgIdAutosave = useOrganizationAutosave('iati_org_id', { 
    organizationId, 
    debounceMs: 1000,
    enabled: !!organizationId 
  })
  const defaultCurrencyAutosave = useOrganizationAutosave('default_currency', { 
    organizationId, 
    debounceMs: 500,
    enabled: !!organizationId,
    showToast: true
  })
  const defaultLanguageAutosave = useOrganizationAutosave('default_language', { 
    organizationId, 
    debounceMs: 500,
    enabled: !!organizationId,
    showToast: true
  })
  const websiteAutosave = useOrganizationAutosave('website', { 
    organizationId, 
    debounceMs: 1500,
    enabled: !!organizationId 
  })
  const emailAutosave = useOrganizationAutosave('email', { 
    organizationId, 
    debounceMs: 1500,
    enabled: !!organizationId 
  })
  const phoneAutosave = useOrganizationAutosave('phone', { 
    organizationId, 
    debounceMs: 1500,
    enabled: !!organizationId 
  })
  const addressAutosave = useOrganizationAutosave('address', { 
    organizationId, 
    debounceMs: 2000,
    enabled: !!organizationId 
  })
  // Social media autosave hooks
  const twitterAutosave = useOrganizationAutosave('twitter', { 
    organizationId, 
    debounceMs: 1500,
    enabled: !!organizationId 
  })
  const facebookAutosave = useOrganizationAutosave('facebook', { 
    organizationId, 
    debounceMs: 1500,
    enabled: !!organizationId 
  })
  const linkedinAutosave = useOrganizationAutosave('linkedin', { 
    organizationId, 
    debounceMs: 1500,
    enabled: !!organizationId 
  })
  const instagramAutosave = useOrganizationAutosave('instagram', { 
    organizationId, 
    debounceMs: 1500,
    enabled: !!organizationId 
  })
  const youtubeAutosave = useOrganizationAutosave('youtube', { 
    organizationId, 
    debounceMs: 1500,
    enabled: !!organizationId 
  })

  const isSaving = saving || externalSaving

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
      console.error('[FormContent] Error fetching organization types:', error)
      setOrganizationTypes(DEFAULT_ORGANIZATION_TYPES)
    } finally {
      setLoadingTypes(false)
    }
  }

  // Fetch organization types on mount
  useEffect(() => {
    fetchOrganizationTypes()
  }, [])

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
        logo_scale: organization.logo_scale ?? 100,
        banner: organization.banner || '',
        banner_position: organization.banner_position ?? 50,
        website: organization.website || '',
        email: organization.email || '',
        phone: organization.phone || '',
        address: organization.address || '',
        // Alias fields
        alias_refs: organization.alias_refs || [],
        name_aliases: organization.name_aliases || [],
        // Social media fields
        twitter: organization.twitter || '',
        facebook: organization.facebook || '',
        linkedin: organization.linkedin || '',
        instagram: organization.instagram || '',
        youtube: organization.youtube || '',
        // IATI fields
        reporting_org_ref: organization.reporting_org_ref || '',
        reporting_org_type: organization.reporting_org_type || '',
        reporting_org_name: organization.reporting_org_name || '',
        reporting_org_secondary_reporter: organization.reporting_org_secondary_reporter || false,
        last_updated_datetime: organization.last_updated_datetime || undefined,
        default_currency: organization.default_currency || 'USD',
        default_language: organization.default_language || 'en'
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
        logo_scale: 100,
        banner: '',
        banner_position: 50,
        website: '',
        email: '',
        phone: '',
        alias_refs: [],
        name_aliases: [],
        address: '',
        // Social media fields
        twitter: '',
        facebook: '',
        linkedin: '',
        instagram: '',
        youtube: '',
        // IATI fields
        reporting_org_ref: '',
        reporting_org_type: '',
        reporting_org_name: '',
        reporting_org_secondary_reporter: false,
        last_updated_datetime: undefined,
        default_currency: 'USD',
        default_language: 'en'
      })
      setValidationErrors([])
    }
  }, [organization])

  // Set initial tab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    } else if (initialMergeSourceOrgId) {
      setActiveTab('aliases')
      setMergeSourceOrgId(initialMergeSourceOrgId)
    }
  }, [initialTab, initialMergeSourceOrgId])

  const handleInputChange = (field: string, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
    
    // Trigger autosave for the changed field (only for existing organizations)
    if (organizationId) {
      const autosaveMap: Record<string, { triggerSave: (value: any) => void }> = {
        name: nameAutosave,
        acronym: acronymAutosave,
        description: descriptionAutosave,
        Organisation_Type_Code: orgTypeAutosave,
        country_represented: countryAutosave,
        iati_org_id: iatiOrgIdAutosave,
        default_currency: defaultCurrencyAutosave,
        default_language: defaultLanguageAutosave,
        website: websiteAutosave,
        email: emailAutosave,
        phone: phoneAutosave,
        address: addressAutosave,
        twitter: twitterAutosave,
        facebook: facebookAutosave,
        linkedin: linkedinAutosave,
        instagram: instagramAutosave,
        youtube: youtubeAutosave,
      }
      
      // Map form field names to database field names for autosave
      const fieldMapping: Record<string, string> = {
        Organisation_Type_Code: 'organisation_type',
        country_represented: 'country',
      }
      
      const autosave = autosaveMap[field]
      if (autosave) {
        // Use mapped field name for the value if needed
        autosave.triggerSave(value)
      }
    }
  }

  const handleSave = async () => {
    const derivedModality = deriveCooperationModality(
      formData.Organisation_Type_Code || '', 
      formData.country_represented || ''
    )
    
    // Clean up the data before sending
    const dataToSave: any = {
      ...formData,
      id: organization?.id,
      cooperation_modality: derivedModality
    }
    
    // Remove undefined values and convert to null for timestamp fields
    if (dataToSave.last_updated_datetime === undefined || dataToSave.last_updated_datetime === '') {
      delete dataToSave.last_updated_datetime
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
        
        toast.success('Organization updated successfully')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update organization'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndNext = async () => {
    await handleSave()
    // Only navigate to next if save was successful (no validation errors)
    if (validationErrors.length === 0 && onNextSection) {
      onNextSection()
    }
  }

  const handleDelete = () => {
    if (organization && onDelete) {
      onDelete(organization)
    }
  }

  const copyToClipboard = async (text: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      if (id) {
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
      }
      toast.success('Copied to clipboard')
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Failed to copy')
    }
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

  // Fetch all organizations for merge dropdown (when on Aliases or Merge tab)
  useEffect(() => {
    if ((activeTab === 'aliases' || activeTab === 'merge') && organization?.id) {
      const fetchOrganizations = async () => {
        try {
          const response = await fetch('/api/organizations')
          if (response.ok) {
            const data = await response.json()
            // Filter out the current organization and map to ComboboxOrganization format
            const filtered = (data || [])
              .filter((org: any) => org.id !== organization.id)
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
          console.error('[FormContent] Error fetching organizations for merge:', error)
        }
      }
      fetchOrganizations()
    }
  }, [activeTab, organization?.id])

  // Fetch merge preview when source org is selected
  useEffect(() => {
    if (mergeSourceOrgId && organization?.id) {
      const fetchMergePreview = async () => {
        setLoadingMergePreview(true)
        try {
          const response = await fetch(
            `/api/organizations/merge/preview?sourceOrgId=${mergeSourceOrgId}&targetOrgId=${organization.id}`
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
          console.error('[FormContent] Error fetching merge preview:', error)
          toast.error('Failed to load merge preview')
        } finally {
          setLoadingMergePreview(false)
        }
      }
      fetchMergePreview()
    } else {
      setMergePreview(null)
    }
  }, [mergeSourceOrgId, organization?.id])

  // Execute merge operation
  const handleMerge = async () => {
    if (!mergeSourceOrgId || !organization?.id) return
    
    setIsMerging(true)
    try {
      const response = await fetch('/api/organizations/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceOrgId: mergeSourceOrgId,
          targetOrgId: organization.id,
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

  const isCreating = !organization

  // Render the form tabs content
  const renderTabsContent = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
      {/* Only show tab list in modal mode - inline mode uses sidebar navigation */}
      {renderMode === 'modal' && (
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="basic">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="contact">Social & Web</TabsTrigger>
          <TabsTrigger value="aliases">Aliases</TabsTrigger>
          <TabsTrigger value="budgets">IATI Budgets</TabsTrigger>
          <TabsTrigger value="documents">IATI Documents</TabsTrigger>
          <TabsTrigger value="iati-prefs">IATI Import</TabsTrigger>
        </TabsList>
      )}

      {/* General Tab */}
      <TabsContent value="basic" className="h-full overflow-y-auto px-2 mt-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name (Required) */}
          <div className="space-y-2">
            <LabelSaveIndicator
              isSaving={nameAutosave.state.isSaving}
              isSaved={!!nameAutosave.state.lastSaved}
              hasValue={!!formData.name}
            >
              Name <span className="text-red-500">*</span>
            </LabelSaveIndicator>
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
            <LabelSaveIndicator
              isSaving={acronymAutosave.state.isSaving}
              isSaved={!!acronymAutosave.state.lastSaved}
              hasValue={!!formData.acronym}
            >
              Acronym / Short Name <span className="text-red-500">*</span>
            </LabelSaveIndicator>
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
              onValueChange={(value) => {
                handleInputChange('country_represented', value)
                setCountrySearchTerm('')
              }}
              open={countrySelectOpen}
              onOpenChange={setCountrySelectOpen}
            >
              <SelectTrigger className={validationErrors.some(e => e.includes('Location Represented')) ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select country or institution">
                  {formData.country_represented && (
                    <div className="flex items-center gap-2">
                      {(() => {
                        // Check if it's a country
                        const country = IATI_COUNTRIES.find(c => c.name === formData.country_represented)
                        if (country) {
                          return (
                            <>
                              <Flag code={country.code} className="h-4 w-6 object-cover rounded" />
                              <span>{formData.country_represented}</span>
                            </>
                          )
                        }
                        // Check if it's an institutional group
                        if (isInstitutionalGroup(formData.country_represented)) {
                          // Special case for United Nations - show UN flag
                          if (formData.country_represented === 'United Nations') {
                            return (
                              <>
                                <img src="/images/flags/united-nations.svg" alt="UN Flag" className="h-4 w-6 object-cover rounded" />
                                <span>{formData.country_represented}</span>
                              </>
                            )
                          }
                          // Special case for European Union Institutions - show EU flag
                          if (formData.country_represented === 'European Union Institutions') {
                            return (
                              <>
                                <img src="/images/flags/european-union.svg" alt="EU Flag" className="h-4 w-6 object-cover rounded" />
                                <span>{formData.country_represented}</span>
                              </>
                            )
                          }
                          return (
                            <>
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{formData.country_represented}</span>
                            </>
                          )
                        }
                        // Fallback for legacy or unknown values
                        return <span>{formData.country_represented}</span>
                      })()}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                {/* Search Box */}
                <div className="px-2 pb-2 border-b sticky top-0 bg-white z-10">
                  <Input
                    placeholder="Search countries or institutions..."
                    value={countrySearchTerm}
                    onChange={(e) => setCountrySearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="h-8"
                    autoFocus
                  />
                </div>

                {(() => {
                  const searchLower = countrySearchTerm.toLowerCase()
                  
                  // Filter institutional groups (parent groups only)
                  const filteredInstitutionalGroups = INSTITUTIONAL_GROUPS.filter(group =>
                    group.name.toLowerCase().includes(searchLower) ||
                    (group.description?.toLowerCase().includes(searchLower) ?? false)
                  )
                  
                  // Filter countries
                  const filteredCountries = IATI_COUNTRIES.filter(country =>
                    !country.withdrawn && (
                      country.name.toLowerCase().includes(searchLower) ||
                      country.code.toLowerCase().includes(searchLower)
                    )
                  )

                  const hasInstitutionalResults = filteredInstitutionalGroups.length > 0
                  const hasCountryResults = filteredCountries.length > 0

                  return (
                    <>
                      {/* Institutional Groups */}
                      {hasInstitutionalResults && (
                        <>
                          <div className="px-2 py-1.5 text-sm font-semibold text-gray-600 bg-gray-50">
                            Institutional Groups
                          </div>
                          {filteredInstitutionalGroups.map((group) => (
                            <SelectItem key={group.code} value={group.name} className="font-medium">
                              <div className="flex items-center gap-2">
                                {group.name === 'United Nations' ? (
                                  <img src="/images/flags/united-nations.svg" alt="UN Flag" className="h-4 w-6 object-cover rounded flex-shrink-0" />
                                ) : group.name === 'European Union Institutions' ? (
                                  <img src="/images/flags/european-union.svg" alt="EU Flag" className="h-4 w-6 object-cover rounded flex-shrink-0" />
                                ) : (
                                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <span>{group.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                          {hasCountryResults && <div className="my-1 border-t" />}
                        </>
                      )}

                      {/* Country Options */}
                      {hasCountryResults && (
                        <>
                          <div className="px-2 py-1.5 text-sm font-semibold text-gray-600 bg-gray-50">
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

                      {/* No Results */}
                      {!hasInstitutionalResults && !hasCountryResults && (
                        <div className="px-2 py-6 text-center text-sm text-gray-500">
                          No results found for "{countrySearchTerm}"
                        </div>
                      )}
                    </>
                  )
                })()}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select a country for bilateral agencies, or an institutional group for multilateral organizations
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
          <LabelSaveIndicator
            isSaving={descriptionAutosave.state.isSaving}
            isSaved={!!descriptionAutosave.state.lastSaved}
            hasValue={!!formData.description}
          >
            Description
          </LabelSaveIndicator>
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
            <LabelSaveIndicator
              isSaving={iatiOrgIdAutosave.state.isSaving}
              isSaved={!!iatiOrgIdAutosave.state.lastSaved}
              hasValue={!!formData.iati_org_id}
            >
              IATI Organisation Identifier
            </LabelSaveIndicator>
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
            <LabelSaveIndicator
              isSaving={defaultCurrencyAutosave.state.isSaving}
              isSaved={!!defaultCurrencyAutosave.state.lastSaved}
              hasValue={!!formData.default_currency}
            >
              Default Currency
            </LabelSaveIndicator>
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
                {[
                  { code: 'USD', name: 'US Dollar' },
                  { code: 'EUR', name: 'Euro' },
                  { code: 'GBP', name: 'British Pound' },
                  { code: 'JPY', name: 'Japanese Yen' },
                  { code: 'CAD', name: 'Canadian Dollar' },
                  { code: 'AUD', name: 'Australian Dollar' },
                  { code: 'CHF', name: 'Swiss Franc' },
                  { code: 'CNY', name: 'Chinese Yuan' },
                  { code: 'SEK', name: 'Swedish Krona' },
                  { code: 'NOK', name: 'Norwegian Krone' },
                  { code: 'DKK', name: 'Danish Krone' },
                ].map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{currency.code}</span>
                      <span>{currency.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Language */}
          <div className="space-y-2">
            <LabelSaveIndicator
              isSaving={defaultLanguageAutosave.state.isSaving}
              isSaved={!!defaultLanguageAutosave.state.lastSaved}
              hasValue={!!formData.default_language}
            >
              Default Language
            </LabelSaveIndicator>
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
                {[
                  { code: 'en', name: 'English' },
                  { code: 'fr', name: 'French' },
                  { code: 'es', name: 'Spanish' },
                  { code: 'de', name: 'German' },
                  { code: 'pt', name: 'Portuguese' },
                  { code: 'ar', name: 'Arabic' },
                  { code: 'zh', name: 'Chinese' },
                  { code: 'ru', name: 'Russian' },
                  { code: 'ja', name: 'Japanese' },
                  { code: 'ko', name: 'Korean' },
                ].map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{lang.code.toUpperCase()}</span>
                      <span>{lang.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

      </TabsContent>

      {/* Branding Tab */}
      <TabsContent value="branding" className="h-full overflow-y-auto px-2 mt-4 space-y-6">
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">Upload logos and banner images for your organization profile. Hover over images to reposition, replace, or remove them.</p>

          {/* Logo */}
          <div>
            <OrganizationLogoUpload
              value={formData.logo || ''}
              onChange={(value) => handleInputChange('logo', value)}
              scale={formData.logo_scale ?? 100}
              onScaleChange={(scale) => handleInputChange('logo_scale', scale)}
              disabled={saving || externalSaving}
            />
          </div>

          {/* Banner */}
          <div>
            <OrganizationBannerUpload
              value={formData.banner || ''}
              onChange={(value) => handleInputChange('banner', value)}
              position={formData.banner_position ?? 50}
              onPositionChange={(position) => handleInputChange('banner_position', position)}
              disabled={saving || externalSaving}
            />
          </div>
        </div>
      </TabsContent>

      {/* Social & Web Tab */}
      <TabsContent value="contact" className="h-full overflow-y-auto px-2 mt-4 space-y-6">
        {/* Contact Information Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <LabelSaveIndicator
                isSaving={emailAutosave.state.isSaving}
                isSaved={!!emailAutosave.state.lastSaved}
                hasValue={!!formData.email}
              >
                <Mail className="h-4 w-4 text-gray-500 mr-2" />
                Email
              </LabelSaveIndicator>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@organization.org"
              />
            </div>

            <div className="space-y-2">
              <LabelSaveIndicator
                isSaving={phoneAutosave.state.isSaving}
                isSaved={!!phoneAutosave.state.lastSaved}
                hasValue={!!formData.phone}
              >
                <Phone className="h-4 w-4 text-gray-500 mr-2" />
                Phone
              </LabelSaveIndicator>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <LabelSaveIndicator
                isSaving={websiteAutosave.state.isSaving}
                isSaved={!!websiteAutosave.state.lastSaved}
                hasValue={!!formData.website}
              >
                <Globe className="h-4 w-4 text-gray-500 mr-2" />
                Website
              </LabelSaveIndicator>
              <Input
                id="website"
                type="url"
                value={formData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.organization.org"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <LabelSaveIndicator
                isSaving={addressAutosave.state.isSaving}
                isSaved={!!addressAutosave.state.lastSaved}
                hasValue={!!formData.address}
              >
                <MapPin className="h-4 w-4 text-gray-500 mr-2" />
                Mailing Address
              </LabelSaveIndicator>
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
              <LabelSaveIndicator
                isSaving={twitterAutosave.state.isSaving}
                isSaved={!!twitterAutosave.state.lastSaved}
                hasValue={!!formData.twitter}
              >
                <Twitter className="h-4 w-4 text-gray-500 mr-2" />
                Twitter / X
              </LabelSaveIndicator>
              <Input
                id="twitter"
                value={formData.twitter || ''}
                onChange={(e) => handleInputChange('twitter', e.target.value)}
                placeholder="https://twitter.com/yourorg or @yourorg"
              />
            </div>

            <div className="space-y-2">
              <LabelSaveIndicator
                isSaving={facebookAutosave.state.isSaving}
                isSaved={!!facebookAutosave.state.lastSaved}
                hasValue={!!formData.facebook}
              >
                <Facebook className="h-4 w-4 text-gray-500 mr-2" />
                Facebook
              </LabelSaveIndicator>
              <Input
                id="facebook"
                value={formData.facebook || ''}
                onChange={(e) => handleInputChange('facebook', e.target.value)}
                placeholder="https://facebook.com/yourorg"
              />
            </div>

            <div className="space-y-2">
              <LabelSaveIndicator
                isSaving={linkedinAutosave.state.isSaving}
                isSaved={!!linkedinAutosave.state.lastSaved}
                hasValue={!!formData.linkedin}
              >
                <Linkedin className="h-4 w-4 text-gray-500 mr-2" />
                LinkedIn
              </LabelSaveIndicator>
              <Input
                id="linkedin"
                value={formData.linkedin || ''}
                onChange={(e) => handleInputChange('linkedin', e.target.value)}
                placeholder="https://linkedin.com/company/yourorg"
              />
            </div>

            <div className="space-y-2">
              <LabelSaveIndicator
                isSaving={instagramAutosave.state.isSaving}
                isSaved={!!instagramAutosave.state.lastSaved}
                hasValue={!!formData.instagram}
              >
                <Instagram className="h-4 w-4 text-gray-500 mr-2" />
                Instagram
              </LabelSaveIndicator>
              <Input
                id="instagram"
                value={formData.instagram || ''}
                onChange={(e) => handleInputChange('instagram', e.target.value)}
                placeholder="https://instagram.com/yourorg or @yourorg"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <LabelSaveIndicator
                isSaving={youtubeAutosave.state.isSaving}
                isSaved={!!youtubeAutosave.state.lastSaved}
                hasValue={!!formData.youtube}
              >
                <Youtube className="h-4 w-4 text-gray-500 mr-2" />
                YouTube
              </LabelSaveIndicator>
              <Input
                id="youtube"
                value={formData.youtube || ''}
                onChange={(e) => handleInputChange('youtube', e.target.value)}
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

      {/* Aliases Tab */}
      <TabsContent value="aliases" className="h-full overflow-y-auto px-2 mt-4 space-y-6">
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
          <StringArrayInput
            label="Legacy or Internal Codes"
            description="Alternative organization identifiers used in IATI data (e.g., 010712, KR-GOV-OLD)"
            placeholder="e.g., 010712, KR-MOFA-OLD"
            value={formData.alias_refs || []}
            onChange={(value) => handleInputChange('alias_refs', value)}
            id="alias_refs"
          />

          {/* Alternate Names */}
          <StringArrayInput
            label="Alternate Names"
            description="Other names this organization is known by in IATI data (e.g., KOICA, Korea Intern. Cooperation Agency)"
            placeholder="e.g., KOICA, Korea Intern. Cooperation Agency"
            value={formData.name_aliases || []}
            onChange={(value) => handleInputChange('name_aliases', value)}
            id="name_aliases"
          />
        </div>

        <div className="text-sm text-gray-500 border-t pt-4">
          <p className="font-medium mb-2">How Aliases Work:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>When importing IATI XML, AIMS checks organization references against these aliases</li>
            <li>If a match is found, the transaction or activity is automatically linked to this organization</li>
            <li>You can add new aliases anytime you encounter variations in imported data</li>
            <li>Aliases are case-insensitive and whitespace is trimmed automatically</li>
          </ul>
        </div>
      </TabsContent>

      {/* Merge Organizations Tab */}
      <TabsContent value="merge" className="h-full overflow-y-auto px-2 mt-4 space-y-6">
        {!isCreating ? (
          <>
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

            {/* Loading state */}
            {loadingMergePreview && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading impact preview...
              </div>
            )}

            {/* Merge Preview Card */}
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
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Save the organization first to access merge functionality</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="iati-prefs" className="h-full overflow-y-auto px-2 mt-4">
        <IATIImportPreferences organizationId={organization?.id} />
      </TabsContent>
    </Tabs>
  )

  // Render validation errors banner
  const renderValidationErrors = () => {
    if (validationErrors.length === 0) return null
    
    return (
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
    )
  }

  // Render save/cancel buttons
  const renderButtons = () => (
    <div className="flex justify-end gap-3">
      {onCancel && (
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
      )}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        variant="outline"
        className="px-6 py-3 text-base font-semibold"
      >
        {isSaving ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
            Saving...
          </>
        ) : (
          'Save'
        )}
      </Button>
      {onNextSection && (
        <Button
          variant="default"
          onClick={handleSaveAndNext}
          disabled={isSaving}
          className="px-6 py-3 text-base font-semibold min-w-[160px]"
        >
          {isSaving ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </>
          ) : (
            'Save & Next'
          )}
        </Button>
      )}
    </div>
  )

  // Render merge confirmation dialog (shared between modes)
  const renderMergeConfirmDialog = () => (
    <AlertDialog open={showMergeConfirm} onOpenChange={setShowMergeConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Confirm Organization Merge
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                You are about to merge <strong>{mergePreview?.sourceOrg.name}</strong> into{' '}
                <strong>{organization?.name}</strong>.
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
  )

  // Render IATI import dialog (shared between modes)
  const renderIatiImportDialog = () => (
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
              console.log('IATI import functionality not yet implemented');
              setShowIatiImport(false);
            }}
          >
            Import Organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // INLINE MODE: Render as a proper page layout
  if (renderMode === 'inline') {
    return (
      <>
        <div className="flex flex-col h-full">
          {/* Page Header - Only shown when creating */}
          {isCreating && (
            <div className="flex-shrink-0 px-6 py-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Add New Organization</h1>
                  <p className="text-sm text-muted-foreground mt-1">Create a new organization profile</p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="flex items-center gap-2 opacity-60"
                      >
                        <Globe className="h-4 w-4" />
                        Import from IATI
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>IATI Registry import coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="px-6 pt-4">
              {renderValidationErrors()}
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-6 pt-4 pb-20">
            {renderTabsContent()}
          </div>

          {/* Footer with Save Button - Fixed at bottom */}
          <footer className="fixed bottom-0 right-0 left-64 bg-transparent py-3 px-6 z-50">
            {renderButtons()}
          </footer>
        </div>

        {renderMergeConfirmDialog()}
        {renderIatiImportDialog()}
      </>
    )
  }

  // MODAL MODE: Render content for Dialog wrapper
  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="px-6 pt-4">
            {renderValidationErrors()}
          </div>
        )}

        {/* Tabs Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-6 py-4">
          {renderTabsContent()}
        </div>

        {/* Footer with Save Button - Floating */}
        <div className="flex-shrink-0 px-6 py-2 border-t">
          {renderButtons()}
        </div>
      </div>

      {renderMergeConfirmDialog()}
      {renderIatiImportDialog()}
    </>
  )
}

