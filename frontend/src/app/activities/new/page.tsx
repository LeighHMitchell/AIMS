"use client"
import React, { useState, useCallback, useEffect, Suspense } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import FinancesSection from "@/components/FinancesSection";
import SectorsSection from "@/components/SectorsSection";
import OrganisationsSection from "@/components/OrganisationsSection";
import ContactsSection from "@/components/ContactsSection";
import GovernmentInputsSection from "@/components/GovernmentInputsSection";
import ContributorsSection from "@/components/ContributorsSection";
import { BannerUpload } from "@/components/BannerUpload";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { Transaction } from "@/types/transaction";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, AlertCircle, CheckCircle, XCircle, Send, Users, X, Loader2, UserPlus, Copy } from "lucide-react";
import { FieldHelp, RequiredFieldIndicator, ActivityCompletionRating } from "@/components/ActivityFieldHelpers";
import { ActivityComments } from "@/components/ActivityComments";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { findSimilarActivities, ActivityMatch } from "@/lib/activity-matching";
import { getActivityPermissions, ActivityContributor } from "@/lib/activity-permissions";
import { Partner } from "@/hooks/usePartners";
import TagsSection from "@/components/TagsSection";

function SectionContent({ section, general, setGeneral, sectors, setSectors, transactions, setTransactions, extendingPartners, setExtendingPartners, implementingPartners, setImplementingPartners, governmentPartners, setGovernmentPartners, contacts, setContacts, updateContacts, governmentInputs, setGovernmentInputs, contributors, setContributors, updateContributors, permissions, user, tags, setTags }: any) {
  const copyToClipboard = async (value: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${fieldName} copied to clipboard`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  switch (section) {
    case "general":
      return (
        <div className="bg-white rounded-lg shadow-sm border p-8 max-w-4xl space-y-6">
          {/* Banner Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Activity Banner</label>
            <BannerUpload
              currentBanner={general.banner}
              onBannerChange={(banner) => setGeneral((g: any) => ({ ...g, banner }))}
              activityId={general.id || "new"}
            />
          </div>

          {/* Project Icon Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Icon</label>
            <ImageUpload
              currentImage={general.projectIcon}
              onImageChange={(icon) => setGeneral((g: any) => ({ ...g, projectIcon: icon }))}
              label="Project Icon"
              aspectRatio="square"
              previewHeight="h-20"
              previewWidth="w-20"
              showHints={true}
              id="project-icon-upload"
            />
          </div>

          {/* Row 1: Partner ID, IATI Identifier & Local ID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="partnerId" className="text-sm font-medium flex items-center">
                Activity Partner ID
                <FieldHelp field="partnerId" />
                <RequiredFieldIndicator field="participatingOrg" value={general.partnerId} />
              </label>
              <div className="relative">
                <Input
                  id="partnerId"
                  value={general.partnerId}
                  onChange={(e) => setGeneral((g: any) => ({ ...g, partnerId: e.target.value }))}
                  placeholder="Partner ID"
                  className="pr-10"
                  disabled={!user}
                />
                {general.partnerId && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(general.partnerId, 'Activity Partner ID')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="iatiId" className="text-sm font-medium flex items-center">
                IATI Identifier
                <FieldHelp field="iatiId" />
              </label>
              <div className="relative">
                <Input
                  id="iatiId"
                  value={general.iatiId}
                  onChange={(e) => setGeneral((g: any) => ({ ...g, iatiId: e.target.value }))}
                  placeholder="IATI Identifier"
                  className="pr-10"
                  disabled={!user}
                />
                {general.iatiId && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(general.iatiId, 'IATI Identifier')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="localId" className="text-sm font-medium flex items-center">
                Local ID
                <FieldHelp field="localId" />
              </label>
              <div className="relative">
                <Input
                  id="localId"
                  value={general.id || "Will be generated"}
                  disabled
                  className="bg-gray-100 pr-10"
                  placeholder="System Generated"
                />
                {general.id && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(general.id, 'Local ID')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium flex items-center">
              Activity Title *
              <FieldHelp field="title" />
              <RequiredFieldIndicator field="title" value={general.title} />
            </label>
            <Input
              id="title"
              value={general.title}
              onChange={(e) => setGeneral((g: any) => ({ ...g, title: e.target.value }))}
              placeholder="Activity Title"
              required
              disabled={!user}
            />
          </div>

          {/* Row 3: Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium flex items-center">
              Activity Description
              <FieldHelp field="description" />
              <RequiredFieldIndicator field="description" value={general.description} />
            </label>
            <Textarea
              id="description"
              value={general.description}
              onChange={(e) => setGeneral((g: any) => ({ ...g, description: e.target.value }))}
              placeholder="Activity Description"
              rows={3}
              disabled={!user}
            />
          </div>

          {/* Row 4: Objectives */}
          <div className="space-y-2">
            <label htmlFor="objectives" className="text-sm font-medium flex items-center">
              Activity Objectives
              <FieldHelp field="objectives" />
            </label>
            <Input
              id="objectives"
              value={general.objectives}
              onChange={(e) => setGeneral((g: any) => ({ ...g, objectives: e.target.value }))}
              placeholder="Activity Objectives"
            />
          </div>

          {/* Row 5: Target Groups */}
          <div className="space-y-2">
            <label htmlFor="targetGroups" className="text-sm font-medium flex items-center">
              Activity Target Groups
              <FieldHelp field="targetGroups" />
            </label>
            <Input
              id="targetGroups"
              value={general.targetGroups}
              onChange={(e) => setGeneral((g: any) => ({ ...g, targetGroups: e.target.value }))}
              placeholder="Target Groups"
            />
          </div>

          {/* Row 6: Collaboration Type & Activity Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="collaborationType" className="text-sm font-medium flex items-center">
                Collaboration Type
                <FieldHelp field="collaborationType" />
              </label>
              <Select
                value={general.collaborationType}
                onValueChange={(value) => setGeneral((g: any) => ({ ...g, collaborationType: value }))}
              >
                <SelectTrigger id="collaborationType">
                  <SelectValue placeholder="Select Collaboration Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bilateral">Bilateral</SelectItem>
                  <SelectItem value="multilateral">Multilateral</SelectItem>
                  <SelectItem value="public-private">Public-Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="activityStatus" className="text-sm font-medium flex items-center">
                Activity Status (IATI)
                <FieldHelp field="activityStatus" />
                <RequiredFieldIndicator field="activityStatus" value={general.activityStatus} />
              </label>
              <Select
                value={general.activityStatus}
                onValueChange={(value) => setGeneral((g: any) => ({ ...g, activityStatus: value }))}
              >
                <SelectTrigger id="activityStatus">
                  <SelectValue placeholder="Select Activity Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="implementation">Implementation</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 7: Date Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Activity Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="plannedStartDate" className="text-sm font-medium flex items-center">
                  Planned Start Date
                  <FieldHelp field="plannedStartDate" />
                  <RequiredFieldIndicator field="plannedStartDate" value={general.plannedStartDate} />
                </label>
                <Input
                  id="plannedStartDate"
                  type="date"
                  value={general.plannedStartDate}
                  onChange={(e) => setGeneral((g: any) => ({ ...g, plannedStartDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="plannedEndDate" className="text-sm font-medium flex items-center">
                  Planned End Date
                  <FieldHelp field="plannedEndDate" />
                </label>
                <Input
                  id="plannedEndDate"
                  type="date"
                  value={general.plannedEndDate}
                  onChange={(e) => setGeneral((g: any) => ({ ...g, plannedEndDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="actualStartDate" className="text-sm font-medium flex items-center">
                  Actual Start Date
                  <FieldHelp field="actualStartDate" />
                </label>
                <Input
                  id="actualStartDate"
                  type="date"
                  value={general.actualStartDate}
                  onChange={(e) => setGeneral((g: any) => ({ ...g, actualStartDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="actualEndDate" className="text-sm font-medium flex items-center">
                  Actual End Date
                  <FieldHelp field="actualEndDate" />
                </label>
                <Input
                  id="actualEndDate"
                  type="date"
                  value={general.actualEndDate}
                  onChange={(e) => setGeneral((g: any) => ({ ...g, actualEndDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Publication Status (Read-only info) */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Publication Status:</span>
              <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                {general.publicationStatus === "published" ? "Published" : "Draft"}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                (This will be set to "Published" when you click the Publish button)
              </span>
            </div>
          </div>
        </div>
      );
    case "sectors":
      return <SectorsSection sectors={sectors} onChange={setSectors} />;
    case "contributors":
      return <ContributorsSection 
        contributors={contributors} 
        onChange={updateContributors} 
        permissions={permissions}
        activityId={general.id}
      />;
    case "tags":
      return <TagsSection
        activityId={general.id}
        tags={tags}
        onChange={setTags}
        sectors={sectors}
      />;
    case "msdp":
      return <div className="bg-white rounded shadow p-8 max-w-3xl">[MSDP Alignment fields go here]</div>;
    case "organisations":
      return <OrganisationsSection
        extendingPartners={extendingPartners}
        implementingPartners={implementingPartners}
        governmentPartners={governmentPartners}
        onChange={(field, value) => {
          switch(field) {
            case 'extendingPartners':
              setExtendingPartners(value);
              break;
            case 'implementingPartners':
              setImplementingPartners(value);
              break;
            case 'governmentPartners':
              setGovernmentPartners(value);
              break;
          }
        }}
      />;
    case "locations":
      return <div className="bg-white rounded shadow p-8 max-w-3xl">[Locations fields go here]</div>;
    case "finances":
      return <FinancesSection 
        activityId={general.id || "new"}
        transactions={transactions}
        onTransactionsChange={setTransactions}
      />;
    case "results":
      return <div className="bg-white rounded shadow p-8 max-w-3xl">[Results fields go here]</div>;
    case "contacts":
      console.log('[AIMS DEBUG] Rendering ContactsSection with contacts:', contacts);
      return <ContactsSection contacts={contacts} onChange={updateContacts} />;
    case "government":
      return <GovernmentInputsSection governmentInputs={governmentInputs} onChange={setGovernmentInputs} />;
    case "documents":
      return <div className="bg-white rounded shadow p-8 max-w-3xl">[Documents & Images fields go here]</div>;
    case "aid_effectiveness":
      return <div className="bg-white rounded shadow p-8 max-w-3xl">[Aid Effectiveness fields go here]</div>;
    default:
      return null;
  }
}

function NewActivityPageContent() {
  const { user, isLoading: userLoading } = useUser();
  
  // Debug logging for user role
  console.log('[AIMS DEBUG] Current user:', user);
  console.log('[AIMS DEBUG] User role:', user?.role);
  console.log('[AIMS DEBUG] Role includes gov_partner:', user?.role?.includes('gov_partner'));
  
  // Build sections array based on user role
  // Also allow super_user to see government inputs
  const showGovernmentInputs = user?.role?.includes('gov_partner') || user?.role === 'super_user';
  
  const SECTIONS = [
    { id: "general", label: "General" },
    { id: "sectors", label: "Sectors" },
    { id: "contributors", label: "Contributors" },
    { id: "tags", label: "Tags" },
    { id: "msdp", label: "MSDP Alignment" },
    { id: "organisations", label: "Organisations" },
    { id: "locations", label: "Locations" },
    { id: "finances", label: "Finances" },
    { id: "results", label: "Results" },
    { id: "contacts", label: "Contacts" },
    ...(showGovernmentInputs ? [{ id: "government", label: "Government Inputs" }] : []),
    { id: "documents", label: "Documents & Images" },
    { id: "divider", label: "divider" },
    { id: "aid_effectiveness", label: "Aid Effectiveness", optional: true },
  ];
  
  const [activeSection, setActiveSection] = useState("general");
  const [general, setGeneral] = useState({
    id: "",
    partnerId: "",
    iatiId: "",
    title: "",
    description: "",
    objectives: "",
    targetGroups: "",
    collaborationType: "",
    activityStatus: "planning",
    publicationStatus: "draft",
    submissionStatus: "draft" as 'draft' | 'submitted' | 'validated' | 'rejected' | 'published',
    submittedBy: "",
    submittedByName: "",
    submittedAt: "",
    validatedBy: "",
    validatedByName: "",
    validatedAt: "",
    rejectedBy: "",
    rejectedByName: "",
    rejectedAt: "",
    rejectionReason: "",
    plannedStartDate: "",
    plannedEndDate: "",
    actualStartDate: "",
    actualEndDate: "",
    banner: "",
    projectIcon: "",
    createdBy: user ? { id: user.id, name: user.name, role: user.role } : undefined,
    createdByOrg: user?.organizationId || "",
    createdAt: "",
    updatedAt: "",
  });
  const [sectors, setSectors] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Debug transactions state changes
  useEffect(() => {
    console.log('[AIMS DEBUG] Transactions state changed:', transactions);
    console.log('[AIMS DEBUG] Transactions count:', transactions.length);
    if (transactions.length > 0) {
      console.log('[AIMS DEBUG] Transaction details:', JSON.stringify(transactions, null, 2));
    }
  }, [transactions]);
  
  const [extendingPartners, setExtendingPartners] = useState<any[]>([]);
  const [implementingPartners, setImplementingPartners] = useState<any[]>([]);
  const [governmentPartners, setGovernmentPartners] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [governmentInputs, setGovernmentInputs] = useState<any>({});
  const [comments, setComments] = useState<any[]>([]);
  const [contributors, setContributors] = useState<ActivityContributor[]>([]);
  
  // Wrapper function to debug contributor updates
  const updateContributors = useCallback((newContributors: ActivityContributor[]) => {
    console.log('[AIMS DEBUG] updateContributors called');
    console.log('[AIMS DEBUG] Current contributors:', contributors);
    console.log('[AIMS DEBUG] New contributors:', newContributors);
    console.log('[AIMS DEBUG] New contributors count:', newContributors.length);
    setContributors(newContributors);
  }, [contributors]);
  
  // Debug contributors state changes
  useEffect(() => {
    console.log('[AIMS DEBUG] Contributors state changed:', contributors);
    console.log('[AIMS DEBUG] Contributors count:', contributors.length);
    if (contributors.length > 0) {
      console.log('[AIMS DEBUG] Contributor details:', JSON.stringify(contributors, null, 2));
    }
  }, [contributors]);
  
  const [tags, setTags] = useState<string[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [similarActivities, setSimilarActivities] = useState<ActivityMatch[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const isEditing = !!searchParams.get("id");

  // Get permissions for current activity
  const permissions = getActivityPermissions(user, general.id ? { 
    ...general, 
    contributors,
    createdBy: general.createdBy 
  } as any : null);

  // Check permissions - use correct property names
  const canEdit = permissions.canEditActivity && !!user;
  const canPublish = permissions.canEditActivity && !!user; // Publishing requires edit permission
  const canSubmit = permissions.canEditActivity && !!user; // Submitting requires edit permission
  const canValidate = permissions.canValidateActivity && !!user;

  // Update general state when user loads
  useEffect(() => {
    if (!userLoading && user && !general.createdBy) {
      setGeneral(prev => ({
        ...prev,
        createdBy: { id: user.id, name: user.name, role: user.role },
        createdByOrg: user?.organizationId || "",
      }));
    }
  }, [user, userLoading]);

  // Check for similar activities when title or description changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isEditing && (general.title.length > 5 || general.description.length > 10)) {
        checkForSimilarActivities();
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timer);
  }, [general.title, general.description, general.plannedStartDate, general.plannedEndDate, isEditing]);

  const checkForSimilarActivities = async () => {
    try {
      setSearchingDuplicates(true);
      const res = await fetch("/api/activities");
      if (res.ok) {
        const activities = await res.json();
        const matches = findSimilarActivities(
          {
            title: general.title,
            description: general.description,
            plannedStartDate: general.plannedStartDate,
            plannedEndDate: general.plannedEndDate,
          },
          activities
        );
        setSimilarActivities(matches);
      }
    } catch (error) {
      console.error("Error checking for similar activities:", error);
    } finally {
      setSearchingDuplicates(false);
    }
  };

  const joinExistingActivity = (activityId: string) => {
    router.push(`/activities/${activityId}?action=join`);
  };

  // Update contacts with proper debugging
  const updateContacts = useCallback((newContacts: any[]) => {
    console.log('[AIMS DEBUG] updateContacts called with:', newContacts);
    console.log('[AIMS DEBUG] newContacts length:', newContacts?.length || 0);
    console.log('[AIMS DEBUG] newContacts details:', JSON.stringify(newContacts, null, 2));
    setContacts(newContacts);
    console.log('[AIMS DEBUG] Contacts state updated');
  }, []);

  // Debug contacts state changes
  useEffect(() => {
    console.log('[AIMS DEBUG] Contacts state changed:', contacts);
    console.log('[AIMS DEBUG] Contacts count:', contacts.length);
  }, [contacts]);

  // Handle initial loading
  useEffect(() => {
    const loadData = async () => {
      console.log('[AIMS DEBUG] loadData called, userLoading:', userLoading);
      // Wait for user to load
      if (userLoading) return;
      
      // Clear any previous errors
      console.log('[AIMS DEBUG] Clearing errors before loading');
      setError("");
      
      // If editing, fetch the activity
      const activityId = searchParams.get("id");
      console.log('[AIMS DEBUG] Activity ID from search params:', activityId);
      if (activityId) {
        await fetchActivity(activityId);
      } else {
        console.log('[AIMS DEBUG] No activity ID, not editing');
        setLoading(false);
      }
    };
    
    loadData();
  }, [searchParams, userLoading]);

  const fetchActivity = async (id: string) => {
    try {
      console.log('[AIMS DEBUG] fetchActivity called for ID:', id);
      const res = await fetch("/api/activities");
      console.log('[AIMS DEBUG] API response status:', res.status);
      if (res.ok) {
        const activities = await res.json();
        console.log('[AIMS DEBUG] Total activities loaded:', activities.length);
        const activity = activities.find((a: any) => a.id === id);
        if (activity) {
          console.log('[AIMS DEBUG] Activity found successfully:', activity.id, activity.title);
          
          // Clear any previous errors when activity loads successfully
          setError("");
          
          setGeneral({
            id: activity.id,
            partnerId: activity.partnerId || "",
            iatiId: activity.iatiId || "",
            title: activity.title || "",
            description: activity.description || "",
            objectives: activity.objectives || "",
            targetGroups: activity.targetGroups || "",
            collaborationType: activity.collaborationType || "",
            activityStatus: activity.activityStatus || activity.status || "planning",
            publicationStatus: activity.publicationStatus || (activity.status === "published" ? "published" : "draft"),
            submissionStatus: activity.submissionStatus || "draft",
            submittedBy: activity.submittedBy || "",
            submittedByName: activity.submittedByName || "",
            submittedAt: activity.submittedAt || "",
            validatedBy: activity.validatedBy || "",
            validatedByName: activity.validatedByName || "",
            validatedAt: activity.validatedAt || "",
            rejectedBy: activity.rejectedBy || "",
            rejectedByName: activity.rejectedByName || "",
            rejectedAt: activity.rejectedAt || "",
            rejectionReason: activity.rejectionReason || "",
            plannedStartDate: activity.plannedStartDate || "",
            plannedEndDate: activity.plannedEndDate || "",
            actualStartDate: activity.actualStartDate || "",
            actualEndDate: activity.actualEndDate || "",
            banner: activity.banner || "",
            projectIcon: activity.projectIcon || "",
            createdBy: activity.createdBy || undefined,
            createdByOrg: activity.createdByOrg || "",
            createdAt: activity.createdAt || "",
            updatedAt: activity.updatedAt || "",
          });
          setSectors(activity.sectors || []);
          setTransactions(activity.transactions || []);
          setExtendingPartners(activity.extendingPartners || []);
          setImplementingPartners(activity.implementingPartners || []);
          setGovernmentPartners(activity.governmentPartners || []);
          setContacts(activity.contacts || []);
          setGovernmentInputs(activity.governmentInputs || {});
          setComments(activity.comments || []);
          setContributors(activity.contributors || []);
          setTags(activity.tags || []);
          
          // Log what was loaded
          console.log('[AIMS DEBUG] Activity loaded with:');
          console.log('- Transactions:', activity.transactions?.length || 0);
          console.log('- Contributors:', activity.contributors?.length || 0);
          console.log('- Contacts:', activity.contacts?.length || 0);
          console.log('- Sectors:', activity.sectors?.length || 0);
        } else {
          toast.error("Activity not found");
          router.push("/activities/new");
        }
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
      toast.error("Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  // Submit activity for validation
  const submitForValidation = async () => {
    if (!general.id) {
      toast.error("Please save the activity first");
      return;
    }

    try {
      const res = await fetch(`/api/activities/${general.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      const data = await res.json();
      setGeneral(prev => ({ ...prev, submissionStatus: data.submissionStatus }));
      toast.success("Activity submitted for validation");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit activity");
    }
  };

  // Validate activity (for Tier 1 users)
  const validateActivity = async (action: 'approve' | 'reject', reason?: string) => {
    if (!general.id) return;

    try {
      const res = await fetch(`/api/activities/${general.id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, action, reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to validate");
      }

      const data = await res.json();
      setGeneral(prev => ({ ...prev, submissionStatus: data.submissionStatus }));
      toast.success(action === 'approve' ? "Activity approved" : "Activity rejected");
    } catch (error: any) {
      toast.error(error.message || "Failed to validate activity");
    }
  };

  // Helper to get next section id
  function getNextSection(currentId: string) {
    const idx = SECTIONS.findIndex(s => s.id === currentId);
    for (let i = idx + 1; i < SECTIONS.length; i++) {
      if (SECTIONS[i].id !== "divider") return SECTIONS[i].id;
    }
    return null;
  }

  // Save activity to API
  const saveActivity = useCallback(async ({ publish = false, goToList = false, goToNext = false }) => {
    console.log('[AIMS DEBUG] saveActivity called', { publish, goToList, goToNext });
    console.log('[AIMS DEBUG] Current activity ID:', general.id);
    console.log('[AIMS DEBUG] User:', user?.id, user?.name);
    
    setError("");
    setSuccess("");
    
    // Check if user is logged in
    if (!user || !user.id) {
      console.log('[AIMS DEBUG] No user logged in');
      setError("You must be logged in to create or edit activities. Please log in and try again.");
      toast.error("Please log in to continue");
      return;
    }
    
    if (!general.title.trim()) {
      setError("Activity Title is required");
      return;
    }
    setSubmitting(true);
    try {
      // Debug log current state before creating payload
      console.log('[AIMS DEBUG] Pre-save state check:');
      console.log('[AIMS DEBUG] - transactions state:', transactions);
      console.log('[AIMS DEBUG] - transactions count:', transactions.length);
      console.log('[AIMS DEBUG] - contributors state:', contributors);
      console.log('[AIMS DEBUG] - contributors count:', contributors.length);
      console.log('[AIMS DEBUG] - contacts state:', contacts);
      console.log('[AIMS DEBUG] - contacts count:', contacts.length);
      console.log('[AIMS DEBUG] - tags state:', tags);
      console.log('[AIMS DEBUG] - tags count:', tags.length);
      
      // Always construct a fresh payload for each call
      const payload = {
        ...general,
        sectors,
        tags,
        transactions,
        extendingPartners,
        implementingPartners,
        governmentPartners,
        contacts,
        governmentInputs,
        contributors,
        // Handle status fields
        activityStatus: general.activityStatus || "planning",
        publicationStatus: publish ? "published" : (general.publicationStatus || "draft"),
        // Include user's organization ID for new activities
        createdByOrg: general.createdByOrg || user?.organizationId,
        // Include user information for logging
        user: user ? {
          id: user.id,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        } : undefined,
      };

      // Remove any legacy status field
      delete (payload as any).status;

      // If we have an ID, include it in the payload for updates
      if (general.id) {
        payload.id = general.id;
      }

      console.log("[AIMS] Submitting activity payload:", payload);
      console.log("[AIMS] Activity Partner ID being saved:", payload.partnerId);
      console.log("[AIMS] Activity status being saved:", payload.activityStatus);
      console.log("[AIMS] Publication status being saved:", payload.publicationStatus);
      console.log("[AIMS] Transactions count:", payload.transactions.length);
      console.log("[AIMS] Contributors count:", payload.contributors.length);
      console.log("[AIMS] Contributors in payload:", payload.contributors);
      console.log("[AIMS] Transactions in payload:", payload.transactions);
      console.log("[AIMS] Tags count:", payload.tags.length);
      console.log("[AIMS] Tags in payload:", payload.tags);
      console.log("[AIMS] Sectors count:", payload.sectors.length);
      console.log("[AIMS] Contacts being saved:", payload.contacts);
      console.log("[AIMS] Contacts details:", JSON.stringify(payload.contacts, null, 2));
      
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log('[AIMS DEBUG] Save API response status:', res.status);
      const data = await res.json();
      console.log('[AIMS DEBUG] Save API response data:', data);

      if (!res.ok) {
        console.log('[AIMS DEBUG] Save API failed:', data.error);
        throw new Error(data.error || "Failed to save activity");
      }

      console.log("[AIMS] Activity saved successfully:", data);
      console.log("[AIMS] Response status:", data.status);
      console.log("[AIMS] Response transactions:", data.transactions?.length || 0);
      
      // Check for backend warnings
      if (data._warnings && data._warnings.length > 0) {
        data._warnings.forEach((warning: any) => {
          toast.error(warning.message, {
            description: warning.details,
            duration: 10000,
            action: {
              label: "View Details",
              onClick: () => console.error('[AIMS] Save warning details:', warning)
            }
          });
        });
        
        // Set error state to show persistent warning
        setError(`Warning: ${data._warnings[0].message}. Check the browser console for details.`);
      } else {
        // Clear error if save was successful without warnings
        setError("");
      }
      
      // Update local state with the response data to ensure consistency
      setGeneral({
        id: data.id,
        partnerId: data.partnerId || "",
        iatiId: data.iatiId || "",
        title: data.title || "",
        description: data.description || "",
        objectives: data.objectives || "",
        targetGroups: data.targetGroups || "",
        collaborationType: data.collaborationType || "",
        activityStatus: data.activityStatus || "planning",
        publicationStatus: data.publicationStatus || "draft",
        submissionStatus: data.submissionStatus || "draft",
        submittedBy: data.submittedBy || "",
        submittedByName: data.submittedByName || "",
        submittedAt: data.submittedAt || "",
        validatedBy: data.validatedBy || "",
        validatedByName: data.validatedByName || "",
        validatedAt: data.validatedAt || "",
        rejectedBy: data.rejectedBy || "",
        rejectedByName: data.rejectedByName || "",
        rejectedAt: data.rejectedAt || "",
        rejectionReason: data.rejectionReason || "",
        plannedStartDate: data.plannedStartDate || "",
        plannedEndDate: data.plannedEndDate || "",
        actualStartDate: data.actualStartDate || "",
        actualEndDate: data.actualEndDate || "",
        banner: data.banner || "",
        projectIcon: data.projectIcon || "",
        createdBy: data.createdBy || undefined,
        createdByOrg: data.createdByOrg || "",
        createdAt: data.createdAt || "",
        updatedAt: data.updatedAt || "",
      });
      setSectors(data.sectors || []);
      setTransactions(data.transactions || []);
      setExtendingPartners(data.extendingPartners || []);
      setImplementingPartners(data.implementingPartners || []);
      setGovernmentPartners(data.governmentPartners || []);
      setContacts(data.contacts || []);
      setGovernmentInputs(data.governmentInputs || {});
      setContributors(data.contributors || []);
      setTags(data.tags || []);
      
      console.log('[AIMS DEBUG] After save - contacts from response:', data.contacts);
      console.log('[AIMS DEBUG] After save - contacts count:', data.contacts?.length || 0);
      console.log('[AIMS DEBUG] After save - contributors from response:', data.contributors);
      console.log('[AIMS DEBUG] After save - contributors count:', data.contributors?.length || 0);
      console.log('[AIMS DEBUG] After save - tags from response:', data.tags);
      console.log('[AIMS DEBUG] After save - tags count:', data.tags?.length || 0);
      
      // Create detailed success message
      let successDetails = [];
      if (data.sectors?.length > 0) successDetails.push(`${data.sectors.length} sectors`);
      if (data.transactions?.length > 0) successDetails.push(`${data.transactions.length} transactions`);
      if (data.contributors?.length > 0) successDetails.push(`${data.contributors.length} contributors`);
      if (data.contacts?.length > 0) successDetails.push(`${data.contacts.length} contacts`);
      if (data.tags?.length > 0) successDetails.push(`${data.tags.length} tags`);
      
      // Check for potential issues
      let warnings = [];
      if (payload.contributors.length > 0 && (!data.contributors || data.contributors.length === 0)) {
        warnings.push("Contributors may not have saved properly");
      }
      if (payload.transactions.length > 0 && (!data.transactions || data.transactions.length === 0)) {
        warnings.push("Transactions may not have saved properly");
      }
      if (payload.tags.length > 0 && (!data.tags || data.tags.length === 0)) {
        warnings.push("Tags may not have saved properly");
      }
      
      // Show appropriate success message with details
      const successMsg = publish 
        ? `Activity published successfully!`
        : `Activity saved successfully!`;
      
      const detailsMsg = successDetails.length > 0 
        ? ` Saved: ${successDetails.join(', ')}`
        : '';
        
      toast.success(successMsg + detailsMsg, {
        duration: 5000,
        description: `Activity ID: ${data.id}`
      });
      
      // Show warnings if any
      warnings.forEach(warning => {
        toast.warning(warning, { duration: 8000 });
      });
      
      // Navigate after a short delay to allow the toast to be seen
      if (goToList) {
        setTimeout(() => {
          router.replace("/activities");
        }, 1000);
      } else if (goToNext) {
        const next = getNextSection(activeSection);
        if (next) setActiveSection(next);
      }
    } catch (err: any) {
      console.error("[AIMS] Error saving activity:", err);
      setError(err.message || "Failed to save activity");
      toast.error(err.message || "Failed to save activity");
    } finally {
      setSubmitting(false);
    }
  }, [general, sectors, transactions, extendingPartners, implementingPartners, governmentPartners, contacts, contributors, tags, governmentInputs, activeSection, router, user]);

  if (loading || userLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex min-h-[80vh]">
        {/* Show login required alert if user is not logged in */}
        {!user && (
          <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-red-50 border-b border-red-200">
            <Alert className="max-w-4xl mx-auto bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Login Required:</strong> You must be logged in to create or edit activities. 
                Please <a href="/login" className="underline font-medium">log in</a> with a valid user account from the database.
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {/* Left column containing metadata header and sidebar */}
        <div className="flex flex-col" style={{ marginTop: !user ? '80px' : '0' }}>
          {/* Activity Metadata Summary - Only show when editing */}
          {isEditing && general.id && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 m-4 mb-2 w-64">
              <div className="space-y-2 text-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {general.id ? (
                    <Link href={`/activities/${general.id}`} className="hover:text-blue-600 hover:underline">
                      {general.title || 'Untitled Activity'}
                    </Link>
                  ) : (
                    general.title || 'Untitled Activity'
                  )}
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-500">Activity ID:</span>
                    <span className="ml-2 font-medium block truncate">{general.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Created by:</span>
                    <span className="ml-2 font-medium block truncate">
                      {general.createdBy?.name || user?.name || 'Unknown'}
                      {user?.organization?.name && ` (${user.organization.name})`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Date created:</span>
                    <span className="ml-2 font-medium block">
                      {general.createdAt ? format(new Date(general.createdAt), 'dd MMM yyyy') : 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last updated:</span>
                    <span className="ml-2 font-medium block">
                      {general.updatedAt ? format(new Date(general.updatedAt), 'dd MMM yyyy') : 'Unknown'}
                    </span>
                  </div>
                  {contributors.filter(c => c.status === 'accepted').length > 0 && (
                    <div>
                      <span className="text-gray-500">Contributors:</span>
                      <span className="ml-2 font-medium block">
                        {contributors.filter(c => c.status === 'accepted').length} organization(s)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Sidebar */}
          <aside className="w-64 shrink-0 sticky top-0 h-fit self-start bg-white border border-gray-200 rounded-xl m-4 mt-2 p-6">
            <nav className="flex flex-col gap-1">
              {SECTIONS.map((section, idx) =>
                section.id === "divider" ? (
                  <div key="divider" className="my-4 border-t border-gray-200 pt-4">
                    <div className="text-xs text-gray-400 italic pl-1">The following sections are optional</div>
                  </div>
                ) : (
                  <button
                    key={section.id}
                    className={`text-left px-4 py-2 rounded font-medium transition focus:outline-none ${
                      activeSection === section.id
                        ? "bg-gray-900 text-white"
                        : "hover:bg-gray-100 text-gray-900"
                    } ${section.optional ? "mt-2" : ""}`}
                    onClick={() => setActiveSection(section.id)}
                    type="button"
                  >
                    {section.label}
                  </button>
                )
              )}
            </nav>
            
            {/* Activity Completion Rating Widget */}
            <div className="mt-6">
              <ActivityCompletionRating
                activity={general}
                transactions={transactions}
                sectors={sectors}
              />
            </div>
          </aside>
        </div>
        
        {/* Main Content */}
        <main className="flex-1 px-8 py-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {isEditing ? "Edit Activity" : "Create New Activity"}
              </h1>
              {/* Workflow Status Display */}
              {general.submissionStatus !== 'draft' && (
                <div className="mt-2 flex items-center gap-4">
                  <Badge 
                    variant={
                      general.submissionStatus === 'submitted' ? 'default' :
                      general.submissionStatus === 'validated' ? 'success' :
                      general.submissionStatus === 'rejected' ? 'destructive' :
                      general.submissionStatus === 'published' ? 'success' : 'secondary'
                    }
                  >
                    <span className="capitalize">{general.submissionStatus}</span>
                  </Badge>
                  {general.submittedByName && (
                    <span className="text-sm text-muted-foreground">
                      Submitted by {general.submittedByName}
                    </span>
                  )}
                  {general.validatedByName && (
                    <span className="text-sm text-muted-foreground">
                      Validated by {general.validatedByName}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Duplicate Detection Alert */}
            {!isEditing && similarActivities.length > 0 && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Found {similarActivities.length} similar {similarActivities.length === 1 ? 'activity' : 'activities'}. 
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="ml-1 p-0 h-auto"
                    onClick={() => setShowDuplicateDialog(true)}
                  >
                    View details
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Comments Toggle Button */}
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Comments ({comments.length})
              </Button>
            )}
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded border border-green-200 text-sm">
              {success}
            </div>
          )}
          
          {/* Comments Section */}
          {showComments && isEditing && general.id && (
            <div className="mb-6">
              <ActivityComments activityId={general.id} />
            </div>
          )}
          
          <div className="space-y-16">
            <section>
              <h2 className="text-2xl font-semibold mb-6">{SECTIONS.find(s => s.id === activeSection)?.label}</h2>
              <SectionContent 
                section={activeSection} 
                general={general} 
                setGeneral={setGeneral} 
                sectors={sectors} 
                setSectors={setSectors}
                transactions={transactions}
                setTransactions={setTransactions}
                extendingPartners={extendingPartners}
                setExtendingPartners={setExtendingPartners}
                implementingPartners={implementingPartners}
                setImplementingPartners={setImplementingPartners}
                governmentPartners={governmentPartners}
                setGovernmentPartners={setGovernmentPartners}
                contacts={contacts}
                setContacts={setContacts}
                updateContacts={updateContacts}
                governmentInputs={governmentInputs}
                setGovernmentInputs={setGovernmentInputs}
                contributors={contributors}
                setContributors={updateContributors}
                updateContributors={updateContributors}
                permissions={permissions}
                user={user}
                tags={tags}
                setTags={setTags}
              />
            </section>
          </div>
          {/* Sticky Footer */}
          <footer className="sticky bottom-0 bg-white border-t border-gray-200 py-4 mt-12 flex justify-between gap-4 z-10">
            <div className="flex gap-2">
              {/* Validation Actions for Tier 1 Users */}
              {canValidate && general.submissionStatus === 'submitted' && (
                <>
                  <Button
                    variant="default"
                    onClick={() => validateActivity('approve')}
                    disabled={submitting || !user}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const reason = window.prompt("Please provide a reason for rejection:");
                      if (reason) validateActivity('reject', reason);
                    }}
                    disabled={submitting || !user}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex gap-4">
              {/* Save Button - Always available for editable activities */}
              {canEdit && (
                <button
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  type="button"
                  onClick={() => saveActivity({})}
                  disabled={!general.title.trim() || submitting || !user}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Saving..." : "Save"}
                </button>
              )}
              
              {/* Submit for Validation - For Tier 2 users with draft activities */}
              {canSubmit && general.submissionStatus === 'draft' && general.id && (
                <Button
                  onClick={submitForValidation}
                  disabled={submitting || !user}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit for Validation
                    </>
                  )}
                </Button>
              )}
              
              {/* Save and Next - Only in edit mode */}
              {canEdit && (
                <button
                  className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  type="button"
                  onClick={() => saveActivity({ goToNext: true })}
                  disabled={submitting || !user}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Saving..." : "Save and Next"}
                </button>
              )}
              
              {/* Publish Button - For users with publish permission */}
              {canPublish && (
                <button
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  type="button"
                  onClick={() => saveActivity({ publish: true, goToList: true })}
                  disabled={!general.title.trim() || submitting || !user}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Publishing..." : "Publish"}
                </button>
              )}
            </div>
          </footer>
        </main>
      </div>
      
      {/* Duplicate Detection Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Similar Activities Found</DialogTitle>
            <DialogDescription>
              We found activities that might be similar to the one you're creating. 
              You can join an existing activity as a contributor instead of creating a duplicate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {similarActivities.map((match) => (
              <Card key={match.activity.id} className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{match.activity.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {match.activity.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {Math.round(match.score * 100)}% match
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {match.matchReasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/activities/${match.activity.id}`)}
                    >
                      View Activity
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => joinExistingActivity(match.activity.id)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Join as Contributor
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowDuplicateDialog(false)}>
              Continue Creating New Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

export default function NewActivityPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <NewActivityPageContent />
    </Suspense>
  );
}