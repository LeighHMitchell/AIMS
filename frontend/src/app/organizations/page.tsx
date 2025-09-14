"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { usePreCache } from '@/hooks/use-pre-cached-data'
import { AsyncErrorBoundary } from '@/components/errors/AsyncErrorBoundary'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Plus, Edit2, Eye, Trash2, ExternalLink, Globe, MapPin, Users, Activity, DollarSign, Building2, AlertTriangle, Copy, Upload, X, ImageIcon, Info, TableIcon, Grid3X3, Calendar, Mail, Phone, HelpCircle, User, Lock, MoreVertical } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import Flag from 'react-world-flags'
import { CreateCustomGroupModal } from '@/components/organizations/CreateCustomGroupModal'
import { EditCustomGroupModal } from '@/components/organizations/EditCustomGroupModal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from 'next/link'
import { OrganisationCardSkeleton } from '@/components/ui/skeleton-loader'
import { getCountryCode, getCountryFullName, COUNTRY_ISO_CODES } from '@/lib/country-utils'
// Using Button components for view toggle instead of ToggleGroup

// Performance constants
const ITEMS_PER_PAGE = 24  // Increased from 12 to show more organizations with compact design
const IMAGE_LOADING_DELAY = 100 // ms delay between image loads

// ISO 3166-1 alpha-2 country codes with names
const ISO_COUNTRIES = [
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
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo (Democratic Republic)' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
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
  { code: 'KI', name: 'Kiribati' },
  { code: 'KP', name: 'Korea (North)' },
  { code: 'KR', name: 'Korea (South)' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Lao PDR' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PS', name: 'Palestine' },
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
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syrian Arab Republic' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Viet Nam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' }
]

// IATI Region codes for global/regional options
const REGIONAL_OPTIONS = [
  { code: '998', name: 'Global or Regional', isRegion: true }
]

// Combine all options for validation
const ALL_COUNTRY_AND_REGION_CODES = [
  ...ISO_COUNTRIES.map(c => c.code),
  ...ISO_COUNTRIES.map(c => c.name), // Support both code and name for backward compatibility
  ...REGIONAL_OPTIONS.map(r => r.code),
  ...REGIONAL_OPTIONS.map(r => r.name),
  // Legacy support for full country names
  'Myanmar', 'Burma', 'Rwanda',
  // Also support the new format
  'Global or Regional'
]

// Tag definitions with tooltips
const TAG_DEFINITIONS: Record<string, string> = {
  'Government': 'National government ministries, departments, and agencies',
  'Local Government': 'Subnational government entities including states, regions, and municipalities',
  'Other Public Sector': 'Public institutions outside core government (e.g., state enterprises, public universities)',
  'International NGO': 'Non-governmental organizations operating across multiple countries',
  'National NGO': 'Non-governmental organizations operating within a single country',
  'Regional NGO': 'Non-governmental organizations operating within a specific region',
  'Partner Country based NGO': 'Local civil society organizations in the recipient country',
  'Public Private Partnership': 'Joint ventures between government and private sector entities',
  'Multilateral': 'Organizations composed of multiple countries contributing jointly to development financing',
  'Foundation': 'Philanthropic organizations providing grants for development',
  'Private Sector': 'For-profit businesses and commercial entities',
  'Academic, Training and Research': 'Universities, research institutes, and training organizations',
  'Other': 'Organizations not fitting into standard categories',
  'External': 'Partners based outside Myanmar providing development assistance',
  'Internal': 'Partners based within Myanmar',
  'Regional': 'Partners operating at a regional level (e.g., ASEAN, Asian Development Bank)'
}

// Country to ISO code mapping is now imported from @/lib/country-utils

// Custom hook for intersection observer
const useIntersectionObserver = (
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
): boolean => {
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    const element = ref.current
    if (!element || !window.IntersectionObserver) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    })

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [ref, options])

  return isIntersecting
}

// Organization interface matching Supabase schema
interface Organization {
  id: string
  name: string
  acronym?: string
  organisation_type: string
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
  created_at: string
  updated_at: string
  // Computed fields
  activeProjects: number
  totalBudgeted?: number
  totalDisbursed?: number
  displayName: string
  derived_category?: string
  // Project breakdown
  projectsByStatus?: {
    active: number
    pipeline: number
    completed: number
    cancelled: number
  }
  lastProjectActivity?: string
  totalDisbursement?: number
}

// Organization Type interface for dropdown
interface OrganizationType {
  code: string
  label: string
  description: string
  is_active: boolean
  sort_order: number
}

// Summary statistics interface
interface OrganizationSummary {
  totalOrganizations: number
  totalActiveProjects: number
  totalCommittedFunding: number
  totalCustomGroups: number
  lastUpdated: string
}

// Myanmar-specific cooperation modality calculation with debugging
const deriveCooperationModality = (orgTypeCode: string, country: string): string => {
  const typeCode = orgTypeCode?.trim();
  const countryValue = country?.trim().toLowerCase();
  
  // Debug logging for development
  console.log('[Cooperation Modality] Input Debug:', {
    originalOrgTypeCode: orgTypeCode,
    originalCountry: country,
    normalizedTypeCode: typeCode,
    normalizedCountry: countryValue
  })

  // Check if it's a regional option
  const isRegional = REGIONAL_OPTIONS.some(r => 
    r.name.toLowerCase() === countryValue || 
    r.code === country
  )

  let result: string;

  // Updated logic to work with type codes and regional options
  if (isRegional || countryValue === 'global or regional' || countryValue?.includes('global') || countryValue?.includes('regional')) {
    result = 'Global or Regional';
    console.log('[Cooperation Modality] Rule: Regional/Global → Global or Regional');
  } else if (typeCode === '10' && countryValue !== 'myanmar') {
    // Government (code 10) from foreign country
    result = 'External';
    console.log('[Cooperation Modality] Rule: Government (10) + Foreign Country → External');
  } else if (['22', '40'].includes(typeCode)) {
    // Multilateral (22) or Academic/Research (40)
    result = 'Global or Regional';
    console.log('[Cooperation Modality] Rule: Multilateral/Academic → Global or Regional');
  } else if (typeCode === '15' && countryValue === 'myanmar') {
    // NGO (code 15) based in Myanmar
    result = 'Internal';
    console.log('[Cooperation Modality] Rule: NGO (15) + Myanmar → Internal');
  } else if (typeCode === '23') {
    // Bilateral (code 23) - typically external
    result = 'External';
    console.log('[Cooperation Modality] Rule: Bilateral (23) → External');
  } else if (countryValue === 'myanmar') {
    // Any other organization based in Myanmar
    result = 'Internal';
    console.log('[Cooperation Modality] Rule: Myanmar-based → Internal');
  } else {
    result = 'Other';
    console.log('[Cooperation Modality] Rule: Default → Other');
  }

  console.log('[Cooperation Modality] Final Result:', {
    orgTypeCode: orgTypeCode,
    country: country,
    derivedModality: result
  });

  return result;
}

