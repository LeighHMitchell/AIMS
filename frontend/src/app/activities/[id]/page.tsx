"use client"
import React, { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
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
  PieChart,
  Banknote,
  Globe,
  Activity,
  RefreshCw,
  AlertCircle,
  Lock,
  Wallet,
  ExternalLink,
  TrendingUp,
  Building2,
  MessageSquare,
  Plus,
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
  Check
} from "lucide-react"
import { toast } from "sonner"
import { Transaction } from "@/types/transaction"
import { DisbursementGauge, CumulativeFinanceChart } from "@/components/ActivityCharts"
import { ActivityAnalyticsCharts } from "@/components/ActivityAnalyticsCharts"
import financeTypes from "@/data/finance-types.json"
import { BannerUpload } from "@/components/BannerUpload"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useUser } from "@/hooks/useUser"
import { ActivityComments } from "@/components/ActivityComments"
import { fetchActivityWithCache, invalidateActivityCache, forceActivityCacheRefresh } from '@/lib/activity-cache'
import { CommentsDrawer } from "@/components/activities/CommentsDrawer"
import { TRANSACTION_TYPE_LABELS } from "@/types/transaction"
import TransactionTab from "@/components/activities/TransactionTab"
import { getActivityPermissions, ActivityContributor } from "@/lib/activity-permissions"
import { SDG_GOALS, SDG_TARGETS } from "@/data/sdg-targets"
import { SDGImageGrid } from "@/components/ui/SDGImageGrid"
import SDGAlignmentSection from "@/components/SDGAlignmentSection"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ActivityProfileSkeleton } from "@/components/skeletons/ActivityProfileSkeleton"
import ActivityBudgetsTab from "@/components/activities/ActivityBudgetsTab"
import { ResultsTab } from "@/components/activities/ResultsTab"
import { CapitalSpendTab } from "@/components/activities/CapitalSpendTab"
import { FinancingTermsTab } from "@/components/activities/FinancingTermsTab"
import PlannedDisbursementsTab from "@/components/activities/PlannedDisbursementsTab"
import FinancialAnalyticsTab from "@/components/activities/FinancialAnalyticsTab"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { v4 as uuidv4 } from 'uuid'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip2, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Legend } from 'recharts'
import { ChevronDown, ChevronUp, ChevronRight, BarChart3, GitBranch, Printer } from 'lucide-react'
import SectorSankeyVisualization from '@/components/charts/SectorSankeyVisualization'
import PolicyMarkersSectionIATIWithCustom from '@/components/PolicyMarkersSectionIATIWithCustom'
import { DocumentsAndImagesTabV2 } from '@/components/activities/DocumentsAndImagesTabV2'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import TagsSection from "@/components/TagsSection"
import { getOrganizationTypeName } from "@/data/iati-organization-types"


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
  // IATI Sync fields
  iatiIdentifier?: string
  autoSync?: boolean
  lastSyncTime?: string
  syncStatus?: 'live' | 'pending' | 'outdated'
  autoSyncFields?: string[]
}

