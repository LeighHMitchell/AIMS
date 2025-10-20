"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  User
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from '@/components/ui/skeleton'
import { getCountryCode } from '@/lib/country-utils'

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
  is_active?: boolean
  default_currency?: string
  default_language?: string
  secondary_reporter?: boolean
  active_project_count?: number
}

interface Budget {
  id: string
  type: 'total' | 'recipient-org' | 'recipient-country' | 'recipient-region'
  status: 'indicative' | 'committed'
  period_start: string
  period_end: string
  value: number
  currency: string
  recipient_name?: string
  recipient_code?: string
  narrative?: string
}

interface Expenditure {
  id: string
  year: string
  value: number
  currency: string
  description?: string
}

interface Activity {
  id: string
  title: string
  description?: string
  activity_status: string
  start_date?: string
  end_date?: string
  total_budget?: number
  total_disbursed?: number
  currency?: string
  sectors?: string[]
  acronym?: string
  iati_identifier?: string
  default_modality?: string
  logo?: string
}

interface Document {
  id: string
  title: string
  type: string
  url: string
  uploaded_at: string
  file_size?: number
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

interface Contact {
  id: string
  name: string
  title?: string
  email?: string
  phone?: string
  department?: string
}

interface Sector {
  id: string
  sector_name: string
  sector_code?: string
  percentage?: number
  activity_count: number
}

export default function OrganizationProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [expenditures, setExpenditures] = useState<Expenditure[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('activities')
  const [activitiesView, setActivitiesView] = useState<'card' | 'table'>('card')
  const [hoveredPoint, setHoveredPoint] = useState<{year: number, count: number, x: number, y: number} | null>(null)
  const [hoveredBudgetPoint, setHoveredBudgetPoint] = useState<{year: number, amount: number, x: number, y: number} | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  
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
      setBudgets([])
      setExpenditures([])
      setDocuments([])
      setTransactions([])
      setContacts([])
      setSectors([])
      
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

        // Fetch activities
        try {
          const activitiesResponse = await fetch(`/api/activities?organization_id=${params.id}`, {
            signal: abortControllerRef.current.signal
          })
          if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json()
            setActivities(activitiesData || [])
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('[OrgProfile] Activities request aborted')
            return
          }
          console.warn('Failed to fetch activities:', err)
        }

        // Fetch budgets
        try {
          const budgetsResponse = await fetch(`/api/organizations/${params.id}/budgets`, {
            signal: abortControllerRef.current.signal
          })
          if (budgetsResponse.ok) {
            const budgetsData = await budgetsResponse.json()
            setBudgets(budgetsData || [])
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('[OrgProfile] Budgets request aborted')
            return
          }
          console.warn('Failed to fetch budgets:', err)
        }

        // Fetch expenditures
        try {
          const expendituresResponse = await fetch(`/api/organizations/${params.id}/expenditures`, {
            signal: abortControllerRef.current.signal
          })
          if (expendituresResponse.ok) {
            const expendituresData = await expendituresResponse.json()
            setExpenditures(expendituresData || [])
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('[OrgProfile] Expenditures request aborted')
            return
          }
          console.warn('Failed to fetch expenditures:', err)
        }

        // Fetch documents
        try {
          const documentsResponse = await fetch(`/api/organizations/${params.id}/documents`, {
            signal: abortControllerRef.current.signal
          })
          if (documentsResponse.ok) {
            const documentsData = await documentsResponse.json()
            setDocuments(documentsData || [])
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('[OrgProfile] Documents request aborted')
            return
          }
          console.warn('Failed to fetch documents:', err)
        }

        // Fetch transactions
        try {
          const transactionsResponse = await fetch(`/api/organizations/${params.id}/transactions`, {
            signal: abortControllerRef.current.signal
          })
          if (transactionsResponse.ok) {
            const transactionsData = await transactionsResponse.json()
            setTransactions(transactionsData || [])
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('[OrgProfile] Transactions request aborted')
            return
          }
          console.warn('Failed to fetch transactions:', err)
        }

        // Fetch contacts
        try {
          const contactsResponse = await fetch(`/api/organizations/${params.id}/contacts`, {
            signal: abortControllerRef.current.signal
          })
          if (contactsResponse.ok) {
            const contactsData = await contactsResponse.json()
            setContacts(contactsData || [])
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('[OrgProfile] Contacts request aborted')
            return
          }
          console.warn('Failed to fetch contacts:', err)
        }