// Derive Category based on organization type and country
const deriveCategory = (orgTypeCode: string, country: string): string => {
  const c = country?.toLowerCase()?.trim();
  const isMyanmar = c === "myanmar";
  
  // Check if it's a regional/global option
  const isRegional = REGIONAL_OPTIONS.some(r => 
    r.name.toLowerCase() === c || 
    r.code === country
  )
  const isGlobal = c?.includes("global") || c?.includes("regional") || isRegional || c === "global or regional";

  switch (orgTypeCode) {
    case "10": // Government
      if (isMyanmar) return "National Government";
      if (isGlobal) return "Intergovernmental / Regional Body";
      return "External Government";
    case "11":
      return isMyanmar ? "Subnational Government" : "External Subnational Government";
    case "15":
      if (isMyanmar) return "Other National Public Sector";
      if (isGlobal) return "Other Public Sector (Global)";
      return "Other External Public Sector";
    case "21": case "22": case "23": case "24":
      return isMyanmar ? "Local/Partner Country NGO" : "International/Regional NGO";
    case "30":
      return isMyanmar ? "PPP (Myanmar-based)" : (isGlobal ? "PPP (Global)" : "PPP (Foreign-based)");
    case "40":
      return "Multilateral";
    case "60":
      return isMyanmar ? "Domestic Foundation" : (isGlobal ? "Global Foundation" : "Foreign Foundation");
    case "70": case "71": case "72": case "73":
      return isMyanmar ? "Domestic Private Sector" : (isGlobal ? "Private Sector (Global)" : "Foreign Private Sector");
    case "80":
      return isMyanmar ? "Myanmar Academic Institution" : (isGlobal ? "Academic Institution (Global)" : "Foreign Academic Institution");
    case "90":
      return isMyanmar ? "Other (Myanmar)" : (isGlobal ? "Other (Global)" : "Other (External)");
    default:
      return "Uncategorised";
  }
}

// Get organization type label from code
const getOrganizationTypeLabel = (typeCode: string, availableTypes: OrganizationType[]): string => {
  const type = availableTypes.find(t => t.code === typeCode);
  return type?.label || typeCode;
}

// Get Partner Classification based on IATI-aligned logic
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

// Get tab category for organization filtering
const getTabCategory = (orgTypeCode: string, location: string): string => {
  const isMyanmar = location?.toLowerCase() === "myanmar";
  const typeCode = parseInt(orgTypeCode) || 0;

  if (typeCode === 10 && !isMyanmar) return "bilateral";
  if ((typeCode === 10 || typeCode === 11) && isMyanmar) return "partner_gov";
  if (typeCode === 40) return "multilateral";
  if ([30, 60, 70, 71, 72, 73].includes(typeCode)) return "private_sector";
  if (typeCode === 21 && !isMyanmar) return "ingo";
  if ([22, 23, 24].includes(typeCode) || (typeCode === 21 && isMyanmar)) return "csos";
  if (typeCode === 15) return "other_public";

  return "other_public"; // fallback
}

// Cooperation Modality options
const COOPERATION_MODALITY_OPTIONS = [
  { value: 'Global or Regional', label: 'Global or Regional' },
  { value: 'Regional', label: 'Regional' },
  { value: 'External', label: 'External' },
  { value: 'Internal', label: 'Internal' },
  { value: 'Other', label: 'Other' }
]

// Country options now use ISO_COUNTRIES and REGIONAL_OPTIONS defined above

// Default organization types (will be fetched from API)
const DEFAULT_ORGANIZATION_TYPES: OrganizationType[] = [
  { code: '10', label: 'Government', description: 'National governments (donor or recipient), including central aid coordination bodies', is_active: true, sort_order: 1 },
  { code: '11', label: 'Local Government', description: 'Sub-national public authorities such as provincial or municipal governments', is_active: true, sort_order: 2 },
  { code: '15', label: 'Other Public Sector', description: 'Government-linked bodies that are neither central nor local government', is_active: true, sort_order: 3 },
  { code: '21', label: 'International NGO', description: 'NGOs operating across countries or internationally affiliated', is_active: true, sort_order: 4 },
  { code: '22', label: 'National NGO', description: 'NGOs operating only within one country', is_active: true, sort_order: 5 },
  { code: '23', label: 'Partner Country based NGO', description: 'Local CSOs and NGOs operating in the aid recipient country', is_active: true, sort_order: 6 },
  { code: '30', label: 'Regional Organisation', description: 'Organisations representing a defined group of countries', is_active: true, sort_order: 7 },
  { code: '31', label: 'Public Private Partnership', description: 'Hybrid organisations involving both government and private sector', is_active: true, sort_order: 8 },
  { code: '40', label: 'Multilateral', description: 'Organisations with multiple member states (e.g., UN agencies, MDBs)', is_active: true, sort_order: 9 },
  { code: '60', label: 'Foundation', description: 'Philanthropic or grant-making organisations', is_active: true, sort_order: 10 },
  { code: '71', label: 'Private Sector in Provider Country', description: 'Private companies from a donor/provider country', is_active: true, sort_order: 11 },
  { code: '72', label: 'Private Sector in Aid Recipient Country', description: 'Private companies operating in a recipient country', is_active: true, sort_order: 12 },
  { code: '73', label: 'Private Sector in Third Country', description: 'Private companies from outside both donor and recipient countries', is_active: true, sort_order: 13 },
  { code: '80', label: 'Academic, Training and Research', description: 'Universities, training centres, or research institutions', is_active: true, sort_order: 14 },
  { code: '90', label: 'Other', description: 'Catch-all for organisations not listed above', is_active: true, sort_order: 15 }
]

// getCountryCode is now imported from @/lib/country-utils

// Format currency helper
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null || isNaN(amount)) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Format date to relative time
const formatRelativeDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
  
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Validation helper
const validateOrganizationForm = (data: Partial<Organization>) => {
  const errors: string[] = []
  
  if (!data.name?.trim()) {
    errors.push('Name is required')
  }
  
  if (!data.acronym?.trim()) {
    errors.push('Acronym / Short Name is required')
  }
  
  if (!data.organisation_type?.trim()) {
    errors.push('Organisation Type is required')
  }
  
  if (!data.country_represented?.trim()) {
    errors.push('Location Represented is required')
  }
  
  // Validate country code if provided
  if (data.country_represented?.trim()) {
    const country = data.country_represented.trim()
    if (!ALL_COUNTRY_AND_REGION_CODES.includes(country)) {
      errors.push(`Invalid country or region: ${country}`)
    }
  }
  
  return errors
}

