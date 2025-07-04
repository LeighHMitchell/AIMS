"use client"

export const dynamic = 'force-dynamic';

import React, { useState, useCallback, useEffect, Suspense, useRef } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useRouter, useSearchParams } from "next/navigation";
import FinancesSection from "@/components/FinancesSection";
import ImprovedSectorAllocationForm from "@/components/activities/ImprovedSectorAllocationForm";
import OrganisationsSection from "@/components/OrganisationsSection";
import ContactsSection from "@/components/ContactsSection";
import GovernmentInputsSection from "@/components/GovernmentInputsSection";
import ContributorsSection from "@/components/ContributorsSection";
import { BannerUpload } from "@/components/BannerUpload";
import { IconUpload } from "@/components/IconUpload";
import { toast } from "sonner";
import { Transaction } from "@/types/transaction";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityStatusSelect } from "@/components/forms/ActivityStatusSelect";
import { CollaborationTypeSelect } from "@/components/forms/CollaborationTypeSelect";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, AlertCircle, CheckCircle, XCircle, Send, Users, X, Loader2, UserPlus, ChevronLeft, ChevronRight, HelpCircle, Save, ArrowRight, Globe, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FieldHelp, RequiredFieldIndicator, ActivityCompletionRating } from "@/components/ActivityFieldHelpers";
import { CopyField, CopyFieldGroup } from "@/components/ui/copy-field";
import { CommentsDrawer } from "@/components/CommentsDrawer";
import ActivityLocationEditorWrapper from "@/components/ActivityLocationEditorWrapper";
import LocationsTab from "@/components/LocationsTab";
import ActivityEditorNavigation from "@/components/ActivityEditorNavigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { findSimilarActivities, ActivityMatch } from "@/lib/activity-matching";
import { getActivityPermissions, ActivityContributor } from "@/lib/activity-permissions";
import { Partner } from "@/hooks/usePartners";
import { AidEffectivenessForm } from "@/components/AidEffectivenessForm";
import SDGAlignmentSection from "@/components/SDGAlignmentSection";
import TagsSection from "@/components/TagsSection";
import WorkingGroupsSection from "@/components/WorkingGroupsSection";
import PolicyMarkersSection from "@/components/PolicyMarkersSection";
import { SectorValidation } from "@/types/sector";
import LinkedActivitiesEditorTab from "@/components/activities/LinkedActivitiesEditorTab";
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard } from '@/components/ui/skeleton-loader';
import { ActivityEditorSkeleton, TabTransitionSkeleton } from '@/components/activities/ActivityEditorSkeleton';
import { 
  SectorAllocationSkeleton, 
  OrganisationsSkeleton, 
  FinancesSkeleton, 
  LocationsSkeleton, 
  LinkedActivitiesSkeleton,
  GenericTabSkeleton 
} from '@/components/activities/TabSkeletons';
import { supabase } from '@/lib/supabase';
import { AutosaveFormWrapper } from "@/components/forms/AutosaveFormWrapper";
import { useComprehensiveAutosave } from "@/hooks/use-comprehensive-autosave";


import { IATISyncPanel } from "@/components/activities/IATISyncPanel";
import ActivityBudgetsTab from "@/components/activities/ActivityBudgetsTab";
import PlannedDisbursementsTab from "@/components/activities/PlannedDisbursementsTab";

