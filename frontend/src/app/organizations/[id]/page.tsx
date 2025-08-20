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
  Phone
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

export default function OrganizationProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [expenditures, setExpenditures] = useState<Expenditure[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  
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
      
      try {
        setLoading(true)
        
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
    const typeMap: { [key: string]: string } = {
      'Government': 'bg-slate-100 text-slate-800 border-slate-200',
      'International NGO': 'bg-blue-100 text-blue-800 border-blue-200',
      'National NGO': 'bg-green-100 text-green-800 border-green-200',
      'Multilateral': 'bg-purple-100 text-purple-800 border-purple-200',
      'Private Sector': 'bg-orange-100 text-orange-800 border-orange-200',
      'Foundation': 'bg-pink-100 text-pink-800 border-pink-200'
    }
    return typeMap[type] || 'bg-slate-100 text-slate-800 border-slate-200'
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

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-7xl mx-auto p-6">
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

  if (error || !organization) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
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

  const totals = calculateTotals()

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto p-6">
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
              <Button className="bg-slate-600 hover:bg-slate-700">
                <Edit className="h-4 w-4 mr-2" />
                Edit Organization
              </Button>
            </div>
          </div>

          {/* Organization Header Card */}
          <Card className="mb-6 border-slate-200 shadow-sm">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
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
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900">{organization.name}</h1>
                        {organization.acronym && (
                          <Badge variant="outline" className="border-slate-300 text-slate-700">
                            {organization.acronym}
                          </Badge>
                        )}
                        {organization.country && (
                          <div className="flex items-center gap-1">
                            {getCountryCode(organization.country) && (
                              <Flag 
                                code={getCountryCode(organization.country)!} 
                                style={{ width: '20px', height: '15px' }} 
                              />
                            )}
                            <span className="text-sm text-slate-600">{organization.country}</span>
                          </div>
                        )}
                      </div>
                      
                      <Badge className={getTypeColor(organization.organisation_type)}>
                        {organization.organisation_type}
                      </Badge>
                      
                      {organization.description && (
                        <p className="text-slate-600 mt-3 max-w-3xl leading-relaxed">
                          {organization.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="flex flex-wrap gap-6 mt-4">
                    {organization.website && (
                      <a 
                        href={organization.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        <span className="text-sm">Website</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {organization.email && (
                      <a 
                        href={`mailto:${organization.email}`}
                        className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
                      >
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{organization.email}</span>
                      </a>
                    )}
                    {organization.phone && (
                      <a 
                        href={`tel:${organization.phone}`}
                        className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">{organization.phone}</span>
                      </a>
                    )}
                    {organization.iati_org_id && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">IATI ID: {organization.iati_org_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Active Projects</p>
                    <p className="text-2xl font-bold text-slate-900">{totals.activeActivities}</p>
                    <p className="text-xs text-slate-500">of {totals.totalActivities} total</p>
                  </div>
                  <Activity className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Budget</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(totals.totalBudget, organization.default_currency)}
                    </p>
                    <p className="text-xs text-slate-500">allocated funds</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
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

            <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Partnerships</p>
                    <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
                    <p className="text-xs text-slate-500">active partnerships</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Card className="border-slate-200">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 lg:grid-cols-6 bg-slate-50 border-b border-slate-200">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="activities" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Activities
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
                <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Documents
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Organization Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Type:</span>
                          <span className="ml-2 text-slate-900">{organization.organisation_type}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Status:</span>
                          <Badge className="ml-2 bg-green-100 text-green-800">
                            {organization.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-slate-500">Country:</span>
                          <span className="ml-2 text-slate-900">{organization.country || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Currency:</span>
                          <span className="ml-2 text-slate-900">{organization.default_currency || 'USD'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Created:</span>
                          <span className="ml-2 text-slate-900">
                            {new Date(organization.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Updated:</span>
                          <span className="ml-2 text-slate-900">
                            {new Date(organization.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activities.length > 0 ? (
                        <div className="space-y-3">
                          {activities.slice(0, 5).map((activity) => (
                            <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                                <p className="text-xs text-slate-500">{activity.activity_status}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-4">No recent activities</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activities" className="p-6">
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Activities Portfolio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activities.length > 0 ? (
                      <div className="space-y-4">
                        {activities.map((activity) => (
                          <div key={activity.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium text-slate-900">{activity.title}</h3>
                                {activity.description && (
                                  <p className="text-sm text-slate-600 mt-1">{activity.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                  <span>Status: {activity.activity_status}</span>
                                  {activity.start_date && (
                                    <span>Start: {new Date(activity.start_date).toLocaleDateString()}</span>
                                  )}
                                  {activity.total_budget && (
                                    <span>Budget: {formatCurrency(activity.total_budget, activity.currency)}</span>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No activities found</p>
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