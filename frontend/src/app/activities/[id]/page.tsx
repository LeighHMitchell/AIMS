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
  Printer, 
  FileText, 
  MapPin, 
  Users, 
  DollarSign, 
  Phone, 
  Mail,
  Calendar,
  Download,
  Eye,
  Trash2,
  Upload,
  HelpCircle,
  MessageSquare,
  UserPlus,
  PieChart,
  Banknote,
  Globe,
  Activity,
  RefreshCw,
  AlertCircle,
  Lock,
  Wallet
} from "lucide-react"
import { toast } from "sonner"
import { Transaction } from "@/types/transaction"
import { DisbursementGauge, CumulativeFinanceChart } from "@/components/ActivityCharts"
import { ActivityHeroCards } from "@/components/ActivityHeroCards"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import GovernmentInputsSection from "@/components/GovernmentInputsSection"
import { useUser } from "@/hooks/useUser"
import { ActivityFeed } from "@/components/ActivityFeed"
import { ActivityComments } from "@/components/ActivityComments"
import { TRANSACTION_TYPE_LABELS } from "@/types/transaction"
import TransactionTab from "@/components/activities/TransactionTab"
import { DeleteActivityDialog } from "@/components/DeleteActivityDialog"
import { getActivityPermissions, ActivityContributor } from "@/lib/activity-permissions"
import { SDG_GOALS, SDG_TARGETS } from "@/data/sdg-targets"
import ContributorsSection from "@/components/ContributorsSection"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ActivityProfileSkeleton } from "@/components/skeletons/ActivityProfileSkeleton"
import { IATISyncPanel } from "@/components/activities/IATISyncPanel"
import ActivityBudgetsTab from "@/components/activities/ActivityBudgetsTab"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

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
  // IATI Sync fields
  iatiIdentifier?: string
  autoSync?: boolean
  lastSyncTime?: string
  syncStatus?: 'live' | 'pending' | 'outdated'
  autoSyncFields?: string[]
}

interface Document {
  id: string;
  filename: string;
  uploadDate: string;
  uploadedBy: string;
  fileSize: number;
  url: string;
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
  const [activeTab, setActiveTab] = useState("about")
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
  
  // Mock data for now
  const documents: Document[] = [
    {
      id: "1",
      filename: "Activity_Proposal_2024.pdf",
      uploadDate: "2024-01-15",
      uploadedBy: "John Doe",
      fileSize: 2.5 * 1024 * 1024, // 2.5 MB
      url: "#"
    },
    {
      id: "2", 
      filename: "Budget_Breakdown.xlsx",
      uploadDate: "2024-01-20",
      uploadedBy: "Jane Smith",
      fileSize: 1.2 * 1024 * 1024, // 1.2 MB
      url: "#"
    }
  ]
  
