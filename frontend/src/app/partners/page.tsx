"use client"

import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useUser, mockUsers } from "@/hooks/useUser";
import { usePartners, type Partner } from "@/hooks/usePartners";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { 
  Building2, 
  Users, 
  Search, 
  Globe, 
  MapPin,
  DollarSign,
  Activity,
  ExternalLink,
  Plus,
  Loader2,
  Download,
  Upload,
  X,
  Briefcase,
  Flag,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Mail,
  Phone,
  FolderOpen,
  Calendar,
  Clock,
  Edit,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LEGACY_TRANSACTION_TYPE_MAP } from "@/types/transaction";
import { 
  OrganizationFieldHelp, 
  ORGANIZATION_TYPES, 
  COUNTRIES, 
  calculateCooperationModality 
} from "@/components/OrganizationFieldHelpers";

type SortField = 'name' | 'type' | 'countryRepresented' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const getPartnerTypeIcon = (type: string) => {
  switch (type) {
    case 'development_partner':
      return <Globe className="h-4 w-4" />;
    case 'partner_government':
      return <Building2 className="h-4 w-4" />;
    case 'bilateral':
      return <Flag className="h-4 w-4" />;
    default:
      return <Briefcase className="h-4 w-4" />;
  }
};

const getPartnerTypeLabel = (type: string) => {
  switch (type) {
    case 'development_partner':
      return 'Development Partner';
    case 'partner_government':
      return 'Partner Government';
    case 'bilateral':
      return 'Bilateral Partner';
    default:
      return 'Other';
  }
};