// Format large numbers into compact form: 500000000 -> 500m, 200000 -> 200k
function formatCompactNumber(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '0.0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}b`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${value.toFixed(1)}`;
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

// Function to process finance type data from transactions
const processFinanceTypeData = (transactions: any[]) => {
  const financeTypeMap = new Map()
  let totalAmount = 0

  transactions.forEach(transaction => {
    const financeType = transaction.finance_type
    const value = parseFloat(transaction.value) || 0
    
    if (financeType && value > 0) {
      totalAmount += value
      
      if (financeTypeMap.has(financeType)) {
        financeTypeMap.get(financeType).amount += value
      } else {
        // Find finance type name from the imported data
        const financeTypeInfo = financeTypes.find(ft => ft.code === financeType)
        financeTypeMap.set(financeType, {
          code: financeType,
          name: financeTypeInfo?.name || `Finance Type ${financeType}`,
          amount: value
        })
      }
    }
  })

  // Convert to array and calculate percentages
  const result = Array.from(financeTypeMap.values())
    .map(item => ({
      ...item,
      percentage: totalAmount > 0 ? Math.round((item.amount / totalAmount) * 100 * 10) / 10 : 0
    }))
    .sort((a, b) => b.amount - a.amount) // Sort by amount descending

  return result
}

export default function ActivityDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [budgets, setBudgets] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("finances")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isBudgetsOpen, setIsBudgetsOpen] = useState(false)
  const [isPlannedOpen, setIsPlannedOpen] = useState(false)
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false)
  const router = useRouter()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Copy to clipboard function
  const copyToClipboard = (text: string, type: 'activityId' | 'iatiIdentifier') => {
    navigator.clipboard.writeText(text)
    setCopiedId(type)
    setTimeout(() => setCopiedId(null), 2000)
    const message = type === 'activityId' ? 'Activity ID' : 'IATI Identifier'
    toast.success(`${message} copied to clipboard`)
  }

  // Set initial tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Handle tab change with URL synchronization
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    
    // Update URL with the new tab parameter
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tabValue);
    
    // Use replace to avoid adding to browser history for each tab switch
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  
  // Debug logging for user role
  console.log('[AIMS DEBUG Activity Detail] Current user:', user);
  console.log('[AIMS DEBUG Activity Detail] User role:', user?.role);
  
  // Get permissions
  const permissions = getActivityPermissions(user, activity);
  
  const [showEditBanner, setShowEditBanner] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [showActivityDetails, setShowActivityDetails] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const descriptionRef = useRef<HTMLDivElement>(null)
  const shouldScrollToTop = useRef(false)
  const scrollLockRef = useRef(false)
  const scrollLockTimeout = useRef<NodeJS.Timeout | null>(null)
  const [budgetYearView, setBudgetYearView] = useState<'chart' | 'table'>('chart')
  
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
  const [financeTypeBreakdownView, setFinanceTypeBreakdownView] = useState<'chart' | 'table'>('chart')
  
  const [partners, setPartners] = useState<Partner[]>([])
  const [allPartners, setAllPartners] = useState<Partner[]>([])
  const [sdgMappings, setSdgMappings] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [participatingOrgs, setParticipatingOrgs] = useState<any[]>([])
  const [plannedDisbursements, setPlannedDisbursements] = useState<any[]>([])

  useEffect(() => {
    if (params?.id) {
      // Force refresh cache to ensure we get the latest data
      forceActivityCacheRefresh(Array.isArray(params.id) ? params.id[0] : params.id);
      fetchActivity(true)
      loadAllPartners();
      fetchBudgets();
      fetchParticipatingOrgs();
      fetchPlannedDisbursements();
    }
  }, [params?.id])

  const fetchParticipatingOrgs = async () => {
    if (!params?.id) return;
    try {
      const response = await fetch(`/api/activities/${params.id}/participating-organizations`);
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
      const response = await fetch(`/api/activities/${params.id}/planned-disbursements`);
      if (response.ok) {
        const data = await response.json();
        setPlannedDisbursements(data || []);
      }
    } catch (error) {
      console.error('Error fetching planned disbursements:', error);
      setPlannedDisbursements([]);
    }
  }

  // Refresh activity data when comments tab is selected to ensure we have latest comments count
  useEffect(() => {
    if (activeTab === "comments" && activity) {
      fetchActivity(false) // Don't show loading when just refreshing
    }
  }, [activeTab])

  // Set initial state of collapsible sections based on data availability
  useEffect(() => {
    if (activity) {
      setIsBudgetsOpen(!!(activity.budgets && activity.budgets.length > 0))
      setIsPlannedOpen(!!((activity as any).plannedDisbursements && (activity as any).plannedDisbursements.length > 0))
      setIsTransactionsOpen(!!(activity.transactions && activity.transactions.length > 0))
    }
  }, [activity])

  // Update section states when data changes
  useEffect(() => {
    if (budgets && budgets.length > 0) {
      setIsBudgetsOpen(true)
    }
  }, [budgets])

  useEffect(() => {
    if (plannedDisbursements && plannedDisbursements.length > 0) {
      setIsPlannedOpen(true)
    }
  }, [plannedDisbursements])

  // Note: Transaction state is already handled in the activity useEffect above (line 322)
  // No need for a separate useEffect since transactions come from activity.transactions

  const fetchActivity = async (showLoading = true) => {
    if (!params?.id) return;
    
    try {
      if (showLoading) setLoading(true)
      // OPTIMIZATION: Use cached activity data
      const found = await fetchActivityWithCache(Array.isArray(params.id) ? params.id[0] : params.id)
      if (found) {
          console.log('[ACTIVITY DETAIL DEBUG] Found activity:', found);
          console.log('[ACTIVITY DETAIL DEBUG] Activity contacts:', found.contacts);
          console.log('[ACTIVITY DETAIL DEBUG] Contacts count:', found.contacts?.length || 0);
          
          setActivity(found)
          setBanner(found.banner || null)
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
      const res = await fetch("/api/partners");
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
      const res = await fetch(`/api/activities/${params.id}/budgets`);
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

  const handleBannerChange = async (newBanner: string | null) => {
    setBanner(newBanner)
    // Save banner to backend
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...activity, banner: newBanner }),
      })
      if (!res.ok) throw new Error("Failed to save banner")
      toast.success("Banner updated successfully")
    } catch (error) {
      console.error("Error saving banner:", error)
      toast.error("Failed to save banner")
    }
  }

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

  // Calculate financial summary
  const calculateFinancials = () => {
    const transactions: any[] = activity?.transactions || []
    
    // Include all transactions regardless of status for profile view
    // This ensures published activities show their financial data
    const allTransactions = transactions
    
    // IATI transaction types:
    // '2' = Outgoing Commitment
    // '3' = Disbursement  
    // '4' = Expenditure
    
    const commitment = allTransactions
      .filter(t => t.transaction_type === "2")
      .reduce((sum, t) => {
        const value = parseFloat(t.value) || 0
        return sum + (isNaN(value) ? 0 : value)
      }, 0)
    
    const disbursement = allTransactions
      .filter(t => t.transaction_type === "3")
      .reduce((sum, t) => {
        const value = parseFloat(t.value) || 0
        return sum + (isNaN(value) ? 0 : value)
      }, 0)
    
    const expenditure = allTransactions
      .filter(t => t.transaction_type === "4")
      .reduce((sum, t) => {
        const value = parseFloat(t.value) || 0
        return sum + (isNaN(value) ? 0 : value)
      }, 0)
    
    // Get unique aid types and flow types
    const aidTypes = Array.from(new Set(transactions.map(t => t.aid_type).filter(Boolean)))
    const flowTypes = Array.from(new Set(transactions.map(t => t.flow_type).filter(Boolean)))
    
    // Calculate draft vs actual
    const draftTransactions = transactions.filter(t => t.status === "draft")
    const actualTransactions = transactions.filter(t => t.status === "actual")
    
    return {
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
    }
  }

  const financials = calculateFinancials()

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

  // Helper function for status-aware date display
  const getDisplayDates = (activity: Activity) => {
    if (!activity) return null;
    
    const activityStatus = activity.activityStatus?.toLowerCase() || 'planning';
    const isPipeline = activityStatus === 'planning' || activityStatus === 'pipeline';
    const isActive = activityStatus === 'implementation' || activityStatus === 'active';
    const isClosed = ['completed', 'cancelled', 'suspended'].includes(activityStatus);

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
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="outline"
                onClick={() => {
                  fetchActivity(false);
                  loadAllPartners();
                }}
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={handleEdit}
                className="bg-slate-600 hover:bg-slate-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Activity
              </Button>
            </div>
          </div>

          {/* Activity Header Card */}
          <Card className="mb-6 border-0 shadow-sm overflow-hidden">
            {/* Banner Image */}
            {showEditBanner ? (
              <div className="p-4">
                <BannerUpload
                  currentBanner={banner || undefined}
                  onBannerChange={handleBannerChange}
                  activityId={activity.id}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowEditBanner(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : banner ? (
              <div className="w-full h-48 overflow-hidden">
                <img 
                  src={banner} 
                  alt={`${activity.title} banner`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}
            
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Content - Columns 1-3 */}
                <div className="lg:col-span-3">
                  <div className="flex items-start gap-4">
                    {/* Icon/Logo */}
                    <div className="flex-shrink-0">
                      {activity.icon ? (
                        <img 
                          src={activity.icon} 
                          alt={`${activity.title} icon`}
                          className="w-20 h-20 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                          <Activity className="h-10 w-10 text-slate-400" />
                        </div>
                      )}
                      {activity.tags && activity.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1 max-w-[7rem]">
                          {activity.tags.slice(0, 12).map((t: any) => (
                            <Badge key={t.id || t.name} variant="secondary" className="text-[10px] px-1 py-0.5">
                              {t.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                </div>

                    {/* Activity Info */}
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-slate-900 mb-3">
                        {activity.title}{activity.acronym && ` (${activity.acronym})`}
                      </h1>
                      
                      <div className="space-y-3">
                        {/* First Row: Activity ID, IATI ID and Status Badges */}
                        <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-slate-200">
                          {(activity.partnerId || activity.iatiId) && (
                            <div className="flex items-center gap-1 group">
                              <code className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded font-mono">
                                {activity.partnerId || activity.iatiId}
                              </code>
                              <button
                                onClick={() => copyToClipboard(activity.partnerId || activity.iatiId || '', 'activityId')}
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
                              activity.activityStatus === "completed" || activity.activityStatus === "4" ? "bg-green-100 text-green-800" : 
                              activity.activityStatus === "implementation" || activity.activityStatus === "2" ? "bg-blue-100 text-blue-800" :
                              activity.activityStatus === "cancelled" || activity.activityStatus === "5" ? "bg-red-100 text-red-800" : 
                              "bg-slate-100 text-slate-800"
                            }
                          >
                            {activity.activityStatus === "2" ? "Implementation" :
                             activity.activityStatus === "1" ? "Pipeline/Identification" :
                             activity.activityStatus === "3" ? "Completion" :
                             activity.activityStatus === "4" ? "Post-Completion" :
                             activity.activityStatus === "5" ? "Cancelled" :
                             activity.activityStatus === "6" ? "Suspended" :
                             (activity.activityStatus || "Planning").charAt(0).toUpperCase() + 
                             (activity.activityStatus || "Planning").slice(1).toLowerCase()}
                          </Badge>
                          
                          {/* IATI Sync Status */}
                          {activity.iatiIdentifier && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="border-slate-300 text-slate-700">
                                    {activity.syncStatus === 'live' ? (
                                      <>
                                        <RefreshCw className="h-3 w-3 mr-1 text-green-600" />
                                        IATI Synced
                                      </>
                                    ) : activity.syncStatus === 'outdated' ? (
                                      <>
                                        <AlertCircle className="h-3 w-3 mr-1 text-yellow-600" />
                                        IATI Outdated
                                      </>
                                    ) : (
                                      <>
                                        <Globe className="h-3 w-3 mr-1 text-slate-600" />
                                        IATI Linked
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
                          )}
                        </div>

                        {/* Second Row: Timeline Dates */}
                        <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-slate-200">
                          {activity.plannedStartDate && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span className="text-slate-500">Planned Start:</span>
                              <span className="font-medium text-slate-900">{formatDate(activity.plannedStartDate)}</span>
                            </div>
                          )}
                          {activity.actualStartDate && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span className="text-slate-500">Actual Start:</span>
                              <span className="font-medium text-slate-900">{formatDate(activity.actualStartDate)}</span>
                            </div>
                          )}
                          {(activity.plannedEndDate || activity.actualEndDate) && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span className="text-slate-500">
                                {activity.actualEndDate ? 'Actual End:' : 'Planned End:'}
                              </span>
                              <span className="font-medium text-slate-900">
                                {formatDate(activity.actualEndDate || activity.plannedEndDate || '')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Third Row: Created and Updated Dates */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <span>Created:</span>
                            <span className="text-slate-900">{formatDate(activity.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Updated:</span>
                            <span className="text-slate-900">{formatDate(activity.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    
                    {/* General Description - Always Shown */}
                    {activity.description && (
                        <div ref={descriptionRef} className="mt-3">
                          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {isDescriptionExpanded 
                              ? activity.description 
                              : activity.description.length > 700
                                ? activity.description.slice(0, 700) + '...'
                                : activity.description
                            }
                          </p>
                        </div>
                    )}

                    {/* Additional sections shown when expanded */}
                    {isDescriptionExpanded && (
                      <>
                        {/* Objectives Section */}
                        {activity.descriptionObjectives && (
                          <div className="mt-4 border-t border-slate-200 pt-3">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">
                              Objectives
                            </h4>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {activity.descriptionObjectives}
                            </p>
                          </div>
                        )}

                        {/* Target Groups Section */}
                        {activity.descriptionTargetGroups && (
                          <div className="mt-4 border-t border-slate-200 pt-3">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">
                              Target Groups
                            </h4>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {activity.descriptionTargetGroups}
                            </p>
                          </div>
                        )}

                        {/* Other Section */}
                        {activity.descriptionOther && (
                          <div className="mt-4 border-t border-slate-200 pt-3">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">
                              Other
                            </h4>
                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {activity.descriptionOther}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Show More/Less button */}
                    {((activity.description && activity.description.length > 700) || 
                      activity.descriptionObjectives || 
                      activity.descriptionTargetGroups || 
                      activity.descriptionOther) && (
                      <button
                        onClick={(event) => {
                          if (!isDescriptionExpanded) {
                            setIsDescriptionExpanded(true)
                          } else {
                            // Prevent any default behavior and stop propagation
                            event.preventDefault()
                            event.stopPropagation()
                            
                            // Scroll to top IMMEDIATELY before state change
                            // This happens synchronously before React's re-render
                            scrollLockRef.current = true
                            const topElement = document.getElementById('page-top')
                            if (topElement) {
                              topElement.scrollIntoView({ behavior: 'auto', block: 'start' })
                            } else {
                              window.scrollTo({ top: 0, behavior: 'auto' })
                            }
                            document.documentElement.scrollTop = 0
                            document.body.scrollTop = 0
                            
                            // Set flag for useLayoutEffect fallback
                            shouldScrollToTop.current = true
                            
                            // Collapse the description - useLayoutEffect will also ensure we stay at top
                            setIsDescriptionExpanded(false)
                            
                            // Release scroll lock after 500ms
                            if (scrollLockTimeout.current) {
                              clearTimeout(scrollLockTimeout.current)
                            }
                            scrollLockTimeout.current = setTimeout(() => {
                              scrollLockRef.current = false
                            }, 500)
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
                        </div>
                      </div>
                </div>

                {/* Organizations Sidebar - Column 4 */}
                <div className="lg:col-span-1">
                  <div className="bg-white">
                    <div className="space-y-3">
                      {/* All Participating Organizations */}
                      {participatingOrgs.length > 0 ? (
                        <div className="space-y-3">
                          {participatingOrgs.map((org, idx) => (
                            <div key={idx} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                              {/* Role Badge - Positioned Above */}
                              <div className="mb-2">
                                <Badge 
                                  variant="outline" 
                                  className="border-slate-300 text-slate-700 text-xs pl-0"
                                >
                                  {org.role_type === 'government' ? 'Accountable' :
                                   org.role_type === 'extending' ? 'Extending' :
                                   org.role_type === 'funding' ? 'Funding' :
                                   org.role_type === 'implementing' ? 'Implementing' :
                                   org.role_type}
                                </Badge>
                              </div>
                              
                              <div className="flex items-start gap-3">
                                {/* Logo/Icon */}
                                  <div className="flex-shrink-0">
                                  {org.organization?.logo ? (
                                    <img 
                                      src={org.organization.logo} 
                                      alt={`${org.organization.name} logo`}
                                      className="w-10 h-10 rounded object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                                      <Building2 className="h-5 w-5 text-slate-400" />
                                  </div>
                                )}
                        </div>
                                  
                                  {/* Organization Name with Acronym */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-slate-900 break-words">
                                    {org.organization?.name || org.narrative || 'Unknown'}
                                    {org.organization?.acronym && org.organization.acronym !== org.organization.name && (
                                      <span> ({org.organization.acronym})</span>
                                    )}
                      </div>
                        </div>
                        </div>
                      </div>
                          ))}
                      </div>
                      ) : (
                        <div className="text-xs text-slate-500">No participating organizations</div>
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
                            // Get specific icon for each policy marker based on IATI code
                            const getIconForMarker = (iatiCode: string) => {
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
                                default: return Wrench; // Default/Other
                              }
                            };
                            
                            const IconComponent = getIconForMarker(marker.policy_marker_details?.iati_code || '');
                            
                            return (
                              <TooltipProvider key={marker.policy_marker_id || index}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors cursor-help">
                                      <IconComponent className="w-4 h-4 text-slate-600" />
                                    </div>
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
                      <p className="text-xs font-medium text-slate-600">Total Budgeted</p>
                      <p className="text-lg font-bold text-slate-900">
                        USD {formatCompactNumber(budgets.reduce((sum: number, b: any) => 
                          sum + (b.usd_value || (b.currency === 'USD' ? b.value : 0) || 0), 0))}
                      </p>
                  </div>
                    <div className="border-t border-slate-200 pt-2">
                    <p className="text-xs font-medium text-slate-600">Total Planned Disb.</p>
                    <p className="text-lg font-bold text-slate-900">
                      USD {formatCompactNumber(plannedDisbursements.reduce((sum: number, pd: any) => 
                        sum + (pd.usdAmount || (pd.currency === 'USD' ? pd.amount : 0) || 0), 0))}
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
                      <p className="text-xs font-medium text-slate-600">Disbursed</p>
                      <p className="text-lg font-bold text-slate-900">
                      ${formatCompactNumber(financials.totalDisbursement)}
                    </p>
                  </div>
                    <div className="border-t border-slate-200 pt-2">
                      <p className="text-xs font-medium text-slate-600">Expended</p>
                      <p className="text-lg font-bold text-slate-900">
                      ${formatCompactNumber(financials.totalExpenditure)}
                    </p>
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
                      <p className="text-xs font-medium text-slate-600">Progress</p>
                      <p className="text-lg font-bold text-slate-900">{financials.percentDisbursed}%</p>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(financials.percentDisbursed, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-200 pt-2">
                    <p className="text-xs font-medium text-slate-600">Remaining</p>
                    <p className="text-lg font-bold text-slate-900">
                      ${formatCompactNumber(financials.totalCommitment - financials.totalDisbursement)}
                    </p>
                  </div>
                  </div>
                  <TrendingUp className="h-6 w-6 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            {/* Budget by Year Chart */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-slate-900">Budget by Year</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBudgetYearView(budgetYearView === 'chart' ? 'table' : 'chart')}
                    className="h-6 w-6 p-0"
                  >
                    {budgetYearView === 'chart' ? <TableIcon className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const budgetsByYearMap = new Map<number, number>()
                      budgets.forEach(budget => {
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
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {(() => {
                  // Calculate budgets by year
                  const budgetsByYear = new Map<number, number>()
                  budgets.forEach(budget => {
                    if (budget.period_start) {
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
                      <div className="h-24 flex items-center justify-center text-slate-400 text-xs">
                        <p>No budget data</p>
                </div>
                    )
                  }

                  if (budgetYearView === 'table') {
                    return (
                      <div className="h-24 overflow-auto">
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
                                  ${(item.amount / 1000).toFixed(0)}k
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  }

                  return (
                    <div className="h-24 -mx-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={budgetData} margin={{ top: 0, right: 5, left: 0, bottom: 5 }}>
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
                              const rounded = Math.round((value / 1000000) * 10) / 10;
                              return `$${rounded.toFixed(1)}M`;
                            }}
                          />
                          <RechartsTooltip2 
                            cursor={false}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                                    <p className="text-sm font-semibold">{payload[0].payload.year}</p>
                                    <p className="text-sm text-gray-600">
                                      ${(payload[0].value as number).toLocaleString()}
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            {budgetData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill="#475569" />
                            ))}
                          </Bar>
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Planned vs Actual Spending */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-slate-900">Planned vs Actual</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDisbursementProgressView(disbursementProgressView === 'chart' ? 'table' : 'chart')}
                    className="h-6 w-6 p-0"
                  >
                    {disbursementProgressView === 'chart' ? <TableIcon className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const budgetsByYearMap = new Map<number, number>()
                      const disbursementsByYearMap = new Map<number, number>()
                      const expendituresByYearMap = new Map<number, number>()

                      budgets.forEach(budget => {
                        if (budget.period_start) {
                          const year = new Date(budget.period_start).getFullYear()
                          const usdValue = budget.usd_value || (budget.currency === 'USD' ? budget.value : 0)
                          budgetsByYearMap.set(year, (budgetsByYearMap.get(year) || 0) + (usdValue || 0))
                        }
                      })

                      const transactions = activity?.transactions || []
                      transactions.forEach((t: any) => {
                        if (t.transaction_date) {
                          const year = new Date(t.transaction_date).getFullYear()
                          const value = parseFloat(t.value) || 0
                          
                          if (t.transaction_type === '3') {
                            disbursementsByYearMap.set(year, (disbursementsByYearMap.get(year) || 0) + value)
                          } else if (t.transaction_type === '4') {
                            expendituresByYearMap.set(year, (expendituresByYearMap.get(year) || 0) + value)
                          }
                        }
                      })

                      const allYears = new Set([
                        ...Array.from(budgetsByYearMap.keys()),
                        ...Array.from(disbursementsByYearMap.keys()),
                        ...Array.from(expendituresByYearMap.keys())
                      ])

                      const csvData = Array.from(allYears).sort().map(year => [
                        year,
                        budgetsByYearMap.get(year) || 0,
                        disbursementsByYearMap.get(year) || 0,
                        expendituresByYearMap.get(year) || 0
                      ])
                      
                      const csvContent = [
                        ['Year', 'Planned Budget', 'Disbursements', 'Expenditures'],
                        ...csvData
                      ].map(row => row.join(',')).join('\n')
                      
                      const blob = new Blob([csvContent], { type: 'text/csv' })
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `planned-vs-actual-spending-${activity.id}.csv`
                      a.click()
                      window.URL.revokeObjectURL(url)
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {(() => {
                  // Calculate budgets and actuals by year
                  const budgetsByYearMap = new Map<number, number>()
                  const disbursementsByYearMap = new Map<number, number>()
                  const expendituresByYearMap = new Map<number, number>()

                  // Process budgets
                  budgets.forEach(budget => {
                    if (budget.period_start) {
                      const year = new Date(budget.period_start).getFullYear()
                      const usdValue = budget.usd_value || (budget.currency === 'USD' ? budget.value : 0)
                      budgetsByYearMap.set(year, (budgetsByYearMap.get(year) || 0) + (usdValue || 0))
                    }
                  })

                  // Process transactions
                  const transactions = activity?.transactions || []
                  transactions.forEach((t: any) => {
                    if (t.transaction_date) {
                      const year = new Date(t.transaction_date).getFullYear()
                      const value = parseFloat(t.value) || 0
                      
                      if (t.transaction_type === '3') { // Disbursement
                        disbursementsByYearMap.set(year, (disbursementsByYearMap.get(year) || 0) + value)
                      } else if (t.transaction_type === '4') { // Expenditure
                        expendituresByYearMap.set(year, (expendituresByYearMap.get(year) || 0) + value)
                      }
                    }
                  })

                  // Combine all years
                  const allYears = new Set([
                    ...Array.from(budgetsByYearMap.keys()),
                    ...Array.from(disbursementsByYearMap.keys()),
                    ...Array.from(expendituresByYearMap.keys())
                  ])

                  const chartData = Array.from(allYears).sort().map(year => ({
                    year,
                    plannedDisbursements: budgetsByYearMap.get(year) || 0,
                    disbursements: disbursementsByYearMap.get(year) || 0,
                    expenditures: expendituresByYearMap.get(year) || 0
                  }))

                  if (chartData.length === 0) {
                    return (
                      <div className="h-24 flex items-center justify-center text-slate-400 text-xs">
                        <p>No financial data</p>
                </div>
                    )
                  }

                  if (disbursementProgressView === 'table') {
                    return (
                      <div className="h-24 overflow-auto">
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
                                <td className="text-right py-1 font-medium" style={{ color: '#64748b' }}>${(item.plannedDisbursements / 1000).toFixed(0)}k</td>
                                <td className="text-right py-1 font-medium" style={{ color: '#1e40af' }}>${(item.disbursements / 1000).toFixed(0)}k</td>
                                <td className="text-right py-1 font-medium" style={{ color: '#0f172a' }}>${(item.expenditures / 1000).toFixed(0)}k</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  }

                  return (
                    <div className="h-24 -mx-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={chartData} margin={{ top: 0, right: 5, left: 0, bottom: 5 }} barCategoryGap="5%" barGap={0}>
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
                              const rounded = Math.round((value / 1000000) * 10) / 10;
                              return `$${rounded.toFixed(1)}M`;
                            }}
                          />
                          <RechartsTooltip2 
                            position={{ y: 0 }}
                            offset={10}
                            cursor={false}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                                    <p className="text-sm font-semibold mb-1">{payload[0].payload.year}</p>
                                    <div className="space-y-1 text-xs">
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#94a3b8' }}></div>
                                        <p className="font-medium" style={{ color: '#64748b' }}>Planned: ${payload[0].payload.plannedDisbursements.toLocaleString()}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#1e40af' }}></div>
                                        <p className="font-medium" style={{ color: '#1e40af' }}>Disbursements: ${payload[0].payload.disbursements.toLocaleString()}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#0f172a' }}></div>
                                        <p className="font-medium" style={{ color: '#0f172a' }}>Expenditures: ${payload[0].payload.expenditures.toLocaleString()}</p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="plannedDisbursements" fill="#94a3b8" name="Planned" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="disbursements" stackId="actuals" fill="#1e40af" name="Disbursements" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="expenditures" stackId="actuals" fill="#0f172a" name="Expenditures" radius={[4, 4, 0, 0]} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Finance Type Breakdown */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-slate-900">Finance Types</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFinanceTypeBreakdownView(financeTypeBreakdownView === 'chart' ? 'table' : 'chart')}
                    className="h-6 w-6 p-0"
                  >
                    {financeTypeBreakdownView === 'chart' ? <TableIcon className="h-3 w-3" /> : <PieChart className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const transactions = activity.transactions || []
                      const financeTypeData = processFinanceTypeData(transactions)
                      const csvContent = [
                        ['Finance Type Code', 'Finance Type Name', 'Amount (USD)', 'Percentage'],
                        ...financeTypeData.map((item: any) => [
                          item.code,
                          item.name,
                          item.amount,
                          item.percentage
                        ])
                      ].map(row => row.join(',')).join('\n')
                      
                      const blob = new Blob([csvContent], { type: 'text/csv' })
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `finance-type-breakdown-${activity.id}.csv`
                      a.click()
                      window.URL.revokeObjectURL(url)
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {(() => {
                  const transactions = activity.transactions || []
                  if (transactions.length === 0) {
                    return (
                      <div className="h-24 flex items-center justify-center text-slate-400 text-xs">
                        <p>No transaction data</p>
                      </div>
                    )
                  }

                  // Process finance type data
                  const financeTypeData = processFinanceTypeData(transactions)
                  
                  if (financeTypeData.length === 0) {
                    return (
                      <div className="h-24 flex items-center justify-center text-slate-400 text-xs">
                        <p>No finance type data</p>
                      </div>
                    )
                  }

                  // Define colors for finance types
                  const financeTypeColors = [
                    '#1e40af', // blue-800
                    '#3b82f6', // blue-500
                    '#0f172a', // slate-900
                    '#475569', // slate-600
                    '#64748b', // slate-500
                    '#334155', // slate-700
                    '#94a3b8', // slate-400
                    '#0ea5e9', // sky-500
                    '#10b981', // emerald-500
                    '#f59e0b', // amber-500
                  ]

                  const chartData = financeTypeData.slice(0, 6).map((item: any, idx: number) => ({
                    code: item.code,
                    name: item.name,
                    value: item.percentage,
                    amount: item.amount,
                    color: financeTypeColors[idx % financeTypeColors.length]
                  }))

                  if (financeTypeBreakdownView === 'table') {
                    return (
                      <div className="h-24 overflow-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-1 text-slate-600 font-medium">Finance Type</th>
                              <th className="text-right py-1 text-slate-600 font-medium">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financeTypeData.slice(0, 5).map((item: any, idx: number) => (
                              <tr key={idx} className="border-b border-slate-100">
                                <td className="py-1 text-slate-900">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: financeTypeColors[idx % financeTypeColors.length] }} />
                                    <span className="break-words">{item.name}</span>
                                  </div>
                                </td>
                                <td className="text-right py-1 text-slate-900 font-medium">
                                  ${(Math.round(((parseFloat(item.amount) || 0) / 1000000) * 10) / 10).toFixed(1)}M
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  }

                  return (
                    <div className="h-24 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={40}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip2 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                                    <p className="text-sm font-semibold text-slate-900 mb-1">{data.name}</p>
                                    <code className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono">
                                      {data.code}
                                    </code>
                                    <p className="text-xs text-slate-600 font-medium mt-1">
                                      ${data.amount.toLocaleString()} ({data.value}%)
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Card className="border-slate-200">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className={`grid w-full ${(user?.role?.includes('gov_partner') || user?.role === 'super_user') ? 'grid-cols-12' : 'grid-cols-11'} bg-slate-50 border-b border-slate-200`}>
                <TabsTrigger value="finances" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Finances
                </TabsTrigger>
                <TabsTrigger value="financial-analytics" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Financial Analytics
                </TabsTrigger>
                <TabsTrigger value="sectors" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Sectors
                </TabsTrigger>
                <TabsTrigger value="partnerships" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Partnerships
                </TabsTrigger>
                <TabsTrigger value="geography" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Geography
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="sdg" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  SDG Alignment
                </TabsTrigger>
                <TabsTrigger value="tags" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Tags
                </TabsTrigger>
                <TabsTrigger value="policy-markers" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Policy Markers
                </TabsTrigger>
                <TabsTrigger value="library" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Library
                </TabsTrigger>
                <TabsTrigger value="comments" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Comments
                  {activity.comments && activity.comments.length > 0 && (
                    <Badge variant="outline" className="ml-1 text-xs border-slate-300">
                      {activity.comments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                {(user?.role?.includes('gov_partner') || user?.role === 'super_user') && (
                  <TabsTrigger value="government-inputs" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                    Gov Inputs
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Finances Tab - Consolidated */}
              <TabsContent value="finances" className="p-6" forceMount hidden={activeTab !== "finances"}>
                <div className="space-y-6">
                  {/* Budgets */}
                  <div className="border rounded-lg">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <button
                        onClick={() => setIsBudgetsOpen(!isBudgetsOpen)}
                        className="flex items-center gap-2 text-left hover:text-slate-900 transition-colors"
                        aria-label={isBudgetsOpen ? 'Collapse Budgets' : 'Expand Budgets'}
                      >
                        {isBudgetsOpen ? <ChevronUp className="h-4 w-4 text-slate-600 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-600 flex-shrink-0" />}
                        <div className="flex-1">
                          <p className="text-lg font-bold text-slate-900">Budgets</p>
                          {isBudgetsOpen && (
                            <p className="text-xs text-slate-500 mt-1">Activity budget allocations by period</p>
                          )}
                        </div>
                      </button>
                    </div>
                    {isBudgetsOpen && (
                      <div className="p-4">
                        <ActivityBudgetsTab 
                          activityId={activity.id}
                          startDate={activity.plannedStartDate || activity.actualStartDate || ""}
                          endDate={activity.plannedEndDate || activity.actualEndDate || ""}
                          defaultCurrency="USD"
                          hideSummaryCards={true}
                          readOnly={true}
                        />
                      </div>
                    )}
                  </div>

                  {/* Planned Disbursements */}
                  <div className="border rounded-lg">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <button
                        onClick={() => setIsPlannedOpen(!isPlannedOpen)}
                        className="flex items-center gap-2 text-left hover:text-slate-900 transition-colors"
                        aria-label={isPlannedOpen ? 'Collapse Planned Disbursements' : 'Expand Planned Disbursements'}
                      >
                        {isPlannedOpen ? <ChevronUp className="h-4 w-4 text-slate-600 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-600 flex-shrink-0" />}
                        <div className="flex-1">
                          <p className="text-lg font-bold text-slate-900">Planned Disbursements</p>
                          {isPlannedOpen && (
                            <p className="text-xs text-slate-500 mt-1">Scheduled future disbursements</p>
                          )}
                        </div>
                      </button>
                    </div>
                    {isPlannedOpen && (
                      <div className="p-4">
                        <PlannedDisbursementsTab 
                          activityId={activity.id}
                          startDate={activity.plannedStartDate || activity.actualStartDate || ""}
                          endDate={activity.plannedEndDate || activity.actualEndDate || ""}
                          defaultCurrency="USD"
                          readOnly={true}
                          onDisbursementsChange={setPlannedDisbursements}
                          hideSummaryCards={true}
                        />
                      </div>
                    )}
                  </div>

                  {/* Transactions */}
                  <div className="border rounded-lg">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <button
                        onClick={() => setIsTransactionsOpen(!isTransactionsOpen)}
                        className="flex items-center gap-2 text-left hover:text-slate-900 transition-colors"
                        aria-label={isTransactionsOpen ? 'Collapse Transactions' : 'Expand Transactions'}
                      >
                        {isTransactionsOpen ? <ChevronUp className="h-4 w-4 text-slate-600 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-600 flex-shrink-0" />}
                        <div className="flex-1">
                          <p className="text-lg font-bold text-slate-900">Transactions</p>
                          {isTransactionsOpen && (
                            <p className="text-xs text-slate-500 mt-1">Commitments, disbursements, and expenditures</p>
                          )}
                        </div>
                      </button>
                    </div>
                    {isTransactionsOpen && (
                      <div className="p-4">
                        <TransactionTab 
                          activityId={activity.id} 
                          readOnly={true}
                          defaultFinanceType={activity.defaultFinanceType}
                          defaultAidType={activity.defaultAidType}
                          defaultCurrency={activity.defaultCurrency}
                          defaultTiedStatus={activity.defaultTiedStatus}
                          defaultFlowType={activity.defaultFlowType}
                          hideSummaryCards={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Financial Analytics Tab */}
              <TabsContent value="financial-analytics" className="p-6" forceMount hidden={activeTab !== "financial-analytics"}>
                <FinancialAnalyticsTab activityId={activity.id} />
              </TabsContent>

              {/* Sectors Tab */}
              <TabsContent value="sectors" className="p-6">
                <div className="space-y-6">
                  {/* Sector Allocation Visualization */}
                  {activity.sectors && activity.sectors.length > 0 ? (
                    <>
                      {/* Sector Flow Visualization with Toggle */}
                      <Card className="border-slate-200">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-slate-900 flex items-center gap-2">
                                <GitBranch className="h-5 w-5" />
                                Sector Flow Visualization
                              </CardTitle>
                          <CardDescription>
                                {sectorFlowView === 'flow' ? 'Hierarchical view of sector allocations from categories to subsectors' : 'Visual breakdown of sector allocations'}
                          </CardDescription>
                                  </div>
                            <div className="flex gap-2">
                              <Button
                                variant={sectorFlowView === 'flow' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSectorFlowView('flow')}
                              >
                                <GitBranch className="h-4 w-4 mr-2" />
                                Flow
                              </Button>
                              <Button
                                variant={sectorFlowView === 'distribution' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSectorFlowView('distribution')}
                              >
                                <PieChart className="h-4 w-4 mr-2" />
                                Distribution
                              </Button>
                                  </div>
                                  </div>
                        </CardHeader>
                        <CardContent>
                          {sectorFlowView === 'flow' ? (
                            <div className="w-full h-[500px]">
                              <SectorSankeyVisualization 
                                allocations={activity.sectors.map((s: any) => ({
                                  code: s.sector_code || s.code,
                                  name: s.sector_name || s.name,
                                  percentage: s.percentage || 0
                                }))}
                                onSegmentClick={(code) => {
                                  console.log('Sector clicked:', code);
                                }}
                              />
                                </div>
                          ) : (
                            <div className="w-full h-[500px] flex items-center justify-center">
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                  <Pie
                                    data={activity.sectors.map((s: any, idx: number) => ({
                                      code: s.sector_code || s.code,
                                      name: s.sector_name || s.name,
                                      value: s.percentage,
                                      fill: ['#1e40af', '#3b82f6', '#0f172a', '#475569', '#64748b', '#334155', '#94a3b8', '#0ea5e9'][idx % 8]
                                    }))}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={140}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, value }) => `${value}%`}
                                    labelLine={true}
                                  >
                                    {activity.sectors.map((_: any, index: number) => (
                                      <Cell key={`cell-${index}`} />
                                    ))}
                                  </Pie>
                                  <RechartsTooltip2 
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload
                                        return (
                                          <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                              <code className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono">
                                                {data.code}
                                              </code>
                            </div>
                                            <p className="text-sm font-semibold text-slate-900">{data.name}</p>
                                            <p className="text-lg font-bold text-slate-900 mt-1">{data.value}%</p>
                          </div>
                                        )
                                      }
                                      return null
                                    }}
                                  />
                                  <Legend 
                                    verticalAlign="bottom" 
                                    height={36}
                                    formatter={(value, entry: any) => {
                                      return (
                                        <span className="text-xs text-slate-700">
                                          {entry.payload.code}: {entry.payload.name.length > 30 ? entry.payload.name.substring(0, 30) + '...' : entry.payload.name}
                                        </span>
                                      );
                                    }}
                                  />
                                </RechartsPieChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Sector Allocations Table - Full Width */}
                      <Card className="border-slate-200">
                        <CardHeader>
                          <CardTitle className="text-slate-900">Sector Allocations</CardTitle>
                          <CardDescription>
                            Detailed breakdown with budget, commitment, planned, and actual spending by sector
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[400px] overflow-y-auto">
                            {(() => {
                              // Calculate totals
                              const totalBudget = budgets.reduce((sum: number, b: any) => 
                                sum + (b.usd_value || (b.currency === 'USD' ? b.value : 0) || 0), 0);
                              
                              const totalCommitment = financials.totalCommitment;
                              
                              const totalPlannedDisbursements = plannedDisbursements.reduce((sum: number, pd: any) => 
                                sum + (pd.usdAmount || (pd.currency === 'USD' ? pd.amount : 0) || 0), 0);
                              
                              const totalActualSpending = (activity.transactions || []).reduce((sum: number, t: any) => {
                                if (t.transaction_type === '3' || t.transaction_type === '4') {
                                  return sum + (parseFloat(t.value) || 0);
                                }
                                return sum;
                              }, 0);
                              
                              return (
                                <Table>
                                  <TableHeader className="bg-slate-50 sticky top-0">
                                    <TableRow>
                                      <TableHead className="text-slate-900">Sector</TableHead>
                                      <TableHead className="text-right text-slate-900">%</TableHead>
                                      <TableHead className="text-right text-slate-900">Budget (USD)</TableHead>
                                      <TableHead className="text-right text-slate-900">Commitment (USD)</TableHead>
                                      <TableHead className="text-right text-slate-900">Planned Disb. (USD)</TableHead>
                                      <TableHead className="text-right text-slate-900">Actual Spending (USD)</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {activity.sectors.map((sector: any, idx: number) => {
                                      const sectorBudget = totalBudget * (sector.percentage / 100);
                                      const sectorCommitment = totalCommitment * (sector.percentage / 100);
                                      const sectorPlannedDisb = totalPlannedDisbursements * (sector.percentage / 100);
                                      const sectorActual = totalActualSpending * (sector.percentage / 100);
                                      
                                      return (
                                        <TableRow key={idx} className="border-b border-slate-100">
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <div 
                                                className="w-3 h-3 rounded flex-shrink-0" 
                                                style={{ 
                                                  backgroundColor: ['#1e40af', '#3b82f6', '#0f172a', '#475569', '#64748b', '#334155', '#94a3b8', '#0ea5e9'][idx % 8]
                                                }}
                                              />
                                              <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                                {sector.sector_code || sector.code}
                                              </code>
                                              <span className="text-sm text-slate-900">
                                                {sector.sector_name || sector.name}
                                              </span>
                                      </div>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className="font-semibold text-slate-900">
                                        {sector.percentage}%
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className="text-sm text-slate-700">
                                              ${sectorBudget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className="text-sm text-slate-700">
                                              ${sectorCommitment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className="text-sm text-slate-700">
                                              ${sectorPlannedDisb.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className="text-sm text-slate-700">
                                              ${sectorActual.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </span>
                                          </TableCell>
                                        </TableRow>
                              );
                            })}
                                    <TableRow className="bg-slate-50 font-bold sticky bottom-0">
                                      <TableCell className="text-slate-900">Total</TableCell>
                                      <TableCell className="text-right text-slate-900">
                                {activity.sectors.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0)}%
                                      </TableCell>
                                      <TableCell className="text-right text-slate-900">
                                        ${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </TableCell>
                                      <TableCell className="text-right text-slate-900">
                                        ${totalCommitment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </TableCell>
                                      <TableCell className="text-right text-slate-900">
                                        ${totalPlannedDisbursements.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </TableCell>
                                      <TableCell className="text-right text-slate-900">
                                        ${totalActualSpending.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              );
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card className="border-slate-200">
                      <CardContent className="text-center py-12">
                        <PieChart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No sectors have been allocated for this activity.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Partnerships Tab */}
              <TabsContent value="partnerships" className="p-6">
                {(() => {
                  // Calculate financial metrics for each organization
                  const calculateOrgFinancials = (orgId: string | undefined, orgName: string | undefined) => {
                    let totalPlanned = 0;
                    let totalDisbursed = 0;
                    let totalExpended = 0;

                    // From planned disbursements
                    plannedDisbursements.forEach((pd: any) => {
                      if (pd.provider_org_id === orgId || pd.provider_org_name === orgName) {
                        totalPlanned += (pd.usdAmount || (pd.currency === 'USD' ? pd.amount : 0) || 0);
                      }
                    });

                    // From transactions
                    if (activity?.transactions) {
                      activity.transactions.forEach((t: any) => {
                        const value = parseFloat(t.value) || 0;
                        
                        // Provider (outgoing funds)
                        if (t.provider_org_id === orgId || t.provider_org_name === orgName) {
                          if (t.transaction_type === '3') { // Disbursement
                            totalDisbursed += value;
                          } else if (t.transaction_type === '4') { // Expenditure
                            totalExpended += value;
                          }
                        }
                        
                        // Receiver (incoming funds)
                        if (t.receiver_org_id === orgId || t.receiver_org_name === orgName) {
                          if (t.transaction_type === '3') { // Disbursement
                            totalDisbursed += value;
                          } else if (t.transaction_type === '4') { // Expenditure
                            totalExpended += value;
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
                    plannedDisbursements.forEach((pd: any) => {
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

                  return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* SDG Icons Below Partners List Header */}
                  {sdgMappings && sdgMappings.length > 0 && (
                    <div className="lg:col-span-2 mb-2 -mt-2">
                      <div className="pt-2 pb-3 border-b border-slate-200">
                        <div className="text-xs font-medium text-slate-600 mb-2">SDG Alignment</div>
                        <SDGImageGrid 
                          sdgCodes={sdgMappings.map((m: any) => m.sdgGoal || m.sdg_goal)} 
                          size="sm" 
                          showTooltips={true}
                        />
                      </div>
                    </div>
                  )}
                  {/* Funding Partners */}
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900 flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Funding Partners
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {participatingOrgs.filter(p => p.role_type === 'funding').length > 0 ? (
                        <div className="space-y-3">
                          {participatingOrgs.filter(p => p.role_type === 'funding').map((org, idx) => {
                            const financials = calculateOrgFinancials(org.organization?.id, org.organization?.name || org.narrative);
                            return (
                            <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="flex items-start gap-3 mb-3">
                                {/* Logo/Icon */}
                                <div className="flex-shrink-0">
                                  {org.organization?.logo ? (
                                    <img 
                                      src={org.organization.logo} 
                                      alt={`${org.organization.name} logo`}
                                      className="w-12 h-12 rounded object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                                      <Building2 className="h-6 w-6 text-slate-400" />
                                    </div>
                                  )}
                                </div>
                                {/* Organization Info */}
                                <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-900 mb-1">
                                      {org.organization?.name || org.narrative || 'Unknown'}
                                    </div>
                                    {org.organization?.acronym && org.organization.acronym !== org.organization.name && (
                                      <div className="text-sm text-slate-600">
                                        {org.organization.acronym}
                                      </div>
                                    )}
                                  </div>
                                  {/* Organization Type and IATI ID Badges - Right side */}
                                  {(org.organization?.Organisation_Type_Code || org.organization?.iati_org_id) && (
                                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                                      {org.organization.Organisation_Type_Code && (
                                        <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs">
                                          {getOrganizationTypeName(org.organization.Organisation_Type_Code)}
                                        </Badge>
                                      )}
                                      {org.organization.iati_org_id && (
                                        <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs font-mono">
                                          IATI: {org.organization.iati_org_id}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Financial Metrics */}
                              {(financials.totalPlanned > 0 || financials.totalDisbursed > 0 || financials.totalExpended > 0) && (
                                <div className="border-t border-slate-200 pt-3 space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Planned:</span>
                                    <span className="font-medium text-slate-900">${financials.totalPlanned.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Disbursed:</span>
                                    <span className="font-medium text-blue-600">${financials.totalDisbursed.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Expended:</span>
                                    <span className="font-medium text-slate-900">${financials.totalExpended.toLocaleString()}</span>
                                  </div>
                                  {financials.totalPlanned > 0 && (
                                    <div className="mt-2">
                                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                                        <span>Progress</span>
                                        <span>{financials.disbursementProgress.toFixed(0)}%</span>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div 
                                          className="bg-blue-600 h-2 rounded-full transition-all"
                                          style={{ width: `${Math.min(financials.disbursementProgress, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )})}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-4">No funding partners</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Implementing Partners */}
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Implementing Partners
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {participatingOrgs.filter(p => p.role_type === 'implementing').length > 0 ? (
                        <div className="space-y-3">
                          {participatingOrgs.filter(p => p.role_type === 'implementing').map((org, idx) => {
                            const financials = calculateOrgFinancials(org.organization?.id, org.organization?.name || org.narrative);
                            return (
                            <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="flex items-start gap-3 mb-3">
                                {/* Logo/Icon */}
                                <div className="flex-shrink-0">
                                  {org.organization?.logo ? (
                                    <img 
                                      src={org.organization.logo} 
                                      alt={`${org.organization.name} logo`}
                                      className="w-12 h-12 rounded object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                                      <Building2 className="h-6 w-6 text-slate-400" />
                                    </div>
                                  )}
                                </div>
                                {/* Organization Info */}
                                <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    {org.organization?.id ? (
                                      <>
                                        <Link 
                                          href={`/organizations/${org.organization.id}`}
                                          className="font-medium text-slate-900 mb-1 hover:text-blue-600 transition-colors block"
                                        >
                                          {org.organization.name || org.narrative || 'Unknown'}
                                        </Link>
                                        {org.organization.acronym && org.organization.acronym !== org.organization.name && (
                                          <div className="text-sm text-slate-600">
                                            <Link 
                                              href={`/organizations/${org.organization.id}`}
                                              className="hover:text-blue-600 transition-colors"
                                            >
                                              {org.organization.acronym}
                                            </Link>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <div className="font-medium text-slate-900 mb-1">
                                          {org.organization?.name || org.narrative || 'Unknown'}
                                        </div>
                                        {org.organization?.acronym && org.organization.acronym !== org.organization.name && (
                                          <div className="text-sm text-slate-600">
                                            {org.organization.acronym}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {/* Organization Type and IATI ID Badges - Right side */}
                                  {(org.organization?.Organisation_Type_Code || org.organization?.iati_org_id) && (
                                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                                      {org.organization.Organisation_Type_Code && (
                                        <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs">
                                          {getOrganizationTypeName(org.organization.Organisation_Type_Code)}
                                        </Badge>
                                      )}
                                      {org.organization.iati_org_id && (
                                        <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs font-mono">
                                          IATI: {org.organization.iati_org_id}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Financial Metrics */}
                              {(financials.totalPlanned > 0 || financials.totalDisbursed > 0 || financials.totalExpended > 0) && (
                                <div className="border-t border-slate-200 pt-3 space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Planned:</span>
                                    <span className="font-medium text-slate-900">${financials.totalPlanned.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Disbursed:</span>
                                    <span className="font-medium text-blue-600">${financials.totalDisbursed.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Expended:</span>
                                    <span className="font-medium text-slate-900">${financials.totalExpended.toLocaleString()}</span>
                                  </div>
                                  {financials.totalPlanned > 0 && (
                                    <div className="mt-2">
                                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                                        <span>Progress</span>
                                        <span>{financials.disbursementProgress.toFixed(0)}%</span>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div 
                                          className="bg-blue-600 h-2 rounded-full transition-all"
                                          style={{ width: `${Math.min(financials.disbursementProgress, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )})}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-4">No implementing partners</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Extending Partners */}
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900 flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Extending Partners
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {participatingOrgs.filter(p => p.role_type === 'extending').length > 0 ? (
                        <div className="space-y-3">
                          {participatingOrgs.filter(p => p.role_type === 'extending').map((org, idx) => {
                            const financials = calculateOrgFinancials(org.organization?.id, org.organization?.name || org.narrative);
                            return (
                            <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="flex items-start gap-3 mb-3">
                                {/* Logo/Icon */}
                                <div className="flex-shrink-0">
                                  {org.organization?.logo ? (
                                    <img 
                                      src={org.organization.logo} 
                                      alt={`${org.organization.name} logo`}
                                      className="w-12 h-12 rounded object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                                      <Building2 className="h-6 w-6 text-slate-400" />
                                    </div>
                                  )}
                                </div>
                                {/* Organization Info */}
                                <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-900 mb-1">
                                      {org.organization?.name || org.narrative || 'Unknown'}
                                    </div>
                                    {org.organization?.acronym && org.organization.acronym !== org.organization.name && (
                                      <div className="text-sm text-slate-600">
                                        {org.organization.acronym}
                                      </div>
                                    )}
                                  </div>
                                  {/* Organization Type and IATI ID Badges - Right side */}
                                  {(org.organization?.Organisation_Type_Code || org.organization?.iati_org_id) && (
                                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                                      {org.organization.Organisation_Type_Code && (
                                        <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs">
                                          {getOrganizationTypeName(org.organization.Organisation_Type_Code)}
                                        </Badge>
                                      )}
                                      {org.organization.iati_org_id && (
                                        <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs font-mono">
                                          IATI: {org.organization.iati_org_id}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Financial Metrics */}
                              {(financials.totalPlanned > 0 || financials.totalDisbursed > 0 || financials.totalExpended > 0) && (
                                <div className="border-t border-slate-200 pt-3 space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Planned:</span>
                                    <span className="font-medium text-slate-900">${financials.totalPlanned.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Disbursed:</span>
                                    <span className="font-medium text-blue-600">${financials.totalDisbursed.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Expended:</span>
                                    <span className="font-medium text-slate-900">${financials.totalExpended.toLocaleString()}</span>
                                  </div>
                                  {financials.totalPlanned > 0 && (
                                    <div className="mt-2">
                                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                                        <span>Progress</span>
                                        <span>{financials.disbursementProgress.toFixed(0)}%</span>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div 
                                          className="bg-blue-600 h-2 rounded-full transition-all"
                                          style={{ width: `${Math.min(financials.disbursementProgress, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )})}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-4">No extending partners</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Accountable Partners (Government) */}
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900 flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Accountable Partners
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {participatingOrgs.filter(p => p.role_type === 'government').length > 0 ? (
                        <div className="space-y-3">
                          {participatingOrgs.filter(p => p.role_type === 'government').map((org, idx) => {
                            const financials = calculateOrgFinancials(org.organization?.id, org.organization?.name || org.narrative);
                            return (
                            <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="flex items-start gap-3 mb-3">
                                {/* Logo/Icon */}
                                <div className="flex-shrink-0">
                                  {org.organization?.logo ? (
                                    <img 
                                      src={org.organization.logo} 
                                      alt={`${org.organization.name} logo`}
                                      className="w-12 h-12 rounded object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                                      <Building2 className="h-6 w-6 text-slate-400" />
                                    </div>
                                  )}
                                </div>
                                {/* Organization Info */}
                                <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-900 mb-1">
                                      {org.organization?.name || org.narrative || 'Unknown'}
                                    </div>
                                    {org.organization?.acronym && org.organization.acronym !== org.organization.name && (
                                      <div className="text-sm text-slate-600">
                                        {org.organization.acronym}
                                      </div>
                                    )}
                                  </div>
                                  {/* Organization Type and IATI ID Badges - Right side */}
                                  {(org.organization?.Organisation_Type_Code || org.organization?.iati_org_id) && (
                                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                                      {org.organization.Organisation_Type_Code && (
                                        <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs">
                                          {getOrganizationTypeName(org.organization.Organisation_Type_Code)}
                                        </Badge>
                                      )}
                                      {org.organization.iati_org_id && (
                                        <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs font-mono">
                                          IATI: {org.organization.iati_org_id}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Financial Metrics */}
                              {(financials.totalPlanned > 0 || financials.totalDisbursed > 0 || financials.totalExpended > 0) && (
                                <div className="border-t border-slate-200 pt-3 space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Planned:</span>
                                    <span className="font-medium text-slate-900">${financials.totalPlanned.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Disbursed:</span>
                                    <span className="font-medium text-blue-600">${financials.totalDisbursed.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Expended:</span>
                                    <span className="font-medium text-slate-900">${financials.totalExpended.toLocaleString()}</span>
                                  </div>
                                  {financials.totalPlanned > 0 && (
                                    <div className="mt-2">
                                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                                        <span>Progress</span>
                                        <span>{financials.disbursementProgress.toFixed(0)}%</span>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div 
                                          className="bg-blue-600 h-2 rounded-full transition-all"
                                          style={{ width: `${Math.min(financials.disbursementProgress, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )})}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-4">No accountable partners</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Other Partners */}
                  {otherPartners.length > 0 && (
                    <Card className="border-slate-200 lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-slate-900 flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Other Partners
                          <Badge variant="outline" className="ml-2 text-xs">
                            From Transactions & Planned Disbursements
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {otherPartners.map((partner, idx) => {
                            const financials = calculateOrgFinancials(partner.id, partner.name);
                            return (
                              <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex items-start gap-3 mb-3">
                                  {/* Logo/Icon */}
                                  <div className="flex-shrink-0">
                                    {partner.logo ? (
                                      <img 
                                        src={partner.logo} 
                                        alt={`${partner.name} logo`}
                                        className="w-12 h-12 rounded object-cover border border-slate-200"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                                        <Building2 className="h-6 w-6 text-slate-400" />
                                      </div>
                                    )}
                                  </div>
                                  {/* Organization Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-900 mb-1">
                                      {partner.name}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      Financial relationship only
                                    </div>
                                  </div>
                                </div>
                                {/* Financial Metrics */}
                                {(financials.totalPlanned > 0 || financials.totalDisbursed > 0 || financials.totalExpended > 0) && (
                                  <div className="border-t border-slate-200 pt-3 space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-slate-600">Planned:</span>
                                      <span className="font-medium text-slate-900">${financials.totalPlanned.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-slate-600">Disbursed:</span>
                                      <span className="font-medium text-blue-600">${financials.totalDisbursed.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-slate-600">Expended:</span>
                                      <span className="font-medium text-slate-900">${financials.totalExpended.toLocaleString()}</span>
                                    </div>
                                    {financials.totalPlanned > 0 && (
                                      <div className="mt-2">
                                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                                          <span>Progress</span>
                                          <span>{financials.disbursementProgress.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                          <div 
                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(financials.disbursementProgress, 100)}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                  );
                })()}
              </TabsContent>

              {/* Geography Tab */}
              <TabsContent value="geography" className="p-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-slate-900 flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Activity Locations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">Location information and maps will be displayed here once implemented.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="p-6">
                <ActivityAnalyticsCharts
                  transactions={activity.transactions || []}
                  budgets={budgets}
                  startDate={activity.plannedStartDate || activity.actualStartDate}
                  endDate={activity.plannedEndDate || activity.actualEndDate}
                />
              </TabsContent>

              {/* SDG Alignment Tab */}
              <TabsContent value="sdg" className="p-6">
                <SDGAlignmentSection 
                  sdgMappings={sdgMappings} 
                  onUpdate={setSdgMappings} 
                  activityId={activity.id}
                  canEdit={permissions.canEditActivity}
                />
              </TabsContent>

              {/* Tags Tab */}
              <TabsContent value="tags" className="p-6">
                <TagsSection 
                  activityId={activity.id}
                  tags={activity.tags || []}
                  onChange={(tags) => {
                    setActivity(prev => prev ? { ...prev, tags } : null);
                  }}
                />
              </TabsContent>

              {/* Policy Markers Tab */}
              <TabsContent value="policy-markers" className="p-6">
                <PolicyMarkersSectionIATIWithCustom
                  activityId={activity.id}
                  policyMarkers={activity.policyMarkers || []}
                  onChange={(markers) => {
                    setActivity(prev => prev ? { ...prev, policyMarkers: markers } : null);
                  }}
                  setHasUnsavedChanges={() => {}}
                  readOnly={true}
                />
              </TabsContent>

              {/* Library Tab */}
              <TabsContent value="library" className="p-6">
                <DocumentsAndImagesTabV2
                  activityId={activity.id}
                  documents={documents}
                  onChange={setDocuments}
                  locale="en"
                  readOnly={true}
                />
              </TabsContent>

              {/* Comments Tab */}
              <TabsContent value="comments" className="p-6">
                <ActivityComments activityId={activity.id} />
              </TabsContent>

              {/* Government Inputs Tab */}
              {(user?.role?.includes('gov_partner') || user?.role === 'super_user') && (
                <TabsContent value="government-inputs" className="p-6">
                  {activity.governmentInputs ? (
                    <Card className="border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-slate-900">On-Budget Classification (per CABRI/SPA model)</CardTitle>
                        <CardDescription>
                          Based on the CABRI/SPA 2008 "Putting Aid on Budget" Good Practice Note
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Status Summary */}
                          {activity.governmentInputs.onBudgetClassification && (
                            <div className="mb-6">
                              {(() => {
                                const classification = activity.governmentInputs.onBudgetClassification;
                                const dimensions = ['onPlan', 'onBudget', 'onTreasury', 'onParliament', 'onProcurement', 'onAudit'];
                                const met = dimensions.filter(dim => classification[dim] === 'Yes').length;
                                const partial = dimensions.filter(dim => classification[dim] === 'Partial').length;
                                return (
                                  <div className="flex items-center gap-2">
                                    <Badge className={met >= 4 ? "bg-green-100 text-green-800" : met >= 2 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-800"}>
                                      {met} of 6 dimensions met
                                    </Badge>
                                    {partial > 0 && (
                                      <Badge variant="outline" className="border-slate-300">{partial} partial</Badge>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          
                          {/* Six Dimensions Display */}
                          <div className="grid gap-3">
                            {[
                              { key: 'onPlan', label: 'On Plan', desc: 'Reflected in gov\'t planning documents' },
                              { key: 'onBudget', label: 'On Budget', desc: 'Included in national budget book' },
                              { key: 'onTreasury', label: 'On Treasury', desc: 'Disbursed via national treasury' },
                              { key: 'onParliament', label: 'On Parliament', desc: 'Subject to parliamentary scrutiny' },
                              { key: 'onProcurement', label: 'On Procurement', desc: 'Uses national procurement systems' },
                              { key: 'onAudit', label: 'On Accounting/Audit', desc: 'Uses national audit systems' },
                            ].map(({ key, label, desc }) => (
                              <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  <span className="text-sm font-medium text-slate-900">{label}</span>
                                  <span className="text-xs text-slate-500">({desc})</span>
                                </div>
                                <Badge className={
                                  activity.governmentInputs.onBudgetClassification?.[key] === 'Yes' ? "bg-green-100 text-green-800" :
                                  activity.governmentInputs.onBudgetClassification?.[key] === 'Partial' ? "bg-blue-100 text-blue-800" : 
                                  "bg-slate-100 text-slate-800"
                                }>
                                  {activity.governmentInputs.onBudgetClassification?.[key] || 'Not specified'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                          
                          <div className="text-center py-4">
                            <Button variant="outline" onClick={handleEdit} className="border-slate-300 text-slate-700 hover:bg-slate-100">
                              Edit Government Inputs
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-slate-200">
                      <CardContent className="text-center py-12">
                        <p className="text-slate-500">No government inputs have been added to this activity yet.</p>
                        <Button variant="outline" className="mt-4 border-slate-300 text-slate-700 hover:bg-slate-100" onClick={handleEdit}>
                          Add Government Inputs
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
} 