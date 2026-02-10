"use client"
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import ReactDOM from "react-dom"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { MainLayout } from "@/components/layout/main-layout"
import { SafeHtml } from "@/components/ui/safe-html"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { apiFetch } from '@/lib/api-fetch';
import {
  ArrowLeft,
  Edit,
  Download,
  FileText,
  MapPin,
  Users,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  Eye,
  Trash2,
  Upload,
  ImageIcon,
  PieChart as PieChartIcon,
  Banknote,
  Globe,
  Activity,
  RefreshCw,
  AlertCircle,
  Lock,
  Wallet,
  ExternalLink,
  Building2,
  MessageSquare,
  Plus,
  CheckCircle,
  Clock,
  Building,
  Table as TableIcon,
  Leaf,
  Wrench,
  Sparkles,
  Heart,
  TreePine,
  Wind,
  MountainSnow,
  Shield,
  Handshake,
  Droplets,
  Waves,
  Baby,
  HeartHandshake,
  Copy,
  Check,
  HelpCircle,
  FileCode,
  FileCheck,
  Target,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Bookmark,
  BookmarkCheck,
  Layers,
  Scale
} from "lucide-react"
import { toast } from "sonner"
import { Transaction } from "@/types/transaction"
import { DisbursementGauge, CumulativeFinanceChart } from "@/components/ActivityCharts"
import financeTypes from "@/data/finance-types.json"
import { BannerUpload } from "@/components/BannerUpload"
import { IconUpload } from "@/components/IconUpload"
import { ActivityVote } from "@/components/ui/activity-vote"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useUser } from "@/hooks/useUser"
import { useBookmarks } from "@/hooks/use-bookmarks"
import { fetchActivityWithCache, invalidateActivityCache } from '@/lib/activity-cache'
import { CommentsDrawer } from "@/components/activities/CommentsDrawer"
import { TRANSACTION_TYPE_LABELS } from "@/types/transaction"
import TransactionTab from "@/components/activities/TransactionTab"
import { getActivityPermissions, ActivityContributor } from "@/lib/activity-permissions"
import { SDG_GOALS, SDG_TARGETS } from "@/data/sdg-targets"
import { SDGImageGrid } from "@/components/ui/SDGImageGrid"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ActivityProfileSkeleton } from "@/components/skeletons/ActivityProfileSkeleton"
import ActivityBudgetsTab from "@/components/activities/ActivityBudgetsTab"
import { ResultsTab } from "@/components/activities/ResultsTab"
import { ResultsReadOnlyView } from "@/components/activities/ResultsReadOnlyView"
import { CapitalSpendTab } from "@/components/activities/CapitalSpendTab"
import { FinancingTermsTab } from "@/components/activities/FinancingTermsTab"
import PlannedDisbursementsTab from "@/components/activities/PlannedDisbursementsTab"
import FinancialAnalyticsTab from "@/components/activities/FinancialAnalyticsTab"
import RelatedActivitiesTab from "@/components/activities/RelatedActivitiesTab"
import ActivityContactsTab from "@/components/activities/ActivityContactsTab"
import { PublicCommentsThread } from "@/components/activities/PublicCommentsThread"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { BudgetsSkeleton, PlannedDisbursementsSkeleton, TransactionsSkeleton } from "@/components/activities/TabSkeletons"
import { v4 as uuidv4 } from 'uuid'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip2, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Legend, AreaChart, Area } from 'recharts'
import { ChevronDown, ChevronUp, ChevronRight, BarChart3 as BarChart3Icon, GitBranch, Printer, FileImage } from 'lucide-react'
import SectorSankeyVisualization from '@/components/charts/SectorSankeyVisualization'
import FinanceTypeDonut from '@/components/charts/FinanceTypeDonut'
import PolicyMarkersSectionIATIWithCustom from '@/components/PolicyMarkersSectionIATIWithCustom'
import { PolicyMarkersAnalyticsTab } from '@/components/activities/PolicyMarkersAnalyticsTab'
import { DocumentsAndImagesTabV2 } from '@/components/activities/DocumentsAndImagesTabV2'
import { AllDatesHistory } from '@/components/activities/AllDatesHistory'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { getOrganizationTypeName } from "@/data/iati-organization-types"
import { getOrganizationRoleName, getRoleCodeFromType } from "@/data/iati-organization-roles"
import dynamic from 'next/dynamic'
import MyanmarRegionsMap from "@/components/MyanmarRegionsMap"
import { NormalizedOrgRef } from "@/components/ui/normalized-org-ref"
import LocationCard from "@/components/locations/LocationCard"

// Dynamic import for MapLibre-based map view
const ActivityLocationsMapViewV2 = dynamic(
  () => import('@/components/maps/ActivityLocationsMapViewV2'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-96">Loading map...</div> }
)
import type { LocationSchema } from "@/lib/schemas/location"
import { formatNumberWithAbbreviation } from "@/utils/format-helpers"
import { IATI_ACTIVITY_SCOPE } from "@/data/iati-activity-scope"
import { IATI_COLLABORATION_TYPES, getCollaborationTypeByCode } from "@/data/iati-collaboration-types"
import { TIED_STATUS_LABELS } from "@/types/transaction"
import { VALIDATION_STATUS_OPTIONS } from "@/types/government-endorsement"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { CodelistTooltip } from "@/components/ui/codelist-tooltip"
import { splitBudgetAcrossYears, splitPlannedDisbursementAcrossYears } from "@/utils/year-allocation"
import { getTransactionUSDValue, getTransactionUSDValueSync, normalizeTransactionType } from "@/lib/transaction-usd-helper"

// Hierarchy levels mapping
type HierarchyOption = {
  level: number;
  name: string;
  description: string;
};

const HIERARCHY_LEVELS: HierarchyOption[] = [
  {
    level: 1,
    name: "Top-level Program/Strategy",
    description: "Strategic or program-level activity (typically has child activities)"
  },
  {
    level: 2,
    name: "Sub-program/Country Project",
    description: "Regional or country-level implementation of a broader program"
  },
  {
    level: 3,
    name: "Specific Implementation/Project",
    description: "Specific project or implementation component"
  },
  {
    level: 4,
    name: "Sub-component/Activity",
    description: "Sub-project or detailed activity component"
  },
  {
    level: 5,
    name: "Task/Output Level",
    description: "Task or output-level work (most detailed level)"
  }
];

// High contrast color variants for tags - consistent with TagsSection
const TAG_COLOR_VARIANTS = [
  'blue', 'purple', 'green', 'cyan', 'indigo', 'pink', 'rose', 'orange',
  'amber', 'lime', 'emerald', 'teal', 'sky', 'violet', 'fuchsia'
] as const;

// Function to get tag color variant based on hash - consistent with TagsSection
const getTagColorVariant = (tagName: string) => {
  const hash = tagName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLOR_VARIANTS[hash % TAG_COLOR_VARIANTS.length];
};

// Aid Type mappings
const AID_TYPE_LABELS: Record<string, string> = {
  'A01': 'General budget support',
  'A02': 'Sector budget support',
  'B01': 'Core support to NGOs',
  'B02': 'Core contributions to multilateral institutions',
  'B03': 'Contributions to pooled programmes and funds',
  'B04': 'Basket funds/pooled funding',
  'C01': 'Project-type interventions',
  'D01': 'Donor country personnel',
  'D02': 'Other technical assistance',
  'E01': 'Scholarships/training in donor country',
  'E02': 'Imputed student costs',
  'F01': 'Debt relief',
  'G01': 'Administrative costs not included elsewhere',
  'H01': 'Development awareness',
  'H02': 'Refugees in donor countries'
};

// Flow Type mappings
const FLOW_TYPE_LABELS: Record<string, string> = {
  '10': 'Official Development Assistance',
  '20': 'Other Official Flows',
  '21': 'Non-export credit OOF',
  '22': 'Officially supported export credits',
  '30': 'Private grants',
  '35': 'Private market',
  '36': 'Private Foreign Direct Investment',
  '37': 'Other private flows at market terms',
  '40': 'Non flow',
  '50': 'Other flows'
};

// Finance Type mappings
const FINANCE_TYPE_LABELS: Record<string, string> = {
  '110': 'Standard grant',
  '111': 'Subsidies to national private investors',
  '210': 'Interest subsidy',
  '211': 'Interest subsidy to national private exporters',
  '310': 'Capital subscription on deposit basis',
  '311': 'Capital subscription on encashment basis',
  '410': 'Aid loan excluding debt reorganisation',
  '411': 'Investment-related loan to developing countries',
  '412': 'Loan in a joint venture with the recipient',
  '413': 'Loan to national private investor',
  '421': 'Standard loan',
  '422': 'Reimbursable grant',
  '510': 'Bonds',
  '520': 'Asset-backed securities',
  '530': 'Other debt securities'
};


interface Activity {
  id: string
  partnerId: string
  iatiId: string
  title: string
  acronym?: string
  description: string
  descriptionObjectives?: string
  descriptionTargetGroups?: string
  descriptionOther?: string
  created_by_org_name: string
  created_by_org_acronym: string
  targetGroups: string
  collaborationType: string
  banner?: string
  bannerPosition?: number
  icon?: string
  activityStatus: string
  publicationStatus: string
  submissionStatus: 'draft' | 'submitted' | 'validated' | 'rejected' | 'published'
  sectors?: any[]
  transactions?: any[]
  budgets?: any[]
  extendingPartners?: Array<{ orgId: string; name: string }>
  implementingPartners?: Array<{ orgId: string; name: string }>
  governmentPartners?: Array<{ orgId: string; name: string }>
  contacts?: any[]
  governmentInputs?: any
  comments?: any[]
  contributors?: ActivityContributor[]
  sdgMappings?: any[]
  policyMarkers?: any[]
  documents?: any[]
  tags?: any[]
  createdBy?: { id: string; name: string; role: string }
  createdByOrg?: string
  plannedStartDate?: string
  plannedEndDate?: string
  actualStartDate?: string
  actualEndDate?: string
  createdAt: string
  updatedAt: string
  // Default finance fields
  defaultAidType?: string
  defaultFinanceType?: string
  defaultCurrency?: string
  defaultTiedStatus?: string
  defaultFlowType?: string
  defaultDisbursementChannel?: string
  // Activity classification fields
  activityScope?: string
  hierarchy?: number
  // IATI Sync fields
  iatiIdentifier?: string
  autoSync?: boolean
  lastSyncTime?: string
  syncStatus?: 'live' | 'pending' | 'outdated'
  autoSyncFields?: string[]
  // Humanitarian field
  humanitarian?: boolean
  // Custom dates (e.g., Contract Signing Date, Revised Start Date)
  customDates?: Array<{ label: string; date: string; description: string }>
}

// Format large numbers into compact form: 500000000 -> 500m, 200000 -> 200k
function formatCompactNumber(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}b`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}k`;
  return `${value.toFixed(2)}`;
}

