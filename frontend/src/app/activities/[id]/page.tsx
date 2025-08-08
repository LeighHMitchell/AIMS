"use client"
import React, { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
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
  UserPlus,
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
  Plus
} from "lucide-react"
import { toast } from "sonner"
import { Transaction } from "@/types/transaction"
import { DisbursementGauge, CumulativeFinanceChart } from "@/components/ActivityCharts"
import { ActivityAnalyticsCharts } from "@/components/ActivityAnalyticsCharts"
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
import { CommentsDrawer } from "@/components/activities/CommentsDrawer"
import { TRANSACTION_TYPE_LABELS } from "@/types/transaction"
import TransactionTab from "@/components/activities/TransactionTab"
import { getActivityPermissions, ActivityContributor } from "@/lib/activity-permissions"
import { SDG_GOALS, SDG_TARGETS } from "@/data/sdg-targets"
import { SDGImageGrid } from "@/components/ui/SDGImageGrid"
import SDGAlignmentSection from "@/components/SDGAlignmentSection"
import ContributorsSection from "@/components/ContributorsSection"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ActivityProfileSkeleton } from "@/components/skeletons/ActivityProfileSkeleton"
import ActivityBudgetsTab from "@/components/activities/ActivityBudgetsTab"
import { ResultsTab } from "@/components/activities/ResultsTab"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import SectorAllocationPieChart from "@/components/charts/SectorAllocationPieChart"

interface Activity {
  id: string
  partnerId: string
  iatiId: string
  title: string
  description: string
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
  // IATI Sync fields
  iatiIdentifier?: string
  autoSync?: boolean
  lastSyncTime?: string
  syncStatus?: 'live' | 'pending' | 'outdated'
  autoSyncFields?: string[]
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
}

