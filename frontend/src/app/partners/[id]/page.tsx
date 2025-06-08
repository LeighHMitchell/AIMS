"use client"

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser, mockUsers } from "@/hooks/useUser";
import { usePartners } from "@/hooks/usePartners";
import { User } from "@/types/user";
import { 
  Building2, 
  Users, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  DollarSign,
  Activity,
  Facebook,
  Twitter,
  Linkedin,
  Edit,
  FileText,
  PieChart,
  BarChart,
  Filter,
  Download,
  Printer,
  Plus,
  ArrowLeft,
  X,
  Loader2,
  Copy,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { LEGACY_TRANSACTION_TYPE_MAP } from "@/types/transaction";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  OrganizationFieldHelp, 
  ORGANIZATION_TYPES, 
  COUNTRIES, 
  calculateCooperationModality,
  calculateOrgClassification
} from "@/components/OrganizationFieldHelpers";
import { ImageUpload } from "@/components/ImageUpload";
import StrategiesTab from "@/components/StrategiesTab";

// Helper function to determine development partner status based on cooperation modality
const getIsDevelopmentPartnerFromModality = (modality: string) => {
  return ['Multilateral', 'Regional', 'External', 'Global'].includes(modality);
};

export default function PartnerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, permissions } = useUser();
  const { partners, getPartnerById, updatePartner, deletePartner } = usePartners();
  const [activeTab, setActiveTab] = useState("about");
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    iatiOrgId: "",
    fullName: "",
    acronym: "",
    countryRepresented: "",
    organisationType: "",
    cooperationModality: "External" as "Multilateral" | "Regional" | "External" | "Internal" | "Global" | "Other",

    orgClassification: "Other" as "Development Partner" | "Partner Government" | "Civil Society – International" | "Civil Society – Domestic" | "Private Sector – International" | "Private Sector – Domestic" | "Other",
    orgClassificationOverride: false,
    description: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    logo: "",
    banner: "",
    type: "development_partner" as "development_partner" | "bilateral" | "partner_government" | "other"
  });
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const partner = getPartnerById(params.id as string);

  useEffect(() => {
    if (!partner && partners.length > 0) {
      router.push("/partners");
    }
  }, [partner, partners, router]);

  useEffect(() => {
    // Fetch activities to calculate metrics
    fetchActivities();
    // Get team members for this organization
    if (partner) {
      const members = mockUsers.filter(u => u.organizationId === partner.id);
      setTeamMembers(members);
      
      // Initialize form data for edit dialog
      setFormData({
        name: partner.name,
        iatiOrgId: partner.iatiOrgId || "",
        fullName: partner.fullName || partner.name || "",
        acronym: partner.acronym || "",
        countryRepresented: partner.countryRepresented || "",
        organisationType: partner.organisationType || "",
        cooperationModality: partner.cooperationModality || "External",
    
        orgClassification: (partner.orgClassification || calculateOrgClassification(
          partner.countryRepresented || "",
          partner.organisationType || "",
          partner.cooperationModality
        )) as "Development Partner" | "Partner Government" | "Civil Society – International" | "Civil Society – Domestic" | "Private Sector – International" | "Private Sector – Domestic" | "Other",
        orgClassificationOverride: false,
        description: partner.description || "",
        website: partner.website || "",
        email: partner.email || "",
        phone: partner.phone || "",
        address: partner.address || "",
        logo: partner.logo || "",
        banner: partner.banner || "",
        type: partner.type as any || "development_partner"
      });
    }
  }, [partner]);

  const fetchActivities = async () => {
    try {
      const res = await fetch("/api/activities");
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  // Calculate metrics for this partner
  const calculatePartnerMetrics = () => {
    if (!partner) return { totalFunding: 0, activeProjects: 0, completedProjects: 0 };

    let totalFunding = 0;
    let activeProjects = 0;
    let completedProjects = 0;

    // Get all users from this organization
    const organizationUsers = mockUsers.filter(u => u.organizationId === partner.id);
    const organizationUserIds = organizationUsers.map(u => u.id);

    activities.forEach(activity => {
      // Check if this activity was created by a user from this organization
      const isCreatedByOrgUser = activity.createdBy && organizationUserIds.includes(activity.createdBy.id);
      
      // Also check if the activity's createdByOrg matches this partner
      const isCreatedByThisOrg = activity.createdByOrg === partner.name;
      
      // Check if this partner is involved in the activity transactions
      const isInvolvedInTransactions = activity.transactions?.some((t: any) => 
        t.providerOrg === partner.name || t.receiverOrg === partner.name
      );

      // Activity is related to this partner if created by org user, created by this org, or involved in transactions
      const isRelatedToPartner = isCreatedByOrgUser || isCreatedByThisOrg || isInvolvedInTransactions;

      if (isRelatedToPartner) {
        // Check both new fields first, fallback to old status field for backward compatibility
        const activityStatus = activity.activityStatus || 
          (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "");
        const publicationStatus = activity.publicationStatus || 
          (activity.status === "published" ? "published" : "draft");
        
        // Count as active if in implementation status (regardless of publication status for org view)
        if (activityStatus === "implementation") {
          activeProjects++;
        }
        // Count as completed if completed
        if (activityStatus === "completed") {
          completedProjects++;
        }

        // Calculate funding from commitment transactions where this partner is the provider
        activity.transactions?.forEach((t: any) => {
          // Normalize transaction type to handle both legacy and new types
          const normalizedType = LEGACY_TRANSACTION_TYPE_MAP[t.type] || t.type;
          
          if (t.providerOrg === partner.name && normalizedType === "C" && t.status === "actual") {
            totalFunding += t.value;
          }
        });
      }
    });

    return { totalFunding, activeProjects, completedProjects };
  };

  const { totalFunding, activeProjects, completedProjects } = calculatePartnerMetrics();

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.fullName?.trim()) {
      errors.fullName = "Full name is required";
    }
    
    if (!formData.acronym?.trim()) {
      errors.acronym = "Acronym is required";
    }
    
    if (!formData.countryRepresented) {
      errors.countryRepresented = "Country is required";
    }
    
    if (!formData.organisationType) {
      errors.organisationType = "Organisation type is required";
    }
    
    if (!formData.cooperationModality) {
      errors.cooperationModality = "Cooperation modality is required";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!partner) return;
    
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    setSubmitting(true);
    try {
      console.log('[AIMS DEBUG] Starting organization update...');
      console.log('[AIMS DEBUG] Form data:', formData);
      console.log('[AIMS DEBUG] Partner ID:', partner.id);
      console.log('[AIMS DEBUG] User:', user);
      
      // Use acronym as the display name, or fallback to fullName
      const dataToSave = {
        ...formData,
        name: formData.acronym || formData.fullName || formData.name
      };
      
      console.log('[AIMS DEBUG] Data to save:', dataToSave);
      
      await updatePartner(partner.id, dataToSave, user);
      setShowEditDialog(false);
      toast.success("Organization profile updated successfully");
    } catch (error: any) {
      console.error('[AIMS ERROR] Failed to update organization:', error);
      console.error('[AIMS ERROR] Error details:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      
      // Show more specific error message if available
      const errorMessage = error.message || "Failed to update organization profile";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePartner = async () => {
    if (!partner) return;
    
    // Verify confirmation text
    if (deleteConfirmText !== partner.name) {
      toast.error("Please type the organization name exactly to confirm deletion");
      return;
    }

    setIsDeleting(true);
    try {
      await deletePartner(partner.id);
      toast.success(`Organization "${partner.name}" has been deleted successfully`);
      setShowDeleteDialog(false);
      setShowEditDialog(false);
      router.push("/partners"); // Navigate back to partners list
    } catch (error: any) {
      console.error("Error deleting organization:", error);
      toast.error(error.message || "Failed to delete organization");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!partner) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-500">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => router.push("/partners")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Partners
          </Button>

          {/* Hero Section with Banner */}
          {partner.banner && (
            <div className="relative w-full h-48 rounded-lg overflow-hidden mb-6">
              <img 
                src={partner.banner} 
                alt={`${partner.name} banner`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          )}

          <Card className="mb-6">
            <CardContent className="p-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="bg-slate-100 p-4 rounded-lg">
                  {partner.logo ? (
                    <img 
                      src={partner.logo} 
                      alt={partner.name}
                      className="h-16 w-16 object-contain"
                    />
                  ) : (
                    <Building2 className="h-16 w-16 text-slate-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">{partner.name}</h1>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                      {partner.orgClassification || 'Other'}
                    </Badge>
                    {partner.countryRepresented && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{partner.countryRepresented}</span>
                      </div>
                    )}
                    <span>Member since {new Date(partner.createdAt).getFullYear()}</span>
                  </div>
                </div>
                {permissions.canManageUsers && (
                  <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-6 border-t border-b border-slate-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">${(totalFunding / 1000000).toFixed(1)}M</div>
                  <div className="text-sm text-slate-600">Total Funding</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{activeProjects}</div>
                  <div className="text-sm text-slate-600">Active Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{completedProjects}</div>
                  <div className="text-sm text-slate-600">Completed Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{teamMembers.length}</div>
                  <div className="text-sm text-slate-600">Team Members</div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mt-6 space-y-3">
                {partner.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <a 
                      href={partner.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {partner.website}
                    </a>
                  </div>
                )}
                {partner.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a 
                      href={`mailto:${partner.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {partner.email}
                    </a>
                  </div>
                )}
                {partner.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{partner.phone}</span>
                  </div>
                )}
                {partner.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <span>{partner.address}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="strategies">Strategies</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
            </TabsList>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Background</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 leading-relaxed">
                      {partner.description || "No description available."}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Organization Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">Organization Classification</h4>
                      <Badge variant="outline" className="text-sm">
                        {partner.orgClassification || 'Other'}
                      </Badge>
                    </div>
                    
                    {partner.organisationType && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-1">Organization Type</h4>
                        <p className="text-slate-900">
                          {partner.organisationType} - {ORGANIZATION_TYPES.find(t => t.value === partner.organisationType)?.label || 'Unknown Type'}
                        </p>
                      </div>
                    )}
                    
                    {partner.cooperationModality && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-1">Cooperation Modality</h4>
                        <p className="text-slate-900">{partner.cooperationModality}</p>
                      </div>
                    )}
                    

                    
                    {partner.iatiOrgId && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-1">IATI Organization ID</h4>
                        <p className="text-slate-900 font-mono text-sm">{partner.iatiOrgId}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Financials Tab */}
            <TabsContent value="financials" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Funding Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-600">Total Commitments</p>
                        <p className="text-2xl font-bold">${totalFunding.toLocaleString()}</p>
                      </div>
                      <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                        <p className="text-slate-500">Financial charts will be displayed here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Activity Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Active Projects</span>
                        <span className="font-bold">{activeProjects}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Completed Projects</span>
                        <span className="font-bold">{completedProjects}</span>
                      </div>
                      <div className="h-48 flex items-center justify-center bg-slate-50 rounded-lg">
                        <p className="text-slate-500">Status chart will be displayed here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Activities Tab */}
            <TabsContent value="activities" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Partner Activities</CardTitle>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities
                      .filter(activity => 
                        activity.transactions?.some((t: any) => 
                          t.providerOrg === partner.name || t.receiverOrg === partner.name
                        )
                      )
                      .map((activity) => (
                        <div 
                          key={activity.id} 
                          className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 cursor-pointer"
                          onClick={() => router.push(`/activities/${activity.id}`)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-slate-900">{activity.title}</h4>
                              <div className="mt-2 space-y-1 text-sm text-slate-600">
                                <p>
                                  <span className="font-medium">Activity Status:</span> {
                                    activity.activityStatus || 
                                    (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "planning")
                                  }
                                </p>
                                <p>
                                  <span className="font-medium">Publication Status:</span> {
                                    activity.publicationStatus || 
                                    (activity.status === "published" ? "published" : "draft")
                                  }
                                </p>
                                {activity.partnerId && (
                                  <p><span className="font-medium">Partner ID:</span> {activity.partnerId}</p>
                                )}
                                {activity.sectors && activity.sectors.length > 0 && (
                                  <p><span className="font-medium">Sectors:</span> {activity.sectors.map((s: any) => s.name).join(", ")}</p>
                                )}
                              </div>
                            </div>
                            <Badge variant={
                              (activity.activityStatus === "implementation" || activity.status === "implementation") 
                                ? "default" : "secondary"
                            }>
                              {activity.activityStatus || 
                               (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "planning")}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    {activities.filter(activity => 
                      activity.transactions?.some((t: any) => 
                        t.providerOrg === partner.name || t.receiverOrg === partner.name
                      )
                    ).length === 0 && (
                      <p className="text-center text-slate-500 py-8">No activities found for this partner.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Strategies Tab */}
            <TabsContent value="strategies" className="space-y-6">
              <StrategiesTab
                organizationId={partner.id}
                organizationName={partner.name}
                isPublicView={!user || !permissions.canManageUsers}
                userCanEdit={permissions.canManageUsers}
              />
            </TabsContent>

            {/* People Tab */}
            <TabsContent value="people" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="bg-slate-100 p-3 rounded-full">
                            <Users className="h-5 w-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{member.name}</p>
                            <p className="text-sm text-slate-600">{member.title || member.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-600">{member.email}</p>
                          {member.phone && <p className="text-sm text-slate-600">{member.phone}</p>}
                        </div>
                      </div>
                    ))}
                    {teamMembers.length === 0 && (
                      <p className="text-center text-slate-500 py-8">No team members found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Organization Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Organization Profile</DialogTitle>
            <DialogDescription>
              Update organization information and details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePartner} className="space-y-4">
            {/* IATI Organisation Identifier */}
            <div>
              <label htmlFor="iatiOrgId" className="text-sm font-medium flex items-center">
                IATI Organisation Identifier
                <OrganizationFieldHelp field="iatiOrgId" />
              </label>
              <Input
                id="iatiOrgId"
                value={formData.iatiOrgId}
                onChange={(e) => {
                  setFormData({ ...formData, iatiOrgId: e.target.value });
                  if (validationErrors.iatiOrgId) {
                    setValidationErrors({ ...validationErrors, iatiOrgId: "" });
                  }
                }}
                placeholder="e.g., XM-DAC-12-1"
                className={validationErrors.iatiOrgId ? "border-red-500" : ""}
              />
              {validationErrors.iatiOrgId && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.iatiOrgId}</p>
              )}
            </div>

            {/* UUID (Read-only) */}
            <div>
              <label htmlFor="uuid" className="text-sm font-medium flex items-center">
                Organization UUID
                <OrganizationFieldHelp field="uuid" />
              </label>
              <div className="relative">
                <Input
                  id="uuid"
                  value={partner.id}
                  disabled
                  className="bg-gray-100 pr-10 font-mono text-sm"
                  placeholder="System Generated"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(partner.id);
                    toast.success('UUID copied to clipboard');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Copy UUID to clipboard"
                >
                  <Copy className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This unique identifier is used internally by the system
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="text-sm font-medium flex items-center">
                Full Name *
                <OrganizationFieldHelp field="fullName" />
              </label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  if (validationErrors.fullName) {
                    setValidationErrors({ ...validationErrors, fullName: "" });
                  }
                }}
                placeholder="e.g., Australian Department of Foreign Affairs and Trade"
                className={validationErrors.fullName ? "border-red-500" : ""}
                required
              />
              {validationErrors.fullName && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.fullName}</p>
              )}
            </div>

            {/* Acronym / Short Name */}
            <div>
              <label htmlFor="acronym" className="text-sm font-medium flex items-center">
                Acronym / Short Name *
                <OrganizationFieldHelp field="acronym" />
              </label>
              <Input
                id="acronym"
                value={formData.acronym}
                onChange={(e) => {
                  setFormData({ ...formData, acronym: e.target.value });
                  if (validationErrors.acronym) {
                    setValidationErrors({ ...validationErrors, acronym: "" });
                  }
                }}
                placeholder="e.g., DFAT"
                className={validationErrors.acronym ? "border-red-500" : ""}
                required
              />
              {validationErrors.acronym && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.acronym}</p>
              )}
            </div>

            {/* Country Represented */}
            <div>
              <label htmlFor="country" className="text-sm font-medium flex items-center">
                Country Represented *
                <OrganizationFieldHelp field="countryRepresented" />
              </label>
              <Select 
                value={formData.countryRepresented} 
                onValueChange={(value) => {
                  setFormData({ ...formData, countryRepresented: value });
                  if (validationErrors.countryRepresented) {
                    setValidationErrors({ ...validationErrors, countryRepresented: "" });
                  }
                }}
              >
                <SelectTrigger 
                  id="country"
                  className={validationErrors.countryRepresented ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Select 'Global / Not Country-Specific' for multilaterals or regional organisations like UN agencies, the World Bank, etc.
              </p>
              {validationErrors.countryRepresented && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.countryRepresented}</p>
              )}
            </div>

            {/* Organisation Type */}
            <div>
              <label htmlFor="organisationType" className="block text-sm font-medium mb-1.5">
                <span className="flex items-center">
                  Organisation Type *
                  <OrganizationFieldHelp field="organisationType" />
                </span>
              </label>
              <Select 
                value={formData.organisationType} 
                onValueChange={(value) => {
                  setFormData({ ...formData, organisationType: value });
                  if (validationErrors.organisationType) {
                    setValidationErrors({ ...validationErrors, organisationType: "" });
                  }
                }}
              >
                <SelectTrigger 
                  id="organisationType"
                  className={`text-left ${validationErrors.organisationType ? "border-red-500" : ""}`}
                >
                  <SelectValue placeholder="Select organisation type" />
                </SelectTrigger>
                <SelectContent align="start">
                  {ORGANIZATION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="text-left">
                        <div className="font-medium">{type.value} - {type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.organisationType && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.organisationType}</p>
              )}
            </div>

            {/* Cooperation Modality */}
            <div>
              <label htmlFor="cooperationModality" className="text-sm font-medium flex items-center">
                Cooperation Modality *
                <OrganizationFieldHelp field="cooperationModality" />
              </label>
              <Select 
                value={formData.cooperationModality} 
                onValueChange={(value) => {
                  const cooperationModality = value as "Multilateral" | "Regional" | "External" | "Internal" | "Global" | "Other";
                  setFormData({ 
                    ...formData, 
                    cooperationModality
                  });
                  if (validationErrors.cooperationModality) {
                    setValidationErrors({ ...validationErrors, cooperationModality: "" });
                  }
                }}
              >
                <SelectTrigger 
                  id="cooperationModality"
                  className={validationErrors.cooperationModality ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select cooperation modality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Multilateral">Multilateral</SelectItem>
                  <SelectItem value="Regional">Regional</SelectItem>
                  <SelectItem value="External">External</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="Global">Global</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.cooperationModality && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.cooperationModality}</p>
              )}
            </div>



            {/* Organization Classification */}
            <div>
              <label htmlFor="orgClassification" className="text-sm font-medium flex items-center">
                Organization Classification
                <OrganizationFieldHelp field="orgClassification" />
              </label>
              
              {permissions.canManageUsers ? (
                <>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id="orgClassificationOverride"
                      checked={formData.orgClassificationOverride || false}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        orgClassificationOverride: e.target.checked,
                        // Reset to auto-calculated if unchecking override
                        ...(e.target.checked ? {} : {
                          orgClassification: calculateOrgClassification(
                            formData.countryRepresented,
                            formData.organisationType,
                            formData.cooperationModality
                          ) as any
                        })
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="orgClassificationOverride" className="text-sm font-medium">
                      Manual Override (Admin)
                    </label>
                  </div>
                  
                  {formData.orgClassificationOverride ? (
                    <Select 
                      value={formData.orgClassification} 
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        orgClassification: value as any
                      })}
                    >
                      <SelectTrigger id="orgClassification">
                        <SelectValue placeholder="Select classification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Development Partner">Development Partner</SelectItem>
                        <SelectItem value="Partner Government">Partner Government</SelectItem>
                        <SelectItem value="Civil Society – International">Civil Society – International</SelectItem>
                        <SelectItem value="Civil Society – Domestic">Civil Society – Domestic</SelectItem>
                        <SelectItem value="Private Sector – International">Private Sector – International</SelectItem>
                        <SelectItem value="Private Sector – Domestic">Private Sector – Domestic</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="orgClassification"
                      value={calculateOrgClassification(
                        formData.countryRepresented,
                        formData.organisationType,
                        formData.cooperationModality
                      )}
                      disabled
                      className="bg-gray-100"
                      placeholder="Auto-calculated based on country, type, and development partner status"
                    />
                  )}
                </>
              ) : (
                <Input
                  id="orgClassification"
                  value={formData.orgClassification || calculateOrgClassification(
                    formData.countryRepresented,
                    formData.organisationType,
                    formData.cooperationModality
                  )}
                  disabled
                  className="bg-gray-100"
                  placeholder="Auto-calculated based on country, type, and development partner status"
                />
              )}
              
              <p className="text-xs text-gray-500 mt-1">
                {permissions.canManageUsers 
                  ? "Automatically calculated unless manually overridden by admin" 
                  : "This classification is automatically determined based on organization details"
                }
              </p>
            </div>

            <div>
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the organization"
                rows={3}
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="text-sm font-medium">Partner Logo</label>
              <div className="mt-2">
                <ImageUpload
                  currentImage={formData.logo}
                  onImageChange={(image) => setFormData({ ...formData, logo: image || "" })}
                  label="Partner Logo"
                  aspectRatio="square"
                  previewHeight="h-20"
                  previewWidth="w-20"
                  id="logo-upload"
                />
              </div>
            </div>

            {/* Banner Upload */}
            <div>
              <label className="text-sm font-medium">Banner Image</label>
              <div className="mt-2">
                <ImageUpload
                  currentImage={formData.banner}
                  onImageChange={(image) => setFormData({ ...formData, banner: image || "" })}
                  label="Banner Image"
                  aspectRatio="banner"
                  previewHeight="h-32"
                  previewWidth="w-full"
                  id="banner-upload"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="website" className="text-sm font-medium">Website</label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.org"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@example.org"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="text-sm font-medium">Phone</label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div>
              <label htmlFor="address" className="text-sm font-medium">Address</label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
                rows={2}
              />
            </div>

            <div className="flex justify-between pt-4 border-t">
              {/* Delete button - only for admins */}
              {permissions.canManageUsers && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Organization
                </Button>
              )}
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !formData.fullName.trim() || !formData.acronym.trim() || !formData.cooperationModality}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Organization'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Organization
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the organization and remove all associated data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> Deleting this organization will:
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  <li>Remove all organization data permanently</li>
                  <li>Cannot be undone</li>
                  <li>May affect related activities and data</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div>
              <label htmlFor="deleteConfirm" className="text-sm font-medium">
                Type <strong>{partner?.name}</strong> to confirm deletion:
              </label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={partner?.name}
                className="mt-1"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeletePartner}
              disabled={isDeleting || deleteConfirmText !== partner?.name}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Organization
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
} 