export default function PartnersPage() {
  const router = useRouter();
  const { user, permissions } = useUser();
  const { partners, loading, createPartner, getDevelopmentPartners } = usePartners();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [partnerType, setPartnerType] = useState<'development_partner' | 'partner_government' | 'bilateral' | 'other'>('development_partner');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [formData, setFormData] = useState({
    name: "",
    iatiOrgId: "",
    fullName: "",
    acronym: "",
    countryRepresented: "",
    organisationType: "",
    description: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    logo: "",
    banner: ""
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("development");
  const [organizationGroupsCount, setOrganizationGroupsCount] = useState(0);
  const [organizationGroups, setOrganizationGroups] = useState<any[]>([]);

  // Fetch activities to calculate metrics
  useEffect(() => {
    fetchActivities();
    fetchOrganizationGroupsCount();
  }, []);

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

  const fetchOrganizationGroupsCount = async () => {
    try {
      const res = await fetch("/api/organization-groups");
      if (res.ok) {
        const data = await res.json();
        setOrganizationGroups(data);
        setOrganizationGroupsCount(data.length);
      }
    } catch (error) {
      console.error("Error fetching organization groups:", error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-gray-700" />
      : <ChevronDown className="h-4 w-4 text-gray-700" />;
  };

  const sortPartners = (partnersToSort: Partner[]) => {
    return [...partnersToSort].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'countryRepresented':
          aValue = a.countryRepresented?.toLowerCase() || '';
          bValue = b.countryRepresented?.toLowerCase() || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const developmentPartners = getDevelopmentPartners();
  const governmentPartners = partners.filter(p => p.type === 'partner_government');
  const filteredDevelopmentPartners = sortPartners(developmentPartners.filter(partner =>
    partner.type === 'development_partner' && (
      partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ));
  const filteredGovernmentPartners = sortPartners(governmentPartners.filter(partner =>
    partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  // Calculate metrics
  const calculateMetrics = () => {
    // Total Funding: Sum all commitments from development partners
    let totalFunding = 0;
    activities.forEach(activity => {
      if (activity.transactions) {
        activity.transactions.forEach((transaction: any) => {
          // Check if provider is a development partner and transaction is commitment (type "2" or "C") and actual
          const isFromDevPartner = partners.some(p => 
            p.type === 'development_partner' && p.name === transaction.providerOrg
          );
          
          // Normalize transaction type to handle both legacy and new types
          const normalizedType = LEGACY_TRANSACTION_TYPE_MAP[transaction.type] || transaction.type;
          
          if (isFromDevPartner && normalizedType === "C" && transaction.status === "actual") {
            totalFunding += transaction.value;
          }
        });
      }
    });

    // Active Projects: Count of published activities in implementation stage
    const activeProjects = activities.filter(a => {
      // Check both new fields first, fallback to old status field for backward compatibility
      const activityStatus = a.activityStatus || (a.status && !["published", "draft"].includes(a.status) ? a.status : "");
      const publicationStatus = a.publicationStatus || (a.status === "published" ? "published" : "draft");
      
      return activityStatus === "implementation" && publicationStatus === "published";
    }).length;

    // Countries: Total number of bilateral partners
    const bilateralPartners = partners.filter(p => p.type === 'bilateral').length;

    return { totalFunding, activeProjects, bilateralPartners };
  };

  const { totalFunding, activeProjects, bilateralPartners } = calculateMetrics();

  // Calculate active projects for a specific partner - memoized to update when activities change
  const calculatePartnerActiveProjects = useMemo(() => {
    return (partnerId: string, partnerName: string) => {
      // Get all users from this organization
      const organizationUsers = mockUsers.filter(u => u.organizationId === partnerId);
      const organizationUserIds = organizationUsers.map(u => u.id);

      let activeProjectCount = 0;
      
      activities.forEach(activity => {
        // Check if this activity was created by a user from this organization
        const isCreatedByOrgUser = activity.createdBy && organizationUserIds.includes(activity.createdBy.id);
        
        // Also check if the activity's createdByOrg matches this partner
        const isCreatedByThisOrg = activity.createdByOrg === partnerName;
        
        // Also check if partner is involved in transactions
        const isInvolvedInTransactions = activity.transactions?.some((t: any) => 
          t.providerOrg === partnerName || t.receiverOrg === partnerName
        );
        
        // Activity is related to this partner if any of the above conditions are true
        const isRelatedToPartner = isCreatedByOrgUser || isCreatedByThisOrg || isInvolvedInTransactions;

        if (isRelatedToPartner) {
          // Check both new fields first, fallback to old status field for backward compatibility
          const activityStatus = activity.activityStatus || 
            (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "");
          
          // Count as active if in implementation status
          if (activityStatus === "implementation") {
            activeProjectCount++;
          }
        }
      });

      return activeProjectCount;
    };
  }, [activities]); // Recalculate when activities change

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset validation errors
    setValidationErrors({});
    
    // Validate required fields
    const errors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = "Full Name is required";
    }
    if (!formData.acronym.trim()) {
      errors.acronym = "Acronym is required";
    }
    if (!formData.countryRepresented.trim()) {
      errors.countryRepresented = "Country Represented is required";
    }
    if (!formData.organisationType.trim()) {
      errors.organisationType = "Organisation Type is required";
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      // Use acronym as the display name, or fallback to fullName
      const dataToSubmit = {
        ...formData,
        name: formData.acronym || formData.fullName,
        type: partnerType,
      };
      
      await createPartner(dataToSubmit, user);
      setShowAddDialog(false);
      setFormData({
        name: "",
        iatiOrgId: "",
        fullName: "",
        acronym: "",
        countryRepresented: "",
        organisationType: "",
        description: "",
        website: "",
        email: "",
        phone: "",
        address: "",
        logo: "",
        banner: ""
      });
      setValidationErrors({});
      setPartnerType('development_partner');
    } catch (error) {
      // Error is already handled by usePartners hook
    } finally {
      setSubmitting(false);
    }
  };

  const exportPartners = () => {
    const dataToExport = developmentPartners.map(partner => ({
      "Partner ID": partner.id,
      "Partner Name": partner.name,
      "Partner Type": partner.type === 'development_partner' ? 'Development Partner' : 
                     partner.type === 'bilateral' ? 'Bilateral Partner' :
                     partner.type === 'partner_government' ? 'Partner Government' : 
                     'Other',
      "Country Represented": partner.countryRepresented || "",
      "Description": partner.description || "",
      "Website": partner.website || "",
      "Email": partner.email || "",
      "Phone": partner.phone || "",
      "Address": partner.address || "",
      "Registration Status": "Active",
      "Total Committed": 0, // These would need to be calculated from activities
      "Total Disbursed": 0, // These would need to be calculated from activities
      "Created Date": format(new Date(partner.createdAt), "yyyy-MM-dd"),
      "Updated Date": format(new Date(partner.updatedAt), "yyyy-MM-dd"),
    }));

    const headers = Object.keys(dataToExport[0] || {});
    const csv = [
      headers.join(","),
      ...dataToExport.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === "string" && value.includes(",") 
            ? `"${value}"` 
            : value;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `partners-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Partners exported successfully");
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-slate-600">Loading partners...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Check if we should display in card view or table view
  const shouldUseTableView = activeTab === 'development' || activeTab === 'government';

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">Organizations</h1>
            <p className="text-lg text-slate-600">
              Manage development partners and government entities
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Partners</CardTitle>
                  <Building2 className="h-4 w-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{developmentPartners.length}</div>
                <p className="text-xs text-slate-500 mt-1">Active organizations</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Funding</CardTitle>
                  <DollarSign className="h-4 w-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  ${totalFunding.toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 mt-1">Committed funding</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">Active Projects</CardTitle>
                  <Activity className="h-4 w-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{activeProjects}</div>
                <p className="text-xs text-slate-500 mt-1">In implementation</p>
              </CardContent>
            </Card>

            <Card 
              className="bg-white border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push('/partners/groups')}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">Organization Groups</CardTitle>
                  <FolderOpen className="h-4 w-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{organizationGroupsCount}</div>
                <p className="text-xs text-slate-500 mt-1">Custom groups</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8 bg-white border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900">Partner Organizations</CardTitle>
                  <CardDescription className="text-slate-600">
                    Browse and explore our development partner network
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {partners.length > 0 && (
                    <Button 
                      variant="outline"
                      onClick={exportPartners}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export All Partners
                    </Button>
                  )}
                  {permissions.canManageUsers && (
                    <Button 
                      className="bg-slate-900 hover:bg-slate-800"
                      onClick={() => setShowAddDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Organization
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search organizations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 border-slate-200 focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="development">
                    Development Partners ({developmentPartners.filter(p => p.type === 'development_partner').length})
                  </TabsTrigger>
                  <TabsTrigger value="government">
                    Partner Government Entities ({governmentPartners.length})
                  </TabsTrigger>
                  <TabsTrigger value="groups">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Organization Groups ({organizationGroupsCount})
                  </TabsTrigger>
                </TabsList>

                {/* Development Partners Tab - Table View */}
                <TabsContent value="development">
                  {loading ? (
                    <div className="text-center text-gray-500 py-8">Loading development partners...</div>
                  ) : filteredDevelopmentPartners.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      {searchTerm ? 'No development partners found matching your search' : 'No development partners yet'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredDevelopmentPartners.map((partner) => (
                        <Card 
                          key={partner.id} 
                          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => router.push(`/partners/${partner.id}`)}
                        >
                          {/* Banner Image */}
                          {partner.banner && (
                            <div className="h-32 overflow-hidden">
                              <img 
                                src={partner.banner} 
                                alt={`${partner.name} banner`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          <CardContent className="p-6">
                            {/* Logo and Name */}
                            <div className="flex items-start gap-4 mb-4">
                              {partner.logo ? (
                                <img 
                                  src={partner.logo} 
                                  alt={partner.name} 
                                  className="h-12 w-12 object-contain rounded"
                                />
                              ) : (
                                <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                                  <Globe className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                                  {partner.name}
                                </h3>
                                <Badge variant="secondary" className="text-xs">
                                  {getPartnerTypeLabel(partner.type)}
                                </Badge>
                              </div>
                            </div>

                            {/* Description */}
                            {partner.description && (
                              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                {partner.description}
                              </p>
                            )}

                            {/* Stats and Info */}
                            <div className="space-y-2 text-sm">
                              {partner.countryRepresented && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <MapPin className="h-4 w-4" />
                                  <span>{partner.countryRepresented}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-gray-600">
                                <Activity className="h-4 w-4" />
                                <span>{calculatePartnerActiveProjects(partner.id, partner.name)} Active Projects</span>
                              </div>
                              {partner.website && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Globe className="h-4 w-4" />
                                  <a 
                                    href={partner.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="hover:text-blue-600 truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {partner.website.replace(/^https?:\/\//, '')}
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Footer */}
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                              <span>Updated {format(new Date(partner.updatedAt), "dd MMM yyyy")}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/partners/${partner.id}`);
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Partner Governments Tab - Table View */}
                <TabsContent value="government">
                  {loading ? (
                    <div className="text-center text-gray-500 py-8">Loading partner governments...</div>
                  ) : filteredGovernmentPartners.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      {searchTerm ? 'No partner governments found matching your search' : 'No partner governments yet'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredGovernmentPartners.map((partner) => (
                        <Card 
                          key={partner.id} 
                          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => router.push(`/partners/${partner.id}`)}
                        >
                          {/* Banner Image */}
                          {partner.banner && (
                            <div className="h-32 overflow-hidden">
                              <img 
                                src={partner.banner} 
                                alt={`${partner.name} banner`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          <CardContent className="p-6">
                            {/* Logo and Name */}
                            <div className="flex items-start gap-4 mb-4">
                              {partner.logo ? (
                                <img 
                                  src={partner.logo} 
                                  alt={partner.name} 
                                  className="h-12 w-12 object-contain rounded"
                                />
                              ) : (
                                <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                                  <Building2 className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                                  {partner.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    Partner Government
                                  </Badge>
                                  {partner.code && (
                                    <Badge variant="outline" className="text-xs">
                                      {partner.code}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Description */}
                            {partner.description && (
                              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                {partner.description}
                              </p>
                            )}

                            {/* Stats and Info */}
                            <div className="space-y-2 text-sm">
                              {partner.email && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Mail className="h-4 w-4" />
                                  <a 
                                    href={`mailto:${partner.email}`}
                                    className="hover:text-blue-600 truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {partner.email}
                                  </a>
                                </div>
                              )}
                              {partner.phone && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Phone className="h-4 w-4" />
                                  <span>{partner.phone}</span>
                                </div>
                              )}
                              {partner.website && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Globe className="h-4 w-4" />
                                  <a 
                                    href={partner.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="hover:text-blue-600 truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {partner.website.replace(/^https?:\/\//, '')}
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Footer */}
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                              <span>Updated {format(new Date(partner.updatedAt), "dd MMM yyyy")}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/partners/${partner.id}`);
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Organization Groups Tab */}
                <TabsContent value="groups">
                  {organizationGroups.length === 0 ? (
                    <div className="text-center py-12">
                      <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No organization groups yet
                      </h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Create custom groups of organizations for easier filtering and reporting across the application
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button 
                          onClick={() => router.push('/partners/groups?create=true')}
                          className="bg-slate-900 hover:bg-slate-800"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Group
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => router.push('/partners/groups')}
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Manage All Groups
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <p className="text-sm text-gray-600">
                          Showing {organizationGroups.length} organization group{organizationGroups.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/partners/groups')}
                          >
                            Manage All Groups
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => router.push('/partners/groups?create=true')}
                            className="bg-slate-900 hover:bg-slate-800"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Group
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <TooltipProvider>
                          {organizationGroups.map((group) => {
                            const groupPartners = partners.filter(p => 
                              group.organizationIds.includes(p.id)
                            );
                            
                            return (
                              <Card key={group.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <CardTitle className="text-lg">{group.name}</CardTitle>
                                      {group.description && (
                                        <CardDescription className="mt-1">
                                          {group.description}
                                        </CardDescription>
                                      )}
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <Users className="h-4 w-4" />
                                      <span>{groupPartners.length} organization{groupPartners.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    
                                    {/* Organization Preview */}
                                    <div className="space-y-2">
                                      {groupPartners.slice(0, 3).map((org: any) => (
                                        <div key={org.id} className="flex items-center gap-2">
                                          {org.logo ? (
                                            <img 
                                              src={org.logo} 
                                              alt={org.name}
                                              className="h-6 w-6 object-contain"
                                            />
                                          ) : (
                                            <Building2 className="h-6 w-6 text-gray-400" />
                                          )}
                                          <span className="text-sm text-gray-700 truncate">
                                            {org.name}
                                          </span>
                                        </div>
                                      ))}
                                      {groupPartners.length > 3 && (
                                        <p className="text-sm text-gray-500 ml-8">
                                          +{groupPartners.length - 3} more
                                        </p>
                                      )}
                                    </div>
                                    
                                    {/* Timestamps */}
                                    <div className="pt-2 space-y-1">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Calendar className="h-3 w-3" />
                                            <span>Created {format(new Date(group.createdAt), "dd MMM yyyy")}</span>
                                            {group.createdByName && (
                                              <span>by {group.createdByName}</span>
                                            )}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Created by {group.createdByName || 'Unknown'} on {format(new Date(group.createdAt), "dd MMM yyyy 'at' HH:mm")}
                                        </TooltipContent>
                                      </Tooltip>
                                      
                                      {group.updatedAt !== group.createdAt && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                          <Clock className="h-3 w-3" />
                                          <span>Last Updated: {format(new Date(group.updatedAt), "dd MMM yyyy")}</span>
                                          {group.updatedByName && (
                                            <span>by {group.updatedByName}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Action Button */}
                                    <div className="pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => router.push('/partners/groups')}
                                      >
                                        View in Groups Manager
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
      </div>

        {/* Add Organization Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Organization</DialogTitle>
            <DialogDesc>
              Create a new development partner or government entity
            </DialogDesc>
          </DialogHeader>
          <form onSubmit={handleCreatePartner} className="space-y-4">
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

            {/* Cooperation Modality (Read-only) */}
            <div>
              <label htmlFor="cooperationModality" className="text-sm font-medium flex items-center">
                Cooperation Modality
                <OrganizationFieldHelp field="cooperationModality" />
              </label>
              <Input
                id="cooperationModality"
                value={calculateCooperationModality(
                  formData.countryRepresented, 
                  formData.organisationType
                )}
                disabled
                className="bg-gray-100"
                placeholder="Auto-calculated based on country and type"
              />
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setFormData({
                    name: "",
                    iatiOrgId: "",
                    fullName: "",
                    acronym: "",
                    countryRepresented: "",
                    organisationType: "",
                    description: "",
                    website: "",
                    email: "",
                    phone: "",
                    address: "",
                    logo: "",
                    banner: ""
                  });
                  setValidationErrors({});
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formData.fullName.trim() || !formData.acronym.trim()}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </MainLayout>
  );
} 