        // Fetch sectors
        try {
          const sectorsResponse = await fetch(`/api/organizations/${params.id}/sectors`, {
            signal: abortControllerRef.current.signal
          })
          if (sectorsResponse.ok) {
            const sectorsData = await sectorsResponse.json()
            setSectors(sectorsData || [])
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('[OrgProfile] Sectors request aborted')
            return
          }
          console.warn('Failed to fetch sectors:', err)
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
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.value, 0)
    const totalExpenditure = expenditures.reduce((sum, exp) => sum + exp.value, 0)
    const totalTransactions = transactions.reduce((sum, txn) => sum + txn.value, 0)
    
    return {
      totalBudget,
      totalExpenditure,
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

  const calculateBudgetsByYear = () => {
    const years = [2020, 2021, 2022, 2023, 2024, 2025]
    const budgetsByYear: Record<number, number> = {}
    
    // Get total budget from activities
    const totalBudget = activities.reduce((sum, activity) => {
      return sum + (activity.total_budget || 0)
    }, 0)
    
    years.forEach(year => {
      // For now, distribute total budget evenly across recent years
      // This is a simplified approach until we have proper date data
      if (year >= 2022 && year <= 2024) {
        budgetsByYear[year] = Math.floor(totalBudget / 3) + (year === 2023 ? totalBudget % 3 : 0)
      } else {
        budgetsByYear[year] = 0
      }
    })
    
    return budgetsByYear
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
          <Card className="mb-6 border-0 shadow-sm">
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
                        <p className="text-slate-600 mt-3 leading-relaxed">
                          {organization.description}
                        </p>
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
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Active Projects</p>
                    <p className="text-2xl font-bold text-slate-900">{totals.activeActivities}</p>
                    <p className="text-xs text-slate-500">of {totals.totalActivities} total</p>
                  </div>
                  <Activity className="h-8 w-8 text-slate-400" />
                  </div>
                  
                  {/* Line Chart */}
                  <div className="mt-4">
                    <div className="h-20 relative group">
                      {(() => {
                        const projectsByYear = calculateActiveProjectsByYear()
                        const years = Object.keys(projectsByYear).map(Number).sort()
                        const maxProjects = Math.max(...Object.values(projectsByYear), 1)
                        
                        return (
                          <>
                            <svg className="w-full h-full" viewBox="0 0 300 80">
                              {/* Grid lines */}
                              {[0, 1, 2, 3, 4].map(i => (
                                <line
                                  key={i}
                                  x1="0"
                                  y1={i * 20}
                                  x2="300"
                                  y2={i * 20}
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
                                  const y = 70 - (projectsByYear[year] / maxProjects) * 60
                                  return `${x},${y}`
                                }).join(' ')}
                              />
                              
                              {/* Data points with hover areas */}
                              {years.map((year, index) => {
                                const x = (index / (years.length - 1)) * 280 + 10
                                const y = 70 - (projectsByYear[year] / maxProjects) * 60
                                return (
                                  <g key={year}>
                                    {/* Larger invisible circle for easier hovering */}
                                    <circle
                                      cx={x}
                                      cy={y}
                                      r="8"
                                      fill="transparent"
                                      className="cursor-pointer"
                                      onMouseEnter={() => setHoveredPoint({year, count: projectsByYear[year], x, y})}
                                      onMouseLeave={() => setHoveredPoint(null)}
                                    />
                                    {/* Visible data point */}
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
                                    y="75"
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="#64748b"
                                  >
                                    {year}
                                  </text>
                                )
                              })}
                            </svg>
                            
                            {/* Tooltip */}
                            {hoveredPoint && (
                              <div
                                className="absolute bg-slate-900 text-white text-xs px-2 py-1 rounded pointer-events-none"
                                style={{
                                  left: `${(hoveredPoint.x / 300) * 100}%`,
                                  top: `${(hoveredPoint.y / 80) * 100 - 30}%`,
                                  transform: 'translateX(-50%)'
                                }}
                              >
                                {hoveredPoint.year}: {hoveredPoint.count} projects
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Budget</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(totals.totalBudget, organization.default_currency)}
                    </p>
                    <p className="text-xs text-slate-500">allocated funds</p>
                  </div>
                    <DollarSign className="h-8 w-8 text-slate-400" />
                  </div>
                  
                  {/* Budget Chart */}
                  <div className="mt-4">
                    <div className="h-20 relative group">
                      {(() => {
                        const budgetsByYear = calculateBudgetsByYear()
                        const years = Object.keys(budgetsByYear).map(Number).sort()
                        const maxBudget = Math.max(...Object.values(budgetsByYear), 1)
                        
                        return (
                          <>
                            <svg className="w-full h-full" viewBox="0 0 300 80">
                              {/* Grid lines */}
                              {[0, 1, 2, 3, 4].map(i => (
                                <line
                                  key={i}
                                  x1="0"
                                  y1={i * 20}
                                  x2="300"
                                  y2={i * 20}
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
                                  const y = 70 - (budgetsByYear[year] / maxBudget) * 60
                                  return `${x},${y}`
                                }).join(' ')}
                              />
                              
                              {/* Data points with hover areas */}
                              {years.map((year, index) => {
                                const x = (index / (years.length - 1)) * 280 + 10
                                const y = 70 - (budgetsByYear[year] / maxBudget) * 60
                                return (
                                  <g key={year}>
                                    {/* Larger invisible circle for easier hovering */}
                                    <circle
                                      cx={x}
                                      cy={y}
                                      r="8"
                                      fill="transparent"
                                      className="cursor-pointer"
                                      onMouseEnter={() => setHoveredBudgetPoint({year, amount: budgetsByYear[year], x, y})}
                                      onMouseLeave={() => setHoveredBudgetPoint(null)}
                                    />
                                    {/* Visible data point */}
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
                                    y="75"
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="#64748b"
                                  >
                                    {year}
                                  </text>
                                )
                              })}
                            </svg>
                            
                            {/* Tooltip */}
                            {hoveredBudgetPoint && (
                              <div
                                className="absolute bg-slate-900 text-white text-xs px-2 py-1 rounded pointer-events-none"
                                style={{
                                  left: `${(hoveredBudgetPoint.x / 300) * 100}%`,
                                  top: `${(hoveredBudgetPoint.y / 80) * 100 - 30}%`,
                                  transform: 'translateX(-50%)'
                                }}
                              >
                                {hoveredBudgetPoint.year}: {formatCurrency(hoveredBudgetPoint.amount, 'USD')}
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Expenditures</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(totals.totalExpenditure, organization.default_currency)}
                    </p>
                    <p className="text-xs text-slate-500">total spent</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Partnerships</p>
                    <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
                    <p className="text-xs text-slate-500">active partnerships</p>
                  </div>
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Card className="border-slate-200">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-7 lg:grid-cols-7 bg-slate-50 border-b border-slate-200">
                <TabsTrigger value="activities" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Activities
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
                                      
                                      {/* Status and IATI ID under activity name */}
                                      <div className="mt-2 space-y-1">
                                        <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs">
                                          {getActivityStatusLabel(activity.activity_status)}
                                        </Badge>
                                        {activity.iati_identifier && (
                                          <code className="block text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">
                                            {activity.iati_identifier}
                                          </code>
                                        )}
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 flex-shrink-0">
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  {activity.description && (
                                    <p className="text-xs text-slate-600 line-clamp-2">{activity.description}</p>
                                  )}
                                  
                                  <div className="space-y-2 text-xs">
                                    
                                    {/* Dates */}
                                    {(activity.start_date || activity.end_date) && (
                                      <div className="space-y-1">
                                        {activity.start_date && (
                                          <div className="text-slate-500">
                                            <span className="text-slate-500">Start:</span> {new Date(activity.start_date).toLocaleDateString()}
                        </div>
                                        )}
                                        {activity.end_date && (
                                          <div className="text-slate-500">
                                            <span className="text-slate-500">End:</span> {new Date(activity.end_date).toLocaleDateString()}
                        </div>
                                        )}
                        </div>
                                    )}
                                    
                                    
                                    {/* Default Modality */}
                                    {activity.default_modality && (
                                      <div className="text-slate-500">
                                        <span className="text-slate-500">Modality:</span> {activity.default_modality}
                              </div>
                                    )}
                                    
                                    {/* Budget */}
                                    {activity.total_budget && (
                                      <div className="font-medium text-slate-900 pt-1 border-t border-slate-100">
                                        {formatCurrency(activity.total_budget, activity.currency)}
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
                              <TableHead className="text-right">Budget</TableHead>
                              <TableHead className="text-right">Disbursed</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activities.map((activity) => (
                              <TableRow key={activity.id}>
                                <TableCell className="font-medium">{activity.title}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-slate-300 text-slate-700">
                                    {activity.activity_status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {activity.start_date ? new Date(activity.start_date).toLocaleDateString() : '-'}
                                </TableCell>
                                <TableCell>
                                  {activity.end_date ? new Date(activity.end_date).toLocaleDateString() : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {activity.total_budget ? formatCurrency(activity.total_budget, activity.currency) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {activity.total_disbursed ? formatCurrency(activity.total_disbursed, activity.currency) : '-'}
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
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

              <TabsContent value="sectors" className="p-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Sector Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sectors.length > 0 ? (
                      <div className="space-y-6">
                        {/* Bar chart visualization */}
                      <div className="space-y-4">
                          {sectors.map((sector) => {
                            const maxActivities = Math.max(...sectors.map(s => s.activity_count))
                            const barWidth = (sector.activity_count / maxActivities) * 100
                            
                            return (
                              <div key={sector.id} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-900">{sector.sector_name}</span>
                                    {sector.sector_code && (
                                      <code className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                        {sector.sector_code}
                                      </code>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {sector.percentage && (
                                      <span className="text-slate-600">{sector.percentage.toFixed(1)}%</span>
                                    )}
                                    <span className="text-slate-500">{sector.activity_count} activities</span>
                                </div>
                              </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="bg-slate-600 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${barWidth}%` }}
                                  />
                            </div>
                          </div>
                            )
                          })}
                        </div>

                        {/* Summary card */}
                        <Card className="border-slate-200 bg-slate-50 mt-6">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                              <div>
                                <p className="text-2xl font-bold text-slate-900">{sectors.length}</p>
                                <p className="text-xs text-slate-500">Total Sectors</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-slate-900">
                                  {sectors.reduce((sum, s) => sum + s.activity_count, 0)}
                                </p>
                                <p className="text-xs text-slate-500">Total Activities</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-slate-900">
                                  {sectors.length > 0 ? Math.max(...sectors.map(s => s.activity_count)) : 0}
                                </p>
                                <p className="text-xs text-slate-500">Top Sector Activities</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-slate-900">
                                  {sectors.length > 0 ? (sectors.reduce((sum, s) => sum + s.activity_count, 0) / sectors.length).toFixed(1) : 0}
                                </p>
                                <p className="text-xs text-slate-500">Avg per Sector</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <PieChart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No sector data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="finances" className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Budgets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {budgets.length > 0 ? (
                        <div className="space-y-4">
                          {budgets.map((budget) => (
                            <div key={budget.id} className="p-3 border border-slate-200 rounded">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-slate-900">{budget.type}</p>
                                  <p className="text-sm text-slate-600">{budget.status}</p>
                                </div>
                                <p className="font-bold text-slate-900">
                                  {formatCurrency(budget.value, budget.currency)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-4">No budget data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Expenditures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {expenditures.length > 0 ? (
                        <div className="space-y-4">
                          {expenditures.map((expenditure) => (
                            <div key={expenditure.id} className="p-3 border border-slate-200 rounded">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-slate-900">{expenditure.year}</p>
                                  {expenditure.description && (
                                    <p className="text-sm text-slate-600">{expenditure.description}</p>
                                  )}
                                </div>
                                <p className="font-bold text-slate-900">
                                  {formatCurrency(expenditure.value, expenditure.currency)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-4">No expenditure data available</p>
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
                    {contacts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {contacts.map((contact) => (
                          <Card key={contact.id} className="border-slate-200 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                  <User className="h-6 w-6 text-slate-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-slate-900 truncate">{contact.name}</h3>
                                  {contact.title && (
                                    <p className="text-sm text-slate-600 truncate">{contact.title}</p>
                                  )}
                                  {contact.department && (
                                    <p className="text-xs text-slate-500 truncate mt-1">{contact.department}</p>
                                  )}
                                  
                                  <div className="mt-3 space-y-2">
                                    {contact.email && (
                                      <a 
                                        href={`mailto:${contact.email}`}
                                        className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                                      >
                                        <Mail className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{contact.email}</span>
                                      </a>
                                    )}
                                    {contact.phone && (
                                      <a 
                                        href={`tel:${contact.phone}`}
                                        className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                                      >
                                        <Phone className="h-3 w-3 flex-shrink-0" />
                                        <span>{contact.phone}</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No contacts available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="p-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {documents.length > 0 ? (
                      <div className="space-y-4">
                        {documents.map((document) => (
                          <div key={document.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileIcon className="h-5 w-5 text-slate-400" />
                              <div>
                                <p className="font-medium text-slate-900">{document.title}</p>
                                <p className="text-sm text-slate-600">{document.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                {new Date(document.uploaded_at).toLocaleDateString()}
                              </span>
                              <Button variant="ghost" size="sm" asChild>
                                <a href={document.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
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
    </MainLayout>
  )
}