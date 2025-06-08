"use client"

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Users, 
  Plus, 
  Building2, 
  Loader2,
  AlertCircle,
  Search,
  X,
  Edit,
  Trash2,
  FolderOpen,
  Clock,
  User as UserIcon,
  Calendar,
  Bug,
  ChevronDown,
  ChevronRight,
  Copy,
  RefreshCw
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { usePartners } from "@/hooks/usePartners";

interface OrganizationGroup {
  id: string;
  name: string;
  description: string;
  organizationIds: string[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  updatedByName?: string;
}

function OrganizationGroupsPageContent() {
  const { user } = useUser();
  const { partners } = usePartners();
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<OrganizationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<OrganizationGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    selectedOrgs: [] as string[]
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Debug state (only visible to admins)
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [debugLogs, setDebugLogs] = useState<Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    details?: any;
  }>>([]);

  // Debug logging function
  const addDebugLog = (level: 'info' | 'warn' | 'error', message: string, details?: any) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    setDebugLogs(prev => [logEntry, ...prev.slice(0, 99)]); // Keep last 100 logs
    console.log(`[DEBUG-${level.toUpperCase()}]`, message, details);
  };

  // Function to test organization IDs
  const testOrganizationIds = async () => {
    if (!partners || partners.length === 0) {
      addDebugLog('warn', 'No partners data available for testing');
      return;
    }

    addDebugLog('info', 'Testing organization IDs and users', {
      totalPartners: partners.length,
      currentUser: { id: user?.id, name: user?.name },
      sampleIds: partners.slice(0, 5).map(p => ({ id: p.id, name: p.name }))
    });

    try {
      // Test with debug endpoint
      const debugRes = await fetch("/api/organization-groups?debug=true");
      if (debugRes.ok) {
        const debugData = await debugRes.json();
        addDebugLog('info', 'Database organizations check', {
          organizationsInDb: debugData.rawOrganizations.count,
          sampleDbIds: debugData.rawOrganizations.sampleIds,
          error: debugData.rawOrganizations.error
        });
      }

      // Test validation of current partner IDs
      const partnerIds = partners.slice(0, 10).map(p => p.id); // Test first 10
      const validateRes = await fetch(`/api/organization-groups?validateIds=${partnerIds.join(',')}`);
      if (validateRes.ok) {
        const validateData = await validateRes.json();
        addDebugLog('info', 'Partner IDs validation', {
          requestedCount: validateData.requestedIds.length,
          foundCount: validateData.foundOrganizations.length,
          missingIds: validateData.missingIds,
          allValid: validateData.allValid,
          validationError: validateData.validationError
        });

        if (!validateData.allValid) {
          addDebugLog('error', 'Invalid partner IDs found!', {
            missingIds: validateData.missingIds,
            foundOrgs: validateData.foundOrganizations
          });
        }
      }
      
      // Test user validation - THIS IS THE KEY TEST
      if (user?.id) {
        const userValidateRes = await fetch(`/api/organization-groups?validateUsers=${user.id}`);
        if (userValidateRes.ok) {
          const userValidateData = await userValidateRes.json();
          addDebugLog('info', 'User validation check', {
            requestedUserId: user.id,
            userName: user.name,
            foundUsers: userValidateData.foundUsers,
            missingUserIds: userValidateData.missingUserIds,
            allUsersValid: userValidateData.allUsersValid,
            userValidationError: userValidateData.userValidationError
          });

          if (!userValidateData.allUsersValid) {
            addDebugLog('error', 'USER NOT FOUND IN DATABASE! This is the root cause.', {
              missingUserId: user.id,
              userName: user.name,
              explanation: 'The user exists in the frontend auth system but not in the Supabase users table'
            });
          } else {
            addDebugLog('info', 'User validation passed', {
              foundUser: userValidateData.foundUsers[0]
            });
          }
        }
      } else {
        addDebugLog('warn', 'No current user ID available for testing');
      }
    } catch (error) {
      addDebugLog('error', 'Error testing organization IDs', {
        message: (error as Error).message
      });
    }
  };

  useEffect(() => {
    fetchGroups();
    // Check if we should open the create dialog
    if (searchParams.get('create') === 'true') {
      setShowCreateDialog(true);
    }
  }, [searchParams]);

  // Debug partners data
  useEffect(() => {
    if (partners && partners.length > 0) {
      console.log('[DEBUG] Partners data loaded:', {
        count: partners.length,
        sample: partners.slice(0, 3).map(p => ({
          id: p.id,
          name: p.name,
          acronym: p.acronym,
          type: p.type,
          isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)
        })),
        allPartners: partners.map(p => ({ id: p.id, name: p.name, isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id) }))
      });
      
      addDebugLog('info', 'Partners data loaded', {
        count: partners.length,
        hasInvalidUUIDs: partners.some(p => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)),
        invalidIds: partners.filter(p => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)).map(p => ({ id: p.id, name: p.name }))
      });
    }
  }, [partners]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      addDebugLog('info', 'Fetching organization groups');
      
      const res = await fetch("/api/organization-groups");
      const data = await res.json();
      
      addDebugLog('info', 'Fetch groups response', {
        status: res.status,
        ok: res.ok,
        groupsCount: data?.length || 0,
        data
      });
      
      if (res.ok) {
        setGroups(data);
      } else {
        addDebugLog('error', 'Failed to fetch groups', {
          status: res.status,
          error: data.error || 'Unknown error'
        });
        toast.error("Failed to load organization groups");
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      addDebugLog('error', 'Exception fetching groups', {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      toast.error("Failed to load organization groups");
    } finally {
      setLoading(false);
    }
  };

  const canEditGroup = (group: OrganizationGroup) => {
    return user?.role === 'super_user' || group.createdBy === user?.id;
  };

  const canDeleteGroup = (group: OrganizationGroup) => {
    return user?.role === 'super_user' || group.createdBy === user?.id;
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    
    addDebugLog('info', 'Starting group creation', {
      name: formData.name,
      description: formData.description,
      selectedOrgsCount: formData.selectedOrgs.length,
      selectedOrgs: formData.selectedOrgs,
      userId: user?.id,
      userName: user?.name
    });
    
    // Validate
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = "Group name is required";
    }
    if (formData.selectedOrgs.length === 0) {
      errors.selectedOrgs = "Please select at least one organization";
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addDebugLog('warn', 'Validation failed', { errors });
      return;
    }
    
    setSubmitting(true);
    try {
      const requestData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        organizationIds: formData.selectedOrgs,
        createdBy: user?.id,
        createdByName: user?.name
      };

      addDebugLog('info', 'Sending request to API', requestData);
      
      const res = await fetch("/api/organization-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });
      
      const data = await res.json();
      
      addDebugLog('info', 'Received API response', {
        status: res.status,
        ok: res.ok,
        responseData: data
      });
      
      if (!res.ok) {
        if (res.status === 409) {
          addDebugLog('warn', 'Conflict error - duplicate name', data);
          toast.error(data.error);
        } else {
          addDebugLog('error', 'API error response', {
            status: res.status,
            error: data.error,
            details: data.details,
            code: data.code,
            hint: data.hint
          });
          throw new Error(data.error || "Failed to create group");
        }
        return;
      }
      
      addDebugLog('info', 'Group created successfully', data);
      toast.success("Organization group created successfully");
      setGroups([...groups, data]);
      setShowCreateDialog(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating group:", error);
      addDebugLog('error', 'Exception during group creation', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(error.message || "Failed to create organization group");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    
    setFormErrors({});
    
    addDebugLog('info', 'Starting group edit', {
      groupId: selectedGroup.id,
      name: formData.name,
      description: formData.description,
      selectedOrgsCount: formData.selectedOrgs.length,
      selectedOrgs: formData.selectedOrgs,
      selectedOrgsDetails: formData.selectedOrgs.map(id => {
        const partner = partners.find(p => p.id === id);
        return {
          id,
          isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
          partnerFound: !!partner,
          partnerName: partner?.name || 'NOT FOUND'
        };
      }),
      userId: user?.id,
      userName: user?.name
    });
    
    // Validate
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = "Group name is required";
    }
    if (formData.selectedOrgs.length === 0) {
      errors.selectedOrgs = "Please select at least one organization";
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addDebugLog('warn', 'Edit validation failed', { errors });
      return;
    }
    
    setSubmitting(true);
    try {
      const requestData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        organizationIds: formData.selectedOrgs,
        updatedBy: user?.id,
        updatedByName: user?.name
      };

      addDebugLog('info', 'Sending edit request to API', requestData);
      
      const res = await fetch(`/api/organization-groups?id=${selectedGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });
      
      const data = await res.json();
      
      addDebugLog('info', 'Received edit API response', {
        status: res.status,
        ok: res.ok,
        responseData: data
      });
      
      if (!res.ok) {
        if (res.status === 409) {
          addDebugLog('warn', 'Edit conflict error - duplicate name', data);
          toast.error(data.error);
        } else {
          addDebugLog('error', 'Edit API error response', {
            status: res.status,
            error: data.error,
            details: data.details,
            code: data.code,
            hint: data.hint
          });
          throw new Error(data.error || "Failed to update group");
        }
        return;
      }
      
      addDebugLog('info', 'Group updated successfully', data);
      toast.success("Organization group updated successfully");
      setGroups(groups.map(g => g.id === selectedGroup.id ? data : g));
      setShowEditDialog(false);
      resetForm();
    } catch (error: any) {
      console.error("Error updating group:", error);
      addDebugLog('error', 'Exception during group edit', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(error.message || "Failed to update organization group");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    
    try {
      const res = await fetch(`/api/organization-groups?id=${selectedGroup.id}`, {
        method: "DELETE"
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete group");
      }
      
      toast.success("Group deleted successfully");
      setGroups(groups.filter(g => g.id !== selectedGroup.id));
      setShowDeleteDialog(false);
      setSelectedGroup(null);
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    }
  };

  const openEditDialog = (group: OrganizationGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description,
      selectedOrgs: group.organizationIds
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (group: OrganizationGroup) => {
    setSelectedGroup(group);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      selectedOrgs: []
    });
    setFormErrors({});
    setSelectedGroup(null);
  };

  const toggleOrgSelection = (orgId: string) => {
    console.log('[DEBUG] toggleOrgSelection called with:', {
      orgId,
      isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orgId),
      currentSelected: formData.selectedOrgs,
      partnersData: partners.map(p => ({ id: p.id, name: p.name }))
    });
    
    setFormData(prev => ({
      ...prev,
      selectedOrgs: prev.selectedOrgs.includes(orgId)
        ? prev.selectedOrgs.filter(id => id !== orgId)
        : [...prev.selectedOrgs, orgId]
    }));
    // Clear error when user selects an org
    if (formErrors.selectedOrgs) {
      setFormErrors(prev => ({ ...prev, selectedOrgs: "" }));
    }
  };

  const getOrgDetails = (orgIds: string[]) => {
    return orgIds.map(id => partners.find(p => p.id === id)).filter(Boolean);
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Organization Groups</h1>
            <p className="text-gray-600">
              Create and manage groups of organizations for easier filtering and reporting
            </p>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {user?.role === 'super_user' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDebugConsole(!showDebugConsole)}
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Debug Console
                </Button>
              )}
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </div>
          </div>

          {/* Debug Console */}
          {user?.role === 'super_user' && showDebugConsole && (
            <Card className="mb-6 border-orange-200 bg-orange-50">
              <Collapsible open={showDebugConsole} onOpenChange={setShowDebugConsole}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-orange-100 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bug className="h-5 w-5 text-orange-600" />
                        <CardTitle className="text-orange-800">Debug Console</CardTitle>
                        <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                          Admin Only
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-orange-600">
                          {debugLogs.length} logs
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            testOrganizationIds();
                          }}
                          title="Test organization IDs validation"
                        >
                          <Bug className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDebugLogs([]);
                            addDebugLog('info', 'Debug console cleared');
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        {showDebugConsole ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <ScrollArea className="h-64 w-full border rounded p-2 bg-white">
                      {debugLogs.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No debug logs yet</p>
                      ) : (
                        <div className="space-y-2">
                          {debugLogs.map((log, index) => (
                            <div 
                              key={index} 
                              className={`p-2 rounded text-xs font-mono border-l-4 ${
                                log.level === 'error' ? 'border-red-500 bg-red-50' :
                                log.level === 'warn' ? 'border-yellow-500 bg-yellow-50' :
                                'border-blue-500 bg-blue-50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`font-bold ${
                                  log.level === 'error' ? 'text-red-700' :
                                  log.level === 'warn' ? 'text-yellow-700' :
                                  'text-blue-700'
                                }`}>
                                  [{log.level.toUpperCase()}]
                                </span>
                                <span className="text-gray-500">
                                  {format(new Date(log.timestamp), 'HH:mm:ss')}
                                </span>
                              </div>
                              <div className="text-gray-700 mb-1">
                                {log.message}
                              </div>
                              {log.details && (
                                <details className="mt-1">
                                  <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                    Details
                                  </summary>
                                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Groups Grid */}
          {filteredGroups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "No groups found" : "No organization groups yet"}
                </h3>
                <p className="text-gray-500 text-center mb-4 max-w-md">
                  {searchTerm 
                    ? "Try adjusting your search terms" 
                    : "Create your first organization group to start organizing partners for easier filtering and reporting"
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Group
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <TooltipProvider>
                {filteredGroups.map((group) => {
                  const orgs = getOrgDetails(group.organizationIds);
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
                          <div className="flex gap-1">
                            {canEditGroup(group) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(group)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDeleteGroup(group) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(group)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            <span>{orgs.length} organization{orgs.length !== 1 ? 's' : ''}</span>
                          </div>
                          
                          {/* Organization Preview */}
                          <div className="space-y-2">
                            {orgs.slice(0, 3).map((org: any) => (
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
                            {orgs.length > 3 && (
                              <p className="text-sm text-gray-500 ml-8">
                                +{orgs.length - 3} more
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
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Organization Group</DialogTitle>
            <DialogDescription>
              Group related organizations together for easier filtering and reporting
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium">
                Group Name *
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) {
                    setFormErrors({ ...formErrors, name: "" });
                  }
                }}
                placeholder="e.g., Nordic Donors, Multilaterals"
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && (
                <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this group..."
                rows={3}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">
                Select Organizations *
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Choose the organizations to include in this group
              </p>
              
              {formErrors.selectedOrgs && (
                <Alert variant="destructive" className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formErrors.selectedOrgs}</AlertDescription>
                </Alert>
              )}
              
              <ScrollArea className="h-64 border rounded-md p-3">
                <div className="space-y-2">
                  {partners.map((partner) => (
                    <label
                      key={partner.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.selectedOrgs.includes(partner.id)}
                        onCheckedChange={() => toggleOrgSelection(partner.id)}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        {partner.logo ? (
                          <img 
                            src={partner.logo} 
                            alt={partner.name}
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-gray-400" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{partner.name}</div>
                          <div className="text-xs text-gray-500">ID: {partner.id.substring(0, 8)}...</div>
                          {partner.acronym && (
                            <div className="text-xs text-gray-400">({partner.acronym})</div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {partner.type === 'bilateral' ? 'Bilateral' : 
                           partner.type === 'partner_government' ? 'Government' :
                           partner.type === 'development_partner' ? 'Development' : 'Other'}
                        </Badge>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
              
              {formData.selectedOrgs.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {formData.selectedOrgs.length} organization{formData.selectedOrgs.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Organization Group</DialogTitle>
            <DialogDescription>
              Update the group details and member organizations
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditGroup} className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="text-sm font-medium">
                Group Name *
              </label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) {
                    setFormErrors({ ...formErrors, name: "" });
                  }
                }}
                placeholder="e.g., Nordic Donors, Multilaterals"
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && (
                <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="edit-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this group..."
                rows={3}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">
                Select Organizations *
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Choose the organizations to include in this group
              </p>
              
              {formErrors.selectedOrgs && (
                <Alert variant="destructive" className="mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formErrors.selectedOrgs}</AlertDescription>
                </Alert>
              )}
              
              <ScrollArea className="h-64 border rounded-md p-3">
                <div className="space-y-2">
                  {partners.map((partner) => (
                    <label
                      key={partner.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.selectedOrgs.includes(partner.id)}
                        onCheckedChange={() => toggleOrgSelection(partner.id)}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        {partner.logo ? (
                          <img 
                            src={partner.logo} 
                            alt={partner.name}
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-gray-400" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{partner.name}</div>
                          <div className="text-xs text-gray-500">ID: {partner.id.substring(0, 8)}...</div>
                          {partner.acronym && (
                            <div className="text-xs text-gray-400">({partner.acronym})</div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {partner.type === 'bilateral' ? 'Bilateral' : 
                           partner.type === 'partner_government' ? 'Government' :
                           partner.type === 'development_partner' ? 'Development' : 'Other'}
                        </Badge>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
              
              {formData.selectedOrgs.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {formData.selectedOrgs.length} organization{formData.selectedOrgs.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Group'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedGroup?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteGroup}
            >
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

export default function OrganizationGroupsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <OrganizationGroupsPageContent />
    </Suspense>
  );
} 