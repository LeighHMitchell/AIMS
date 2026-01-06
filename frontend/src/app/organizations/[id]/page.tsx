"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Legend } from 'recharts'
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
  Table as TableIcon,
  User,
  MoreVertical,
  Edit2,
  Trash2,
  PencilLine,
  ChevronDown,
  ChevronUp,
  Twitter,
  Facebook,
  Linkedin,
  Instagram,
  Youtube
} from 'lucide-react'
import Flag from 'react-world-flags'
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
import { OrganizationAnalytics } from '@/components/organizations/analytics/OrganizationAnalytics'
import { OrganizationFundingAnalytics } from '@/components/organizations/analytics/OrganizationFundingAnalytics'
import SectorSunburstVisualization from '@/components/charts/SectorSunburstVisualization'
import SectorSankeyVisualization from '@/components/charts/SectorSankeyVisualization'
import { NativeLikesCounter } from '@/components/ui/native-likes-counter'
import { useEntityLikes } from '@/hooks/use-entity-likes'
import { useUser } from '@/hooks/useUser'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from '@/components/ui/skeleton'
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
  const [budgetVsActualsView, setBudgetVsActualsView] = useState<'chart' | 'table'>('chart')
  const [budgetVsActualsMetric, setBudgetVsActualsMetric] = useState<'commitments' | 'disbursements' | 'expenditure'>('commitments')
  const [budgetVsActualsGrouping, setBudgetVsActualsGrouping] = useState<'year' | 'activity'>('year')
  const [modalityView, setModalityView] = useState<'chart' | 'table'>('chart')
  const [modalityViewMode, setModalityViewMode] = useState<'value' | 'count'>('value')
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
  const [organizationDocuments, setOrganizationDocuments] = useState<any[]>([])
  const [activityDocuments, setActivityDocuments] = useState<Array<{activityId: string, activityTitle: string, documents: any[]}>>([])

  
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

        // Fetch organization documents (if any)
        // Note: Organizations may not have a documents field, so we'll check for it
        
        // Fetch activities with budget data
        try {
          const activitiesResponse = await fetch(`/api/activities?organization_id=${params.id}`, {
            signal: abortControllerRef.current.signal
          })
          if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json()
            
            // Fetch budgets for each activity to calculate totalPlannedBudgetUSD
            const activitiesWithBudgets = await Promise.all(
              (activitiesData || []).map(async (activity: Activity) => {
                try {
                  const budgetResponse = await fetch(`/api/activities/${activity.id}/budgets`, {
                    signal: abortControllerRef.current?.signal
                  })
                  
                  if (budgetResponse.ok) {
                    const budgets = await budgetResponse.json()
                    // Sum all budget USD values
                    const totalPlannedBudgetUSD = budgets.reduce((sum: number, budget: any) => {
                      // Use usd_value if available, otherwise use value if currency is USD
                      const usdValue = budget.usd_value || (budget.currency === 'USD' ? budget.value : 0)
                      return sum + (usdValue || 0)
                    }, 0)
                    
                    return {
                      ...activity,
                      totalPlannedBudgetUSD
                    }
                  }
                } catch (budgetErr) {
                  console.warn(`Failed to fetch budgets for activity ${activity.id}:`, budgetErr)
                }
                
                return activity
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
                        }
                      })
                      
                      return {
                        id: activity.id,
                        title: activity.title || activity.title_narrative || 'Untitled',
                        activity_status: activity.activity_status || '1',
                        extendingPartners,
                        implementingPartners,
                        governmentPartners,
                        fundingPartners
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
                    fundingPartners: []
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
            
            // Calculate budgets by year from published activities
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
            
            // Fetch transactions from all activities
            const allTransactions = []
            const disbursementsByYearMap = new Map<number, { disbursements: number; expenditures: number }>()
            
            console.log(`[OrgProfile] Fetching transactions for ${activitiesWithBudgets.length} activities`)
            
            for (const activity of activitiesWithBudgets) {
            try {
              const txnResponse = await fetch(`/api/activities/${activity.id}/transactions`, {
                signal: abortControllerRef.current?.signal
              })
              
              if (txnResponse.ok) {
                const activityTransactions = await txnResponse.json()
                console.log(`[OrgProfile] Activity ${activity.id} has ${activityTransactions.length} transactions`)
                allTransactions.push(...activityTransactions)
                
                // Aggregate disbursements and expenditures by year
                for (const txn of activityTransactions) {
                  if (!txn.transaction_date || !txn.value) continue
                  
                  const year = new Date(txn.transaction_date).getFullYear()
                  
                  if (!disbursementsByYearMap.has(year)) {
                    disbursementsByYearMap.set(year, { disbursements: 0, expenditures: 0 })
                  }
                  
                  const yearData = disbursementsByYearMap.get(year)!
                  
                  // Type 3 = Disbursement, Type 4 = Expenditure
                  if (txn.transaction_type === '3') {
                    console.log(`[OrgProfile] Found disbursement: Year ${year}, Amount ${txn.value}`)
                    yearData.disbursements += txn.value
                  } else if (txn.transaction_type === '4') {
                    console.log(`[OrgProfile] Found expenditure: Year ${year}, Amount ${txn.value}`)
                    yearData.expenditures += txn.value
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
        }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('[OrgProfile] Activities request aborted')
            return
          }
          console.warn('Failed to fetch activities:', err)
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
      .reduce((sum, txn) => sum + txn.value, 0)
    
    // Calculate actual expenditures (type '4')
    const totalExpenditures = safeTransactions
      .filter(txn => txn.transaction_type === '4')
      .reduce((sum, txn) => sum + txn.value, 0)
    
    const totalTransactions = safeTransactions.reduce((sum, txn) => sum + txn.value, 0)
    
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
              <Button
                className="bg-slate-600 hover:bg-slate-700"
                onClick={() => router.push(`/organizations/${id}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Organization
              </Button>
            </div>
          </div>

          {/* Organization Header Card */}
          <Card className="mb-6 border-0 shadow-sm overflow-hidden">
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
                  <div className="flex items-start gap-4">
                {/* Logo */}
                {organization.logo && (
                  <div className="flex-shrink-0">
                    <img 
                      src={organization.logo} 
                      alt={`${organization.name} logo`}
                      className="w-20 h-20 rounded-lg object-cover border border-slate-200"
                    />
                  </div>
                )}

                {/* Organization Info */}
                <div className="flex-1">
                      <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        {organization.name}
                        {organization.acronym && <span className="text-3xl font-bold text-slate-900"> ({organization.acronym})</span>}
                      </h1>
                      
                      {/* Aggregation Helper Text */}
                      {activities.length > 0 && (
                        <p className="text-sm text-slate-500 mb-3">
                          This page aggregates data across {activities.length} activities where this organisation participates
                        </p>
                      )}
                      
                      <div className="flex flex-col gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {organization.iati_org_id && (
                            <CopyableIdentifier value={organization.iati_org_id} />
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
                          {organization.default_currency && (
                            <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">
                              {organization.default_currency}
                            </Badge>
                          )}
                        {organization.country && (
                            <Badge variant="outline" className="border-slate-300 text-slate-700 flex flex-col items-center gap-0.5">
                            {getCountryCode(organization.country) && (
                              <Flag 
                                code={getCountryCode(organization.country)!} 
                                  style={{ width: '16px', height: '12px' }} 
                              />
                            )}
                              <span className="text-xs">{organization.country}</span>
                            </Badge>
                        )}
                        </div>
                      </div>
                      
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

                {/* Temporal Metadata Sub-Card - Column 4 */}
                <div className="lg:col-span-1">
                  <div className="bg-white">
                    <div className="space-y-3">
                      {temporalMetadata?.firstActivityDate && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
                          <Calendar className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="text-slate-500">First activity:</span>
                          <span className="font-medium text-slate-900">{formatDate(temporalMetadata.firstActivityDate)}</span>
                        </div>
                      )}
                      {temporalMetadata?.mostRecentTransaction && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
                          <Calendar className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="text-slate-500">Most recent transaction:</span>
                          <span className="font-medium text-slate-900">{formatDate(temporalMetadata.mostRecentTransaction)}</span>
                        </div>
                      )}
                      {temporalMetadata?.lastDataUpdate && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
                          <Calendar className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="text-slate-500">Last data update:</span>
                          <span className="font-medium text-slate-900">{formatDate(temporalMetadata.lastDataUpdate)}</span>
                        </div>
                      )}
                      {temporalMetadata?.defaultCurrency && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
                          <DollarSign className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="text-slate-500">Default currency:</span>
                          <span className="font-medium text-slate-900">{temporalMetadata.defaultCurrency}</span>
                        </div>
                      )}
                      
                      {/* Collapsible Contact Information */}
                      {(organization.website || organization.email || organization.phone || organization.address || 
                        organization.twitter || organization.facebook || organization.linkedin || organization.instagram || organization.youtube) && (
                        <div className="pt-3 border-t border-slate-200">
                          <button
                            onClick={() => setShowContactInfo(!showContactInfo)}
                            className="flex items-center justify-between w-full text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors mb-2"
                          >
                            <span>Contact Information</span>
                            {showContactInfo ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                          {showContactInfo && (
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
                              
                              {/* Social Media Links */}
                              {(organization.twitter || organization.facebook || organization.linkedin || organization.instagram || organization.youtube) && (
                                <div className="pt-2 border-t border-slate-100">
                                  <div className="flex flex-wrap gap-2">
                                    {organization.twitter && (
                                      <a
                                        href={organization.twitter.startsWith('http') ? organization.twitter : `https://twitter.com/${organization.twitter}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white transition-colors"
                                        title="Twitter/X"
                                      >
                                        <Twitter className="h-3 w-3" />
                                      </a>
                                    )}
                                    {organization.facebook && (
                                      <a
                                        href={organization.facebook.startsWith('http') ? organization.facebook : `https://facebook.com/${organization.facebook}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-colors"
                                        title="Facebook"
                                      >
                                        <Facebook className="h-3 w-3" />
                                      </a>
                                    )}
                                    {organization.linkedin && (
                                      <a
                                        href={organization.linkedin.startsWith('http') ? organization.linkedin : `https://linkedin.com/company/${organization.linkedin}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-700 hover:text-white transition-colors"
                                        title="LinkedIn"
                                      >
                                        <Linkedin className="h-3 w-3" />
                                      </a>
                                    )}
                                    {organization.instagram && (
                                      <a
                                        href={organization.instagram.startsWith('http') ? organization.instagram : `https://instagram.com/${organization.instagram}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-600 hover:text-white transition-colors"
                                        title="Instagram"
                                      >
                                        <Instagram className="h-3 w-3" />
                                      </a>
                                    )}
                                    {organization.youtube && (
                                      <a
                                        href={organization.youtube.startsWith('http') ? organization.youtube : `https://youtube.com/${organization.youtube}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 hover:bg-red-600 hover:text-white transition-colors"
                                        title="YouTube"
                                      >
                                        <Youtube className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary Cards - Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Active Activities Card */}
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 w-full">
                    <div>
                      <p className="text-xs font-medium text-slate-600">Total Active Activities</p>
                      <p className="text-lg font-bold text-slate-900">{totals.activeActivities}</p>
                    </div>
                    <div className="border-t border-slate-200 pt-2">
                      <p className="text-xs text-slate-500">of {totals.totalActivities} total</p>
                    </div>
                  </div>
                  <Activity className="h-6 w-6 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            {/* Total Portfolio Value Card */}
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 w-full">
                    <div>
                      <p className="text-xs font-medium text-slate-600">Total Portfolio Value</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatCurrency(totals.totalPortfolioValue || totals.totalBudget, organization.default_currency)}
                      </p>
                    </div>
                    <div className="border-t border-slate-200 pt-2">
                      <p className="text-xs text-slate-500">(commitments)</p>
                    </div>
                  </div>
                  <DollarSign className="h-6 w-6 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            {/* Total Disbursed Card */}
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 w-full">
                    <div>
                      <p className="text-xs font-medium text-slate-600">Total Disbursed</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatCurrency(totals.totalDisbursements, organization.default_currency)}
                      </p>
                    </div>
                  </div>
                  <DollarSign className="h-6 w-6 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            {/* Total Expended Card */}
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 w-full">
                    <div>
                      <p className="text-xs font-medium text-slate-600">Total Expended</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatCurrency(totals.totalExpenditures, organization.default_currency)}
                      </p>
                    </div>
                  </div>
                  <DollarSign className="h-6 w-6 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Role-Aware KPI Cards - Row 2 */}
          {roleMetrics && roleDistribution && (
            roleMetrics.isFundingOrg ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 w-full">
                        <div>
                          <p className="text-xs font-medium text-slate-600">Total Outbound Funding</p>
                          <p className="text-lg font-bold text-slate-900">
                            {formatCurrency(roleMetrics.totalOutboundFunding || 0, organization.default_currency)}
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
                          <p className="text-xs font-medium text-slate-600">Implementing Partners</p>
                          <p className="text-lg font-bold text-slate-900">
                            {roleMetrics.uniqueImplementingPartners || 0}
                          </p>
                        </div>
                      </div>
                      <Users className="h-6 w-6 text-slate-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 w-full">
                        <div>
                          <p className="text-xs font-medium text-slate-600">% Funds Disbursed</p>
                          <p className="text-lg font-bold text-slate-900">
                            {roleMetrics.disbursementVsCommitmentRate?.toFixed(1) || '0.0'}%
                          </p>
                        </div>
                      </div>
                      <TrendingUp className="h-6 w-6 text-slate-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 w-full">
                        <div>
                          <p className="text-xs font-medium text-slate-600">Total Inbound Funding</p>
                          <p className="text-lg font-bold text-slate-900">
                            {formatCurrency(roleMetrics.totalInboundFunding || 0, organization.default_currency)}
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
                          <p className="text-xs font-medium text-slate-600">Number of Donors</p>
                          <p className="text-lg font-bold text-slate-900">
                            {roleMetrics.uniqueDonors || 0}
                          </p>
                        </div>
                      </div>
                      <Users className="h-6 w-6 text-slate-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 w-full">
                        <div>
                          <p className="text-xs font-medium text-slate-600">Average Activity Size</p>
                          <p className="text-lg font-bold text-slate-900">
                            {formatCurrency(roleMetrics.averageActivitySize || 0, organization.default_currency)}
                          </p>
                        </div>
                      </div>
                      <TrendingUp className="h-6 w-6 text-slate-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          )}

          {/* Organisation Health Card */}
          {healthMetrics && (
            <div className="mb-6">
              <OrganisationHealthCard healthMetrics={healthMetrics} />
            </div>
          )}

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
                      <div className="h-24 overflow-auto">
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
                    <div className="h-24 relative group">
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
                          
                          {/* Line chart */}
                          <polyline
                            fill="none"
                            stroke="#475569"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={years.map((year, index) => {
                              const x = (index / (years.length - 1)) * 280 + 10
                              const y = 90 - (projectsByYear[year].count / maxCount) * 70
                              return `${x},${y}`
                            }).join(' ')}
                          />
                          
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
                            className="absolute bg-white border border-gray-200 rounded shadow-lg px-3 py-2 pointer-events-none z-10"
                            style={{
                              left: `${(hoveredPoint.x / 300) * 100}%`,
                              top: `${(hoveredPoint.y / 100) * 100 - 30}%`,
                              transform: 'translateX(-50%)'
                            }}
                          >
                            <div className="text-xs font-semibold text-slate-900 mb-1">{hoveredPoint.year}</div>
                            <div className="text-xs text-slate-600">Active activities: {hoveredPoint.count}</div>
                            <div className="text-xs text-slate-600">Total value: {formatCurrencyShort(hoveredPoint.totalValue)}</div>
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
                    <div className="h-24 overflow-auto">
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
                  <div className="h-24 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
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
                          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                        />
                        <RechartsTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                                  <p className="text-sm font-semibold">{payload[0].payload.year}</p>
                                  <p className="text-sm text-gray-600">{formatCurrencyShort(payload[0].value as number)}</p>
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
                {/* Metric Toggle Buttons */}
                <div className="flex gap-1 mt-2">
                  <Button
                    variant={budgetVsActualsMetric === 'commitments' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBudgetVsActualsMetric('commitments')}
                    className={`h-6 text-xs ${budgetVsActualsMetric === 'commitments' ? 'bg-slate-900 text-white' : ''}`}
                  >
                    Commitments
                  </Button>
                  <Button
                    variant={budgetVsActualsMetric === 'disbursements' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBudgetVsActualsMetric('disbursements')}
                    className={`h-6 text-xs ${budgetVsActualsMetric === 'disbursements' ? 'bg-slate-900 text-white' : ''}`}
                  >
                    Disbursements
                  </Button>
                  <Button
                    variant={budgetVsActualsMetric === 'expenditure' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBudgetVsActualsMetric('expenditure')}
                    className={`h-6 text-xs ${budgetVsActualsMetric === 'expenditure' ? 'bg-slate-900 text-white' : ''}`}
                  >
                    Expenditure
                  </Button>
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
                      <div className="h-24 overflow-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-1 text-slate-600 font-medium">Year</th>
                              <th className="text-right py-1 text-slate-600 font-medium">Planned</th>
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
                    <div className="h-24 -mx-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 5, left: 0, bottom: 5 }} barCategoryGap="5%" barGap={0}>
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
                            tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                          />
                          <RechartsTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                                    <p className="text-sm font-semibold mb-1">{payload[0].payload.year}</p>
                                    <div className="space-y-1 text-xs">
                                      <p className="text-slate-700">Planned Disbursements: {formatCurrencyShort(payload[0].payload.plannedDisbursements)}</p>
                                      <p className="text-slate-700">Disbursements: {formatCurrencyShort(payload[0].payload.disbursements)}</p>
                                      <p className="text-slate-700">Expenditures: {formatCurrencyShort(payload[0].payload.expenditures)}</p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="plannedDisbursements" fill="#94a3b8" name="Planned Disbursements" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="disbursements" stackId="actuals" fill="#1e40af" name="Disbursements" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="expenditures" stackId="actuals" fill="#0f172a" name="Expenditures" radius={[4, 4, 0, 0]} />
                        </BarChart>
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
                    {modalityView === 'chart' ? <TableIcon className="h-3 w-3" /> : <PieChart className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const total = modalityComposition.reduce((sum, item) => sum + item.value, 0)
                      const data = modalityComposition.map(item => ({
                        finance_type: item.name,
                        [modalityViewMode === 'value' ? 'value' : 'activities']: item.value,
                        percentage: ((item.value / total) * 100).toFixed(1)
                      }))
                      exportToCSV(data, 'aid-modality-composition.csv', [
                        'Finance_Type', 
                        modalityViewMode === 'value' ? 'Value' : 'Activities', 
                        'Percentage'
                      ])
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  </div>
                </div>
                {/* View Mode Toggle */}
                <div className="flex gap-1 mt-2">
                  <Button
                    variant={modalityViewMode === 'value' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setModalityViewMode('value')}
                    className={`h-6 text-xs ${modalityViewMode === 'value' ? 'bg-slate-900 text-white' : ''}`}
                  >
                    By Value
                  </Button>
                  <Button
                    variant={modalityViewMode === 'count' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setModalityViewMode('count')}
                    className={`h-6 text-xs ${modalityViewMode === 'count' ? 'bg-slate-900 text-white' : ''}`}
                  >
                    By Number of Activities
                  </Button>
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
                            <th className="text-right py-1 text-slate-600 font-medium">
                              {modalityViewMode === 'value' ? 'Value' : 'Activities'}
                            </th>
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
                                  {modalityViewMode === 'value' ? formatCurrencyShort(item.value) : item.value}
                                </td>
                                <td className="text-right py-1 text-slate-700">{percentage}%</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                </div>
                  ) : (
                  <div className="h-24 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={modalityComposition}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {modalityComposition.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              const total = modalityComposition.reduce((sum, item) => sum + item.value, 0)
                              const percentage = ((data.value / total) * 100).toFixed(1)
                              return (
                                <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                                  <p className="text-sm font-semibold">{data.name}</p>
                                  <p className="text-xs text-slate-600">
                                    {modalityViewMode === 'value' 
                                      ? `${formatCurrencyShort(data.value)} (${percentage}%)`
                                      : `${data.value} activities (${percentage}%)`}
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
                ) : (
                  <div className="h-24 flex items-center justify-center text-slate-400 text-xs">
                    <p>No finance type data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Card className="border-slate-200">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap">
                <TabsTrigger value="activities" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Activities
                </TabsTrigger>
                <TabsTrigger value="financial-analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Financial Analytics
                </TabsTrigger>
                <TabsTrigger value="organisation-funding" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Organisation Funding
                </TabsTrigger>
                <TabsTrigger value="sectors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Sectors
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
                  <Card className="border-slate-200">
                    <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-slate-900">Activities Portfolio</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant={activitiesView === 'card' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setActivitiesView('card')}
                          className={activitiesView === 'card' ? 'bg-slate-900' : ''}
                        >
                          <LayoutGrid className="h-4 w-4 mr-2" />
                          Card
                        </Button>
                        <Button
                          variant={activitiesView === 'table' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setActivitiesView('table')}
                          className={activitiesView === 'table' ? 'bg-slate-900' : ''}
                        >
                          <TableIcon className="h-4 w-4 mr-2" />
                          Table
                        </Button>
                      </div>
                    </div>
                    </CardHeader>
                  <CardContent>
                    {activities.length > 0 ? (
                      activitiesView === 'card' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {activities
                            .filter(activity => activity.title && activity.title.trim() !== '')
                            .sort((a, b) => {
                              // Sort by updated_at descending (most recent first)
                              const aDate = a.updated_at ? new Date(a.updated_at).getTime() : 0
                              const bDate = b.updated_at ? new Date(b.updated_at).getTime() : 0
                              return bDate - aDate
                            })
                            .map((activity) => (
                            <Card key={activity.id} className="border-slate-200 hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h3 className="font-medium text-slate-900 text-sm leading-tight">{activity.title}</h3>
                                      {activity.acronym && (
                                        <p className="text-xs text-slate-600 mt-1 font-mono">{activity.acronym}</p>
                                      )}
                                      
                                      {/* Activity ID and IATI ID under title */}
                                      {(activity.id || activity.iati_identifier) && (
                                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                                          {activity.id}
                                          {activity.id && activity.iati_identifier && '  •  '}
                                          {activity.iati_identifier && (
                                            <span className="text-slate-400">{activity.iati_identifier}</span>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Status with number and label */}
                                      <div className="mt-2">
                                        <div className="flex items-center gap-1.5">
                                          <code className="inline-block text-xs bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-800 font-bold">
                                            {activity.activity_status}
                                          </code>
                                          <span className="text-xs text-slate-700 font-medium">
                                            {getActivityStatusLabel(activity.activity_status)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          size="icon" 
                                          className="h-8 w-8"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            router.push(`/activities/${activity.id}`)
                                          }}
                                        >
                                          <ExternalLink className="mr-2 h-4 w-4" />
                                          View
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleEditActivity(activity.id)
                                          }}
                                        >
                                          <Edit2 className="mr-2 h-4 w-4" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setDeleteActivityId(activity.id)
                                          }}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  
                                  {activity.description && (
                                    <p className="text-xs text-slate-600 line-clamp-2">{activity.description}</p>
                                  )}
                                  
                                  <div className="space-y-2 text-xs border-t border-slate-100 pt-2">
                                    
                                    {/* Dates - More prominent with labels based on status */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <p className="text-slate-500 font-medium flex items-center gap-1">
                                                {activity.activity_status === '1' ? 'Planned Start' : 'Start Date'}
                                                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-slate-300 text-slate-600 text-[8px] cursor-help">?</span>
                                              </p>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                              <p className="text-xs">
                                                {activity.activity_status === '1' 
                                                  ? 'Shows planned start date for pipeline activities'
                                                  : 'Shows actual start date when available, otherwise falls back to planned start date'}
                                              </p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        <p className="text-slate-900">
                                          {(() => {
                                            const date = activity.activity_status === '1' 
                                              ? activity.planned_start_date 
                                              : (activity.actual_start_date || activity.planned_start_date);
                                            return date ? new Date(date).toLocaleDateString() : '-';
                                          })()}
                                        </p>
                                      </div>
                                      <div>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <p className="text-slate-500 font-medium flex items-center gap-1">
                                                {activity.activity_status === '1' ? 'Planned End' : 'End Date'}
                                                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-slate-300 text-slate-600 text-[8px] cursor-help">?</span>
                                              </p>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                              <p className="text-xs">
                                                {activity.activity_status === '1' 
                                                  ? 'Shows planned end date for pipeline activities'
                                                  : 'Shows actual end date when available, otherwise falls back to planned end date'}
                                              </p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        <p className="text-slate-900">
                                          {(() => {
                                            const date = activity.activity_status === '1' 
                                              ? activity.planned_end_date 
                                              : (activity.actual_end_date || activity.planned_end_date);
                                            return date ? new Date(date).toLocaleDateString() : '-';
                                          })()}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {/* Budget Information */}
                                    <div className="space-y-1 pt-1 border-t border-slate-100">
                                      {activity.totalPlannedBudgetUSD ? (
                                        <div>
                                          <p className="text-slate-500 font-medium">Total Budget</p>
                                          <p className="text-slate-900 font-semibold">
                                            {formatCurrency(activity.totalPlannedBudgetUSD, 'USD')}
                                          </p>
                                        </div>
                                      ) : activity.total_budget ? (
                                        <div>
                                          <p className="text-slate-500 font-medium">Total Budget</p>
                                          <p className="text-slate-900 font-semibold">
                                            {formatCurrency(activity.total_budget, activity.currency)}
                                          </p>
                                        </div>
                                      ) : null}
                                      
                                      {activity.total_disbursed && (
                                        <div>
                                          <p className="text-slate-500 font-medium">Disbursed</p>
                                          <p className="text-slate-900">
                                            {formatCurrency(activity.total_disbursed, activity.currency)}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Default Modality */}
                                    {activity.default_modality && (
                                      <div className="pt-1 border-t border-slate-100">
                                        <p className="text-slate-500 font-medium">Modality</p>
                                        <p className="text-slate-900">{activity.default_modality}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead className="text-right">Total Budget</TableHead>
                              <TableHead className="text-right">Disbursed</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activities.map((activity) => (
                              <TableRow key={activity.id}>
                                <TableCell className="font-medium">
                                  <div className="space-y-1">
                                    <div>
                                      {activity.title}
                                      {activity.acronym && (
                                        <span className="text-slate-500 text-xs ml-2">({activity.acronym})</span>
                                      )}
                                    </div>
                                    {/* Activity ID and IATI ID under title */}
                                    {(activity.id || activity.iati_identifier) && (
                                      <div className="text-xs text-slate-500 line-clamp-1">
                                        {activity.id}
                                        {activity.id && activity.iati_identifier && '  •  '}
                                        {activity.iati_identifier && (
                                          <span className="text-slate-400">{activity.iati_identifier}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <code className="inline-block text-xs bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-800 font-bold">
                                      {activity.activity_status}
                                    </code>
                                    <span className="text-xs text-slate-700">
                                      {getActivityStatusLabel(activity.activity_status)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const date = activity.activity_status === '1' 
                                      ? activity.planned_start_date 
                                      : (activity.actual_start_date || activity.planned_start_date);
                                    return date ? new Date(date).toLocaleDateString() : '-';
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const date = activity.activity_status === '1' 
                                      ? activity.planned_end_date 
                                      : (activity.actual_end_date || activity.planned_end_date);
                                    return date ? new Date(date).toLocaleDateString() : '-';
                                  })()}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {activity.totalPlannedBudgetUSD 
                                    ? formatCurrency(activity.totalPlannedBudgetUSD, 'USD')
                                    : activity.total_budget 
                                    ? formatCurrency(activity.total_budget, activity.currency) 
                                    : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {activity.total_disbursed ? formatCurrency(activity.total_disbursed, activity.currency) : '-'}
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

              <TabsContent value="financial-analytics" className="p-6">
                <div className="space-y-6">
                  {/* Organization Analytics Component */}
                  {params?.id && (
                    <OrganizationAnalytics
                      organizationId={params.id as string}
                      currency={organization.default_currency || 'USD'}
                    />
                  )}
                  
                  {/* Financial Transactions */}
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Financial Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(transactions || []).length > 0 ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="p-4 border border-slate-200 rounded-lg">
                              <p className="text-sm font-medium text-slate-600">Total Commitments</p>
                              <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(
                                  (transactions || []).filter(t => ['1', '2'].includes(t.transaction_type)).reduce((sum, t) => sum + t.value, 0),
                                  organization?.default_currency || 'USD'
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(transactions || []).filter(t => ['1', '2'].includes(t.transaction_type)).length} transactions
                              </p>
                            </div>
                            <div className="p-4 border border-slate-200 rounded-lg">
                              <p className="text-sm font-medium text-slate-600">Total Disbursements</p>
                              <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(
                                  (transactions || []).filter(t => t.transaction_type === '3').reduce((sum, t) => sum + t.value, 0),
                                  organization?.default_currency || 'USD'
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(transactions || []).filter(t => t.transaction_type === '3').length} transactions
                              </p>
                            </div>
                            <div className="p-4 border border-slate-200 rounded-lg">
                              <p className="text-sm font-medium text-slate-600">Total Expenditures</p>
                              <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(
                                  (transactions || []).filter(t => t.transaction_type === '4').reduce((sum, t) => sum + t.value, 0),
                                  organization?.default_currency || 'USD'
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(transactions || []).filter(t => t.transaction_type === '4').length} transactions
                              </p>
                            </div>
                          </div>
                          
                          {/* Transaction Table */}
                          <div className="rounded-md border overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                  <TableHead>Currency</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {transactions.slice(0, 50).map((transaction) => (
                                  <TableRow key={transaction.id}>
                                    <TableCell>{transaction.transaction_date ? formatDate(transaction.transaction_date) : '-'}</TableCell>
                                    <TableCell>
                                      {transaction.transaction_type === '1' ? 'Incoming Commitment' :
                                       transaction.transaction_type === '2' ? 'Outgoing Commitment' :
                                       transaction.transaction_type === '3' ? 'Disbursement' :
                                       transaction.transaction_type === '4' ? 'Expenditure' :
                                       transaction.transaction_type}
                                    </TableCell>
                                    <TableCell className="max-w-md truncate">{transaction.description || '-'}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(transaction.value || 0, transaction.currency || 'USD')}</TableCell>
                                    <TableCell>{transaction.currency || '-'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          {transactions.length > 50 && (
                            <p className="text-sm text-slate-500 text-center">Showing first 50 transactions</p>
                          )}
                          <div className="text-center py-4">
                            <Button 
                              variant="outline" 
                              onClick={() => params?.id && router.push(`/transactions?org_id=${params.id}`)}
                            >
                              View All Transactions
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500">No transactions found</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="organisation-funding" className="p-6">
                {params?.id && (
                  <OrganizationFundingAnalytics
                    organizationId={params.id as string}
                    organizationName={organization?.name}
                  />
                )}
              </TabsContent>

              <TabsContent value="sectors" className="p-6">
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
              </TabsContent>

              <TabsContent value="partnerships" className="p-6">
                {params?.id && activitiesWithPartnerData.length > 0 ? (
                  <PartnershipNetwork
                    organizationId={params.id as string}
                    activities={activitiesWithPartnerData}
                    allOrganizations={partnerOrganizations}
                  />
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
              </TabsContent>

              <TabsContent value="geography" className="p-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Geographic Footprint</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">Geographic footprint feature coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contacts" className="p-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Organization Contacts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No contacts available</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="p-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(organizationDocuments.length > 0 || activityDocuments.length > 0) ? (
                      <div className="space-y-6">
                        {/* Organization Documents */}
                        {organizationDocuments.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-3">Organisation Documents</h3>
                            <div className="space-y-2">
                              {organizationDocuments.map((doc, index) => (
                                <div key={index} className="p-3 border border-slate-200 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-slate-600" />
                                      <span className="text-sm font-medium text-slate-900">
                                        {doc.title || doc.filename || 'Untitled Document'}
                                      </span>
                                      <Badge variant="outline" className="text-xs">Organisation Document</Badge>
                                    </div>
                                    {doc.url && (
                                      <a 
                                        href={doc.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    )}
                                  </div>
                                  {doc.description && (
                                    <p className="text-xs text-slate-600 mt-1">{doc.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Activity Documents */}
                        {activityDocuments.map((activityDoc) => (
                          <div key={activityDoc.activityId}>
                            <h3 className="text-sm font-semibold text-slate-900 mb-3">
                              From Activity: {activityDoc.activityTitle}
                            </h3>
                            <div className="space-y-2">
                              {activityDoc.documents.map((doc: any, index: number) => (
                                <div key={index} className="p-3 border border-slate-200 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-slate-600" />
                                      <span className="text-sm font-medium text-slate-900">
                                        {doc.title || doc.filename || 'Untitled Document'}
                                      </span>
                                    </div>
                                    {doc.url && (
                                      <a 
                                        href={doc.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    )}
                                  </div>
                                  {doc.description && (
                                    <p className="text-xs text-slate-600 mt-1">{doc.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
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