  const [partners, setPartners] = useState<Partner[]>([])
  const [allPartners, setAllPartners] = useState<Partner[]>([])

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
        <ActivityProfileSkeleton />
      </MainLayout>
    )
  }

  if (!activity) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-bold mb-4">Activity Not Found</h2>
          <Button onClick={() => router.push("/activities")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Activities
          </Button>
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section with Banner */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
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
              <div className="relative h-48">
                <img src={banner} alt="Activity banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            ) : null}
            
            {/* Header Content */}
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-6">
                    {activity.icon ? (
                      <img
                        src={activity.icon}
                        alt={`Icon for ${activity.title}`}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border-2 border-gray-200 shadow-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 border-2 border-gray-200 shadow-sm"><svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 border-2 border-gray-200 shadow-sm">
                        <Activity className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900">{activity.title}</h1>
                    </div>
                  </div>
                  
                  {/* Comprehensive Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 divide-x divide-gray-100">
                    {/* Identifiers Section */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 pb-1">Activity Identifiers</h3>
                      {activity.partnerId && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">Activity Partner ID:</span>
                          <p className="text-slate-700">{activity.partnerId}</p>
                        </div>
                      )}
                      {activity.iatiId && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">IATI Identifier:</span>
                          <p className="text-slate-700">{activity.iatiId}</p>
                        </div>
                      )}
                    </div>

                    {/* Status & Dates Section */}
                    <div className="space-y-3 pl-8">
                      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 pb-1">Activity Timeline</h3>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">Status:</span>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge 
                            variant={
                              activity.activityStatus === "completed" ? "success" : 
                              activity.activityStatus === "implementation" ? "default" :
                              activity.activityStatus === "cancelled" ? "destructive" : "secondary"
                            }
                            className="px-3 py-1"
                          >
                            {(activity.activityStatus || "Planning").charAt(0).toUpperCase() + 
                             (activity.activityStatus || "Planning").slice(1).toLowerCase()}
                          </Badge>
                          
                          {/* IATI Sync Status Icon */}
                          {activity.iatiIdentifier && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-md">
                                    {activity.syncStatus === 'live' ? (
                                      <>
                                        <RefreshCw className="h-3.5 w-3.5 text-green-600" />
                                        <span className="text-xs font-medium text-green-600">IATI Synced</span>
                                      </>
                                    ) : activity.syncStatus === 'outdated' ? (
                                      <>
                                        <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                                        <span className="text-xs font-medium text-yellow-600">IATI Outdated</span>
                                      </>
                                    ) : (
                                      <>
                                        <Globe className="h-3.5 w-3.5 text-gray-600" />
                                        <span className="text-xs font-medium text-gray-600">IATI Linked</span>
                                      </>
                                    )}
                                  </div>
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
                      </div>
                      <div className="space-y-1">
                        {getDisplayDates(activity)}
                      </div>
                    </div>

                    {/* Organization & Creator Section */}
                    <div className="space-y-3 pl-8">
                      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 pb-1">Participating Organizations</h3>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">Created by:</span>
                        <p className="text-slate-700">
                          {(() => {
                            const creatorOrg = partners.find(p => p.id === activity.createdByOrg);
                            if (creatorOrg) {
                              return creatorOrg.acronym || creatorOrg.code || creatorOrg.name;
                            }
                            return 'Unknown Organization';
                          })()}
                        </p>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">Creator:</span>
                        <p className="text-slate-700">{activity.createdBy?.name || 'Unknown'}</p>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">Created:</span>
                        <p className="text-slate-700">{formatDate(activity.createdAt)}</p>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">Last Updated:</span>
                        <p className="text-slate-700">{formatDate(activity.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Activity Contributors Section */}
                  {activity.contributors && activity.contributors.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Activity Contributors</h3>
                      <div className="flex flex-wrap gap-2">
                        {activity.contributors
                          .filter(c => c.status === 'accepted')
                          .map((contributor, idx) => {
                            const partner = allPartners.find(p => p.id === contributor.organizationId);
                            const displayName = partner 
                              ? `${partner.acronym || partner.code || partner.name}${partner.countryRepresented ? ` (${partner.countryRepresented})` : ''}`
                              : contributor.organizationName;
                            return (
                              <Badge key={contributor.id} variant="outline" className="text-xs">
                                {displayName}
                              </Badge>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 ml-6">
                  <Button onClick={handleEdit} variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Activity
                  </Button>
                  {!banner && !showEditBanner && (
                    <Button onClick={() => setShowEditBanner(true)} variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Add Banner
                    </Button>
                  )}
                  <Button onClick={handlePrint} variant="outline">
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Cards Section */}
          <ActivityHeroCards 
            activity={{
              ...activity,
              budgets: budgets
            }} 
            partners={allPartners}
          />

          {/* Main Content with Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className={`grid w-full ${(user?.role?.includes('gov_partner') || user?.role === 'super_user') ? 'grid-cols-13' : 'grid-cols-12'}`}>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="sectors">Sectors</TabsTrigger>
              <TabsTrigger value="contributors">Contributors</TabsTrigger>
              <TabsTrigger value="sdg">SDG</TabsTrigger>
              <TabsTrigger value="organisations">Organisations</TabsTrigger>
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="finances">
                <Wallet className="w-4 w-4 mr-1" />
                Finances
              </TabsTrigger>
              <TabsTrigger value="budgets">
                <Wallet className="w-4 w-4 mr-1" />
                Budgets
              </TabsTrigger>
              <TabsTrigger value="transactions">
                <Banknote className="h-4 w-4 mr-1" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <PieChart className="h-4 w-4 mr-1" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="comments">
                Comments
                {activity.comments && activity.comments.length > 0 && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {activity.comments.length}
                  </Badge>
                )}
              </TabsTrigger>
              {(user?.role?.includes('gov_partner') || user?.role === 'super_user') && (
                <TabsTrigger value="government-inputs">Gov Inputs</TabsTrigger>
              )}
            </TabsList>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                {/* Sectors */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      Sectors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activity.sectors && activity.sectors.length > 0 ? (
                      <div className="space-y-2">
                        {activity.sectors.map((sector: any) => (
                          <div key={sector.id} className="text-sm">
                            <div className="font-medium">{`${sector.sector_code || sector.code} – ${sector.sector_name || sector.name}`}</div>
                            <div className="text-gray-500">
                              {sector.percentage}% • {sector.type || 'secondary'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No sectors specified</p>
                    )}
                  </CardContent>
                </Card>

                {/* Extending Partners - only show if there are any */}
                {partners.filter(p => p.type === 'extending').length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        Extending Partners
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {partners.filter(p => p.type === 'extending').map(partner => (
                          <div key={partner.id} className="text-sm">
                            <div className="font-medium">{partner.name}</div>
                            <div className="text-gray-500">{partner.role}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Implementing Partners */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      Implementing Partners
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {partners.filter(p => p.type === 'implementing').map(partner => (
                        <div key={partner.id} className="text-sm">
                          <div className="font-medium">{partner.name}</div>
                          <div className="text-gray-500">{partner.role}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Government Partners */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      Government Partners
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {partners.filter(p => p.type === 'government').map(partner => (
                        <div key={partner.id} className="text-sm">
                          <div className="font-medium">{partner.name}</div>
                          <div className="text-gray-500">{partner.role}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    {activity.description || "No description provided."}
                  </p>
                  {activity.created_by_org_name && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Created By Organization</h4>
                      <p className="text-gray-700">{activity.created_by_org_name}</p>
                      {activity.created_by_org_acronym && (
                        <p className="text-sm text-gray-600 mt-1">({activity.created_by_org_acronym})</p>
                      )}
                    </div>
                  )}
                  {activity.targetGroups && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Target Groups</h4>
                      <p className="text-gray-700">{activity.targetGroups}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sectors Tab */}
            <TabsContent value="sectors" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Sector Allocations</CardTitle>
                  {permissions.canEditActivity && (
                    <Button 
                      size="sm" 
                      onClick={() => router.push(`/activities/${activity.id}/sectors`)}
                    >
                      <PieChart className="h-4 w-4 mr-2" />
                      Manage Sectors
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {activity.sectors && activity.sectors.length > 0 ? (
                    <div className="space-y-4">
                      {/* Sectors List */}
                      <div className="space-y-3">
                        {activity.sectors.map((sector: any) => (
                          <div key={sector.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{`${sector.sector_code || sector.code} – ${sector.sector_name || sector.name}`}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {sector.category || 'Unknown Category'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold">{sector.percentage}%</div>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {sector.type === 'primary' ? 'Primary' : 'Secondary'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-800">
                          <strong>Total Allocation:</strong> {activity.sectors.reduce((sum: number, s: any) => {
                            const percentage = parseFloat(s.percentage) || 0
                            return sum + (isNaN(percentage) ? 0 : percentage)
                          }, 0)}%
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <PieChart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No sectors have been allocated to this activity yet.</p>
                      {permissions.canEditActivity && (
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => router.push(`/activities/${activity.id}/sectors`)}
                        >
                          Add Sectors
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* MSDP Alignment Tab */}
            <TabsContent value="msdp" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>MSDP Alignment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    MSDP alignment information will be displayed here once implemented.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SDG Alignment Tab */}
            <TabsContent value="sdg" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    SDG Alignment
                  </CardTitle>
                  {permissions.canEditActivity && (
                    <Button 
                      size="sm" 
                      onClick={handleEdit}
                    >
                      Edit SDG Alignment
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {activity.sdgMappings && activity.sdgMappings.length > 0 ? (
                    <div className="space-y-6">
                      {/* SDG Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from(new Set(activity.sdgMappings?.map((m: any) => m.sdgGoal) || [])).map(goalId => {
                          const goal = SDG_GOALS.find(g => g.id === Number(goalId));
                                                      const goalMappings = activity.sdgMappings?.filter((m: any) => m.sdgGoal === goalId) || [];
                          const totalContribution = goalMappings.reduce((sum: number, m: any) => {
                            const contrib = parseFloat(m.contributionPercent) || 0
                            return sum + (isNaN(contrib) ? 0 : contrib)
                          }, 0);
                          
                          return goal ? (
                            <div 
                              key={goalId} 
                              className="p-4 rounded-lg border-2 hover:shadow-md transition-shadow"
                              style={{ borderColor: goal.color + '40', backgroundColor: goal.color + '10' }}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div 
                                  className="text-xl font-bold rounded-full w-10 h-10 flex items-center justify-center text-white shrink-0"
                                  style={{ backgroundColor: goal.color }}
                                >
                                  {goal.id}
                                </div>
                                <div className="text-sm font-medium line-clamp-2">{goal.name}</div>
                              </div>
                              <div className="text-xs text-gray-600">
                                {goalMappings.length} target{goalMappings.length !== 1 ? 's' : ''}
                                {totalContribution > 0 && ` • ${totalContribution}%`}
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>

                      {/* Detailed Targets */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Selected Targets</h4>
                        {activity.sdgMappings.map((mapping: any, idx: number) => {
                          const goal = SDG_GOALS.find(g => g.id === mapping.sdgGoal);
                          const target = SDG_TARGETS.find(t => t.id === mapping.sdgTarget);
                          
                          return (goal && target) ? (
                            <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-start gap-3">
                                <Badge 
                                  className="text-white shrink-0"
                                  style={{ backgroundColor: goal.color }}
                                >
                                  SDG {goal.id}
                                </Badge>
                                <div className="flex-1">
                                  <div className="font-medium">
                                    Target {target.id}: {target.text}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {target.description}
                                  </div>
                                  {mapping.contributionPercent && (
                                    <div className="mt-2">
                                      <span className="text-sm font-medium">Contribution: {mapping.contributionPercent}%</span>
                                    </div>
                                  )}
                                  {mapping.notes && (
                                    <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                      <p className="text-sm text-gray-700">{mapping.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No SDG alignment has been specified for this activity yet.</p>
                      {permissions.canEditActivity && (
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={handleEdit}
                        >
                          Add SDG Alignment
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Finances Tab */}
            <TabsContent value="finances" className="space-y-6">
              {/* Financial Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      Finances
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Total Commitment:</p>
                      <p className="text-2xl font-bold">USD {financials.totalCommitment.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Aid Type Category:</p>
                      <p className="text-sm font-medium">
                        {financials.aidTypes.length > 0 
                          ? financials.aidTypes.map(at => getAidTypeName(at || "")).join(", ")
                          : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Finance Type(s):</p>
                      <p className="text-sm font-medium">
                        {financials.flowTypes.length > 0
                          ? financials.flowTypes.map(ft => getFlowTypeName(ft || "")).join(", ")
                          : "Not specified"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Disbursement Gauge */}
                <DisbursementGauge
                  totalCommitment={financials.totalCommitment}
                  totalDisbursement={financials.totalDisbursement}
                />

                {/* Additional Metrics Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">Financial Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Total Disbursed:</p>
                      <p className="text-xl font-semibold text-green-600">
                        USD {financials.totalDisbursement.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Expended:</p>
                      <p className="text-xl font-semibold text-blue-600">
                        USD {financials.totalExpenditure.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Remaining:</p>
                      <p className="text-xl font-semibold text-orange-600">
                        USD {(financials.totalCommitment - financials.totalDisbursement).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cumulative Chart */}
              <CumulativeFinanceChart transactions={activity.transactions || []} />

              {/* Transactions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Aid Type</TableHead>
                          <TableHead>Finance Type</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead>Receiver</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activity.transactions && activity.transactions.length > 0 ? (
                          activity.transactions.map((transaction: any) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                {!transaction.created_by && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Lock className="h-4 w-4 text-gray-400" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">Imported from IATI</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {transaction.aid_type ? getAidTypeName(transaction.aid_type) : '-'}
                              </TableCell>
                              <TableCell>
                                {transaction.flow_type ? getFlowTypeName(transaction.flow_type) : '-'}
                              </TableCell>
                              <TableCell>{transaction.provider_org_name || '-'}</TableCell>
                              <TableCell>{transaction.receiver_org_name || '-'}</TableCell>
                              <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
                              <TableCell>{getTransactionTypeName(transaction.transaction_type)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {transaction.currency} {transaction.value.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-gray-500">
                              No transactions recorded
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Budgets Tab */}
            <TabsContent value="budgets" className="space-y-4">
              <ActivityBudgetsTab 
                activityId={activity.id}
                startDate={activity.plannedStartDate || activity.actualStartDate || ""}
                endDate={activity.plannedEndDate || activity.actualEndDate || ""}
                defaultCurrency="USD"
              />
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <TransactionTab 
                activityId={activity.id} 
                readOnly={!permissions.canEditActivity}
              />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <ActivityAnalyticsCharts
                transactions={activity.transactions || []}
                budgets={budgets}
                startDate={activity.plannedStartDate || activity.actualStartDate}
                endDate={activity.plannedEndDate || activity.actualEndDate}
              />
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {activity.contacts && activity.contacts.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {activity.contacts.map((contact: any, index: number) => (
                        <Card key={contact.id || index} className="bg-gray-50">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              {contact.profilePhoto ? (
                                <img
                                  src={contact.profilePhoto}
                                  alt={`${contact.firstName} ${contact.lastName}`}
                                  className="w-16 h-16 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <Users className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">
                                  {contact.title} {contact.firstName} {contact.middleName} {contact.lastName}
                                </h3>
                                <p className="text-sm text-gray-600">{contact.position}</p>
                                {contact.organisation && (
                                  <p className="text-sm text-gray-500 mb-2">{contact.organisation}</p>
                                )}
                                <Badge variant="outline" className="mb-4">{contact.type}</Badge>
                                
                                <div className="space-y-2 mt-4">
                                  {contact.phone && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Phone className="h-4 w-4 text-gray-400" />
                                      <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                                        {contact.phone}
                                      </a>
                                    </div>
                                  )}
                                  {contact.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Mail className="h-4 w-4 text-gray-400" />
                                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                                        {contact.email}
                                      </a>
                                    </div>
                                  )}
                                  {contact.fax && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Printer className="h-4 w-4 text-gray-400" />
                                      <span>Fax: {contact.fax}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {contact.notes && (
                                  <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                                    <p className="text-sm text-gray-600">{contact.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No contacts have been added to this activity yet.</p>
                      <Button variant="outline" className="mt-4" onClick={handleEdit}>
                        Add Contacts
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Documents & Images</CardTitle>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Filename</TableHead>
                            <TableHead>Upload Date</TableHead>
                            <TableHead>Uploaded By</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documents.map(doc => (
                            <TableRow key={doc.id}>
                              <TableCell className="font-medium">{doc.filename}</TableCell>
                              <TableCell>{formatDate(doc.uploadDate)}</TableCell>
                              <TableCell>{doc.uploadedBy}</TableCell>
                              <TableCell>{(doc.fileSize / 1024).toFixed(2)} KB</TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">No documents uploaded yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Locations Tab */}
            <TabsContent value="locations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Locations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Location information and maps will be displayed here once implemented.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-4">
              <ActivityComments activityId={activity.id} />
            </TabsContent>

            {/* Contributors Tab */}
            <TabsContent value="contributors" className="space-y-4">
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
                contributors={activity.contributors || []}
                onChange={updateContributors}
                permissions={permissions}
                activityId={activity.id}
              />
            </TabsContent>

            {/* Government Inputs Tab */}
            {(user?.role?.includes('gov_partner') || user?.role === 'super_user') && (
              <TabsContent value="government-inputs" className="space-y-4">
                {activity.governmentInputs ? (
                  <div className="space-y-6">
                    {/* Display government inputs in read-only format */}
                    <Card>
                      <CardHeader>
                        <CardTitle>On-Budget Classification (per CABRI/SPA model)</CardTitle>
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
                                    <Badge variant={met >= 4 ? "success" : met >= 2 ? "default" : "secondary"}>
                                      {met} of 6 dimensions met
                                    </Badge>
                                    {partial > 0 && (
                                      <Badge variant="outline">{partial} partial</Badge>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          
                          {/* Six Dimensions Display */}
                          <div className="grid gap-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-sm font-medium">On Plan</span>
                                <span className="text-xs text-gray-500">(Reflected in gov't planning documents)</span>
                              </div>
                              <Badge variant={
                                activity.governmentInputs.onBudgetClassification?.onPlan === 'Yes' ? 'success' :
                                activity.governmentInputs.onBudgetClassification?.onPlan === 'Partial' ? 'default' : 'secondary'
                              }>
                                {activity.governmentInputs.onBudgetClassification?.onPlan || 'Not specified'}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-sm font-medium">On Budget</span>
                                <span className="text-xs text-gray-500">(Included in national budget book)</span>
                              </div>
                              <Badge variant={
                                activity.governmentInputs.onBudgetClassification?.onBudget === 'Yes' ? 'success' :
                                activity.governmentInputs.onBudgetClassification?.onBudget === 'Partial' ? 'default' : 'secondary'
                              }>
                                {activity.governmentInputs.onBudgetClassification?.onBudget || 'Not specified'}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-sm font-medium">On Treasury</span>
                                <span className="text-xs text-gray-500">(Disbursed via national treasury)</span>
                              </div>
                              <Badge variant={
                                activity.governmentInputs.onBudgetClassification?.onTreasury === 'Yes' ? 'success' :
                                activity.governmentInputs.onBudgetClassification?.onTreasury === 'Partial' ? 'default' : 'secondary'
                              }>
                                {activity.governmentInputs.onBudgetClassification?.onTreasury || 'Not specified'}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-sm font-medium">On Parliament</span>
                                <span className="text-xs text-gray-500">(Subject to parliamentary scrutiny)</span>
                              </div>
                              <Badge variant={
                                activity.governmentInputs.onBudgetClassification?.onParliament === 'Yes' ? 'success' :
                                activity.governmentInputs.onBudgetClassification?.onParliament === 'Partial' ? 'default' : 'secondary'
                              }>
                                {activity.governmentInputs.onBudgetClassification?.onParliament || 'Not specified'}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-sm font-medium">On Procurement</span>
                                <span className="text-xs text-gray-500">(Uses national procurement systems)</span>
                              </div>
                              <Badge variant={
                                activity.governmentInputs.onBudgetClassification?.onProcurement === 'Yes' ? 'success' :
                                activity.governmentInputs.onBudgetClassification?.onProcurement === 'Partial' ? 'default' : 'secondary'
                              }>
                                {activity.governmentInputs.onBudgetClassification?.onProcurement || 'Not specified'}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-sm font-medium">On Accounting/Audit</span>
                                <span className="text-xs text-gray-500">(Uses national audit systems)</span>
                              </div>
                              <Badge variant={
                                activity.governmentInputs.onBudgetClassification?.onAudit === 'Yes' ? 'success' :
                                activity.governmentInputs.onBudgetClassification?.onAudit === 'Partial' ? 'default' : 'secondary'
                              }>
                                {activity.governmentInputs.onBudgetClassification?.onAudit || 'Not specified'}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Supporting Documents */}
                          {activity.governmentInputs.onBudgetClassification?.supportingDocs?.length > 0 && (
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                              <h4 className="text-sm font-medium mb-3">Supporting Documents</h4>
                              <div className="space-y-2">
                                {activity.governmentInputs.onBudgetClassification.supportingDocs.map((doc: any, index: number) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium">{doc.dimension}:</span>
                                    <span>{doc.docName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Add more cards for other sections of government inputs as needed */}
                    <div className="text-center py-4">
                      <Button variant="outline" onClick={handleEdit}>
                        Edit Government Inputs
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <p className="text-gray-500">No government inputs have been added to this activity yet.</p>
                      <Button variant="outline" className="mt-4" onClick={handleEdit}>
                        Add Government Inputs
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
} 