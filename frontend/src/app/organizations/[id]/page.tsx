"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Legend, AreaChart, Area } from 'recharts'
import {
  Building2,
  ArrowLeft,
  Globe,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Activity,
  TrendingUp,
  Users,
  Download,
  ExternalLink,
  AlertCircle,
  Languages,
  CreditCard,
  PieChart,
  BarChart3,
  FileIcon,
  Briefcase,
  CalendarDays,
  Target,
  Copy,
  Edit,
  Mail,
  Phone,
  LayoutGrid,
  List,
  Table as TableIcon,
  User,
  MoreVertical,
  Edit2,
  Trash2,
  PencilLine,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  AreaChart as AreaChartIcon
} from 'lucide-react'
import Flag from 'react-world-flags'
import { DocumentThumbnail } from '@/components/ui/document-thumbnail'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ProjectTimeline } from '@/components/organizations/ProjectTimeline'
import { ActivityPortfolioTimeline } from '@/components/organizations/ActivityPortfolioTimeline'
import { GeographicFootprint } from '@/components/organizations/GeographicFootprint'
import { PartnershipNetwork } from '@/components/organizations/PartnershipNetwork'
import { OrganisationHealthCard } from '@/components/organizations/OrganisationHealthCard'
import { CopyableIdentifier } from '@/components/organizations/CopyableIdentifier'
import { SectorAllocationChart } from '@/components/organizations/SectorAllocationChart'
import { OrganizationBudgetsTab } from '@/components/organizations/OrganizationBudgetsTab'
import { OrganizationPlannedDisbursementsTab } from '@/components/organizations/OrganizationPlannedDisbursementsTab'
import { OrganizationTransactionsTab } from '@/components/organizations/OrganizationTransactionsTab'
import { OrganizationSpendTrajectoryChart } from '@/components/organizations/OrganizationSpendTrajectoryChart'
import { TransactionActivityCalendar } from '@/components/analytics/TransactionActivityCalendar'
import { SDGCoverageChart } from '@/components/analytics/sdgs/SDGCoverageChart'
import { SDGConcentrationChart } from '@/components/analytics/sdgs/SDGConcentrationChart'
import { FinanceTypeFlowChart } from '@/components/analytics/FinanceTypeFlowChart'
import { CumulativeFinancialOverview } from '@/components/analytics/CumulativeFinancialOverview'
import { SectorDisbursementOverTime } from '@/components/analytics/SectorDisbursementOverTime'
import { SubnationalAllocationsChart } from '@/components/analytics/national-priorities-dashboard/SubnationalAllocationsChart'
import MyanmarRegionsMap from '@/components/MyanmarRegionsMap'
import { AidPredictabilityChart } from '@/components/analytics/national-priorities-dashboard/AidPredictabilityChart'
import { ExpandableChartCard } from '@/components/analytics/ExpandableChartCard'
import SectorSunburstVisualization from '@/components/charts/SectorSunburstVisualization'
import SectorSankeyVisualization from '@/components/charts/SectorSankeyVisualization'
import ActivityCardModern from '@/components/activities/ActivityCardModern'
import { NativeLikesCounter } from '@/components/ui/native-likes-counter'
import { useEntityLikes } from '@/hooks/use-entity-likes'
import { useUser } from '@/hooks/useUser'
import { useLoadingBar } from '@/hooks/useLoadingBar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getCountryCode } from '@/lib/country-utils'
import { toast } from 'sonner'
import { format } from 'date-fns'

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
  alias_refs?: string[]
  name_aliases?: string[]
  created_at: string
  updated_at: string
  is_active?: boolean
  default_currency?: string
  default_language?: string
  secondary_reporter?: boolean
  active_project_count?: number
  twitter?: string
  facebook?: string
  linkedin?: string
  instagram?: string
  youtube?: string
}

interface Activity {
  id: string
  title: string
  title_narrative?: string
  description?: string
  activity_status: string
  publication_status?: string
  planned_start_date?: string
  planned_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  total_budget?: number
  total_disbursed?: number
  totalPlannedBudgetUSD?: number
  currency?: string
  sectors?: string[]
  acronym?: string
  iati_identifier?: string
  default_modality?: string
  defaultFinanceType?: string
  logo?: string
}

interface Transaction {
  id: string
  transaction_type: string
  transaction_date: string
  value: number
  currency: string
  description?: string
  provider_org_name?: string
  receiver_org_name?: string
  activity_id?: string
  activity_title?: string
}

// Finance type labels mapping (defined at module level for reuse)
const financeTypeLabels: { [key: string]: string } = {
  '110': 'Aid Grant',
  '111': 'Aid Grant (excl. import)',
  '210': 'Standard Grant',
  '211': 'Private Investor Subsidy',
  '220': 'Capital Subscription (Deposit)',
  '230': 'Capital Subscription (Encashment)',
  '310': 'Loan',
  '311': 'Loan (excl. import)',
  '320': 'Joint Venture Loan',
  '410': 'Aid Loan',
  '411': 'Aid Loan (excl. import)',
  '421': 'Standard Loan',
  '422': 'Reimbursable Grant',
  '423': 'Bonds',
  '510': 'Common Equity',
  '520': 'Export Credits',
  '530': 'Foreign Direct Investment'
}