// Truncate text to specified number of lines
const TruncatedText: React.FC<{ text: string; maxLines: number; className?: string }> = ({ text, maxLines, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = React.useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(window.getComputedStyle(textRef.current).lineHeight)
      const height = textRef.current.scrollHeight
      const lines = Math.round(height / lineHeight)
      setIsTruncated(lines > maxLines)
    }
  }, [text, maxLines])

  return (
    <div>
      <p
        ref={textRef}
        className={`${className} ${!isExpanded && isTruncated ? `line-clamp-${maxLines}` : ''}`}
        style={!isExpanded && isTruncated ? { 
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        } : {}}
      >
        {text}
      </p>
      {isTruncated && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm mt-1"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

// Drag and Drop Image Upload Component (styled like activity editor)
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    setUploading(true)

    try {
      // Create preview and data URL
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
    toast.success(`${label} removed`)
  }

  // Update preview when value changes externally
  useEffect(() => {
    setPreview(value || null)
  }, [value])

  // Same height but different widths for logo vs banner
  const containerClass = isLogo 
    ? 'h-32 w-32 mx-auto' // Square for logo (128px x 128px)
    : 'h-32 w-full' // Same height but full width for banner
  const iconSize = isLogo ? 'h-8 w-8' : 'h-10 w-10'
  const objectFit = isLogo ? 'object-contain' : 'object-cover'
  const bgColor = isLogo ? 'bg-gray-50' : 'bg-gray-100'

  if (preview) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className={`relative ${containerClass} rounded-lg overflow-hidden group border ${bgColor}`}>
          <img
            src={preview}
            alt={label}
            className={`w-full h-full ${objectFit}`}
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-2">
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <Button size="sm" variant="secondary" disabled={uploading} className="px-3">
                <Upload className="h-4 w-4 mr-1.5" />
                <span className="whitespace-nowrap">Replace</span>
              </Button>
            </div>
            <Button size="sm" variant="destructive" onClick={removeImage} disabled={uploading} className="px-3">
              <X className="h-4 w-4 mr-1.5" />
              <span className="whitespace-nowrap">Delete</span>
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center">
          Recommended size: {recommendedSize}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div
        {...getRootProps()}
        className={`
          ${containerClass} border-2 border-dashed rounded-lg cursor-pointer transition-colors ${bgColor}
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4">
          <ImageIcon className={`${iconSize} mb-4`} />
          <p className="text-sm font-medium text-center">
            {isDragActive ? `Drop ${label.toLowerCase()}` : `Drag & drop`}
          </p>
          <p className="text-xs mt-2">or click to select</p>
          <p className="text-xs mt-3 text-gray-400">PNG, JPG, GIF up to 5MB</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center">
        Recommended size: {recommendedSize}
      </p>
    </div>
  )
}

// Edit Organization Profile Modal - Rebuilt with Myanmar Logic & Drag-and-Drop
const EditOrganizationModal: React.FC<{
  organization: Organization | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Organization>) => Promise<void>
  onDelete: (org: Organization) => void
}> = ({ organization, isOpen, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Partial<Organization>>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [organizationTypes, setOrganizationTypes] = useState<OrganizationType[]>(DEFAULT_ORGANIZATION_TYPES)
  const [loadingTypes, setLoadingTypes] = useState(false)

  // Fetch organization types from API
  const fetchOrganizationTypes = async () => {
    setLoadingTypes(true)
    try {
      const response = await fetch('/api/organization-types')
      if (response.ok) {
        const types = await response.json()
        setOrganizationTypes(types)
        console.log('[Modal] Loaded organization types from API:', types.length)
      } else {
        console.warn('[Modal] Failed to fetch organization types, using defaults')
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
    if (isOpen) {
      fetchOrganizationTypes()
    }
  }, [isOpen])

  // Reset form when organization changes
  useEffect(() => {
    if (organization) {
      console.log('[EditModal] Initializing form with organization data:', {
        id: organization.id,
        name: organization.name,
        acronym: organization.acronym,
        iati_org_id: organization.iati_org_id,
        country: organization.country,
        country_represented: organization.country_represented
      })
      
      setFormData({
        iati_org_id: organization.iati_org_id || '',
        id: organization.id,
        name: organization.name || '',
        acronym: organization.acronym || '',
        // Use country_represented first, only fallback to country if not set
        country_represented: organization.country_represented || organization.country || '',
        organisation_type: organization.organisation_type || '',
        cooperation_modality: organization.cooperation_modality || '',
        description: organization.description || '',
        logo: organization.logo || '',
        banner: organization.banner || '',
        website: organization.website || '',
        email: organization.email || '',
        phone: organization.phone || '',
        address: organization.address || ''
      })
      setValidationErrors([])
    } else {
      // Initialize empty form for creating new organization
      console.log('[EditModal] Initializing form for new organization')
      setFormData({
        iati_org_id: '',
        name: '',
        acronym: '',
        country_represented: '',
        organisation_type: '',
        cooperation_modality: '',
        description: '',
        logo: '',
        banner: '',
        website: '',
        email: '',
        phone: '',
        address: ''
      })
      setValidationErrors([])
    }
  }, [organization])

  // Clear form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setValidationErrors([])
      setSaving(false)
    }
  }, [isOpen])

  const handleInputChange = (field: keyof Organization, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  const handleSave = async () => {
    // Enhanced debug logging
    console.log('[OrganizationModal] Starting save process...');
    console.log('[OrganizationModal] Form data:', formData);
    console.log('[OrganizationModal] Organization ID:', organization?.id);
    
    // Derive cooperation modality based on organization type and country
    const derivedModality = deriveCooperationModality(
      formData.organisation_type || '', 
      formData.country_represented || ''
    )
    
    const dataToSave = {
      ...formData,
      id: organization?.id, // Include the organization ID!
      cooperation_modality: derivedModality
    }
    
    // Debug logging
    console.log('[OrganizationModal] Data to save:', dataToSave);
    console.log('[OrganizationModal] Country represented:', dataToSave.country_represented);
    console.log('[OrganizationModal] Is country in valid list?', ALL_COUNTRY_AND_REGION_CODES.includes(dataToSave.country_represented || ''));
    
    const errors = validateOrganizationForm(dataToSave)
    if (errors.length > 0) {
      setValidationErrors(errors)
      console.log('[OrganizationModal] Validation errors:', errors);
      return
    }
    
    console.log('[OrganizationModal] Validation passed, saving...');
    setSaving(true)
    setValidationErrors([])
    
    try {
      await onSave(dataToSave)
      onClose()
      toast.success('Organization updated successfully')
    } catch (error) {
      console.error('[OrganizationModal] Save error:', error)
      // Show more detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to update organization'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (organization) {
      onDelete(organization)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  // Auto-calculate cooperation modality based on Myanmar logic
  useEffect(() => {
    if (formData.organisation_type && formData.country_represented) {
      console.log('🚀 [Modal useEffect] Triggering cooperation modality calculation...')
      const calculatedModality = deriveCooperationModality(
        formData.organisation_type,
        formData.country_represented
      )
      console.log('📊 [Modal useEffect] Comparison:', {
        organisationType: formData.organisation_type,
        countryRepresented: formData.country_represented,
        calculatedModality,
        currentModality: formData.cooperation_modality,
        willUpdate: calculatedModality !== formData.cooperation_modality
      })
      if (calculatedModality !== formData.cooperation_modality) {
        console.log('🔄 [Modal useEffect] Updating cooperation_modality:', calculatedModality)
        setFormData(prev => ({ ...prev, cooperation_modality: calculatedModality }))
      }
    }
  }, [formData.organisation_type, formData.country_represented])

  const isCreating = !organization

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-6 px-2">
          {/* Section A: Identity & Classification */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Identity & Classification</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* IATI Organisation Identifier */}
              <div className="space-y-2">
                <Label htmlFor="iati_org_id" className="text-sm font-medium">IATI Organisation Identifier</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="iati_org_id"
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
              <div className="space-y-2">
                <Label htmlFor="uuid" className="text-sm font-medium">Organization UUID</Label>
                <div className="flex gap-2">
                  <Input
                    id="uuid"
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

              {/* Name (Required) */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name
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
                  Acronym / Short Name
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
                  Location Represented
                </Label>
                <Select 
                  key={`country-${organization?.id || 'new'}`}
                  value={formData.country_represented || ''} 
                  onValueChange={(value) => {
                    console.log('[Select] Country represented changed to:', value);
                    handleInputChange('country_represented', value)
                  }}
                >
                  <SelectTrigger className={validationErrors.some(e => e.includes('Location Represented')) ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select country or region">
                      {formData.country_represented && (
                        <span className="flex items-center gap-2">
                          {/* Show flag for countries */}
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
                <Label htmlFor="organisation_type" className="text-sm font-medium">
                  Organisation Type
                </Label>
                <Select 
                  value={formData.organisation_type || ''} 
                  onValueChange={(value) => handleInputChange('organisation_type', value)}
                  disabled={loadingTypes}
                >
                  <SelectTrigger 
                    className={`${validationErrors.some(e => e.includes('Organisation Type')) ? 'border-red-500' : ''} [&>span]:line-clamp-none [&>span]:whitespace-nowrap`}
                  >
                    <SelectValue placeholder={loadingTypes ? "Loading types..." : "Select organisation type"} />
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
                        <p>Indicates whether the organisation is internal (Myanmar-based), external (foreign), or global/regional. Useful for high-level reporting and coordination grouping.</p>
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
                        <p>A detailed, descriptive label combining organisation type and country. Examples: 'External Government', 'Local/Partner Country NGO', 'Foreign Foundation'.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="text-sm font-normal text-gray-700">
                    {formData.organisation_type && formData.country_represented 
                      ? getPartnerClassification(formData.organisation_type, formData.country_represented)
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
                placeholder="Danida is Denmark's aid agency, delivering development assistance with a focus on human rights and green transition."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          {/* Section B: Branding & Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Branding & Contact Information</h3>
            
            {/* Logo and Banner in single row with clear size difference */}
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

            {/* Contact Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-medium">Website</Label>
                <Input
                  id="website"
                  value={formData.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://www.dfat.gov.au"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="info@dfat.gov.au"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+61 2 6261 1111"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">Address</Label>
              <Textarea
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="R.G. Casey Building, John McEwen Crescent, Barton ACT 0221, Australia"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="flex-shrink-0 flex justify-between items-center pt-4 border-t">
          {!isCreating && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Organization
            </Button>
          )}
          {isCreating && <div />}
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {saving 
                ? (isCreating ? 'Creating...' : 'Updating...') 
                : (isCreating ? 'Create Organization' : 'Update Organization')
              }
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Delete Confirmation Modal
const DeleteConfirmationModal: React.FC<{
  organization: Organization | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}> = ({ organization, isOpen, onClose, onConfirm }) => {
  const [confirmationText, setConfirmationText] = useState('')
  const [deleting, setDeleting] = useState(false)
  
  const requiredText = organization?.acronym || organization?.name || ''
  const isConfirmationValid = confirmationText === requiredText

  const handleConfirm = async () => {
    if (!isConfirmationValid) return
    
    setDeleting(true)
    try {
      await onConfirm()
      onClose()
      setConfirmationText('')
      toast.success('Organization deleted successfully')
    } catch (error) {
      // Show the actual error message if available
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete organization'
      toast.error(errorMessage)
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setConfirmationText('')
    }
  }, [isOpen])

  if (!organization) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Delete Organization</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This action cannot be undone. This will permanently delete the organization 
              <strong> {organization.displayName}</strong> and remove all associated data.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              To confirm deletion, please type <strong>{requiredText}</strong> below:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={`Type "${requiredText}" to confirm`}
              className={confirmationText && !isConfirmationValid ? 'border-red-500' : ''}
            />
            {confirmationText && !isConfirmationValid && (
              <p className="text-sm text-red-600">
                Text does not match. Please type exactly: <strong>{requiredText}</strong>
              </p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!isConfirmationValid || deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper function to get organization type label from code
const getTypeLabel = (typeCode: string, availableTypes: OrganizationType[]): string => {
  const type = availableTypes.find(t => t.code === typeCode)
  return type?.label || typeCode || 'Unknown'
}

// Custom Group Card Component
const CustomGroupCard: React.FC<{
  group: any
  onEdit: (group: any) => void
  onDelete: (group: any) => void
}> = ({ group, onEdit, onDelete }) => {
  const router = useRouter()
  const [showFullDescription, setShowFullDescription] = useState(false)
  
  const handleView = () => {
    router.push(`/partners/groups/${group.id}`)
  }
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }
  
  return (
    <Card className={`bg-white border border-gray-300 hover:border-gray-400 hover:shadow-lg transition-all duration-300 ease-in-out h-full shadow-sm ${group.banner ? 'overflow-hidden' : ''} relative`}>
      {/* Banner Image */}
      {group.banner && (
        <div className="h-32 bg-gradient-to-r from-blue-500 to-teal-600 relative overflow-hidden flex-shrink-0">
          <img 
            src={group.banner} 
            alt={`${group.name} banner`}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Dropdown Menu - Absolutely positioned in bottom right */}
      <div className="absolute bottom-4 right-4 z-30">
        <DropdownMenu>
          <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-white hover:bg-gray-50 shadow-md border border-gray-300 rounded-full">
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-50">
            <DropdownMenuItem onClick={() => handleView()}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(group)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(group)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <CardContent className={`flex flex-col h-full ${group.banner ? 'p-6 pt-4' : 'p-6'}`}>
        <div className="flex items-start space-x-4 mb-4 cursor-pointer" onClick={handleView}>
          {/* Logo or default icon */}
          <div className="w-12 h-12 flex-shrink-0">
            {group.logo ? (
              <img 
                src={group.logo} 
                alt={`${group.name} logo`}
                className="w-12 h-12 object-contain rounded-lg border"
              />
            ) : (
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 leading-tight break-words">
              {group.name}
            </h3>
          </div>
        </div>
        
        {/* Description */}
        {group.description && (
          <div className="mb-3">
            <p className={`text-sm text-gray-600 ${showFullDescription ? '' : 'line-clamp-2'}`}>
              {group.description}
            </p>
            {group.description.length > 120 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowFullDescription(!showFullDescription)
                }}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1 font-medium"
              >
                {showFullDescription ? 'Read less' : 'Read more'}
              </button>
            )}
          </div>
        )}
        
        {/* Member Organizations */}
        {group.members && group.members.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Users className="h-4 w-4 mr-2 text-gray-400" />
              <span>{group.members.length} members</span>
            </div>
            <div className="space-y-1">
              {group.members.slice(0, 4).map((member: any, index: number) => (
                <div key={index} className="flex items-center space-x-2 text-xs text-gray-600">
                  <div className="w-4 h-4 flex-shrink-0">
                    {member.organization?.logo ? (
                      <img 
                        src={member.organization.logo} 
                        alt={`${member.organization.name} logo`}
                        className="w-4 h-4 object-contain rounded"
                      />
                    ) : (
                      <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center">
                        <Building2 className="h-2 w-2 text-blue-600" />
                      </div>
                    )}
                  </div>
                  <span className="truncate">
                    {member.organization?.name || member.organization_name || 'Unknown Organization'}
                    {member.organization?.acronym && member.organization.acronym !== member.organization.name && 
                      ` (${member.organization.acronym})`
                    }
                  </span>
                </div>
              ))}
              {group.members.length > 4 && (
                <div className="text-xs text-gray-500 pl-6">
                  +{group.members.length - 4} more organizations
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          {group.created_by_name && (
            <div className="flex items-center text-sm text-gray-600">
              <User className="h-4 w-4 mr-2 text-gray-400" />
              <span>Created by {group.created_by_name}</span>
            </div>
          )}
        </div>
        
        {/* Tags */}
        {group.tags && group.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {group.tags.slice(0, 3).map((tag: string, index: number) => (
              <Badge key={index} variant="amber" className="text-xs">
                {tag}
              </Badge>
            ))}
            {group.tags.length > 3 && (
              <Badge variant="amber" className="text-xs">
                +{group.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className={`mt-auto pt-4 pb-2 pr-12 ${group.banner ? 'border-t border-gray-200' : 'border-t border-gray-100'}`}>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>Updated {formatDate(group.updated_at)}</span>
            <div className="flex items-center space-x-1">
              {group.is_public ? (
                <Globe className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              <span>{group.is_public ? 'Public' : 'Private'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Organization Card Component with optimized image loading
const OrganizationCard: React.FC<{ 
  organization: Organization
  onEdit: (org: Organization) => void
  onDelete: (org: Organization) => void
  availableTypes: OrganizationType[]
  onTagClick: (tag: string) => void
}> = ({ organization, onEdit, onDelete, availableTypes, onTagClick }) => {
  const router = useRouter()
  const [showFullDescription, setShowFullDescription] = useState(false)

  const handleView = () => {
    router.push(`/organizations/${organization.id}`)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <Card 
      className="bg-white border border-gray-300 hover:border-gray-400 hover:shadow-lg transition-all duration-300 ease-in-out cursor-pointer overflow-hidden h-full flex flex-col shadow-sm"
      onClick={handleView}
    >
      {/* Banner Image */}
      <div className="h-32 bg-gradient-to-r from-blue-500 to-teal-600 relative overflow-hidden flex-shrink-0">
        {organization.banner ? (
          <img 
            src={organization.banner} 
            alt={`${organization.name} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-16 w-16 text-white/20" />
          </div>
        )}
        

      </div>

      <CardContent className="p-6 flex flex-col flex-grow relative">
        <div className="flex flex-col space-y-4 flex-grow">
          {/* Top section with logo and name */}
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              {organization.logo ? (
                <img 
                  src={organization.logo} 
                  alt={`${organization.name} logo`}
                  className="w-16 h-16 object-contain rounded-lg border bg-white p-1"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Organization Name and Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                {organization.name}
                {organization.acronym && (
                  <span className="text-gray-900 font-semibold ml-2">({organization.acronym})</span>
                )}
              </h3>
              
              {/* IATI ID */}
              <div className="flex items-center gap-1 mt-2">
                <p className="text-sm text-gray-500">
                  {organization.iati_org_id || 'No IATI identifier'}
                </p>
                {organization.iati_org_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(organization.iati_org_id || '')
                    }}
                    className="h-5 w-5 p-0"
                    title="Copy IATI ID"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Location Represented and Partner Classification Pills */}
              <div className="flex items-center gap-2 mt-1">
                {/* Location Represented Pill */}
                {(organization.country_represented || organization.country) && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {organization.country_represented || organization.country}
                  </span>
                )}
                
                {/* Partner Classification Pill */}
                {organization.organisation_type && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {getPartnerClassification(organization.organisation_type, organization.country_represented || organization.country || '')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {organization.description && (
            <div className="pt-3 border-t border-gray-200">
              <p className={`text-sm text-gray-600 ${showFullDescription ? '' : 'line-clamp-3'}`}>
                {organization.description}
              </p>
              {organization.description.length > 150 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFullDescription(!showFullDescription)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 font-medium"
                >
                  {showFullDescription ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* Statistics Section - Different for Government vs Development Partners */}
          <div className="border-t border-gray-200 pt-4">
            <div className="p-4 space-y-3">
            <div className="space-y-2">
              {/* Check if this is a government partner (types 10, 11, 15) */}
              {(['10', '11', '15'].includes(organization.organisation_type)) ? (
                // Government Partner Statistics
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500 tracking-wide">Organisation Type</span>
                    <span className="text-sm text-gray-700 font-medium">{getOrganizationTypeLabel(organization.organisation_type, availableTypes)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500 tracking-wide"># of Activities</span>
                    <span className="text-sm text-gray-700 font-medium">{organization.activeProjects || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500 tracking-wide">Budget Allocation Received</span>
                    <span className="text-sm text-gray-700">{formatCurrency(organization.totalBudgeted)}</span>
                  </div>
                </>
              ) : (
                // Development Partner Statistics (existing)
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500 tracking-wide">Activities Reported</span>
                    <span className="text-sm text-gray-700 font-medium">{organization.activeProjects || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500 tracking-wide">Total Budgeted</span>
                    <span className="text-sm text-gray-700">{formatCurrency(organization.totalBudgeted)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500 tracking-wide">Total Disbursed</span>
                    <span className="text-sm text-gray-700">{formatCurrency(organization.totalDisbursed)}</span>
                  </div>
                </>
              )}
            </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="pt-3 border-t border-gray-200 space-y-2">
            {organization.website && (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <a 
                  href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {organization.website}
                </a>
              </div>
            )}
            {organization.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <a 
                  href={`mailto:${organization.email}`}
                  className="text-sm text-blue-600 hover:text-blue-800 truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {organization.email}
                </a>
              </div>
            )}
            {organization.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-600 line-clamp-2">
                  {organization.address}
                </span>
              </div>
            )}
            {organization.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600">
                  {organization.phone}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>Updated {formatDate(organization.updated_at)}</span>
            <div className="flex items-center space-x-1">
              <Globe className="h-3 w-3" />
              <span>Public</span>
            </div>
          </div>
        </div>

        {/* Actions Dropdown - positioned at bottom right */}
        <div 
          className="absolute bottom-4 right-4" 
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 bg-white hover:bg-gray-50 shadow-md border border-gray-300 rounded-full"
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleView()}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(organization)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(organization)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

// Table View Component
const OrganizationListView: React.FC<{
  organizations: Organization[]
  onEdit: (org: Organization) => void
  onDelete: (org: Organization) => void
  availableTypes: OrganizationType[]
  onTagClick: (tag: string) => void
}> = ({ organizations, onEdit, onDelete, availableTypes, onTagClick }) => {
  const router = useRouter()

  return (
    <div className="space-y-2">
      {organizations.map((org) => (
        <div 
          key={org.id} 
          className="bg-white border border-gray-200 rounded-lg px-4 py-3 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Left section: Organization info */}
            <div 
              className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" 
              onClick={() => router.push(`/organizations/${org.id}`)}
            >
              {/* Organization Name */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">
                  {org.name}
                </h3>
              </div>

              {/* Acronym */}
              {org.acronym && (
                <div className="flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-900">
                    {org.acronym}
                  </span>
                </div>
              )}

              {/* IATI ID */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <p className="text-sm text-gray-500">
                  {org.iati_org_id || 'No IATI ID'}
                </p>
                {org.iati_org_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(org.iati_org_id || '')
                      toast.success('Copied to clipboard')
                    }}
                    className="h-5 w-5 p-0"
                    title="Copy IATI ID"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Right section: Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/organizations/${org.id}`)
                }}
                className="text-gray-600 hover:text-green-600"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(org)
                }}
                className="text-gray-600 hover:text-blue-600"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(org)
                }}
                className="text-gray-600 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Main Organizations Page Component
function OrganizationsPageContent() {
  // State management
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [availableTypes, setAvailableTypes] = useState<OrganizationType[]>(DEFAULT_ORGANIZATION_TYPES)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [summary, setSummary] = useState<OrganizationSummary | null>(null)
  const [activeTagFilters, setActiveTagFilters] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    // Load saved view mode from localStorage or default to 'card'
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('organizationViewMode')
      return saved === 'table' ? 'table' : 'card' // Always default to 'card' unless explicitly set to 'table'
    }
    return 'card'
  })
  const [mounted, setMounted] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [filteredOrganizations, setFilteredOrganizations] = useState<Organization[]>([])
  const [itemsPerPage] = useState(ITEMS_PER_PAGE)
  const [customGroups, setCustomGroups] = useState<any[]>([])
  const [loadingCustomGroups, setLoadingCustomGroups] = useState(false)
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false)
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  
  // AbortController refs for race condition prevention
  const mainFetchControllerRef = useRef<AbortController | null>(null)
  const typesControllerRef = useRef<AbortController | null>(null)
  const groupsControllerRef = useRef<AbortController | null>(null)
  
  // Pre-caching for better performance
  const { preCacheOrganizations } = usePreCache()
  
  // Initialize organizations pre-caching
  useEffect(() => {
    preCacheOrganizations().catch(console.warn)
  }, [preCacheOrganizations])

  // IATI-aligned tab definitions
  const IATI_TABS = [
    { label: "All", value: "all" },
    { label: "Bilateral Donors", value: "bilateral" },
    { label: "Multilaterals", value: "multilateral" },
    { label: "Government Partners", value: "partner_gov" },
    { label: "Private Sector", value: "private_sector" },
    { label: "INGOs", value: "ingo" },
    { label: "CSOs / Local NGOs", value: "csos" },
    { label: "Other Public Sector", value: "other_public" },
    { label: "Custom Groups", value: "custom_groups" },
  ];

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrganizations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrganizations = filteredOrganizations.slice(startIndex, endIndex)

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeFilter])

  // Fetch organizations data and types
  useEffect(() => {
    fetchOrganizations()
    fetchAvailableTypes()
    
    // Cleanup function to abort requests on unmount
    return () => {
      if (mainFetchControllerRef.current) {
        mainFetchControllerRef.current.abort()
      }
      if (typesControllerRef.current) {
        typesControllerRef.current.abort()
      }
      if (groupsControllerRef.current) {
        groupsControllerRef.current.abort()
      }
    }
  }, [])

  // Fetch custom groups when tab is selected
  useEffect(() => {
    if (activeFilter === 'custom_groups') {
      fetchCustomGroups()
    }
  }, [activeFilter])

  const fetchAvailableTypes = async () => {
    // Cancel any previous types request
    if (typesControllerRef.current) {
      typesControllerRef.current.abort()
    }
    
    // Create new AbortController for this request
    typesControllerRef.current = new AbortController()
    
    try {
      const response = await fetch('/api/organization-types', {
        signal: typesControllerRef.current.signal
      })
      if (response.ok) {
        const types = await response.json()
        setAvailableTypes(types)
        console.log('[OrganizationsPage] Loaded organization types:', types.length)
      } else {
        console.warn('[OrganizationsPage] Failed to fetch organization types, using defaults')
        setAvailableTypes(DEFAULT_ORGANIZATION_TYPES)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[OrganizationsPage] Types request aborted')
        return
      }
      console.error('[OrganizationsPage] Error fetching organization types:', error)
      setAvailableTypes(DEFAULT_ORGANIZATION_TYPES)
    }
  }

  const fetchCustomGroups = async () => {
    // Cancel any previous groups request
    if (groupsControllerRef.current) {
      groupsControllerRef.current.abort()
    }
    
    // Create new AbortController for this request
    groupsControllerRef.current = new AbortController()
    
    setLoadingCustomGroups(true)
    try {
      const response = await fetch('/api/custom-groups?includeMembers=true', {
        signal: groupsControllerRef.current.signal
      })
      if (response.ok) {
        const groups = await response.json()
        setCustomGroups(groups)
        console.log('[OrganizationsPage] Loaded custom groups:', groups.length)
      } else {
        console.error('[OrganizationsPage] Failed to fetch custom groups')
        setCustomGroups([])
      }
      // Successfully completed request, set loading to false
      setLoadingCustomGroups(false)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[OrganizationsPage] Groups request aborted')
        return
      }
      console.error('[OrganizationsPage] Error fetching custom groups:', error)
      setCustomGroups([])
      // Only set loading to false for actual errors, not aborts
      setLoadingCustomGroups(false)
    }
  }

  // Filter organizations based on search, active filter, and tag filters
  useEffect(() => {
    let filtered = organizations

    // Apply IATI tab filter using getTabCategory
    if (activeFilter !== 'all') {
      filtered = filtered.filter(org => {
        const tabCategory = getTabCategory(
          org.organisation_type, 
          org.country_represented || org.country || ''
        )
        return tabCategory === activeFilter
      })
    }

    // Apply tag filters
    if (activeTagFilters.size > 0) {
      filtered = filtered.filter(org => {
        const orgTags = new Set([
          getTypeLabel(org.organisation_type, availableTypes),
          deriveCooperationModality(org.organisation_type, org.country_represented || org.country || ''),
          org.derived_category
        ].filter(Boolean))
        
        return Array.from(activeTagFilters).some(tag => orgTags.has(tag))
      })
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(searchLower) ||
        org.acronym?.toLowerCase().includes(searchLower) ||
        org.description?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredOrganizations(filtered)
  }, [organizations, searchTerm, activeFilter, activeTagFilters, availableTypes])

  const fetchOrganizations = async () => {
    // Cancel any previous main request
    if (mainFetchControllerRef.current) {
      mainFetchControllerRef.current.abort()
    }
    
    // Create new AbortController for this request
    mainFetchControllerRef.current = new AbortController()
    
    setLoading(true)
    setFetchError(null)
    
    try {
      // Use bulk statistics endpoint for much better performance
      const [orgsResponse, summaryResponse] = await Promise.all([
        fetch('/api/organizations/bulk-stats', {
          signal: mainFetchControllerRef.current.signal,
          headers: {
            'Cache-Control': 'max-age=300', // 5 minute client cache
          }
        }),
        fetch('/api/organizations/summary', {
          signal: mainFetchControllerRef.current.signal,
          headers: {
            'Cache-Control': 'max-age=300', // 5 minute client cache
          }
        })
      ])

      if (orgsResponse.ok) {
        const response = await orgsResponse.json()
        
        // Handle both paginated and non-paginated responses for backward compatibility
        const orgsWithActiveProjects = response.data || response;
        
        // Debug organizations with Global/Regional
        const globalRegionalOrgs = orgsWithActiveProjects.filter((org: any) => 
          org.country_represented?.toLowerCase().includes('global') || 
          org.country_represented?.toLowerCase().includes('regional')
        );
        if (globalRegionalOrgs.length > 0) {
          console.log('[FetchOrgs] Organizations with Global/Regional:', globalRegionalOrgs);
        }
        
        // Organizations are already processed with statistics from bulk endpoint
        setOrganizations(orgsWithActiveProjects)
        
        // Update summary if needed
        if (!summaryResponse.ok) {
          const totalActiveProjects = orgsWithActiveProjects.reduce((sum: number, org: Organization) => sum + org.activeProjects, 0)
          setSummary({
            totalOrganizations: orgsWithActiveProjects.length,
            totalActiveProjects: totalActiveProjects,
            totalCommittedFunding: 5010000,
            totalCustomGroups: 0,
            lastUpdated: new Date().toISOString()
          })
        }
      } else {
        throw new Error(`Failed to fetch organizations: ${orgsResponse.status}`)
      }

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        setSummary(summaryData)
      }
      
      // Successfully loaded data, set loading to false
      setLoading(false)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[OrganizationsPage] Main request aborted')
        return
      }
      
      console.error('Error fetching organizations:', error)
      setFetchError(error instanceof Error ? error.message : 'Failed to load organizations')
      setOrganizations([])
      setSummary({
        totalOrganizations: 0,
        totalActiveProjects: 0,
        totalCommittedFunding: 0,
        totalCustomGroups: 0,
        lastUpdated: new Date().toISOString()
      })
      // Only set loading to false for actual errors, not aborts
      setLoading(false)
    }
  }

  // Note: processOrganizationsOptimized function removed - statistics now calculated 
  // efficiently in bulk via /api/organizations/bulk-stats endpoint

  const handleEditOrganization = (organization: Organization) => {
    setSelectedOrganization(organization)
    setEditModalOpen(true)
  }

  const handleAddOrganization = () => {
    setSelectedOrganization(null)
    setEditModalOpen(true)
  }

  const handleDeleteOrganization = (organization: Organization) => {
    setSelectedOrganization(organization)
    setDeleteModalOpen(true)
  }

  const handleSaveOrganization = async (data: Partial<Organization>) => {
    try {
      console.log('[OrganizationsPage] Saving organization with data:', data);
      
      const isCreating = !data.id;
      const method = isCreating ? 'POST' : 'PUT';
      
      const response = await fetch('/api/organizations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      const responseData = await response.json()
      
      if (!response.ok) {
        console.error('[OrganizationsPage] Save failed:', responseData);
        const action = isCreating ? 'create' : 'update';
        throw new Error(responseData.error || `Failed to ${action} organization`)
      }
      
      console.log('[OrganizationsPage] Save successful:', responseData);
      
      // Refresh organizations list
      await fetchOrganizations()
    } catch (error) {
      console.error('[OrganizationsPage] Error in handleSaveOrganization:', error);
      throw error; // Re-throw to be handled by the modal
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedOrganization) return
    
    const response = await fetch(`/api/organizations?id=${selectedOrganization.id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      // Use the detailed error message from the API if available
      const errorMessage = errorData.details || errorData.error || 'Failed to delete organization'
      throw new Error(errorMessage)
    }
    
    // Refresh organizations list
    await fetchOrganizations()
  }

  // Handle tag click for filtering
  const handleTagClick = (tag: string) => {
    setActiveTagFilters(prev => {
      const newFilters = new Set(prev)
      if (newFilters.has(tag)) {
        newFilters.delete(tag)
      } else {
        newFilters.add(tag)
      }
      return newFilters
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setActiveTagFilters(new Set())
    setActiveFilter('all')
    setSearchTerm('')
  }

  const router = useRouter()

  // Show loading state during SSR and initial client load
  if (loading || !mounted) {
    return (
      <MainLayout>
        <div className="space-y-6">
          {/* Loading skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 mt-2 animate-pulse"></div>
            </div>
            <div className="flex space-x-4">
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
          
          {/* Summary cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 rounded w-24 animate-pulse mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-64">
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
            <p className="text-gray-600 mt-1">Browse and explore our development partner network</p>
          </div>
          
          <div className="flex items-center space-x-4">

            <Button variant="outline" className="flex items-center space-x-2">
              <ExternalLink className="h-4 w-4" />
              <span>Export All Partners</span>
            </Button>
            <Button className="flex items-center space-x-2" onClick={handleAddOrganization}>
              <Plus className="h-4 w-4" />
              <span>Add Organization</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalOrganizations}</div>
                <p className="text-xs text-muted-foreground">Active organizations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Committed Funding</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalCommittedFunding)}</div>
                <p className="text-xs text-muted-foreground">In implementation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalActiveProjects}</div>
                <p className="text-xs text-muted-foreground">Ongoing activities</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custom Groups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalCustomGroups}</div>
                <p className="text-xs text-muted-foreground">Organization groups</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Results Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={activeFilter === 'custom_groups' ? "Search custom groups..." : "Search organizations..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('card')
                  localStorage.setItem('organizationViewMode', 'card')
                }}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Card
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('table')
                  localStorage.setItem('organizationViewMode', 'table')
                }}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Table
              </Button>
            </div>
          </div>
          
          {/* Active Filters Display - Only show for organizations */}
          {activeFilter !== 'custom_groups' && activeTagFilters.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Active filters:</span>
              {Array.from(activeTagFilters).map(filter => (
                <Badge 
                  key={filter}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => handleTagClick(filter)}
                >
                  {filter}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
          
          {/* Results counter */}
          {activeFilter === 'custom_groups' ? (
            loadingCustomGroups ? (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {customGroups.length} custom group{customGroups.length !== 1 ? 's' : ''}
                </span>
              </div>
            )
          ) : (
            loading ? (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredOrganizations.length)} of {filteredOrganizations.length} organizations
                </span>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
            {IATI_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeFilter} className="mt-6">
            {/* Show Custom Groups when that tab is selected */}
            {activeFilter === 'custom_groups' ? (
              loadingCustomGroups ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="h-64">
                      <CardContent className="p-6">
                        <div className="animate-pulse">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                            <div className="flex-1">
                              <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                              <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
                              <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : customGroups.length > 0 ? (
                <div className="space-y-6">
                  {/* Action buttons for custom groups */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => setCreateGroupModalOpen(true)}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create New Group</span>
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customGroups.map((group) => (
                      <CustomGroupCard
                        key={group.id}
                        group={group}
                        onEdit={(group) => {
                          setSelectedGroup(group)
                          setEditGroupModalOpen(true)
                        }}
                        onDelete={async (group) => {
                          if (!confirm('Are you sure you want to delete this group?')) return
                          
                          try {
                            const response = await fetch(`/api/custom-groups/${group.id}`, {
                              method: 'DELETE'
                            })
                            
                            if (response.ok) {
                              toast.success('Group deleted successfully')
                              fetchCustomGroups()
                            } else {
                              toast.error('Failed to delete group')
                            }
                          } catch (error) {
                            console.error('Error deleting group:', error)
                            toast.error('Error deleting group')
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No custom groups yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create custom groups to organize partners by specific criteria
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => setCreateGroupModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Custom Group
                  </Button>
                </div>
              )
            ) : (
              /* Organization Grid or Table based on view mode */
              loading ? (
                /* Show loading skeletons while data is being fetched */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="h-64">
                      <CardContent className="p-6">
                        <Skeleton className="h-12 w-12 rounded-full mb-4" />
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2 mb-4" />
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-5/6" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : paginatedOrganizations.length > 0 ? (
                <>
                  {viewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {paginatedOrganizations.map((organization) => (
                        <OrganizationCard 
                          key={organization.id} 
                          organization={organization}
                          onEdit={handleEditOrganization}
                          onDelete={handleDeleteOrganization}
                          availableTypes={availableTypes}
                          onTagClick={handleTagClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <OrganizationListView
                      organizations={paginatedOrganizations}
                      onEdit={handleEditOrganization}
                      onDelete={handleDeleteOrganization}
                      availableTypes={availableTypes}
                      onTagClick={handleTagClick}
                    />
                  )}
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-8">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  {fetchError ? (
                    <div className="space-y-4">
                      <Building2 className="mx-auto h-12 w-12 text-red-500" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Organizations</h3>
                        <p className="text-gray-500 mb-4">{fetchError}</p>
                        <Button onClick={fetchOrganizations} variant="outline">
                          Try Again
                        </Button>
                      </div>
                    </div>
                  ) : searchTerm || activeFilter !== 'all' ? (
                    <div>
                      <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchTerm ? 'Try adjusting your search terms.' : 'No organizations match the current filter.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations yet</h3>
                        <p className="text-gray-500 mb-4">Get started by adding your first organization.</p>
                        <Button className="mt-4" onClick={handleAddOrganization}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Organization
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Modal */}
        <EditOrganizationModal
          organization={selectedOrganization}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedOrganization(null)
          }}
          onSave={handleSaveOrganization}
          onDelete={handleDeleteOrganization}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          organization={selectedOrganization}
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false)
            setSelectedOrganization(null)
          }}
          onConfirm={handleConfirmDelete}
        />

        {/* Create Custom Group Modal */}
        <CreateCustomGroupModal 
          open={createGroupModalOpen}
          onOpenChange={setCreateGroupModalOpen}
          onSuccess={fetchCustomGroups}
        />

        {/* Edit Custom Group Modal */}
        <EditCustomGroupModal 
          group={selectedGroup}
          open={editGroupModalOpen}
          onOpenChange={(open) => {
            setEditGroupModalOpen(open)
            if (!open) setSelectedGroup(null)
          }}
          onSuccess={fetchCustomGroups}
        />
      </div>
    </MainLayout>
  )
}

export default function OrganizationsPage() {
  return (
    <AsyncErrorBoundary 
      fallback="page"
      onError={(error, errorInfo) => {
        console.error('Organizations Page Error:', error, errorInfo);
      }}
    >
      <OrganizationsPageContent />
    </AsyncErrorBoundary>
  );
} 