function SectionContent({ section, general, setGeneral, sectors, setSectors, transactions, setTransactions, extendingPartners, setExtendingPartners, implementingPartners, setImplementingPartners, governmentPartners, setGovernmentPartners, contacts, setContacts, updateContacts, governmentInputs, setGovernmentInputs, contributors, setContributors, sdgMappings, setSdgMappings, tags, setTags, workingGroups, setWorkingGroups, policyMarkers, setPolicyMarkers, specificLocations, setSpecificLocations, coverageAreas, setCoverageAreas, permissions, setSectorValidation, activityScope, setActivityScope, user, getDateFieldStatus, triggerAutoSave }: any) {
  switch (section) {
    case "general":
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
          {/* Banner and Icon Upload */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
            <div className="lg:col-span-3 flex flex-col">
              <label className="text-sm font-medium mb-2">Activity Banner</label>
              <div className="flex-1">
                <BannerUpload
                  currentBanner={general.banner}
                  onBannerChange={(banner) => setGeneral((g: any) => ({ ...g, banner }))}
                  activityId={general.id || "new"}
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-2">Project Icon</label>
              <div className="flex-1">
                <IconUpload
                  currentIcon={general.icon}
                  onIconChange={(icon) => setGeneral((g: any) => ({ ...g, icon }))}
                  activityId={general.id || "new"}
                />
              </div>
            </div>
          </div>

          {/* Row 1: Partner ID, IATI Identifier & UUID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col space-y-2">
              <label htmlFor="partnerId" className="text-sm font-medium flex items-center h-5">
                Activity Partner ID
                <FieldHelp field="partnerId" />
                <RequiredFieldIndicator field="participatingOrg" value={general.partnerId} />
              </label>
              <Input
                id="partnerId"
                value={general.partnerId}
                onChange={(e) => setGeneral((g: any) => ({ ...g, partnerId: e.target.value }))}
                placeholder="Partner ID"
                className="h-10"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label htmlFor="iatiId" className="text-sm font-medium flex items-center h-5">
                IATI Identifier
                <FieldHelp field="iatiId" />
              </label>
              <Input
                id="iatiId"
                value={general.iatiId}
                onChange={(e) => setGeneral((g: any) => ({ ...g, iatiId: e.target.value }))}
                placeholder="IATI Identifier"
                className="h-10"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium flex items-center h-5">
                System UUID
                <FieldHelp field="systemUuid" />
              </label>
              <CopyField
                label="System UUID"
                value={general.id}
                placeholder="Will be generated on save"
                hideLabel={true}
                fieldClassName="h-10"
              />
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
              name="title"
              value={general.title}
              onChange={(e) => {
                console.log('[AIMS] Title changed to:', e.target.value);
                setGeneral((g: any) => ({ ...g, title: e.target.value }));
              }}
              placeholder="Activity Title"
              required
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
              name="description"
              value={general.description}
              onChange={(e) => {
                console.log('[AIMS] Description changed, length:', e.target.value.length);
                setGeneral((g: any) => ({ ...g, description: e.target.value }));
              }}
              placeholder="Activity Description"
              rows={12}
            />
          </div>

          {/* Row 4: Reporting Organization (Read-only info) - Hidden per user request */}
          {/* {general.created_by_org_name && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Reported By Organization
              </label>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm text-gray-900">{general.created_by_org_name}</p>
                {general.created_by_org_acronym && (
                  <p className="text-xs text-gray-600 mt-1">({general.created_by_org_acronym})</p>
                )}
              </div>
            </div>
          )} */}

          {/* Row 6-7: All Type Selectors */}
          <div className="space-y-6">
            {/* First row: Collaboration Type and Activity Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full space-y-2">
                <label htmlFor="collaborationType" className="text-sm font-medium text-gray-700 flex items-center">
                  Collaboration Type
                  <FieldHelp field="collaborationType" />
                </label>
                <CollaborationTypeSelect
                  id="collaborationType"
                  value={general.collaborationType}
                  onValueChange={(value) => {
                    console.log('[AIMS DEBUG] CollaborationType changed from', general.collaborationType, 'to', value);
                    setGeneral((g: any) => ({ ...g, collaborationType: value }));
                    // Explicitly trigger autosave
                    triggerAutoSave();
                  }}
                  placeholder="Select Collaboration Type"
                />
              </div>
              <div className="w-full space-y-2">
                <label htmlFor="activityStatus" className="text-sm font-medium text-gray-700 flex items-center">
                  Activity Status
                  <FieldHelp field="activityStatus" />
                  <RequiredFieldIndicator field="activityStatus" value={general.activityStatus} />
                </label>
                <ActivityStatusSelect
                  id="activityStatus"
                  value={general.activityStatus}
                  onValueChange={(value) => {
                    console.log('[AIMS DEBUG] ActivityStatus changed from', general.activityStatus, 'to', value);
                    setGeneral((g: any) => ({ ...g, activityStatus: value }));
                    // Explicitly trigger autosave
                    triggerAutoSave();
                  }}
                  placeholder="Select Activity Status"
                />
              </div>
            </div>


          </div>

          {/* Row 8: Date Fields */}
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
                <label htmlFor="actualStartDate" className={`text-sm font-medium flex items-center ${!getDateFieldStatus().actualStartDate ? 'text-gray-400' : 'text-gray-700'}`}>
                  Actual Start Date
                  <FieldHelp field="actualStartDate" />
                  {!getDateFieldStatus().actualStartDate && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="h-3 w-3 text-gray-400 ml-1" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Available when activity status is Implementation or beyond</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </label>
                <Input
                  id="actualStartDate"
                  type="date"
                  value={general.actualStartDate}
                  onChange={(e) => setGeneral((g: any) => ({ ...g, actualStartDate: e.target.value }))}
                  disabled={!getDateFieldStatus().actualStartDate}
                  className={!getDateFieldStatus().actualStartDate ? "bg-gray-100 cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="actualEndDate" className={`text-sm font-medium flex items-center ${!getDateFieldStatus().actualEndDate ? 'text-gray-400' : 'text-gray-700'}`}>
                  Actual End Date
                  <FieldHelp field="actualEndDate" />
                  {!getDateFieldStatus().actualEndDate && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="h-3 w-3 text-gray-400 ml-1" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Available when activity status is Completion or beyond</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </label>
                <Input
                  id="actualEndDate"
                  type="date"
                  value={general.actualEndDate}
                  onChange={(e) => setGeneral((g: any) => ({ ...g, actualEndDate: e.target.value }))}
                  disabled={!getDateFieldStatus().actualEndDate}
                  className={!getDateFieldStatus().actualEndDate ? "bg-gray-100 cursor-not-allowed" : ""}
                />
              </div>
            </div>
          </div>


        </div>
      );
    case "iati":
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <IATISyncPanel
            activityId={general.id}
            iatiIdentifier={general.iatiIdentifier}
            autoSync={general.autoSync}
            lastSyncTime={general.lastSyncTime}
            syncStatus={general.syncStatus}
            autoSyncFields={general.autoSyncFields}
            onUpdate={() => {
              // The IATISyncPanel handles its own updates internally
              // This callback is just for parent notification if needed
            }}
            canEdit={permissions?.canEditActivity ?? true}
          />
        </div>
      );
    case "sectors":
      return (
        <div className="w-full">
          <h3 className="text-xl font-semibold text-gray-900">OECD DAC Sector Allocation</h3>
          <p className="text-sm text-gray-600 mt-1">
            Assign OECD DAC sector codes and allocate percentages for this activity.
          </p>
          <div className="mt-6">
            <ImprovedSectorAllocationForm
              allocations={sectors}
              onChange={setSectors}
              onValidationChange={setSectorValidation}
            />
          </div>
        </div>
      );
    case "contributors":
      return <ContributorsSection 
        contributors={contributors} 
        onChange={setContributors} 
        permissions={permissions}
        activityId={general.id}
      />;
    case "msdp":
      return <div className="bg-white rounded shadow p-8">[MSDP Alignment fields go here]</div>;
    case "organisations":
      return <OrganisationsSection
        extendingPartners={extendingPartners}
        implementingPartners={implementingPartners}
        governmentPartners={governmentPartners}
        contributors={contributors}
        onContributorAdd={(contributor) => {
          setContributors((prev: ActivityContributor[]) => [...prev, contributor]);
        }}
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
      return <LocationsTab 
        specificLocations={specificLocations}
        coverageAreas={coverageAreas}
        onSpecificLocationsChange={setSpecificLocations}
        onCoverageAreasChange={setCoverageAreas}
      />;
    case "finances":
      return <FinancesSection 
        activityId={general.id || "new"}
        transactions={transactions}
        onTransactionsChange={setTransactions}
        defaultFinanceType={general.defaultFinanceType}
        defaultAidType={general.defaultAidType}
        defaultFlowType={general.defaultFlowType}
        defaultCurrency={general.defaultCurrency}
        defaultTiedStatus={general.defaultTiedStatus}
        onDefaultsChange={(field, value) => {
          console.log('[AIMS DEBUG] Default field changed:', field, '=', value);
          console.log('[AIMS DEBUG] Current general.id:', general.id);
          console.log('[AIMS DEBUG] Current general.title:', general.title);
          
          if (field === 'defaultFlowType') {
            setGeneral((g: any) => ({ ...g, defaultFlowType: value }));
          } else if (field === 'defaultTiedStatus') {
            setGeneral((g: any) => ({ ...g, defaultTiedStatus: value }));
          } else {
            setGeneral((g: any) => ({ ...g, [field]: value }));
          }
          
          // Log immediate state update
          console.log('[AIMS DEBUG] Calling triggerAutoSave...');
          
          // Trigger auto-save after updating state
          triggerAutoSave();
          
          // Log the general state after update
          setTimeout(() => {
            console.log('[AIMS DEBUG] General state after update:', general);
            console.log('[AIMS DEBUG] Specific field value:', general[field]);
          }, 100);
        }}
      />;
    case "budgets":
      return <ActivityBudgetsTab 
        activityId={general.id}
        startDate={general.plannedStartDate || general.actualStartDate || ""}
        endDate={general.plannedEndDate || general.actualEndDate || ""}
        defaultCurrency={general.defaultCurrency || "USD"}
      />;
    case "planned_disbursements":
      return <PlannedDisbursementsTab 
        activityId={general.id}
        startDate={general.plannedStartDate || general.actualStartDate || ""}
        endDate={general.plannedEndDate || general.actualEndDate || ""}
        defaultCurrency={general.defaultCurrency || "USD"}
        readOnly={!permissions?.canEditActivity}
      />;
    case "results":
      return <div className="bg-white rounded shadow p-8">[Results fields go here]</div>;
    case "contacts":
      return <ContactsSection contacts={contacts} onChange={updateContacts} />;
    case "government":
      return <GovernmentInputsSection governmentInputs={governmentInputs} onChange={setGovernmentInputs} />;
    case "documents":
      return <div className="bg-white rounded shadow p-8">[Documents & Images fields go here]</div>;
    case "aid_effectiveness":
      return <AidEffectivenessForm general={general} onUpdate={setGeneral} />;
    case "sdg":
      return <SDGAlignmentSection sdgMappings={sdgMappings} onUpdate={setSdgMappings} />;
    case "tags":
      return <TagsSection activityId={general.id} tags={tags} onChange={setTags} />;
    case "working_groups":
      return <WorkingGroupsSection activityId={general.id} workingGroups={workingGroups} onChange={setWorkingGroups} />;
    case "policy_markers":
      return <PolicyMarkersSection activityId={general.id} policyMarkers={policyMarkers} onChange={setPolicyMarkers} />;
    case "linked_activities":
      return <LinkedActivitiesEditorTab 
        activityId={general.id} 
        currentUserId={user?.id}
        canEdit={permissions.canEditActivity}
      />;
    default:
      return null;
  }
}

function NewActivityPageContent() {
  const { user } = useUser();
  
  // Debug logging for user role
  console.log('[AIMS DEBUG] Current user:', user);
  console.log('[AIMS DEBUG] User role:', user?.role);
  console.log('[AIMS DEBUG] Role includes gov_partner:', user?.role?.includes('gov_partner'));
  
  // Build sections array based on user role
  // Also allow super_user to see government inputs
  const showGovernmentInputs = user?.role?.includes('gov_partner') || user?.role === 'super_user';
  
  const getSectionLabel = (sectionId: string): string => {
    const sectionLabels: Record<string, string> = {
      general: "General Information",
      iati: "IATI Sync",
      sectors: "Sector Allocation",
      locations: "Activity Locations",
      organisations: "Organisations",
      contributors: "Contributors",
      contacts: "Contacts",
      linked_activities: "Linked Activities",
      finances: "Finances",
      results: "Results",
      msdp: "MSDP Alignment",
      sdg: "SDG Alignment",
      tags: "Tags",
      working_groups: "Working Groups",
      policy_markers: "Policy Markers",
      government: "Government Inputs",
      documents: "Documents & Images",
      aid_effectiveness: "Aid Effectiveness",
      budgets: "Budgets",
      planned_disbursements: "Planned Disbursements"
    };
    return sectionLabels[sectionId] || sectionId;
  };
  
  const [activeSection, setActiveSection] = useState("general");
  const [general, setGeneral] = useState({
    id: "",
    partnerId: "",
    iatiId: "",
    title: "",
    description: "",
    created_by_org_name: "",
    created_by_org_acronym: "",
    collaborationType: "",
    activityStatus: "planning",
    defaultAidType: "",
    defaultFinanceType: "",
    defaultCurrency: "",
    defaultFlowType: "",
    defaultTiedStatus: "",
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
    icon: "",
    createdBy: undefined as { id: string; name: string; role: string } | undefined,
    createdByOrg: "",
    createdAt: "",
    updatedAt: "",
    iatiIdentifier: "",
    autoSync: false,
    lastSyncTime: "",
    syncStatus: "not_synced" as "live" | "pending" | "outdated" | "not_synced",
    autoSyncFields: [] as string[]
  });
  const [sectors, setSectors] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [extendingPartners, setExtendingPartners] = useState<any[]>([]);
  const [implementingPartners, setImplementingPartners] = useState<any[]>([]);
  const [governmentPartners, setGovernmentPartners] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [governmentInputs, setGovernmentInputs] = useState<any>({});
  const [comments, setComments] = useState<any[]>([]);
  const [contributors, setContributors] = useState<ActivityContributor[]>([]);
  const [sdgMappings, setSdgMappings] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [workingGroups, setWorkingGroups] = useState<any[]>([]);
  const [policyMarkers, setPolicyMarkers] = useState<any[]>([]);
  const [specificLocations, setSpecificLocations] = useState<any[]>([]);
  const [coverageAreas, setCoverageAreas] = useState<any[]>([]);
  const [activityScope, setActivityScope] = useState<string>("national");
  const [showComments, setShowComments] = useState(false);
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false);
  const [similarActivities, setSimilarActivities] = useState<ActivityMatch[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);
  const [sectorValidation, setSectorValidation] = useState<SectorValidation>({
    isValid: false,
    totalPercentage: 0,
    remainingPercentage: 100,
    errors: []
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAndNext, setSavingAndNext] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const isEditing = !!searchParams?.get("id");
  
  // Auto-save state and refs
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showMissingFieldsDialog, setShowMissingFieldsDialog] = useState(false);
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([]);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get permissions for current activity
  const permissions = getActivityPermissions(user, general.id ? { 
    ...general, 
    contributors,
    createdBy: general.createdBy 
  } as any : null);

  // Check required fields for auto-save
  const checkRequiredFields = useCallback(() => {
    const missing: string[] = [];
    
    if (!general.title?.trim()) missing.push("Activity Title");
    // Removed other required fields - only title is required now for publishing
    
    return missing;
  }, [general.title]);

  // Auto-save function
  const autoSave = useCallback(async () => {
    console.log('[AIMS DEBUG] autoSave called');
    console.log('[AIMS DEBUG] autoSaving:', autoSaving);
    console.log('[AIMS DEBUG] submitting:', submitting);
    console.log('[AIMS DEBUG] general.title:', general.title);
    console.log('[AIMS DEBUG] general.defaultCurrency:', general.defaultCurrency);
    console.log('[AIMS DEBUG] general.collaborationType:', general.collaborationType);
    console.log('[AIMS DEBUG] general.activityStatus:', general.activityStatus);
    
    // Don't auto-save if we're already saving or if there's no title (minimum requirement)
    if (autoSaving || submitting || !general.title?.trim()) {
      console.log('[AIMS DEBUG] autoSave skipped due to conditions:', {
        autoSaving,
        submitting,
        hasTitle: !!general.title?.trim()
      });
      return;
    }

    // Check required fields
    const missing = checkRequiredFields();
    if (missing.length > 0) {
      setMissingRequiredFields(missing);
      setShowMissingFieldsDialog(true);
      return;
    }

    setAutoSaving(true);
    
    try {
      const payload = {
        ...general,
        created_by_org_name: general.created_by_org_name || user?.organisation || user?.organization?.name || "",
        created_by_org_acronym: general.created_by_org_acronym || "",
        sectors: sectors.map((s: any) => ({
          code: s.code,
          name: s.name,
          percentage: s.percentage,
          categoryCode: s.categoryCode || s.code.substring(0, 3),
          categoryName: s.categoryName || `Category ${s.code.substring(0, 3)}`,
          categoryPercentage: s.categoryPercentage || s.percentage,
          type: s.type || 'secondary'
        })),
        transactions,
        extendingPartners,
        implementingPartners,
        governmentPartners,
        contacts,
        governmentInputs,
        contributors,
        sdgMappings,
        tags,
        workingGroups,
        policyMarkers,
        locations: {
          specificLocations,
          coverageAreas
        },
        activityScope,
        activityStatus: general.activityStatus || "planning",
        publicationStatus: general.publicationStatus || "draft",
        createdByOrg: general.createdByOrg || user?.organizationId,
        user: user ? {
          id: user.id,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId
        } : null
      };

      if (general.id) {
        payload.id = general.id;
      }
      
      console.log('[AIMS DEBUG] autoSave payload:', {
        id: payload.id,
        title: payload.title,
        defaultCurrency: payload.defaultCurrency,
        defaultAidType: payload.defaultAidType,
        defaultFinanceType: payload.defaultFinanceType,
        defaultFlowType: payload.defaultFlowType,
        defaultTiedStatus: payload.defaultTiedStatus
      });
      
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Update the ID if this was a new activity
        if (!general.id && data.id) {
          console.log('[AIMS DEBUG] New activity created with ID:', data.id);
          setGeneral(prev => ({ ...prev, id: data.id }));
        }
        
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        console.log('[AIMS DEBUG] Auto-save successful at', new Date().toISOString());
      } else {
        const errorText = await res.text();
        console.error('[AIMS DEBUG] Auto-save failed:', {
          status: res.status,
          statusText: res.statusText,
          error: errorText
        });
        // Don't throw error to avoid interrupting user flow
        toast.error('Auto-save failed. Please save manually.');
      }
    } catch (error) {
      console.error('[AIMS DEBUG] Auto-save error:', error);
      toast.error('Auto-save failed. Please save manually.');
    } finally {
      setAutoSaving(false);
    }
  }, [
    general, sectors, transactions, extendingPartners, implementingPartners,
    governmentPartners, contacts, governmentInputs, contributors, sdgMappings,
    tags, workingGroups, policyMarkers, specificLocations, coverageAreas,
    activityScope, user, autoSaving, submitting, checkRequiredFields
  ]);

  // Debounced auto-save trigger
  // IMPORTANT: We use a ref to store the latest autoSave function to avoid
  // recreating triggerAutoSave when autoSave changes
  const autoSaveRef = useRef(autoSave);
  useEffect(() => {
    autoSaveRef.current = autoSave;
  }, [autoSave]);

  const triggerAutoSave = useCallback(() => {
    console.log('[AIMS DEBUG] triggerAutoSave called');
    
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save (2 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(() => {
      console.log('[AIMS DEBUG] Executing autoSave after timeout');
      autoSaveRef.current();
    }, 2000);
    
    // Mark that there are unsaved changes
    setHasUnsavedChanges(true);
  }, []); // No dependencies - this function is now stable

  // Update transactions callback
  const updateTransactions = useCallback((newTransactions: Transaction[]) => {
    console.log('[AIMS DEBUG] updateTransactions called with:', newTransactions.length, 'transactions');
    setTransactions(newTransactions);
    setTransactionsLoaded(true);
  }, []);

  // Update contacts callback
  const updateContacts = useCallback((newContacts: any[]) => {
    console.log('[AIMS DEBUG] updateContacts called with:', newContacts);
    setContacts(newContacts);
  }, []);

  // Debug contacts state changes
  useEffect(() => {
    console.log('[AIMS DEBUG] Contacts state changed:', contacts);
    console.log('[AIMS DEBUG] Contacts count:', contacts.length);
  }, [contacts]);

  const fetchActivity = async (id: string) => {
    try {
      const res = await fetch(`/api/activities/${id}`);
      if (res.ok) {
        const activity = await res.json();
        if (activity) {
          console.log('[AIMS DEBUG] Fetched activity data:', activity);
          setGeneral({
            id: activity.id,
            partnerId: activity.partnerId || "",
            iatiId: activity.iatiId || "",
            title: activity.title || "",
            description: activity.description || "",
            created_by_org_name: activity.created_by_org_name || "",
            created_by_org_acronym: activity.created_by_org_acronym || "",
            collaborationType: activity.collaborationType || "",
            activityStatus: activity.activityStatus || activity.status || "planning",
            defaultAidType: activity.defaultAidType || "",
            defaultFinanceType: activity.defaultFinanceType || "",
            defaultCurrency: activity.defaultCurrency || "",
            defaultFlowType: activity.defaultFlowType || "",
            defaultTiedStatus: activity.defaultTiedStatus || "",
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
            icon: activity.icon || "",
            createdBy: activity.createdBy || undefined,
            createdByOrg: activity.createdByOrg || "",
            createdAt: activity.createdAt || "",
            updatedAt: activity.updatedAt || "",
            iatiIdentifier: activity.iatiIdentifier || "",
            autoSync: activity.autoSync || false,
            lastSyncTime: activity.lastSyncTime || "",
            syncStatus: activity.syncStatus || "not_synced",
            autoSyncFields: activity.autoSyncFields || []
          });
          setSectors(activity.sectors || []);
          setTransactions(activity.transactions || []);
          setExtendingPartners(activity.extendingPartners || []);
          setImplementingPartners(activity.implementingPartners || []);
          setGovernmentPartners(activity.governmentPartners || []);
          setContacts(activity.contacts || []);
          setGovernmentInputs(activity.governmentInputs || {
            budget: activity.budget || "",
            priority_area: activity.priority_area || "",
            implementation_agency: activity.implementation_agency || ""
          });
          if (activity.locations) {
            setSpecificLocations(activity.locations.site_locations || []);
            setCoverageAreas(activity.locations.broad_coverage_locations || []);
          }
          setComments(activity.comments || []);
          setContributors(activity.contributors || []);
          setSdgMappings(activity.sdgMappings || []);
          setTags(activity.tags || []);
          setWorkingGroups(activity.workingGroups || []);
          setPolicyMarkers(activity.policyMarkers || []);
          setActivityScope(activity.activityScope || "national");
          
          console.log('[AIMS DEBUG] After setting state - sectors:', activity.sectors);
          console.log('[AIMS DEBUG] After setting state - sectors count:', activity.sectors?.length || 0);
          console.log('[AIMS DEBUG] After setting state - sectors structure:', JSON.stringify(activity.sectors, null, 2));
          console.log('[AIMS DEBUG] After setting state - contacts:', activity.contacts);
          console.log('[AIMS DEBUG] After setting state - contacts count:', activity.contacts?.length || 0);
          console.log('[AIMS DEBUG] After setting state - contributors:', activity.contributors);
          console.log('[AIMS DEBUG] After setting state - contributors count:', activity.contributors?.length || 0);
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
  }

  // Load activity data if editing
  useEffect(() => {
    const activityId = searchParams?.get("id");
    if (activityId) {
      fetchActivity(activityId);
    } else {
      // For new activities, populate organization info from user
      if (user) {
        // Fetch the user's organization details to get the acronym
        const fetchOrgDetails = async () => {
          if (user.organizationId) {
            try {
              const orgRes = await fetch(`/api/organizations/${user.organizationId}`);
              if (orgRes.ok) {
                const org = await orgRes.json();
                setGeneral(prev => ({
                  ...prev,
                  created_by_org_name: org.name || "",
                  created_by_org_acronym: org.acronym || org.name || "",
                  createdByOrg: user.organizationId || ""
                }));
              }
            } catch (error) {
              console.error('[AIMS] Error fetching organization details:', error);
              // Fallback to user's organization field
              setGeneral(prev => ({
                ...prev,
                created_by_org_name: user.organisation || user.organization?.name || "",
                created_by_org_acronym: user.organisation || user.organization?.name || "",
                createdByOrg: user.organizationId || ""
              }));
            }
          } else {
            // Fallback if no organizationId
            setGeneral(prev => ({
              ...prev,
              created_by_org_name: user.organisation || user.organization?.name || "",
              created_by_org_acronym: user.organisation || user.organization?.name || "",
              createdByOrg: user.organizationId || ""
            }));
          }
        };
        fetchOrgDetails();
      }
      setLoading(false);
    }
  }, [searchParams, user]);

  // Duplicate detection useEffect
  useEffect(() => {
    if (!isEditing && general.title && general.title.length > 3) {
      const searchTimer = setTimeout(async () => {
        setSearchingDuplicates(true);
        try {
          // Skip duplicate search for now to fix build issue
          const matches: any[] = [];
          setSimilarActivities(matches);
        } catch (error) {
          console.error('Error searching for duplicates:', error);
        } finally {
          setSearchingDuplicates(false);
        }
      }, 1000);

      return () => clearTimeout(searchTimer);
    }
  }, [general.title, general.description, isEditing]);

  // Auto-save trigger on data changes
  useEffect(() => {
    // Only trigger auto-save if we have loaded the activity and have a user
    if (!loading && user) {
      triggerAutoSave();
    }
  }, [
    general, sectors, transactions, extendingPartners, implementingPartners,
    governmentPartners, contacts, governmentInputs, contributors, sdgMappings,
    tags, workingGroups, policyMarkers, specificLocations, coverageAreas,
    activityScope, loading, user, triggerAutoSave
  ]);

  // Handle navigation away from page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Clear auto-save timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges]);

  // Permission checks
  const canEdit = general.submissionStatus === 'draft' || general.submissionStatus === 'rejected' || user?.role === 'super_user';
  const canSubmit = user?.role === 'gov_partner_tier_2' || user?.role === 'dev_partner_tier_2';
  const canValidate = user?.role === 'gov_partner_tier_1' || user?.role === 'super_user';
  const canPublish = (user?.role === 'gov_partner_tier_1' || user?.role === 'super_user') && 
                     (general.submissionStatus === 'validated' || user?.role === 'super_user');

  // Date field enable/disable logic based on activity status
  const getDateFieldStatus = useCallback(() => {
    const status = general.activityStatus;
    
    // Map string status names to IATI numeric codes for backward compatibility
    const statusMap: Record<string, string> = {
      'planning': '1',
      'pipeline': '1',
      'identification': '1',
      'implementation': '2',
      'completion': '3',
      'finalisation': '3',
      'post_completion': '4',
      'closed': '4',
      'cancelled': '5',
      'suspended': '6'
    };
    
    // Get the numeric code - either directly or via mapping
    const mappedStatus = statusMap[status?.toLowerCase()] || status || '1';
    const statusCode = parseInt(mappedStatus) || 1;
    
    // IATI Status codes:
    // 1 = Pipeline/Identification - only planned dates
    // 2 = Implementation - planned dates + actual start
    // 3 = Finalisation - all dates
    // 4 = Closed - all dates  
    // 5 = Cancelled - all dates
    // 6 = Suspended - all dates
    
    return {
      plannedStartDate: true, // Always enabled for all statuses
      plannedEndDate: true,   // Always enabled for all statuses
      actualStartDate: statusCode >= 2, // Enabled for implementation and beyond
      actualEndDate: statusCode >= 3    // Enabled for completion and beyond
    };
  }, [general.activityStatus]);

  // Helper to get next section id
  function getNextSection(currentId: string) {
    const sections = [
      "general", "iati", "sectors", "locations", "organisations", "contributors", "contacts", 
      "linked_activities",
      "finances", "budgets", "planned_disbursements", "results", "msdp", "sdg", "tags", "working_groups", "policy_markers", "government", "documents", "aid_effectiveness"
    ].filter(id => id !== "government" || showGovernmentInputs);
    
    const idx = sections.findIndex(s => s === currentId);
    return idx < sections.length - 1 ? sections[idx + 1] : null;
  }

  // Save activity to API
  const saveActivity = useCallback(async ({ publish = false, goToList = false, goToNext = false }) => {
    setError("");
    setSuccess("");
    if (!general.title.trim()) {
      setError("Activity Title is required");
      return;
    }
    
    // Removed sector validation requirement for publishing - only title is required now
    
    // Set specific loading states
    if (publish) {
      setPublishing(true);
    } else if (goToNext) {
      setSavingAndNext(true);
    } else {
      setSaving(true);
    }
    setSubmitting(true);
    try {
      // Always construct a fresh payload for each call
      const payload = {
        ...general,
        // Ensure organization fields are populated for new activities
        created_by_org_name: general.created_by_org_name || user?.organisation || user?.organization?.name || "",
        created_by_org_acronym: general.created_by_org_acronym || "",
        // Map sectors to include category information if not already present
        sectors: sectors.map((s: any) => ({
          code: s.code,
          name: s.name,
          percentage: s.percentage,
          categoryCode: s.categoryCode || s.code.substring(0, 3),
          categoryName: s.categoryName || `Category ${s.code.substring(0, 3)}`,
          categoryPercentage: s.categoryPercentage || s.percentage,
          type: s.type || 'secondary'
        })),
        transactions,
        extendingPartners,
        implementingPartners,
        governmentPartners,
        contacts,
        governmentInputs,
        contributors,
        sdgMappings,
        tags,
        workingGroups,
        policyMarkers,
        locations: {
          specificLocations,
          coverageAreas
        },
        activityScope,
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
          organizationId: user.organizationId
        } : null
      };

      // If we have an ID, include it in the payload for updates
      if (general.id) {
        payload.id = general.id;
      }

      console.log("[AIMS] Submitting activity payload:", payload);
      console.log("[AIMS] Activity status being saved:", payload.activityStatus);
      console.log("[AIMS] Publication status being saved:", payload.publicationStatus);
      console.log("[AIMS] Default values being saved:", {
        defaultAidType: payload.defaultAidType,
        defaultFinanceType: payload.defaultFinanceType,
        defaultCurrency: payload.defaultCurrency,
        defaultFlowType: payload.defaultFlowType
      });
      console.log("[AIMS] Transactions count:", payload.transactions.length);
      console.log("[AIMS] Sectors count:", payload.sectors.length);
      console.log("[AIMS] Sectors being saved:", JSON.stringify(payload.sectors, null, 2));
      console.log("[AIMS] Contacts being saved:", payload.contacts);
      console.log("[AIMS] Contacts details:", JSON.stringify(payload.contacts, null, 2));
      
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("[AIMS] Response data:", data);
        
        // Verify the activity was actually saved
        if (data.id) {
          console.log("[AIMS] Verifying activity persistence...");
          const verifyRes = await fetch(`/api/activities/${data.id}`);
          if (!verifyRes.ok) {
            console.error("[AIMS] Verification failed - activity not found in database!");
            throw new Error("Activity appeared to save but was not found in database");
          }
          const verifyData = await verifyRes.json();
          console.log("[AIMS] Verification successful:", verifyData.title);
        }
        
        // Update the state with the response data
        setGeneral({
          id: data.id,
          partnerId: data.partnerId || "",
          iatiId: data.iatiId || "",
          title: data.title || "",
          description: data.description || "",
          created_by_org_name: data.created_by_org_name || "",
          created_by_org_acronym: data.created_by_org_acronym || "",
          collaborationType: data.collaborationType || "",
          activityStatus: data.activityStatus || "planning",
          defaultAidType: data.defaultAidType || "",
          defaultFinanceType: data.defaultFinanceType || "",
          defaultCurrency: data.defaultCurrency || "",
          defaultFlowType: data.defaultFlowType || "",
          defaultTiedStatus: data.defaultTiedStatus || "",
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
          icon: data.icon || "",
          createdBy: data.createdBy || undefined,
          createdByOrg: data.createdByOrg || "",
          createdAt: data.createdAt || "",
          updatedAt: data.updatedAt || "",
          iatiIdentifier: data.iatiIdentifier || "",
          autoSync: data.autoSync || false,
          lastSyncTime: data.lastSyncTime || "",
          syncStatus: data.syncStatus || "not_synced",
          autoSyncFields: data.autoSyncFields || []
        });
        setSectors(data.sectors || []);
        setTransactions(data.transactions || []);
        setExtendingPartners(data.extendingPartners || []);
        setImplementingPartners(data.implementingPartners || []);
        setGovernmentPartners(data.governmentPartners || []);
        setContacts(data.contacts || []);
        setGovernmentInputs(data.governmentInputs || {});
        if (data.locations) {
          setSpecificLocations(data.locations.site_locations || []);
          setCoverageAreas(data.locations.broad_coverage_locations || []);
        }
        setContributors(data.contributors || []);
        setSdgMappings(data.sdgMappings || []);
        setTags(data.tags || []);
        setWorkingGroups(data.workingGroups || []);
        setPolicyMarkers(data.policyMarkers || []);
        setActivityScope(data.activityScope || "national");
        
        console.log('[AIMS DEBUG] After save - sectors from response:', data.sectors);
        console.log('[AIMS DEBUG] After save - sectors count:', data.sectors?.length || 0);
        console.log('[AIMS DEBUG] After save - contacts from response:', data.contacts);
        console.log('[AIMS DEBUG] After save - contacts count:', data.contacts?.length || 0);
        console.log('[AIMS DEBUG] After save - contributors from response:', data.contributors);
        console.log('[AIMS DEBUG] After save - contributors count:', data.contributors?.length || 0);
        
        // Show appropriate success message
        const successMsg = publish 
          ? "Activity published successfully"
          : "Activity saved";
        toast.success(successMsg);
        setSuccess("");  // Clear any previous success message
        
        // Clear error message on success
        setError("");
        
        // Handle navigation based on action
        if (goToNext) {
          // Save and Next: move to next tab
          const next = getNextSection(activeSection);
          if (next) {
            setActiveSection(next);
            toast.success("Changes saved");
          }
        }
        // For Save and Publish: stay on current tab (no navigation)
        // The state has already been updated above
      } else {
        const errorData = await res.json();
        console.error("[AIMS] Save failed with response:", errorData);
        throw new Error(errorData.error || "Failed to save activity");
      }
    } catch (err: any) {
      console.error("[AIMS] Error saving activity:", err);
      setError(err.message || "Failed to save activity");
      toast.error(err.message || "Failed to save activity");
    } finally {
      setSubmitting(false);
      setSaving(false);
      setSavingAndNext(false);
      setPublishing(false);
    }
  }, [general, sectors, transactions, transactionsLoaded, extendingPartners, implementingPartners, governmentPartners, contacts, sdgMappings, tags, workingGroups, policyMarkers, activeSection, router, user, isEditing, sectorValidation]);

  // Add loading state when switching tabs
  const handleTabChange = async (value: string) => {
    // Trigger auto-save before changing tabs
    if (hasUnsavedChanges) {
      autoSave();
    }
    
    setTabLoading(true);
    setActiveSection(value);
    
    // Simulate minimum loading time for smooth transition
    await new Promise(resolve => setTimeout(resolve, 200));
    setTabLoading(false);
  };

  // Add a function to get the appropriate skeleton for each tab
  const getTabSkeleton = (section: string) => {
    switch (section) {
      case 'sectors':
        return <SectorAllocationSkeleton />;
      case 'organisations':
        return <OrganisationsSkeleton />;
      case 'finances':
        return <FinancesSkeleton />;
      case 'budgets':
        return <GenericTabSkeleton />;
      case 'planned_disbursements':
        return <GenericTabSkeleton />;
      case 'locations':
        return <LocationsSkeleton />;
      case 'linked_activities':
        return <LinkedActivitiesSkeleton />;
      default:
        return <GenericTabSkeleton />;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <ActivityEditorSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <AutosaveFormWrapper
        activityData={{
          general,
          sectors,
          transactions,
          extendingPartners,
          implementingPartners,
          governmentPartners,
          contacts,
          governmentInputs,
          contributors,
          sdgMappings,
          tags,
          workingGroups,
          policyMarkers,
          specificLocations,
          coverageAreas,
          activityScope
        }}
        user={user}
        enabled={!loading && !!user}
        showStatusIndicator={true}
        showErrorAlerts={true}
      >
        {/* 3-Column Layout: Main Sidebar (fixed by MainLayout) | Editor Nav | Main Panel */}
        <div className="flex h-[calc(100vh-6rem)] overflow-hidden gap-x-6 lg:gap-x-8">
        {/* Activity Editor Navigation Panel */}
        <aside className="w-80 flex-shrink-0 bg-white overflow-y-auto">
          {/* Activity Metadata Summary - Only show when editing */}
          {isEditing && general.id && (
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="space-y-2 text-sm">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{general.title || 'Untitled Activity'}</h3>
                  {/* Validation Status Badge */}
                  {general.submissionStatus && general.submissionStatus !== 'draft' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        general.submissionStatus === 'submitted' ? 'text-blue-600 bg-blue-100' :
                        general.submissionStatus === 'validated' ? 'text-green-600 bg-green-100' :
                        general.submissionStatus === 'rejected' ? 'text-red-600 bg-red-100' :
                        general.submissionStatus === 'published' ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                      }`}>
                        {(() => {
                          switch (general.submissionStatus) {
                            case 'validated': return '✅ Validated'
                            case 'published': return '📢 Published'
                            case 'submitted': return '📝 Submitted'
                            case 'rejected': return '❌ Rejected'
                            default: return 'Draft'
                          }
                        })()}
                      </span>
                      {general.validatedByName && general.submissionStatus === 'validated' && (
                        <span className="text-xs text-gray-500">by {general.validatedByName}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-500">System UUID:</span>
                    <span className="ml-2 font-medium block truncate">{general.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Reported by:</span>
                    <span className="ml-2 font-medium block truncate">
                      {general.created_by_org_acronym || general.created_by_org_name || 'Unknown'}
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
          
          {/* Activity Editor Navigation */}
          <div>
            <ActivityEditorNavigation
              activeSection={activeSection}
              onSectionChange={handleTabChange}
              showGovernmentInputs={showGovernmentInputs}
            />
            
            {/* Activity Completion Rating Widget */}
            <div className="mt-6">
              <ActivityCompletionRating
                activity={general}
                transactions={transactions}
                sectors={sectors}
              />
            </div>
          </div>
        </aside>

        {/* Main Content Panel */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-white">
          <div className="activity-editor pl-0 pr-6 md:pr-8 py-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Edit Activity</h1>
              <div className="flex items-center gap-6">
                {/* Publish Toggle */}
                {canPublish && general.id && (
                  <div className="flex items-center gap-4">
                    <span className="text-base font-semibold text-gray-700">Unpublished</span>
                    <Switch
                      checked={general.publicationStatus === 'published'}
                      onCheckedChange={async (checked) => {
                        if (checked) {
                          saveActivity({ publish: true });
                        } else {
                          // Unpublish the activity
                          setGeneral(prev => ({ ...prev, publicationStatus: 'draft' }));
                          saveActivity({ publish: false });
                        }
                      }}
                      disabled={!general.title.trim() || submitting || publishing}
                      className="data-[state=checked]:bg-green-600 scale-125"
                    />
                    <span className="text-base font-semibold text-gray-700">Published</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Duplicate Detection Alert */}
            {!isEditing && similarActivities.length > 0 && (
              <Alert className="mb-6">
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
                variant="ghost"
                size="sm"
                className="mb-6"
                onClick={() => setIsCommentsDrawerOpen(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Comments
              </Button>
            )}
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setError("");
                    saveActivity({});
                  }}
                  className="ml-4"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Comments Section */}
          
          <div className="px-0 pr-6 md:pr-8">
            <section>
              <h2 className="text-2xl font-semibold mb-6">{getSectionLabel(activeSection)}</h2>
              {tabLoading ? (
                getTabSkeleton(activeSection)
              ) : (
                <div className="fade-in">
                  <SectionContent
                    section={activeSection}
                    general={general}
                    setGeneral={setGeneral}
                    sectors={sectors}
                    setSectors={setSectors}
                    transactions={transactions}
                    setTransactions={updateTransactions}
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
                    setContributors={setContributors}
                    sdgMappings={sdgMappings}
                    setSdgMappings={setSdgMappings}
                    tags={tags}
                    setTags={setTags}
                    workingGroups={workingGroups}
                    setWorkingGroups={setWorkingGroups}
                    policyMarkers={policyMarkers}
                    setPolicyMarkers={setPolicyMarkers}
                    specificLocations={specificLocations}
                    setSpecificLocations={setSpecificLocations}
                    coverageAreas={coverageAreas}
                    setCoverageAreas={setCoverageAreas}
                    permissions={permissions}
                    setSectorValidation={setSectorValidation}
                    activityScope={activityScope}
                    setActivityScope={setActivityScope}
                    user={user}
                    getDateFieldStatus={getDateFieldStatus}
                    triggerAutoSave={triggerAutoSave}
                  />
                </div>
              )}
            </section>
          </div>
          
          {/* Sticky Footer */}
          <footer className="sticky bottom-0 bg-white border-t-2 border-gray-300 py-6 mt-8 flex justify-between gap-4 z-20 shadow-lg px-6">
            <div className="flex gap-2">
              {/* Validation Actions for Tier 1 Users */}
              {canValidate && general.submissionStatus === 'submitted' && (
                <>
                  <button
                    className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                    type="button"
                    onClick={() => console.log('Approve clicked')}
                    disabled={submitting}
                  >
                    <CheckCircle className="h-5 w-5" />
                    Approve
                  </button>
                  <button
                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                    type="button"
                    onClick={() => {
                      const reason = window.prompt("Please provide a reason for rejection:");
                      if (reason) console.log('Reject clicked:', reason);
                    }}
                    disabled={submitting}
                  >
                    <XCircle className="h-5 w-5" />
                    Reject
                  </button>
                </>
              )}
            </div>
            
            <div className="flex gap-4">
              {/* Submit for Validation - For Tier 2 users with draft activities */}
              {canSubmit && general.submissionStatus === 'draft' && general.id && (
                <button
                  className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                  type="button"
                  onClick={() => console.log('Submit for validation')}
                  disabled={submitting}
                >
                  <Send className="h-5 w-5" />
                  Submit for Validation
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
                      onClick={() => console.log('Join activity:', match.activity.id)}
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
      
      {/* Comments Drawer */}
      <CommentsDrawer
        activityId={general.id}
        isOpen={isCommentsDrawerOpen}
        onClose={() => setIsCommentsDrawerOpen(false)}
      />
      
      {/* Missing Required Fields Dialog */}
      <Dialog open={showMissingFieldsDialog} onOpenChange={setShowMissingFieldsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Required Field Missing</DialogTitle>
            <DialogDescription>
              The Activity Title must be completed before the activity can be auto-saved:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="list-disc pl-6 space-y-1">
              {missingRequiredFields.map((field) => (
                <li key={field} className="text-sm text-gray-700">{field}</li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMissingFieldsDialog(false)}>
              I'll complete them later
            </Button>
            <Button onClick={() => {
              setShowMissingFieldsDialog(false);
              setActiveSection("general"); // Go to general tab where title field is
            }}>
              Add Activity Title
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </AutosaveFormWrapper>
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