export default function OrganizationProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const id = params?.id as string
  const {
    count: likesCount,
    users: likeUsers,
    isLiked,
    hasMore: hasMoreLikes,
    toggleLike,
    loadMore: loadMoreLikes,
  } = useEntityLikes({
    entityType: 'organization',
    entityId: id,
    userId: user?.id,
  })
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('activities')
  const [activitiesView, setActivitiesView] = useState<'card' | 'table'>('card')
  const [hiddenRoles, setHiddenRoles] = useState<Set<number>>(new Set())
  const [pivotRowDimension, setPivotRowDimension] = useState<'organization' | 'orgType' | 'country' | 'role'>('organization')
  const [pivotColumnDimension, setPivotColumnDimension] = useState<'role' | 'orgType' | 'country'>('role')
  const [pivotValueMetric, setPivotValueMetric] = useState<'activities' | 'organizations'>('activities')
  const [activitiesSortColumn, setActivitiesSortColumn] = useState<'title' | 'status' | 'start' | 'end' | 'budget' | 'disbursed'>('title')
  const [activitiesSortDirection, setActivitiesSortDirection] = useState<'asc' | 'desc'>('asc')
  const [hoveredPoint, setHoveredPoint] = useState<{year: number, count: number, totalValue: number, x: number, y: number} | null>(null)
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [budgetsByYear, setBudgetsByYear] = useState<Array<{ year: number; amount: number }>>([])
  const [plannedDisbursementsByYear, setPlannedDisbursementsByYear] = useState<Array<{ year: number; amount: number }>>([])
  const [disbursementsByYear, setDisbursementsByYear] = useState<Array<{ year: number; disbursements: number; expenditures: number }>>([])
  const [sectorAllocations, setSectorAllocations] = useState<Array<{ code: string; name: string; percentage: number }>>([])
  const [sectorVisualizationTab, setSectorVisualizationTab] = useState<'sankey' | 'sunburst'>('sankey')
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [modalityComposition, setModalityComposition] = useState<Array<{ name: string; value: number; color: string }>>([])
  const [modalityCompositionByCount, setModalityCompositionByCount] = useState<Array<{ name: string; value: number; color: string }>>([])
  const [modalityCompositionByValue, setModalityCompositionByValue] = useState<Array<{ name: string; value: number; color: string }>>([])
  const [timelineView, setTimelineView] = useState<'chart' | 'table'>('chart')
  const [budgetView, setBudgetView] = useState<'chart' | 'table'>('chart')
  const [budgetChartType, setBudgetChartType] = useState<'area' | 'bar'>('area')
  const [budgetVsActualsView, setBudgetVsActualsView] = useState<'chart' | 'table'>('chart')
  const [budgetVsActualsChartType, setBudgetVsActualsChartType] = useState<'bar' | 'area'>('bar')
  const [modalityView, setModalityView] = useState<'chart' | 'table'>('chart')
  const [modalityViewMode, setModalityViewMode] = useState<'value' | 'count'>('value')
  const [contactsView, setContactsView] = useState<'card' | 'table'>('card')
  const [temporalMetadata, setTemporalMetadata] = useState<{
    firstActivityDate: string | null
    mostRecentTransaction: string | null
    lastDataUpdate: string | null
    defaultCurrency: string
  } | null>(null)
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [roleDistribution, setRoleDistribution] = useState<{
    funding: number
    implementing: number
    extending: number
    government: number
  } | null>(null)
  const [roleMetrics, setRoleMetrics] = useState<{
    isFundingOrg: boolean
    totalOutboundFunding?: number
    uniqueImplementingPartners?: number
    disbursementVsCommitmentRate?: number
    totalInboundFunding?: number
    uniqueDonors?: number
    averageActivitySize?: number
  } | null>(null)
  const [healthMetrics, setHealthMetrics] = useState<{
    missingBudgetsPercent: number
    missingPlannedDisbursementsPercent: number
    outdatedDataPercent: number
  } | null>(null)
  const [partnerOrganizations, setPartnerOrganizations] = useState<any[]>([])
  const [activitiesWithPartnerData, setActivitiesWithPartnerData] = useState<any[]>([])
  const [subnationalMapData, setSubnationalMapData] = useState<Record<string, { percentage: number; value: number; activityCount: number; activities: Array<{ id: string; title: string }> }>>({})
  const [organizationDocuments, setOrganizationDocuments] = useState<any[]>([])
  const [activityDocuments, setActivityDocuments] = useState<Array<{activityId: string, activityTitle: string, documents: any[]}>>([])
  const [documentsViewMode, setDocumentsViewMode] = useState<'card' | 'table'>('card')
  const [organizationContacts, setOrganizationContacts] = useState<Array<{
    id: string
    type: string
    title?: string
    firstName: string
    lastName: string
    jobTitle?: string
    department?: string
    email?: string
    phone?: string
    phoneNumber?: string
    countryCode?: string
    website?: string
    mailingAddress?: string
    profilePhoto?: string
    isPrimary?: boolean
  }>>([])

  // Global loading bar for top-of-screen progress indicator
  const { startLoading, stopLoading } = useLoadingBar()

  // Show/hide global loading bar based on loading state
  useEffect(() => {
    if (loading && !organization) {
      startLoading()
    } else {
      stopLoading()
    }
  }, [loading, organization, startLoading, stopLoading])

  // AbortController ref for race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null)

  // Format date helper function
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Not set'
      return format(date, 'dd MMM yyyy')
    } catch {
      return 'Not set'
    }
  }

  // Update modality composition when view mode changes
  useEffect(() => {
    if (modalityViewMode === 'value' && modalityCompositionByValue.length > 0) {
      setModalityComposition(modalityCompositionByValue)
    } else if (modalityViewMode === 'count' && modalityCompositionByCount.length > 0) {
      setModalityComposition(modalityCompositionByCount)
    }
  }, [modalityViewMode, modalityCompositionByValue, modalityCompositionByCount])

  useEffect(() => {
    const fetchOrganizationData = async () => {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController()
      
      // Set loading first to prevent flash of error state
      setLoading(true)
      
      // Reset state when navigating to a different organization
      setOrganization(null)
      setError(null)
      setActivities([])
      setTransactions([])
      
      try {
        
        if (!params?.id) {
          throw new Error('Organization ID is required')
        }

        // Fetch organization details
        const orgResponse = await fetch(`/api/organizations/${params.id}`, {
          signal: abortControllerRef.current.signal
        })
        if (!orgResponse.ok) throw new Error('Failed to fetch organization')
        const orgData = await orgResponse.json()
        setOrganization(orgData)

        // Fetch temporal metadata
        try {
          const temporalResponse = await fetch(`/api/organizations/${params.id}/temporal-metadata`, {
            signal: abortControllerRef.current.signal
          })
          if (temporalResponse.ok) {
            const temporalData = await temporalResponse.json()
            setTemporalMetadata(temporalData)
          }
        } catch (temporalErr) {
          console.warn('Failed to fetch temporal metadata:', temporalErr)
        }

        // Fetch role distribution
        try {
          const roleResponse = await fetch(`/api/organizations/${params.id}/role-distribution`, {
            signal: abortControllerRef.current.signal
          })
          if (roleResponse.ok) {
            const roleData = await roleResponse.json()
            setRoleDistribution(roleData)
            
            // Fetch role metrics after role distribution is loaded
            try {
              const roleMetricsResponse = await fetch(`/api/organizations/${params.id}/role-metrics`, {
                signal: abortControllerRef.current.signal
              })
              if (roleMetricsResponse.ok) {
                const roleMetricsData = await roleMetricsResponse.json()
                setRoleMetrics(roleMetricsData)
              }
            } catch (roleMetricsErr) {
              console.warn('Failed to fetch role metrics:', roleMetricsErr)
            }
          }
        } catch (roleErr) {
          console.warn('Failed to fetch role distribution:', roleErr)
        }

        // Fetch health metrics
        try {
          const healthResponse = await fetch(`/api/organizations/${params.id}/health-metrics`, {
            signal: abortControllerRef.current.signal
          })
          if (healthResponse.ok) {
            const healthData = await healthResponse.json()
            setHealthMetrics(healthData)
          }
        } catch (healthErr) {
          console.warn('Failed to fetch health metrics:', healthErr)
        }

        // Fetch organization documents from the new organization_documents table
        try {
          const orgDocsResponse = await fetch(`/api/organizations/${params.id}/documents`, {
            signal: abortControllerRef.current.signal
          })
          if (orgDocsResponse.ok) {
            const orgDocs = await orgDocsResponse.json()
            // Transform documents to match UI expectations
            const transformedDocs = (orgDocs || []).map((doc: any) => ({
              id: doc.id,
              title: doc.titles?.[0]?.narrative || 'Untitled Document',
              url: doc.url,
              description: doc.descriptions?.[0]?.narrative || '',
              format: doc.format,
              document_date: doc.document_date,
              categories: doc.categories || [],
              languages: doc.languages || ['en'],
            }))
            setOrganizationDocuments(transformedDocs)
          }
        } catch (orgDocsErr) {
          console.warn('Failed to fetch organization documents:', orgDocsErr)
        }

        // Fetch activities with budget data
        try {
          const activitiesResponse = await fetch(`/api/activities?organization_id=${params.id}`, {
            signal: abortControllerRef.current.signal
          })
          if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json()
            
            // Fetch budgets and transactions for each activity
            const activitiesWithBudgets = await Promise.all(
              (activitiesData || []).map(async (activity: Activity) => {
                let totalPlannedBudgetUSD = 0
                let totalDisbursed = 0

                // Fetch budgets
                try {
                  const budgetResponse = await fetch(`/api/activities/${activity.id}/budgets`, {
                    signal: abortControllerRef.current?.signal
                  })

                  if (budgetResponse.ok) {
                    const budgets = await budgetResponse.json()
                    // Sum all budget USD values
                    totalPlannedBudgetUSD = budgets.reduce((sum: number, budget: any) => {
                      // Use usd_value if available, otherwise use value if currency is USD
                      const usdValue = budget.usd_value || (budget.currency === 'USD' ? budget.value : 0)
                      return sum + (usdValue || 0)
                    }, 0)
                  }
                } catch (budgetErr) {
                  console.warn(`Failed to fetch budgets for activity ${activity.id}:`, budgetErr)
                }

                // Fetch transactions to calculate disbursements (exclude linked to show only org's reported data)
                try {
                  const transactionsResponse = await fetch(`/api/activities/${activity.id}/transactions?includeLinked=false`, {
                    signal: abortControllerRef.current?.signal
                  })

                  if (transactionsResponse.ok) {
                    const transactions = await transactionsResponse.json()
                    // Sum disbursement transactions (type 3 = Disbursement)
                    totalDisbursed = (transactions || [])
                      .filter((t: any) => t.transaction_type === '3' || t.transaction_type === 3)
                      .reduce((sum: number, t: any) => {
                        const value = t.usd_value || t.value || 0
                        return sum + value
                      }, 0)
                  }
                } catch (transErr) {
                  console.warn(`Failed to fetch transactions for activity ${activity.id}:`, transErr)
                }

                return {
                  ...activity,
                  totalPlannedBudgetUSD,
                  total_disbursed: totalDisbursed
                }
              })
            )

            setActivities(activitiesWithBudgets)
            
            // Calculate finance type composition from all activities (by count)
            const financeTypeMapByCount = new Map<string, number>()
            // Calculate finance type composition by value
            const financeTypeMapByValue = new Map<string, number>()

            console.log('[OrgProfile] Processing activities for finance types:', activitiesWithBudgets.length)

            for (const activity of activitiesWithBudgets) {
              const financeType = activity.defaultFinanceType
              if (financeType) {
                const label = financeTypeLabels[financeType] || `Type ${financeType}`
                
                // Count by number of activities
                const currentCount = financeTypeMapByCount.get(label) || 0
                financeTypeMapByCount.set(label, currentCount + 1)
                
                // Sum by value (use totalPlannedBudgetUSD or commitments)
                const activityValue = activity.totalPlannedBudgetUSD || activity.total_budget || 0
                const currentValue = financeTypeMapByValue.get(label) || 0
                financeTypeMapByValue.set(label, currentValue + activityValue)
              }
            }

            // Define colors for different finance types (matching Activity Profile)
            const colors = [
              '#4c5568', // slate-600 (primary)
              '#1e40af', // blue-800
              '#3b82f6', // blue-500
              '#0f172a', // slate-900
              '#475569', // slate-600
              '#64748b', // slate-500
              '#334155', // slate-700
              '#94a3b8', // slate-400
              '#0ea5e9', // sky-500
              '#1e3a8a', // blue-900
              '#6366f1'  // indigo-500
            ]

            // Convert to array format for pie chart - by count
            const modalityDataByCount = Array.from(financeTypeMapByCount.entries())
              .map(([name, count], index) => ({
                name,
                value: count,
                color: colors[index % colors.length]
              }))
              .sort((a, b) => b.value - a.value)

            // Convert to array format for pie chart - by value
            const modalityDataByValue = Array.from(financeTypeMapByValue.entries())
              .map(([name, value], index) => ({
                name,
                value: value,
                color: colors[index % colors.length]
              }))
              .sort((a, b) => b.value - a.value)

            setModalityCompositionByCount(modalityDataByCount)
            setModalityCompositionByValue(modalityDataByValue)
            // Default to count view
            setModalityComposition(modalityDataByCount)

            // Fetch documents from activities
            try {
              const activityDocsPromises = activitiesWithBudgets.map(async (activity) => {
                try {
                  const docsResponse = await fetch(`/api/activities/${activity.id}/documents`, {
                    signal: abortControllerRef.current?.signal
                  })
                  if (docsResponse.ok) {
                    const docs = await docsResponse.json()
                    return {
                      activityId: activity.id,
                      activityTitle: activity.title || activity.title_narrative || 'Untitled',
                      documents: Array.isArray(docs) ? docs : (docs.documents || [])
                    }
                  }
                } catch (err) {
                  console.warn(`Failed to fetch documents for activity ${activity.id}:`, err)
                }
                return null
              })
              
              const activityDocsResults = await Promise.all(activityDocsPromises)
              setActivityDocuments(activityDocsResults.filter(result => result !== null && result.documents.length > 0))
            } catch (docsErr) {
              console.warn('Failed to fetch activity documents:', docsErr)
            }

            // Fetch and transform partner data for PartnershipNetwork
            try {
              const partnerOrgIds = new Set<string>()
              const activitiesTransformed = await Promise.all(
                activitiesWithBudgets.map(async (activity) => {
                  try {
                    const participatingOrgsResponse = await fetch(
                      `/api/activities/${activity.id}/participating-organizations`,
                      { signal: abortControllerRef.current?.signal }
                    )
                    if (participatingOrgsResponse.ok) {
                      const participatingOrgs = await participatingOrgsResponse.json()

                      // Group by role type
                      const extendingPartners: Array<{ orgId: string; name: string }> = []
                      const implementingPartners: Array<{ orgId: string; name: string }> = []
                      const governmentPartners: Array<{ orgId: string; name: string }> = []
                      const fundingPartners: Array<{ orgId: string; name: string }> = []

                      // Also build participatingOrgs array for Partnerships tab
                      const participatingOrgsFormatted: Array<{
                        org_id: string;
                        role: string;
                        narrative: string;
                        acronym?: string;
                        logo?: string;
                        org_type?: string;
                        country?: string;
                        iati_org_id?: string;
                        org_name?: string;
                      }> = []

                      participatingOrgs.forEach((po: any) => {
                        if (po.organization_id && po.organization_id !== params.id) {
                          partnerOrgIds.add(po.organization_id)
                          const partnerData = {
                            orgId: po.organization_id,
                            name: po.organization?.name || po.narrative || 'Unknown'
                          }

                          if (po.role_type === 'extending') extendingPartners.push(partnerData)
                          else if (po.role_type === 'implementing') implementingPartners.push(partnerData)
                          else if (po.role_type === 'government') governmentPartners.push(partnerData)
                          else if (po.role_type === 'funding') fundingPartners.push(partnerData)

                          // Map role_type to IATI role code for Partnerships tab
                          const roleCode =
                            po.role_type === 'funding' ? '1' :
                            po.role_type === 'accountable' ? '2' :
                            po.role_type === 'extending' ? '3' :
                            po.role_type === 'implementing' ? '4' :
                            po.iati_role_code?.toString() || '4'

                          participatingOrgsFormatted.push({
                            org_id: po.organization_id,
                            role: roleCode,
                            narrative: po.narrative || po.organization?.name || 'Unknown',
                            acronym: po.organization?.acronym,
                            logo: po.organization?.logo,
                            org_type: po.organization?.org_type,
                            country: po.organization?.country,
                            iati_org_id: po.organization?.iati_org_id,
                            org_name: po.organization?.name,
                          })
                        }
                      })

                      return {
                        id: activity.id,
                        title: activity.title || activity.title_narrative || 'Untitled',
                        activity_status: activity.activity_status || '1',
                        extendingPartners,
                        implementingPartners,
                        governmentPartners,
                        fundingPartners,
                        participatingOrgs: participatingOrgsFormatted
                      }
                    }
                  } catch (err) {
                    console.warn(`Failed to fetch participating orgs for activity ${activity.id}:`, err)
                  }
                  
                  // Fallback if fetch fails
                  return {
                    id: activity.id,
                    title: activity.title || activity.title_narrative || 'Untitled',
                    activity_status: activity.activity_status || '1',
                    extendingPartners: [],
                    implementingPartners: [],
                    governmentPartners: [],
                    fundingPartners: [],
                    participatingOrgs: []
                  }
                })
              )

              setActivitiesWithPartnerData(activitiesTransformed.filter(a => a !== null))

              // Fetch organization details for all partner IDs
              if (partnerOrgIds.size > 0) {
                const partnerOrgIdsArray = Array.from(partnerOrgIds)
                const partnerOrgDetails = await Promise.all(
                  partnerOrgIdsArray.map(async (orgId) => {
                    try {
                      const orgResponse = await fetch(`/api/organizations/${orgId}`, {
                        signal: abortControllerRef.current?.signal
                      })
                      if (orgResponse.ok) {
                        return await orgResponse.json()
                      }
                    } catch (err) {
                      console.warn(`Failed to fetch org ${orgId}:`, err)
                    }
                    return null
                  })
                )
                setPartnerOrganizations(partnerOrgDetails.filter(org => org !== null))
              }
            } catch (partnerErr) {
              console.warn('Failed to fetch partner organizations:', partnerErr)
            }
            
            // Calculate budgets by year from published activities where org is reporting org
            const budgetsByYearMap = new Map<number, number>()

            for (const activity of activitiesWithBudgets) {
              // Only include budgets from published activities
              if (activity.publication_status !== 'published') continue

              try {
                const budgetResponse = await fetch(`/api/activities/${activity.id}/budgets`, {
                  signal: abortControllerRef.current?.signal
                })

                if (budgetResponse.ok) {
                  const budgets = await budgetResponse.json()

                  for (const budget of budgets) {
                    if (!budget.value || !budget.currency) continue

                    // Extract year from period_start
                    let year = new Date().getFullYear()
                    if (budget.period_start) {
                      year = new Date(budget.period_start).getFullYear()
                    }

                    // Use usd_value if available, otherwise use value if currency is USD
                    const usdValue = budget.usd_value || (budget.currency === 'USD' ? budget.value : 0)

                    if (usdValue) {
                      const currentAmount = budgetsByYearMap.get(year) || 0
                      budgetsByYearMap.set(year, currentAmount + usdValue)
                    }
                  }
                }
              } catch (budgetErr) {
                console.warn(`Failed to fetch budgets for year calculation for activity ${activity.id}:`, budgetErr)
              }
            }

            // Convert map to array and sort by year
            const budgetsByYearArray = Array.from(budgetsByYearMap.entries())
              .map(([year, amount]) => ({ year, amount }))
              .sort((a, b) => a.year - b.year)

            setBudgetsByYear(budgetsByYearArray)
            
            // Fetch and aggregate sector allocations for all published activities
            const sectorMap = new Map<string, { code: string; name: string; totalPercentage: number; activityCount: number }>()
            
            console.log(`[OrgProfile] Processing sectors for ${activitiesWithBudgets.length} activities`)
            
            for (const activity of activitiesWithBudgets) {
              // Include all activities (not just published) for now to see if we have any sector data
              // TODO: Filter by publication_status once we confirm data exists
              // if (activity.publication_status !== 'published') continue
              
              try {
                const sectorsResponse = await fetch(`/api/activities/${activity.id}/sectors`, {
                  signal: abortControllerRef.current?.signal
                })
                
                if (sectorsResponse.ok) {
                  const data = await sectorsResponse.json()
                  const sectors = data.sectors || data // Handle both wrapped and unwrapped responses
                  
                  console.log(`[OrgProfile] Fetched ${sectors.length} sectors for activity ${activity.id}`)
                  
                  for (const sector of sectors) {
                    // sector_code is the field name from the API
                    const code = sector.sector_code || sector.code
                    const name = sector.sector_narrative || sector.sector_name || sector.name || code
                    const percentage = sector.percentage || 0
                    
                    if (!code || !percentage) continue
                    
                    if (!sectorMap.has(code)) {
                      sectorMap.set(code, {
                        code: code,
                        name: name,
                        totalPercentage: 0,
                        activityCount: 0
                      })
                    }
                    
                    const existing = sectorMap.get(code)!
                    existing.totalPercentage += percentage
                    existing.activityCount += 1
                  }
                }
              } catch (sectorErr) {
                if (sectorErr instanceof Error && sectorErr.name === 'AbortError') {
                  console.log('[OrgProfile] Sectors request aborted')
                  return
                }
                console.warn(`Failed to fetch sectors for activity ${activity.id}:`, sectorErr)
              }
            }
            
            // Convert to array and calculate average percentages
            const aggregatedSectors = Array.from(sectorMap.values())
              .map(sector => ({
                code: sector.code,
                name: sector.name,
                percentage: sector.totalPercentage / sector.activityCount // Average percentage across activities
              }))
              .sort((a, b) => b.percentage - a.percentage) // Sort by percentage descending
            
            console.log(`[OrgProfile] Aggregated ${aggregatedSectors.length} unique sectors from ${sectorMap.size} entries`)
            setSectorAllocations(aggregatedSectors)
            
            // Fetch planned disbursements from all activities
            const plannedDisbursementsByYearMap = new Map<number, number>()
            
            console.log(`[OrgProfile] Fetching planned disbursements for ${activitiesWithBudgets.length} activities`)
            
            for (const activity of activitiesWithBudgets) {
              try {
                const pdResponse = await fetch(`/api/activities/${activity.id}/planned-disbursements`, {
                  signal: abortControllerRef.current?.signal
                })
                
                if (pdResponse.ok) {
                  const plannedDisbursements = await pdResponse.json()
                  const activityTitle = activity.title || activity.title_narrative || 'Untitled'
                  console.log(`[OrgProfile] Activity ${activity.id} (${activityTitle}) has ${plannedDisbursements.length} planned disbursements`)
                  
                  if (plannedDisbursements.length > 0) {
                    console.log(`[OrgProfile] Sample planned disbursement:`, plannedDisbursements[0])
                  }
                  
                  for (const pd of plannedDisbursements) {
                    if (!pd.period_start) {
                      console.warn(`[OrgProfile] Planned disbursement missing period_start:`, pd)
                      continue
                    }
                    
                    // Try different field names for the USD amount
                    const usdAmount = pd.usd_value || pd.value_usd || pd.usd_amount || pd.amount
                    
                    if (!usdAmount) {
                      console.warn(`[OrgProfile] Planned disbursement missing USD amount:`, pd)
                      continue
                    }
                    
                    const year = new Date(pd.period_start).getFullYear()
                    const currentAmount = plannedDisbursementsByYearMap.get(year) || 0
                    plannedDisbursementsByYearMap.set(year, currentAmount + usdAmount)
                    
                    console.log(`[OrgProfile] Added planned disbursement: Year ${year}, Amount ${usdAmount}`)
                  }
                }
              } catch (pdErr) {
                if (pdErr instanceof Error && pdErr.name === 'AbortError') {
                  console.log('[OrgProfile] Planned disbursements request aborted')
                  return
                }
                console.warn(`Failed to fetch planned disbursements for activity ${activity.id}:`, pdErr)
              }
            }
            
            // Convert planned disbursements to array
            const plannedDisbursementsArray = Array.from(plannedDisbursementsByYearMap.entries())
              .map(([year, amount]) => ({ year, amount }))
              .sort((a, b) => a.year - b.year)
            
            console.log(`[OrgProfile] Planned disbursements by year:`, plannedDisbursementsArray)
            setPlannedDisbursementsByYear(plannedDisbursementsArray)

            try {
              // Fetch transactions from all activities
              const allTransactions: any[] = []
              const disbursementsByYearMap = new Map<number, { disbursements: number; expenditures: number }>()

              console.log(`[OrgProfile] Fetching transactions for ${activitiesWithBudgets.length} activities`)

              for (const activity of activitiesWithBudgets) {
                try {
                  // Exclude linked transactions to show only org's directly reported data
                  const txnResponse = await fetch(`/api/activities/${activity.id}/transactions?includeLinked=false`, {
                    signal: abortControllerRef.current?.signal
                  })

                  if (txnResponse.ok) {
                    const activityTransactions = await txnResponse.json()
                    console.log(`[OrgProfile] Activity ${activity.id} has ${activityTransactions.length} transactions`)
                    // Add activity info to each transaction
                    const transactionsWithActivity = activityTransactions.map((txn: any) => ({
                      ...txn,
                      activity_id: activity.id,
                      activity_title: activity.title || activity.title_narrative
                    }))
                    allTransactions.push(...transactionsWithActivity)

                    // Aggregate disbursements and expenditures by year
                    for (const txn of activityTransactions) {
                      if (!txn.transaction_date || !txn.value) continue

                      const year = new Date(txn.transaction_date).getFullYear()

                      if (!disbursementsByYearMap.has(year)) {
                        disbursementsByYearMap.set(year, { disbursements: 0, expenditures: 0 })
                      }

                      const yearData = disbursementsByYearMap.get(year)!

                      // Type 3 = Disbursement, Type 4 = Expenditure
                      // Use value_usd for consistency, fallback to value if USD or 0
                      const usdValue = txn.value_usd || (txn.currency === 'USD' ? txn.value : 0)
                      if (txn.transaction_type === '3') {
                        console.log(`[OrgProfile] Found disbursement: Year ${year}, Amount USD ${usdValue}`)
                        yearData.disbursements += usdValue
                      } else if (txn.transaction_type === '4') {
                        console.log(`[OrgProfile] Found expenditure: Year ${year}, Amount USD ${usdValue}`)
                        yearData.expenditures += usdValue
                      }
                    }
                  }
                } catch (txnErr) {
                  if (txnErr instanceof Error && txnErr.name === 'AbortError') {
                    console.log('[OrgProfile] Transactions request aborted')
                    return
                  }
                  console.warn(`Failed to fetch transactions for activity ${activity.id}:`, txnErr)
                }
              }

              console.log(`[OrgProfile] Total transactions fetched: ${allTransactions.length}`)
              console.log(`[OrgProfile] Disbursements by year:`, Array.from(disbursementsByYearMap.entries()))

              setTransactions(allTransactions)

              // Convert to array and sort by year
              const disbursementsArray = Array.from(disbursementsByYearMap.entries())
                .map(([year, data]) => ({
                  year,
                  disbursements: data.disbursements,
                  expenditures: data.expenditures
                }))
                .sort((a, b) => a.year - b.year)

              setDisbursementsByYear(disbursementsArray)
            } catch (err) {
              if (err instanceof Error && err.name === 'AbortError') {
                console.log('[OrgProfile] Transactions request aborted')
                return
              }
              console.warn('Failed to fetch transactions:', err)
            }

            // Fetch subnational allocation data for map
            try {
              const subnationalResponse = await fetch(`/api/analytics/dashboard?measure=disbursements&organizationId=${params.id}`, {
                signal: abortControllerRef.current?.signal
              })
              if (subnationalResponse.ok) {
                const subnationalResult = await subnationalResponse.json()
                if (subnationalResult.success && subnationalResult.data?.topDistricts) {
                  const grandTotal = subnationalResult.data.grandTotal || 0
                  const breakdowns: Record<string, { percentage: number; value: number; activityCount: number }> = {}
                  subnationalResult.data.topDistricts.forEach((district: { name: string; value: number; activityCount?: number }) => {
                    breakdowns[district.name] = {
                      percentage: grandTotal > 0 ? (district.value / grandTotal) * 100 : 0,
                      value: district.value,
                      activityCount: district.activityCount || 0
                    }
                  })
                  setSubnationalMapData(breakdowns)
                }
              }
            } catch (err) {
              console.warn('Failed to fetch subnational map data:', err)
            }

          }
        } catch (activitiesErr) {
          if (activitiesErr instanceof Error && activitiesErr.name === 'AbortError') {
            console.log('[OrgProfile] Activities request aborted')
            return
          }
          console.warn('Failed to fetch activities:', activitiesErr)
        }

        // Fetch organization contacts
        try {
          const contactsResponse = await fetch(`/api/organizations/${params.id}/contacts`, {
            signal: abortControllerRef.current.signal
          })
          if (contactsResponse.ok) {
            const contactsData = await contactsResponse.json()
            setOrganizationContacts(contactsData || [])
          }
        } catch (contactsErr) {
          console.warn('Failed to fetch organization contacts:', contactsErr)
        }

      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[OrgProfile] Main request aborted')
          return
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch organization data')
      } finally {
        setLoading(false)
      }
    }

    if (params?.id) {
      fetchOrganizationData()
    }
    
    // Cleanup function to abort requests on unmount or param change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [params?.id])

  const getTypeColor = (type: string) => {
    // Monochrome color scheme
    return 'bg-slate-100 text-slate-800 border-slate-200'
  }

  const getActivityStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      '1': 'Pipeline/Identification',
      '2': 'Implementation',
      '3': 'Finalisation',
      '4': 'Closed',
      '5': 'Cancelled',
      '6': 'Suspended'
    }
    return statusMap[status] || status
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format currency in short form with one decimal: 10308 -> $10.3k, 10308000 -> $10.3M
  const formatCurrencyShort = (value: number): string => {
    if (value === null || value === undefined || isNaN(value)) return '$0.0';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}$${(value / 1_000).toFixed(1)}k`;
    return `${sign}$${value.toFixed(1)}`;
  }

  // Format currency for Y-axis ticks (whole numbers): 50000000 -> $50m, 5000 -> $5k
  const formatAxisTick = (value: number): string => {
    if (value === null || value === undefined || isNaN(value)) return '$0';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return `${sign}$${Math.round(value / 1_000_000_000)}b`;
    if (abs >= 1_000_000) return `${sign}$${Math.round(value / 1_000_000)}m`;
    if (abs >= 1_000) return `${sign}$${Math.round(value / 1_000)}k`;
    return `${sign}$${Math.round(value)}`;
  }

  const calculateTotals = () => {
    // Defensive check to ensure transactions is defined
    const safeTransactions = transactions || [];
    const safeActivities = activities || [];
    
    // Calculate total portfolio value (commitments) - transaction types '1' and '2'
    const totalPortfolioValue = safeTransactions
      .filter(txn => ['1', '2'].includes(txn.transaction_type))
      .reduce((sum, txn) => sum + (txn.value || 0), 0)
    
    // Calculate budget from activity budgets (activity_budgets table) - only for published activities
    const budgetFromActivities = safeActivities
      .filter(activity => activity.publication_status === 'published')
      .reduce((sum, activity) => sum + (activity.totalPlannedBudgetUSD || 0), 0)
    
    // Use portfolio value (commitments) as primary, fall back to activity budgets if no commitments
    const totalBudget = totalPortfolioValue > 0 ? totalPortfolioValue : budgetFromActivities
    
    // Calculate total planned disbursements from plannedDisbursementsByYear
    const totalPlannedDisbursements = plannedDisbursementsByYear.reduce((sum, item) => sum + item.amount, 0)
    
    // Calculate actual disbursements (type '3')
    const totalDisbursements = safeTransactions
      .filter(txn => txn.transaction_type === '3')
      .reduce((sum, txn) => sum + (txn.value_usd || (txn.currency === 'USD' ? txn.value : 0)), 0)

    // Calculate actual expenditures (type '4')
    const totalExpenditures = safeTransactions
      .filter(txn => txn.transaction_type === '4')
      .reduce((sum, txn) => sum + (txn.value_usd || (txn.currency === 'USD' ? txn.value : 0)), 0)

    const totalTransactions = safeTransactions.reduce((sum, txn) => sum + (txn.value_usd || (txn.currency === 'USD' ? txn.value : 0)), 0)
    
    return {
      totalBudget,
      totalPortfolioValue,
      totalPlannedDisbursements,
      totalDisbursements,
      totalExpenditures,
      totalTransactions,
      activeActivities: safeActivities.filter(a => ['2', '3'].includes(a.activity_status)).length, // 2=Implementation, 3=Finalisation
      totalActivities: safeActivities.length
    }
  }

  const calculateActiveProjectsByYear = () => {
    const years = [2020, 2021, 2022, 2023, 2024, 2025]
    const projectsByYear: Record<number, { count: number; totalValue: number }> = {}
    
    // Initialize years
    years.forEach(year => {
      projectsByYear[year] = { count: 0, totalValue: 0 }
    })
    
    // Process each activity
    activities.forEach(activity => {
      // Get activity dates (use actual if available, otherwise planned)
      const startDate = activity.actual_start_date || activity.planned_start_date
      const endDate = activity.actual_end_date || activity.planned_end_date
      
      if (!startDate) return
      
      const startYear = new Date(startDate).getFullYear()
      const endYear = endDate ? new Date(endDate).getFullYear() : new Date().getFullYear()
      
      // Get activity value (use totalPlannedBudgetUSD or total_budget or 0)
      const activityValue = activity.totalPlannedBudgetUSD || activity.total_budget || 0
      
      // Determine which years this activity was active
      years.forEach(year => {
        if (year >= startYear && year <= endYear) {
          // Activity was active in this year
          projectsByYear[year].count++
          // Distribute value evenly across years activity was active
          const yearsActive = endYear - startYear + 1
          projectsByYear[year].totalValue += activityValue / yearsActive
        }
      })
    })
    
    return projectsByYear
  }

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header.toLowerCase().replace(/ /g, '_')]
        return typeof value === 'number' ? value : `"${value}"`
      }).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Show loading skeleton while fetching OR if organization is null (during navigation)
  if (loading || !organization) {
    // Only show error if we're definitely not loading and there's an actual error
    if (!loading && error) {
      return (
        <MainLayout>
          <div className="min-h-screen flex items-center justify-center">
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Organization Not Found</h3>
                  <p className="text-slate-600 mb-4">
                    {error || 'The organization you are looking for could not be found.'}
                  </p>
                  <Button onClick={() => router.push('/organizations')} className="bg-slate-600 hover:bg-slate-700">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Organizations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </MainLayout>
      )
    }
    
    // Show loading skeleton
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

  const totals = calculateTotals()

  // Calculate year-over-year comparison stats
  const yoyStats = (() => {
    const currentYear = new Date().getFullYear()

    // Commitments (from budgetsByYear)
    const currentYearCommitments = budgetsByYear.find(b => b.year === currentYear)?.amount || 0
    const totalLastYearCommitments = budgetsByYear
      .filter(b => b.year < currentYear)
      .reduce((sum, b) => sum + b.amount, 0)
    const commitmentChange = (totals.totalPortfolioValue || 0) - totalLastYearCommitments

    // Disbursements (from disbursementsByYear)
    const currentYearDisbursements = disbursementsByYear.find(d => d.year === currentYear)?.disbursements || 0
    const totalLastYearDisbursements = disbursementsByYear
      .filter(d => d.year < currentYear)
      .reduce((sum, d) => sum + d.disbursements, 0)
    const disbursementChange = totals.totalDisbursements - totalLastYearDisbursements

    // Expenditures (from disbursementsByYear)
    const currentYearExpenditures = disbursementsByYear.find(d => d.year === currentYear)?.expenditures || 0
    const totalLastYearExpenditures = disbursementsByYear
      .filter(d => d.year < currentYear)
      .reduce((sum, d) => sum + d.expenditures, 0)
    const expenditureChange = totals.totalExpenditures - totalLastYearExpenditures

    // % Disbursed change
    const currentDisbursedPercent = totals.totalPortfolioValue > 0
      ? (totals.totalDisbursements / totals.totalPortfolioValue) * 100
      : 0
    const lastYearDisbursedPercent = totalLastYearCommitments > 0
      ? (totalLastYearDisbursements / totalLastYearCommitments) * 100
      : 0
    const disbursedPercentChange = currentDisbursedPercent - lastYearDisbursedPercent

    // Activities count
    const activitiesCount = activities?.length || 0

    return {
      currentYearCommitments,
      commitmentChange,
      currentYearDisbursements,
      disbursementChange,
      currentYearExpenditures,
      expenditureChange,
      disbursedPercentChange,
      activitiesCount,
    }
  })()

  // Type guard - organization is guaranteed to be non-null here due to earlier checks
  if (!organization) return null

  const handleEditActivity = (activityId: string) => {
    router.push(`/activities/new?id=${activityId}`)
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!activityId) return
    
    // Get activity title for better feedback
    const activity = activities.find(a => a.id === activityId)
    const activityTitle = activity?.title || 'Activity'
    
    setIsDeleting(true)
    try {
      const response = await fetch('/api/activities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: activityId,
          // Note: We don't have user context here, but the API should handle this gracefully
        }),
      })
      
      if (response.ok) {
        // Remove the activity from the local state
        setActivities(prev => prev.filter(activity => activity.id !== activityId))
        setDeleteActivityId(null)
        toast.success(`"${activityTitle}" was deleted successfully`)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to delete activity:', errorData.error)
        toast.error(`Failed to delete "${activityTitle}": ${errorData.error || 'Unknown error'}`)
        // Don't close the modal on error so user can try again
      }
    } catch (error) {
      console.error('Error deleting activity:', error)
      toast.error(`Failed to delete "${activityTitle}": Network error`)
      // Don't close the modal on error so user can try again
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/organizations')}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organizations
            </Button>
            
            <div className="flex gap-2 items-center">
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100">
                <Download className="h-4 w-4 mr-2" />
                Export Profile
              </Button>
              <NativeLikesCounter
                count={likesCount}
                users={likeUsers}
                variant="outline"
                size="default"
                liked={isLiked}
                onLike={toggleLike}
                onLoadMore={loadMoreLikes}
                hasMore={hasMoreLikes}
              />
              <Link href={`/organizations/${id}/edit`}>
                <Button className="bg-slate-600 hover:bg-slate-700">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Organization
                </Button>
              </Link>
            </div>
          </div>

          {/* Organization Header Card */}
          <Card className="mb-6 border-0 shadow-none overflow-hidden">
            {/* Banner Image */}
            {organization.banner && (
              <div className="w-full h-48 overflow-hidden">
                <img 
                  src={organization.banner} 
                  alt={`${organization.name} banner`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Logo and Organization Info - Columns 1-3 */}
                <div className="lg:col-span-3">
                  <div className="flex items-start justify-start gap-4">
                    {/* Logo */}
                    {organization.logo && (
                      <div className="flex-shrink-0">
                        <img
                          src={organization.logo}
                          alt={`${organization.name} logo`}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      </div>
                    )}

                    {/* Organization Info */}
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        {organization.name}
                        {organization.acronym && <span className="text-3xl font-bold text-slate-900"> ({organization.acronym})</span>}
                      </h1>

                      {/* Badges Row */}
                      <div className="flex flex-col gap-2 mb-3 pt-3 border-t border-slate-200">
                        <div className="flex flex-wrap items-center gap-2">
                          {organization.iati_org_id && (
                            <CopyableIdentifier value={organization.iati_org_id} />
                          )}
                          {organization.country && (
                            <Badge variant="outline" className="border-slate-300 text-slate-700 flex items-center gap-1.5">
                              {getCountryCode(organization.country) && (
                                <Flag
                                  code={getCountryCode(organization.country)!}
                                  style={{ width: '16px', height: '12px' }}
                                />
                              )}
                              <span className="text-xs">{organization.country}</span>
                            </Badge>
                          )}
                          <Badge className={getTypeColor(organization.organisation_type)}>
                            {organization.organisation_type}
                          </Badge>
                          {organization.iati_org_id && (
                            <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
                              Reporting to IATI
                            </Badge>
                          )}
                          {organization.secondary_reporter !== undefined && (
                            <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">
                              {organization.secondary_reporter ? 'Secondary reporter' : 'Primary publisher'}
                            </Badge>
                          )}
                        </div>
                        <div className="border-b border-slate-200 mt-2"></div>
                      </div>

                      {/* Activity Stats Bar */}
                      {activities.length > 0 && (
                        <div className="mb-3">
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                          {(() => {
                            // Calculate first activity date (earliest start date)
                            const firstActivityDate = activities
                              .map(a => a.actual_start_date || a.planned_start_date)
                              .filter(Boolean)
                              .sort()[0];

                            // Calculate most recent transaction date
                            const allTransactionDates = activities
                              .flatMap(a => (a.transactions || []).map(t => t.transaction_date))
                              .filter(Boolean)
                              .sort()
                              .reverse();
                            const mostRecentTransactionDate = allTransactionDates[0];

                            // Calculate last data update (most recent updated_at)
                            const lastDataUpdate = activities
                              .map(a => a.updated_at)
                              .filter(Boolean)
                              .sort()
                              .reverse()[0];

                            return (
                              <>
                                {firstActivityDate && (
                                  <div>
                                    <span className="text-slate-500">First activity:</span>{' '}
                                    <span className="text-slate-900 font-medium">{formatDate(firstActivityDate)}</span>
                                  </div>
                                )}
                                {mostRecentTransactionDate && (
                                  <div>
                                    <span className="text-slate-500">Most recent transaction:</span>{' '}
                                    <span className="text-slate-900 font-medium">{formatDate(mostRecentTransactionDate)}</span>
                                  </div>
                                )}
                                {lastDataUpdate && (
                                  <div>
                                    <span className="text-slate-500">Last data update:</span>{' '}
                                    <span className="text-slate-900 font-medium">{formatDate(lastDataUpdate)}</span>
                                  </div>
                                )}
                                {organization.default_currency && (
                                  <div>
                                    <span className="text-slate-500">Default currency:</span>{' '}
                                    <span className="text-slate-900 font-medium">{organization.default_currency}</span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div className="border-b border-slate-200 mt-3"></div>
                        </div>
                      )}

                      {organization.description && (
                        <div className="mt-3">
                          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {isDescriptionExpanded 
                              ? organization.description 
                              : organization.description.length > 700
                                ? organization.description.slice(0, 700) + '...'
                                : organization.description
                            }
                          </p>
                          {organization.description.length > 700 && (
                            <button
                              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
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
                      )}
                      
                      {/* Aliases Section */}
                      {((organization.alias_refs && organization.alias_refs.length > 0) || 
                        (organization.name_aliases && organization.name_aliases.length > 0)) && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="space-y-2">
                            {organization.alias_refs && organization.alias_refs.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">Legacy Codes:</p>
                                <div className="flex flex-wrap gap-1">
                                  {organization.alias_refs.map((ref, idx) => (
                                    <code key={idx} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-mono border border-blue-200">
                                      {ref}
                                    </code>
                                  ))}
                                </div>
                              </div>
                            )}
                            {organization.name_aliases && organization.name_aliases.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">Alternate Names:</p>
                                <div className="flex flex-wrap gap-1">
                                  {organization.name_aliases.map((name, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs border-slate-300 text-slate-700">
                                      {name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-slate-400 italic mt-2">
                              Used for matching in IATI imports
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>

                {/* Contact & Metadata Card - Column 4 */}
                <div className="lg:col-span-1 self-start">
                  <Card className="border-slate-200 bg-white">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                      {/* Contact Information - Always Visible */}
                      {(organization.website || organization.email || organization.phone || organization.address) && (
                        <>
                          <p className="text-xs font-semibold text-slate-900">Contact</p>
                          <div className="space-y-2">
                            {organization.website && (
                              <a
                                href={organization.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                              >
                                <Globe className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">Website</span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                            )}
                            {organization.email && (
                              <a
                                href={`mailto:${organization.email}`}
                                className="flex items-start gap-2 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                              >
                                <Mail className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                <span className="break-all">{organization.email}</span>
                              </a>
                            )}
                            {organization.phone && (
                              <a
                                href={`tel:${organization.phone}`}
                                className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                              >
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                <span>{organization.phone}</span>
                              </a>
                            )}
                            {organization.address && (
                              <div className="flex items-start gap-2 text-xs text-slate-600">
                                <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                <span>{organization.address}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Social Media Links */}
                      {(organization.twitter || organization.facebook || organization.linkedin || organization.instagram || organization.youtube) && (
                        <div className="pt-3 border-t border-slate-200">
                          <div className="flex flex-wrap gap-2">
                            {organization.twitter && (
                              <a
                                href={organization.twitter.startsWith('http') ? organization.twitter : `https://twitter.com/${organization.twitter}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-10 h-10 rounded-md bg-transparent border border-border text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
                                title="X"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                              </a>
                            )}
                            {organization.facebook && (
                              <a
                                href={organization.facebook.startsWith('http') ? organization.facebook : `https://facebook.com/${organization.facebook}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-10 h-10 rounded-md bg-transparent border border-border text-slate-500 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                                title="Facebook"
                              >
                                <Facebook className="h-4 w-4" />
                              </a>
                            )}
                            {organization.linkedin && (
                              <a
                                href={organization.linkedin.startsWith('http') ? organization.linkedin : `https://linkedin.com/company/${organization.linkedin}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-10 h-10 rounded-md bg-transparent border border-border text-slate-500 hover:bg-blue-700 hover:text-white hover:border-blue-700 transition-colors"
                                title="LinkedIn"
                              >
                                <Linkedin className="h-4 w-4" />
                              </a>
                            )}
                            {organization.instagram && (
                              <a
                                href={organization.instagram.startsWith('http') ? organization.instagram : `https://instagram.com/${organization.instagram}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-10 h-10 rounded-md bg-transparent border border-border text-slate-500 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-600 hover:text-white hover:border-purple-600 transition-colors"
                                title="Instagram"
                              >
                                <Instagram className="h-4 w-4" />
                              </a>
                            )}
                            {organization.youtube && (
                              <a
                                href={organization.youtube.startsWith('http') ? organization.youtube : `https://youtube.com/${organization.youtube}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-10 h-10 rounded-md bg-transparent border border-border text-slate-500 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
                                title="YouTube"
                              >
                                <Youtube className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary Cards - Single Row */}
          <div className="flex flex-wrap lg:flex-nowrap gap-4 mb-8">
            {/* Activities */}
            <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-600 truncate">Activities</p>
              <p className="text-2xl font-bold text-slate-900">{totals.activeActivities} <span className="text-sm font-normal text-slate-500">Active</span></p>
              <div className="text-xs text-slate-500">
                <p>{totals.pipelineActivities || 0} Pipeline/Identification</p>
                <p>{totals.closedActivities || 0} Closed/Suspended</p>
              </div>
            </div>

            {/* Total Committed */}
            <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
              <p className="text-xs font-medium text-slate-600 truncate">Total Committed</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrencyShort(totals.totalPortfolioValue || totals.totalBudget)}
              </p>
              <div className="text-xs text-slate-500">
                <p className="flex items-center gap-1">
                  {yoyStats.commitmentChange >= 0 ? (
                    <svg className="w-2.5 h-2.5" style={{ color: '#4C5568' }} fill="currentColor" viewBox="0 0 10 10"><polygon points="5,0 10,10 0,10" /></svg>
                  ) : (
                    <svg className="w-2.5 h-2.5" style={{ color: '#DC2625' }} fill="currentColor" viewBox="0 0 10 10"><polygon points="0,0 10,0 5,10" /></svg>
                  )}
                  <span>{yoyStats.commitmentChange >= 0 ? '+' : ''}{formatCurrencyShort(yoyStats.commitmentChange)} vs last year</span>
                </p>
                <p>{formatCurrencyShort(yoyStats.currentYearCommitments)} committed this year</p>
              </div>
            </div>

            {/* Total Disbursed */}
            <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
              <p className="text-xs font-medium text-slate-600 truncate">Total Disbursed</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrencyShort(totals.totalDisbursements)}
              </p>
              <div className="text-xs text-slate-500">
                <p className="flex items-center gap-1">
                  {yoyStats.disbursementChange >= 0 ? (
                    <svg className="w-2.5 h-2.5" style={{ color: '#4C5568' }} fill="currentColor" viewBox="0 0 10 10"><polygon points="5,0 10,10 0,10" /></svg>
                  ) : (
                    <svg className="w-2.5 h-2.5" style={{ color: '#DC2625' }} fill="currentColor" viewBox="0 0 10 10"><polygon points="0,0 10,0 5,10" /></svg>
                  )}
                  <span>{yoyStats.disbursementChange >= 0 ? '+' : ''}{formatCurrencyShort(yoyStats.disbursementChange)} vs last year</span>
                </p>
                <p>{formatCurrencyShort(yoyStats.currentYearDisbursements)} disbursed this year</p>
              </div>
            </div>

            {/* % Disbursed - calculated from totals */}
            <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
              <p className="text-xs font-medium text-slate-600 truncate">% Disbursed</p>
              <p className="text-3xl font-bold text-slate-900">
                {(() => {
                  const committed = totals.totalPortfolioValue || totals.totalBudget || 0
                  const disbursed = totals.totalDisbursements || 0
                  if (committed === 0) return '0.0'
                  return ((disbursed / committed) * 100).toFixed(1)
                })()}%
              </p>
              <div className="text-xs text-slate-500">
                <p className="flex items-center gap-1">
                  {yoyStats.disbursedPercentChange >= 0 ? (
                    <svg className="w-2.5 h-2.5" style={{ color: '#4C5568' }} fill="currentColor" viewBox="0 0 10 10"><polygon points="5,0 10,10 0,10" /></svg>
                  ) : (
                    <svg className="w-2.5 h-2.5" style={{ color: '#DC2625' }} fill="currentColor" viewBox="0 0 10 10"><polygon points="0,0 10,0 5,10" /></svg>
                  )}
                  <span>{yoyStats.disbursedPercentChange >= 0 ? '+' : ''}{yoyStats.disbursedPercentChange.toFixed(1)}pp vs last year</span>
                </p>
                <p>{totals.totalDisbursements > 0 ? ((totals.totalExpenditures / totals.totalDisbursements) * 100).toFixed(0) : 0}% disbursement ratio</p>
              </div>
            </div>

            {/* Total Expended */}
            <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
              <p className="text-xs font-medium text-slate-600 truncate">Total Expended</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrencyShort(totals.totalExpenditures)}
              </p>
              <div className="text-xs text-slate-500">
                <p className="flex items-center gap-1">
                  {yoyStats.expenditureChange >= 0 ? (
                    <svg className="w-2.5 h-2.5" style={{ color: '#4C5568' }} fill="currentColor" viewBox="0 0 10 10"><polygon points="5,0 10,10 0,10" /></svg>
                  ) : (
                    <svg className="w-2.5 h-2.5" style={{ color: '#DC2625' }} fill="currentColor" viewBox="0 0 10 10"><polygon points="0,0 10,0 5,10" /></svg>
                  )}
                  <span>{yoyStats.expenditureChange >= 0 ? '+' : ''}{formatCurrencyShort(yoyStats.expenditureChange)} vs last year</span>
                </p>
                <p>{formatCurrencyShort(yoyStats.currentYearExpenditures)} expended this year</p>
              </div>
            </div>

            {/* Role-specific metrics */}
            {roleMetrics && roleDistribution && (
              roleMetrics.isFundingOrg ? (
                <>
                  <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
                    <p className="text-xs font-medium text-slate-600 truncate">Implementing Partners</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {roleMetrics.uniqueImplementingPartners || 0}
                    </p>
                    <div className="text-xs text-slate-500">
                      <p>Across {yoyStats.activitiesCount} activities</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
                    <p className="text-xs font-medium text-slate-600 truncate">Inbound Funding</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {formatCurrencyShort(roleMetrics.totalInboundFunding || 0)}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
                    <p className="text-xs font-medium text-slate-600 truncate">Donors</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {roleMetrics.uniqueDonors || 0}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
                    <p className="text-xs font-medium text-slate-600 truncate">Avg. Activity</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {formatCurrencyShort(roleMetrics.averageActivitySize || 0)}
                    </p>
                  </div>
                </>
              )
            )}
          </div>

          {/* Charts Section - Row 2: Chart Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Active Projects Timeline Chart */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-slate-900">Projects Timeline</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimelineView(timelineView === 'chart' ? 'table' : 'chart')}
                    className="h-6 w-6 p-0"
                  >
                    {timelineView === 'chart' ? <TableIcon className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const projectsByYear = calculateActiveProjectsByYear()
                      const data = Object.entries(projectsByYear).map(([year, data]) => ({
                        year: parseInt(year),
                        count: data.count,
                        totalValue: data.totalValue
                      }))
                      exportToCSV(data, 'projects-timeline.csv', ['Year', 'Count', 'Total Value'])
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                  {(() => {
                    const projectsByYear = calculateActiveProjectsByYear()
                    const years = Object.keys(projectsByYear).map(Number).sort()
                    const maxCount = Math.max(...Object.values(projectsByYear).map(v => v.count), 1)
                    
                  if (timelineView === 'table') {
                    return (
                      <div className="h-36 overflow-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-1 text-slate-600 font-medium">Year</th>
                              <th className="text-right py-1 text-slate-600 font-medium">Count</th>
                              <th className="text-right py-1 text-slate-600 font-medium">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {years.map((year) => (
                              <tr key={year} className="border-b border-slate-100">
                                <td className="py-1 text-slate-900">{year}</td>
                                <td className="text-right py-1 text-slate-900 font-medium">{projectsByYear[year].count}</td>
                                <td className="text-right py-1 text-slate-900 font-medium">{formatCurrencyShort(projectsByYear[year].totalValue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  }

                  return (
                    <div className="h-36 relative group">
                        <svg className="w-full h-full" viewBox="0 0 300 100">
                          {/* Grid lines */}
                          {[0, 1, 2, 3, 4].map(i => (
                            <line
                              key={i}
                              x1="0"
                              y1={i * 20 + 10}
                              x2="300"
                              y2={i * 20 + 10}
                              stroke="#e2e8f0"
                              strokeWidth="0.5"
                            />
                          ))}
                          
                          {/* Straight line chart */}
                          {(() => {
                            const points = years.map((year, index) => ({
                              x: years.length === 1 ? 150 : (index / (years.length - 1)) * 280 + 10,
                              y: 90 - (projectsByYear[year].count / maxCount) * 70
                            }));

                            if (points.length < 2) {
                              return points.length === 1 ? (
                                <circle cx={points[0].x} cy={points[0].y} r="4" fill="#475569" />
                              ) : null;
                            }

                            // Create straight line path
                            const path = points.map((point, index) =>
                              index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
                            ).join(' ');

                            return (
                              <path
                                d={path}
                                fill="none"
                                stroke="#475569"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            );
                          })()}
                          
                          {/* Data points with hover areas */}
                          {years.map((year, index) => {
                            const x = (index / (years.length - 1)) * 280 + 10
                            const y = 90 - (projectsByYear[year].count / maxCount) * 70
                            return (
                              <g key={year}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="8"
                                  fill="transparent"
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredPoint({
                                    year, 
                                    count: projectsByYear[year].count, 
                                    totalValue: projectsByYear[year].totalValue,
                                    x, 
                                    y
                                  })}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                />
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="3"
                                  fill="#475569"
                                  className="pointer-events-none"
                                />
                              </g>
                            )
                          })}
                          
                          {/* Year labels */}
                          {years.map((year, index) => {
                            const x = (index / (years.length - 1)) * 280 + 10
                            return (
                              <text
                                key={year}
                                x={x}
                                y="95"
                                textAnchor="middle"
                                fontSize="10"
                                fill="#64748b"
                              >
                                {year}
                              </text>
                            )
                          })}
                        </svg>

                        {hoveredPoint && (
                          <div
                            className="absolute bg-white border border-gray-200 rounded shadow-lg overflow-hidden pointer-events-none z-10"
                            style={{
                              left: `${(hoveredPoint.x / 300) * 100}%`,
                              top: `${(hoveredPoint.y / 100) * 100 - 30}%`,
                              transform: 'translateX(-50%)'
                            }}
                          >
                            <table className="text-xs w-full border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="text-left px-3 py-2 text-slate-600 font-semibold">{hoveredPoint.year}</th>
                                  <th className="text-right px-3 py-2 text-slate-600 font-semibold">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="px-3 py-1.5 text-slate-700">Active Activities</td>
                                  <td className="px-3 py-1.5 text-right font-medium text-slate-900">{hoveredPoint.count}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                    </div>
                    )
                  })()}
              </CardContent>
            </Card>

            {/* Budget by Year Chart */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-slate-900">Budget by Year</CardTitle>
                <div className="flex gap-1">
                  {budgetView === 'chart' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBudgetChartType(budgetChartType === 'area' ? 'bar' : 'area')}
                      className="h-6 w-6 p-0"
                      title={budgetChartType === 'area' ? 'Switch to Bar' : 'Switch to Area'}
                    >
                      {budgetChartType === 'area' ? <BarChart3 className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBudgetView(budgetView === 'chart' ? 'table' : 'chart')}
                    className="h-6 w-6 p-0"
                  >
                    {budgetView === 'chart' ? <TableIcon className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const data = budgetsByYear.map(item => ({
                        year: item.year,
                        budget: item.amount
                      }))
                      exportToCSV(data, 'budget-by-year.csv', ['Year', 'Budget'])
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {budgetsByYear.length > 0 ? (
                    budgetView === 'table' ? (
                    <div className="h-36 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-1 text-slate-600 font-medium">Year</th>
                            <th className="text-right py-1 text-slate-600 font-medium">Budget</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetsByYear.map((item) => (
                            <tr key={item.year} className="border-b border-slate-100">
                              <td className="py-1 text-slate-900">{item.year}</td>
                              <td className="text-right py-1 text-slate-900 font-medium">{formatCurrencyShort(item.amount)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-slate-300 bg-slate-50">
                            <td className="py-1 text-slate-900 font-semibold">Total</td>
                            <td className="text-right py-1 text-slate-900 font-semibold">
                              {formatCurrencyShort(budgetsByYear.reduce((sum, item) => sum + item.amount, 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                  <div className="h-36 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      {budgetChartType === 'area' ? (
                        <AreaChart data={budgetsByYear} margin={{ top: 0, right: 5, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#475569" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
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
                            tickFormatter={formatAxisTick}
                          />
                          <RechartsTooltip
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
                                        <tr>
                                          <td className="px-3 py-1.5 text-slate-700">Amount</td>
                                          <td className="px-3 py-1.5 text-right font-medium text-slate-900">{formatCurrencyShort(payload[0].value as number)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="#475569"
                            strokeWidth={2}
                            fill="url(#budgetGradient)"
                          />
                        </AreaChart>
                      ) : (
                        <BarChart data={budgetsByYear} margin={{ top: 0, right: 5, left: 0, bottom: 5 }}>
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
                            tickFormatter={formatAxisTick}
                          />
                          <RechartsTooltip
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
                                        <tr>
                                          <td className="px-3 py-1.5 text-slate-700">Amount</td>
                                          <td className="px-3 py-1.5 text-right font-medium text-slate-900">{formatCurrencyShort(payload[0].value as number)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            {budgetsByYear.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill="#475569" />
                            ))}
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  )
                ) : (
                  <div className="h-24 flex items-center justify-center text-slate-400 text-xs">
                    <p>No data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expenditure Trend */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xs font-semibold text-slate-900">Budget vs Actuals</CardTitle>
                  <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBudgetVsActualsChartType(budgetVsActualsChartType === 'bar' ? 'area' : 'bar')}
                    className="h-6 w-6 p-0"
                    title={budgetVsActualsChartType === 'bar' ? 'Switch to Area Chart' : 'Switch to Bar Chart'}
                  >
                    {budgetVsActualsChartType === 'bar' ? <AreaChartIcon className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBudgetVsActualsView(budgetVsActualsView === 'chart' ? 'table' : 'chart')}
                    className="h-6 w-6 p-0"
                  >
                    {budgetVsActualsView === 'chart' ? <TableIcon className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const allYears = new Set([
                        ...plannedDisbursementsByYear.map(b => b.year),
                        ...disbursementsByYear.map(d => d.year)
                      ])
                      const data = Array.from(allYears).sort().map(year => ({
                        year,
                        planned_disbursements: plannedDisbursementsByYear.find(b => b.year === year)?.amount || 0,
                        disbursements: disbursementsByYear.find(d => d.year === year)?.disbursements || 0,
                        expenditures: disbursementsByYear.find(d => d.year === year)?.expenditures || 0
                      }))
                      exportToCSV(data, 'budget-vs-actuals.csv', ['Year', 'Planned_Disbursements', 'Disbursements', 'Expenditures'])
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {(() => {
                  // Combine planned disbursements and actual disbursement data
                  const allYears = new Set([
                    ...plannedDisbursementsByYear.map(b => b.year),
                    ...disbursementsByYear.map(d => d.year)
                  ])
                  
                  const chartData = Array.from(allYears).sort().map(year => {
                    const plannedDisbursements = plannedDisbursementsByYear.find(b => b.year === year)?.amount || 0
                    const disbData = disbursementsByYear.find(d => d.year === year)
                    
                    return {
                      year,
                      plannedDisbursements,
                      disbursements: disbData?.disbursements || 0,
                      expenditures: disbData?.expenditures || 0
                    }
                  })
                  
                  console.log('[OrgProfile] Budget vs Actuals chart data:', {
                    plannedDisbursementsByYear,
                    disbursementsByYear,
                    chartData
                  })
                  
                  return chartData.length > 0 ? (
                    budgetVsActualsView === 'table' ? (
                      <div className="h-36 overflow-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-1 text-slate-600 font-medium">Year</th>
                              <th className="text-right py-1 text-slate-600 font-medium">Planned Disbursements</th>
                              <th className="text-right py-1 text-slate-600 font-medium">Disbursements</th>
                              <th className="text-right py-1 text-slate-600 font-medium">Expenditures</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chartData.map((item) => (
                              <tr key={item.year} className="border-b border-slate-100">
                                <td className="py-1 text-slate-900">{item.year}</td>
                                <td className="text-right py-1 text-slate-700">{formatCurrencyShort(item.plannedDisbursements)}</td>
                                <td className="text-right py-1 text-slate-900 font-medium">{formatCurrencyShort(item.disbursements)}</td>
                                <td className="text-right py-1 text-slate-900 font-medium">{formatCurrencyShort(item.expenditures)}</td>
                              </tr>
                            ))}
                            <tr className="border-t-2 border-slate-300 bg-slate-50">
                              <td className="py-1 text-slate-900 font-semibold">Total</td>
                              <td className="text-right py-1 font-semibold text-slate-700">
                                {formatCurrencyShort(chartData.reduce((sum, item) => sum + item.plannedDisbursements, 0))}
                              </td>
                              <td className="text-right py-1 text-slate-900 font-semibold">
                                {formatCurrencyShort(chartData.reduce((sum, item) => sum + item.disbursements, 0))}
                              </td>
                              <td className="text-right py-1 text-slate-900 font-semibold">
                                {formatCurrencyShort(chartData.reduce((sum, item) => sum + item.expenditures, 0))}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) :
                    <div className="h-36 -mx-2">
                      <ResponsiveContainer width="100%" height="100%">
                        {budgetVsActualsChartType === 'bar' ? (
                          <BarChart data={chartData} margin={{ top: 0, right: 5, left: 0, bottom: 5 }} barCategoryGap="20%" barGap={0}>
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
                              tickFormatter={formatAxisTick}
                            />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white border border-gray-200 rounded shadow-lg overflow-hidden">
                                      <table className="text-xs w-full border-collapse">
                                        <thead>
                                          <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="text-left px-3 py-2 text-slate-600 font-semibold">{payload[0].payload.year}</th>
                                            <th className="text-right px-3 py-2 text-slate-600 font-semibold">Value</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr className="border-b border-slate-100">
                                            <td className="px-3 py-1.5 text-slate-700 flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#DC2625' }}></span>
                                              Planned Disbursements
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-medium text-slate-900">{formatCurrencyShort(payload[0].payload.plannedDisbursements)}</td>
                                          </tr>
                                          <tr className="border-b border-slate-100">
                                            <td className="px-3 py-1.5 text-slate-700 flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#7B95A7' }}></span>
                                              Disbursements
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-medium text-slate-900">{formatCurrencyShort(payload[0].payload.disbursements)}</td>
                                          </tr>
                                          <tr>
                                            <td className="px-3 py-1.5 text-slate-700 flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#CFD0D5' }}></span>
                                              Expenditures
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-medium text-slate-900">{formatCurrencyShort(payload[0].payload.expenditures)}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="plannedDisbursements" fill="#DC2625" name="Planned Disbursements" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="disbursements" fill="#7B95A7" name="Disbursements" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="expenditures" fill="#CFD0D5" name="Expenditures" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        ) : (
                          <AreaChart data={chartData} margin={{ top: 0, right: 5, left: 0, bottom: 5 }}>
                            <defs>
                              <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#DC2625" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#DC2625" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="disbursementsGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7B95A7" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#7B95A7" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="expendituresGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#CFD0D5" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#CFD0D5" stopOpacity={0}/>
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
                              tickFormatter={formatAxisTick}
                            />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white border border-gray-200 rounded shadow-lg overflow-hidden">
                                      <table className="text-xs w-full border-collapse">
                                        <thead>
                                          <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="text-left px-3 py-2 text-slate-600 font-semibold">{payload[0].payload.year}</th>
                                            <th className="text-right px-3 py-2 text-slate-600 font-semibold">Value</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr className="border-b border-slate-100">
                                            <td className="px-3 py-1.5 text-slate-700 flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#DC2625' }}></span>
                                              Planned Disbursements
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-medium text-slate-900">{formatCurrencyShort(payload[0].payload.plannedDisbursements)}</td>
                                          </tr>
                                          <tr className="border-b border-slate-100">
                                            <td className="px-3 py-1.5 text-slate-700 flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#7B95A7' }}></span>
                                              Disbursements
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-medium text-slate-900">{formatCurrencyShort(payload[0].payload.disbursements)}</td>
                                          </tr>
                                          <tr>
                                            <td className="px-3 py-1.5 text-slate-700 flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#CFD0D5' }}></span>
                                              Expenditures
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-medium text-slate-900">{formatCurrencyShort(payload[0].payload.expenditures)}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area type="monotone" dataKey="plannedDisbursements" stroke="#DC2625" strokeWidth={2} fill="url(#plannedGradient)" />
                            <Area type="monotone" dataKey="disbursements" stroke="#7B95A7" strokeWidth={2} fill="url(#disbursementsGradient)" />
                            <Area type="monotone" dataKey="expenditures" stroke="#CFD0D5" strokeWidth={2} fill="url(#expendituresGradient)" />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
                      <p>No data</p>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Aid Modality Composition */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xs font-semibold text-slate-900">Aid Modality Composition</CardTitle>
                  <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalityView(modalityView === 'chart' ? 'table' : 'chart')}
                    className="h-6 w-6 p-0"
                  >
                    {modalityView === 'chart' ? <TableIcon className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const total = modalityComposition.reduce((sum, item) => sum + item.value, 0)
                      const data = modalityComposition.map(item => ({
                        finance_type: item.name,
                        value: item.value,
                        percentage: ((item.value / total) * 100).toFixed(1)
                      }))
                      exportToCSV(data, 'aid-modality-composition.csv', ['Finance_Type', 'Value', 'Percentage'])
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {modalityComposition.length > 0 ? (
                  modalityView === 'table' ? (
                    <div className="h-24 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-1 text-slate-600 font-medium">Finance Type</th>
                            <th className="text-right py-1 text-slate-600 font-medium">Value</th>
                            <th className="text-right py-1 text-slate-600 font-medium">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalityComposition.map((item) => {
                            const total = modalityComposition.reduce((sum, i) => sum + i.value, 0)
                            const percentage = ((item.value / total) * 100).toFixed(1)
                            return (
                              <tr key={item.name} className="border-b border-slate-100">
                                <td className="py-1 text-slate-900 flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                  <span>{item.name}</span>
                                </td>
                                <td className="text-right py-1 text-slate-900 font-medium">
                                  {formatCurrencyShort(item.value)}
                                </td>
                                <td className="text-right py-1 text-slate-700">{percentage}%</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-24">
                      {/* Single horizontal stacked bar */}
                      {(() => {
                        const totalValue = modalityCompositionByValue.reduce((sum, item) => sum + item.value, 0)
                        const totalCount = modalityCompositionByCount.reduce((sum, item) => sum + item.value, 0)
                        return (
                          <div className="h-full flex flex-col justify-center pt-16">
                            <div className="relative h-8 w-full rounded-md flex" style={{ overflow: 'visible' }}>
                              {modalityCompositionByValue.map((item, index) => {
                                const percentage = (item.value / totalValue) * 100
                                const countItem = modalityCompositionByCount.find(c => c.name === item.name)
                                const projectCount = countItem?.value || 0
                                const isFirst = index === 0
                                const isLast = index === modalityCompositionByValue.length - 1
                                return (
                                  <div
                                    key={item.name}
                                    className="h-full relative group cursor-pointer"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: item.color,
                                      borderTopLeftRadius: isFirst ? '0.375rem' : 0,
                                      borderBottomLeftRadius: isFirst ? '0.375rem' : 0,
                                      borderTopRightRadius: isLast ? '0.375rem' : 0,
                                      borderBottomRightRadius: isLast ? '0.375rem' : 0,
                                    }}
                                  >
                                    {/* Hover tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                      <div className="bg-white border border-gray-200 rounded shadow-lg overflow-hidden whitespace-nowrap">
                                        <table className="text-xs border-collapse">
                                          <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                              <th colSpan={2} className="text-left px-3 py-2 text-slate-600 font-semibold">{item.name}</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr className="border-b border-slate-100">
                                              <td className="px-3 py-1.5 text-slate-700">Value</td>
                                              <td className="px-3 py-1.5 text-right font-medium text-slate-900">{formatCurrencyShort(item.value)}</td>
                                            </tr>
                                            <tr className="border-b border-slate-100">
                                              <td className="px-3 py-1.5 text-slate-700">Share</td>
                                              <td className="px-3 py-1.5 text-right font-medium text-slate-900">{percentage.toFixed(1)}%</td>
                                            </tr>
                                            <tr>
                                              <td className="px-3 py-1.5 text-slate-700">Projects</td>
                                              <td className="px-3 py-1.5 text-right font-medium text-slate-900">{projectCount}</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            {/* Legend */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {modalityCompositionByValue.map((item) => (
                                <div key={item.name} className="flex items-center gap-1 text-xs">
                                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                                  <span className="text-slate-600 truncate">{item.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )
                ) : (
                  <div className="h-24 flex items-center justify-center text-slate-400 text-xs">
                    <p>No finance type data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Card className="border-0 shadow-none">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap justify-center">
                <TabsTrigger value="activities" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Activities
                </TabsTrigger>
                <TabsTrigger value="budgets" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Budgets
                </TabsTrigger>
                <TabsTrigger value="planned-disbursements" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Planned Disbursements
                </TabsTrigger>
                <TabsTrigger value="transactions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="financial-analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Portfolio Analytics
                </TabsTrigger>
                <TabsTrigger value="sectors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Sectors
                </TabsTrigger>
                <TabsTrigger value="sdgs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  SDGs
                </TabsTrigger>
                <TabsTrigger value="partnerships" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Partnerships
                </TabsTrigger>
                <TabsTrigger value="geography" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Geography
                </TabsTrigger>
                <TabsTrigger value="contacts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Contacts
                </TabsTrigger>
                <TabsTrigger value="documents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Documents
                </TabsTrigger>
              </TabsList>


              <TabsContent value="activities" className="p-6">
                  <Card className="border-0 shadow-none">
                    <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-slate-900">Activities Portfolio</CardTitle>
                      <div className="flex items-center gap-3">
                        <div className="flex">
                          <Button
                            variant={activitiesView === 'card' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActivitiesView('card')}
                            className="rounded-r-none"
                          >
                            <LayoutGrid className="h-4 w-4 mr-1" />
                            Card
                          </Button>
                          <Button
                            variant={activitiesView === 'table' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActivitiesView('table')}
                            className="rounded-l-none"
                          >
                            <TableIcon className="h-4 w-4 mr-1" />
                            Table
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          title="Export CSV"
                          onClick={() => {
                            const data = activities
                              .filter(activity => activity.title && activity.title.trim() !== '')
                              .map(activity => ({
                                title: activity.title || '',
                                acronym: activity.acronym || '',
                                iati_identifier: activity.iati_identifier || '',
                                activity_status: activity.activity_status || '',
                                planned_start_date: activity.planned_start_date || '',
                                planned_end_date: activity.planned_end_date || '',
                                actual_start_date: activity.actual_start_date || '',
                                actual_end_date: activity.actual_end_date || '',
                                total_budget: activity.totalPlannedBudgetUSD || activity.total_budget || 0,
                                total_disbursed: activity.total_disbursed || 0,
                              }))
                            exportToCSV(data, `${organization?.acronym || organization?.name || 'organization'}-activities.csv`, [
                              'Title', 'Acronym', 'IATI_Identifier', 'Activity_Status', 'Planned_Start_Date', 'Planned_End_Date', 'Actual_Start_Date', 'Actual_End_Date', 'Total_Budget', 'Total_Disbursed'
                            ])
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    </CardHeader>
                  <CardContent>
                    {activities.length > 0 ? (
                      activitiesView === 'card' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {activities
                            .filter(activity => activity.title && activity.title.trim() !== '')
                            .sort((a, b) => {
                              // Sort by updated_at descending (most recent first)
                              const aDate = a.updated_at ? new Date(a.updated_at).getTime() : 0
                              const bDate = b.updated_at ? new Date(b.updated_at).getTime() : 0
                              return bDate - aDate
                            })
                            .map((activity) => (
                              <ActivityCardModern
                                key={activity.id}
                                activity={{
                                  id: activity.id,
                                  title: activity.title,
                                  iati_id: activity.iati_identifier,
                                  description: activity.description,
                                  acronym: activity.acronym,
                                  activity_status: activity.activity_status,
                                  planned_start_date: activity.planned_start_date,
                                  planned_end_date: activity.planned_end_date,
                                  updated_at: activity.updated_at,
                                  banner: activity.banner,
                                  icon: activity.icon,
                                  totalBudget: activity.totalPlannedBudgetUSD || activity.total_budget,
                                  totalDisbursed: activity.total_disbursed,
                                }}
                                onEdit={handleEditActivity}
                                onDelete={(id) => setDeleteActivityId(id)}
                              />
                            ))}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead
                                className="cursor-pointer hover:bg-slate-100 w-[45%]"
                                onClick={() => {
                                  if (activitiesSortColumn === 'title') {
                                    setActivitiesSortDirection(activitiesSortDirection === 'asc' ? 'desc' : 'asc')
                                  } else {
                                    setActivitiesSortColumn('title')
                                    setActivitiesSortDirection('asc')
                                  }
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  Title
                                  {activitiesSortColumn === 'title' && (
                                    <span className="text-slate-400">{activitiesSortDirection === 'asc' ? '↑' : '↓'}</span>
                                  )}
                                </div>
                              </TableHead>
                              <TableHead
                                className="cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  if (activitiesSortColumn === 'status') {
                                    setActivitiesSortDirection(activitiesSortDirection === 'asc' ? 'desc' : 'asc')
                                  } else {
                                    setActivitiesSortColumn('status')
                                    setActivitiesSortDirection('asc')
                                  }
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  Status
                                  {activitiesSortColumn === 'status' && (
                                    <span className="text-slate-400">{activitiesSortDirection === 'asc' ? '↑' : '↓'}</span>
                                  )}
                                </div>
                              </TableHead>
                              <TableHead
                                className="cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  if (activitiesSortColumn === 'start') {
                                    setActivitiesSortDirection(activitiesSortDirection === 'asc' ? 'desc' : 'asc')
                                  } else {
                                    setActivitiesSortColumn('start')
                                    setActivitiesSortDirection('asc')
                                  }
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  Start Date
                                  {activitiesSortColumn === 'start' && (
                                    <span className="text-slate-400">{activitiesSortDirection === 'asc' ? '↑' : '↓'}</span>
                                  )}
                                </div>
                              </TableHead>
                              <TableHead
                                className="cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  if (activitiesSortColumn === 'end') {
                                    setActivitiesSortDirection(activitiesSortDirection === 'asc' ? 'desc' : 'asc')
                                  } else {
                                    setActivitiesSortColumn('end')
                                    setActivitiesSortDirection('asc')
                                  }
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  End Date
                                  {activitiesSortColumn === 'end' && (
                                    <span className="text-slate-400">{activitiesSortDirection === 'asc' ? '↑' : '↓'}</span>
                                  )}
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  if (activitiesSortColumn === 'budget') {
                                    setActivitiesSortDirection(activitiesSortDirection === 'asc' ? 'desc' : 'asc')
                                  } else {
                                    setActivitiesSortColumn('budget')
                                    setActivitiesSortDirection('desc')
                                  }
                                }}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Total Budget
                                  {activitiesSortColumn === 'budget' && (
                                    <span className="text-slate-400">{activitiesSortDirection === 'asc' ? '↑' : '↓'}</span>
                                  )}
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  if (activitiesSortColumn === 'disbursed') {
                                    setActivitiesSortDirection(activitiesSortDirection === 'asc' ? 'desc' : 'asc')
                                  } else {
                                    setActivitiesSortColumn('disbursed')
                                    setActivitiesSortDirection('desc')
                                  }
                                }}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Disbursed
                                  {activitiesSortColumn === 'disbursed' && (
                                    <span className="text-slate-400">{activitiesSortDirection === 'asc' ? '↑' : '↓'}</span>
                                  )}
                                </div>
                              </TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...activities].sort((a, b) => {
                              const direction = activitiesSortDirection === 'asc' ? 1 : -1
                              switch (activitiesSortColumn) {
                                case 'title':
                                  return direction * (a.title || '').localeCompare(b.title || '')
                                case 'status':
                                  return direction * (a.activity_status || '').localeCompare(b.activity_status || '')
                                case 'start': {
                                  const aDate = a.actual_start_date || a.planned_start_date || ''
                                  const bDate = b.actual_start_date || b.planned_start_date || ''
                                  return direction * aDate.localeCompare(bDate)
                                }
                                case 'end': {
                                  const aDate = a.actual_end_date || a.planned_end_date || ''
                                  const bDate = b.actual_end_date || b.planned_end_date || ''
                                  return direction * aDate.localeCompare(bDate)
                                }
                                case 'budget': {
                                  const aVal = a.totalPlannedBudgetUSD || a.total_budget || 0
                                  const bVal = b.totalPlannedBudgetUSD || b.total_budget || 0
                                  return direction * (aVal - bVal)
                                }
                                case 'disbursed': {
                                  const aVal = a.total_disbursed || 0
                                  const bVal = b.total_disbursed || 0
                                  return direction * (aVal - bVal)
                                }
                                default:
                                  return 0
                              }
                            }).map((activity) => (
                              <TableRow key={activity.id}>
                                <TableCell className="font-medium">
                                  <div className="space-y-1">
                                    <div>
                                      <Link
                                        href={`/activities/${activity.id}`}
                                        className="hover:text-blue-600 transition-colors"
                                      >
                                        {activity.title}
                                      </Link>
                                      {activity.acronym && (
                                        <span className="font-medium ml-1">({activity.acronym})</span>
                                      )}
                                      {activity.iati_identifier && (
                                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-2 inline-flex items-center gap-1">
                                          {activity.iati_identifier}
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              navigator.clipboard.writeText(activity.iati_identifier);
                                            }}
                                            className="hover:text-slate-900 transition-colors"
                                            title="Copy ID"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </button>
                                        </span>
                                      )}
                                    </div>
                                    {/* Activity description */}
                                    {activity.description && (
                                      <p className="text-xs text-slate-500 line-clamp-4 mt-1">
                                        {activity.description}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-slate-700">
                                    {getActivityStatusLabel(activity.activity_status)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const date = activity.activity_status === '1'
                                      ? activity.planned_start_date
                                      : (activity.actual_start_date || activity.planned_start_date);
                                    return date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const date = activity.activity_status === '1'
                                      ? activity.planned_end_date
                                      : (activity.actual_end_date || activity.planned_end_date);
                                    return date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                                  })()}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {activity.totalPlannedBudgetUSD
                                    ? formatCurrencyShort(activity.totalPlannedBudgetUSD)
                                    : activity.total_budget
                                    ? formatCurrencyShort(activity.total_budget)
                                    : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {activity.total_disbursed ? formatCurrencyShort(activity.total_disbursed) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-8 w-8"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        onClick={() => router.push(`/activities/${activity.id}`)}
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        View
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleEditActivity(activity.id)}
                                      >
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => setDeleteActivityId(activity.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )
                    ) : (
                      <div className="text-center py-12">
                        <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No activities found</p>
                      </div>
                      )}
                    </CardContent>
                  </Card>
              </TabsContent>

              <TabsContent value="budgets" className="p-6">
                {params?.id && (
                  <OrganizationBudgetsTab
                    organizationId={params.id as string}
                    defaultCurrency={organization?.default_currency || 'USD'}
                  />
                )}
              </TabsContent>

              <TabsContent value="planned-disbursements" className="p-6">
                {params?.id && (
                  <OrganizationPlannedDisbursementsTab
                    organizationId={params.id as string}
                    defaultCurrency={organization?.default_currency || 'USD'}
                  />
                )}
              </TabsContent>

              <TabsContent value="transactions" className="p-6">
                <div className="space-y-6">
                  {/* Transaction Activity Calendar at the top */}
                  <TransactionActivityCalendar filters={{ donor: params?.id as string }} />

                  {/* Transactions Table */}
                  {params?.id && (
                    <OrganizationTransactionsTab
                      organizationId={params.id as string}
                      defaultCurrency={organization?.default_currency || 'USD'}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="financial-analytics" className="p-6">
                <div className="space-y-6">
                  {/* Analytics Charts - 2 per row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Portfolio Spend Trajectory Chart */}
                    {params?.id && (
                      <ExpandableChartCard
                        title="Portfolio Spend Trajectory"
                        description="Track cumulative spending against total budget over time. Use to monitor burn rate and forecast budget utilization."
                        expandedChildren={
                          <OrganizationSpendTrajectoryChart
                            organizationId={params.id as string}
                            organizationName={organization?.name}
                          />
                        }
                      >
                        <OrganizationSpendTrajectoryChart
                          organizationId={params.id as string}
                          organizationName={organization?.name}
                          compact
                        />
                      </ExpandableChartCard>
                    )}

                    <ExpandableChartCard
                      title="Cumulative Financial Overview"
                      description="Compare disbursements, commitments, and planned spending trends. Identify gaps between planned and actual financial flows."
                      expandedChildren={<CumulativeFinancialOverview organizationId={params.id as string} />}
                    >
                      <CumulativeFinancialOverview compact organizationId={params.id as string} />
                    </ExpandableChartCard>

                    <ExpandableChartCard
                      title="Financial Flows by Finance Type"
                      description="Analyze financial flows by ODA type and finance instrument. Filter by flow type, finance type, and transaction type."
                      expandedChildren={<FinanceTypeFlowChart organizationId={params.id as string} />}
                    >
                      <FinanceTypeFlowChart compact organizationId={params.id as string} />
                    </ExpandableChartCard>

                    {/* Aid Predictability has its own expand functionality */}
                    <AidPredictabilityChart organizationId={params.id as string} />

                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sectors" className="p-6">
                <div className="space-y-6">
                  {/* Sector Financial Trends Chart */}
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Sector Financial Trends</CardTitle>
                      <p className="text-sm text-slate-600 mt-2">
                        Disbursements by sector over time
                      </p>
                    </CardHeader>
                    <CardContent>
                      <SectorDisbursementOverTime
                        dateRange={{
                          from: new Date(new Date().getFullYear() - 5, 0, 1),
                          to: new Date()
                        }}
                        organizationId={params.id as string}
                      />
                    </CardContent>
                  </Card>

                  {/* Sector Distribution Visualization */}
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Sector Distribution</CardTitle>
                      <p className="text-sm text-slate-600 mt-2">
                        Aggregated sector allocations across all activities ({sectorAllocations.length} unique sectors)
                      </p>
                    </CardHeader>
                  <CardContent>
                    {sectorAllocations.length > 0 ? (
                      <Tabs value={sectorVisualizationTab} onValueChange={(value) => setSectorVisualizationTab(value as 'sankey' | 'sunburst')}>
                        {/* Tab headers removed per design; selection is controlled externally */}
                        
                        <TabsContent value="sankey" className="mt-4">
                          <div className="relative overflow-hidden h-[600px]">
                            <SectorSankeyVisualization 
                              allocations={sectorAllocations}
                              className="w-full h-full"
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="sunburst" className="mt-4">
                          <div className="relative overflow-hidden h-[600px]">
                            <SectorSunburstVisualization 
                              allocations={sectorAllocations}
                              className="w-full h-full"
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <div className="text-center py-12">
                        <PieChart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No sector data available</p>
                        <p className="text-xs text-slate-400 mt-2">Activities need sector allocations to display visualization</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </div>
              </TabsContent>

              <TabsContent value="sdgs" className="p-6">
                <div className="space-y-6">
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Sustainable Development Goals</CardTitle>
                      <p className="text-sm text-slate-600 mt-2">
                        SDG coverage and concentration across organization activities
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ExpandableChartCard
                          title="SDG Coverage"
                          description="Activity distribution across Sustainable Development Goals"
                          height={400}
                          expandedChildren={
                            <SDGCoverageChart
                              organizationId={params.id as string}
                              dateRange={{ from: new Date(new Date().getFullYear() - 10, 0, 1), to: new Date() }}
                              selectedSdgs={[]}
                              metric="activities"
                              refreshKey={0}
                            />
                          }
                        >
                          <SDGCoverageChart
                            organizationId={params.id as string}
                            dateRange={{ from: new Date(new Date().getFullYear() - 10, 0, 1), to: new Date() }}
                            selectedSdgs={[]}
                            metric="activities"
                            refreshKey={0}
                            compact
                          />
                        </ExpandableChartCard>

                        <ExpandableChartCard
                          title="SDG Concentration"
                          description="Activities grouped by number of SDGs mapped"
                          height={400}
                          expandedChildren={
                            <SDGConcentrationChart
                              organizationId={params.id as string}
                              dateRange={{ from: new Date(new Date().getFullYear() - 10, 0, 1), to: new Date() }}
                              selectedSdgs={[]}
                              metric="activities"
                              refreshKey={0}
                            />
                          }
                        >
                          <SDGConcentrationChart
                            organizationId={params.id as string}
                            dateRange={{ from: new Date(new Date().getFullYear() - 10, 0, 1), to: new Date() }}
                            selectedSdgs={[]}
                            metric="activities"
                            refreshKey={0}
                            compact
                          />
                        </ExpandableChartCard>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="partnerships" className="p-6">
                {(() => {
                  // Aggregate partner data across all activities
                  const partnerMap = new Map<string, {
                    organization: any;
                    relationshipTypes: Set<string>;
                    collaborationCount: number;
                  }>();

                  for (const activity of activitiesWithPartnerData) {
                    if (!activity.participatingOrgs) continue;
                    for (const org of activity.participatingOrgs) {
                      if (!org.org_id || org.org_id === params?.id) continue;

                      const roleLabel =
                        org.role === '1' ? 'Funding' :
                        org.role === '2' ? 'Accountable' :
                        org.role === '3' ? 'Extending' :
                        org.role === '4' ? 'Implementing' : 'Partner';

                      if (partnerMap.has(org.org_id)) {
                        const existing = partnerMap.get(org.org_id)!;
                        existing.relationshipTypes.add(roleLabel);
                        existing.collaborationCount += 1;
                      } else {
                        partnerMap.set(org.org_id, {
                          organization: {
                            id: org.org_id,
                            name: org.narrative || org.org_name || 'Unknown',
                            acronym: org.acronym,
                            logo: org.logo,
                            org_type: org.org_type,
                            country: org.country,
                            iati_org_id: org.iati_org_id,
                          },
                          relationshipTypes: new Set([roleLabel]),
                          collaborationCount: 1,
                        });
                      }
                    }
                  }

                  const partnerships = Array.from(partnerMap.values())
                    .sort((a, b) => b.collaborationCount - a.collaborationCount);

                  const totalPartners = partnerships.length;
                  const totalCollaborations = partnerships.reduce((sum, p) => sum + p.collaborationCount, 0);

                  const getRoleBadgeColor = (role: string) => {
                    const colors: Record<string, string> = {
                      'Funding': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                      'Accountable': 'bg-purple-100 text-purple-800 border-purple-300',
                      'Extending': 'bg-blue-100 text-blue-800 border-blue-300',
                      'Implementing': 'bg-green-100 text-green-800 border-green-300',
                    };
                    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-300';
                  };

                  return (
                    <div className="space-y-6">
                      {/* Partner Organizations Pivot Table */}
                      {partnerships.length > 0 ? (
                        <>
                        <Card className="border-slate-200">
                          <CardHeader>
                            <CardTitle className="text-slate-900 flex items-center gap-2">
                              <Users className="h-5 w-5" />
                              Partnership Analysis
                            </CardTitle>
                            <p className="text-sm text-slate-500">
                              Interactive pivot table showing partnership patterns across {activitiesWithPartnerData.length} activities
                            </p>
                          </CardHeader>
                          <CardContent className="p-6 pt-0">
                            {/* Pivot Controls */}
                            <div className="flex items-end gap-4 flex-wrap mb-4">
                              <div className="space-y-2">
                                <Label htmlFor="pivotRows" className="text-xs text-muted-foreground">Rows</Label>
                                <Select value={pivotRowDimension} onValueChange={(v) => setPivotRowDimension(v as any)}>
                                  <SelectTrigger id="pivotRows" className="min-w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="organization">Organization</SelectItem>
                                    <SelectItem value="orgType">Organization Type</SelectItem>
                                    <SelectItem value="country">Country</SelectItem>
                                    <SelectItem value="role">Role</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="pivotColumns" className="text-xs text-muted-foreground">Columns</Label>
                                <Select value={pivotColumnDimension} onValueChange={(v) => setPivotColumnDimension(v as any)}>
                                  <SelectTrigger id="pivotColumns" className="min-w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="role">Role</SelectItem>
                                    <SelectItem value="orgType">Organization Type</SelectItem>
                                    <SelectItem value="country">Country</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="pivotValues" className="text-xs text-muted-foreground">Values</Label>
                                <Select value={pivotValueMetric} onValueChange={(v) => setPivotValueMetric(v as any)}>
                                  <SelectTrigger id="pivotValues" className="min-w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="activities">Activity Count</SelectItem>
                                    <SelectItem value="organizations">Organization Count</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Pivot Table */}
                            {(() => {
                              // Build raw data for pivot from activities
                              const rawData: Array<{
                                orgId: string;
                                orgName: string;
                                orgAcronym: string;
                                orgType: string;
                                country: string;
                                role: string;
                                activityId: string;
                              }> = [];

                              for (const activity of activitiesWithPartnerData) {
                                if (!activity.participatingOrgs) continue;
                                for (const org of activity.participatingOrgs) {
                                  if (!org.org_id || org.org_id === params?.id) continue;
                                  const roleLabel =
                                    org.role === '1' ? 'Funding' :
                                    org.role === '2' ? 'Accountable' :
                                    org.role === '3' ? 'Extending' :
                                    org.role === '4' ? 'Implementing' : 'Partner';

                                  rawData.push({
                                    orgId: org.org_id,
                                    orgName: org.narrative || org.org_name || 'Unknown',
                                    orgAcronym: org.acronym || '',
                                    orgType: org.org_type || 'Unknown',
                                    country: org.country || 'Unknown',
                                    role: roleLabel,
                                    activityId: activity.id,
                                  });
                                }
                              }

                              // Get unique column values
                              const getColumnValues = () => {
                                const values = new Set<string>();
                                rawData.forEach(d => {
                                  if (pivotColumnDimension === 'role') values.add(d.role);
                                  else if (pivotColumnDimension === 'orgType') values.add(d.orgType);
                                  else if (pivotColumnDimension === 'country') values.add(d.country);
                                });
                                return Array.from(values).sort();
                              };

                              // Get unique row values with their display info
                              const getRowValues = () => {
                                const rowMap = new Map<string, { key: string; label: string; orgId?: string }>();
                                rawData.forEach(d => {
                                  if (pivotRowDimension === 'organization') {
                                    if (!rowMap.has(d.orgId)) {
                                      // Include acronym in label if available and different from name
                                      const label = d.orgAcronym && d.orgAcronym !== d.orgName
                                        ? `${d.orgName} (${d.orgAcronym})`
                                        : d.orgName;
                                      rowMap.set(d.orgId, { key: d.orgId, label, orgId: d.orgId });
                                    }
                                  } else if (pivotRowDimension === 'orgType') {
                                    if (!rowMap.has(d.orgType)) {
                                      rowMap.set(d.orgType, { key: d.orgType, label: d.orgType });
                                    }
                                  } else if (pivotRowDimension === 'country') {
                                    if (!rowMap.has(d.country)) {
                                      rowMap.set(d.country, { key: d.country, label: d.country });
                                    }
                                  } else if (pivotRowDimension === 'role') {
                                    if (!rowMap.has(d.role)) {
                                      rowMap.set(d.role, { key: d.role, label: d.role });
                                    }
                                  }
                                });
                                return Array.from(rowMap.values()).sort((a, b) => a.label.localeCompare(b.label));
                              };

                              // Calculate pivot cell value
                              const getCellValue = (rowKey: string, colValue: string) => {
                                const filtered = rawData.filter(d => {
                                  const rowMatch =
                                    pivotRowDimension === 'organization' ? d.orgId === rowKey :
                                    pivotRowDimension === 'orgType' ? d.orgType === rowKey :
                                    pivotRowDimension === 'country' ? d.country === rowKey :
                                    d.role === rowKey;

                                  const colMatch =
                                    pivotColumnDimension === 'role' ? d.role === colValue :
                                    pivotColumnDimension === 'orgType' ? d.orgType === colValue :
                                    d.country === colValue;

                                  return rowMatch && colMatch;
                                });

                                if (pivotValueMetric === 'activities') {
                                  return new Set(filtered.map(d => d.activityId)).size;
                                } else {
                                  return new Set(filtered.map(d => d.orgId)).size;
                                }
                              };

                              // Get row total
                              const getRowTotal = (rowKey: string) => {
                                const filtered = rawData.filter(d => {
                                  return pivotRowDimension === 'organization' ? d.orgId === rowKey :
                                    pivotRowDimension === 'orgType' ? d.orgType === rowKey :
                                    pivotRowDimension === 'country' ? d.country === rowKey :
                                    d.role === rowKey;
                                });

                                if (pivotValueMetric === 'activities') {
                                  return new Set(filtered.map(d => d.activityId)).size;
                                } else {
                                  return new Set(filtered.map(d => d.orgId)).size;
                                }
                              };

                              // Get column total
                              const getColumnTotal = (colValue: string) => {
                                const filtered = rawData.filter(d => {
                                  return pivotColumnDimension === 'role' ? d.role === colValue :
                                    pivotColumnDimension === 'orgType' ? d.orgType === colValue :
                                    d.country === colValue;
                                });

                                if (pivotValueMetric === 'activities') {
                                  return new Set(filtered.map(d => d.activityId)).size;
                                } else {
                                  return new Set(filtered.map(d => d.orgId)).size;
                                }
                              };

                              // Get grand total
                              const getGrandTotal = () => {
                                if (pivotValueMetric === 'activities') {
                                  return new Set(rawData.map(d => d.activityId)).size;
                                } else {
                                  return new Set(rawData.map(d => d.orgId)).size;
                                }
                              };

                              const columnValues = getColumnValues();
                              const rowValues = getRowValues();
                              const maxValue = Math.max(
                                ...rowValues.flatMap(row =>
                                  columnValues.map(col => getCellValue(row.key, col))
                                ),
                                1
                              );

                              // All data cells are white
                              const getCellColor = (value: number) => {
                                return 'bg-white';
                              };

                              const columnLabel = pivotColumnDimension === 'role' ? 'Role' :
                                pivotColumnDimension === 'orgType' ? 'Organization Type' : 'Country';

                              return (
                                <div className="rounded-md border overflow-x-auto">
                                  <Table>
                                    <TableHeader className="bg-white border-b-2 border-slate-300">
                                      <TableRow>
                                        <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 whitespace-nowrap sticky left-0 bg-white z-10">
                                          {pivotRowDimension === 'organization' ? 'Organization' :
                                           pivotRowDimension === 'orgType' ? 'Organization Type' :
                                           pivotRowDimension === 'country' ? 'Country' : 'Role'}
                                        </TableHead>
                                        {columnValues.map(col => (
                                          <TableHead key={col} className="text-sm font-medium text-foreground/90 py-3 px-4 text-center whitespace-nowrap min-w-[100px]">
                                            {col}
                                          </TableHead>
                                        ))}
                                        <TableHead className="text-sm font-bold text-foreground py-3 px-4 text-center whitespace-nowrap bg-[#f1f4f8] min-w-[80px] border-l-2 border-slate-300">
                                          Total
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {rowValues.map((row) => (
                                        <TableRow key={row.key} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                                          <TableCell className="py-3 px-4 font-medium text-slate-900 sticky left-0 bg-white z-10">
                                            {row.orgId ? (
                                              <Link
                                                href={`/organizations/${row.orgId}`}
                                                className="hover:text-blue-600 transition-colors"
                                              >
                                                {row.label}
                                              </Link>
                                            ) : (
                                              row.label
                                            )}
                                          </TableCell>
                                          {columnValues.map(col => {
                                            const value = getCellValue(row.key, col);
                                            return (
                                              <TableCell
                                                key={col}
                                                className={`py-3 px-4 text-center ${getCellColor(value)}`}
                                              >
                                                {value > 0 ? (
                                                  <span className="font-medium text-slate-900">{value}</span>
                                                ) : (
                                                  <span className="text-slate-300">—</span>
                                                )}
                                              </TableCell>
                                            );
                                          })}
                                          <TableCell className="py-3 px-4 text-center font-bold bg-[#f1f4f8] text-slate-900 border-l-2 border-slate-300">
                                            {getRowTotal(row.key)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      {/* Column totals row */}
                                      <TableRow className="bg-[#f1f4f8] font-bold border-t-2 border-slate-300">
                                        <TableCell className="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-[#f1f4f8] z-10">
                                          Total
                                        </TableCell>
                                        {columnValues.map(col => (
                                          <TableCell key={col} className="py-3 px-4 text-center font-bold text-slate-900 bg-[#f1f4f8]">
                                            {getColumnTotal(col)}
                                          </TableCell>
                                        ))}
                                        <TableCell className="py-3 px-4 text-center font-bold text-slate-900 bg-[#f1f4f8] border-l-2 border-slate-300">
                                          {getGrandTotal()}
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>

                        {/* Organizational Network Graph */}
                        <Card className="border-slate-200">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-slate-900 flex items-center gap-2">
                                  <Building2 className="h-5 w-5" />
                                  Organizational Network
                                </CardTitle>
                                <p className="text-sm text-slate-500 mt-1">
                                  Interactive network showing organizational relationships and roles across all activities
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {/* Legend */}
                            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white rounded-lg border border-slate-100">
                              {[
                                { roleCode: 0, color: 'bg-[#4c5568]', label: 'This Organization' },
                                { roleCode: 1, color: 'bg-[#dc2625]', label: 'Funding' },
                                { roleCode: 2, color: 'bg-[#7b95a7]', label: 'Accountable' },
                                { roleCode: 3, color: 'bg-[#cfd0d5]', label: 'Extending' },
                                { roleCode: 4, color: 'bg-[#4c5568]', label: 'Implementing' },
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
                            <div className="relative w-full h-[500px] bg-white rounded-lg border border-slate-200 overflow-hidden">
                              {(() => {
                                // Build nodes from partnerships
                                const nodes: any[] = [];
                                const roleColors: Record<number, string> = {
                                  0: '#4c5568', // This org - Blue Slate
                                  1: '#dc2625', // Funding - Primary Scarlet
                                  2: '#7b95a7', // Accountable - Cool Steel
                                  3: '#cfd0d5', // Extending - Pale Slate
                                  4: '#4c5568', // Implementing - Blue Slate
                                };

                                const roleCodeMap: Record<string, number> = {
                                  'Funding': 1,
                                  'Accountable': 2,
                                  'Extending': 3,
                                  'Implementing': 4,
                                };

                                // Add current organization as central node
                                if (!hiddenRoles.has(0)) {
                                  const orgDisplayName = organization?.acronym && organization?.acronym !== organization?.name
                                    ? `${organization?.name} (${organization?.acronym})`
                                    : organization?.name || 'This Org';
                                  nodes.push({
                                    id: params?.id || 'main',
                                    name: orgDisplayName,
                                    fullName: organization?.name || 'This Organization',
                                    role: 'This Organization',
                                    roleCode: 0,
                                    color: roleColors[0],
                                    size: 55,
                                    logo: organization?.logo,
                                  });
                                }

                                // Add partner nodes
                                partnerships.forEach((partnership, index) => {
                                  const primaryRole = Array.from(partnership.relationshipTypes)[0];
                                  const roleCode = roleCodeMap[primaryRole] || 4;

                                  if (!hiddenRoles.has(roleCode)) {
                                    const partnerDisplayName = partnership.organization.acronym && partnership.organization.acronym !== partnership.organization.name
                                      ? `${partnership.organization.name} (${partnership.organization.acronym})`
                                      : partnership.organization.name || 'Partner';
                                    nodes.push({
                                      id: partnership.organization.id,
                                      name: partnerDisplayName,
                                      fullName: partnership.organization.name,
                                      role: primaryRole,
                                      roleCode,
                                      color: roleColors[roleCode],
                                      size: 35 + Math.min(partnership.collaborationCount * 3, 15),
                                      logo: partnership.organization.logo,
                                      collaborations: partnership.collaborationCount,
                                    });
                                  }
                                });

                                // Calculate positions
                                const width = 800;
                                const height = 500;
                                const centerX = width / 2;
                                const centerY = height / 2;

                                const centralNode = nodes.find(n => n.roleCode === 0);
                                if (centralNode) {
                                  centralNode.x = centerX;
                                  centralNode.y = centerY;
                                }

                                // Position other nodes in a circle around center, grouped by role
                                const otherNodes = nodes.filter(n => n.roleCode !== 0);
                                const radius = 180;

                                otherNodes.forEach((node, i) => {
                                  const angle = (2 * Math.PI * i) / otherNodes.length - Math.PI / 2;
                                  node.x = centerX + radius * Math.cos(angle);
                                  node.y = centerY + radius * Math.sin(angle);
                                });

                                // Create edges from central node to all partners
                                const edges: any[] = [];
                                if (centralNode) {
                                  nodes.forEach(node => {
                                    if (node.id !== centralNode.id) {
                                      edges.push({
                                        source: centralNode.id,
                                        target: node.id,
                                        type: node.roleCode === 2 ? 'oversight' : 'flow',
                                      });
                                    }
                                  });
                                }

                                return (
                                  <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
                                    {/* Define clip paths for circular logos */}
                                    <defs>
                                      {nodes.map((node) => (
                                        <clipPath key={`clip-${node.id}`} id={`clip-org-${node.id}`}>
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
                                          <line
                                            key={i}
                                            x1={source.x}
                                            y1={source.y}
                                            x2={target.x}
                                            y2={target.y}
                                            stroke={isOversight ? '#7b95a7' : '#cfd0d5'}
                                            strokeWidth={isOversight ? '1.5' : '2'}
                                            strokeDasharray={isOversight ? '4,4' : '0'}
                                            opacity="0.4"
                                          />
                                        );
                                      })}
                                    </g>

                                    {/* Draw nodes */}
                                    <g>
                                      {nodes.map((node) => (
                                        <g key={node.id} className="cursor-pointer">
                                          {/* Node circle background */}
                                          {!node.logo && (
                                            <circle
                                              cx={node.x}
                                              cy={node.y}
                                              r={node.size / 2}
                                              fill={node.color}
                                              stroke="white"
                                              strokeWidth="3"
                                            />
                                          )}

                                          {/* Org logo if available */}
                                          {node.logo && (
                                            <>
                                              <image
                                                x={node.x - node.size / 2}
                                                y={node.y - node.size / 2}
                                                width={node.size}
                                                height={node.size}
                                                href={node.logo}
                                                clipPath={`url(#clip-org-${node.id})`}
                                                preserveAspectRatio="xMidYMid slice"
                                              />
                                              <circle
                                                cx={node.x}
                                                cy={node.y}
                                                r={node.size / 2}
                                                fill="none"
                                                stroke="white"
                                                strokeWidth="3"
                                              />
                                            </>
                                          )}

                                          {/* Node label */}
                                          <foreignObject
                                            x={node.x - 75}
                                            y={node.y + node.size / 2 + 3}
                                            width="150"
                                            height="60"
                                          >
                                            <div
                                              style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                textAlign: 'center',
                                              }}
                                            >
                                              <div
                                                style={{
                                                  fontSize: '9px',
                                                  fontWeight: '600',
                                                  color: '#0f172a',
                                                  lineHeight: '1.3',
                                                  maxHeight: '42px',
                                                  overflow: 'hidden',
                                                  wordWrap: 'break-word',
                                                }}
                                              >
                                                {node.name}
                                              </div>
                                              <div
                                                style={{
                                                  fontSize: '8px',
                                                  color: '#64748b',
                                                  marginTop: '1px',
                                                }}
                                              >
                                                {node.role}
                                                {node.collaborations && ` (${node.collaborations})`}
                                              </div>
                                            </div>
                                          </foreignObject>

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
                        </>
                      ) : (
                        <Card className="border-slate-200">
                          <CardHeader>
                            <CardTitle className="text-slate-900">Partnership Network</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center py-12">
                              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                              <p className="text-slate-500">No partnership data available</p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="geography" className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Subnational Allocations Chart */}
                  <SubnationalAllocationsChart organizationId={params.id as string} />

                  {/* Myanmar Regions Map */}
                  <MyanmarRegionsMap breakdowns={subnationalMapData} />
                </div>
              </TabsContent>

              <TabsContent value="contacts" className="p-6">
                <Card className="border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-slate-900">Organization Contacts</CardTitle>
                    {organizationContacts.length > 0 && (
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <button
                          onClick={() => setContactsView('card')}
                          className={`p-2 rounded-md transition-colors ${
                            contactsView === 'card'
                              ? 'bg-white shadow-sm text-slate-900'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                          title="Card view"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setContactsView('table')}
                          className={`p-2 rounded-md transition-colors ${
                            contactsView === 'table'
                              ? 'bg-white shadow-sm text-slate-900'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                          title="Table view"
                        >
                          <TableIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {organizationContacts.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No contacts available</p>
                      </div>
                    ) : contactsView === 'card' ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {organizationContacts.map((contact) => {
                          const fullName = `${contact.title ? contact.title + ' ' : ''}${contact.firstName} ${contact.lastName}`.trim()
                          const jobLine = [contact.jobTitle, contact.department].filter(Boolean).join(' • ')
                          const typeLabels: Record<string, string> = {
                            '1': 'General Enquiries',
                            '2': 'Project Management',
                            '3': 'Financial Management',
                            '4': 'Communications'
                          }

                          return (
                            <div
                              key={contact.id}
                              className="relative border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 bg-white"
                            >
                              {contact.isPrimary && (
                                <div className="absolute top-4 left-4">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Primary Contact
                                  </span>
                                </div>
                              )}

                              <div className={`flex items-start gap-4 ${contact.isPrimary ? 'mt-6' : ''}`}>
                                <UserAvatar
                                  src={contact.profilePhoto}
                                  seed={contact.email || contact.linkedUserId || fullName}
                                  name={fullName}
                                  size={64}
                                />

                                <div className="flex-1 min-w-0 space-y-1">
                                  <h3 className="text-lg font-semibold text-slate-900 leading-tight break-words">
                                    {fullName}
                                  </h3>
                                  {jobLine && (
                                    <p className="text-sm text-slate-600 break-words">{jobLine}</p>
                                  )}
                                  {organization && (
                                    <div className="flex items-center gap-2 mt-1">
                                      {organization.logo ? (
                                        <img
                                          src={organization.logo}
                                          alt={organization.name}
                                          className="w-5 h-5 object-contain rounded"
                                        />
                                      ) : (
                                        <div className="w-5 h-5 bg-slate-200 rounded flex items-center justify-center">
                                          <span className="text-[10px] font-medium text-slate-500">
                                            {organization.acronym?.charAt(0) || organization.name?.charAt(0)}
                                          </span>
                                        </div>
                                      )}
                                      <span className="text-sm text-slate-500">
                                        {organization.name}
                                        {organization.acronym && ` (${organization.acronym})`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 space-y-2">
                                {contact.email && (
                                  <div className="flex items-center space-x-2">
                                    <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    <a
                                      href={`mailto:${contact.email}`}
                                      className="text-sm text-slate-700 hover:text-blue-600 transition-colors truncate"
                                    >
                                      {contact.email}
                                    </a>
                                  </div>
                                )}

                                {(contact.phone || contact.phoneNumber) && (
                                  <div className="flex items-center space-x-2">
                                    <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    <span className="text-sm text-slate-700">
                                      {contact.countryCode ? `${contact.countryCode} ` : ''}{contact.phoneNumber || contact.phone}
                                    </span>
                                  </div>
                                )}

                                {contact.website && (
                                  <div className="flex items-center space-x-2">
                                    <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    <a
                                      href={contact.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-slate-700 hover:text-blue-600 transition-colors truncate"
                                    >
                                      {contact.website.replace(/^https?:\/\//, '')}
                                    </a>
                                  </div>
                                )}
                              </div>

                              <div className="mt-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                  {typeLabels[contact.type] || 'Contact'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Contact</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Role</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Organization</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Email</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Phone</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {organizationContacts.map((contact) => {
                              const fullName = `${contact.title ? contact.title + ' ' : ''}${contact.firstName} ${contact.lastName}`.trim()
                              const jobLine = [contact.jobTitle, contact.department].filter(Boolean).join(' • ')
                              const typeLabels: Record<string, string> = {
                                '1': 'General Enquiries',
                                '2': 'Project Management',
                                '3': 'Financial Management',
                                '4': 'Communications'
                              }

                              return (
                                <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <UserAvatar
                                        src={contact.profilePhoto}
                                        seed={contact.email || contact.linkedUserId || fullName}
                                        name={fullName}
                                        size="md"
                                      />
                                      <div>
                                        <p className="text-sm font-medium text-slate-900">{fullName}</p>
                                        {contact.isPrimary && (
                                          <span className="text-xs text-blue-600">Primary Contact</span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <p className="text-sm text-slate-700">{jobLine || '—'}</p>
                                  </td>
                                  <td className="py-3 px-4">
                                    {organization ? (
                                      <div className="flex items-center gap-2">
                                        {organization.logo ? (
                                          <img
                                            src={organization.logo}
                                            alt={organization.name}
                                            className="w-5 h-5 object-contain rounded"
                                          />
                                        ) : (
                                          <div className="w-5 h-5 bg-slate-200 rounded flex items-center justify-center">
                                            <span className="text-[10px] font-medium text-slate-500">
                                              {organization.acronym?.charAt(0) || organization.name?.charAt(0)}
                                            </span>
                                          </div>
                                        )}
                                        <span className="text-sm text-slate-600">
                                          {organization.acronym || organization.name}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    {contact.email ? (
                                      <a
                                        href={`mailto:${contact.email}`}
                                        className="text-sm text-slate-700 hover:text-blue-600"
                                      >
                                        {contact.email}
                                      </a>
                                    ) : (
                                      <span className="text-sm text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="text-sm text-slate-700">
                                      {contact.phone || contact.phoneNumber
                                        ? `${contact.countryCode ? contact.countryCode + ' ' : ''}${contact.phoneNumber || contact.phone}`
                                        : '—'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                      {typeLabels[contact.type] || 'Contact'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="p-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-slate-900">Documents</CardTitle>
                      {(organizationDocuments.length > 0 || activityDocuments.length > 0) && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">
                            {organizationDocuments.length + activityDocuments.reduce((sum, a) => sum + a.documents.length, 0)} document{(organizationDocuments.length + activityDocuments.reduce((sum, a) => sum + a.documents.length, 0)) !== 1 ? 's' : ''}
                          </span>
                          <div className="flex border rounded-md">
                            <button
                              onClick={() => setDocumentsViewMode('card')}
                              className={`px-3 py-1.5 text-sm ${documentsViewMode === 'card' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} rounded-l-md transition-colors`}
                            >
                              <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDocumentsViewMode('table')}
                              className={`px-3 py-1.5 text-sm ${documentsViewMode === 'table' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} rounded-r-md transition-colors`}
                            >
                              <List className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(organizationDocuments.length > 0 || activityDocuments.length > 0) ? (
                      documentsViewMode === 'card' ? (
                        <div className="space-y-6">
                          {/* Organization Documents - Card View */}
                          {organizationDocuments.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900 mb-3">Organisation Documents</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {organizationDocuments.map((doc, index) => (
                                  <div key={doc.id || index} className="border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all overflow-hidden">
                                    {/* Document Thumbnail */}
                                    <a
                                      href={doc.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block"
                                    >
                                      <DocumentThumbnail
                                        url={doc.url}
                                        format={doc.format}
                                        title={doc.title}
                                        width={300}
                                        height={160}
                                        className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                                      />
                                    </a>
                                    {/* Document Info */}
                                    <div className="p-4">
                                      <div className="flex items-start justify-between mb-2">
                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Organisation</Badge>
                                        {doc.url && (
                                          <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                          </a>
                                        )}
                                      </div>
                                      <h4 className="text-sm font-medium text-slate-900 line-clamp-2 mb-1">
                                        {doc.title || doc.filename || 'Untitled Document'}
                                      </h4>
                                      {doc.description && (
                                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{doc.description}</p>
                                      )}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {doc.format && (
                                          <Badge variant="secondary" className="text-xs">{doc.format}</Badge>
                                        )}
                                        {doc.document_date && (
                                          <span className="text-xs text-slate-400">{doc.document_date}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Activity Documents - Card View */}
                          {activityDocuments.map((activityDoc) => (
                            <div key={activityDoc.activityId}>
                              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                                From Activity: {activityDoc.activityTitle}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {activityDoc.documents.map((doc: any, index: number) => (
                                  <div key={doc.id || index} className="border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all overflow-hidden">
                                    {/* Document Thumbnail */}
                                    <a
                                      href={doc.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block"
                                    >
                                      <DocumentThumbnail
                                        url={doc.url}
                                        format={doc.format}
                                        title={doc.title || doc.filename}
                                        width={300}
                                        height={160}
                                        className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                                      />
                                    </a>
                                    {/* Document Info */}
                                    <div className="p-4">
                                      <div className="flex items-start justify-between mb-2">
                                        <Badge variant="outline" className="text-xs">Activity</Badge>
                                        {doc.url && (
                                          <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                          </a>
                                        )}
                                      </div>
                                      <h4 className="text-sm font-medium text-slate-900 line-clamp-2 mb-1">
                                        {doc.title || doc.filename || 'Untitled Document'}
                                      </h4>
                                      {doc.description && (
                                        <p className="text-xs text-slate-500 line-clamp-2">{doc.description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Table View */
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Document</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Source</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Format</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Link</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {/* Organization Documents - Table View */}
                              {organizationDocuments.map((doc, index) => (
                                <tr key={`org-${doc.id || index}`} className="hover:bg-slate-50">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                      <div>
                                        <div className="text-sm font-medium text-slate-900">{doc.title || 'Untitled Document'}</div>
                                        {doc.description && (
                                          <div className="text-xs text-slate-500 truncate max-w-xs">{doc.description}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Organisation</Badge>
                                  </td>
                                  <td className="py-3 px-4 text-sm text-slate-600">-</td>
                                  <td className="py-3 px-4">
                                    {doc.format && <Badge variant="secondary" className="text-xs">{doc.format}</Badge>}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-slate-500">{doc.document_date || '-'}</td>
                                  <td className="py-3 px-4 text-right">
                                    {doc.url && (
                                      <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                                      >
                                        Open <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </td>
                                </tr>
                              ))}

                              {/* Activity Documents - Table View */}
                              {activityDocuments.flatMap((activityDoc) =>
                                activityDoc.documents.map((doc: any, index: number) => (
                                  <tr key={`activity-${activityDoc.activityId}-${doc.id || index}`} className="hover:bg-slate-50">
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-slate-600 flex-shrink-0" />
                                        <div>
                                          <div className="text-sm font-medium text-slate-900">{doc.title || doc.filename || 'Untitled Document'}</div>
                                          {doc.description && (
                                            <div className="text-xs text-slate-500 truncate max-w-xs">{doc.description}</div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <Badge variant="outline" className="text-xs">Activity</Badge>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600 truncate max-w-xs">{activityDoc.activityTitle}</td>
                                    <td className="py-3 px-4">
                                      {doc.format && <Badge variant="secondary" className="text-xs">{doc.format}</Badge>}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-500">{doc.document_date || '-'}</td>
                                    <td className="py-3 px-4 text-right">
                                      {doc.url && (
                                        <a
                                          href={doc.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                                        >
                                          Open <ExternalLink className="h-3 w-3" />
                                        </a>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No documents available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Delete Activity Confirmation Dialog */}
      <Dialog open={!!deleteActivityId} onOpenChange={() => setDeleteActivityId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Activity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteActivityId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteActivityId && handleDeleteActivity(deleteActivityId)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Activity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}