// Format currency in short form with two decimals: 10308 -> $10.31k, 10308000 -> $10.31M
function formatCurrencyShort(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(value / 1_000).toFixed(2)}k`;
  return `${sign}$${value.toFixed(2)}`;
}

// Helper function to get activity scope label from code
function getActivityScopeLabel(code: string | undefined): string | null {
  if (!code) return null;
  for (const group of IATI_ACTIVITY_SCOPE) {
    const scope = group.types.find((s) => s.code === code);
    if (scope) return scope.name;
  }
  return null;
}

// Helper function to get collaboration type label from code
function getCollaborationTypeLabel(code: string | undefined): string | null {
  if (!code) return null;
  const collabType = getCollaborationTypeByCode(code);
  return collabType ? collabType.name : null;
}

// Helper function to get hierarchy label from level
function getHierarchyLabel(level: number | undefined): string | null {
  if (!level) return null;
  const hierarchyOption = HIERARCHY_LEVELS.find((h) => h.level === level);
  return hierarchyOption ? hierarchyOption.name : null;
}

interface Partner {
  id: string;
  name: string;
  role: string;
  type: 'implementing' | 'government' | 'extending';
  countryRepresented?: string;
  acronym?: string;
  code?: string;
  fullName?: string;
  logo?: string;
}

export default function ActivityDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [budgets, setBudgets] = useState<any[] | undefined>(undefined)
  const [activeTab, setActiveTab] = useState("finances")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isBudgetsOpen, setIsBudgetsOpen] = useState(true)
  const [isPlannedOpen, setIsPlannedOpen] = useState(true)
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(true)
  const [budgetsLoading, setBudgetsLoading] = useState(true)
  const [plannedLoading, setPlannedLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const router = useRouter()
  const { user } = useUser()
  const { isBookmarked, toggleBookmark, isToggling } = useBookmarks()
  const searchParams = useSearchParams()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [partnershipsSortField, setPartnershipsSortField] = useState<string>('organization')
  const [partnershipsSortDirection, setPartnershipsSortDirection] = useState<'asc' | 'desc'>('asc')
  const [hiddenRoles, setHiddenRoles] = useState<Set<number>>(new Set())

  // Copy to clipboard function
  const copyToClipboard = (text: string, type: 'activityId' | 'iatiIdentifier' | 'activityTitle') => {
    navigator.clipboard.writeText(text)
    setCopiedId(type)
    setTimeout(() => setCopiedId(null), 2000)
    const message = type === 'activityId' ? 'Activity ID' : type === 'activityTitle' ? 'Activity Title' : 'IATI Identifier'
    toast.success(`${message} copied to clipboard`)
  }

  // Set initial tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Loading states are now managed by child components via onLoadingChange callbacks
  // Removing the reset useEffect prevents unnecessary re-renders when switching tabs

  // Handle tab change with URL synchronization
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    
    // Update URL with the new tab parameter
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tabValue);
    
    // Use replace to avoid adding to browser history for each tab switch
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  
  // Get permissions
  const permissions = getActivityPermissions(user, activity);
  
  const [showEditBanner, setShowEditBanner] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [bannerPosition, setBannerPosition] = useState<number>(50)
  const [showEditIcon, setShowEditIcon] = useState(false)
  const [localIcon, setLocalIcon] = useState<string | null>(null) // Local icon state to avoid updating activity object
  const activityRef = useRef<Activity | null>(null)
  const [showActivityDetails, setShowActivityDetails] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const descriptionRef = useRef<HTMLDivElement>(null)
  const shouldScrollToTop = useRef(false)
  const scrollLockRef = useRef(false)
  const scrollLockTimeout = useRef<NodeJS.Timeout | null>(null)
  const [budgetYearView, setBudgetYearView] = useState<'chart' | 'table'>('chart')
  const [budgetAllocationMethod, setBudgetAllocationMethod] = useState<'proportional' | 'period-start'>('proportional')
  const [budgetVsSpendAllocationMethod, setBudgetVsSpendAllocationMethod] = useState<'proportional' | 'period-start'>('proportional')
  
  // Force scroll to top after description collapses - runs synchronously before paint
  useLayoutEffect(() => {
    if (!isDescriptionExpanded && shouldScrollToTop.current) {
      shouldScrollToTop.current = false
      scrollLockRef.current = true
      
      // Clear any existing timeout
      if (scrollLockTimeout.current) {
        clearTimeout(scrollLockTimeout.current)
      }
      
      // Scroll to top using anchor element for reliability
      const topElement = document.getElementById('page-top')
      if (topElement) {
        topElement.scrollIntoView({ behavior: 'auto', block: 'start' })
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' })
      }
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      
      // Release scroll lock after 500ms
      scrollLockTimeout.current = setTimeout(() => {
        scrollLockRef.current = false
      }, 500)
    }
  }, [isDescriptionExpanded])
  
  // Prevent scroll events during scroll lock window
  useEffect(() => {
    const preventScroll = (e: Event) => {
      if (scrollLockRef.current && window.scrollY > 0) {
        e.preventDefault()
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      }
    }
    
    window.addEventListener('scroll', preventScroll, { passive: false, capture: true })
    
    return () => {
      window.removeEventListener('scroll', preventScroll, { capture: true } as EventListenerOptions)
      if (scrollLockTimeout.current) {
        clearTimeout(scrollLockTimeout.current)
      }
    }
  }, [])
  const [disbursementProgressView, setDisbursementProgressView] = useState<'chart' | 'table'>('chart')
  const [sectorBreakdownView, setSectorBreakdownView] = useState<'chart' | 'table'>('chart')
  const [sectorFlowView, setSectorFlowView] = useState<'flow' | 'distribution'>('flow')
  const [locationsView, setLocationsView] = useState<'cards' | 'table'>('cards')
  const [sectorViewMode, setSectorViewMode] = useState<'sankey' | 'pie' | 'bar' | 'table'>('bar')
  const [sectorMetricMode, setSectorMetricMode] = useState<'percentage' | 'budget' | 'planned' | 'actual'>('percentage')
  const [sectorBarGroupingMode, setSectorBarGroupingMode] = useState<'sector' | 'category' | 'group'>('sector')

  const [partners, setPartners] = useState<Partner[]>([])
  const [allPartners, setAllPartners] = useState<Partner[]>([])
  const [sdgMappings, setSdgMappings] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [participatingOrgs, setParticipatingOrgs] = useState<any[]>([])
  const [plannedDisbursements, setPlannedDisbursements] = useState<any[] | undefined>(undefined)
  const [activityLocations, setActivityLocations] = useState<any[]>([])
  const [allActivityLocations, setAllActivityLocations] = useState<any[]>([])
  const [subnationalBreakdowns, setSubnationalBreakdowns] = useState<Record<string, number>>({})
  const [governmentEndorsement, setGovernmentEndorsement] = useState<any>(null)
  const [loadingEndorsement, setLoadingEndorsement] = useState(false)
  const [countryAllocations, setCountryAllocations] = useState<any[]>([])
  const [regionAllocations, setRegionAllocations] = useState<any[]>([])
  const [reportingOrg, setReportingOrg] = useState<any>(null)
  
  // State for financial calculations (async due to currency conversion)
  const [financials, setFinancials] = useState({
    totalCommitment: 0,
    totalDisbursement: 0,
    totalExpenditure: 0,
    percentDisbursed: 0,
    aidTypes: [] as string[],
    flowTypes: [] as string[],
    totalTransactions: 0,
    draftCount: 0,
    actualCount: 0
  })
  const [totalActualSpending, setTotalActualSpending] = useState(0)
  
  // State for show more/less in partner sections
  const [showAllFundingPartners, setShowAllFundingPartners] = useState(false)
  const [showAllImplementingPartners, setShowAllImplementingPartners] = useState(false)
  const [showAllExtendingPartners, setShowAllExtendingPartners] = useState(false)
  const [showAllAccountablePartners, setShowAllAccountablePartners] = useState(false)
  const [showAllSidebarPartners, setShowAllSidebarPartners] = useState(false)

  // Track which tabs have loaded their data (for lazy loading)
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['finances']))
  const [loadingTabs, setLoadingTabs] = useState<Set<string>>(new Set())

  // Initial data fetch - only essential data for sidebar and default tab
  useEffect(() => {
    if (params?.id) {
      fetchActivity(true)
      loadAllPartners();
      fetchParticipatingOrgs();
      fetchPlannedDisbursements();
      fetchCountriesRegions();
      fetchGovernmentEndorsement();
    }
  }, [params?.id])

  // Lazy load tab-specific data when tab is first visited
  useEffect(() => {
    if (!params?.id || loadedTabs.has(activeTab)) return;

    const loadTabData = async () => {
      setLoadingTabs(prev => new Set([...prev, activeTab]));
      try {
        switch (activeTab) {
          case 'geography':
            await Promise.all([
              fetchActivityLocations(),
              fetchSubnationalBreakdowns()
            ]);
            break;
          case 'library':
            await fetchDocuments();
            break;
        }
        setLoadedTabs(prev => new Set([...prev, activeTab]));
      } finally {
        setLoadingTabs(prev => {
          const next = new Set(prev);
          next.delete(activeTab);
          return next;
        });
      }
    };

    loadTabData();
  }, [activeTab, params?.id])

  const fetchParticipatingOrgs = async () => {
    if (!params?.id) return;
    try {
      const response = await apiFetch(`/api/activities/${params.id}/participating-organizations`);
      if (response.ok) {
        const data = await response.json();
        setParticipatingOrgs(data);
      }
    } catch (error) {
      console.error('Error fetching participating organizations:', error);
    }
  }

  const fetchPlannedDisbursements = async () => {
    if (!params?.id) return;
    try {
      const response = await apiFetch(`/api/activities/${params.id}/planned-disbursements`);
      if (response.ok) {
        const data = await response.json();
        setPlannedDisbursements(data || []);
      }
    } catch (error) {
      console.error('Error fetching planned disbursements:', error);
      setPlannedDisbursements([]);
    }
  }

  const fetchDocuments = async () => {
    if (!params?.id) return;
    try {
      const response = await apiFetch(`/api/activities/${params.id}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    }
  }

  const fetchGovernmentEndorsement = async () => {
    if (!params?.id) return;
    try {
      setLoadingEndorsement(true);
      const response = await apiFetch(`/api/activities/${params.id}/government-endorsement`);
      if (response.ok) {
        const data = await response.json();
        setGovernmentEndorsement(data.endorsement || null);
      }
    } catch (error) {
      console.error('Error fetching government endorsement:', error);
      setGovernmentEndorsement(null);
    } finally {
      setLoadingEndorsement(false);
    }
  }

  const fetchActivityLocations = async () => {
    if (!params?.id) return;
    try {
      const response = await apiFetch(`/api/activities/${params.id}/locations`);
      if (response.ok) {
        const data = await response.json();
        // API returns { success: true, locations: [...] }
        if (data.success && data.locations) {
          // Store all locations for the cards list (matches Activity Editor)
          setAllActivityLocations(data.locations || []);
          // Filter for locations with coordinates (for map display)
          const locationsWithCoords = data.locations.filter((loc: any) => 
            loc.latitude && loc.longitude
          );
          setActivityLocations(locationsWithCoords);
        } else {
          setAllActivityLocations([]);
          setActivityLocations([]);
        }
      } else {
        setAllActivityLocations([]);
        setActivityLocations([]);
      }
    } catch (error) {
      console.error('Error fetching activity locations:', error);
      setAllActivityLocations([]);
      setActivityLocations([]);
    }
  }

  const fetchSubnationalBreakdowns = async () => {
    if (!params?.id) return;
    try {
      const response = await apiFetch(`/api/activities/${params.id}/subnational-breakdown`);
      if (response.ok) {
        const data = await response.json();
        // Convert array to object with region_name as key and percentage as value
        const breakdownsObj: Record<string, number> = {};
        (data || []).forEach((item: any) => {
          breakdownsObj[item.region_name] = parseFloat(item.percentage) || 0;
        });
        setSubnationalBreakdowns(breakdownsObj);
      }
    } catch (error) {
      console.error('Error fetching subnational breakdowns:', error);
      setSubnationalBreakdowns({});
    }
  }

  const fetchCountriesRegions = async () => {
    if (!params?.id) return;
    try {
      const response = await apiFetch(`/api/activities/${params.id}/countries-regions`);
      if (response.ok) {
        const data = await response.json();
        setCountryAllocations(data.countries || []);
        setRegionAllocations(data.regions || []);
      }
    } catch (error) {
      console.error('Error fetching countries/regions:', error);
      setCountryAllocations([]);
      setRegionAllocations([]);
    }
  }

  const fetchReportingOrg = async () => {
    if (!activity?.reporting_org_id) {
      setReportingOrg(null);
      return;
    }
    try {
      const response = await apiFetch(`/api/organizations/${activity.reporting_org_id}`);
      if (response.ok) {
        const data = await response.json();
        setReportingOrg(data);
      } else {
        setReportingOrg(null);
      }
    } catch (error) {
      console.error('Error fetching reporting organization:', error);
      setReportingOrg(null);
    }
  }

  // Fetch reporting org when activity is loaded
  useEffect(() => {
    if (activity?.reporting_org_id) {
      fetchReportingOrg();
    } else {
      setReportingOrg(null);
    }
  }, [activity?.reporting_org_id])

  // Refresh activity data when comments tab is selected to ensure we have latest comments count
  useEffect(() => {
    if (activeTab === "comments" && activity) {
      fetchActivity(false) // Don't show loading when just refreshing
    }
  }, [activeTab])

  // Set collapsible sections state based on data availability
  // Open by default, close only if empty
  useEffect(() => {
    if (activity) {
      setIsTransactionsOpen(!!(activity.transactions && activity.transactions.length > 0))
    }
  }, [activity])

  // Update section states when data changes - close if empty
  useEffect(() => {
    // Only update state once budgets have been fetched (including empty array)
    if (budgets !== undefined) {
      setIsBudgetsOpen(budgets.length > 0)
    }
  }, [budgets])

  useEffect(() => {
    // Only update state once planned disbursements have been fetched (including empty array)
    if (plannedDisbursements !== undefined) {
      setIsPlannedOpen(plannedDisbursements.length > 0)
    }
  }, [plannedDisbursements])

  // Auto-close transactions section if no transactions
  useEffect(() => {
    if (activity?.transactions !== undefined) {
      setIsTransactionsOpen((activity.transactions?.length || 0) > 0)
    }
  }, [activity?.transactions])

  const fetchActivity = async (showLoading = true) => {
    if (!params?.id) return;

    try {
      if (showLoading) setLoading(true)
      const activityId = Array.isArray(params.id) ? params.id[0] : params.id;
      const found = await fetchActivityWithCache(activityId)
      if (found) {
          console.log('[ACTIVITY DETAIL DEBUG] Found activity:', found);
          console.log('[ACTIVITY DETAIL DEBUG] Activity contacts:', found.contacts);
          console.log('[ACTIVITY DETAIL DEBUG] Contacts count:', found.contacts?.length || 0);
          console.log('[ACTIVITY DETAIL DEBUG] Banner position from API:', found.bannerPosition);

          setActivity(found)
          setBanner(found.banner || null)
          setBannerPosition(found.bannerPosition ?? 50)
          setSdgMappings(found.sdgMappings || [])
          
          // Convert partner data to display format
          const allPartners: Partner[] = []
          
          // Add extending partners
          if (found.extendingPartners) {
            found.extendingPartners.forEach((p: any) => {
              allPartners.push({
                id: p.orgId,
                name: p.name,
                role: "Extending Partner",
                type: "extending"
              })
            })
          }
          
          // Add implementing partners  
          if (found.implementingPartners) {
            found.implementingPartners.forEach((p: any) => {
              allPartners.push({
                id: p.orgId,
                name: p.name,
                role: "Implementing Partner",
                type: "implementing"
              })
            })
          }
          
          // Add government partners
          if (found.governmentPartners) {
            found.governmentPartners.forEach((p: any) => {
              allPartners.push({
                id: p.orgId,
                name: p.name,
                role: "Government Partner",
                type: "government"
              })
            })
          }
          
          setPartners(allPartners);
        } else {
          toast.error("Activity not found");
        }
    } catch (error) {
      console.error("Error fetching activity:", error);
      toast.error("Failed to load activity");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadAllPartners = async () => {
    try {
      const res = await apiFetch("/api/partners");
      if (res.ok) {
        const data = await res.json();
        setAllPartners(data);
      }
    } catch (error) {
      console.error("Error loading all partners:", error);
    }
  }

  const fetchBudgets = async () => {
    if (!params?.id) return;
    
    try {
      const res = await apiFetch(`/api/activities/${params.id}/budgets`);
      if (res.ok) {
        const budgetData = await res.json();
        setBudgets(budgetData || []);
      }
    } catch (error) {
      console.error("Error fetching budgets:", error);
      // Set empty array as fallback
      setBudgets([]);
    }
  }

  const handleBannerChange = async (newBanner: string | null, position?: number) => {
    setBanner(newBanner)
    if (position !== undefined) {
      setBannerPosition(position)
    }
    // Save banner to backend
    if (!activity?.id) return
    try {
      const res = await apiFetch(`/api/activities/${activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banner: newBanner,
          bannerPosition: position ?? bannerPosition
        }),
      })
      if (!res.ok) throw new Error("Failed to save banner")
      toast.success("Banner updated successfully")
      setShowEditBanner(false)
    } catch (error) {
      console.error("Error saving banner:", error)
      toast.error("Failed to save banner")
    }
  }

  // Update ref whenever activity changes
  useEffect(() => {
    activityRef.current = activity
  }, [activity])

  // Calculate financial summary with USD conversion
  useEffect(() => {
    let cancelled = false;
    
    const calculateFinancials = async () => {
      const transactions: any[] = activity?.transactions || []
      
      // Include all transactions regardless of status for profile view
      // This ensures published activities show their financial data
      const allTransactions = transactions
      
      // IATI transaction types:
      // '2' = Outgoing Commitment
      // '3' = Disbursement  
      // '4' = Expenditure
      
      // Debug logging to identify what's being counted
      console.log('[Total Committed Debug] Total transactions:', allTransactions.length);
      const typeBreakdown = allTransactions.reduce((acc: any, t: any) => {
        const type = normalizeTransactionType(t.transaction_type);
        if (!acc[type]) acc[type] = { count: 0, totalValue: 0, currencies: new Set() };
        acc[type].count++;
        acc[type].totalValue += (parseFloat(t.value) || 0);
        acc[type].currencies.add(t.currency || 'unknown');
        return acc;
      }, {});
      console.log('[Total Committed Debug] Transaction type breakdown:', 
        Object.entries(typeBreakdown).map(([type, data]: [string, any]) => ({
          type,
          count: data.count,
          totalValue: data.totalValue,
          currencies: Array.from(data.currencies)
        }))
      );
      
      // Calculate commitment - normalize transaction_type to string for comparison
      const commitmentTransactions = allTransactions.filter(t => {
        const type = normalizeTransactionType(t.transaction_type);
        return type === "2";
      });
      
      console.log('[Total Committed Debug] Commitment transactions found:', commitmentTransactions.length);
      console.log('[Total Committed Debug] Commitment transaction details:', 
        commitmentTransactions.map(t => ({
          id: t.id || t.uuid,
          type: t.transaction_type,
          normalizedType: normalizeTransactionType(t.transaction_type),
          status: t.status,
          value: t.value,
          currency: t.currency,
          value_usd: t.value_usd || t.value_USD || t.usd_value,
          transaction_date: t.transaction_date,
          value_date: t.value_date
        }))
      );
      
      const commitmentPromises = commitmentTransactions.map(async (t) => {
        const usdValue = await getTransactionUSDValue(t);
        if (usdValue > 0) {
          console.log('[Total Committed Debug] Transaction', t.id || t.uuid, '→ USD:', usdValue, {
            original: t.value,
            currency: t.currency,
            stored_usd: t.value_usd || t.value_USD || t.usd_value,
            date: t.transaction_date || t.value_date
          });
        }
        return usdValue;
      });
      const commitmentValues = await Promise.all(commitmentPromises);
      console.log('[Total Committed Debug] All commitment USD values:', commitmentValues);
      const commitment = commitmentValues.reduce((sum, val) => sum + val, 0);
      console.log('[Total Committed Debug] Final commitment total:', commitment, '($' + (commitment / 1000000).toFixed(2) + 'm)');

      // Calculate disbursement - normalize transaction_type to string for comparison
      const disbursementPromises = allTransactions
        .filter(t => normalizeTransactionType(t.transaction_type) === "3")
        .map(t => getTransactionUSDValue(t));
      const disbursementValues = await Promise.all(disbursementPromises);
      const disbursement = disbursementValues.reduce((sum, val) => sum + val, 0);

      // Calculate expenditure - normalize transaction_type to string for comparison
      const expenditurePromises = allTransactions
        .filter(t => normalizeTransactionType(t.transaction_type) === "4")
        .map(t => getTransactionUSDValue(t));
      const expenditureValues = await Promise.all(expenditurePromises);
      const expenditure = expenditureValues.reduce((sum, val) => sum + val, 0);
      
      // Get unique aid types and flow types
      const aidTypes = Array.from(new Set(transactions.map(t => t.aid_type).filter(Boolean)))
      const flowTypes = Array.from(new Set(transactions.map(t => t.flow_type).filter(Boolean)))
      
      // Calculate draft vs actual
      const draftTransactions = transactions.filter(t => t.status === "draft")
      const actualTransactions = transactions.filter(t => t.status === "actual")
      
      // Only update state if this effect hasn't been cancelled (activity hasn't changed)
      if (!cancelled) {
        setFinancials({
          totalCommitment: commitment,
          totalDisbursement: disbursement,
          totalExpenditure: expenditure,
          percentDisbursed: commitment > 0 && !isNaN(disbursement) && !isNaN(commitment) 
            ? Math.round((disbursement / commitment) * 100) 
            : 0,
          aidTypes,
          flowTypes,
          totalTransactions: transactions.length,
          draftCount: draftTransactions.length,
          actualCount: actualTransactions.length
        })
      }
    }

    if (activity) {
      calculateFinancials();
    }
    
    return () => {
      cancelled = true;
    };
  }, [activity])

  // Calculate actual spending (disbursement + expenditure) in USD
  useEffect(() => {
    let cancelled = false;
    
    const calculateTotalActualSpending = async () => {
      const transactions = activity?.transactions || [];

      const spendingPromises = transactions
        .filter((t: any) => {
          const type = normalizeTransactionType(t.transaction_type);
          return type === '3' || type === '4';
        })
        .map((t: any) => getTransactionUSDValue(t));
      
      const spendingValues = await Promise.all(spendingPromises);
      const total = spendingValues.reduce((sum, val) => sum + val, 0);
      
      // Only update state if this effect hasn't been cancelled (activity hasn't changed)
      if (!cancelled) {
        setTotalActualSpending(total);
      }
    };

    if (activity) {
      calculateTotalActualSpending();
    }
    
    return () => {
      cancelled = true;
    };
  }, [activity]);

  // Calculate total planned disbursements (USD only) - must be before early returns
  const totalPlannedDisbursements = (plannedDisbursements || []).reduce((sum: number, pd: any) => {
    // Use usdAmount if available (primary source)
    if (pd.usdAmount != null && pd.usdAmount > 0) {
      return sum + parseFloat(pd.usdAmount);
    }
    // If currency is USD, use the amount directly
    if (pd.currency === 'USD' && pd.amount && pd.amount > 0) {
      return sum + parseFloat(pd.amount);
    }
    // For non-USD planned disbursements without usdAmount, skip (0 contribution)
    // This ensures we only show USD values
    return sum;
  }, 0);

  // Calculate total budgeted (USD only, return 0 if no budgets) - must be before early returns
  const totalBudgeted = budgets?.length > 0 ? budgets.reduce((sum: number, b: any) => {
    // Use usd_value if available (primary source)
    if (b.usd_value != null && b.usd_value > 0) {
      return sum + parseFloat(b.usd_value);
    }
    // If currency is USD, use the value directly
    if (b.currency === 'USD' && b.value && b.value > 0) {
      return sum + parseFloat(b.value);
    }
    // For non-USD budgets without usd_value, skip (0 contribution)
    // This ensures we only show USD values
    return sum;
  }, 0) : 0;

  // Calculate progress percentages - must be before early returns
  const financialDeliveryPercent = financials.totalCommitment > 0 
    ? Math.round(((financials.totalDisbursement + financials.totalExpenditure) / financials.totalCommitment) * 100)
    : 0;
  
  const implementationVsPlanPercent = totalBudgeted > 0
    ? Math.round(((financials.totalDisbursement + financials.totalExpenditure) / totalBudgeted) * 100)
    : 0;

  // Calculate financial data by sector based on percentage allocation (reactive to state changes) - must be before early returns
  const sectorFinancialData = React.useMemo(() => {
    if (!activity?.sectors) return [];
    
    // Group transactions by type and sum values
    const transactions = activity?.transactions || [];
    const transactionTypeBreakdown: Record<string, number> = {};
    
    transactions.forEach((t: any) => {
      const type = t.transaction_type;
      if (type) {
        const value = t.value_usd ?? t.value ?? 0;
        transactionTypeBreakdown[type] = (transactionTypeBreakdown[type] || 0) + value;
      }
    });
    
    return activity.sectors.map((sector: any) => {
      const sectorPercentage = (sector.percentage || 0) / 100;
      
      // Build transaction type breakdown for this sector
      const sectorTransactionTypes: Record<string, number> = {};
      Object.entries(transactionTypeBreakdown).forEach(([type, amount]) => {
        sectorTransactionTypes[type] = amount * sectorPercentage;
      });
      
      return {
        code: sector.sector_code || sector.code,
        budget: totalBudgeted * sectorPercentage,
        plannedDisbursement: totalPlannedDisbursements * sectorPercentage,
        transactionTypes: sectorTransactionTypes
      };
    });
  }, [activity?.sectors, activity?.transactions, totalBudgeted, totalPlannedDisbursements]);

  const handleIconChange = useCallback(async (newIcon: string | null) => {
    const currentActivity = activityRef.current
    if (!currentActivity?.id) return
    // Save icon to backend
    try {
      const res = await apiFetch(`/api/activities/${currentActivity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icon: newIcon }),
      })
      if (!res.ok) throw new Error("Failed to save icon")

      toast.success("Icon updated successfully")

      // Update local icon state so button disappears and icon shows immediately
      // without touching the activity object (which could trigger TransactionTab re-renders)
      setLocalIcon(newIcon)

      // Close dialog
      setShowEditIcon(false)

      // Invalidate cache but DON'T update activity state immediately to avoid triggering
      // re-renders in TransactionTab/TransactionList that could cause infinite loops
      invalidateActivityCache(currentActivity.id)

      // Note: Activity state will be updated on next page refresh or cache refresh
      // This prevents triggering infinite loops in child components
    } catch (error) {
      console.error("Error saving icon:", error)
      toast.error("Failed to save icon")
    }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleEdit = () => {
    router.push(`/activities/new?id=${activity?.id}`)
  }

  const handlePrintPDF = () => {
    window.print();
  }

  const handleExportCSV = () => {
    if (!activity) return;

    // Compile comprehensive CSV data
    const csvRows: string[][] = [];
    
    // Header
    csvRows.push(['Activity Profile Export', activity.title || '']);
    csvRows.push(['Generated', new Date().toISOString()]);
    csvRows.push([]);
    
    // Basic Information
    csvRows.push(['BASIC INFORMATION']);
    csvRows.push(['IATI Identifier', activity.iatiIdentifier || '']);
    csvRows.push(['Activity ID', activity.id || '']);
    csvRows.push(['Title', activity.title || '']);
    csvRows.push(['Acronym', activity.acronym || '']);
    csvRows.push(['Description', (activity.description || '').replace(/\n/g, ' ')]);
    csvRows.push(['Status', activity.activityStatus || '']);
    csvRows.push(['Default Currency', activity.defaultCurrency || '']);
    csvRows.push(['Planned Start Date', activity.plannedStartDate || '']);
    csvRows.push(['Planned End Date', activity.plannedEndDate || '']);
    csvRows.push(['Actual Start Date', activity.actualStartDate || '']);
    csvRows.push(['Actual End Date', activity.actualEndDate || '']);
    csvRows.push([]);
    
    // Sectors
    if (activity.sectors && activity.sectors.length > 0) {
      csvRows.push(['SECTORS']);
      csvRows.push(['Code', 'Name', 'Percentage']);
      activity.sectors.forEach((s: any) => {
        csvRows.push([
          s.sector_code || s.code || '',
          s.sector_name || s.name || '',
          `${s.percentage || 0}%`
        ]);
      });
      csvRows.push([]);
    }
    
    // Partners
    const allPartnersList = partners || [];
    if (allPartnersList.length > 0) {
      csvRows.push(['PARTNERS']);
      csvRows.push(['Name', 'Type', 'Role']);
      allPartnersList.forEach((p: Partner) => {
        csvRows.push([
          p.name || '',
          p.type || '',
          p.role || ''
        ]);
      });
      csvRows.push([]);
    }
    
    // Budgets
    if (budgets && budgets.length > 0) {
      csvRows.push(['BUDGETS']);
      csvRows.push(['Period Start', 'Period End', 'Type', 'Status', 'Value', 'Currency', 'USD Value']);
      budgets.forEach((b: any) => {
        csvRows.push([
          b.period_start || '',
          b.period_end || '',
          b.type === 1 ? 'Original' : 'Revised',
          b.status === 1 ? 'Indicative' : 'Committed',
          b.value?.toString() || '0',
          b.currency || '',
          b.usd_value?.toString() || ''
        ]);
      });
      csvRows.push([]);
    }
    
    // Transactions
    if (activity.transactions && activity.transactions.length > 0) {
      csvRows.push(['TRANSACTIONS']);
      csvRows.push(['Date', 'Type', 'Provider', 'Receiver', 'Value', 'Currency', 'Finance Type', 'Aid Type']);
      activity.transactions.forEach((t: any) => {
        csvRows.push([
          t.transaction_date || '',
          TRANSACTION_TYPE_LABELS[t.transaction_type as keyof typeof TRANSACTION_TYPE_LABELS] || t.transaction_type || '',
          t.provider_org_name || '',
          t.receiver_org_name || '',
          t.value?.toString() || '0',
          t.currency || '',
          t.finance_type || '',
          t.aid_type || ''
        ]);
      });
      csvRows.push([]);
    }
    
    // SDG Mappings
    if (sdgMappings && sdgMappings.length > 0) {
      csvRows.push(['SDG ALIGNMENT']);
      csvRows.push(['Goal', 'Target']);
      sdgMappings.forEach((m: any) => {
        const sdgGoal = m.sdgGoal || m.sdg_goal;
        csvRows.push([
          `${sdgGoal}: ${SDG_GOALS.find(g => g.id === parseInt(sdgGoal.toString()))?.name || ''}`,
          m.sdgTarget || m.sdg_target || ''
        ]);
      });
      csvRows.push([]);
    }
    
    // Convert to CSV string
    const csvContent = csvRows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-profile-${activity.id}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Activity profile exported to CSV');
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="w-full p-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <Skeleton className="h-64 w-full mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!activity) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md mx-auto border-slate-200 bg-white">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Activity Not Found</h3>
                <p className="text-slate-600 mb-4">
                  The activity you are looking for could not be found.
                </p>
                <Button onClick={() => router.push("/activities")} className="bg-slate-600 hover:bg-slate-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Activities
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set'
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Not set';
      return format(date, 'dd MMM yyyy')
    } catch {
      return 'Not set'
    }
  }

  // Helper function to render label with help tooltip
  const LabelWithHelp = ({ label, helpText }: { label: string; helpText: string }) => (
    <div className="flex items-center gap-1">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <HelpCircle className="h-3 w-3 text-slate-400 hover:text-slate-600 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="text-sm whitespace-pre-line">{helpText}</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  // Helper function for status-aware date display
  const getDisplayDates = (activity: Activity) => {
    if (!activity) return null;
    
    const activityStatus = activity.activityStatus?.toLowerCase() || '1'; // Default to Pipeline code
    const isPipeline = activityStatus === 'planning' || activityStatus === 'pipeline' || activityStatus === '1';
    const isActive = activityStatus === 'implementation' || activityStatus === 'active' || activityStatus === '2';
    const isClosed = ['completed', 'cancelled', 'suspended', '4', '5', '6'].includes(activityStatus);

    return (
      <div className="space-y-2 text-sm">
        {activity.plannedStartDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="font-medium text-gray-900">Planned Start:</span>
            <span className="text-slate-700">{formatDate(activity.plannedStartDate)}</span>
          </div>
        )}
        {isPipeline && activity.plannedEndDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="font-medium text-gray-900">Planned End:</span>
            <span className="text-slate-700">{formatDate(activity.plannedEndDate)}</span>
          </div>
        )}
        {(isActive || isClosed) && activity.actualStartDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="font-medium text-gray-900">Actual Start:</span>
            <span className="text-slate-700">{formatDate(activity.actualStartDate)}</span>
          </div>
        )}
        {isClosed && activity.actualEndDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-green-500" />
            <span className="font-medium text-gray-900">Actual End:</span>
            <span className="text-slate-700">{formatDate(activity.actualEndDate)}</span>
          </div>
        )}
        {/* Unified Date History Button */}
        <AllDatesHistory 
          activityId={activity.id} 
          dates={{
            plannedStartDate: activity.plannedStartDate,
            plannedEndDate: activity.plannedEndDate,
            actualStartDate: activity.actualStartDate,
            actualEndDate: activity.actualEndDate
          }}
          customDates={activity.customDates}
        />
      </div>
    );
  }

  const getTransactionTypeName = (type: string) => {
    if (!type) return '-';
    return TRANSACTION_TYPE_LABELS[type as keyof typeof TRANSACTION_TYPE_LABELS] || type;
  }

  const getAidTypeName = (code: string) => {
    const aidTypes: Record<string, string> = {
      "A01": "General budget support",
      "A02": "Sector budget support",
      "B01": "Core support to NGOs",
      "B02": "Core contributions to multilateral institutions",
      "C01": "Project-type interventions",
      "D01": "Donor country personnel",
      "D02": "Other technical assistance",
      "E01": "Scholarships/training in donor country",
      "E02": "Imputed student costs",
      "F01": "Debt relief",
      "G01": "Administrative costs not included elsewhere",
      "H01": "Development awareness",
      "H02": "Refugees/asylum seekers in donor countries"
    }
    return aidTypes[code] || code
  }

  const getFlowTypeName = (code: string) => {
    const flowTypes: Record<string, string> = {
      "10": "ODA",
      "20": "OOF",
      "35": "Non-export credit OOF",
      "40": "ODA Loans"
    }
    return flowTypes[code] || code
  }

  return (
    <MainLayout>
      <div className="min-h-screen">
        {/* Page top anchor for reliable scrolling */}
        <div id="page-top" className="absolute top-0" />
        <div className="w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/activities')}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Activities
            </Button>
            
            <div className="flex gap-2">
              {!banner && !showEditBanner && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditBanner(true)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Banner
                </Button>
              )}
              {!activity?.icon && !localIcon && !showEditIcon && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditIcon(true)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Add Icon/Logo
                </Button>
              )}
              <CommentsDrawer activityId={activity.id}>
                <Button 
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Comments
                </Button>
              </CommentsDrawer>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Profile
              </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handlePrintPDF}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    try {
                      toast.info("Generating IATI XML...");
                      const response = await apiFetch(`/api/activities/${activity?.id}/export-iati`);
                      if (!response.ok) throw new Error('Export failed');
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${activity?.iati_id || activity?.id}.xml`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                      toast.success("IATI XML exported successfully");
                    } catch (error) {
                      toast.error("Failed to export IATI XML");
                    }
                  }}>
                    <FileCode className="h-4 w-4 mr-2" />
                    Export to IATI XML
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => activity?.id && toggleBookmark(activity.id)}
                disabled={isToggling || !activity?.id}
              >
                {activity?.id && isBookmarked(activity.id) ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 mr-2 text-slate-600" />
                    Bookmarked
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Bookmark
                  </>
                )}
              </Button>
              <div className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 h-10 hover:bg-slate-100 transition-colors">
                <ActivityVote
                  activityId={activity?.id || ''}
                  userId={user?.id}
                  size="sm"
                  variant="horizontal"
                />
              </div>
              <Link
                href={`/activities/new?id=${activity?.id}`}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Activity
              </Link>
            </div>
          </div>

          {/* Banner Upload Modal */}
          <Dialog open={showEditBanner} onOpenChange={setShowEditBanner}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Banner Image</DialogTitle>
                <DialogDescription>
                  Upload a banner image for this activity. Recommended size: 1200x400px
                </DialogDescription>
              </DialogHeader>
              <BannerUpload
                currentBanner={banner || undefined}
                currentPosition={bannerPosition}
                onBannerChange={handleBannerChange}
                activityId={activity.id}
              />
            </DialogContent>
          </Dialog>

          {/* Icon Upload Modal */}
          <Dialog open={showEditIcon} onOpenChange={setShowEditIcon}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Icon/Logo</DialogTitle>
                <DialogDescription>
                  Upload an icon or logo for this activity. Recommended size: 512x512px
                </DialogDescription>
              </DialogHeader>
              <IconUpload
                currentIcon={activity?.icon || localIcon || undefined}
                onIconChange={handleIconChange}
                activityId={activity?.id || ""}
              />
            </DialogContent>
          </Dialog>

          {/* Activity Header Card */}
          <Card className="mb-6 border-0 shadow-none overflow-hidden">
            {/* Banner Image */}
            {banner ? (
              <div className="w-full h-80 overflow-hidden">
                <img
                  src={banner}
                  alt={`${activity.title} banner`}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: `center ${bannerPosition}%` }}
                />
              </div>
            ) : null}
            
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                {/* Main Content - Columns 1-3 */}
                <div className="lg:col-span-3">
                  <div className="flex items-start gap-8">
                    {/* Left Column: Icon/Logo, Locations, Defaults, Tags */}
                    {((activity.icon || localIcon) || 
                      (countryAllocations.length > 0 || regionAllocations.length > 0) || 
                      (activity.activityScope || activity.collaborationType || activity.defaultAidType || activity.defaultFinanceType || activity.defaultFlowType || activity.defaultTiedStatus || activity.hierarchy) ||
                      (activity.tags && activity.tags.length > 0)) && (
                      <div className="flex-shrink-0">
                        {/* Icon/Logo */}
                        {(activity.icon || localIcon) && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                            <img
                              src={activity.icon || localIcon || ""}
                              alt={`${activity.title} icon`}
                              className="object-contain"
                              style={{
                                width: `${activity.iconScale ?? 100}%`,
                                height: `${activity.iconScale ?? 100}%`,
                                maxWidth: 'none',
                                maxHeight: 'none',
                              }}
                            />
                          </div>
                        )}
                        {/* Country/Region Pills */}
                        {(countryAllocations.length > 0 || regionAllocations.length > 0) && (
                          <div className={`${(activity.icon || localIcon) ? 'mt-3' : ''} w-full max-w-[12rem]`}>
                            <div className="text-slate-500 mb-2 text-xs font-medium">Locations</div>
                            <div className="flex flex-wrap gap-1.5">
                              {countryAllocations.map((countryAlloc: any) => (
                                <div 
                                  key={countryAlloc.id || countryAlloc.country?.code} 
                                  className="flex items-center gap-1.5 text-xs"
                                >
                                  <img
                                    src={`https://flagcdn.com/w20/${(countryAlloc.country?.code || '').toLowerCase()}.png`}
                                    alt={`${countryAlloc.country?.name || 'Country'} flag`}
                                    className="w-4 h-3 object-cover rounded-sm flex-shrink-0"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                  <span className="text-slate-900">
                                    {countryAlloc.country?.name || countryAlloc.country?.code || 'Unknown Country'}
                                  </span>
                                </div>
                              ))}
                              {regionAllocations.map((regionAlloc: any) => (
                                <Badge 
                                  key={regionAlloc.id || regionAlloc.region?.code} 
                                  variant="secondary" 
                                  className="text-[10px] px-2 py-0.5"
                                >
                                  {regionAlloc.region?.name || regionAlloc.region?.code || 'Unknown Region'}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Divider between Locations and Classification Fields */}
                        {(countryAllocations.length > 0 || regionAllocations.length > 0) && (activity.activityScope || activity.collaborationType || activity.defaultAidType || activity.defaultFinanceType || activity.defaultFlowType || activity.defaultTiedStatus || activity.hierarchy) && (
                          <div className="mt-3 mb-3 border-b border-slate-200"></div>
                        )}
                        {/* Activity Classification Fields */}
                        {(activity.activityScope || activity.collaborationType || activity.defaultAidType || activity.defaultFinanceType || activity.defaultFlowType || activity.defaultTiedStatus || activity.hierarchy) && (
                          <div className={`${(activity.icon || localIcon) || (countryAllocations.length > 0 || regionAllocations.length > 0) ? 'mt-3' : ''} w-full max-w-[12rem] ${(activity.tags && activity.tags.length > 0) ? 'pb-3 border-b border-slate-200' : ''}`}>
                            <div className="flex flex-col gap-y-2 text-xs">
                              {activity.hierarchy && (
                                <div className="text-slate-600">
                                  <div className="text-slate-500 mb-1">Hierarchy</div>
                                  <div className="font-medium text-slate-900 break-words">
                                    {getHierarchyLabel(activity.hierarchy) || `Level ${activity.hierarchy}`}
                                  </div>
                                </div>
                              )}
                              {activity.collaborationType && (
                                <div className="text-slate-600">
                                  <div className="text-slate-500 mb-1">Collaboration Type:</div>
                                  <div className="font-medium text-slate-900 break-words">
                                    {getCollaborationTypeLabel(activity.collaborationType) || activity.collaborationType}
                                  </div>
                                </div>
                              )}
                              {activity.defaultFlowType && (
                                <div className="text-slate-600">
                                  <div className="text-slate-500 mb-1">Default Flow Type</div>
                                  <div className="font-medium text-slate-900 break-words">
                                    {activity.defaultFlowType === '0' || activity.defaultFlowType === 0 ? (
                                      <span className="text-slate-400 italic text-sm font-normal">Blank</span>
                                    ) : (
                                      <CodelistTooltip
                                        type="flow_type"
                                        code={activity.defaultFlowType}
                                        displayLabel={FLOW_TYPE_LABELS[activity.defaultFlowType] || activity.defaultFlowType}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                              {activity.defaultFinanceType && (
                                <div className="text-slate-600">
                                  <div className="text-slate-500 mb-1">Default Finance Type</div>
                                  <div className="font-medium text-slate-900 break-words">
                                    {activity.defaultFinanceType === '0' || activity.defaultFinanceType === 0 ? (
                                      <span className="text-slate-400 italic text-sm font-normal">Blank</span>
                                    ) : (
                                      <CodelistTooltip
                                        type="finance_type"
                                        code={activity.defaultFinanceType}
                                        displayLabel={FINANCE_TYPE_LABELS[activity.defaultFinanceType] || activity.defaultFinanceType}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                              {activity.defaultAidType && (
                                <div className="text-slate-600">
                                  <div className="text-slate-500 mb-1">Default Aid Type</div>
                                  <div className="font-medium text-slate-900 break-words">
                                    {activity.defaultAidType === '0' || activity.defaultAidType === 0 ? (
                                      <span className="text-slate-400 italic text-sm font-normal">Blank</span>
                                    ) : (
                                      <CodelistTooltip
                                        type="aid_type"
                                        code={activity.defaultAidType}
                                        displayLabel={AID_TYPE_LABELS[activity.defaultAidType] || activity.defaultAidType}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                              {activity.defaultTiedStatus && (
                                <div className="text-slate-600">
                                  <div className="text-slate-500 mb-1">Default Tied Status</div>
                                  <div className="font-medium text-slate-900 break-words">
                                    {activity.defaultTiedStatus === '0' || activity.defaultTiedStatus === 0 ? (
                                      <span className="text-slate-400 italic text-sm font-normal">Blank</span>
                                    ) : (
                                      <CodelistTooltip
                                        type="tied_status"
                                        code={activity.defaultTiedStatus}
                                        displayLabel={TIED_STATUS_LABELS[activity.defaultTiedStatus as keyof typeof TIED_STATUS_LABELS] || activity.defaultTiedStatus}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                              {activity.activityScope && (
                                <div className="text-slate-600">
                                  <div className="text-slate-500 mb-1">Scope</div>
                                  <div className="font-medium text-slate-900 break-words">
                                    {activity.activityScope === '0' || activity.activityScope === 0 ? (
                                      <span className="text-slate-400 italic text-sm font-normal">Blank</span>
                                    ) : (
                                      getActivityScopeLabel(activity.activityScope) || activity.activityScope
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Tags */}
                        {activity.tags && activity.tags.length > 0 && (
                          <div className={`${(activity.icon || localIcon) || (countryAllocations.length > 0 || regionAllocations.length > 0) || (activity.activityScope || activity.collaborationType || activity.defaultAidType || activity.defaultFinanceType || activity.defaultFlowType || activity.defaultTiedStatus || activity.hierarchy) ? 'mt-3' : ''} flex flex-wrap gap-1 max-w-[12rem]`}>
                          {activity.tags.slice(0, 12).map((t: any) => (
                            <Badge key={t.id || t.name} variant={getTagColorVariant(t.name)} className="text-[10px] px-1.5 py-0.5">
                              {t.name}
                            </Badge>
                          ))}
                        </div>
                        )}
                      </div>
                    )}

                    {/* Activity Info */}
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-slate-900 mb-3 group">
                        {activity.title}{activity.acronym && <span> ({activity.acronym})</span>}{' '}
                        <button
                          onClick={() => copyToClipboard(activity.title || '', 'activityTitle')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-slate-700 inline-flex items-center align-middle"
                          title="Copy Activity Title"
                        >
                          {copiedId === 'activityTitle' ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      </h1>
                      
                      <div className="space-y-3">
                        {/* First Row: Activity ID, IATI ID and Status Badges */}
                        <div className="flex flex-wrap items-center gap-3 py-3 border-y border-slate-200">
                          {activity.partnerId && (
                            <div className="flex items-center gap-1 group">
                              <code className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded font-mono">
                                {activity.partnerId}
                              </code>
                              <button
                                onClick={() => copyToClipboard(activity.partnerId || '', 'activityId')}
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-slate-700 flex-shrink-0 p-1"
                                title="Copy Activity ID"
                              >
                                {copiedId === 'activityId' ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                          {activity.iatiIdentifier && (
                            <div className="flex items-center gap-1 group">
                              <code className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded font-mono">
                                {activity.iatiIdentifier}
                              </code>
                              <button
                                onClick={() => copyToClipboard(activity.iatiIdentifier || '', 'iatiIdentifier')}
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-slate-700 flex-shrink-0 p-1"
                                title="Copy IATI Identifier"
                              >
                                {copiedId === 'iatiIdentifier' ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                          <Badge 
                            className={
                              activity.activityStatus === "completed" || activity.activityStatus === "4" ? "bg-green-100 text-green-800 hover:bg-green-200" : 
                              activity.activityStatus === "implementation" || activity.activityStatus === "2" ? "bg-blue-100 text-blue-800 hover:bg-blue-200" :
                              activity.activityStatus === "cancelled" || activity.activityStatus === "5" ? "bg-red-100 text-red-800 hover:bg-red-200" : 
                              "bg-slate-100 text-slate-800 hover:bg-slate-200"
                            }
                          >
                            {activity.activityStatus === "2" ? "Implementation" :
                             activity.activityStatus === "1" ? "Pipeline/Identification" :
                             activity.activityStatus === "3" ? "Completion" :
                             activity.activityStatus === "4" ? "Post-Completion" :
                             activity.activityStatus === "5" ? "Cancelled" :
                             activity.activityStatus === "6" ? "Suspended" :
                             "Pipeline/Identification"}
                          </Badge>
                          
                          {/* Publication Status Badge */}
                          {activity.publicationStatus && (
                            <Badge 
                              className={
                                activity.publicationStatus === 'published' 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                              }
                            >
                              {activity.publicationStatus === 'published' ? 'Published' : 'Unpublished'}
                            </Badge>
                          )}
                          
                          {/* IATI Sync Status */}
                          {activity.iatiIdentifier && (
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant={activity.autoSync && (activity.syncStatus === 'live' || activity.syncStatus === 'outdated') ? "outline" : undefined}
                                      className={activity.autoSync && (activity.syncStatus === 'live' || activity.syncStatus === 'outdated')
                                        ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                                        : "bg-[#124e5f] text-white hover:bg-[#0d3a47]"}
                                    >
                                      {activity.autoSync && activity.syncStatus === 'live' ? (
                                        <>
                                          <RefreshCw className="h-3 w-3 mr-1 text-green-600" />
                                          IATI Synced
                                        </>
                                      ) : activity.autoSync && activity.syncStatus === 'outdated' ? (
                                        <>
                                          <AlertCircle className="h-3 w-3 mr-1 text-yellow-600" />
                                          IATI Outdated
                                        </>
                                      ) : (
                                        <>
                                          <Globe className="h-3 w-3 mr-1 text-white" />
                                          Imported from IATI
                                        </>
                                      )}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-1">
                                      <p className="font-medium">IATI Sync Status</p>
                                      {activity.lastSyncTime && (
                                        <p>Last synced: {format(new Date(activity.lastSyncTime), 'dd MMM yyyy HH:mm')}</p>
                                      )}
                                      {activity.autoSync && (
                                        <p className="text-green-600">Auto-sync enabled</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {/* Humanitarian Badge */}
                              {activity.humanitarian && (
                                <Badge className="bg-red-600 text-white hover:bg-red-700">
                                  Humanitarian
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Third Row: Timeline Dates - Responsive Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 pb-3 border-b border-slate-200">
                          {/* Column 1: Start Dates */}
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                              <Calendar className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="text-slate-500 flex-shrink-0">Planned Start:</span>
                              <span className="font-medium text-slate-900 truncate">
                                {activity.plannedStartDate ? formatDate(activity.plannedStartDate) : '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                              <Calendar className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="text-slate-500 flex-shrink-0">Actual Start:</span>
                              <span className="font-medium text-slate-900 truncate">
                                {activity.actualStartDate ? formatDate(activity.actualStartDate) : '—'}
                              </span>
                            </div>
                          </div>

                          {/* Column 2: End Dates */}
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                              <Calendar className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="text-slate-500 flex-shrink-0">Planned End:</span>
                              <span className="font-medium text-slate-900 truncate">
                                {activity.plannedEndDate ? formatDate(activity.plannedEndDate) : '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                              <Calendar className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="text-slate-500 flex-shrink-0">Actual End:</span>
                              <span className="font-medium text-slate-900 truncate">
                                {activity.actualEndDate ? formatDate(activity.actualEndDate) : '—'}
                              </span>
                            </div>
                          </div>

                          {/* Column 3: Created/Updated + History Button */}
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                              <span className="text-slate-500 flex-shrink-0">Created:</span>
                              <span className="font-medium text-slate-900 truncate">{formatDate(activity.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                              <span className="text-slate-500 flex-shrink-0">Updated:</span>
                              <span className="font-medium text-slate-900 whitespace-nowrap">{formatDate(activity.updatedAt)}</span>
                              <AllDatesHistory
                                activityId={activity.id}
                                dates={{
                                  plannedStartDate: activity.plannedStartDate,
                                  plannedEndDate: activity.plannedEndDate,
                                  actualStartDate: activity.actualStartDate,
                                  actualEndDate: activity.actualEndDate
                                }}
                                customDates={activity.customDates}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Custom/Additional Dates */}
                        {activity.customDates && activity.customDates.length > 0 && (
                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            {activity.customDates.map((customDate, index) => (
                              <div key={index} className="flex items-center gap-1.5 text-xs text-slate-600">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                <span className="text-slate-500">{customDate.label}:</span>
                                <span className="font-medium text-slate-900">{formatDate(customDate.date)}</span>
                                {customDate.description && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <HelpCircle className="h-3 w-3 text-slate-400" />
                                      </TooltipTrigger>
                                      <TooltipContent>{customDate.description}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    
                    {/* Combined Description Sections with 1000 character limit */}
                    {(() => {
                      // Get all field values
                      const description = activity.description || '';
                      const objectives = activity.descriptionObjectives || '';
                      const targetGroups = activity.descriptionTargetGroups || '';
                      const other = activity.descriptionOther || '';
                      
                      // Check if any description content exists
                      const hasAnyContent = description || objectives || targetGroups || other;
                      
                      // Calculate if we need show more based on content length (rough estimate)
                      const combinedLength = description.length + objectives.length + targetGroups.length + other.length;
                      const needsShowMore = combinedLength > 500;
                      
                      return (
                        <>
                          {/* Collapsible description container */}
                          <div 
                            ref={descriptionRef}
                            className={`mt-3 relative ${!isDescriptionExpanded && needsShowMore ? 'max-h-[280px] overflow-hidden' : ''}`}
                          >
                            {/* General Description */}
                            {description && (
                              <div>
                                <SafeHtml 
                                  html={description} 
                                  level="rich"
                                  className="text-slate-600 leading-relaxed"
                                />
                              </div>
                            )}

                            {/* Objectives Section */}
                            {objectives && (
                              <div className="mt-4 border-t border-slate-200 pt-3">
                                <h4 className="text-sm font-medium text-slate-700 mb-2">
                                  Objectives
                                </h4>
                                <SafeHtml 
                                  html={objectives} 
                                  level="rich"
                                  className="text-slate-600 leading-relaxed"
                                />
                              </div>
                            )}

                            {/* Target Groups Section */}
                            {targetGroups && (
                              <div className="mt-4 border-t border-slate-200 pt-3">
                                <h4 className="text-sm font-medium text-slate-700 mb-2">
                                  Target Groups
                                </h4>
                                <SafeHtml 
                                  html={targetGroups} 
                                  level="rich"
                                  className="text-slate-600 leading-relaxed"
                                />
                              </div>
                            )}

                            {/* Other Section */}
                            {other && (
                              <div className="mt-4 border-t border-slate-200 pt-3">
                                <h4 className="text-sm font-medium text-slate-700 mb-2">
                                  Other
                                </h4>
                                <SafeHtml 
                                  html={other} 
                                  level="rich"
                                  className="text-slate-600 leading-relaxed"
                                />
                              </div>
                            )}
                            
                            {/* Fade gradient when collapsed */}
                            {!isDescriptionExpanded && needsShowMore && (
                              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                            )}
                          </div>

                          {/* Single Show More/Less button */}
                          {needsShowMore && (
                            <button
                              onClick={(event) => {
                                if (!isDescriptionExpanded) {
                                  setIsDescriptionExpanded(true)
                                } else {
                                  setIsDescriptionExpanded(false)
                                  const pageTop = document.getElementById('page-top')
                                  if (pageTop) {
                                    pageTop.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                  } else {
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                  }
                                }
                              }}
                              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 mt-2 text-sm font-medium transition-colors"
                            >
                              {isDescriptionExpanded ? (
                                <>
                                  Show less
                                  <ChevronUp className="h-4 w-4" />
                                </>
                              ) : (
                                <>
                                  Show more
                                  <ChevronDown className="h-4 w-4" />
                                </>
                              )}
                            </button>
                          )}
                        </>
                      );
                    })()}
                        </div>
                      </div>
                </div>

                {/* Organizations Sidebar - Column 4 */}
                <div className="lg:col-span-1">
                  <div className="bg-white">
                    <div className="space-y-3">
                      {/* Reporting Organisation */}
                      {reportingOrg && (
                        <div className="pb-3 border-b border-slate-200">
                          <div className="text-slate-500 mb-2 text-xs font-medium">Reporting Organisation</div>
                          <div className="flex items-start gap-3">
                            {/* Logo/Icon */}
                            {reportingOrg.logo && (
                              <div className="flex-shrink-0">
                                <img
                                  src={reportingOrg.logo}
                                  alt={`${reportingOrg.name} logo`}
                                  className="w-10 h-10 rounded object-cover bg-white"
                                />
                              </div>
                            )}
                            
                            {/* Organization Name, IATI ID */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-900">
                                {reportingOrg.id ? (
                                  <Link 
                                    href={`/organizations/${reportingOrg.id}`}
                                    className="font-medium hover:text-slate-700 transition-colors"
                                  >
                                    {reportingOrg.name || 'Unknown'}
                                    {reportingOrg.acronym && reportingOrg.acronym !== reportingOrg.name && (
                                      <span> ({reportingOrg.acronym})</span>
                                    )}
                                  </Link>
                                ) : (
                                  <span className="font-medium">
                                    {reportingOrg.name || 'Unknown'}
                                    {reportingOrg.acronym && reportingOrg.acronym !== reportingOrg.name && (
                                      <span> ({reportingOrg.acronym})</span>
                                    )}
                                  </span>
                                )}
                                {/* IATI ID with gray background - inline */}
                                {reportingOrg.iati_org_id && (
                                  <span className="text-xs text-slate-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded ml-2 inline-block align-middle">
                                    {reportingOrg.iati_org_id}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* All Participating Organizations */}
                      {participatingOrgs.length > 0 && (
                        <>
                          <div className="text-slate-500 mb-2 text-xs font-medium">Participating Organisations</div>
                          <div className="space-y-3">
                            {(showAllSidebarPartners ? participatingOrgs : participatingOrgs.slice(0, 4)).map((org, idx) => (
                              <div key={idx} className="pb-3 last:pb-0">
                                <div className="flex items-start gap-3">
                                  {/* Logo/Icon */}
                                  {org.organization?.logo && (
                                    <div className="flex-shrink-0">
                                      <img
                                        src={org.organization.logo}
                                        alt={`${org.organization.name} logo`}
                                        className="w-10 h-10 rounded object-cover bg-white"
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Organization Name, IATI ID, and Role Badge - Same Line */}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-slate-900">
                                      {org.organization?.id ? (
                                        <Link 
                                          href={`/organizations/${org.organization.id}`}
                                          className="font-medium hover:text-slate-700 transition-colors"
                                        >
                                          {org.organization.name || org.narrative || 'Unknown'}
                                          {org.organization.acronym && org.organization.acronym !== org.organization.name && (
                                            <span> ({org.organization.acronym})</span>
                                          )}
                                        </Link>
                                      ) : (
                                        <span className="font-medium">
                                          {org.organization?.name || org.narrative || 'Unknown'}
                                          {org.organization?.acronym && org.organization.acronym !== org.organization.name && (
                                            <span> ({org.organization.acronym})</span>
                                          )}
                                        </span>
                                      )}
                                      {/* IATI ID with gray background - inline */}
                                      {org.organization?.iati_org_id && (
                                        <span className="text-xs text-slate-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded ml-2 inline-block align-middle">
                                          {org.organization.iati_org_id}
                                        </span>
                                      )}
                                      {/* Role Badge with colors from new palette - inline */}
                                      <Badge 
                                        className={`text-xs px-2 py-0.5 rounded ml-2 inline-block align-middle ${
                                          org.role_type === 'funding' ? 'bg-[#dc2625]/10 text-[#dc2625]' :
                                          org.role_type === 'extending' ? 'bg-[#7b95a7]/10 text-[#7b95a7]' :
                                          org.role_type === 'government' ? 'bg-[#4c5568]/10 text-[#4c5568]' :
                                          org.role_type === 'implementing' ? 'bg-[#7b95a7]/10 text-[#7b95a7]' :
                                          'bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {org.role_type === 'government' ? 'Accountable' :
                                         org.role_type === 'extending' ? 'Extending' :
                                         org.role_type === 'funding' ? 'Funding' :
                                         org.role_type === 'implementing' ? 'Implementing' :
                                         org.role_type}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {participatingOrgs.length > 4 && (
                            <button
                              onClick={() => {
                                setShowAllSidebarPartners(!showAllSidebarPartners);
                                if (showAllSidebarPartners) {
                                  // Scroll to top when clicking "Show less"
                                  const pageTop = document.getElementById('page-top');
                                  if (pageTop) {
                                    pageTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  } else {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }
                                }
                              }}
                              className="w-full mt-2 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-start gap-2"
                            >
                              {showAllSidebarPartners ? (
                                <>
                                  Show less
                                  <ChevronUp className="h-4 w-4" />
                                </>
                              ) : (
                                <>
                                  +{participatingOrgs.length - 4} more
                                  <ChevronDown className="h-4 w-4" />
                                </>
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {/* SDG Icons Below Partners */}
                    {sdgMappings && sdgMappings.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="text-xs font-medium text-slate-600 mb-2">SDG Alignment</div>
                        <SDGImageGrid 
                          sdgCodes={sdgMappings.map((m: any) => m.sdgGoal || m.sdg_goal)} 
                          size="sm" 
                          showTooltips={true}
                          className=""
                        />
                      </div>
                    )}
                    
                    {/* Policy Markers Below SDG */}
                    {activity.policyMarkers && activity.policyMarkers.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="text-xs font-medium text-slate-600 mb-2">Policy Markers</div>
                        <div className="flex flex-wrap gap-2">
                          {activity.policyMarkers.map((marker: any, index: number) => {
                            // Get specific icon for each policy marker based on IATI code or code name
                            const getIconForMarker = (iatiCode: string | null | undefined, code: string | null | undefined) => {
                              // First check IATI code
                              if (iatiCode) {
                                switch (iatiCode) {
                                  case '1': return Sparkles; // Gender Equality
                                  case '2': return Leaf; // Aid to Environment
                                  case '3': return Shield; // Good Governance
                                  case '4': return Handshake; // Trade Development
                                  case '5': return TreePine; // Biodiversity
                                  case '6': return Wind; // Climate Mitigation
                                  case '7': return Waves; // Climate Adaptation
                                  case '8': return MountainSnow; // Desertification
                                  case '9': return Baby; // RMNCH
                                  case '10': return AlertCircle; // Disaster Risk Reduction
                                  case '11': return Heart; // Disability
                                  case '12': return Droplets; // Nutrition
                                }
                              }

                              // Fallback to code-based matching for custom markers
                              if (code) {
                                const lowerCode = code.toLowerCase();
                                if (lowerCode.includes('gender')) return Sparkles;
                                if (lowerCode.includes('environment') || lowerCode.includes('environ')) return Leaf;
                                if (lowerCode.includes('governance') || lowerCode.includes('pdgg')) return Shield;
                                if (lowerCode.includes('trade')) return Handshake;
                                if (lowerCode.includes('biodiversity')) return TreePine;
                                if (lowerCode.includes('mitigation')) return Wind;
                                if (lowerCode.includes('adaptation') || lowerCode.includes('climate')) return Waves;
                                if (lowerCode.includes('desertification')) return MountainSnow;
                                if (lowerCode.includes('rmnch') || lowerCode.includes('maternal') || lowerCode.includes('child')) return Baby;
                                if (lowerCode.includes('disaster') || lowerCode.includes('drr')) return AlertCircle;
                                if (lowerCode.includes('disability')) return Heart;
                                if (lowerCode.includes('nutrition')) return Droplets;
                                if (lowerCode.includes('human_rights') || lowerCode.includes('rights')) return Scale;
                                if (lowerCode.includes('peace') || lowerCode.includes('conflict')) return Shield;
                                if (lowerCode.includes('rural')) return Building2;
                                if (lowerCode.includes('participatory')) return Users;
                              }

                              return Leaf; // Default icon (more neutral than Wrench)
                            };

                            const IconComponent = getIconForMarker(
                              marker.policy_marker_details?.iati_code,
                              marker.policy_marker_details?.code
                            );
                            
                            const markerUuid = marker.policy_marker_id || marker.policy_marker_details?.uuid || '';
                            
                            return (
                              <TooltipProvider key={marker.policy_marker_id || index}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link
                                      href={`/policy-markers/${markerUuid}`}
                                      className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <IconComponent className="w-4 h-4 text-slate-600" />
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs font-medium">{marker.policy_marker_details?.name || 'Policy Marker'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {marker.significance === 0 ? 'Not targeted' : 
                                       marker.significance === 1 ? 'Significant' : 
                                       marker.significance === 2 ? 'Principal' : 
                                       marker.significance === 3 ? 'Most funding' : 
                                       marker.significance === 4 ? 'Primary objective' : 
                                       'Unknown'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">Click to view profile</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 w-full">
                  <div>
                      <LabelWithHelp 
                        label="Total Budgeted" 
                        helpText="The total amount of funds allocated for this activity across all budget periods. This represents the planned spending for the entire activity lifecycle."
                      />
                                               <p className="text-lg font-bold text-slate-900">
                          ${formatCompactNumber(budgets?.length > 0 ? budgets.reduce((sum: number, b: any) => {
                            // Use usd_value if available (primary source)
                            if (b.usd_value != null && b.usd_value > 0) {
                              return sum + parseFloat(b.usd_value);
                            }
                            // If currency is USD, use the value directly
                            if (b.currency === 'USD' && b.value && b.value > 0) {
                              return sum + parseFloat(b.value);
                            }
                            // For non-USD budgets without usd_value, they should have been converted
                            // when saved, but if missing, return sum as-is (0 contribution)
                            return sum;
                          }, 0) : 0)}
                         </p>
                  </div>
                    <div className="border-t border-slate-200 pt-2">
                    <LabelWithHelp 
                      label="Total Committed" 
                      helpText="The total amount of funds promised or obligated for this activity from commitments (IATI transaction type 2). This represents what has been pledged but may not yet be disbursed."
                    />
                    <p className="text-lg font-bold text-slate-900">
                      ${formatCompactNumber(financials.totalCommitment)}
                    </p>
                  </div>
                  </div>
                  <DollarSign className="h-6 w-6 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 w-full">
                    <div>
                      <LabelWithHelp
                        label="Total Spent"
                        helpText="The total amount of funds disbursed and expended (IATI transaction types 3 + 4). This represents the combined total of money paid out to implementers and money spent on project activities."
                      />
                      <p className="text-lg font-bold text-slate-900">
                      ${formatCompactNumber(financials.totalDisbursement + financials.totalExpenditure)}
                    </p>
                  </div>
                    <div className="border-t border-slate-200 pt-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Disbursed</p>
                          <p className="font-semibold text-slate-700">${formatCompactNumber(financials.totalDisbursement)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Expended</p>
                          <p className="font-semibold text-slate-700">${formatCompactNumber(financials.totalExpenditure)}</p>
                        </div>
                      </div>
                  </div>
                  </div>
                  <Wallet className="h-6 w-6 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 w-full">
                  <div>
                      <LabelWithHelp
                        label="Percentage of Committed Funds Spent"
                        helpText="This metric shows how much of the formal, committed funding for the activity has been utilized. The calculation compares actual spending against the committed funds: (Disbursed Funds + Expended Funds) / Committed Funds × 100"
                      />
                      <p className="text-lg font-bold text-slate-900">{financialDeliveryPercent}%</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(financialDeliveryPercent, 100)}%`, backgroundColor: '#4c5568' }}
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-2">
                    <LabelWithHelp
                      label="Percentage of Budgeted Funds Spent"
                      helpText="This figure shows what portion of the total planned budget has been converted into actual spending. The calculation compares actual spending against the planned budget: (Disbursed Funds + Expended Funds) / Budgeted Funds × 100"
                    />
                    <p className="text-lg font-bold text-slate-900">
                      {implementationVsPlanPercent}%
                    </p>
                  </div>
                  
                    {/* Progress Bar */}
                    <div className="w-full">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(implementationVsPlanPercent, 100)}%`, backgroundColor: '#4c5568' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Budget by Year Chart */}
            <Card className="border-slate-200 bg-white flex flex-col">
              <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-xs font-semibold text-slate-900">Budget by Year</CardTitle>
                  <HelpTextTooltip 
                    content="Allocates budget amounts proportionally across calendar years based on the number of days. For example, a budget spanning July 2024 to June 2025 will be split between 2024 and 2025."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBudgetYearView(budgetYearView === 'chart' ? 'table' : 'chart')}
                    className="h-6 w-6 p-0"
                  >
                    {budgetYearView === 'chart' ? <TableIcon className="h-3 w-3" /> : <BarChart3Icon className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const budgetsByYearMap = new Map<number, number>()
                      ;(budgets || []).forEach(budget => {
                        if (budget.period_start) {
                          const year = new Date(budget.period_start).getFullYear()
                          const usdValue = budget.usd_value || (budget.currency === 'USD' ? budget.value : 0)
                          budgetsByYearMap.set(year, (budgetsByYearMap.get(year) || 0) + (usdValue || 0))
                        }
                      })
                      const budgetData = Array.from(budgetsByYearMap.entries())
                        .map(([year, amount]) => ({ year, amount }))
                        .sort((a, b) => a.year - b.year)
                      
                      const csvContent = [
                        ['Year', 'Budget'],
                        ...budgetData.map(item => [item.year, item.amount])
                      ].map(row => row.join(',')).join('\n')
                      
                      const blob = new Blob([csvContent], { type: 'text/csv' })
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `budget-by-year-${activity.id}.csv`
                      a.click()
                      window.URL.revokeObjectURL(url)
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 flex flex-col flex-1">
                {(() => {
                  // Calculate budgets by year
                  const budgetsByYear = new Map<number, number>()
                  ;(budgets || []).forEach(budget => {
                    if (budget.period_start && budget.period_end) {
                      // Always use proportional allocation
                      const allocations = splitBudgetAcrossYears(budget)
                      allocations.forEach(({ year, amount }) => {
                        budgetsByYear.set(year, (budgetsByYear.get(year) || 0) + amount)
                      })
                    } else if (budget.period_start) {
                      // Fallback to period-start allocation if no end date
                      const year = new Date(budget.period_start).getFullYear()
                      const usdValue = budget.usd_value || (budget.currency === 'USD' ? budget.value : 0)
                      budgetsByYear.set(year, (budgetsByYear.get(year) || 0) + (usdValue || 0))
                    }
                  })
                  const budgetData = Array.from(budgetsByYear.entries())
                    .map(([year, amount]) => ({ year, amount }))
                    .sort((a, b) => a.year - b.year)

                  if (budgetData.length === 0) {
                    return (
                      <div className="flex-1 min-h-24 flex items-center justify-center text-slate-400 text-xs">
                        <p>No budget data</p>
                </div>
                    )
                  }

                  if (budgetYearView === 'table') {
                    return (
                      <div className="flex-1 min-h-24 overflow-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-1 text-slate-600 font-medium">Year</th>
                              <th className="text-right py-1 text-slate-600 font-medium">Budget</th>
                            </tr>
                          </thead>
                          <tbody>
                            {budgetData.map((item) => (
                              <tr key={item.year} className="border-b border-slate-100">
                                <td className="py-1 text-slate-900">{item.year}</td>
                                <td className="text-right py-1 text-slate-900 font-medium">
                                  {formatCurrencyShort(item.amount)}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t-2 border-slate-300 bg-slate-50">
                              <td className="py-1 text-slate-900 font-semibold">Total</td>
                              <td className="text-right py-1 text-slate-900 font-semibold">
                                {formatCurrencyShort(budgetData.reduce((sum, item) => sum + item.amount, 0))}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )
                  }

                  return (
                    <div className="flex-1 min-h-24 -mx-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={budgetData} margin={{ top: 0, right: 5, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4c5568" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#4c5568" stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="year"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                            tickFormatter={(value) => {
                              const formatted = Math.round(value / 1000000);
                              return `$${formatted}M`;
                            }}
                          />
                          <RechartsTooltip2
                            cursor={false}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white border border-gray-200 rounded shadow-lg overflow-hidden">
                                    <table className="text-xs w-full border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                          <th className="text-left px-3 py-2 text-slate-600 font-semibold">{payload[0].payload.year}</th>
                                          <th className="text-right px-3 py-2 text-slate-600 font-semibold">Budget</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-b border-slate-100">
                                          <td className="px-3 py-2 text-slate-600">Budget</td>
                                          <td className="text-right px-3 py-2 font-medium text-slate-900">{formatCurrencyShort(payload[0].value as number)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="#4c5568"
                            strokeWidth={2}
                            fill="url(#budgetGradient)"
                            isAnimationActive={true}
                            animationDuration={600}
                            animationEasing="ease-in-out"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Planned vs Actual */}
            <Card className="border-slate-200 bg-white flex flex-col">
              <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-xs font-semibold text-slate-900">Planned vs Actual</CardTitle>
                  <HelpTextTooltip 
                    content="Allocates budget and planned disbursement amounts proportionally across calendar years based on the number of days. For example, a budget spanning July 2024 to June 2025 will be split between 2024 and 2025."
                    side="top"
                    sideOffset={8}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDisbursementProgressView(disbursementProgressView === 'chart' ? 'table' : 'chart')}
                    className="h-6 w-6 p-0"
                  >
                    {disbursementProgressView === 'chart' ? <TableIcon className="h-3 w-3" /> : <BarChart3Icon className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const plannedDisbursementsByYearMap = new Map<number, number>()
                      const disbursementsByYearMap = new Map<number, number>()
                      const expendituresByYearMap = new Map<number, number>()

                      ;(plannedDisbursements || []).forEach((pd: any) => {
                        if (pd.period_start) {
                          const year = new Date(pd.period_start).getFullYear()
                          const usdValue = pd.usd_amount || (pd.currency === 'USD' ? pd.value : 0)
                          plannedDisbursementsByYearMap.set(year, (plannedDisbursementsByYearMap.get(year) || 0) + (usdValue || 0))
                        }
                      })

                      const transactions = activity?.transactions || []
                      transactions.forEach((t: any) => {
                        if (t.transaction_date) {
                          const year = new Date(t.transaction_date).getFullYear()
                          const usdValue = getTransactionUSDValueSync(t)

                          if (normalizeTransactionType(t.transaction_type) === '3') {
                            disbursementsByYearMap.set(year, (disbursementsByYearMap.get(year) || 0) + usdValue)
                          } else if (normalizeTransactionType(t.transaction_type) === '4') {
                            expendituresByYearMap.set(year, (expendituresByYearMap.get(year) || 0) + usdValue)
                          }
                        }
                      })

                      const allYears = new Set([
                        ...Array.from(plannedDisbursementsByYearMap.keys()),
                        ...Array.from(disbursementsByYearMap.keys()),
                        ...Array.from(expendituresByYearMap.keys())
                      ])

                      const csvData = Array.from(allYears).sort().map(year => [
                        year,
                        plannedDisbursementsByYearMap.get(year) || 0,
                        disbursementsByYearMap.get(year) || 0,
                        expendituresByYearMap.get(year) || 0
                      ])

                      const csvContent = [
                        ['Year', 'Planned Disbursements', 'Disbursements', 'Expenditures'],
                        ...csvData
                      ].map(row => row.join(',')).join('\n')

                      const blob = new Blob([csvContent], { type: 'text/csv' })
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `budget-vs-spend-${activity.id}.csv`
                      a.click()
                      window.URL.revokeObjectURL(url)
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 flex flex-col flex-1">
                {(() => {
                  // Calculate planned disbursements and actuals by year
                  const plannedDisbursementsByYearMap = new Map<number, number>()
                  const disbursementsByYearMap = new Map<number, number>()
                  const expendituresByYearMap = new Map<number, number>()

                  // Process planned disbursements
                  ;(plannedDisbursements || []).forEach((pd: any) => {
                    if (pd.period_start && pd.period_end) {
                      // Always use proportional allocation
                      const allocations = splitPlannedDisbursementAcrossYears(pd)
                      allocations.forEach(({ year, amount }) => {
                        plannedDisbursementsByYearMap.set(year, (plannedDisbursementsByYearMap.get(year) || 0) + amount)
                      })
                    } else if (pd.period_start) {
                      // Fallback to period-start allocation if no end date
                      const year = new Date(pd.period_start).getFullYear()
                      const usdValue = pd.usd_amount || (pd.currency === 'USD' ? pd.value : 0)
                      plannedDisbursementsByYearMap.set(year, (plannedDisbursementsByYearMap.get(year) || 0) + (usdValue || 0))
                    }
                  })

                  // Process transactions - use USD values for consistency with hero cards
                  const transactions = activity?.transactions || []
                  transactions.forEach((t: any) => {
                    if (t.transaction_date) {
                      const year = new Date(t.transaction_date).getFullYear()
                      const usdValue = getTransactionUSDValueSync(t)

                      if (normalizeTransactionType(t.transaction_type) === '3') { // Disbursement
                        disbursementsByYearMap.set(year, (disbursementsByYearMap.get(year) || 0) + usdValue)
                      } else if (normalizeTransactionType(t.transaction_type) === '4') { // Expenditure
                        expendituresByYearMap.set(year, (expendituresByYearMap.get(year) || 0) + usdValue)
                      }
                    }
                  })

                  // Combine all years
                  const allYears = new Set([
                    ...Array.from(plannedDisbursementsByYearMap.keys()),
                    ...Array.from(disbursementsByYearMap.keys()),
                    ...Array.from(expendituresByYearMap.keys())
                  ])

                  const chartData = Array.from(allYears).sort().map(year => ({
                    year,
                    plannedDisbursements: plannedDisbursementsByYearMap.get(year) || 0,
                    disbursements: disbursementsByYearMap.get(year) || 0,
                    expenditures: expendituresByYearMap.get(year) || 0
                  }))

                  if (chartData.length === 0) {
                    return (
                      <div className="flex-1 min-h-24 flex items-center justify-center text-slate-400 text-xs">
                        <p>No financial data</p>
                </div>
                    )
                  }

                  if (disbursementProgressView === 'table') {
                    return (
                      <div className="flex-1 min-h-24 overflow-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-1 text-slate-600 font-medium">Year</th>
                              <th className="text-right py-1 text-slate-600 font-medium">Planned</th>
                              <th className="text-right py-1 text-slate-600 font-medium">Disb.</th>
                              <th className="text-right py-1 text-slate-600 font-medium">Exp.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chartData.map((item) => (
                              <tr key={item.year} className="border-b border-slate-100">
                                <td className="py-1 text-slate-900">{item.year}</td>
                                <td className="text-right py-1 font-medium" style={{ color: '#cfd0d5' }}>{formatCurrencyShort(item.plannedDisbursements)}</td>
                                <td className="text-right py-1 font-medium" style={{ color: '#7b95a7' }}>{formatCurrencyShort(item.disbursements)}</td>
                                <td className="text-right py-1 font-medium" style={{ color: '#dc2625' }}>{formatCurrencyShort(item.expenditures)}</td>
                              </tr>
                            ))}
                            <tr className="border-t-2 border-slate-300 bg-slate-50">
                              <td className="py-1 text-slate-900 font-semibold">Total</td>
                              <td className="text-right py-1 font-semibold" style={{ color: '#cfd0d5' }}>
                                {formatCurrencyShort(chartData.reduce((sum, item) => sum + item.plannedDisbursements, 0))}
                              </td>
                              <td className="text-right py-1 font-semibold" style={{ color: '#7b95a7' }}>
                                {formatCurrencyShort(chartData.reduce((sum, item) => sum + item.disbursements, 0))}
                              </td>
                              <td className="text-right py-1 font-semibold" style={{ color: '#dc2625' }}>
                                {formatCurrencyShort(chartData.reduce((sum, item) => sum + item.expenditures, 0))}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )
                  }

                  return (
                    <div className="flex-1 min-h-24 -mx-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart 
                          data={chartData} 
                          margin={{ top: 0, right: 5, left: 0, bottom: 5 }} 
                          barCategoryGap="5%" 
                          barGap={0}
                          key="budget-vs-spend-proportional"
                        >
                          <XAxis 
                            dataKey="year" 
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                            tickFormatter={(value) => {
                              const formatted = Math.round(value / 1000000);
                              return `$${formatted}M`;
                            }}
                          />
                          <RechartsTooltip2
                            position={{ y: 0 }}
                            offset={10}
                            cursor={false}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white border border-gray-200 rounded shadow-lg overflow-hidden">
                                    <table className="text-xs w-full border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                          <th className="text-left px-3 py-2 text-slate-600 font-semibold">{payload[0].payload.year}</th>
                                          <th className="text-right px-3 py-2 text-slate-600 font-semibold">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-b border-slate-100">
                                          <td className="px-3 py-2 text-slate-600">Planned Disbursements</td>
                                          <td className="text-right px-3 py-2 font-medium text-slate-900">{formatCurrencyShort(payload[0].payload.plannedDisbursements)}</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                          <td className="px-3 py-2 text-slate-600">Disbursements</td>
                                          <td className="text-right px-3 py-2 font-medium text-slate-900">{formatCurrencyShort(payload[0].payload.disbursements)}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-3 py-2 text-slate-600">Expenditures</td>
                                          <td className="text-right px-3 py-2 font-medium text-slate-900">{formatCurrencyShort(payload[0].payload.expenditures)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar
                            dataKey="plannedDisbursements"
                            fill="#cfd0d5"
                            name="Planned"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={true}
                            animationDuration={600}
                            animationEasing="ease-in-out"
                            key="planned-proportional"
                          />
                          <Bar
                            dataKey="disbursements"
                            fill="#7b95a7"
                            name="Disbursements"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={true}
                            animationDuration={600}
                            animationEasing="ease-in-out"
                          />
                          <Bar
                            dataKey="expenditures"
                            fill="#dc2625"
                            name="Expenditures"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={true}
                            animationDuration={600}
                            animationEasing="ease-in-out"
                          />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Finance Type Breakdown */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-semibold text-slate-900">Finance Types</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <FinanceTypeDonut 
                  transactions={activity.transactions || []}
                  activityId={activity.id}
                  defaultCurrency="USD"
                />
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Card className="border-0">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap justify-center">
                <TabsTrigger value="finances" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Finances
                </TabsTrigger>
                <TabsTrigger value="financial-analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Financial Analytics
                </TabsTrigger>
                <TabsTrigger value="sectors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Sectors
                </TabsTrigger>
                <TabsTrigger value="partnerships" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Partnerships
                </TabsTrigger>
                <TabsTrigger value="geography" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Locations
                </TabsTrigger>
                <TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Results
                </TabsTrigger>
                <TabsTrigger value="sdg" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  SDG Alignment
                </TabsTrigger>
                <TabsTrigger value="policy-markers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Policy Markers
                </TabsTrigger>
                <TabsTrigger value="library" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Activity Library
                </TabsTrigger>
                <TabsTrigger value="related-activities" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Related Activities
                </TabsTrigger>
                <TabsTrigger value="contacts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Contacts
                </TabsTrigger>
                <TabsTrigger value="discussion" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Discussion
                </TabsTrigger>
              </TabsList>

              {/* Finances Tab - Consolidated */}
              <TabsContent value="finances" className="p-6 border-0">
                {activeTab === "finances" && (
                  <div className="space-y-6">
                  {/* Budgets */}
                  <div className={`border rounded-lg ${budgets !== undefined && budgets.length === 0 ? 'opacity-50' : ''}`}>
                    <div className="px-4 py-3 border-b border-slate-200">
                      <div className="flex items-start justify-between gap-4">
                        <button
                          onClick={() => {
                            const hasBudgets = budgets === undefined || budgets.length > 0;
                            if (hasBudgets) setIsBudgetsOpen(!isBudgetsOpen);
                          }}
                          className={`flex items-center gap-2 text-left transition-colors ${budgets !== undefined && budgets.length === 0 ? 'cursor-not-allowed' : 'hover:text-slate-900'}`}
                          aria-label={isBudgetsOpen ? 'Collapse Budgets' : 'Expand Budgets'}
                          disabled={budgets !== undefined && budgets.length === 0}
                        >
                          {isBudgetsOpen ? <ChevronUp className="h-4 w-4 text-slate-600 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-600 flex-shrink-0" />}
                          <div>
                            <p className="text-lg font-bold text-slate-900">Budgets</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {budgets !== undefined && budgets.length === 0 ? 'No budgets recorded' : 'Activity budget allocations by period'}
                            </p>
                          </div>
                        </button>
                        {isBudgetsOpen && budgets && budgets.length > 0 && (
                          <div id="budget-filters-container" />
                        )}
                      </div>
                    </div>
                    {isBudgetsOpen && (
                      <>
                        <div className={budgetsLoading ? "hidden" : ""}>
                          <ActivityBudgetsTab
                            activityId={activity.id}
                            startDate={activity.plannedStartDate || activity.actualStartDate || ""}
                            endDate={activity.plannedEndDate || activity.actualEndDate || ""}
                            defaultCurrency="USD"
                            hideSummaryCards={true}
                            readOnly={true}
                            onLoadingChange={setBudgetsLoading}
                            onBudgetsChange={setBudgets}
                            renderFilters={(filters) => {
                              const container = document.getElementById('budget-filters-container');
                              if (container) {
                                return ReactDOM.createPortal(filters, container);
                              }
                              return null;
                            }}
                          />
                        </div>
                        {budgetsLoading && <div className="p-4"><BudgetsSkeleton /></div>}
                      </>
                    )}
                  </div>

                  {/* Planned Disbursements */}
                  <div className={`border rounded-lg ${plannedDisbursements !== undefined && plannedDisbursements.length === 0 ? 'opacity-50' : ''}`}>
                    <div className="px-4 py-3 border-b border-slate-200">
                      <div className="flex items-start justify-between gap-4">
                        <button
                          onClick={() => {
                            const hasPlanned = plannedDisbursements === undefined || plannedDisbursements.length > 0;
                            if (hasPlanned) setIsPlannedOpen(!isPlannedOpen);
                          }}
                          className={`flex items-center gap-2 text-left transition-colors ${plannedDisbursements !== undefined && plannedDisbursements.length === 0 ? 'cursor-not-allowed' : 'hover:text-slate-900'}`}
                          aria-label={isPlannedOpen ? 'Collapse Planned Disbursements' : 'Expand Planned Disbursements'}
                          disabled={plannedDisbursements !== undefined && plannedDisbursements.length === 0}
                        >
                          {isPlannedOpen ? <ChevronUp className="h-4 w-4 text-slate-600 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-600 flex-shrink-0" />}
                          <div>
                            <p className="text-lg font-bold text-slate-900">Planned Disbursements</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {plannedDisbursements !== undefined && plannedDisbursements.length === 0 ? 'No planned disbursements recorded' : 'Scheduled future disbursements'}
                            </p>
                          </div>
                        </button>
                        {isPlannedOpen && plannedDisbursements && plannedDisbursements.length > 0 && (
                          <div id="planned-filters-container" />
                        )}
                      </div>
                    </div>
                    {isPlannedOpen && (
                      <>
                        <div className={plannedLoading ? "hidden" : ""}>
                          <PlannedDisbursementsTab
                            activityId={activity.id}
                            startDate={activity.plannedStartDate || activity.actualStartDate || ""}
                            endDate={activity.plannedEndDate || activity.actualEndDate || ""}
                            defaultCurrency="USD"
                            readOnly={true}
                            onDisbursementsChange={setPlannedDisbursements}
                            hideSummaryCards={true}
                            onLoadingChange={setPlannedLoading}
                            renderFilters={(filters) => {
                              const container = document.getElementById('planned-filters-container');
                              if (container) {
                                return ReactDOM.createPortal(filters, container);
                              }
                              return null;
                            }}
                          />
                        </div>
                        {plannedLoading && <div className="p-4"><PlannedDisbursementsSkeleton /></div>}
                      </>
                    )}
                  </div>

                  {/* Transactions */}
                  <div className={`border rounded-lg ${activity.transactions !== undefined && activity.transactions.length === 0 ? 'opacity-50' : ''}`}>
                    <div className="px-4 py-3 border-b border-slate-200">
                      <div className="flex items-start justify-between gap-4">
                        <button
                          onClick={() => {
                            const hasTransactions = activity.transactions === undefined || activity.transactions.length > 0;
                            if (hasTransactions) setIsTransactionsOpen(!isTransactionsOpen);
                          }}
                          className={`flex items-center gap-2 text-left transition-colors ${activity.transactions !== undefined && activity.transactions.length === 0 ? 'cursor-not-allowed' : 'hover:text-slate-900'}`}
                          aria-label={isTransactionsOpen ? 'Collapse Transactions' : 'Expand Transactions'}
                          disabled={activity.transactions !== undefined && activity.transactions.length === 0}
                        >
                          {isTransactionsOpen ? <ChevronUp className="h-4 w-4 text-slate-600 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-600 flex-shrink-0" />}
                          <div>
                            <p className="text-lg font-bold text-slate-900">Transactions</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {activity.transactions !== undefined && activity.transactions.length === 0 ? 'No transactions recorded' : 'Commitments, disbursements, and expenditures'}
                            </p>
                          </div>
                        </button>
                        {isTransactionsOpen && activity.transactions && activity.transactions.length > 0 && (
                          <div id="transaction-filters-container" className="flex items-center gap-2 flex-wrap" />
                        )}
                      </div>
                    </div>
                    {isTransactionsOpen && (
                      <>
                        <div className={transactionsLoading ? "hidden" : ""}>
                          <TransactionTab
                            activityId={activity.id}
                            readOnly={true}
                            defaultFinanceType={activity.defaultFinanceType}
                            defaultAidType={activity.defaultAidType}
                            defaultCurrency={activity.defaultCurrency}
                            defaultTiedStatus={activity.defaultTiedStatus}
                            defaultFlowType={activity.defaultFlowType}
                            hideSummaryCards={true}
                            onLoadingChange={setTransactionsLoading}
                            renderFilters={(filters) => {
                              const container = document.getElementById('transaction-filters-container');
                              if (container) {
                                return ReactDOM.createPortal(filters, container);
                              }
                              return null;
                            }}
                          />
                        </div>
                        {transactionsLoading && <div className="p-4"><TransactionsSkeleton /></div>}
                      </>
                    )}
                  </div>
                </div>
                )}
              </TabsContent>

              {/* Financial Analytics Tab */}
              <TabsContent value="financial-analytics" className="p-6 border-0">
                {activeTab === "financial-analytics" && (
                  <FinancialAnalyticsTab 
                    activityId={activity.id} 
                    transactions={activity.transactions || []}
                    budgets={budgets}
                    plannedDisbursements={plannedDisbursements}
                  />
                )}
              </TabsContent>

              {/* Sectors Tab */}
              <TabsContent value="sectors" className="p-6 border-0">
                {activeTab === "sectors" && (
                  <div className="space-y-6">
                  {/* Sector Allocation Visualization */}
                  {activity.sectors && activity.sectors.length > 0 ? (
                    <div className="space-y-6">
                      {/* Sector Flow Visualization - Full Width */}
                      <Card className="border-slate-200">
                        <CardHeader>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div>
                              <CardTitle className="text-lg font-semibold text-slate-900">
                                Sector Flow Visualization
                              </CardTitle>
                              <CardDescription>
                                Interactive view of sector allocations with multiple visualization options and financial metrics
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* View Type Buttons */}
                              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                                <Button
                                  variant={sectorViewMode === 'sankey' ? 'default' : 'ghost'}
                                  size="sm"
                                  onClick={() => setSectorViewMode('sankey')}
                                  className="h-8"
                                >
                                  <GitBranch className="h-4 w-4 mr-1.5" />
                                  Flow
                                </Button>
                                <Button
                                  variant={sectorViewMode === 'pie' ? 'default' : 'ghost'}
                                  size="sm"
                                  onClick={() => setSectorViewMode('pie')}
                                  className="h-8"
                                >
                                  <PieChartIcon className="h-4 w-4 mr-1.5" />
                                  Pie
                                </Button>
                                <Button
                                  variant={sectorViewMode === 'bar' ? 'default' : 'ghost'}
                                  size="sm"
                                  onClick={() => setSectorViewMode('bar')}
                                  className="h-8"
                                >
                                  <BarChart3Icon className="h-4 w-4 mr-1.5" />
                                  Bar
                                </Button>
                                <Button
                                  variant={sectorViewMode === 'table' ? 'default' : 'ghost'}
                                  size="sm"
                                  onClick={() => setSectorViewMode('table')}
                                  className="h-8"
                                >
                                  <TableIcon className="h-4 w-4 mr-1.5" />
                                  Table
                                </Button>
                              </div>

                              {/* Bar grouping buttons - only show when bar view is active */}
                              {sectorViewMode === 'bar' && (
                                <div className="flex gap-1 border rounded-lg p-1 bg-white">
                                  <Button
                                    variant={sectorBarGroupingMode === 'group' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setSectorBarGroupingMode('group')}
                                    className="h-7 text-xs px-3"
                                  >
                                    Sector Category
                                  </Button>
                                  <Button
                                    variant={sectorBarGroupingMode === 'category' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setSectorBarGroupingMode('category')}
                                    className="h-7 text-xs px-3"
                                  >
                                    Sector
                                  </Button>
                                  <Button
                                    variant={sectorBarGroupingMode === 'sector' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setSectorBarGroupingMode('sector')}
                                    className="h-7 text-xs px-3"
                                  >
                                    Sub Sector
                                  </Button>
                                </div>
                              )}

                              {/* Export Buttons */}
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Transaction type labels (IATI Standard v2.03)
                                    const TRANSACTION_TYPE_LABELS: Record<string, string> = {
                                      '1': 'Incoming Funds',
                                      '2': 'Outgoing Commitment',
                                      '3': 'Disbursement',
                                      '4': 'Expenditure',
                                      '5': 'Interest Payment',
                                      '6': 'Loan Repayment',
                                      '7': 'Reimbursement',
                                      '8': 'Purchase of Equity',
                                      '9': 'Sale of Equity',
                                      '10': 'Credit Guarantee',
                                      '11': 'Incoming Commitment',
                                      '12': 'Outgoing Pledge',
                                      '13': 'Incoming Pledge'
                                    };
                                    
                                    // Get all unique transaction types
                                    const allTransactionTypes = new Set<string>();
                                    sectorFinancialData.forEach((f: any) => {
                                      if (f.transactionTypes) {
                                        Object.keys(f.transactionTypes).forEach((type: string) => allTransactionTypes.add(type));
                                      }
                                    });
                                    const transactionTypeArray = Array.from(allTransactionTypes).sort();
                                    
                                    const csvData = activity.sectors.map((allocation: any) => {
                                      const financial = sectorFinancialData.find((f: any) => f.code === (allocation.sector_code || allocation.code));
                                      const row: Record<string, string | number> = {
                                        'Sector Code': allocation.sector_code || allocation.code,
                                        'Sector Name': allocation.sector_name || allocation.name,
                                        'Percentage': allocation.percentage,
                                        'Budget (USD)': financial?.budget || 0,
                                        'Planned Disbursement (USD)': financial?.plannedDisbursement || 0,
                                      };
                                      
                                      // Add dynamic transaction type columns
                                      transactionTypeArray.forEach((type: string) => {
                                        const label = TRANSACTION_TYPE_LABELS[type] || `Type ${type}`;
                                        row[`${label} (USD)`] = (financial?.transactionTypes && financial.transactionTypes[type]) || 0;
                                      });
                                      
                                      return row;
                                    });
                                    const csvContent = [
                                      Object.keys(csvData[0]).join(','),
                                      ...csvData.map(row => Object.values(row).join(','))
                                    ].join('\n');
                                    const blob = new Blob([csvContent], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'sector-allocations.csv';
                                    a.click();
                                  }}
                                  className="h-8 px-2"
                                  title="Export to CSV"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const element = document.querySelector('#sector-visualization-container');
                                    if (element) {
                                      import('@/lib/chart-export').then(({ exportChartToJPG }) => {
                                        exportChartToJPG(element as HTMLElement, 'sector-visualization');
                                      });
                                    }
                                  }}
                                  className="h-8 px-2"
                                  title="Export to JPG"
                                  disabled={sectorViewMode === 'table'}
                                >
                                  <FileImage className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div id="sector-visualization-container">
                            <SectorSankeyVisualization
                              allocations={activity.sectors.map((s: any) => ({
                                code: s.sector_code || s.code,
                                name: s.sector_name || s.name,
                                percentage: s.percentage || 0
                              }))}
                              financialData={sectorFinancialData}
                              onSegmentClick={(code) => {
                                console.log('Sector clicked:', code);
                              }}
                              showControls={false}
                              defaultView={sectorViewMode}
                              defaultMetric={sectorMetricMode}
                              barGroupingMode={sectorBarGroupingMode}
                            />
                          </div>
                        </CardContent>
                      </Card>

                    </div>
                  ) : (
                    <Card className="border-slate-200">
                      <CardContent className="text-center py-12">
                        <PieChartIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No sectors have been allocated for this activity.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
                )}
              </TabsContent>

              {/* Partnerships Tab */}
              <TabsContent value="partnerships" className="p-6 border-0">
                {activeTab === "partnerships" && (
                  (() => {
                  // Calculate financial metrics for each organization
                  const calculateOrgFinancials = (orgId: string | undefined, orgName: string | undefined) => {
                    let totalPlanned = 0;
                    let totalDisbursed = 0;
                    let totalExpended = 0;

                    // From planned disbursements - use USD values
                    ;(plannedDisbursements || []).forEach((pd: any) => {
                      if (pd.provider_org_id === orgId || pd.provider_org_name === orgName) {
                        // Use usd_amount or usdAmount (check both field name variations)
                        const usdValue = pd.usd_amount || pd.usdAmount || (pd.currency === 'USD' ? pd.amount : 0) || 0;
                        totalPlanned += usdValue;
                      }
                    });

                    // From transactions - use USD values for consistency
                    if (activity?.transactions) {
                      activity.transactions.forEach((t: any) => {
                        const usdValue = getTransactionUSDValueSync(t);
                        
                        // Provider (outgoing funds)
                        if (t.provider_org_id === orgId || t.provider_org_name === orgName) {
                          if (normalizeTransactionType(t.transaction_type) === '3') { // Disbursement
                            totalDisbursed += usdValue;
                          } else if (normalizeTransactionType(t.transaction_type) === '4') { // Expenditure
                            totalExpended += usdValue;
                          }
                        }
                        
                        // Receiver (incoming funds)
                        if (t.receiver_org_id === orgId || t.receiver_org_name === orgName) {
                          if (normalizeTransactionType(t.transaction_type) === '3') { // Disbursement
                            totalDisbursed += usdValue;
                          } else if (normalizeTransactionType(t.transaction_type) === '4') { // Expenditure
                            totalExpended += usdValue;
                          }
                        }
                      });
                    }

                    return {
                      totalPlanned,
                      totalDisbursed,
                      totalExpended,
                      disbursementProgress: totalPlanned > 0 ? (totalDisbursed / totalPlanned) * 100 : 0
                    };
                  };

                  // Get unique "other" organizations from transactions and planned disbursements
                  const getOtherPartners = () => {
                    const otherOrgs = new Map<string, { name: string; id?: string; logo?: string }>();
                    const participatingOrgIds = new Set(participatingOrgs.map(p => p.organization?.id).filter(Boolean));
                    const participatingOrgNames = new Set(participatingOrgs.map(p => p.organization?.name || p.narrative).filter(Boolean));

                    // From planned disbursements
                    ;(plannedDisbursements || []).forEach((pd: any) => {
                      // Check provider
                      if (pd.provider_org_name && !participatingOrgNames.has(pd.provider_org_name)) {
                        const key = pd.provider_org_id || pd.provider_org_name;
                        if (!otherOrgs.has(key)) {
                          otherOrgs.set(key, {
                            id: pd.provider_org_id,
                            name: pd.provider_org_name,
                            logo: pd.provider_org_logo
                          });
                        }
                      }
                      // Check receiver
                      if (pd.receiver_org_name && !participatingOrgNames.has(pd.receiver_org_name)) {
                        const key = pd.receiver_org_id || pd.receiver_org_name;
                        if (!otherOrgs.has(key)) {
                          otherOrgs.set(key, {
                            id: pd.receiver_org_id,
                            name: pd.receiver_org_name,
                            logo: pd.receiver_org_logo
                          });
                        }
                      }
                    });

                    // From transactions
                    if (activity?.transactions) {
                      activity.transactions.forEach((t: any) => {
                        // Check provider
                        if (t.provider_org_name && !participatingOrgNames.has(t.provider_org_name)) {
                          const key = t.provider_org_id || t.provider_org_name;
                          if (!otherOrgs.has(key)) {
                            otherOrgs.set(key, {
                              id: t.provider_org_id,
                              name: t.provider_org_name
                            });
                          }
                        }
                        // Check receiver
                        if (t.receiver_org_name && !participatingOrgNames.has(t.receiver_org_name)) {
                          const key = t.receiver_org_id || t.receiver_org_name;
                          if (!otherOrgs.has(key)) {
                            otherOrgs.set(key, {
                              id: t.receiver_org_id,
                              name: t.receiver_org_name
                            });
                          }
                        }
                      });
                    }

                    return Array.from(otherOrgs.values());
                  };

                  const otherPartners = getOtherPartners();

                  // Helper function for role badge colors
                  const getRoleBadgeColor = (roleCode: number | undefined) => {
                    if (!roleCode) return 'bg-gray-100 text-gray-800 border-gray-300';
                    const colors: Record<number, string> = {
                      1: 'bg-yellow-100 text-yellow-800 border-yellow-300',     // Funding
                      2: 'bg-purple-100 text-purple-800 border-purple-300',     // Accountable/Government
                      3: 'bg-blue-100 text-blue-800 border-blue-300',           // Extending
                      4: 'bg-green-100 text-green-800 border-green-300'         // Implementing
                    };
                    return colors[roleCode] || 'bg-gray-100 text-gray-800 border-gray-300';
                  };

                  // Sorting logic for participating organizations
                  const handlePartnershipsSort = (field: string) => {
                    if (partnershipsSortField === field) {
                      setPartnershipsSortDirection(partnershipsSortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setPartnershipsSortField(field);
                      setPartnershipsSortDirection('desc');
                    }
                  };

                  const getPartnershipsSortIcon = (field: string) => {
                    if (partnershipsSortField !== field) {
                      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
                    }
                    return partnershipsSortDirection === 'asc'
                      ? <ArrowUp className="h-4 w-4 text-gray-400" />
                      : <ArrowDown className="h-4 w-4 text-gray-400" />;
                  };

                  const sortedParticipatingOrgs = [...participatingOrgs].sort((a, b) => {
                    let aValue: string | number;
                    let bValue: string | number;

                    switch (partnershipsSortField) {
                      case 'organization':
                        aValue = (a.narrative || a.organization?.name || '').toLowerCase();
                        bValue = (b.narrative || b.organization?.name || '').toLowerCase();
                        break;
                      case 'role':
                        aValue = getOrganizationRoleName(a.iati_role_code || getRoleCodeFromType(a.role_type));
                        bValue = getOrganizationRoleName(b.iati_role_code || getRoleCodeFromType(b.role_type));
                        break;
                      case 'type':
                        aValue = getOrganizationTypeName(a.org_type || a.organization?.Organisation_Type_Code || '');
                        bValue = getOrganizationTypeName(b.org_type || b.organization?.Organisation_Type_Code || '');
                        break;
                      case 'country':
                        aValue = (a.organization?.country || '').toLowerCase();
                        bValue = (b.organization?.country || '').toLowerCase();
                        break;
                      default:
                        return 0;
                    }

                    if (aValue < bValue) return partnershipsSortDirection === 'asc' ? -1 : 1;
                    if (aValue > bValue) return partnershipsSortDirection === 'asc' ? 1 : -1;
                    return 0;
                  });

                  return (
                <div className="space-y-6">
                  {/* Reporting Organisation */}
                  {reportingOrg && (
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900 flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Reporting Organisation
                      </CardTitle>
                        <CardDescription>
                          The organization that reports this activity
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="rounded-md border overflow-x-auto">
                          <Table className="table-fixed">
                            <TableHeader className="bg-muted/50 border-b border-border/70">
                              <TableRow>
                                <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 whitespace-nowrap" style={{ width: '35%' }}>Organization</TableHead>
                                <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 whitespace-nowrap" style={{ width: '20%' }}>Role</TableHead>
                                <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 whitespace-nowrap" style={{ width: '30%' }}>Organisation Type</TableHead>
                                <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 whitespace-nowrap" style={{ width: '15%' }}>Country</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                                <TableCell className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                      {reportingOrg.logo ? (
                                        <img
                                          src={reportingOrg.logo}
                                          alt={reportingOrg.name || 'Organization logo'}
                                          className="w-10 h-10 rounded object-cover bg-white"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                                          <Building2 className="h-5 w-5 text-slate-400" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-slate-900">
                                        {reportingOrg.id ? (
                                          <Link
                                            href={`/organizations/${reportingOrg.id}`}
                                            className="hover:text-blue-600 transition-colors"
                                          >
                                            {reportingOrg.name || 'Unknown Organization'}
                                            {reportingOrg.acronym && reportingOrg.acronym !== reportingOrg.name && ` (${reportingOrg.acronym})`}
                                          </Link>
                                        ) : (
                                          <span>
                                            {reportingOrg.name || 'Unknown Organization'}
                                            {reportingOrg.acronym && reportingOrg.acronym !== reportingOrg.name && ` (${reportingOrg.acronym})`}
                                          </span>
                                        )}
                                      </div>
                                      {reportingOrg.iati_org_id && (
                                        <div className="text-xs text-slate-500 font-mono mt-1">
                                          {reportingOrg.iati_org_id}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 px-4 whitespace-nowrap">
                                  <span className="text-sm text-slate-600">
                                    Reporting
                                  </span>
                                </TableCell>
                                <TableCell className="py-3 px-4 whitespace-nowrap">
                                  <span className="text-sm text-slate-600">
                                    {reportingOrg.organisation_type
                                      ? getOrganizationTypeName(reportingOrg.organisation_type)
                                      : <span className="text-slate-400">Not set</span>
                                    }
                                  </span>
                                </TableCell>
                                <TableCell className="py-3 px-4 whitespace-nowrap">
                                  {reportingOrg.country ? (
                                    <span className="text-sm text-slate-600">{reportingOrg.country}</span>
                                  ) : (
                                    <span className="text-slate-400 text-sm">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                    </CardContent>
                  </Card>
                  )}
                  {/* Participating Organizations Table */}
                  {participatingOrgs.length > 0 && (
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                          Participating Organizations
                      </CardTitle>
                        <CardDescription>
                          All organizations participating in this activity with their roles, types, and IATI identifiers
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="rounded-md border overflow-x-auto">
                          <Table className="table-fixed">
                            <TableHeader className="bg-muted/50 border-b border-border/70">
                              <TableRow>
                                <TableHead
                                  className="text-sm font-medium text-foreground/90 py-3 px-4 whitespace-nowrap cursor-pointer hover:bg-muted/30 transition-colors"
                                  style={{ width: '35%' }}
                                  onClick={() => handlePartnershipsSort('organization')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Organization</span>
                                    {getPartnershipsSortIcon('organization')}
                                  </div>
                                </TableHead>
                                <TableHead
                                  className="text-sm font-medium text-foreground/90 py-3 px-4 whitespace-nowrap cursor-pointer hover:bg-muted/30 transition-colors"
                                  style={{ width: '20%' }}
                                  onClick={() => handlePartnershipsSort('role')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Role</span>
                                    {getPartnershipsSortIcon('role')}
                                  </div>
                                </TableHead>
                                <TableHead
                                  className="text-sm font-medium text-foreground/90 py-3 px-4 whitespace-nowrap cursor-pointer hover:bg-muted/30 transition-colors"
                                  style={{ width: '30%' }}
                                  onClick={() => handlePartnershipsSort('type')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Organisation Type</span>
                                    {getPartnershipsSortIcon('type')}
                                  </div>
                                </TableHead>
                                <TableHead
                                  className="text-sm font-medium text-foreground/90 py-3 px-4 whitespace-nowrap cursor-pointer hover:bg-muted/30 transition-colors"
                                  style={{ width: '15%' }}
                                  onClick={() => handlePartnershipsSort('country')}
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Country</span>
                                    {getPartnershipsSortIcon('country')}
                                  </div>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedParticipatingOrgs.map((org: any) => (
                                <TableRow key={org.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                                  <TableCell className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                        {org.organization?.logo ? (
                                    <img
                                      src={org.organization.logo}
                                            alt={org.organization.name || 'Organization logo'}
                                            className="w-10 h-10 rounded object-cover bg-white"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-slate-400" />
                                  </div>
                                )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium text-slate-900">
                                    {org.organization?.id ? (
                                            <Link
                                              href={`/organizations/${org.organization.id}`}
                                              className="hover:text-blue-600 transition-colors"
                                            >
                                              {org.narrative || org.organization?.name || 'Unknown Organization'}
                                              {org.organization?.acronym && org.organization.acronym !== org.organization.name && ` (${org.organization.acronym})`}
                                            </Link>
                                    ) : (
                                            <span>
                                              {org.narrative || org.organization?.name || 'Unknown Organization'}
                                              {org.organization?.acronym && org.organization.acronym !== org.organization.name && ` (${org.organization.acronym})`}
                                            </span>
                                          )}
                                        </div>
                                        {(org.iati_org_ref || org.organization?.iati_org_id) && (
                                          <span className="text-xs text-slate-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                            {org.iati_org_ref || org.organization?.iati_org_id}
                                          </span>
                                    )}
                                  </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 whitespace-nowrap">
                                    <span className="text-sm text-slate-600">
                                      {getOrganizationRoleName(org.iati_role_code || getRoleCodeFromType(org.role_type))}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 whitespace-nowrap">
                                    <span className="text-sm text-slate-600">
                                      {org.org_type || org.organization?.Organisation_Type_Code
                                        ? getOrganizationTypeName(org.org_type || org.organization?.Organisation_Type_Code || '')
                                        : <span className="text-slate-400">Not set</span>
                                      }
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-3 px-4 whitespace-nowrap">
                                    {org.organization?.country ? (
                                      <span className="text-sm text-slate-600">{org.organization.country}</span>
                                    ) : (
                                      <span className="text-slate-400 text-sm">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Organizational Network Graph */}
                  {(reportingOrg || participatingOrgs.length > 0) && (
                    <Card className="border-slate-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-slate-900 flex items-center gap-2">
                              <Building2 className="h-5 w-5" />
                              Organizational Network
                            </CardTitle>
                            <CardDescription>
                              Interactive network showing organizational relationships and roles
                            </CardDescription>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const svg = document.querySelector('#org-network-svg') as SVGSVGElement;
                                if (!svg) return;

                                // Clone the SVG to avoid modifying the original
                                const svgClone = svg.cloneNode(true) as SVGSVGElement;

                                // Convert all image elements to data URLs for proper rendering
                                const images = svgClone.querySelectorAll('image');
                                const imagePromises = Array.from(images).map(async (img) => {
                                  const href = img.getAttribute('href');
                                  if (href && href.startsWith('http')) {
                                    try {
                                      // Fetch and convert to data URL
                                      const response = await fetch(href);
                                      const blob = await response.blob();
                                      const dataUrl = await new Promise<string>((resolve) => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => resolve(reader.result as string);
                                        reader.readAsDataURL(blob);
                                      });
                                      img.setAttribute('href', dataUrl);
                                    } catch (e) {
                                      console.error('Failed to load image:', href);
                                    }
                                  }
                                });

                                await Promise.all(imagePromises);

                                // Create a canvas
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                if (!ctx) return;

                                // Set canvas size to match SVG viewBox
                                const viewBox = svgClone.getAttribute('viewBox')?.split(' ') || ['0', '0', '1000', '600'];
                                canvas.width = parseInt(viewBox[2]);
                                canvas.height = parseInt(viewBox[3]);

                                // Fill white background
                                ctx.fillStyle = 'white';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);

                                // Convert SVG to string
                                const svgString = new XMLSerializer().serializeToString(svgClone);
                                const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                                const url = URL.createObjectURL(svgBlob);

                                // Create image from SVG
                                const imgElement = new window.Image();
                                imgElement.onload = () => {
                                  ctx.drawImage(imgElement, 0, 0);
                                  URL.revokeObjectURL(url);

                                  // Convert to JPG and download
                                  canvas.toBlob((blob) => {
                                    if (!blob) return;
                                    const downloadUrl = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = downloadUrl;
                                    link.download = `organizational-network-${new Date().getTime()}.jpg`;
                                    link.click();
                                    URL.revokeObjectURL(downloadUrl);
                                  }, 'image/jpeg', 0.95);
                                };
                                imgElement.onerror = (e) => {
                                  console.error('Failed to load SVG as image:', e);
                                  URL.revokeObjectURL(url);
                                  toast.error('Failed to export image');
                                };
                                imgElement.src = url;
                              } catch (error) {
                                console.error('Export error:', error);
                                toast.error('Failed to export image');
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export JPG
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white rounded-lg">
                          {[
                            { roleCode: 0, color: 'bg-slate-700', label: 'Reporting' },
                            { roleCode: 1, color: 'bg-slate-500', label: 'Funding' },
                            { roleCode: 2, color: 'bg-blue-600', label: 'Accountable' },
                            { roleCode: 3, color: 'bg-slate-600', label: 'Extending' },
                            { roleCode: 4, color: 'bg-slate-400', label: 'Implementing' },
                          ].map(({ roleCode, color, label }) => {
                            const isHidden = hiddenRoles.has(roleCode);
                            return (
                              <div
                                key={roleCode}
                                className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md transition-all ${
                                  isHidden ? 'opacity-40 hover:opacity-60' : 'hover:bg-slate-50'
                                }`}
                                onClick={() => {
                                  const newHiddenRoles = new Set(hiddenRoles);
                                  if (isHidden) {
                                    newHiddenRoles.delete(roleCode);
                                  } else {
                                    newHiddenRoles.add(roleCode);
                                  }
                                  setHiddenRoles(newHiddenRoles);
                                }}
                              >
                                <div className={`w-4 h-4 rounded-full ${color} ${isHidden ? 'opacity-50' : ''}`}></div>
                                <span className={`text-sm font-medium text-slate-700 ${isHidden ? 'line-through' : ''}`}>
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Network Graph Canvas */}
                        <div className="relative w-full h-[600px] bg-white rounded-lg border border-slate-200 overflow-hidden">
                          {(() => {
                            // Build nodes
                            const nodes: any[] = [];
                            const roleColors: Record<number, string> = {
                              0: '#334155', // Reporting - slate-700
                              1: '#64748b', // Funding - slate-500
                              2: '#2563eb', // Accountable - blue-600
                              3: '#475569', // Extending - slate-600
                              4: '#94a3b8', // Implementing - slate-400
                            };

                            // Add reporting org as central node (if not hidden)
                            if (reportingOrg && !hiddenRoles.has(0)) {
                              nodes.push({
                                id: `reporting-${reportingOrg.id || 'main'}`,
                                name: reportingOrg.acronym || reportingOrg.name || 'Reporting Org',
                                fullName: reportingOrg.name || 'Unknown',
                                role: 'Reporting',
                                roleCode: 0,
                                color: roleColors[0],
                                size: 50,
                                logo: reportingOrg.logo,
                              });
                            }

                            // Add participating organizations (filter by hidden roles)
                            sortedParticipatingOrgs.forEach((org: any) => {
                              const roleCode = org.iati_role_code || getRoleCodeFromType(org.role_type) || 1;
                              if (!hiddenRoles.has(roleCode)) {
                                nodes.push({
                                  id: org.id,
                                  name: org.organization?.acronym || org.narrative || org.organization?.name || 'Unknown',
                                  fullName: org.narrative || org.organization?.name || 'Unknown',
                                  role: getOrganizationRoleName(roleCode),
                                  roleCode: roleCode,
                                  color: roleColors[roleCode] || '#64748b',
                                  size: 40,
                                  logo: org.organization?.logo,
                                });
                              }
                            });

                            // Calculate positions in horizontal flow layout
                            const width = 1000;
                            const height = 600;
                            const padding = 120;

                            // Group by role
                            const fundingOrgs = nodes.filter(n => n.roleCode === 1);
                            const reportingNode = nodes.find(n => n.roleCode === 0);
                            const extendingOrgs = nodes.filter(n => n.roleCode === 3);
                            const implementingOrgs = nodes.filter(n => n.roleCode === 4);
                            const accountableOrgs = nodes.filter(n => n.roleCode === 2);

                            // Position nodes in horizontal flow: Funding → Reporting → Extending → Implementing
                            // with Accountable positioned above for oversight
                            const columnWidth = (width - 2 * padding) / 4;

                            // Position Funding orgs (leftmost)
                            fundingOrgs.forEach((node, i) => {
                              node.x = padding;
                              node.y = height / 2 + (i - (fundingOrgs.length - 1) / 2) * 70;
                            });

                            // Position Reporting org (center-left)
                            if (reportingNode) {
                              reportingNode.x = padding + columnWidth;
                              reportingNode.y = height / 2;
                            }

                            // Position Extending orgs (center-right)
                            extendingOrgs.forEach((node, i) => {
                              node.x = padding + columnWidth * 2;
                              node.y = height / 2 + (i - (extendingOrgs.length - 1) / 2) * 70;
                            });

                            // Position Implementing orgs (rightmost) - use 2 columns if more than 8
                            implementingOrgs.forEach((node, i) => {
                              if (implementingOrgs.length > 8) {
                                // Two-column layout
                                const col = i % 2;
                                const row = Math.floor(i / 2);
                                const rowsPerColumn = Math.ceil(implementingOrgs.length / 2);
                                node.x = padding + columnWidth * 3 + (col * 80);
                                node.y = height / 2 + (row - (rowsPerColumn - 1) / 2) * 65;
                              } else {
                                // Single column layout
                                node.x = padding + columnWidth * 3;
                                node.y = height / 2 + (i - (implementingOrgs.length - 1) / 2) * 70;
                              }
                            });

                            // Position Accountable orgs (top, centered)
                            accountableOrgs.forEach((node, i) => {
                              node.x = width / 2 + (i - (accountableOrgs.length - 1) / 2) * 90;
                              node.y = padding - 20;
                            });

                            // Create edges following IATI flow structure:
                            // Funding → Reporting/Extending → Implementing
                            // Accountable provides oversight (dashed lines)
                            // Only create edges between visible nodes
                            const edges: any[] = [];
                            const nodeIds = new Set(nodes.map(n => n.id));

                            // Funding → Reporting
                            fundingOrgs.forEach(funding => {
                              if (reportingNode && nodeIds.has(funding.id) && nodeIds.has(reportingNode.id)) {
                                edges.push({
                                  source: funding.id,
                                  target: reportingNode.id,
                                  type: 'flow',
                                  label: 'Funds',
                                });
                              }
                            });

                            // Reporting → Extending
                            if (reportingNode && nodeIds.has(reportingNode.id)) {
                              extendingOrgs.forEach(extending => {
                                if (nodeIds.has(extending.id)) {
                                  edges.push({
                                    source: reportingNode.id,
                                    target: extending.id,
                                    type: 'flow',
                                    label: 'Channels',
                                  });
                                }
                              });
                            }

                            // Extending → Implementing
                            if (extendingOrgs.length > 0) {
                              extendingOrgs.forEach(extending => {
                                if (nodeIds.has(extending.id)) {
                                  implementingOrgs.forEach(implementing => {
                                    if (nodeIds.has(implementing.id)) {
                                      edges.push({
                                        source: extending.id,
                                        target: implementing.id,
                                        type: 'flow',
                                        label: 'Executes',
                                      });
                                    }
                                  });
                                }
                              });
                            } else if (reportingNode && nodeIds.has(reportingNode.id)) {
                              // If no Extending orgs, Reporting → Implementing directly
                              implementingOrgs.forEach(implementing => {
                                if (nodeIds.has(implementing.id)) {
                                  edges.push({
                                    source: reportingNode.id,
                                    target: implementing.id,
                                    type: 'flow',
                                    label: 'Executes',
                                  });
                                }
                              });
                            }

                            // Accountable → oversight connections (to Reporting and Implementing)
                            accountableOrgs.forEach(accountable => {
                              if (nodeIds.has(accountable.id)) {
                                if (reportingNode && nodeIds.has(reportingNode.id)) {
                                  edges.push({
                                    source: accountable.id,
                                    target: reportingNode.id,
                                    type: 'oversight',
                                    label: 'Oversees',
                                  });
                                }
                                implementingOrgs.forEach(implementing => {
                                  if (nodeIds.has(implementing.id)) {
                                    edges.push({
                                      source: accountable.id,
                                      target: implementing.id,
                                      type: 'oversight',
                                      label: 'Supervises',
                                    });
                                  }
                                });
                              }
                            });

                            return (
                              <svg id="org-network-svg" className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
                                {/* Define arrow markers and clip paths */}
                                <defs>
                                  <marker
                                    id="arrowhead-flow"
                                    markerWidth="10"
                                    markerHeight="10"
                                    refX="9"
                                    refY="3"
                                    orient="auto"
                                  >
                                    <polygon points="0 0, 10 3, 0 6" fill="#475569" />
                                  </marker>
                                  <marker
                                    id="arrowhead-oversight"
                                    markerWidth="10"
                                    markerHeight="10"
                                    refX="9"
                                    refY="3"
                                    orient="auto"
                                  >
                                    <polygon points="0 0, 10 3, 0 6" fill="#2563eb" />
                                  </marker>
                                  {/* Clip paths for circular logos */}
                                  {nodes.map((node) => (
                                    <clipPath key={`clip-${node.id}`} id={`clip-${node.id}`}>
                                      <circle cx={node.x} cy={node.y} r={node.size / 2} />
                                    </clipPath>
                                  ))}
                                </defs>

                                {/* Draw edges */}
                                <g>
                                  {edges.map((edge, i) => {
                                    const source = nodes.find(n => n.id === edge.source);
                                    const target = nodes.find(n => n.id === edge.target);
                                    if (!source || !target) return null;

                                    const isOversight = edge.type === 'oversight';

                                    return (
                                      <g key={i}>
                                        <line
                                          x1={source.x}
                                          y1={source.y}
                                          x2={target.x}
                                          y2={target.y}
                                          stroke={isOversight ? '#2563eb' : '#475569'}
                                          strokeWidth={isOversight ? '2' : '3'}
                                          strokeDasharray={isOversight ? '5,5' : '0'}
                                          opacity="0.5"
                                          markerEnd={isOversight ? 'url(#arrowhead-oversight)' : 'url(#arrowhead-flow)'}
                                        />
                                        {/* Edge label */}
                                        <text
                                          x={(source.x + target.x) / 2}
                                          y={(source.y + target.y) / 2 - 5}
                                          textAnchor="middle"
                                          className="text-[9px] fill-slate-600 font-medium"
                                        >
                                          {edge.label}
                                        </text>
                                      </g>
                                    );
                                  })}
                                </g>

                                {/* Draw nodes */}
                                <g>
                                  {nodes.map((node) => (
                                    <g key={node.id} className="cursor-pointer">
                                      {/* Node circle background - only show if no logo */}
                                      {!node.logo && (
                                        <circle
                                          cx={node.x}
                                          cy={node.y}
                                          r={node.size / 2}
                                          fill={node.color}
                                          stroke="white"
                                          strokeWidth="3"
                                          className="transition-all hover:stroke-slate-700"
                                        />
                                      )}

                                      {/* Org logo if available - fills entire circle */}
                                      {node.logo && (
                                        <>
                                          <image
                                            x={node.x - node.size / 2}
                                            y={node.y - node.size / 2}
                                            width={node.size}
                                            height={node.size}
                                            href={node.logo}
                                            clipPath={`url(#clip-${node.id})`}
                                            preserveAspectRatio="xMidYMid slice"
                                          />
                                          {/* White border over logo */}
                                          <circle
                                            cx={node.x}
                                            cy={node.y}
                                            r={node.size / 2}
                                            fill="none"
                                            stroke="white"
                                            strokeWidth="3"
                                            className="transition-all hover:stroke-slate-700"
                                          />
                                        </>
                                      )}

                                      {/* Node label - with wrapping */}
                                      <foreignObject
                                        x={node.x - 50}
                                        y={node.y + node.size / 2 + 5}
                                        width="100"
                                        height="50"
                                      >
                                        <div
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            width: '100%',
                                            textAlign: 'center',
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontSize: '11px',
                                              fontWeight: '600',
                                              color: '#0f172a',
                                              lineHeight: '1.2',
                                              wordWrap: 'break-word',
                                              overflow: 'hidden',
                                              maxHeight: '28px',
                                            }}
                                          >
                                            {node.name}
                                          </div>
                                          <div
                                            style={{
                                              fontSize: '9px',
                                              color: '#64748b',
                                              marginTop: '2px',
                                            }}
                                          >
                                            {node.role}
                                          </div>
                                        </div>
                                      </foreignObject>

                                      {/* Tooltip on hover */}
                                      <title>{node.fullName} ({node.role})</title>
                                    </g>
                                  ))}
                                </g>

                              </svg>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                );
              })()
                  )}
              </TabsContent>

              {/* Locations Tab */}
              <TabsContent value="geography" className="p-6 border-0 space-y-6">
                {activeTab === "geography" && (
                  <>
                {/* Loading indicator for lazy-loaded geography data */}
                {loadingTabs.has('geography') && (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading location data...</span>
                  </div>
                )}
                {/* Top Section: 4-column layout - Map (2 cols) + Location Cards (2 cols) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Map Section - Takes first 2 columns */}
                  <div className="md:col-span-2">
                    <Card className="border-slate-200 h-full">
                      <CardHeader>
                        <CardTitle className="text-slate-900 flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          Activity Locations Map
                        </CardTitle>
                        <CardDescription>
                          Map showing all activity locations. Use controls to switch styles and view modes.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-96 rounded-md overflow-hidden border border-slate-200">
                          <ActivityLocationsMapViewV2
                            locations={activityLocations.map(loc => ({
                              id: loc.id,
                              location_name: loc.location_name,
                              latitude: loc.latitude,
                              longitude: loc.longitude,
                              site_type: loc.site_type,
                              state_region_name: loc.state_region_name,
                              township_name: loc.township_name,
                              district_name: loc.district_name,
                              village_name: loc.village_name,
                              description: loc.description,
                              location_description: loc.location_description,
                            }))}
                            mapCenter={[19.0, 96.5]}
                            mapZoom={6}
                            activityTitle={activity?.title}
                            organizationId={activity?.reporting_org_id}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Location Cards Section - Takes last 2 columns */}
                  <div className="md:col-span-2">
                    <Card className="border-slate-200 h-full">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-slate-900 flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Activity Locations
                          </CardTitle>
                          {allActivityLocations.length > 0 && (
                            <div className="flex items-center gap-1 border rounded-md p-1">
                              <Button
                                variant={locationsView === 'cards' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setLocationsView('cards')}
                                className="h-7 px-2"
                              >
                                <LayoutGrid className="h-4 w-4" />
                              </Button>
                              <Button
                                variant={locationsView === 'table' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setLocationsView('table')}
                                className="h-7 px-2"
                              >
                                <TableIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {allActivityLocations.length > 0 ? (
                          locationsView === 'cards' ? (
                            <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-2">
                              {allActivityLocations.map((location) => {
                                // Convert location to LocationSchema format
                                const locationSchema: LocationSchema = {
                                  id: location.id,
                                  location_name: location.location_name || 'Unnamed Location',
                                  latitude: location.latitude,
                                  longitude: location.longitude,
                                  description: location.description || location.location_description,
                                  location_description: location.location_description,
                                  activity_location_description: location.activity_location_description,
                                  address: location.address,
                                  address_line1: location.address_line1,
                                  address_line2: location.address_line2,
                                  city: location.city,
                                  postal_code: location.postal_code,
                                  site_type: location.site_type,
                                  state_region_code: location.state_region_code,
                                  state_region_name: location.state_region_name,
                                  township_code: location.township_code,
                                  township_name: location.township_name,
                                  district_code: location.district_code,
                                  district_name: location.district_name,
                                  village_name: location.village_name,
                                  country_code: location.country_code || 'MM',
                                  location_type: location.location_type || 'site',
                                };

                                return (
                                  <LocationCard
                                    key={location.id}
                                    location={locationSchema}
                                    onEdit={() => {}}
                                    onDelete={() => {}}
                                    onDuplicate={() => {}}
                                    canEdit={false}
                                  />
                                );
                              })}
                            </div>
                          ) : (
                            <div className="max-h-[28rem] overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Coordinates</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Description</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {allActivityLocations.map((location) => {
                                    const formatAddress = () => {
                                      const parts = [];
                                      if (location.township_name) parts.push(location.township_name);
                                      if (location.city) parts.push(location.city);
                                      if (location.state_region_name) parts.push(location.state_region_name);
                                      if (location.country_code) parts.push(location.country_code);
                                      return parts.join(', ') || 'N/A';
                                    };
                                    
                                    return (
                                      <TableRow key={location.id}>
                                        <TableCell className="font-medium">
                                          {location.location_name || 'Unnamed Location'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                          {location.latitude && location.longitude 
                                            ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                                            : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {formatAddress()}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                          {location.location_description || location.description || '-'}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-12">
                            <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No locations have been added to this activity yet.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Bottom Section: Myanmar Regions Map */}
                {Object.keys(subnationalBreakdowns).length > 0 ? (
                  <div className="h-96">
                    <MyanmarRegionsMap
                      breakdowns={subnationalBreakdowns}
                      onRegionClick={undefined}
                    />
                  </div>
                ) : (
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900 flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        States/Regions Coverage
                      </CardTitle>
                      <CardDescription>
                        Map showing which states/regions this activity operates in
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96 flex items-center justify-center bg-surface-muted rounded-md border border-slate-200">
                        <div className="text-center">
                          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500">No regional breakdown data available</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                  </>
                )}
              </TabsContent>

              {/* Results Tab */}
              <TabsContent value="results" className="p-6 border-0">
                {activeTab === "results" && (
                  <ResultsReadOnlyView
                    activityId={activity.id}
                    defaultLanguage="en"
                  />
                )}
              </TabsContent>

              {/* SDG Alignment Tab */}
              <TabsContent value="sdg" className="p-6 border-0">
                {activeTab === "sdg" && (
                  <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-slate-900">SDG Alignment</CardTitle>
                    <CardDescription>
                      Sustainable Development Goals that this activity contributes to
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sdgMappings && sdgMappings.length > 0 ? (
                      <div className="space-y-6">
                        {/* SDG Icons Grid */}
                        <SDGImageGrid
                          sdgCodes={sdgMappings.map(m => m.sdgGoal || m.sdg_goal)}
                          size="lg"
                          showTooltips={true}
                        />

                        {/* Detailed SDG Explanations and Targets */}
                        {sdgMappings.some(m => m.notes || (m.sdgTarget || m.sdg_target)) && (
                          <div className="mt-8 pt-6 border-t border-slate-200">
                            <h4 className="text-sm font-semibold text-slate-700 mb-4">SDG Alignment Details</h4>
                            <div className="grid gap-4">
                              {(() => {
                                // Group mappings by goal
                                const goalGroups = sdgMappings.reduce((acc: any, mapping: any) => {
                                  const goalId = mapping.sdgGoal || mapping.sdg_goal;
                                  if (!acc[goalId]) {
                                    acc[goalId] = { notes: null, targets: [] };
                                  }
                                  const targetId = mapping.sdgTarget || mapping.sdg_target;
                                  if (targetId) {
                                    acc[goalId].targets.push(targetId);
                                  }
                                  if (mapping.notes && !targetId) {
                                    acc[goalId].notes = mapping.notes;
                                  }
                                  return acc;
                                }, {});

                                return Object.entries(goalGroups)
                                  .filter(([_, data]: [string, any]) => data.notes || data.targets.length > 0)
                                  .map(([goalId, data]: [string, any]) => {
                                    const goal = SDG_GOALS.find(g => g.id === parseInt(goalId));
                                    if (!goal) return null;

                                    return (
                                      <div key={goalId} className="flex gap-4 p-4 bg-slate-50 rounded-lg">
                                        <div className="flex-shrink-0 w-16 h-16">
                                          <SDGImageGrid
                                            sdgCodes={[parseInt(goalId)]}
                                            size="lg"
                                            showTooltips={false}
                                            clickable={false}
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-medium text-slate-900">
                                            Goal {goal.id}: {goal.name}
                                          </h5>
                                          {data.notes && (
                                            <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">
                                              {data.notes}
                                            </p>
                                          )}
                                          {data.targets.length > 0 && (
                                            <div className="mt-2">
                                              <p className="text-xs font-medium text-slate-500 mb-1">Specific Targets:</p>
                                              <div className="flex flex-wrap gap-1.5">
                                                {data.targets.map((targetId: string) => {
                                                  const target = SDG_TARGETS.find(t => t.id === targetId);
                                                  return (
                                                    <TooltipProvider key={targetId}>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <Badge variant="secondary" className="text-xs cursor-help">
                                                            {targetId}
                                                          </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-sm">
                                                          <p className="text-sm">{target?.description || targetId}</p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Globe className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No SDG alignments have been configured for this activity.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                )}
              </TabsContent>

              {/* Policy Markers Tab */}
              <TabsContent value="policy-markers" className="p-6 border-0">
                {activeTab === "policy-markers" && (
                <PolicyMarkersAnalyticsTab
                  policyMarkers={activity.policyMarkers || []}
                  activityTitle={activity.title || 'Activity'}
                />
                )}
              </TabsContent>

              {/* Library Tab */}
              <TabsContent value="library" className="p-6 border-0">
                {activeTab === "library" && (
                  loadingTabs.has('library') ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading documents...</span>
                    </div>
                  ) : (
                <DocumentsAndImagesTabV2
                  activityId={activity.id}
                  documents={documents}
                  onChange={setDocuments}
                  locale="en"
                  readOnly={true}
                />
                  )
                )}
              </TabsContent>

              {/* Related Activities Tab */}
              <TabsContent value="related-activities" className="p-6 border-0">
                {activeTab === "related-activities" && (
                  <RelatedActivitiesTab
                    activityId={activity.id}
                    activityTitle={activity.title || 'Current Activity'}
                    readOnly={true}
                  />
                )}
              </TabsContent>

              {/* Contacts Tab */}
              <TabsContent value="contacts" className="p-6 border-0">
                {activeTab === "contacts" && (
                  <ActivityContactsTab activityId={activity.id} />
                )}
              </TabsContent>

              {/* Discussion Tab - Public Comments */}
              <TabsContent value="discussion" className="p-6 border-0">
                {activeTab === "discussion" && (
                  <PublicCommentsThread activityId={activity.id} />
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
} 
