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
  UserPlus
} from "lucide-react"
import { toast } from "sonner"
import { Transaction } from "@/types/transaction"
import { DisbursementGauge, CumulativeFinanceChart } from "@/components/ActivityCharts"
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
import { TRANSACTION_ACRONYMS, LEGACY_TRANSACTION_TYPE_MAP } from "@/types/transaction"
import { DeleteActivityDialog } from "@/components/DeleteActivityDialog"
import { getActivityPermissions, ActivityContributor } from "@/lib/activity-permissions"
import ContributorsSection from "@/components/ContributorsSection"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Activity {
  id: string
  partnerId: string
  iatiId: string
  title: string
  description: string
  objectives: string
  targetGroups: string
  collaborationType: string
  banner?: string
  activityStatus: string
  publicationStatus: string
  submissionStatus: 'draft' | 'submitted' | 'validated' | 'rejected' | 'published'
  sectors?: any[]
  transactions?: Transaction[]
  extendingPartners?: Array<{ orgId: string; name: string }>
  implementingPartners?: Array<{ orgId: string; name: string }>
  governmentPartners?: Array<{ orgId: string; name: string }>
  contacts?: any[]
  governmentInputs?: any
  comments?: any[]
  contributors?: ActivityContributor[]
  createdBy?: { id: string; name: string; role: string }
  createdByOrg?: string
  plannedStartDate?: string
  plannedEndDate?: string
  actualStartDate?: string
  actualEndDate?: string
  createdAt: string
  updatedAt: string
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
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [activeTab, setActiveTab] = useState("about")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()
  const { user } = useUser()
  const searchParams = useSearchParams()
  
  // Check if user is trying to join as contributor
  const isJoinAction = searchParams.get('action') === 'join'
  
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
    fetchActivity(true)
    loadAllPartners();
  }, [params.id])

  // Refresh activity data when comments tab is selected to ensure we have latest comments count
  useEffect(() => {
    if (activeTab === "comments" && activity) {
      fetchActivity(false) // Don't show loading when just refreshing
    }
  }, [activeTab])

  const fetchActivity = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      const res = await fetch("/api/activities")
      if (res.ok) {
        const activities = await res.json()
        const found = activities.find((a: any) => a.id === params.id)
        if (found) {
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Loading activity...</p>
        </div>
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
    const transactions: Transaction[] = activity?.transactions || []
    const actualTransactions = transactions.filter(t => t.status === "actual")
    
    // Helper function to normalize transaction type
    const normalizeType = (type: string): string => {
      return LEGACY_TRANSACTION_TYPE_MAP[type] || type;
    }
    
    const commitment = actualTransactions
      .filter(t => normalizeType(t.type) === "C")
      .reduce((sum, t) => sum + t.value, 0)
    
    const disbursement = actualTransactions
      .filter(t => normalizeType(t.type) === "D")
      .reduce((sum, t) => sum + t.value, 0)
    
    const expenditure = actualTransactions
      .filter(t => normalizeType(t.type) === "E")
      .reduce((sum, t) => sum + t.value, 0)
    
    // Get unique aid types and flow types
    const aidTypes = Array.from(new Set(transactions.map(t => t.aidType).filter(Boolean)))
    const flowTypes = Array.from(new Set(transactions.map(t => t.flowType).filter(Boolean)))
    
    return {
      totalCommitment: commitment,
      totalDisbursement: disbursement,
      totalExpenditure: expenditure,
      percentDisbursed: commitment > 0 ? (disbursement / commitment) * 100 : 0,
      aidTypes,
      flowTypes
    }
  }

  const financials = calculateFinancials()

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy')
    } catch {
      return 'Not set'
    }
  }

  const getTransactionTypeName = (type: string) => {
    // Handle legacy numeric types
    if (LEGACY_TRANSACTION_TYPE_MAP[type]) {
      return TRANSACTION_ACRONYMS[LEGACY_TRANSACTION_TYPE_MAP[type]];
    }
    // Handle new acronym types
    return TRANSACTION_ACRONYMS[type as keyof typeof TRANSACTION_ACRONYMS] || type;
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
                  <h1 className="text-3xl font-bold text-gray-900">{activity.title}</h1>
                  <p className="text-lg text-gray-600 mt-2">{activity.partnerId && `Partner: ${activity.partnerId}`}</p>
                  
                  {/* IDs and Metadata */}
                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                    <span>MOHINGA ID: {activity.id}</span>
                    {activity.iatiId && <span>IATI ID: {activity.iatiId}</span>}
                    <span>Last Updated: {formatDate(activity.updatedAt)}</span>
                  </div>
                  
                  {/* Status and Dates */}
                  <div className="flex flex-wrap gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">STATUS:</span>
                      <Badge variant={activity.activityStatus === "completed" ? "success" : "default"}>
                        {activity.activityStatus?.toUpperCase() || "PLANNING"}
                      </Badge>
                    </div>
                    {activity.actualStartDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          <span className="font-medium">ACTUAL START DATE:</span> {formatDate(activity.actualStartDate)}
                        </span>
                      </div>
                    )}
                    {activity.plannedEndDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          <span className="font-medium">PLANNED END DATE:</span> {formatDate(activity.plannedEndDate)}
                        </span>
                      </div>
                    )}
                  </div>
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

          {/* Activity Metadata Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="space-y-4">
              {/* Activity Title */}
              <h2 className="text-2xl font-semibold text-gray-900">{activity.title}</h2>
              
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Activity ID(s):</span>
                  <span className="ml-2 font-medium">
                    {activity.id}
                    {activity.iatiId && ` | IATI: ${activity.iatiId}`}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-500">Name of creator:</span>
                  <span className="ml-2 font-medium">{activity.createdBy?.name || 'Unknown'}</span>
                </div>
                
                <div>
                  <span className="text-gray-500">Date created:</span>
                  <span className="ml-2 font-medium">{formatDate(activity.createdAt)}</span>
                </div>
                
                <div>
                  <span className="text-gray-500">Last edited date:</span>
                  <span className="ml-2 font-medium">{formatDate(activity.updatedAt)}</span>
                </div>
                
                <div className="col-span-2">
                  <span className="text-gray-500">Organisation that created the activity:</span>
                  <span className="ml-2 font-medium">
                    {(() => {
                      // Find the organization details from partners
                      const creatorOrg = partners.find(p => p.id === activity.createdByOrg);
                      if (creatorOrg) {
                        return `${creatorOrg.name}`;
                      }
                      return activity.createdByOrg || 'Unknown Organization';
                    })()}
                  </span>
                </div>
                
                <div className="col-span-2">
                  <div className="text-gray-500 mb-2">List of Activity Contributors:</div>
                  {activity.contributors && activity.contributors.length > 0 ? (
                    <div className="space-y-1">
                      {activity.contributors
                        .filter(c => c.status === 'accepted')
                        .map((contributor, idx) => {
                          // Find the full partner details
                          const partner = allPartners.find(p => p.id === contributor.organizationId);
                          if (partner) {
                            let display = `${partner.acronym || partner.code || partner.id} - ${partner.fullName || partner.name}`;
                            if (partner.countryRepresented) {
                              display += ` (${partner.countryRepresented})`;
                            }
                            return (
                              <div key={contributor.id} className="font-medium">
                                {display}
                              </div>
                            );
                          }
                          return (
                            <div key={contributor.id} className="font-medium">
                              {contributor.organizationName}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">No contributors yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content with Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className={`grid w-full ${(user?.role?.includes('gov_partner') || user?.role === 'super_user') ? 'grid-cols-9' : 'grid-cols-8'}`}>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="sectors">Sectors</TabsTrigger>
              <TabsTrigger value="contributors">Contributors</TabsTrigger>
              <TabsTrigger value="organisations">Organisations</TabsTrigger>
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="finances">Finances</TabsTrigger>
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
                            <div className="font-medium">{sector.name}</div>
                            <div className="text-gray-500">
                              {sector.code} • {sector.percentage}% • {sector.type}
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
                  {activity.objectives && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Objectives</h4>
                      <p className="text-gray-700">{activity.objectives}</p>
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
                          activity.transactions.map((transaction: Transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-medium">
                                {transaction.aidType ? getAidTypeName(transaction.aidType) : '-'}
                              </TableCell>
                              <TableCell>
                                {transaction.flowType ? getFlowTypeName(transaction.flowType) : '-'}
                              </TableCell>
                              <TableCell>{transaction.providerOrg || '-'}</TableCell>
                              <TableCell>{transaction.receiverOrg || '-'}</TableCell>
                              <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                              <TableCell>{getTransactionTypeName(transaction.type)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {transaction.currency} {transaction.value.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-gray-500">
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