export default function ActivityDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [budgets, setBudgets] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()
  const { user } = useUser()
  const searchParams = useSearchParams()
  
  // Check if user is trying to join as contributor
  const isJoinAction = searchParams?.get('action') === 'join'
  
  // Debug logging for user role
  console.log('[AIMS DEBUG Activity Detail] Current user:', user);
  console.log('[AIMS DEBUG Activity Detail] User role:', user?.role);
  
  // Get permissions
  const permissions = getActivityPermissions(user, activity);
  
  const [showEditBanner, setShowEditBanner] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  
  const [partners, setPartners] = useState<Partner[]>([])
  const [allPartners, setAllPartners] = useState<Partner[]>([])
  const [sdgMappings, setSdgMappings] = useState<any[]>([])

  useEffect(() => {
    if (params?.id) {
      fetchActivity(true)
      loadAllPartners();
      fetchBudgets();
    }
  }, [params?.id])

  // Refresh activity data when comments tab is selected to ensure we have latest comments count
  useEffect(() => {
    if (activeTab === "comments" && activity) {
      fetchActivity(false) // Don't show loading when just refreshing
    }
  }, [activeTab])

  const fetchActivity = async (showLoading = true) => {
    if (!params?.id) return;
    
    try {
      if (showLoading) setLoading(true)
      const res = await fetch(`/api/activities/${params.id}`)
      if (res.ok) {
        const found = await res.json()
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
          
          setPartners(allPartners)
        } else {
          toast.error("Activity not found")
        }
      }
    } catch (error) {
      console.error("Error fetching activity:", error)
      toast.error("Failed to load activity")
    } finally {
      if (showLoading) setLoading(false)
    }
  }

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

  const updateContributors = async (newContributors: ActivityContributor[]) => {
    if (!activity) return;
    
    // Update local state
    setActivity({ ...activity, contributors: newContributors });
    
    // Save to backend
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activity,
          contributors: newContributors,
          user: user ? { id: user.id, name: user.name, role: user.role } : undefined,
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update contributors');
      }
      
      toast.success('Contributors updated successfully');
    } catch (error) {
      console.error('Error updating contributors:', error);
      toast.error('Failed to update contributors');
    }
  };
  
  const requestToJoin = async () => {
    if (!activity || !user?.organizationId) return;
    
    const newContributor: ActivityContributor = {
      id: `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      organizationId: user.organizationId,
      organizationName: user.organization?.name || 'Unknown Organization',
      status: 'requested',
      role: 'contributor',
      nominatedBy: user.id,
      nominatedByName: user.name,
      nominatedAt: new Date().toISOString(),
      canEditOwnData: true,
      canViewOtherDrafts: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedContributors = [...(activity.contributors || []), newContributor];
    await updateContributors(updatedContributors);
    
    toast.success('Your request to join has been submitted');
  };

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

  if (!activity) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Card className="max-w-md mx-auto border-slate-200">
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
            <Calendar className="h-3 w-3 text-green-500" />
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
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto p-6">
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
              <Button 
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Profile
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
          <Card className="mb-6 border-slate-200 shadow-sm">
            {/* Banner Section */}
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
              <div className="relative h-48">
                <img src={banner} alt="Activity banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            ) : null}
            
            <CardContent className="p-8">
              <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-4">
                        <h1 className="text-5xl font-bold text-slate-900 leading-tight">{activity.title}</h1>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          className={
                            activity.activityStatus === "completed" ? "bg-green-100 text-green-800" : 
                            activity.activityStatus === "implementation" ? "bg-blue-100 text-blue-800" :
                            activity.activityStatus === "cancelled" ? "bg-red-100 text-red-800" : 
                            "bg-slate-100 text-slate-800"
                          }
                        >
                          {(activity.activityStatus || "Planning").charAt(0).toUpperCase() + 
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
                      
                      {activity.description && (
                        <p className="text-slate-600 mt-3 max-w-3xl leading-relaxed">
                          {activity.description}
                        </p>
                      )}
                      
                      {/* SDG Goals Display */}
                      {activity.sdgMappings && activity.sdgMappings.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="text-slate-500 text-sm font-medium">SDG Goals:</div>
                            <SDGImageGrid 
                              sdgCodes={Array.from(new Set(activity.sdgMappings.map((m: any) => m.sdgGoal)))}
                              size="md"
                              showTooltips={true}
                              maxDisplay={8}
                              className="flex-wrap"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-slate-500 shrink-0">Reported by:</span>
                      <span className="text-slate-900 font-medium break-words min-w-0 flex-1">
                        {(() => {
                          const creatorOrg = partners.find(p => p.id === activity.createdByOrg);
                          if (creatorOrg) {
                            return creatorOrg.acronym || creatorOrg.code || creatorOrg.name;
                          }
                          return activity.created_by_org_acronym || activity.created_by_org_name || 'Unknown Organization';
                        })()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center">
                        <span className="text-slate-500">Created:</span>
                        <span className="ml-1 text-slate-900">{formatDate(activity.createdAt)}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-slate-500">Updated:</span>
                        <span className="ml-1 text-slate-900">{formatDate(activity.updatedAt)}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Creator:</span>
                      <span className="ml-2 text-slate-900">{activity.createdBy?.name || 'Unknown'}</span>
                    </div>
                  </div>

                  {/* Activity Dates */}
                  <div className="mt-4">
                    {getDisplayDates(activity)}
                  </div>

                  {/* Contributors */}
                  {activity.contributors && activity.contributors.length > 0 && (
                    <div className="mt-4">
                      <span className="text-sm text-slate-500">Contributors: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activity.contributors
                          .filter(c => c.status === 'accepted')
                          .map((contributor, idx) => {
                            const partner = allPartners.find(p => p.id === contributor.organizationId);
                            const displayName = partner 
                              ? `${partner.acronym || partner.code || partner.name}`
                              : contributor.organizationName;
                            return (
                              <Badge key={contributor.id} variant="outline" className="text-xs border-slate-300 text-slate-700">
                                {displayName}
                              </Badge>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
            </CardContent>
          </Card>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Financial Progress</p>
                    <p className="text-2xl font-bold text-slate-900">{financials.percentDisbursed}%</p>
                    <p className="text-xs text-slate-500">disbursed</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Commitment</p>
                    <p className="text-2xl font-bold text-slate-900">
                      USD {financials.totalCommitment.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">committed funds</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Sectors</p>
                    <p className="text-2xl font-bold text-slate-900">{activity.sectors?.length || 0}</p>
                    <p className="text-xs text-slate-500">sector allocations</p>
                  </div>
                  <PieChart className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Partners</p>
                    <p className="text-2xl font-bold text-slate-900">{partners.length}</p>
                    <p className="text-xs text-slate-500">organizations</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Card className="border-slate-200">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${(user?.role?.includes('gov_partner') || user?.role === 'super_user') ? 'grid-cols-10' : 'grid-cols-9'} bg-slate-50 border-b border-slate-200`}>
                <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="finances" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Finances
                </TabsTrigger>
                <TabsTrigger value="results" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Results
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
                <TabsTrigger value="contributors" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  Contributors
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

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Activity Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Status:</span>
                          <Badge className="ml-2 bg-blue-100 text-blue-800">
                            {(activity.activityStatus || "Planning").charAt(0).toUpperCase() + 
                             (activity.activityStatus || "Planning").slice(1).toLowerCase()}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-slate-500">Sectors:</span>
                          <span className="ml-2 text-slate-900">{activity.sectors?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Created:</span>
                          <span className="ml-2 text-slate-900">
                            {formatDate(activity.createdAt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Updated:</span>
                          <span className="ml-2 text-slate-900">
                            {formatDate(activity.updatedAt)}
                          </span>
                        </div>
                      </div>
                      
                      {activity.description && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2 text-slate-900">Description</h4>
                          <div 
                            className="prose prose-sm max-w-none text-slate-600 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-slate-900 [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-slate-900 [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-slate-900 [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800"
                            dangerouslySetInnerHTML={{ __html: activity.description }}
                          />
                        </div>
                      )}
                      
                      {activity.targetGroups && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2 text-slate-900">Target Groups</h4>
                          <p className="text-slate-600 text-sm">{activity.targetGroups}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Sectors & SDG Alignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activity.sectors && activity.sectors.length > 0 ? (
                        <div className="space-y-3 mb-6">
                          <h4 className="font-medium text-slate-900">Sector Allocations</h4>
                          {activity.sectors.slice(0, 5).map((sector: any) => (
                            <div key={sector.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900">
                                  {`${sector.sector_code || sector.code} – ${sector.sector_name || sector.name}`}
                                </p>
                                <p className="text-xs text-slate-500">{sector.percentage}% • {sector.type || 'secondary'}</p>
                              </div>
                            </div>
                          ))}
                          {activity.sectors.length > 5 && (
                            <p className="text-xs text-slate-500">+ {activity.sectors.length - 5} more sectors</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-4">No sectors specified</p>
                      )}
                      
                      {activity.sdgMappings && activity.sdgMappings.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-slate-900 mb-2">SDG Goals</h4>
                          <div className="flex flex-wrap gap-1">
                            {Array.from(new Set(activity.sdgMappings?.map((m: any) => m.sdgGoal) || [])).slice(0, 6).map(goalId => {
                              const goal = SDG_GOALS.find(g => g.id === Number(goalId));
                              return goal ? (
                                <div 
                                  key={goalId} 
                                  className="text-xs font-bold rounded w-6 h-6 flex items-center justify-center text-white"
                                  style={{ backgroundColor: goal.color }}
                                >
                                  {goal.id}
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Finances Tab */}
              <TabsContent value="finances" className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Financial Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Total Commitment:</span>
                          <span className="font-bold text-slate-900">USD {financials.totalCommitment.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Total Disbursed:</span>
                          <span className="font-bold text-green-600">USD {financials.totalDisbursement.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Total Expended:</span>
                          <span className="font-bold text-blue-600">USD {financials.totalExpenditure.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Remaining:</span>
                          <span className="font-bold text-orange-600">USD {(financials.totalCommitment - financials.totalDisbursement).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Transaction Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Transactions:</span>
                          <span className="text-slate-900">{financials.totalTransactions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Aid Types:</span>
                          <span className="text-slate-900">
                            {financials.aidTypes.length > 0 
                              ? financials.aidTypes.map(at => getAidTypeName(at || "")).join(", ")
                              : "Not specified"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Finance Types:</span>
                          <span className="text-slate-900">
                            {financials.flowTypes.length > 0
                              ? financials.flowTypes.map(ft => getFlowTypeName(ft || "")).join(", ")
                              : "Not specified"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Budgets and Transactions */}
                <div className="space-y-6">
                  <ActivityBudgetsTab 
                    activityId={activity.id}
                    startDate={activity.plannedStartDate || activity.actualStartDate || ""}
                    endDate={activity.plannedEndDate || activity.actualEndDate || ""}
                    defaultCurrency="USD"
                  />
                  
                  <TransactionTab 
                    activityId={activity.id} 
                    readOnly={!permissions.canEditActivity}
                    defaultFinanceType={activity.defaultFinanceType}
                    defaultAidType={activity.defaultAidType}
                    defaultCurrency={activity.defaultCurrency}
                    defaultTiedStatus={activity.defaultTiedStatus}
                    defaultFlowType={activity.defaultFlowType}
                  />
                </div>
              </TabsContent>

              {/* Results Tab */}
              <TabsContent value="results" className="p-6">
                <ResultsTab 
                  activityId={activity.id} 
                  readOnly={!permissions.canEditActivity}
                  defaultLanguage="en"
                />
              </TabsContent>

              {/* Sectors Tab */}
              <TabsContent value="sectors" className="p-6">
                <div className="space-y-6">
                  {/* Sector Allocation Visualization */}
                  {activity.sectors && activity.sectors.length > 0 ? (
                    <>
                      {/* Treemap Visualization */}
                      <Card className="border-slate-200">
                        <CardHeader>
                          <CardTitle className="text-slate-900">Sector Allocation</CardTitle>
                          <CardDescription>
                            Interactive visualization of sector allocations grouped by DAC categories
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="w-full" style={{ height: '800px' }}>
                            <SectorAllocationPieChart 
                              allocations={activity.sectors.map((s: any) => ({
                                id: s.id,
                                code: s.sector_code || s.code,
                                percentage: s.percentage
                              }))}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Sector Details Table */}
                      <Card className="border-slate-200">
                        <CardHeader>
                          <CardTitle className="text-slate-900">Sector Details</CardTitle>
                          <CardDescription>
                            Detailed breakdown of sector allocations
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {activity.sectors.map((sector: any) => {
                              const isSubSector = sector.sector_code?.length === 5 || sector.code?.length === 5;
                              const mainSectorCode = (sector.sector_code || sector.code || '').substring(0, 3);
                              
                              return (
                                <div 
                                  key={sector.id} 
                                  className={`p-4 rounded-lg border ${isSubSector ? 'ml-8 border-slate-100 bg-slate-50' : 'border-slate-200 bg-white'}`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-slate-900">
                                        {sector.sector_code || sector.code} – {sector.sector_name || sector.name}
                                      </div>
                                      {sector.dac3_name && (
                                        <div className="text-sm text-slate-500 mt-1">
                                          DAC Category: {mainSectorCode} – {sector.dac3_name}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-semibold text-slate-900">
                                        {sector.percentage}%
                                      </div>
                                      <div className="text-sm text-slate-500">
                                        allocated
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Summary */}
                          <div className="mt-6 pt-4 border-t border-slate-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-slate-600">Total Allocation:</span>
                              <span className="text-lg font-bold text-slate-900">
                                {activity.sectors.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0)}%
                              </span>
                            </div>
                            {activity.sectors.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0) < 100 && (
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-sm font-medium text-slate-600">Unallocated:</span>
                                <span className="text-lg font-bold text-orange-600">
                                  {100 - activity.sectors.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Edit Button */}
                      {permissions.canEditActivity && (
                        <div className="flex justify-center">
                          <Button 
                            onClick={() => router.push(`/activities/${activity.id}/sectors`)}
                            className="bg-slate-600 hover:bg-slate-700"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Sector Allocations
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Card className="border-slate-200">
                      <CardContent className="text-center py-12">
                        <PieChart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 mb-4">No sectors have been allocated for this activity.</p>
                        {permissions.canEditActivity && (
                          <Button 
                            onClick={() => router.push(`/activities/${activity.id}/sectors`)}
                            className="bg-slate-600 hover:bg-slate-700"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Sector Allocations
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Partnerships Tab */}
              <TabsContent value="partnerships" className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Extending Partners */}
                  {partners.filter(p => p.type === 'extending').length > 0 && (
                    <Card className="border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-slate-900 flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Extending Partners
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {partners.filter(p => p.type === 'extending').map(partner => (
                            <div key={partner.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="font-medium text-slate-900">{partner.name}</div>
                              <div className="text-sm text-slate-600">{partner.role}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Implementing Partners */}
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Implementing Partners
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {partners.filter(p => p.type === 'implementing').length > 0 ? (
                        <div className="space-y-3">
                          {partners.filter(p => p.type === 'implementing').map(partner => (
                            <div key={partner.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="font-medium text-slate-900">{partner.name}</div>
                              <div className="text-sm text-slate-600">{partner.role}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-4">No implementing partners</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Government Partners */}
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-slate-900 flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Government Partners
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {partners.filter(p => p.type === 'government').length > 0 ? (
                        <div className="space-y-3">
                          {partners.filter(p => p.type === 'government').map(partner => (
                            <div key={partner.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="font-medium text-slate-900">{partner.name}</div>
                              <div className="text-sm text-slate-600">{partner.role}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-4">No government partners</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
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

              {/* Contributors Tab */}
              <TabsContent value="contributors" className="p-6">
                {/* Show join request alert if user came from duplicate detection */}
                {isJoinAction && permissions.canRequestToJoin && (
                  <Alert className="mb-4">
                    <UserPlus className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Would you like to join this activity as a contributor?</span>
                      <Button 
                        size="sm" 
                        onClick={requestToJoin}
                        disabled={!user?.organizationId}
                      >
                        Request to Join
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                
                <ContributorsSection
                  contributors={[]}
                  onChange={() => {}}
                  permissions={permissions}
                  activityId={activity.id}
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