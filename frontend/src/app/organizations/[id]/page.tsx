"use client"

import React, { useState, useEffect } from 'react'
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
  Target
} from 'lucide-react'
import Flag from 'react-world-flags'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ProjectTimeline } from '@/components/organizations/ProjectTimeline'
import { OrganizationDashboard } from '@/components/organizations/OrganizationDashboard'
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
  // full_name removed - using name field only
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
  // Computed fields
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
  exchange_rate?: number
  expense_lines?: ExpenseLine[]
}

interface ExpenseLine {
  reference: string
  value: number
  narrative: string
}

interface LinkedActivity {
  id: string
  iati_id: string
  title: string
  activity_status: string
  role: 'reporting' | 'funding' | 'implementing' | 'extending'
  start_date?: string
  end_date?: string
}

interface LinkedDocument {
  id: string
  title: string
  description?: string
  category: string
  format: string
  url: string
  document_date?: string
  language?: string
}

export default function OrganizationProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('budgets')
  
  // Data states
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [expenditures, setExpenditures] = useState<Expenditure[]>([])
  const [linkedActivities, setLinkedActivities] = useState<LinkedActivity[]>([])
  const [linkedDocuments, setLinkedDocuments] = useState<LinkedDocument[]>([])
  const [allOrganizations, setAllOrganizations] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  
  // Summary stats
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalBudget: 0,
    totalExpenditure: 0,
    recipientCount: 0,
    documentCount: 0
  })

  useEffect(() => {
    if (params?.id) {
      fetchOrganizationProfile()
    }
  }, [params?.id])

  const fetchOrganizationProfile = async () => {
    try {
      setLoading(true)
      
      // Fetch organization details
      const orgResponse = await fetch(`/api/organizations/${params?.id}`)
      if (orgResponse.ok) {
        const orgData = await orgResponse.json()
        setOrganization(orgData)
        
        // Fetch related data in parallel
        await Promise.all([
          fetchBudgets(orgData.id),
          fetchExpenditures(orgData.id),
          fetchLinkedActivities(orgData.id),
          fetchLinkedDocuments(orgData.id),
          fetchAllOrganizations(),
          fetchTransactions(orgData.id)
        ])
        
        calculateStats(orgData)
      } else {
        console.error('Failed to fetch organization')
      }
    } catch (error) {
      console.error('Error fetching organization profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBudgets = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/budgets`)
      if (response.ok) {
        const data = await response.json()
        setBudgets(data)
      }
    } catch (error) {
      console.error('Error fetching budgets:', error)
      // Use sample data for now
      setBudgets([
        {
          id: '1',
          type: 'total',
          status: 'committed',
          period_start: '2024-01-01',
          period_end: '2024-12-31',
          value: 5000000,
          currency: 'USD',
          narrative: 'Annual organizational budget'
        },
        {
          id: '2',
          type: 'recipient-country',
          status: 'indicative',
          period_start: '2024-01-01',
          period_end: '2024-12-31',
          value: 2000000,
          currency: 'USD',
          recipient_name: 'Myanmar',
          recipient_code: 'MM',
          narrative: 'Country allocation for Myanmar'
        }
      ])
    }
  }

  const fetchExpenditures = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/expenditures`)
      if (response.ok) {
        const data = await response.json()
        setExpenditures(data)
      }
    } catch (error) {
      console.error('Error fetching expenditures:', error)
      // Use sample data for now
      setExpenditures([
        {
          id: '1',
          year: '2023',
          value: 3500000,
          currency: 'USD',
          expense_lines: [
            { reference: 'PROG-2023', value: 2500000, narrative: 'Programme costs' },
            { reference: 'ADMIN-2023', value: 1000000, narrative: 'Administrative costs' }
          ]
        },
        {
          id: '2',
          year: '2022',
          value: 3200000,
          currency: 'USD'
        }
      ])
    }
  }

  const fetchLinkedActivities = async (orgId: string) => {
    try {
      // Fetch activities where this org is involved
      const response = await fetch(`/api/activities?organization_id=${orgId}`)
      if (response.ok) {
        const activities = await response.json()
        const linkedActivities = activities.map((activity: any) => ({
          id: activity.id,
          iati_id: activity.iati_id,
          title: activity.title,
          activity_status: activity.activity_status,
          role: determineOrgRole(activity, orgId),
          start_date: activity.planned_start_date,
          end_date: activity.planned_end_date
        }))
        setLinkedActivities(linkedActivities)
      }
    } catch (error) {
      console.error('Error fetching linked activities:', error)
      setLinkedActivities([])
    }
  }

  const fetchLinkedDocuments = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/documents`)
      if (response.ok) {
        const data = await response.json()
        setLinkedDocuments(data)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      // Use sample data for now
      setLinkedDocuments([
        {
          id: '1',
          title: 'Annual Report 2023',
          description: 'Comprehensive annual report including financial statements',
          category: 'Annual Report',
          format: 'PDF',
          url: '#',
          document_date: '2024-03-15',
          language: 'en'
        },
        {
          id: '2',
          title: 'Strategic Plan 2024-2028',
          description: 'Five-year strategic plan and objectives',
          category: 'Strategy',
          format: 'PDF',
          url: '#',
          document_date: '2023-12-01',
          language: 'en'
        }
      ])
    }
  }

  const fetchAllOrganizations = async () => {
    try {
      const response = await fetch('/api/partners')
      if (response.ok) {
        const data = await response.json()
        setAllOrganizations(data)
      }
    } catch (error) {
      console.error('Error fetching all organizations:', error)
      setAllOrganizations([])
    }
  }

  const fetchTransactions = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/transactions`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setTransactions([])
    }
  }

  const determineOrgRole = (activity: any, orgId: string): LinkedActivity['role'] => {
    if (activity.reporting_org_id === orgId) return 'reporting'
    // Check other roles based on activity contributors
    return 'implementing'
  }

  const calculateStats = (org: Organization) => {
    const totalBudget = budgets.reduce((sum, b) => sum + b.value, 0)
    const totalExpenditure = expenditures.reduce((sum, e) => sum + e.value, 0)
    const recipientCount = new Set(budgets.filter(b => b.recipient_code).map(b => b.recipient_code)).size
    
    setStats({
      activeProjects: org.active_project_count || 0,
      totalBudget,
      totalExpenditure,
      recipientCount,
      documentCount: linkedDocuments.length
    })
  }

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'committed': return 'bg-green-100 text-green-800'
      case 'indicative': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case 'implementation': return 'bg-green-100 text-green-800'
      case 'completion': return 'bg-blue-100 text-blue-800'
      case 'pipeline': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'annual report': return <FileText className="h-4 w-4" />
      case 'strategy': return <Briefcase className="h-4 w-4" />
      case 'audit': return <AlertCircle className="h-4 w-4" />
      default: return <FileIcon className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    )
  }

  if (!organization) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Organization not found</h3>
          <Button className="mt-4" onClick={() => router.push('/organizations')}>
            Back to Organizations
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/organizations')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Profile
            </Button>
            <Button size="sm">
              Edit Organization
            </Button>
          </div>
        </div>

        {/* Organization Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                {organization.logo ? (
                  <img 
                    src={organization.logo} 
                    alt={`${organization.name} logo`}
                    className="w-16 h-16 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {organization.name}
                    {organization.acronym && (
                      <span className="ml-2 text-gray-600 font-normal">({organization.acronym})</span>
                    )}
                  </h1>
                  
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {organization.iati_org_id && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">IATI ID:</span>
                        <code className="bg-gray-100 px-2 py-0.5 rounded">{organization.iati_org_id}</code>
                      </div>
                    )}
                    
                    {organization.organisation_type && (
                      <Badge variant="secondary">
                        {organization.organisation_type}
                      </Badge>
                    )}
                    
                    {(organization.country_represented || organization.country) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {getCountryCode(organization.country_represented || organization.country) && (
                          <Flag 
                            code={getCountryCode(organization.country_represented || organization.country)!} 
                            height="16" 
                            width="24"
                            className="rounded-sm"
                          />
                        )}
                        <span>{organization.country_represented || organization.country}</span>
                      </div>
                    )}
                    
                    {organization.website && (
                      <a 
                        href={organization.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    )}
                  </div>
                  
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Last Updated: {formatDate(organization.updated_at)}</span>
                    </div>
                    
                    {organization.default_currency && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              <span>Default Currency: {organization.default_currency}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Default currency for financial reporting</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {organization.default_language && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <Languages className="h-3 w-3" />
                              <span>Language: {organization.default_language}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Default language for narratives</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {organization.secondary_reporter && (
                      <Badge variant="outline" className="text-xs">
                        Secondary Reporter
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {organization.description && (
              <p className="mt-4 text-sm text-gray-600 max-w-3xl">
                {organization.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Dashboard */}
        <OrganizationDashboard 
          organization={{
            ...organization,
            budgets: budgets,
            expenditures: expenditures,
            activities: linkedActivities,
            transactions: transactions
          }}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="budgets">
              <PieChart className="h-4 w-4 mr-2" />
              Budgets
            </TabsTrigger>
            <TabsTrigger value="expenditures">
              <BarChart3 className="h-4 w-4 mr-2" />
              Expenditures
            </TabsTrigger>
            <TabsTrigger value="activities">
              <Activity className="h-4 w-4 mr-2" />
              Activities
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <CalendarDays className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="geography">
              <Globe className="h-4 w-4 mr-2" />
              Geography
            </TabsTrigger>
            <TabsTrigger value="partnerships">
              <Users className="h-4 w-4 mr-2" />
              Partnerships
            </TabsTrigger>
            <TabsTrigger value="sectors">
              <Target className="h-4 w-4 mr-2" />
              Sectors
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Budgets Tab */}
          <TabsContent value="budgets" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Forward Looking Budgets</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Narrative</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgets.map((budget) => (
                      <TableRow key={budget.id}>
                        <TableCell className="font-medium capitalize">
                          {budget.type.replace('-', ' ')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(budget.status)}>
                            {budget.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(budget.period_start)} - {formatDate(budget.period_end)}
                        </TableCell>
                        <TableCell>
                          {budget.recipient_name && (
                            <div className="flex items-center gap-2">
                              {budget.recipient_code && getCountryCode(budget.recipient_name) && (
                                <Flag 
                                  code={budget.recipient_code} 
                                  height="16" 
                                  width="24"
                                  className="rounded-sm"
                                />
                              )}
                              <span>{budget.recipient_name}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(budget.value, budget.currency)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {budget.narrative}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenditures Tab */}
          <TabsContent value="expenditures" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Expenditure History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {expenditures.map((expenditure) => (
                    <div key={expenditure.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">Year {expenditure.year}</h3>
                        <span className="text-xl font-bold">
                          {formatCurrency(expenditure.value, expenditure.currency)}
                        </span>
                      </div>
                      
                      {expenditure.expense_lines && expenditure.expense_lines.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-600">Breakdown:</h4>
                          {expenditure.expense_lines.map((line, index) => (
                            <div key={index} className="flex items-center justify-between pl-4">
                              <span className="text-sm">
                                <code className="bg-gray-100 px-1 rounded mr-2">{line.reference}</code>
                                {line.narrative}
                              </span>
                              <span className="text-sm font-medium">
                                {formatCurrency(line.value, expenditure.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Linked Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IATI Identifier</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedActivities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {activity.iati_id || 'N/A'}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">
                          {activity.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {activity.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActivityStatusColor(activity.activity_status)}>
                            {activity.activity_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {activity.start_date && activity.end_date && (
                            <span className="text-sm">
                              {formatDate(activity.start_date)} - {formatDate(activity.end_date)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/activities/${activity.id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-6">
            <ActivityPortfolioTimeline activities={linkedActivities} />
          </TabsContent>

          {/* Geography Tab */}
          <TabsContent value="geography" className="mt-6">
            <GeographicFootprint 
              organization={{
                country: organization.country,
                country_represented: organization.country_represented,
                activities: linkedActivities
              }}
            />
          </TabsContent>

          {/* Partnerships Tab */}
          <TabsContent value="partnerships" className="mt-6">
            <PartnershipNetwork 
              organizationId={organization.id}
              activities={linkedActivities}
              allOrganizations={allOrganizations}
            />
          </TabsContent>

          {/* Sectors Tab */}
          <TabsContent value="sectors" className="mt-6">
            <SectorAllocationChart activities={linkedActivities} />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Linked Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {linkedDocuments.map((document) => (
                    <div key={document.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-gray-100 rounded">
                            {getCategoryIcon(document.category)}
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="font-medium">{document.title}</h4>
                            {document.description && (
                              <p className="text-sm text-gray-600">{document.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <Badge variant="secondary" className="text-xs">
                                {document.category}
                              </Badge>
                              <span>{document.format}</span>
                              {document.document_date && (
                                <span>{formatDate(document.document_date)}</span>
                              )}
                              {document.language && (
                                <span>Language: {document.language.toUpperCase()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(document.url, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
} 