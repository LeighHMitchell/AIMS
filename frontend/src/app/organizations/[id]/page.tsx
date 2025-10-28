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
import { SectorAllocationChart } from '@/components/organizations/SectorAllocationChart'
import { EditOrganizationModal } from '@/components/organizations/EditOrganizationModal'
import { OrganizationAnalytics } from '@/components/organizations/analytics/OrganizationAnalytics'
import SectorSunburstVisualization from '@/components/charts/SectorSunburstVisualization'
import SectorSankeyVisualization from '@/components/charts/SectorSankeyVisualization'
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
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('activities')
  const [activitiesView, setActivitiesView] = useState<'card' | 'table'>('card')
  const [hoveredPoint, setHoveredPoint] = useState<{year: number, count: number, x: number, y: number} | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [budgetsByYear, setBudgetsByYear] = useState<Array<{ year: number; amount: number }>>([])
  const [plannedDisbursementsByYear, setPlannedDisbursementsByYear] = useState<Array<{ year: number; amount: number }>>([])
  const [disbursementsByYear, setDisbursementsByYear] = useState<Array<{ year: number; disbursements: number; expenditures: number }>>([])
  const [sectorAllocations, setSectorAllocations] = useState<Array<{ code: string; name: string; percentage: number }>>([])
  const [sectorVisualizationTab, setSectorVisualizationTab] = useState<'sankey' | 'sunburst'>('sankey')
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [modalityComposition, setModalityComposition] = useState<Array<{ name: string; value: number; color: string }>>([])
  const [timelineView, setTimelineView] = useState<'chart' | 'table'>('chart')
  const [budgetView, setBudgetView] = useState<'chart' | 'table'>('chart')
  const [budgetVsActualsView, setBudgetVsActualsView] = useState<'chart' | 'table'>('chart')
  const [modalityView, setModalityView] = useState<'chart' | 'table'>('chart')

  
  // AbortController ref for race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null)

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
            
            // Calculate finance type composition from all activities
            const financeTypeMap = new Map<string, number>()
            
            console.log('[OrgProfile] Processing activities for finance types:', activitiesWithBudgets.length)
            console.log('[OrgProfile] Sample activity:', activitiesWithBudgets[0])
            
            for (const activity of activitiesWithBudgets) {
              const financeType = activity.defaultFinanceType
              console.log('[OrgProfile] Activity finance type:', { id: activity.id, financeType })
              
              if (financeType) {
                const label = financeTypeLabels[financeType] || `Type ${financeType}`
                const currentCount = financeTypeMap.get(label) || 0
                financeTypeMap.set(label, currentCount + 1)
              }
            }
            
            console.log('[OrgProfile] Finance type composition:', Array.from(financeTypeMap.entries()))
            
            // Define colors for different finance types (dark blues/slates palette)
            const colors = [
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
            
            // Convert to array format for pie chart
            const modalityData = Array.from(financeTypeMap.entries())
              .map(([name, count], index) => ({
                name,
                value: count,
                color: colors[index % colors.length]
              }))
              .sort((a, b) => b.value - a.value)
            
            setModalityComposition(modalityData)
            
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

  const calculateTotals = () => {
    // Calculate budget from commitment transactions (types '1' = Incoming Commitment, '2' = Outgoing Commitment)
    const budgetFromTransactions = transactions
      .filter(txn => ['1', '2'].includes(txn.transaction_type))
      .reduce((sum, txn) => sum + txn.value, 0)
    
    // Calculate budget from activity budgets (activity_budgets table) - only for published activities
    const budgetFromActivities = activities
      .filter(activity => activity.publication_status === 'published')
      .reduce((sum, activity) => sum + (activity.totalPlannedBudgetUSD || 0), 0)
    
    // Use activity budgets if available, otherwise fall back to transaction-based budgets
    const totalBudget = budgetFromActivities > 0 ? budgetFromActivities : budgetFromTransactions
    
    // Calculate total planned disbursements from plannedDisbursementsByYear
    const totalPlannedDisbursements = plannedDisbursementsByYear.reduce((sum, item) => sum + item.amount, 0)
    
    // Calculate actual disbursements (type '3')
    const totalDisbursements = transactions
      .filter(txn => txn.transaction_type === '3')
      .reduce((sum, txn) => sum + txn.value, 0)
    
    // Calculate actual expenditures (type '4')
    const totalExpenditures = transactions
      .filter(txn => txn.transaction_type === '4')
      .reduce((sum, txn) => sum + txn.value, 0)
    
    const totalTransactions = transactions.reduce((sum, txn) => sum + txn.value, 0)
    
    return {
      totalBudget,
      totalPlannedDisbursements,
      totalDisbursements,
      totalExpenditures,
      totalTransactions,
      activeActivities: activities.filter(a => ['2', '3'].includes(a.activity_status)).length, // 2=Implementation, 3=Finalisation
      totalActivities: activities.length
    }
  }

  const calculateActiveProjectsByYear = () => {
    const years = [2020, 2021, 2022, 2023, 2024, 2025]
    const projectsByYear: Record<number, number> = {}
    
    // Get current active projects count to distribute across years
    const activeCount = activities.filter(a => ['2', '3'].includes(a.activity_status)).length
    
    years.forEach(year => {
      // For now, distribute active projects evenly across recent years
      // This is a simplified approach until we have proper date data
      if (year >= 2022 && year <= 2024) {
        projectsByYear[year] = Math.floor(activeCount / 3) + (year === 2023 ? activeCount % 3 : 0)
      } else {
        projectsByYear[year] = 0
      }
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

  const handleEditSuccess = async () => {
    // Refetch organization data after successful edit
    try {
      if (!params?.id) return
      
      const orgResponse = await fetch(`/api/organizations/${params.id}`)
      if (orgResponse.ok) {
        const orgData = await orgResponse.json()
        setOrganization(orgData)
      }
    } catch (err) {
      console.error('Failed to refresh organization data:', err)
    }
  }

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
          {/* Edit Organization Modal */}
          {organization && (
            <EditOrganizationModal
              organization={organization}
              open={editModalOpen}
              onOpenChange={setEditModalOpen}
              onSuccess={handleEditSuccess}
            />
          )}

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
            
            <div className="flex gap-2">
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100">
                <Download className="h-4 w-4 mr-2" />
                Export Profile
              </Button>
              <Button 
                className="bg-slate-600 hover:bg-slate-700"
                onClick={() => setEditModalOpen(true)}
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
                <div className="flex-shrink-0">
                  {organization.logo ? (
                    <img 
                      src={organization.logo} 
                      alt={`${organization.name} logo`}
                      className="w-20 h-20 rounded-lg object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                      <Building2 className="h-10 w-10 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Organization Info */}
                <div className="flex-1">
                      <h1 className="text-3xl font-bold text-slate-900 mb-3">
                        {organization.name}
                        {organization.acronym && <span className="text-3xl font-bold text-slate-900"> ({organization.acronym})</span>}
                      </h1>
                      
                      <div className="flex flex-col gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          {organization.iati_org_id && (
                            <code className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded font-mono">
                              {organization.iati_org_id}
                            </code>
                          )}
                          <Badge className={getTypeColor(organization.organisation_type)}>
                            {organization.organisation_type}
                          </Badge>
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

                {/* Contact Information Sub-Card - Column 4 */}
                <div className="lg:col-span-1">
                  <div className="bg-white p-4">
                    <div className="space-y-3">
                    {organization.website && (
                      <a 
                        href={organization.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <Globe className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm truncate">Website</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    )}
                    {organization.email && (
                      <a 
                        href={`mailto:${organization.email}`}
                          className="flex items-start gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                      >
                          <Mail className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span className="text-sm break-all">{organization.email}</span>
                      </a>
                    )}
                    {organization.phone && (
                      <a 
                        href={`tel:${organization.phone}`}
                          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                      >
                          <Phone className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{organization.phone}</span>
                      </a>
                    )}
                      {organization.address && (
                        <div className="flex items-start gap-2 text-slate-600">
                          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{organization.address}</span>
                      </div>
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
                              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white transition-colors"
                              title="Twitter/X"
                            >
                              <Twitter className="h-4 w-4" />
                            </a>
                          )}
                          {organization.facebook && (
                            <a
                              href={organization.facebook.startsWith('http') ? organization.facebook : `https://facebook.com/${organization.facebook}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-colors"
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
                              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-700 hover:text-white transition-colors"
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
                              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-600 hover:text-white transition-colors"
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
                              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-red-600 hover:text-white transition-colors"
                              title="YouTube"
                            >
                              <Youtube className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary Cards - Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Total Active Projects Card */}
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Active Projects</p>
                    <p className="text-2xl font-bold text-slate-900">{totals.activeActivities}</p>
                    <p className="text-xs text-slate-500">of {totals.totalActivities} total</p>
                  </div>
                  <Activity className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            {/* Total Budget Card */}
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Budget</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(totals.totalBudget, organization.default_currency)}
                    </p>
                    <p className="text-xs text-slate-500">across all activities</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            {/* Financial Actuals Card */}
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Planned Disbursements</p>
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(totals.totalPlannedDisbursements, organization.default_currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Disbursements</p>
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(totals.totalDisbursements, organization.default_currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Expenditures</p>
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(totals.totalExpenditures, organization.default_currency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Finance Type Summary Card */}
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="space-y-2">
                  {(() => {
                    // Calculate totals for Grants, Loans, and Other
                    const grantCodes = ['110', '111', '210', '211', '212', '422'] // Grant-related codes
                    const loanCodes = ['310', '311', '320', '410', '411', '421'] // Loan-related codes
                    
                    const totalGrants = modalityComposition
                      .filter(item => grantCodes.some(code => item.name.includes(financeTypeLabels[code as keyof typeof financeTypeLabels] || '')))
                      .reduce((sum, item) => sum + item.value, 0)
                    
                    const totalLoans = modalityComposition
                      .filter(item => loanCodes.some(code => item.name.includes(financeTypeLabels[code as keyof typeof financeTypeLabels] || '')))
                      .reduce((sum, item) => sum + item.value, 0)
                    
                    const totalOther = modalityComposition.reduce((sum, item) => sum + item.value, 0) - totalGrants - totalLoans
                    
                    return (
                      <>
                        <div>
                          <p className="text-xs font-medium text-slate-600">Total Grants</p>
                          <p className="text-sm font-bold text-slate-900">{totalGrants}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-600">Total Loans</p>
                          <p className="text-sm font-bold text-slate-900">{totalLoans}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-600">Other</p>
                          <p className="text-sm font-bold text-slate-900">{totalOther}</p>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section - Row 2: Chart Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Active Projects Timeline Chart */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900">Projects Timeline</CardTitle>
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
                      const data = Object.entries(projectsByYear).map(([year, projects]) => ({
                        year: parseInt(year),
                        projects
                      }))
                      exportToCSV(data, 'projects-timeline.csv', ['Year', 'Projects'])
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                  {(() => {
                    const projectsByYear = calculateActiveProjectsByYear()
                    const years = Object.keys(projectsByYear).map(Number).sort()
                    const maxProjects = Math.max(...Object.values(projectsByYear), 1)
                    
                  if (timelineView === 'table') {
                    return (
                      <div className="h-40 overflow-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-1 text-slate-600 font-medium">Year</th>
                              <th className="text-right py-1 text-slate-600 font-medium">Projects</th>
                            </tr>
                          </thead>
                          <tbody>
                            {years.map((year) => (
                              <tr key={year} className="border-b border-slate-100">
                                <td className="py-1 text-slate-900">{year}</td>
                                <td className="text-right py-1 text-slate-900 font-medium">{projectsByYear[year]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="h-40 relative group">
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
                              const y = 90 - (projectsByYear[year] / maxProjects) * 70
                              return `${x},${y}`
                            }).join(' ')}
                          />
                          
                          {/* Data points with hover areas */}
                          {years.map((year, index) => {
                            const x = (index / (years.length - 1)) * 280 + 10
                            const y = 90 - (projectsByYear[year] / maxProjects) * 70
                            return (
                              <g key={year}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="8"
                                  fill="transparent"
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredPoint({year, count: projectsByYear[year], x, y})}
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
                            className="absolute bg-slate-900 text-white text-xs px-2 py-1 rounded pointer-events-none"
                            style={{
                              left: `${(hoveredPoint.x / 300) * 100}%`,
                              top: `${(hoveredPoint.y / 100) * 100 - 30}%`,
                              transform: 'translateX(-50%)'
                            }}
                          >
                            {hoveredPoint.year}: {hoveredPoint.count} projects
                          </div>
                        )}
                    </div>
                    )
                  })()}
              </CardContent>
            </Card>

            {/* Budget by Year Chart */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900">Budget by Year</CardTitle>
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
              <CardContent>
                {budgetsByYear.length > 0 ? (
                  budgetView === 'table' ? (
                    <div className="h-40 overflow-auto">
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
                              <td className="text-right py-1 text-slate-900 font-medium">{formatCurrency(item.amount, 'USD')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                  <div className="h-40 -mx-2">
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
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <RechartsTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                                  <p className="text-sm font-semibold">{payload[0].payload.year}</p>
                                  <p className="text-sm text-gray-600">{formatCurrency(payload[0].value as number, 'USD')}</p>
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
                  <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
                    <p>No data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expenditure Trend */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900">Budget vs Actuals</CardTitle>
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
              </CardHeader>
              <CardContent>
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
                      <div className="h-40 overflow-auto">
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
                                <td className="text-right py-1 text-slate-700">{formatCurrency(item.plannedDisbursements, 'USD')}</td>
                                <td className="text-right py-1 text-slate-900 font-medium">{formatCurrency(item.disbursements, 'USD')}</td>
                                <td className="text-right py-1 text-slate-900 font-medium">{formatCurrency(item.expenditures, 'USD')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) :
                    <div className="h-40 -mx-2">
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
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          />
                          <RechartsTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                                    <p className="text-sm font-semibold mb-1">{payload[0].payload.year}</p>
                                    <div className="space-y-1 text-xs">
                                      <p className="text-slate-700">Planned Disbursements: {formatCurrency(payload[0].payload.plannedDisbursements, 'USD')}</p>
                                      <p className="text-slate-700">Disbursements: {formatCurrency(payload[0].payload.disbursements, 'USD')}</p>
                                      <p className="text-slate-700">Expenditures: {formatCurrency(payload[0].payload.expenditures, 'USD')}</p>
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
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900">Aid Modality Composition</CardTitle>
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
                        activities: item.value,
                        percentage: ((item.value / total) * 100).toFixed(1)
                      }))
                      exportToCSV(data, 'aid-modality-composition.csv', ['Finance_Type', 'Activities', 'Percentage'])
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {modalityComposition.length > 0 ? (
                  modalityView === 'table' ? (
                    <div className="h-40 overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-1 text-slate-600 font-medium">Finance Type</th>
                            <th className="text-right py-1 text-slate-600 font-medium">Activities</th>
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
                                <td className="text-right py-1 text-slate-900 font-medium">{item.value}</td>
                                <td className="text-right py-1 text-slate-700">{percentage}%</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                </div>
                  ) : (
                  <div className="h-40 flex items-center justify-center">
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
                                  <p className="text-xs text-slate-600">{data.value} activities ({percentage}%)</p>
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
                  <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
                    <p>No finance type data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Card className="border-slate-200">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-8 lg:grid-cols-8 bg-slate-50 border-b border-slate-200">
                <TabsTrigger value="activities" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Activities
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="sectors" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Sectors
                </TabsTrigger>
                <TabsTrigger value="finances" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Finances
                </TabsTrigger>
                <TabsTrigger value="partnerships" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Partnerships
                </TabsTrigger>
                <TabsTrigger value="geography" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Geography
                </TabsTrigger>
                <TabsTrigger value="contacts" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Contacts
                </TabsTrigger>
                <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
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
                          {activities.filter(activity => activity.title && activity.title.trim() !== '').map((activity) => (
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
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-slate-600 hover:text-slate-900 flex-shrink-0"
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
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-slate-600 hover:text-slate-900"
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

              <TabsContent value="analytics" className="p-0">
                {params?.id && (
                  <OrganizationAnalytics
                    organizationId={params.id as string}
                    currency={organization.default_currency || 'USD'}
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
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                          <TabsTrigger value="sankey">Sankey Flow</TabsTrigger>
                          <TabsTrigger value="sunburst">Sunburst</TabsTrigger>
                        </TabsList>
                        
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

              <TabsContent value="finances" className="p-6">
                <div className="grid grid-cols-1 gap-6">
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Financial Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {transactions.length > 0 ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="p-4 border border-slate-200 rounded-lg">
                              <p className="text-sm font-medium text-slate-600">Total Commitments</p>
                              <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(
                                  transactions.filter(t => ['1', '2'].includes(t.transaction_type)).reduce((sum, t) => sum + t.value, 0),
                                  organization.default_currency
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                {transactions.filter(t => ['1', '2'].includes(t.transaction_type)).length} transactions
                              </p>
                            </div>
                            <div className="p-4 border border-slate-200 rounded-lg">
                              <p className="text-sm font-medium text-slate-600">Total Disbursements</p>
                              <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(
                                  transactions.filter(t => t.transaction_type === '3').reduce((sum, t) => sum + t.value, 0),
                                  organization.default_currency
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                {transactions.filter(t => t.transaction_type === '3').length} transactions
                              </p>
                            </div>
                            <div className="p-4 border border-slate-200 rounded-lg">
                              <p className="text-sm font-medium text-slate-600">Total Expenditures</p>
                              <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(
                                  transactions.filter(t => t.transaction_type === '4').reduce((sum, t) => sum + t.value, 0),
                                  organization.default_currency
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                {transactions.filter(t => t.transaction_type === '4').length} transactions
                              </p>
                            </div>
                          </div>
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
                        <p className="text-slate-500 text-center py-4">No transaction data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="partnerships" className="p-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Partnership Network</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">Partnership network feature coming soon</p>
                    </div>
                  </CardContent>
                </Card>
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
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No documents available</p>
                    </div>
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