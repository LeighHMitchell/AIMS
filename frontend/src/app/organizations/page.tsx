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
import { Search, Plus, Edit2, Eye, Trash2, ExternalLink, Globe, MapPin, Users, Activity, DollarSign, Building2, AlertTriangle, Copy, Upload, X, ImageIcon, Info, TableIcon, Grid3X3, Calendar, Mail, Phone, HelpCircle, User, Lock, MoreVertical, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { exportOrganizationToPDF, exportOrganizationToExcel } from '@/lib/organization-export'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import Flag from 'react-world-flags'
import { 
  INSTITUTIONAL_GROUPS, 
  getAllInstitutionalGroupNames,
  isInstitutionalGroup,
  type InstitutionalGroup 
} from '@/data/location-groups'
import { CreateCustomGroupModal } from '@/components/organizations/CreateCustomGroupModal'
import { EditCustomGroupModal } from '@/components/organizations/EditCustomGroupModal'
import { OrganizationTable } from '@/components/organizations/OrganizationTable'
import { CustomGroupCard } from '@/components/organizations/CustomGroupCard'
import OrganizationCardModern from '@/components/organizations/OrganizationCardModern'
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

// Combine all options for validation (countries + institutional groups)
const ALL_COUNTRY_AND_REGION_CODES = [
  ...ISO_COUNTRIES.map(c => c.code),
  ...ISO_COUNTRIES.map(c => c.name), // Support both code and name for backward compatibility
  ...getAllInstitutionalGroupNames(),
  // Legacy support for full country names
  'Myanmar', 'Burma', 'Rwanda',
  // Legacy support for old "Global or Regional" value
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
  Organisation_Type_Code: string
  Organisation_Type_Name?: string
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
  alias_refs?: string[]
  name_aliases?: string[]
  created_at: string
  updated_at: string
  // Computed fields
  activeProjects: number
  reportedActivities?: number
  associatedActivities?: number
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

// Myanmar-specific cooperation modality calculation
const deriveCooperationModality = (orgTypeCode: string, country: string): string => {
  const typeCode = orgTypeCode?.trim();
  const countryValue = country?.trim().toLowerCase();

  // Check if it's an institutional group (multilateral organization)
  const isInstitutional = isInstitutionalGroup(country);

  // Also check for legacy "Global or Regional" value
  const isLegacyGlobal = countryValue === 'global or regional' ||
    countryValue?.includes('global') ||
    countryValue?.includes('regional');

  // Updated logic to work with type codes and institutional groups
  if (isInstitutional || isLegacyGlobal) {
    return 'Global or Regional';
  } else if (typeCode === '10' && countryValue !== 'myanmar') {
    // Government (code 10) from foreign country
    return 'External';
  } else if (['22', '40'].includes(typeCode)) {
    // Multilateral (22) or Academic/Research (40)
    return 'Global or Regional';
  } else if (typeCode === '15' && countryValue === 'myanmar') {
    // NGO (code 15) based in Myanmar
    return 'Internal';
  } else if (typeCode === '23') {
    // Bilateral (code 23) - typically external
    return 'External';
  } else if (countryValue === 'myanmar') {
    // Any other organization based in Myanmar
    return 'Internal';
  } else {
    return 'Other';
  }
}

// Derive Category based on organization type and country
const deriveCategory = (orgTypeCode: string, country: string): string => {
  const c = country?.toLowerCase()?.trim();
  const isMyanmar = c === "myanmar";
  
  // Check if it's an institutional group (multilateral organization)
  const isInstitutional = isInstitutionalGroup(country);
  
  // Also check for legacy "Global or Regional" value
  const isGlobal = c?.includes("global") || c?.includes("regional") || isInstitutional || c === "global or regional";

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

// Country options now use ISO_COUNTRIES and INSTITUTIONAL_GROUPS from location-groups.ts

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
  
  if (!data.Organisation_Type_Code?.trim()) {
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
        <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
          <ImageIcon className={`${iconSize} mb-2`} />
          <p className="text-sm font-medium">
            {isDragActive ? `Drop ${label.toLowerCase()}` : `Drag & drop`}
          </p>
          <p className="text-xs mt-1">or click to upload</p>
          <p className="text-xs mt-2 text-gray-400">PNG, JPG, GIF up to 5MB</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center">
        Recommended size: {recommendedSize}
      </p>
    </div>
  )
}

// Delete Confirmation Modal Component
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

// Organization Card Component with optimized image loading
const OrganizationCard: React.FC<{ 
  organization: Organization
  onEdit: (org: Organization) => void
  onDelete: (org: Organization) => void
  onExportPDF: (orgId: string) => void
  onExportExcel: (orgId: string) => void
  availableTypes: OrganizationType[]
  onTagClick: (tag: string) => void
}> = ({ organization, onEdit, onDelete, onExportPDF, onExportExcel, availableTypes, onTagClick }) => {
  const router = useRouter()

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
      className="bg-white border border-gray-300 hover:border-gray-400 hover:shadow-lg transition-all duration-300 ease-in-out cursor-pointer h-full flex flex-col shadow-sm relative"
      onClick={handleView}
    >
      {/* Actions Dropdown - positioned at card level to avoid overflow clipping */}
      <div
        className="absolute top-3 right-3 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-white/90 hover:bg-white"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={5}
            className="min-w-[160px] shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); handleView(); }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onEdit(organization); }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onExportPDF(organization.id); }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onExportExcel(organization.id); }}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as Excel
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 hover:bg-red-50"
              onClick={(e) => { e.stopPropagation(); onDelete(organization); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Banner Image */}
      <div className="h-64 bg-gradient-to-r from-blue-500 to-teal-600 relative overflow-hidden flex-shrink-0">
        {organization.banner ? (
          <img
            src={organization.banner}
            alt={`${organization.name} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-20 w-20 text-white/20" />
          </div>
        )}

        {/* Gradient fade overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </div>

      <CardContent className="p-4 flex flex-col flex-grow">
        <div className="flex flex-col space-y-3 flex-grow">
          {/* Top section with logo and name */}
          <div className="flex items-start gap-3">
            {/* Logo */}
            <div className="flex-shrink-0">
              {organization.logo ? (
                <img 
                  src={organization.logo} 
                  alt={`${organization.name} logo`}
                  className="w-12 h-12 object-contain rounded-lg border bg-white p-1"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Organization Name and Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base text-gray-900 line-clamp-2">
                {organization.name}
                {organization.acronym && (
                  <span className="text-gray-500 font-medium ml-1">({organization.acronym})</span>
                )}
              </h3>
              
              {/* Location and Classification Pills */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {(organization.country_represented || organization.country) && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {organization.country_represented || organization.country}
                  </span>
                )}
                {organization.Organisation_Type_Code && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {getPartnerClassification(organization.Organisation_Type_Code, organization.country_represented || organization.country || '')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description - condensed to 2 lines */}
          {organization.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {organization.description}
            </p>
          )}

          {/* Statistics Section - Compact horizontal layout */}
          <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3 mt-auto">
            <div className="flex items-center gap-1">
              <Activity className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 font-medium">{organization.activeProjects || 0}</span>
              <span className="text-gray-500 text-xs">activities</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 font-medium">{formatCurrency(organization.totalBudgeted)}</span>
            </div>
          </div>
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

              {/* Location */}
              <div className="flex-shrink-0 min-w-[120px]">
                <p className="text-sm text-gray-600">
                  {org.country_represented || org.country || 'No location'}
                </p>
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
  
  // Sorting state for table view
  const [sortField, setSortField] = useState<'name' | 'acronym' | 'type' | 'location' | 'activities' | 'reported' | 'associated' | 'funding' | 'created_at'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // AbortController refs for race condition prevention
  const mainFetchControllerRef = useRef<AbortController | null>(null)
  const typesControllerRef = useRef<AbortController | null>(null)
  const groupsControllerRef = useRef<AbortController | null>(null)

  // Pre-caching for better performance
  const { preCacheOrganizations } = usePreCache()

  // Initialize organizations pre-caching (but don't block the main fetch)
  useEffect(() => {
    // Only pre-cache if we already have data (to avoid competing fetches)
    if (organizations.length > 0) {
      preCacheOrganizations().catch(console.warn)
    }
  }, [preCacheOrganizations, organizations.length])

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

  // Sort organizations for table view
  const sortedOrganizations = React.useMemo(() => {
    if (viewMode !== 'table') return filteredOrganizations
    
    return [...filteredOrganizations].sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() || ''
          bValue = b.name?.toLowerCase() || ''
          break
        case 'acronym':
          aValue = a.acronym?.toLowerCase() || ''
          bValue = b.acronym?.toLowerCase() || ''
          break
        case 'type':
          aValue = getOrganizationTypeLabel(a.Organisation_Type_Code, availableTypes).toLowerCase()
          bValue = getOrganizationTypeLabel(b.Organisation_Type_Code, availableTypes).toLowerCase()
          break
        case 'location':
          aValue = a.country_represented?.toLowerCase() || ''
          bValue = b.country_represented?.toLowerCase() || ''
          break
        case 'activities':
          aValue = a.activeProjects || 0
          bValue = b.activeProjects || 0
          break
        case 'reported':
          aValue = a.reportedActivities ?? a.activeProjects ?? 0
          bValue = b.reportedActivities ?? b.activeProjects ?? 0
          break
        case 'associated':
          aValue = a.associatedActivities ?? 0
          bValue = b.associatedActivities ?? 0
          break
        case 'funding':
          aValue = a.totalBudgeted || 0
          bValue = b.totalBudgeted || 0
          break
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredOrganizations, sortField, sortOrder, viewMode, availableTypes])

  // Calculate pagination
  const totalPages = Math.ceil(sortedOrganizations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrganizations = sortedOrganizations.slice(startIndex, endIndex)

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeFilter])

  // Fetch organizations data and types
  useEffect(() => {
    // Use server cache on initial load for faster response, only bust cache after mutations
    fetchOrganizations(false)
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
          org.Organisation_Type_Code, 
          org.country_represented || org.country || ''
        )
        return tabCategory === activeFilter
      })
    }

    // Apply tag filters
    if (activeTagFilters.size > 0) {
      filtered = filtered.filter(org => {
        const orgTags = new Set([
          getOrganizationTypeLabel(org.Organisation_Type_Code, availableTypes),
          deriveCooperationModality(org.Organisation_Type_Code, org.country_represented || org.country || ''),
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
        org.description?.toLowerCase().includes(searchLower) ||
        // Search by IATI Organisation ID (e.g., GB-GOV-1)
        org.iati_org_id?.toLowerCase().includes(searchLower) ||
        // Search in alias_refs (Legacy/Internal Codes)
        org.alias_refs?.some(alias => alias?.toLowerCase().includes(searchLower)) ||
        // Search in name_aliases (Alternate Names)
        org.name_aliases?.some(alias => alias?.toLowerCase().includes(searchLower))
      )
    }

    setFilteredOrganizations(filtered)
  }, [organizations, searchTerm, activeFilter, activeTagFilters, availableTypes])

  const fetchOrganizations = async (bustCache: boolean = false) => {
    // Cancel any previous main request
    if (mainFetchControllerRef.current) {
      mainFetchControllerRef.current.abort()
    }
    
    // Create new AbortController for this request
    mainFetchControllerRef.current = new AbortController()
    
    setLoading(true)
    setFetchError(null)
    
    try {
      // Use slim organizations-list endpoint for optimal performance
      // Add timestamp for cache busting when needed (after create/update)
      const cacheBuster = bustCache ? `&_=${Date.now()}` : '';
      const [orgsResponse, summaryResponse] = await Promise.all([
        fetch(`/api/organizations-list?limit=500${cacheBuster}`, {
          signal: mainFetchControllerRef.current.signal,
          headers: {
            'Cache-Control': bustCache ? 'no-cache' : 'max-age=60',
          }
        }),
        fetch(`/api/organizations/summary${bustCache ? `?_=${Date.now()}` : ''}`, {
          signal: mainFetchControllerRef.current.signal,
          headers: {
            'Cache-Control': bustCache ? 'no-cache' : 'max-age=60', // 1 minute client cache (reduced from 5 min)
          }
        })
      ])

      if (orgsResponse.ok) {
        const response = await orgsResponse.json()

        // Handle both paginated and non-paginated responses for backward compatibility
        const orgsWithActiveProjects = response.data || response;

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
    router.push(`/organizations/${organization.id}/edit`)
  }

  const handleAddOrganization = () => {
    router.push('/organizations/new')
  }

  const handleDeleteOrganization = (organization: Organization) => {
    setSelectedOrganization(organization)
    setDeleteModalOpen(true)
  }


  const handleConfirmDelete = async () => {
    if (!selectedOrganization) return
    
    const response = await fetch(`/api/organizations?id=${selectedOrganization.id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      // Try to parse JSON error response, but handle cases where it might not be JSON
      let errorData;
      try {
        errorData = await response.json();
      } catch (jsonError) {
        console.error('[OrganizationsPage] Failed to parse error response as JSON:', jsonError);
        errorData = { error: `Server returned ${response.status}: ${response.statusText}` };
      }
      // Use the detailed error message from the API if available
      const errorMessage = errorData.details || errorData.error || 'Failed to delete organization'
      throw new Error(errorMessage)
    }
    
    // Refresh organizations list with cache busting
    await fetchOrganizations(true)
  }

  // Export handlers
  const handleExportOrgPDF = async (orgId: string) => {
    toast.loading("Generating PDF...", { id: "export-pdf" });
    try {
      await exportOrganizationToPDF(orgId);
      toast.success("PDF exported successfully", { id: "export-pdf" });
    } catch (error) {
      console.error("Error exporting organization to PDF:", error);
      toast.error("Failed to export PDF", { id: "export-pdf" });
    }
  };

  const handleExportOrgExcel = async (orgId: string) => {
    toast.loading("Generating Excel...", { id: "export-excel" });
    try {
      await exportOrganizationToExcel(orgId);
      toast.success("Excel exported successfully", { id: "export-excel" });
    } catch (error) {
      console.error("Error exporting organization to Excel:", error);
      toast.error("Failed to export Excel", { id: "export-excel" });
    }
  };

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

  // Handle table sorting
  const handleSort = (field: 'name' | 'acronym' | 'type' | 'location' | 'activities' | 'reported' | 'associated' | 'funding' | 'created_at') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
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
          
          <div className="flex items-center space-x-2">
            <Button className="flex items-center space-x-2" onClick={handleAddOrganization}>
              <Plus className="h-4 w-4" />
              <span>Add Organization</span>
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Export to CSV">
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export to CSV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

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
          <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap">
            {IATI_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
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

                  {viewMode === 'card' ? (
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
                  ) : (
                    <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[30%]">Group Name</TableHead>
                            <TableHead className="w-[35%]">Description</TableHead>
                            <TableHead className="text-center w-[10%]">Members</TableHead>
                            <TableHead className="text-center w-[10%]">Visibility</TableHead>
                            <TableHead className="text-right w-[15%]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customGroups.map((group) => (
                            <TableRow
                              key={group.id}
                              className="cursor-pointer hover:bg-muted"
                              onClick={() => router.push(`/partners/groups/${group.id}`)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  {group.logo ? (
                                    <img src={group.logo} alt={group.name} className="w-8 h-8 rounded-full object-contain" />
                                  ) : (
                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                      <Users className="h-4 w-4 text-purple-600" />
                                    </div>
                                  )}
                                  <span>{group.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-600 text-sm">
                                {group.description ? (
                                  <span className="line-clamp-2">{group.description}</span>
                                ) : (
                                  <span className="text-gray-400">No description</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium">{group.members?.length || 0}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                {group.is_public ? (
                                  <span className="inline-flex items-center text-xs text-green-700">
                                    <Globe className="h-3 w-3 mr-1" />
                                    Public
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-xs text-gray-600">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Private
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/partners/groups/${group.id}`)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedGroup(group)
                                      setEditGroupModalOpen(true)
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={async () => {
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
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {paginatedOrganizations.map((organization) => (
                        <OrganizationCardModern
                          key={organization.id}
                          organization={organization}
                          onEdit={handleEditOrganization}
                          onDelete={handleDeleteOrganization}
                          onExportPDF={handleExportOrgPDF}
                          onExportExcel={handleExportOrgExcel}
                        />
                      ))}
                    </div>
                  ) : (
                    <OrganizationTable
                      organizations={paginatedOrganizations}
                      availableTypes={availableTypes}
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                      onEdit={handleEditOrganization}
                      onDelete={handleDeleteOrganization}
                      onExportPDF={handleExportOrgPDF}
                      onExportExcel={handleExportOrgExcel}
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

        {/* Edit Modal - Removed, now using full-page editor at /organizations/[id]/edit */}

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