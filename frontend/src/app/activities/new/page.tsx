"use client"

import React, { useState, useCallback, useEffect, useMemo, Suspense, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { MainLayout } from "@/components/layout/main-layout";
import { useRouter, useSearchParams } from "next/navigation";
import { EnhancedFinancesSection } from "@/components/activities/EnhancedFinancesSection";
import ImprovedSectorAllocationForm from "@/components/activities/ImprovedSectorAllocationForm";
import OrganisationsSection from "@/components/OrganisationsSection";
import ContactsTab from "@/components/contacts/ContactsTab";
import FocalPointsTab from "@/components/activities/FocalPointsTab";
import { GovernmentInputsSectionEnhanced } from "@/components/GovernmentInputsSectionEnhanced";
import { AutosaveBannerUpload, AutosaveIconUpload } from "@/components/ui/autosave-upload";
import { toast } from "sonner";
import { Transaction } from "@/types/transaction";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityStatusSelect } from "@/components/forms/ActivityStatusSelect";
import { CollaborationTypeSelect } from "@/components/forms/CollaborationTypeSelect";
import { ActivityScopeSearchableSelect } from "@/components/forms/ActivityScopeSearchableSelect";
import { HierarchySelect } from "@/components/forms/HierarchySelect";
import { OtherIdentifierTypeSelect } from "@/components/forms/OtherIdentifierTypeSelect";
import { OrganizationSearchableSelect } from "@/components/ui/organization-searchable-select";
import { DropdownProvider } from "@/contexts/DropdownContext";
import { LinkedActivityTitle } from "@/components/ui/linked-activity-title";
import { CreateActivityModal } from "@/components/modals/CreateActivityModal";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, AlertCircle, CheckCircle, XCircle, Send, Users, X, UserPlus, ChevronLeft, ChevronRight, ChevronDown, HelpCircle, Save, ArrowRight, ArrowLeft, Globe, RefreshCw, ShieldCheck, PartyPopper, Lock, Copy, ExternalLink, Info, Share, CircleDashed, Loader2, Plus, Megaphone, FileText } from "lucide-react";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FieldHelp, RequiredFieldIndicator } from "@/components/ActivityFieldHelpers";
import { CommentsDrawer } from "@/components/CommentsDrawer";
import ActivityLocationEditorWrapper from "@/components/ActivityLocationEditorWrapper";
import CombinedLocationsTab from "@/components/CombinedLocationsTab";
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
import PolicyMarkersSectionIATIWithCustom from "@/components/PolicyMarkersSectionIATIWithCustom";
import BudgetMappingTab from "@/components/activities/BudgetMappingTab";
import { SectorValidation } from "@/types/sector";
import LinkedActivitiesEditorTab from "@/components/activities/LinkedActivitiesEditorTab";
import { SubnationalBreakdownTab } from "@/components/activities/SubnationalBreakdownTab";
import { Skeleton } from '@/components/ui/skeleton';
import { usePreCache, useIATIReferenceCache, useOrganizationsCache } from "@/hooks/use-pre-cached-data";
import { AsyncErrorBoundary } from "@/components/errors/AsyncErrorBoundary";
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
import { DebugPanel } from '@/components/DebugPanel';
import { fetchActivityWithCache, invalidateActivityCache } from '@/lib/activity-cache';
// Removed old bulk autosave imports - now using field-level autosave
// import { AutosaveFormWrapper } from "@/components/forms/AutosaveFormWrapper";
// import { AutosaveDebugPanel } from "@/components/debug/AutosaveDebugPanel";
// import { useActivityAutosave } from "@/hooks/use-activity-autosave";
// AutosaveStatus removed from sidebar title area per UX request
import { ActivityEditorFieldAutosave } from '@/components/activities/ActivityEditorFieldAutosave';
import { useDescriptionAutosave, useDateFieldAutosave, useFieldAutosave } from '@/hooks/use-field-autosave-new';
import { saveGeneralTab } from '@/lib/general-tab-service';
import { LabelSaveIndicator, SaveIndicator } from '@/components/ui/save-indicator';
import { getTabCompletionStatus } from "@/utils/tab-completion";
import { useLoadingBar } from "@/hooks/useLoadingBar";
import { useGovernmentEndorsement } from "@/hooks/use-government-endorsement";

// Remove test utilities import that's causing module not found error
// if (process.env.NODE_ENV === 'development') {
//   import('@/utils/autosave-test');
// }


import { IATISyncPanel } from "@/components/activities/IATISyncPanel";
import IatiLinkTab from "@/components/activities/IatiLinkTab";
import IatiImportTab from "@/components/activities/IatiImportTab";
import ActivityBudgetsTab from "@/components/activities/ActivityBudgetsTab";
import PlannedDisbursementsTab from "@/components/activities/PlannedDisbursementsTab";
import ForwardSpendingSurveyTab from "@/components/activities/ForwardSpendingSurveyTab";
import { AidTypeSelect } from "@/components/forms/AidTypeSelect";
import { ResultsTab } from "@/components/activities/ResultsTab";
import { CapitalSpendTab } from "@/components/activities/CapitalSpendTab";
import { FinancingTermsTab } from "@/components/activities/FinancingTermsTab";
import { ConditionsTab } from "@/components/activities/ConditionsTab";
import MetadataTab from "@/components/activities/MetadataTab";
import { DocumentsAndImagesTabInline } from "@/components/activities/DocumentsAndImagesTabInline";
import { IatiDocumentLink } from "@/lib/iatiDocumentLink";
import { HumanitarianTab } from "@/components/activities/HumanitarianTab";

import GovernmentEndorsementTab from "@/components/activities/GovernmentEndorsementTab";

// Utility function to format date without timezone conversion
const formatDateToString = (date: Date | null): string => {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Separate component for General section to properly use hooks
function GeneralSection({ general, setGeneral, user, getDateFieldStatus, setHasUnsavedChanges, updateActivityNestedField, setShowActivityCreatedAlert, onTitleAutosaveState, clearSavedFormData, isNewActivity }: any) {
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasShownInitialToast = useRef(false);
  const lastSavedDescriptionRef = useRef<string>('');
  const hasUserEditedDescriptionRef = useRef(false);
  
  // Track pending autosave operations
  const [pendingSaves, setPendingSaves] = useState(new Set<string>());

  // State for organizations dropdown
  const [organizations, setOrganizations] = useState<any[]>([]);

  // State to track which additional description fields are visible
  const [visibleDescriptionFields, setVisibleDescriptionFields] = useState<{
    objectives: boolean;
    targetGroups: boolean;
    other: boolean;
  }>({
    objectives: !!general.descriptionObjectives?.trim(),
    targetGroups: !!general.descriptionTargetGroups?.trim(),
    other: !!general.descriptionOther?.trim(),
  });

  // State to track collapsible date descriptions
  const [showPlannedStartDescription, setShowPlannedStartDescription] = useState(false);
  const [showPlannedEndDescription, setShowPlannedEndDescription] = useState(false);
  const [showActualStartDescription, setShowActualStartDescription] = useState(false);
  const [showActualEndDescription, setShowActualEndDescription] = useState(false);
  const [showCustomDateDescriptions, setShowCustomDateDescriptions] = useState<Record<number, boolean>>({});
  const [savedCustomDates, setSavedCustomDates] = useState<Record<number, boolean>>({});
  const customDatesInitializedRef = useRef(false);

  // Focus state tracking for save indicators
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isObjectivesFocused, setIsObjectivesFocused] = useState(false);
  const [isTargetGroupsFocused, setIsTargetGroupsFocused] = useState(false);
  const [isOtherFocused, setIsOtherFocused] = useState(false);
  const [isPlannedStartDescriptionFocused, setIsPlannedStartDescriptionFocused] = useState(false);
  const [isPlannedEndDescriptionFocused, setIsPlannedEndDescriptionFocused] = useState(false);
  const [isActualStartDescriptionFocused, setIsActualStartDescriptionFocused] = useState(false);
  const [isActualEndDescriptionFocused, setIsActualEndDescriptionFocused] = useState(false);
  const [otherIdentifiersFocusStates, setOtherIdentifiersFocusStates] = useState<Record<string, boolean>>({});
  const [customDateFocusStates, setCustomDateFocusStates] = useState<Record<string, boolean>>({});
  const [savingCustomDateIndex, setSavingCustomDateIndex] = useState<number | null>(null);
  const [newCustomDateIndex, setNewCustomDateIndex] = useState<number | null>(null);

  // Initialize savedCustomDates ONLY when activity is first loaded from database
  // This runs when the activity ID changes (new activity loaded)
  useEffect(() => {
    // Reset initialization flag when activity changes
    customDatesInitializedRef.current = false;
  }, [general.id]);

  // Initialize savedCustomDates when data is loaded and not yet initialized
  useEffect(() => {
    if (!customDatesInitializedRef.current && general.customDates && general.customDates.length > 0) {
      const initialSavedState: Record<number, boolean> = {};
      general.customDates.forEach((customDate: any, index: number) => {
        if (customDate.label?.trim()) {
          initialSavedState[index] = true;
        }
      });
      setSavedCustomDates(initialSavedState);
      customDatesInitializedRef.current = true;
    }
  }, [general.customDates]);

  // Initialize tracking refs with current data on first load
  useEffect(() => {
    lastSavedDescriptionRef.current = general.description || '';
    // Reset the edit flag when the component mounts or when switching between activities
    hasUserEditedDescriptionRef.current = false;
  }, [general.id]); // Only reset when activity ID changes

  // Fetch organizations for reporting org dropdown
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch('/api/organizations');
        const data = await res.json();
        setOrganizations(data || []);
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      }
    };
    fetchOrgs();
  }, []);

  // Field-level autosave hooks with context-aware success callbacks
  // Pass 'NEW' for new activities to trigger creation on first save
  // IMPORTANT: All hooks must be called before any early returns (Rules of Hooks)
  const effectiveActivityId = general.id || 'NEW';
  const descriptionAutosave = useFieldAutosave('description', { 
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data, isUserInitiated = false) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    }
  });

  const descriptionObjectivesAutosave = useFieldAutosave('descriptionObjectives', { 
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data, isUserInitiated = false) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    }
  });

  const descriptionTargetGroupsAutosave = useFieldAutosave('descriptionTargetGroups', { 
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data, isUserInitiated = false) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    }
  });

  const descriptionOtherAutosave = useFieldAutosave('descriptionOther', { 
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data, isUserInitiated = false) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    }
  });

  const otherIdentifiersAutosave = useFieldAutosave('otherIdentifiers', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 1000,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data, isUserInitiated = false) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
    }
  });

  const customDatesAutosave = useFieldAutosave('customDates', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 1000,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data, isUserInitiated = false) => {
      setSavingCustomDateIndex(null);
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
    }
  });

  const collaborationTypeAutosave = useFieldAutosave('collaborationType', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: {
      title: general.title || 'New Activity'
    },
    onSuccess: (data) => {
      // Disabled autosave flow
    },
  });

  const activityScopeAutosave = useFieldAutosave('activityScope', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: {
      title: general.title || 'New Activity'
    },
    onSuccess: (data) => {
      // Disabled autosave flow
    },
  });

  const hierarchyAutosave = useFieldAutosave('hierarchy', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: {
      title: general.title || 'New Activity'
    },
    onSuccess: (data) => {
      // Disabled autosave flow
    },
  });

  // Custom save function for reporting org (uses different endpoint)
  const saveReportingOrg = useCallback(async (orgId: string) => {
    if (!effectiveActivityId || effectiveActivityId === 'NEW') {
      return;
    }

    try {
      const response = await fetch(`/api/activities/${effectiveActivityId}/reporting-org`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporting_org_id: orgId || null })
      });

      if (!response.ok) {
        throw new Error('Failed to update reporting organization');
      }

      const data = await response.json();
      
      // Update local state with the response
      if (data.data) {
        setGeneral((g: any) => ({
          ...g,
          reportingOrgId: data.data.reporting_org_id,
          created_by_org_name: data.data.created_by_org_name,
          created_by_org_acronym: data.data.created_by_org_acronym
        }));
      }

      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id }));
        setShowActivityCreatedAlert(true);
      }
    } catch (error) {
      console.error('Failed to save reporting organization:', error);
      toast.error('Failed to update reporting organization');
    }
  }, [effectiveActivityId, general.id, setGeneral, setShowActivityCreatedAlert]);

  const publicationStatusAutosave = useFieldAutosave('publicationStatus', { 
    activityId: effectiveActivityId, 
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
    }
  });
  const plannedStartDateAutosave = useFieldAutosave('plannedStartDate', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    },
  });
  const plannedEndDateAutosave = useFieldAutosave('plannedEndDate', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    },
  });
  const actualStartDateAutosave = useFieldAutosave('actualStartDate', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    },
  });
  const actualEndDateAutosave = useFieldAutosave('actualEndDate', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    },
  });

  // Date description autosave hooks
  const plannedStartDescriptionAutosave = useFieldAutosave('plannedStartDescription', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 500,
    additionalData: { title: general.title || 'New Activity' },
  });
  const plannedEndDescriptionAutosave = useFieldAutosave('plannedEndDescription', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 500,
    additionalData: { title: general.title || 'New Activity' },
  });
  const actualStartDescriptionAutosave = useFieldAutosave('actualStartDescription', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 500,
    additionalData: { title: general.title || 'New Activity' },
  });
  const actualEndDescriptionAutosave = useFieldAutosave('actualEndDescription', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 500,
    additionalData: { title: general.title || 'New Activity' },
  });

  // Context-aware autosave hooks for Activity Identifier and IATI Identifier
  const activityIdAutosave = useFieldAutosave('otherIdentifier', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data: any) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    }
  });
  
  const iatiIdentifierAutosave = useFieldAutosave('iatiIdentifier', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data: any) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    }
  });

  // Banner and Icon autosave hooks
  const bannerAutosave = useFieldAutosave('banner', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    },
  });
  const bannerPositionAutosave = useFieldAutosave('bannerPosition', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
    },
  });
  const iconAutosave = useFieldAutosave('icon', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    },
  });

  // Icon scale autosave hook (for zoom level)
  const iconScaleAutosave = useFieldAutosave('iconScale', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
    },
  });

  // UUID autosave hook (read-only field)
  const uuidAutosave = useFieldAutosave('uuid', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Disabled autosave flow
    },
  });

  // Helper function to determine if fields should be locked
  const getFieldLockStatus = () => {
    const isActivityCreated = Boolean(general.id);
    return {
      isLocked: !isActivityCreated,
      tooltipMessage: "Locked until activity is created"
    };
  };

  // Make fieldLockStatus reactive to general.id changes
  const fieldLockStatus = useMemo(() => getFieldLockStatus(), [general.id]);

  // Copy function for identifier fields
  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${fieldName} copied to clipboard`, { position: 'top-center' });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy to clipboard', { position: 'top-center' });
    }
  };

  // Title autosave removed in manual mode to avoid conflicting create flows

  const acronymAutosave = useFieldAutosave('acronym', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: false,
    debounceMs: 0,
    // onStart removed in manual mode
    onSuccess: (data) => {
      setPendingSaves(prev => {
        const newSet = new Set(prev);
        newSet.delete('acronym');
        return newSet;
      });
      // Disabled autosave flow
    }
  });

  // Manual create activity
  const createActivity = useCallback(async () => {
    if (!general.title?.trim()) {
      toast.error('Please enter an activity title before creating');
      return;
    }
    setIsCreatingActivity(true);
    try {
      const payload = {
        title: general.title,
        acronym: general.acronym || '',
        description: general.description || '',
        user: user ? { id: user.id } : undefined
      };
      console.log('[Manual Create] Payload:', payload);
      console.log('[Manual Create] Acronym value:', payload.acronym);
      
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.id }));
        setShowActivityCreatedAlert(true);
      setHasUnsavedChanges(false);
      toast.success('Activity created');
    } catch (e: any) {
      console.error('[Manual Create] Failed:', e);
      toast.error('Failed to create activity');
    } finally {
      setIsCreatingActivity(false);
    }
  }, [general.title, general.acronym, general.description, user, setGeneral, setHasUnsavedChanges, setShowActivityCreatedAlert]);

  // Local saveActivity function for title onBlur
  const saveActivity = useCallback(async ({ publish = false, goToList = false, goToNext = false }) => {
    console.log('[DEBUG] saveActivity called with:', { publish, goToList, goToNext });
    if (!general.title?.trim()) {
      toast.error('Activity Title is required');
      return;
    }

    console.log('[DEBUG] Setting loading state');
    setIsSaving(true);

    // Show orange toast notification while creating activity
    const loadingToastId = toast(
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Creating activity...</span>
      </div>,
      {
        duration: Infinity, // Will be dismissed when creation completes
        position: 'top-center',
        style: {
          background: 'rgb(251, 146, 60)', // Orange-400
          color: 'white',
          border: '1px solid rgb(249, 115, 22)' // Orange-500
        }
      }
    );

    try {
      const payload = {
        title: general.title,
        acronym: general.acronym || '',
        description: general.description || '',
        user: user ? { id: user.id } : undefined
      };
      
      console.log('[DEBUG] Creating activity with payload:', payload);
      
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      const data = await res.json();
      console.log('[DEBUG] Activity created successfully:', data);
      
      // Dismiss the loading toast
      toast.dismiss(loadingToastId);
      
      setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
      setShowActivityCreatedAlert(true);
      setHasUnsavedChanges(false);
      
      toast.success(
        <div className="flex items-center gap-2">
          <PartyPopper className="h-4 w-4" />
          <span>Activity created! All tabs are now unlocked and ready to use.</span>
        </div>,
        {
          duration: 4000,
          position: 'top-center'
        }
      );
      
    } catch (error: any) {
      console.error('[DEBUG] Failed to create activity:', error);
      // Dismiss the loading toast on error
      toast.dismiss(loadingToastId);
      toast.error(`Failed to create activity: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [general.title, general.acronym, general.description, user, setGeneral, setHasUnsavedChanges, setShowActivityCreatedAlert]);


  // Removed title autosave toasts and exposure; creation handled by manual save

  // Show initial toast when component mounts if creating a new activity (not editing an existing one)
  useEffect(() => {
    if (!general.id && !hasShownInitialToast.current && isNewActivity) {
      toast.info("Start by entering an Activity Title to create the activity and unlock all form fields!", {
        position: 'top-center',
        duration: 5000,
      });
      hasShownInitialToast.current = true;
    }
  }, [general.id, isNewActivity]);

  

  // Guard clause to prevent rendering until user is loaded
  // MOVED AFTER ALL HOOKS to comply with Rules of Hooks
  if (!user) {
    return <div className="p-6"><Skeleton className="h-8 w-64 mb-4" /><Skeleton className="h-32 w-full" /></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-8 min-h-[800px]">
      {/* Banner and Icon Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        <div className="lg:col-span-3 flex flex-col">
          <AutosaveBannerUpload
            id="banner"
            currentImage={general.banner}
            currentPosition={general.bannerPosition}
            onImageChange={(banner, position) => {
              if (!fieldLockStatus.isLocked) {
                setGeneral((g: any) => ({
                  ...g,
                  banner,
                  bannerPosition: position ?? g.bannerPosition
                }));
                setHasUnsavedChanges(true);
              }
            }}
            label={
              <div className="flex items-center gap-2">
                Activity Banner
                <HelpTextTooltip>
                  Upload a banner image (1200×300 pixels) to visually represent the activity. This image will be displayed on the activity profile page, activity cards, and other locations across the application.
                </HelpTextTooltip>
                {fieldLockStatus.isLocked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 ml-2 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{fieldLockStatus.tooltipMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            }
            autosaveState={{
              isSaving: bannerAutosave.state.isSaving || bannerPositionAutosave.state.isSaving,
              isPersistentlySaved: bannerAutosave.state.isPersistentlySaved,
              error: bannerAutosave.state.error || bannerPositionAutosave.state.error
            }}
            triggerSave={async (banner, position) => {
              console.log('[BANNER SAVE] triggerSave called:', { banner: banner ? 'has banner' : 'no banner', position });
              // Only save banner if it's actually provided (not null/undefined)
              if (banner) {
                console.log('[BANNER SAVE] Saving banner image...');
                bannerAutosave.triggerFieldSave(banner);
              }
              // Save position if provided - use direct API call for reliability
              if (position !== undefined && general.id) {
                console.log('[BANNER SAVE] Saving position:', position, 'activityId:', general.id);
                try {
                  const response = await fetch('/api/activities/field', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      field: 'bannerPosition',
                      value: Math.round(position),
                      activityId: general.id,
                      userId: user?.id
                    })
                  });
                  const result = await response.json();
                  console.log('[BANNER SAVE] Position save result:', result);
                  if (!response.ok) {
                    console.error('[BANNER SAVE] Position save failed:', result);
                  }
                } catch (error) {
                  console.error('[BANNER SAVE] Position save error:', error);
                }
              }
            }}
            disabled={fieldLockStatus.isLocked}
          />
        </div>
        <div className="flex flex-col">
          <div
            className={`flex-1 ${fieldLockStatus.isLocked ? 'opacity-50' : ''}`}
          >
            <AutosaveIconUpload
              id="icon"
              currentImage={general.icon}
              currentScale={general.iconScale}
              onImageChange={(icon, scale) => {
                if (!fieldLockStatus.isLocked) {
                  setGeneral((g: any) => ({
                    ...g,
                    icon,
                    iconScale: scale ?? g.iconScale
                  }));
                  setHasUnsavedChanges(true);
                }
              }}
              label={
                <div className="flex items-center gap-2">
                  Activity Icon/Logo
                  <HelpTextTooltip>
                    Upload a square image (256×256 pixels) to represent the activity's icon or logo. This image will be displayed on the activity profile page, activity cards, and summaries across the application. After uploading, use the zoom control to adjust the visible area.
                  </HelpTextTooltip>
                  {fieldLockStatus.isLocked && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Lock className="h-3 w-3 ml-2 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{fieldLockStatus.tooltipMessage}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              }
              autosaveState={{
                isSaving: iconAutosave.state.isSaving || iconScaleAutosave.state.isSaving,
                isPersistentlySaved: iconAutosave.state.isPersistentlySaved,
                error: iconAutosave.state.error || iconScaleAutosave.state.error
              }}
              triggerSave={async (icon, scale) => {
                console.log('[ICON SAVE] triggerSave called:', { icon: icon ? 'has icon' : 'no icon', scale });
                // Only save icon if it's actually provided (not null/undefined)
                if (icon) {
                  console.log('[ICON SAVE] Saving icon image...');
                  iconAutosave.triggerFieldSave(icon);
                }
                // Save scale if provided - use direct API call for reliability
                if (scale !== undefined && general.id) {
                  console.log('[ICON SAVE] Saving scale:', scale, 'activityId:', general.id);
                  try {
                    const response = await fetch('/api/activities/field', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        field: 'iconScale',
                        value: Math.round(scale),
                        activityId: general.id,
                        userId: user?.id
                      })
                    });
                    const result = await response.json();
                    console.log('[ICON SAVE] Scale save result:', result);
                    if (!response.ok) {
                      console.error('[ICON SAVE] Scale save failed:', result);
                    }
                  } catch (error) {
                    console.error('[ICON SAVE] Scale save error:', error);
                  }
                }
              }}
              disabled={fieldLockStatus.isLocked}
            />
          </div>
        </div>
      </div>

      {/* Field-level Autosave for Title and Acronym */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Activity Title - takes up 2 columns */}
        <div className="lg:col-span-2 space-y-2">
          <LabelSaveIndicator
            isSaving={false}
            isSaved={!!general.id && !!general.title?.trim()}
            hasValue={!!general.title?.trim()}
            isFocused={isTitleFocused}
            className="text-gray-700"
          >
            <div className="flex items-center gap-2">
              Activity Title
              <HelpTextTooltip>
                A short, human-readable title that provides a meaningful summary of the activity. It should be clear, descriptive, and consistent with the reporting organisation's titles used in published projects.
              </HelpTextTooltip>
            </div>
          </LabelSaveIndicator>
          <div>
            <Input
              id="title"
              value={general.title || ''}
              onChange={(e) => {
                setGeneral((g: any) => ({ ...g, title: e.target.value }));
                setHasUnsavedChanges(true);
              }}
              onFocus={() => setIsTitleFocused(true)}
              onBlur={() => {
                setIsTitleFocused(false);
                // Trigger activity creation when user enters title and navigates away
                if (general.title?.trim() && !general.id) {
                  saveActivity({});
                }
              }}
              placeholder="Enter activity title"
              className="w-full"
              autoFocus={!general.id}
              tabIndex={1}
            />
          </div>
        </div>
        
        {/* Create Activity Button removed: activity is created on Save */}
        
        {/* Activity Acronym - takes up 1 column */}
        <div className="lg:col-span-1 space-y-2">
          <LabelSaveIndicator
            isSaving={acronymAutosave.state.isSaving}
            isSaved={acronymAutosave.state.isPersistentlySaved}
            hasValue={!!general.acronym?.trim()}
            className={fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}
          >
            <div className="flex items-center gap-2">
              Activity Acronym
              <HelpTextTooltip>
                This field is used to record a short acronym or abbreviation for the activity. It helps users quickly identify and reference the activity across the application, especially in lists, cards, and summaries.
              </HelpTextTooltip>
              {fieldLockStatus.isLocked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-3 w-3 ml-2 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{fieldLockStatus.tooltipMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </LabelSaveIndicator>
          <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
            <Input
              id="acronym"
              value={general.acronym || ''}
              onChange={(e) => {
                if (!fieldLockStatus.isLocked) {
                  console.log('[AIMS DEBUG] Acronym onChange triggered:', e.target.value);
                  setGeneral((g: any) => ({ ...g, acronym: e.target.value }));
                  setHasUnsavedChanges(true);
                }
              }}
              onBlur={(e) => {
                if (!fieldLockStatus.isLocked && e.target.value.trim()) {
                  acronymAutosave.triggerFieldSave(e.target.value);
                }
              }}
              placeholder="Enter acronym"
              className="w-full"
              disabled={fieldLockStatus.isLocked}
              tabIndex={general.id ? 2 : -1}
            />
          </div>
        </div>
      </div>


      {/* Activity Identifier, IATI Identifier, and UUID Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={activityIdAutosave.state.isSaving}
            isSaved={activityIdAutosave.state.isPersistentlySaved}
            hasValue={!!general.otherIdentifier?.trim()}
            className={fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}
          >
            <div className="flex items-center gap-2">
              Activity Identifier
              <HelpTextTooltip>
                An internal identifier that is unique within the reporting organisation. Used for internal referencing and system management. Distinct from the IATI Identifier and typically follows the organisation's established naming conventions.
              </HelpTextTooltip>
              {fieldLockStatus.isLocked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-3 w-3 ml-2 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{fieldLockStatus.tooltipMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </LabelSaveIndicator>
          <div className={`relative ${fieldLockStatus.isLocked ? 'opacity-50' : ''}`}>
            <Input
              id="activityId"
              type="text"
              value={general.otherIdentifier || ''}
              onChange={(e) => {
                if (!fieldLockStatus.isLocked) {
                  setGeneral((g: any) => ({ ...g, otherIdentifier: e.target.value }));
                  setHasUnsavedChanges(true);
                }
              }}
              onBlur={(e) => {
                if (!fieldLockStatus.isLocked && e.target.value.trim()) {
                  if (general.id) {
                    activityIdAutosave.triggerFieldSave(e.target.value);
                  } else {
                    toast.success('The Activity Identifier has been stored and will be saved after activity creation.');
                  }
                }
              }}
              placeholder="Enter your organization's activity ID"
              className={''}
              disabled={fieldLockStatus.isLocked}
              tabIndex={general.id ? 3 : -1}
            />
            {general.otherIdentifier && (
              <button
                onClick={() => handleCopy(general.otherIdentifier, 'Activity Identifier')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                title="Copy Activity Identifier"
              >
                <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700" />
              </button>
            )}
          </div>
          {activityIdAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {activityIdAutosave.state.error.message}</p>}
        </div>
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={iatiIdentifierAutosave.state.isSaving}
            isSaved={iatiIdentifierAutosave.state.isPersistentlySaved}
            hasValue={!!general.iatiIdentifier?.trim()}
            className={fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}
          >
            <div className="flex items-center gap-2">
              IATI Identifier
              <HelpTextTooltip>
                This field is used to link activities reported in the application with those in the IATI Registry. It allows users to match locally reported activities with existing entries and, if desired, to keep them synchronised with the IATI Registry.
              </HelpTextTooltip>
              {fieldLockStatus.isLocked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-3 w-3 ml-2 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{fieldLockStatus.tooltipMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </LabelSaveIndicator>
          <div className={`relative ${fieldLockStatus.isLocked ? 'opacity-50' : ''}`}>
            <Input
              id="iatiIdentifier"
              type="text"
              value={general.iatiIdentifier || ''}
              onChange={(e) => {
                if (!fieldLockStatus.isLocked) {
                  setGeneral((g: any) => ({ ...g, iatiIdentifier: e.target.value }));
                  setHasUnsavedChanges(true);
                }
              }}
              onBlur={(e) => {
                if (!fieldLockStatus.isLocked && e.target.value.trim()) {
                  if (general.id) {
                    iatiIdentifierAutosave.triggerFieldSave(e.target.value);
                  } else {
                    toast.success('The IATI Identifier has been stored and will be saved after activity creation.');
                  }
                }
              }}
              placeholder="Enter IATI identifier"
              className={''}
              disabled={fieldLockStatus.isLocked}
              tabIndex={general.id ? 4 : -1}
            />
            {general.iatiIdentifier && (
              <button
                onClick={() => handleCopy(general.iatiIdentifier, 'IATI Identifier')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                title="Copy IATI Identifier"
              >
                <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700" />
              </button>
            )}
          </div>
          {iatiIdentifierAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {iatiIdentifierAutosave.state.error.message}</p>}
        </div>
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={uuidAutosave.state.isSaving}
            isSaved={uuidAutosave.state.isPersistentlySaved || !!general.uuid}
            hasValue={!!general.uuid}
            className="text-gray-700"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Universally Unique Identifier
              </span>
              <Lock className="h-3 w-3 text-gray-400" />
              <HelpTextTooltip>
                This field is auto-generated and locked. Every activity has a Universally Unique Identifier (UUID) that is assigned automatically by the system. It cannot be edited to ensure consistency across the application.
              </HelpTextTooltip>
            </div>
          </LabelSaveIndicator>
          <div className="relative">
            <Input
              id="uuid"
              type="text"
              value={general.uuid || ''}
              readOnly
              tabIndex={general.id ? 5 : -1}
              className="bg-gray-50 cursor-not-allowed pr-10 truncate"
              placeholder={general.uuid ? general.uuid : "Auto-generated when activity is created"}
            />
            {general.uuid && (
              <button
                onClick={() => handleCopy(general.uuid, 'UUID')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                title="Copy full UUID"
              >
                <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700" />
              </button>
            )}
          </div>
          {uuidAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {uuidAutosave.state.error.message}</p>}
        </div>
      </div>

      {/* Reporting Organisation */}
      <div className="space-y-2 mb-6">
        <LabelSaveIndicator
          isSaving={false}
          isSaved={!!general.reportingOrgId}
          hasValue={!!general.reportingOrgId}
          className={fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}
        >
          <div className="flex items-center gap-2">
            Reporting Organisation
            <HelpTextTooltip>
              Select the organization that reports this activity. This determines which organization is credited as the reporting organization for IATI compliance.
            </HelpTextTooltip>
            {fieldLockStatus.isLocked && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Lock className="h-3 w-3 ml-2 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{fieldLockStatus.tooltipMessage}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </LabelSaveIndicator>
        <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
          <OrganizationSearchableSelect
            organizations={organizations}
            value={general.reportingOrgId || ''}
            onValueChange={(orgId) => {
              if (!fieldLockStatus.isLocked) {
                setGeneral((g: any) => ({ ...g, reportingOrgId: orgId }));
                setHasUnsavedChanges(true);
                if (general.id && orgId) {
                  saveReportingOrg(orgId);
                }
              }
            }}
            placeholder="Select reporting organisation..."
            searchPlaceholder="Search organisations..."
            disabled={fieldLockStatus.isLocked}
          />
        </div>
        {general.created_by_org_name && (
          <p className="text-xs text-gray-500 mt-1">
            Current: {general.created_by_org_name}
            {general.created_by_org_acronym && ` (${general.created_by_org_acronym})`}
          </p>
        )}
      </div>

      {/* Description with field-level autosave */}
      <div className="space-y-2">
        <LabelSaveIndicator
          isSaving={descriptionAutosave.state.isSaving}
          isSaved={descriptionAutosave.state.isPersistentlySaved}
          hasValue={!!general.description && general.description.replace(/<[^>]*>/g, '').trim() !== ''}
          className={fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}
        >
                      <div className="flex items-center gap-2">
              Activity Description - General
              <HelpTextTooltip>
                A clear summary of the activity's goals, scope, target population, and expected results. Descriptions should use plain language and provide enough context for others to understand the purpose and intent of the activity.
              </HelpTextTooltip>
            {fieldLockStatus.isLocked && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Lock className="h-3 w-3 ml-2 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{fieldLockStatus.tooltipMessage}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </LabelSaveIndicator>
        <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
          <Textarea
            value={general.description || ''}
            onChange={(e) => {
              if (!fieldLockStatus.isLocked) {
                console.log('[GeneralSection] Description onChange triggered with content:', e.target.value);
                // Mark that the user has actually edited the description
                hasUserEditedDescriptionRef.current = true;
                setGeneral((g: any) => ({ ...g, description: e.target.value }));
                descriptionAutosave.triggerFieldSave(e.target.value);
              }
            }}
            placeholder="Describe your activity's objectives, scope, and expected outcomes..."
            rows={6}
            disabled={fieldLockStatus.isLocked}
            className="resize-y"
          />
        </div>
        {descriptionAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {descriptionAutosave.state.error.message}</p>}
      </div>

      {/* Additional Description Fields */}
      <div className="space-y-4">
        {/* Objectives Description - Always shown, collapsible */}
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisibleDescriptionFields(prev => ({ ...prev, objectives: !prev.objectives }))}
              className={`flex items-center gap-2 text-left hover:text-gray-900 focus:outline-none ${fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}`}
            >
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${visibleDescriptionFields.objectives ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <LabelSaveIndicator
              isSaving={descriptionObjectivesAutosave.state.isSaving}
              isSaved={descriptionObjectivesAutosave.state.isPersistentlySaved}
              hasValue={!!general.descriptionObjectives?.trim()}
              isFocused={isObjectivesFocused}
              className={`text-sm font-medium ${fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}`}
            >
              <div className="flex items-center gap-2">
                Activity Description - Objectives
                <HelpTextTooltip>
                  Describe the specific objectives that this activity aims to achieve. This should outline what the activity intends to accomplish and the changes it seeks to bring about.
                </HelpTextTooltip>
                {fieldLockStatus.isLocked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 ml-2 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{fieldLockStatus.tooltipMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </LabelSaveIndicator>
          </div>
          {visibleDescriptionFields.objectives && (
            <div className="mt-2">
              <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
                <Textarea
                  value={general.descriptionObjectives || ''}
                  onChange={(e) => {
                    if (!fieldLockStatus.isLocked) {
                      setGeneral((g: any) => ({ ...g, descriptionObjectives: e.target.value }));
                      setHasUnsavedChanges(true);
                    }
                  }}
                  onFocus={() => setIsObjectivesFocused(true)}
                  onBlur={(e) => {
                    setIsObjectivesFocused(false);
                    if (!fieldLockStatus.isLocked && e.target.value.trim()) {
                      descriptionObjectivesAutosave.triggerFieldSave(e.target.value);
                    }
                  }}
                  placeholder="Describe the specific objectives of this activity..."
                  rows={6}
                  disabled={fieldLockStatus.isLocked}
                  className="resize-y"
                />
              </div>
              {descriptionObjectivesAutosave.state.error && <p className="text-xs text-red-600 mt-2">Failed to save: {descriptionObjectivesAutosave.state.error.message}</p>}
            </div>
          )}
        </div>

        {/* Target Groups Description - Always shown, collapsible */}
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisibleDescriptionFields(prev => ({ ...prev, targetGroups: !prev.targetGroups }))}
              className={`flex items-center gap-2 text-left hover:text-gray-900 focus:outline-none ${fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}`}
            >
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${visibleDescriptionFields.targetGroups ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <LabelSaveIndicator
              isSaving={descriptionTargetGroupsAutosave.state.isSaving}
              isSaved={descriptionTargetGroupsAutosave.state.isPersistentlySaved}
              hasValue={!!general.descriptionTargetGroups?.trim()}
              isFocused={isTargetGroupsFocused}
              className={`text-sm font-medium ${fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}`}
            >
              <div className="flex items-center gap-2">
                Activity Description - Target Groups
                <HelpTextTooltip>
                  Identify and describe the target groups that will benefit from this activity. Include information about demographics, locations, and any specific characteristics of the intended beneficiaries.
                </HelpTextTooltip>
                {fieldLockStatus.isLocked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 ml-2 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{fieldLockStatus.tooltipMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </LabelSaveIndicator>
          </div>
          {visibleDescriptionFields.targetGroups && (
            <div className="mt-2">
              <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
                <Textarea
                  value={general.descriptionTargetGroups || ''}
                  onChange={(e) => {
                    if (!fieldLockStatus.isLocked) {
                      setGeneral((g: any) => ({ ...g, descriptionTargetGroups: e.target.value }));
                      setHasUnsavedChanges(true);
                    }
                  }}
                  onFocus={() => setIsTargetGroupsFocused(true)}
                  onBlur={(e) => {
                    setIsTargetGroupsFocused(false);
                    if (!fieldLockStatus.isLocked && e.target.value.trim()) {
                      descriptionTargetGroupsAutosave.triggerFieldSave(e.target.value);
                    }
                  }}
                  placeholder="Describe the target groups and beneficiaries of this activity..."
                  rows={6}
                  disabled={fieldLockStatus.isLocked}
                  className="resize-y"
                />
              </div>
              {descriptionTargetGroupsAutosave.state.error && <p className="text-xs text-red-600 mt-2">Failed to save: {descriptionTargetGroupsAutosave.state.error.message}</p>}
            </div>
          )}
        </div>

        {/* Other Description - Always shown, collapsible */}
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisibleDescriptionFields(prev => ({ ...prev, other: !prev.other }))}
              className={`flex items-center gap-2 text-left hover:text-gray-900 focus:outline-none ${fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}`}
            >
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${visibleDescriptionFields.other ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <LabelSaveIndicator
              isSaving={descriptionOtherAutosave.state.isSaving}
              isSaved={descriptionOtherAutosave.state.isPersistentlySaved}
              hasValue={!!general.descriptionOther?.trim()}
              isFocused={isOtherFocused}
              className={`text-sm font-medium ${fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}`}
            >
              <div className="flex items-center gap-2">
                Activity Description - Other
                <HelpTextTooltip>
                  Any additional information about the activity that doesn't fit into the general description or other categories. This could include context, background information, or other relevant details.
                </HelpTextTooltip>
                {fieldLockStatus.isLocked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 ml-2 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{fieldLockStatus.tooltipMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </LabelSaveIndicator>
          </div>
          {visibleDescriptionFields.other && (
            <div className="mt-2">
              <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
                <Textarea
                  value={general.descriptionOther || ''}
                  onChange={(e) => {
                    if (!fieldLockStatus.isLocked) {
                      setGeneral((g: any) => ({ ...g, descriptionOther: e.target.value }));
                      setHasUnsavedChanges(true);
                    }
                  }}
                  onFocus={() => setIsOtherFocused(true)}
                  onBlur={(e) => {
                    setIsOtherFocused(false);
                    if (!fieldLockStatus.isLocked && e.target.value.trim()) {
                      descriptionOtherAutosave.triggerFieldSave(e.target.value);
                    }
                  }}
                  placeholder="Add any other relevant information about this activity..."
                  rows={6}
                  disabled={fieldLockStatus.isLocked}
                  className="resize-y"
                />
              </div>
              {descriptionOtherAutosave.state.error && <p className="text-xs text-red-600 mt-2">Failed to save: {descriptionOtherAutosave.state.error.message}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Row 6-7: All Type Selectors */}
      <div className="space-y-6">
        {/* Collaboration Type and Activity Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="w-full space-y-2">
            <LabelSaveIndicator
              isSaving={collaborationTypeAutosave.state.isSaving}
              isSaved={collaborationTypeAutosave.state.isPersistentlySaved}
              hasValue={!!general.collaborationType}
              className={fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}
            >
              <div className="flex items-center gap-2">
                Collaboration Type
                <HelpTextTooltip>
                  Indicates the nature of the funding relationship through which the activity is delivered. This classification helps identify how resources are channelled and which actors are involved in implementation.
                </HelpTextTooltip>
              </div>
              {fieldLockStatus.isLocked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-3 w-3 ml-2 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{fieldLockStatus.tooltipMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </LabelSaveIndicator>
            <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
              <CollaborationTypeSelect
                value={general.collaborationType}
                onValueChange={(value) => {
                  if (!fieldLockStatus.isLocked) {
                    setGeneral((g: any) => ({ ...g, collaborationType: value }));
                    collaborationTypeAutosave.triggerFieldSave(value);
                  }
                }}
                placeholder="Select Collaboration Type"
                disabled={fieldLockStatus.isLocked}
                dropdownId="general-collaboration-type"
              />
            </div>
            {collaborationTypeAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {collaborationTypeAutosave.state.error.message}</p>}
          </div>
          <div className="w-full space-y-2">
            <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
              <ActivityEditorFieldAutosave
                activityId={general.id || ''}
                userId={user?.id || ''}
                activity={{
                  title: general.title || '',
                  activityStatus: general.activityStatus || '',
                }}
                onActivityChange={(field, value) => {
                  if (!fieldLockStatus.isLocked) {
                    setGeneral((g: any) => ({ ...g, [field]: value }));
                  }
                }}
                onActivityCreated={(activityData) => {
                  console.log('[AIMS] New activity created:', activityData);
                  setGeneral((g: any) => ({ ...g, id: activityData.id, uuid: activityData.uuid }));
                  // Clear saved form data since activity is now saved to database
                  clearSavedFormData();
                  toast.success(
                    <div className="flex items-center gap-2">
                      <PartyPopper className="h-4 w-4" />
                      <span>Activity created! All tabs are now unlocked and ready to use.</span>
                    </div>,
                    {
                      duration: 4000,
                      position: 'top-center'
                    }
                  );
                }}
                showOnlyStatus={true}
                dropdownId="general-activity-status"
                additionalData={{
                  banner: general.banner || null,
                  icon: general.icon || null,
                  partnerId: general.otherIdentifier || null,
                  iatiId: general.iatiIdentifier || null
                }}
                fieldLockStatus={fieldLockStatus}
              />
            </div>
          </div>
        </div>

        {/* Activity Scope - new row after collaboration type and status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="w-full space-y-2">
            <LabelSaveIndicator
              isSaving={activityScopeAutosave.state.isSaving}
              isSaved={activityScopeAutosave.state.isPersistentlySaved || !!general.activityScope}
              hasValue={!!general.activityScope}
              className={fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}
            >
              <div className="flex items-center gap-2">
                Activity Scope
                <HelpTextTooltip>
                  Indicates the geographic reach of the activity: global, regional, multi-national, national, sub-national, or single location. This classification helps identify the scale and coverage of the intervention.
                </HelpTextTooltip>
              </div>
              {fieldLockStatus.isLocked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-3 w-3 ml-2 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{fieldLockStatus.tooltipMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </LabelSaveIndicator>
            <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
              <ActivityScopeSearchableSelect
                value={general.activityScope}
                onValueChange={(value) => {
                  if (!fieldLockStatus.isLocked) {
                    setGeneral((g: any) => ({ ...g, activityScope: value }));
                    activityScopeAutosave.triggerFieldSave(value);
                  }
                }}
                placeholder="Select Activity Scope"
                disabled={fieldLockStatus.isLocked}
                dropdownId="general-activity-scope"
              />
            </div>
            {activityScopeAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {activityScopeAutosave.state.error.message}</p>}
          </div>
          
          {/* Hierarchy Level */}
          <div className="w-full space-y-2">
            <LabelSaveIndicator
              isSaving={hierarchyAutosave.state.isSaving}
              isSaved={hierarchyAutosave.state.isPersistentlySaved || general.hierarchy !== undefined}
              hasValue={general.hierarchy !== undefined}
              className={fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}
            >
              <div className="flex items-center gap-2">
                Activity Hierarchy Level
                <HelpTextTooltip>
                  Indicates the organizational level of this activity within a project structure. Level 1 represents top-level programs, while higher numbers represent sub-components. This helps establish parent-child relationships between activities for better project organization and reporting.
                </HelpTextTooltip>
              </div>
              {fieldLockStatus.isLocked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-3 w-3 ml-2 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{fieldLockStatus.tooltipMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </LabelSaveIndicator>
            <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
              <HierarchySelect
                value={general.hierarchy}
                onValueChange={(value) => {
                  if (!fieldLockStatus.isLocked) {
                    setGeneral((g: any) => ({ ...g, hierarchy: value }));
                    hierarchyAutosave.triggerFieldSave(value);
                  }
                }}
                placeholder="Select Hierarchy Level"
                disabled={fieldLockStatus.isLocked}
                dropdownId="general-hierarchy"
              />
            </div>
            {hierarchyAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {hierarchyAutosave.state.error.message}</p>}
          </div>
        </div>
      </div>

      {/* Row 8: Date Fields */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Activity Dates</h3>
          <HelpTextTooltip>
            The Actual Start Date field becomes available once the activity status is set to Implementation or beyond. The Actual End Date field becomes available once the status is set to Completion, Post-completion, or if the activity is marked as Cancelled or Suspended.
          </HelpTextTooltip>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <LabelSaveIndicator
              isSaving={plannedStartDateAutosave.state.isSaving}
              isSaved={plannedStartDateAutosave.state.isPersistentlySaved}
              hasValue={!!general.plannedStartDate}
              className={fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}
            >
              <div className="flex items-center gap-2">
                Planned Start Date
                <HelpTextTooltip>
                  The expected date when the activity is scheduled to begin, based on initial planning or agreements.
                </HelpTextTooltip>
                {fieldLockStatus.isLocked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 ml-2 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{fieldLockStatus.tooltipMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </LabelSaveIndicator>
            <DatePicker
              value={general.plannedStartDate || ''}
              onChange={(value) => {
                if (!fieldLockStatus.isLocked) {
                  setGeneral((g: any) => ({ ...g, plannedStartDate: value }));
                  plannedStartDateAutosave.triggerFieldSave(value);
                }
              }}
              placeholder="Select planned start date"
              disabled={fieldLockStatus.isLocked}
              className={fieldLockStatus.isLocked ? "opacity-50" : ""}
            />
            {plannedStartDateAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {plannedStartDateAutosave.state.error.message}</p>}
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlannedStartDescription(!showPlannedStartDescription)}
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={fieldLockStatus.isLocked}
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showPlannedStartDescription ? 'rotate-180' : ''}`} />
                </button>
                <LabelSaveIndicator
                  isSaving={plannedStartDescriptionAutosave.state.isSaving}
                  isSaved={plannedStartDescriptionAutosave.state.isPersistentlySaved}
                  hasValue={!!general.plannedStartDescription?.trim()}
                  isFocused={isPlannedStartDescriptionFocused}
                  className="text-xs text-gray-600"
                >
                  <button
                    type="button"
                    onClick={() => setShowPlannedStartDescription(!showPlannedStartDescription)}
                    className="hover:text-gray-800 transition-colors"
                    disabled={fieldLockStatus.isLocked}
                  >
                    {general.plannedStartDescription ? 'Edit context' : 'Add context'}
                  </button>
                </LabelSaveIndicator>
              </div>
              {showPlannedStartDescription && (
                <div className="mt-2 space-y-1">
                  <label className="text-xs text-gray-600">Description/Context (optional)</label>
                  <Textarea
                    value={general.plannedStartDescription || ''}
                    onChange={(e) => {
                      if (!fieldLockStatus.isLocked) {
                        setGeneral((g: any) => ({ ...g, plannedStartDescription: e.target.value }));
                        plannedStartDescriptionAutosave.triggerFieldSave(e.target.value);
                      }
                    }}
                    onFocus={() => setIsPlannedStartDescriptionFocused(true)}
                    onBlur={() => setIsPlannedStartDescriptionFocused(false)}
                    placeholder="Add context about this date (e.g., 'Government approval received on this date')"
                    disabled={fieldLockStatus.isLocked}
                    className={`min-h-[60px] text-sm ${fieldLockStatus.isLocked ? "opacity-50" : ""}`}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <LabelSaveIndicator
              isSaving={plannedEndDateAutosave.state.isSaving}
              isSaved={plannedEndDateAutosave.state.isPersistentlySaved}
              hasValue={!!general.plannedEndDate}
              className={fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}
            >
              <div className="flex items-center gap-2">
                Planned End Date
                <HelpTextTooltip>
                  The expected date when the activity is scheduled to be completed, as defined during planning.
                </HelpTextTooltip>
                {fieldLockStatus.isLocked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 ml-2 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{fieldLockStatus.tooltipMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </LabelSaveIndicator>
            <DatePicker
              value={general.plannedEndDate || ''}
              onChange={(value) => {
                if (!fieldLockStatus.isLocked) {
                  setGeneral((g: any) => ({ ...g, plannedEndDate: value }));
                  plannedEndDateAutosave.triggerFieldSave(value);
                }
              }}
              placeholder="Select planned end date"
              disabled={fieldLockStatus.isLocked}
              className={fieldLockStatus.isLocked ? "opacity-50" : ""}
            />
            {plannedEndDateAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {plannedEndDateAutosave.state.error.message}</p>}
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlannedEndDescription(!showPlannedEndDescription)}
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={fieldLockStatus.isLocked}
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showPlannedEndDescription ? 'rotate-180' : ''}`} />
                </button>
                <LabelSaveIndicator
                  isSaving={plannedEndDescriptionAutosave.state.isSaving}
                  isSaved={plannedEndDescriptionAutosave.state.isPersistentlySaved}
                  hasValue={!!general.plannedEndDescription?.trim()}
                  isFocused={isPlannedEndDescriptionFocused}
                  className="text-xs text-gray-600"
                >
                  <button
                    type="button"
                    onClick={() => setShowPlannedEndDescription(!showPlannedEndDescription)}
                    className="hover:text-gray-800 transition-colors"
                    disabled={fieldLockStatus.isLocked}
                  >
                    {general.plannedEndDescription ? 'Edit context' : 'Add context'}
                  </button>
                </LabelSaveIndicator>
              </div>
              {showPlannedEndDescription && (
                <div className="mt-2 space-y-1">
                  <label className="text-xs text-gray-600">Description/Context (optional)</label>
                  <Textarea
                    value={general.plannedEndDescription || ''}
                    onChange={(e) => {
                      if (!fieldLockStatus.isLocked) {
                        setGeneral((g: any) => ({ ...g, plannedEndDescription: e.target.value }));
                        plannedEndDescriptionAutosave.triggerFieldSave(e.target.value);
                      }
                    }}
                    onFocus={() => setIsPlannedEndDescriptionFocused(true)}
                    onBlur={() => setIsPlannedEndDescriptionFocused(false)}
                    placeholder="Add context about this date"
                    disabled={fieldLockStatus.isLocked}
                    className={`min-h-[60px] text-sm ${fieldLockStatus.isLocked ? "opacity-50" : ""}`}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <LabelSaveIndicator
              isSaving={actualStartDateAutosave.state.isSaving}
              isSaved={actualStartDateAutosave.state.isPersistentlySaved}
              hasValue={!!general.actualStartDate}
              className={fieldLockStatus.isLocked || !getDateFieldStatus().actualStartDate ? 'text-gray-400' : 'text-gray-700'}
            >
              <div className="flex items-center gap-2">
                Actual Start Date
                <HelpTextTooltip>
                  The date when implementation of the activity actually began.
                </HelpTextTooltip>
                {fieldLockStatus.isLocked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 ml-2 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{fieldLockStatus.tooltipMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </LabelSaveIndicator>
            <DatePicker
              value={general.actualStartDate || ''}
              onChange={(value) => {
                if (!fieldLockStatus.isLocked && getDateFieldStatus().actualStartDate) {
                  setGeneral((g: any) => ({ ...g, actualStartDate: value }));
                  actualStartDateAutosave.triggerFieldSave(value);
                }
              }}
              placeholder="Select actual start date"
              disabled={fieldLockStatus.isLocked || !getDateFieldStatus().actualStartDate}
              className={(fieldLockStatus.isLocked || !getDateFieldStatus().actualStartDate) ? "opacity-50" : ""}
            />
            {actualStartDateAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {actualStartDateAutosave.state.error.message}</p>}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowActualStartDescription(!showActualStartDescription)}
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                disabled={fieldLockStatus.isLocked || !getDateFieldStatus().actualStartDate}
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showActualStartDescription ? 'rotate-180' : ''}`} />
                <span>{general.actualStartDescription ? 'Edit context' : 'Add context'}</span>
              </button>
              {showActualStartDescription && (
                <div className="mt-2 space-y-1">
                  <label className="text-xs text-gray-600">Description/Context (optional)</label>
                  <Textarea
                    value={general.actualStartDescription || ''}
                    onChange={(e) => {
                      if (!fieldLockStatus.isLocked && getDateFieldStatus().actualStartDate) {
                        setGeneral((g: any) => ({ ...g, actualStartDescription: e.target.value }));
                        actualStartDescriptionAutosave.triggerFieldSave(e.target.value);
                      }
                    }}
                    placeholder="Add context about this date"
                    disabled={fieldLockStatus.isLocked || !getDateFieldStatus().actualStartDate}
                    className={`min-h-[60px] text-sm ${(fieldLockStatus.isLocked || !getDateFieldStatus().actualStartDate) ? "opacity-50" : ""}`}
                  />
                  {actualStartDescriptionAutosave.state.isSaving && <p className="text-xs text-gray-500 mt-1">Saving...</p>}
                  {actualStartDescriptionAutosave.state.isPersistentlySaved && <p className="text-xs text-green-600 mt-1">✓ Saved</p>}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <LabelSaveIndicator
              isSaving={actualEndDateAutosave.state.isSaving}
              isSaved={actualEndDateAutosave.state.isPersistentlySaved}
              hasValue={!!general.actualEndDate}
              className={fieldLockStatus.isLocked || !getDateFieldStatus().actualEndDate ? 'text-gray-400' : 'text-gray-700'}
            >
              <div className="flex items-center gap-2">
                Actual End Date
                <HelpTextTooltip>
                  The date when implementation of the activity was actually completed.
                </HelpTextTooltip>
                {fieldLockStatus.isLocked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 ml-2 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{fieldLockStatus.tooltipMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </LabelSaveIndicator>
            <DatePicker
              value={general.actualEndDate || ''}
              onChange={(value) => {
                if (!fieldLockStatus.isLocked && getDateFieldStatus().actualEndDate) {
                  setGeneral((g: any) => ({ ...g, actualEndDate: value }));
                  actualEndDateAutosave.triggerFieldSave(value);
                }
              }}
              placeholder="Select actual end date"
              disabled={fieldLockStatus.isLocked || !getDateFieldStatus().actualEndDate}
              className={(fieldLockStatus.isLocked || !getDateFieldStatus().actualEndDate) ? "opacity-50" : ""}
            />
            {actualEndDateAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {actualEndDateAutosave.state.error.message}</p>}
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowActualEndDescription(!showActualEndDescription)}
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={fieldLockStatus.isLocked || !getDateFieldStatus().actualEndDate}
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showActualEndDescription ? 'rotate-180' : ''}`} />
                </button>
                <LabelSaveIndicator
                  isSaving={actualEndDescriptionAutosave.state.isSaving}
                  isSaved={actualEndDescriptionAutosave.state.isPersistentlySaved}
                  hasValue={!!general.actualEndDescription?.trim()}
                  isFocused={isActualEndDescriptionFocused}
                  className="text-xs text-gray-600"
                >
                  <button
                    type="button"
                    onClick={() => setShowActualEndDescription(!showActualEndDescription)}
                    className="hover:text-gray-800 transition-colors"
                    disabled={fieldLockStatus.isLocked || !getDateFieldStatus().actualEndDate}
                  >
                    {general.actualEndDescription ? 'Edit context' : 'Add context'}
                  </button>
                </LabelSaveIndicator>
              </div>
              {showActualEndDescription && (
                <div className="mt-2 space-y-1">
                  <label className="text-xs text-gray-600">Description/Context (optional)</label>
                  <Textarea
                    value={general.actualEndDescription || ''}
                    onChange={(e) => {
                      if (!fieldLockStatus.isLocked && getDateFieldStatus().actualEndDate) {
                        setGeneral((g: any) => ({ ...g, actualEndDescription: e.target.value }));
                        actualEndDescriptionAutosave.triggerFieldSave(e.target.value);
                      }
                    }}
                    onFocus={() => setIsActualEndDescriptionFocused(true)}
                    onBlur={() => setIsActualEndDescriptionFocused(false)}
                    placeholder="Add context about this date"
                    disabled={fieldLockStatus.isLocked || !getDateFieldStatus().actualEndDate}
                    className={`min-h-[60px] text-sm ${(fieldLockStatus.isLocked || !getDateFieldStatus().actualEndDate) ? "opacity-50" : ""}`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Other Activity Dates Section */}
        <div className="space-y-4 mt-6">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Other Activity Dates</h3>
            <HelpTextTooltip>
              Additional custom dates for this activity, such as government approval dates or milestone dates.
            </HelpTextTooltip>
          </div>

          {/* Custom Activity Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {(general.customDates || []).map((customDate: any, index: number) => {
          // Check if user has clicked "Save Date Type" button (or loaded from database with label)
          const isSaved = savedCustomDates[index] === true;

          return (
            <div key={index}>
              {!isSaved ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <LabelSaveIndicator
                      isSaving={savingCustomDateIndex === index}
                      isSaved={false}
                      hasValue={!!customDate.label?.trim()}
                      isFocused={customDateFocusStates[`${index}-label`] || false}
                      className="text-sm font-medium text-gray-700"
                    >
                      Date Type/Label
                    </LabelSaveIndicator>
                    <button
                      type="button"
                      onClick={() => {
                        const updatedDates = (general.customDates || []).filter((_: any, i: number) => i !== index);
                        setGeneral((g: any) => ({ ...g, customDates: updatedDates }));
                        customDatesAutosave.triggerFieldSave(updatedDates);
                        // Remove from saved state
                        setSavedCustomDates(prev => {
                          const newState = { ...prev };
                          delete newState[index];
                          return newState;
                        });
                      }}
                      className="text-red-600 hover:text-red-700 transition-colors"
                      disabled={fieldLockStatus.isLocked}
                      title="Remove this date"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <Input
                    type="text"
                    value={customDate.label || ''}
                    onChange={(e) => {
                      if (!fieldLockStatus.isLocked) {
                        const updatedDates = [...(general.customDates || [])];
                        updatedDates[index] = { ...updatedDates[index], label: e.target.value };
                        setGeneral((g: any) => ({ ...g, customDates: updatedDates }));
                      }
                    }}
                    autoFocus={newCustomDateIndex === index}
                    onFocus={() => {
                      setCustomDateFocusStates(prev => ({ ...prev, [`${index}-label`]: true }));
                      if (newCustomDateIndex === index) {
                        setNewCustomDateIndex(null); // Clear after focusing
                      }
                    }}
                    onBlur={() => {
                      setCustomDateFocusStates(prev => ({ ...prev, [`${index}-label`]: false }));
                      if (!fieldLockStatus.isLocked) {
                        if (customDate.label?.trim()) {
                          // Mark as saved to show the date picker
                          setSavedCustomDates(prev => ({ ...prev, [index]: true }));
                        } else {
                          // No label entered, silently remove the empty entry
                          const updatedDates = (general.customDates || []).filter((_: any, i: number) => i !== index);
                          setGeneral((g: any) => ({ ...g, customDates: updatedDates }));
                          setSavedCustomDates(prev => {
                            const newState = { ...prev };
                            delete newState[index];
                            return newState;
                          });
                        }
                      }
                    }}
                    placeholder="e.g., Government Approval Date"
                    disabled={fieldLockStatus.isLocked}
                    className={fieldLockStatus.isLocked ? "opacity-50" : ""}
                  />
                </div>
              ) : (
                <div
                  className="space-y-3"
                  tabIndex={-1}
                  onBlur={(e) => {
                    // Check if focus is moving outside this container
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      // Use timeout to allow date selection to complete
                      setTimeout(() => {
                        setGeneral((g: any) => {
                          const currentDate = g.customDates?.[index];
                          if (!fieldLockStatus.isLocked && currentDate?.label?.trim() && !currentDate?.date) {
                            // Label exists but no date selected, silently remove the entry
                            const updatedDates = (g.customDates || []).filter((_: any, i: number) => i !== index);
                            setSavedCustomDates(prev => {
                              const newState = { ...prev };
                              delete newState[index];
                              return newState;
                            });
                            return { ...g, customDates: updatedDates };
                          }
                          return g; // No change
                        });
                      }, 300);
                    }
                  }}
                >
                    {/* Label with delete button */}
                    <div className="flex items-center justify-between">
                      <LabelSaveIndicator
                        isSaving={savingCustomDateIndex === index}
                        isSaved={customDatesAutosave.state.isPersistentlySaved}
                        hasValue={!!customDate.label?.trim()}
                        isFocused={customDateFocusStates[`${index}-label`] || false}
                        className="text-gray-700"
                      >
                        {customDate.label}
                      </LabelSaveIndicator>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedDates = (general.customDates || []).filter((_: any, i: number) => i !== index);
                          setGeneral((g: any) => ({ ...g, customDates: updatedDates }));
                          customDatesAutosave.triggerFieldSave(updatedDates);
                          // Remove from saved state
                          setSavedCustomDates(prev => {
                            const newState = { ...prev };
                            delete newState[index];
                            return newState;
                          });
                        }}
                        className="text-red-600 hover:text-red-700 transition-colors"
                        disabled={fieldLockStatus.isLocked}
                        title="Remove this date"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Date Input */}
                    <div>
                      <DatePicker
                        value={customDate.date || ''}
                        onChange={(value) => {
                          if (!fieldLockStatus.isLocked) {
                            const updatedDates = [...(general.customDates || [])];
                            updatedDates[index] = { ...updatedDates[index], date: value };
                            setGeneral((g: any) => ({ ...g, customDates: updatedDates }));
                            setSavingCustomDateIndex(index);
                            customDatesAutosave.triggerFieldSave(updatedDates);
                          }
                        }}
                        placeholder="Select date"
                        disabled={fieldLockStatus.isLocked}
                        className={fieldLockStatus.isLocked ? "opacity-50" : ""}
                      />
                    </div>

                    {/* Collapsible Add Context Button */}
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomDateDescriptions(prev => ({
                              ...prev,
                              [index]: !prev[index]
                            }));
                          }}
                          className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                          disabled={fieldLockStatus.isLocked}
                        >
                          <ChevronDown className={`h-3 w-3 transition-transform ${showCustomDateDescriptions[index] ? 'rotate-180' : ''}`} />
                        </button>
                        <LabelSaveIndicator
                          isSaving={savingCustomDateIndex === index}
                          isSaved={customDatesAutosave.state.isPersistentlySaved}
                          hasValue={!!customDate.description?.trim()}
                          isFocused={customDateFocusStates[`${index}-description`] || false}
                          className="text-xs text-gray-600"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomDateDescriptions(prev => ({
                                ...prev,
                                [index]: !prev[index]
                              }));
                            }}
                            className="hover:text-gray-800 transition-colors"
                            disabled={fieldLockStatus.isLocked}
                          >
                            {customDate.description ? 'Edit context' : 'Add context'}
                          </button>
                        </LabelSaveIndicator>
                      </div>
                      {showCustomDateDescriptions[index] && (
                        <div className="mt-2 space-y-1">
                          <label className="text-xs text-gray-600">Description/Context</label>
                          <Textarea
                            value={customDate.description || ''}
                            onChange={(e) => {
                              if (!fieldLockStatus.isLocked) {
                                const updatedDates = [...(general.customDates || [])];
                                updatedDates[index] = { ...updatedDates[index], description: e.target.value };
                                setGeneral((g: any) => ({ ...g, customDates: updatedDates }));
                                setSavingCustomDateIndex(index);
                                customDatesAutosave.triggerFieldSave(updatedDates);
                              }
                            }}
                            onFocus={() => setCustomDateFocusStates(prev => ({ ...prev, [`${index}-description`]: true }))}
                            onBlur={() => setCustomDateFocusStates(prev => ({ ...prev, [`${index}-description`]: false }))}
                            placeholder="Add context about this date"
                            disabled={fieldLockStatus.isLocked}
                            className={`min-h-[60px] text-sm ${fieldLockStatus.isLocked ? "opacity-50" : ""}`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
              )}
            </div>
          );
        })}
          </div>

          {/* Add Another Activity Date Button */}
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const currentDates = general.customDates || [];
                const newIndex = currentDates.length;
                const newDates = [...currentDates, {
                  label: '',
                  date: '',
                  description: ''
                }];
                setGeneral((g: any) => ({ ...g, customDates: newDates }));
                setNewCustomDateIndex(newIndex); // Track for auto-focus
                // Don't save yet - wait until label and date are filled
              }}
              className="gap-2"
              disabled={fieldLockStatus.isLocked}
            >
              <Plus className="w-4 h-4" />
              Add another Activity Date
            </Button>
          </div>
        </div>
      </div>

      {/* Row 9: Other Identifier Types */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Other Identifier Types</h3>
          <HelpTextTooltip>
            Additional identifiers for this activity, such as internal organization identifiers or previous activity identifiers.
          </HelpTextTooltip>
        </div>
        
        {/* Existing Identifiers */}
        {(general.otherIdentifiers || []).map((identifier: any, index: number) => (
          <div key={index} className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Other Identifier {index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const updatedIdentifiers = (general.otherIdentifiers || []).filter((_: any, i: number) => i !== index);
                  setGeneral((g: any) => ({ ...g, otherIdentifiers: updatedIdentifiers }));
                  otherIdentifiersAutosave.triggerFieldSave(updatedIdentifiers);
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Identifier Code */}
              <div className="space-y-2">
                <LabelSaveIndicator
                  isSaving={otherIdentifiersAutosave.state.isSaving}
                  isSaved={otherIdentifiersAutosave.state.isPersistentlySaved}
                  hasValue={!!identifier.code?.trim()}
                  isFocused={otherIdentifiersFocusStates[`${index}-code`] || false}
                  className="text-gray-700"
                >
                  Identifier Code
                </LabelSaveIndicator>
                <Input
                  type="text"
                  value={identifier.code || ''}
                  onChange={(e) => {
                    const updatedIdentifiers = [...(general.otherIdentifiers || [])];
                    updatedIdentifiers[index] = { ...updatedIdentifiers[index], code: e.target.value };
                    setGeneral((g: any) => ({ ...g, otherIdentifiers: updatedIdentifiers }));
                    otherIdentifiersAutosave.triggerFieldSave(updatedIdentifiers);
                  }}
                  onFocus={() => setOtherIdentifiersFocusStates(prev => ({ ...prev, [`${index}-code`]: true }))}
                  onBlur={() => setOtherIdentifiersFocusStates(prev => ({ ...prev, [`${index}-code`]: false }))}
                  placeholder="e.g., 2023000168"
                />
              </div>

              {/* Identifier Type */}
              <div className="space-y-2">
                <LabelSaveIndicator
                  isSaving={otherIdentifiersAutosave.state.isSaving}
                  isSaved={otherIdentifiersAutosave.state.isPersistentlySaved}
                  hasValue={!!identifier.type?.trim()}
                  isFocused={otherIdentifiersFocusStates[`${index}-type`] || false}
                  className="text-gray-700"
                >
                  Identifier Type
                </LabelSaveIndicator>
                <OtherIdentifierTypeSelect
                  value={identifier.type || ''}
                  onValueChange={(value) => {
                    const updatedIdentifiers = [...(general.otherIdentifiers || [])];
                    updatedIdentifiers[index] = { ...updatedIdentifiers[index], type: value };
                    setGeneral((g: any) => ({ ...g, otherIdentifiers: updatedIdentifiers }));
                    otherIdentifiersAutosave.triggerFieldSave(updatedIdentifiers);
                  }}
                  placeholder="Select identifier type..."
                />
              </div>

              {/* Owner Organisation Name */}
              <div className="space-y-2">
                <LabelSaveIndicator
                  isSaving={otherIdentifiersAutosave.state.isSaving}
                  isSaved={otherIdentifiersAutosave.state.isPersistentlySaved}
                  hasValue={!!identifier.ownerOrg?.narrative?.trim()}
                  isFocused={otherIdentifiersFocusStates[`${index}-ownerOrg-narrative`] || false}
                  className="text-gray-700"
                >
                  Owner Organisation Name
                </LabelSaveIndicator>
                <Input
                  type="text"
                  value={identifier.ownerOrg?.narrative || ''}
                  onChange={(e) => {
                    const updatedIdentifiers = [...(general.otherIdentifiers || [])];
                    updatedIdentifiers[index] = {
                      ...updatedIdentifiers[index],
                      ownerOrg: { ...updatedIdentifiers[index].ownerOrg, narrative: e.target.value }
                    };
                    setGeneral((g: any) => ({ ...g, otherIdentifiers: updatedIdentifiers }));
                    otherIdentifiersAutosave.triggerFieldSave(updatedIdentifiers);
                  }}
                  onFocus={() => setOtherIdentifiersFocusStates(prev => ({ ...prev, [`${index}-ownerOrg-narrative`]: true }))}
                  onBlur={() => setOtherIdentifiersFocusStates(prev => ({ ...prev, [`${index}-ownerOrg-narrative`]: false }))}
                  placeholder="e.g., OECD/DAC"
                />
              </div>

              {/* Owner Organisation Ref (Optional) */}
              <div className="space-y-2">
                <LabelSaveIndicator
                  isSaving={otherIdentifiersAutosave.state.isSaving}
                  isSaved={otherIdentifiersAutosave.state.isPersistentlySaved}
                  hasValue={!!identifier.ownerOrg?.ref?.trim()}
                  isFocused={otherIdentifiersFocusStates[`${index}-ownerOrg-ref`] || false}
                  className="text-gray-700"
                >
                  Owner Organisation Ref <span className="text-gray-400">(Optional)</span>
                </LabelSaveIndicator>
                <Input
                  type="text"
                  value={identifier.ownerOrg?.ref || ''}
                  onChange={(e) => {
                    const updatedIdentifiers = [...(general.otherIdentifiers || [])];
                    updatedIdentifiers[index] = {
                      ...updatedIdentifiers[index],
                      ownerOrg: {
                        ...updatedIdentifiers[index].ownerOrg,
                        ref: e.target.value
                      }
                    };
                    setGeneral((g: any) => ({ ...g, otherIdentifiers: updatedIdentifiers }));
                    otherIdentifiersAutosave.triggerFieldSave(updatedIdentifiers);
                  }}
                  onFocus={() => setOtherIdentifiersFocusStates(prev => ({ ...prev, [`${index}-ownerOrg-ref`]: true }))}
                  onBlur={() => setOtherIdentifiersFocusStates(prev => ({ ...prev, [`${index}-ownerOrg-ref`]: false }))}
                  placeholder="e.g., XM-DAC-5-1"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add Identifier Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const newIdentifiers = [...(general.otherIdentifiers || []), {
              code: '',
              type: '',
              ownerOrg: {
                narrative: '',
                ref: ''
              }
            }];
            setGeneral((g: any) => ({ ...g, otherIdentifiers: newIdentifiers }));
            otherIdentifiersAutosave.triggerFieldSave(newIdentifiers);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Other Identifier
        </Button>
      </div>
    </div>
  );
}

function SectionContent({ section, general, setGeneral, sectors, setSectors, transactions, setTransactions, refreshTransactions, transactionId, extendingPartners, setExtendingPartners, implementingPartners, setImplementingPartners, governmentPartners, setGovernmentPartners, fundingPartners, setFundingPartners, contacts, setContacts, updateContacts, governmentInputs, setGovernmentInputs, sdgMappings, setSdgMappings, tags, setTags, workingGroups, setWorkingGroups, policyMarkers, setPolicyMarkers, specificLocations, setSpecificLocations, coverageAreas, setCoverageAreas, countries, setCountries, regions, setRegions, advancedLocations, setAdvancedLocations, permissions, setSectorValidation, setSectorsCompletionStatusWithLogging, activityScope, setActivityScope, user, getDateFieldStatus, setHasUnsavedChanges, updateActivityNestedField, setShowActivityCreatedAlert, onTitleAutosaveState, tabCompletionStatus, budgets, setBudgets, budgetNotProvided, setBudgetNotProvided, plannedDisbursements, setPlannedDisbursements, handlePlannedDisbursementsChange, handleResultsChange, documents, setDocuments, documentsAutosave, setIatiSyncState, subnationalBreakdowns, setSubnationalBreakdowns, onSectionChange, getNextSection, getPreviousSection, setParticipatingOrgsCount, setLinkedActivitiesCount, setResultsCount, setCapitalSpendPercentage, setConditionsCount, setFinancingTermsCount, setCountryBudgetItemsCount, setForwardSpendCount, clearSavedFormData, loadedTabs, setHumanitarian, setHumanitarianScopes, setFocalPointsCount, onGeographyLevelChange, onSectorExportLevelChange, isNewActivity }: any) {

  // Calculate total budget in USD for country budget mappings
  const totalBudgetUSD = useMemo(() => {
    if (!budgets || budgets.length === 0) return 0;
    return budgets.reduce((sum: number, b: any) => {
      if (b.usd_value != null && b.usd_value > 0) {
        return sum + parseFloat(b.usd_value);
      }
      return sum;
    }, 0);
  }, [budgets]);

  // OPTIMIZATION: Lazy loading - only render heavy components after tab has been visited
  // Removed the duplicate skeleton rendering logic here since the parent component
  // already shows skeleton when tabLoading is true. This was causing the finances tab
  // to get stuck in skeleton loading state.
  
  // const isTabLoaded = loadedTabs.has(section);
  // const heavyTabs = ['finances', 'budgets', 'planned-disbursements', 'results', 'documents', 'metadata', 'xml-import', 'iati'];
  
  // The parent component handles skeleton display via tabLoading state

  switch (section) {
    case "metadata":
      return <MetadataTab activityId={general.id} />;
    case "general":
      return <GeneralSection
        general={general}
        setGeneral={setGeneral}
        user={user}
        getDateFieldStatus={getDateFieldStatus}
        setHasUnsavedChanges={setHasUnsavedChanges}
        updateActivityNestedField={updateActivityNestedField}
        setShowActivityCreatedAlert={setShowActivityCreatedAlert}
        onTitleAutosaveState={onTitleAutosaveState}
        clearSavedFormData={clearSavedFormData}
        isNewActivity={isNewActivity}
      />;
    case "iati":
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <IatiLinkTab 
            activityId={general.id || ''}
            iatiIdentifier={general.iatiIdentifier}
          />
        </div>
      );
    case "xml-import":
      console.log('🔥 ACTIVITY EDITOR: Rendering IATI Import section for activityId:', general.id);
      return (
        <div className="bg-white rounded-lg p-8">
          <IatiImportTab
            activityId={general.id || ''}
            onNavigateToGeneral={async () => {
              // Reload to refresh the data, then navigate to general tab
              window.location.href = window.location.pathname + '?section=general';
            }}
          />
        </div>
      );
    case "sectors":
      return (
        <div className="w-full">
          <ImprovedSectorAllocationForm
              allocations={sectors}
              onChange={(newSectors) => {
                console.log('🎯 [AIMS] === SECTORS CHANGED IN FORM ===');
                console.log('📊 [AIMS] New sectors:', JSON.stringify(newSectors, null, 2));
                console.log('📈 [AIMS] Sector count:', newSectors.length);
                setSectors(newSectors);
              }}
              onValidationChange={setSectorValidation}
              onCompletionStatusChange={setSectorsCompletionStatusWithLogging}
              activityId={general.id}
              sectorExportLevel={general.sectorExportLevel || 'activity'}
              onSectorExportLevelChange={onSectorExportLevelChange}
            />
        </div>
      );
    case "humanitarian":
      return (
        <HumanitarianTab 
          activityId={general.id || ''}
          readOnly={!permissions?.canEditActivity}
          onDataChange={(data) => {
            setHumanitarian(data.humanitarian);
            setHumanitarianScopes(data.humanitarianScopes);
          }}
        />
      );
    case "organisations":
      return <OrganisationsSection
        activityId={general.id}
        extendingPartners={extendingPartners}
        implementingPartners={implementingPartners}
        governmentPartners={governmentPartners}
        fundingPartners={fundingPartners}
        onParticipatingOrganizationsChange={setParticipatingOrgsCount}
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
            case 'fundingPartners':
              setFundingPartners(value);
              break;
          }
        }}
      />;
    case "locations":
      return <CombinedLocationsTab 
        specificLocations={specificLocations}
        coverageAreas={coverageAreas}
        onSpecificLocationsChange={setSpecificLocations}
        onCoverageAreasChange={setCoverageAreas}
        advancedLocations={advancedLocations}
        onAdvancedLocationsChange={setAdvancedLocations}
        countries={countries}
        regions={regions}
        onCountriesChange={setCountries}
        onRegionsChange={setRegions}
        activityId={general.id}
        canEdit={permissions?.canEditActivity ?? true}
        onSubnationalDataChange={setSubnationalBreakdowns}
        subnationalBreakdowns={subnationalBreakdowns}
        activityTitle={general.title}
        activitySector={general.primarySector}
        geographyLevel={general.geographyLevel || 'activity'}
        onGeographyLevelChange={onGeographyLevelChange}
      />;
    case "finances":
      return <EnhancedFinancesSection 
        activityId={general.id || "new"}
        general={general}
        transactions={transactions}
        onTransactionsChange={setTransactions}
        onRefreshNeeded={refreshTransactions}
        initialTransactionId={transactionId}
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
          // Log the general state after update
          setTimeout(() => {
            console.log('[AIMS DEBUG] General state after update:', general);
            console.log('[AIMS DEBUG] Specific field value:', general[field]);
          }, 100);
        }}
        disabled={false}
        geographyLevel={general.geographyLevel || 'activity'}
        activitySectors={sectors}
      />;
    case "budgets":
      return <ActivityBudgetsTab 
        activityId={general.id}
        startDate={general.plannedStartDate || general.actualStartDate || ""}
        endDate={general.plannedEndDate || general.actualEndDate || ""}
        defaultCurrency={general.defaultCurrency || "USD"}
        onBudgetsChange={setBudgets}
      />;
    case "planned-disbursements":
      return <PlannedDisbursementsTab 
        activityId={general.id}
        startDate={general.plannedStartDate || general.actualStartDate || ""}
        endDate={general.plannedEndDate || general.actualEndDate || ""}
        defaultCurrency={general.defaultCurrency || "USD"}
        readOnly={!permissions?.canEditActivity}
        onDisbursementsChange={handlePlannedDisbursementsChange}
      />;
    case "forward-spending-survey":
      return <ForwardSpendingSurveyTab 
        activityId={general.id}
        readOnly={!permissions?.canEditActivity}
        onFssChange={setForwardSpendCount}
      />;
    case "results":
      return <ResultsTab 
        activityId={general.id} 
        readOnly={!permissions?.canEditActivity}
        onResultsChange={handleResultsChange}
        defaultLanguage="en"
      />;
    case "capital-spend":
      return <CapitalSpendTab 
        activityId={general.id} 
        readOnly={!permissions?.canEditActivity}
        onCapitalSpendChange={(percentage) => {
          setCapitalSpendPercentage(percentage);
        }}
      />;
    case "financing-terms":
      return <FinancingTermsTab 
        activityId={general.id} 
        readOnly={!permissions?.canEditActivity}
        onFinancingTermsChange={(hasData) => {
          setFinancingTermsCount(hasData ? 1 : 0);
        }}
      />;
    case "conditions":
      return <ConditionsTab 
        activityId={general.id} 
        readOnly={!permissions?.canEditActivity}
        defaultLanguage="en"
        onConditionsChange={(conditions) => {
          setConditionsCount(conditions.length);
        }}
      />;
    case "contacts":
      return <ContactsTab 
        activityId={general.id}
        readOnly={!permissions?.canEditActivity}
        onContactsChange={setContacts}
      />;
    case "focal_points":
      return <FocalPointsTab 
        activityId={general.id}
        onFocalPointsChange={(focalPoints) => setFocalPointsCount(focalPoints.length)}
      />;
    case "government":
      return <GovernmentInputsSectionEnhanced 
        governmentInputs={governmentInputs} 
        onChange={setGovernmentInputs} 
      />;
    case "government_endorsement":
      return <GovernmentEndorsementTab 
        activityId={general.id}
        readOnly={!permissions?.canEditActivity}
      />;
    case "documents":
      return <DocumentsAndImagesTabInline
        documents={documents}
        onChange={(newDocuments) => {
          setDocuments(newDocuments);
          documentsAutosave.saveNow(newDocuments);
        }}
        activityId={general.id}
        locale="en"
      />;
    case "aid_effectiveness":
      return <AidEffectivenessForm general={general} onUpdate={setGeneral} />;
    case "sdg":
      return <SDGAlignmentSection sdgMappings={sdgMappings} onUpdate={setSdgMappings} activityId={general.id} />;
    case "tags":
      return <TagsSection activityId={general.id} tags={tags} onChange={setTags} />;
    case "working_groups":
      return <WorkingGroupsSection activityId={general.id} workingGroups={workingGroups} onChange={setWorkingGroups} setHasUnsavedChanges={setHasUnsavedChanges} />;
    case "policy_markers":
      return <PolicyMarkersSectionIATIWithCustom activityId={general.id} policyMarkers={policyMarkers} onChange={setPolicyMarkers} setHasUnsavedChanges={setHasUnsavedChanges} />;
    case "country-budget":
      return <BudgetMappingTab
        activityId={general.id}
        userId={user?.id}
        budgetStatus={general.budgetStatus}
        onBudgetPercentage={general.onBudgetPercentage}
        budgetStatusNotes={general.budgetStatusNotes}
        onActivityChange={(field, value) => {
          setGeneral((g: any) => ({ ...g, [field]: value }));
        }}
        onDataChange={setCountryBudgetItemsCount}
        totalBudgetUSD={totalBudgetUSD}
      />;
    case "linked_activities":
      return <LinkedActivitiesEditorTab 
        activityId={general.id} 
        currentUserId={user?.id}
        canEdit={permissions?.canEditActivity ?? true}
        onCountChange={(count: number) => {
          // Mirror other tabs' pattern: feed count into tab completion calculation via memo deps
          setLinkedActivitiesCount(count);
        }}
      />;

    default:
      return null;
  }
}

function NewActivityPageContent() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startLoading, stopLoading } = useLoadingBar();
  
  // Modal state for activity creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Pre-cache common data for faster interactions
  const iatiReferenceCache = useIATIReferenceCache();
  const organizationsCache = useOrganizationsCache();
  const { preCacheActivityEditor } = usePreCache();
  
  // Generate UUID for new activities
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Form state persistence keys
  const getFormStorageKey = (key: string) => `activity_form_${key}`;
  
  // Load saved form data from localStorage
  const loadSavedFormData = () => {
    if (typeof window === 'undefined') return null;
    
    try {
      const savedData = localStorage.getItem(getFormStorageKey('draft'));
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Only restore if the data is less than 24 hours old
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('[Form Persistence] Failed to load saved form data:', error);
    }
    return null;
  };

  // Save form data to localStorage
  const saveFormData = useCallback((data: any) => {
    if (typeof window === 'undefined') return;
    
    try {
      const dataToSave = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(getFormStorageKey('draft'), JSON.stringify(dataToSave));
    } catch (error) {
      console.warn('[Form Persistence] Failed to save form data:', error);
    }
  }, []);

  // Clear saved form data
  const clearSavedFormData = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(getFormStorageKey('draft'));
    } catch (error) {
      console.warn('[Form Persistence] Failed to clear saved form data:', error);
    }
  }, []);

  // All state declarations first
  const [activeSection, setActiveSection] = useState("general");
  const [showActivityMetadata, setShowActivityMetadata] = useState(false);

  // OPTIMIZATION: Track which tabs have been loaded for lazy loading
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['general'])); // General is always loaded

  // Handle initial tab from query parameter (for import flow)
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam) {
      console.log('[ActivityEditor] Setting initial tab from query param:', tabParam);
      setActiveSection(tabParam);
      // Mark this tab as loaded
      setLoadedTabs(prev => new Set([...prev, tabParam]));
    }
  }, [searchParams]);

  // Initialize form state with saved data or defaults
  
  const [general, setGeneral] = useState(() => {
    // Check if we're editing an existing activity or creating a new one
    const activityId = searchParams?.get("id");

    // Don't use localStorage for existing activities - always fetch fresh from API
    // localStorage is only for preserving unsaved NEW activity drafts

    // Start with blank defaults for all cases
    // The useEffect will populate with API data for existing activities
    return {
      id: "",
      partnerId: "",
      iatiId: "",
      title: "",
      acronym: "",
      description: "",
      // Add description fields
      descriptionObjectives: "",
      descriptionTargetGroups: "",
      descriptionOther: "",
      created_by_org_name: "",
      created_by_org_acronym: "",
      collaborationType: "",
      activityStatus: "", // No default status
      activityScope: "4", // Default to National
      hierarchy: 1, // Default to top-level activity
      language: "en", // Default to English
      defaultAidType: "",
      defaultFinanceType: "",
      defaultCurrency: "",
      defaultFlowType: "",
      defaultTiedStatus: "",
      defaultDisbursementChannel: "",
      defaultModality: "",
      defaultModalityOverride: false,
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
      plannedStartDescription: "",
      plannedEndDate: "",
      plannedEndDescription: "",
      actualStartDate: "",
      actualStartDescription: "",
      actualEndDate: "",
      actualEndDescription: "",
      banner: "",
      bannerPosition: 50, // Default to center
      icon: "",
      iconScale: 100, // Default scale (100%)
      createdBy: undefined as { id: string; name: string; role: string } | undefined,
      createdByOrg: "",
      reportingOrgId: "",
      createdAt: "",
      updatedAt: "",
      iatiIdentifier: "",
      otherIdentifier: "",
      otherIdentifiers: [] as Array<{ type: string; code: string; ownerOrg?: { ref?: string; narrative?: string } }>,
      customDates: [] as Array<{ label: string; date: string; description: string }>,
      uuid: "",
      autoSync: false,
      lastSyncTime: "",
      syncStatus: "not_synced" as "live" | "pending" | "outdated" | "not_synced",
      autoSyncFields: [] as string[],
      // Budget status fields
      budgetStatus: "unknown" as "on_budget" | "off_budget" | "partial" | "unknown",
      onBudgetPercentage: null as number | null,
      budgetStatusNotes: null as string | null,
      // Geography level - whether geography is published at activity or transaction level
      geographyLevel: "activity" as "activity" | "transaction",
      // Sector export level - whether sectors are exported at activity or transaction level in IATI XML
      sectorExportLevel: "activity" as "activity" | "transaction"
    };
  });

  // Initialize other form sections with saved data or defaults
  const [sectors, setSectors] = useState<any[]>(() => {
    // Don't use localStorage for existing activities
    return [];
  });

  // Track sectors completion status including save state
  const [sectorsCompletionStatus, setSectorsCompletionStatus] = useState<{
    isComplete: boolean;
    isInProgress: boolean;
    isSaved: boolean;
  }>({ isComplete: false, isInProgress: false, isSaved: false });

  // Debug wrapper for setSectorsCompletionStatus
  const setSectorsCompletionStatusWithLogging = useCallback((newStatus: {
    isComplete: boolean;
    isInProgress: boolean;
    isSaved: boolean;
  }) => {
    console.log('[MainPage] setSectorsCompletionStatus called with:', newStatus);
    setSectorsCompletionStatus(newStatus);
  }, []);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [extendingPartners, setExtendingPartners] = useState<any[]>([]);
  
  const [implementingPartners, setImplementingPartners] = useState<any[]>([]);
  
  const [governmentPartners, setGovernmentPartners] = useState<any[]>([]);
  
  const [fundingPartners, setFundingPartners] = useState<any[]>([]);
  
  const [contacts, setContacts] = useState<any[]>([]);
  
  const [governmentInputs, setGovernmentInputs] = useState<any>({});
  
  const [sdgMappings, setSdgMappings] = useState<any[]>([]);
  
  const [tags, setTags] = useState<any[]>([]);
  
  const [workingGroups, setWorkingGroups] = useState<any[]>([]);
  
  const [policyMarkers, setPolicyMarkers] = useState<any[]>([]);
  
  const [specificLocations, setSpecificLocations] = useState<any[]>([]);
  
  const [coverageAreas, setCoverageAreas] = useState<any[]>([]);
  
  const [countries, setCountries] = useState<any[]>([]);
  
  const [regions, setRegions] = useState<any[]>([]);
  
  const [advancedLocations, setAdvancedLocations] = useState<any[]>([]);
  
  const [activityScope, setActivityScope] = useState<any>({});
  
  const [budgets, setBudgets] = useState<any[]>([]);

  const [plannedDisbursements, setPlannedDisbursements] = useState<any[]>([]);
  const [forwardSpendCount, setForwardSpendCount] = useState(0);
  
  const [humanitarian, setHumanitarian] = useState(false);
  const [humanitarianScopes, setHumanitarianScopes] = useState<any[]>([]);
  
  const [documents, setDocuments] = useState<any[]>([]);
  
  const [subnationalBreakdowns, setSubnationalBreakdowns] = useState<Record<string, number>>({});

  // State for metadata, XML import, and government endorsement tabs
  const [metadataData, setMetadataData] = useState<any>(null);
  const [xmlImportStatus, setXmlImportStatus] = useState<{ stage?: string }>({ stage: 'idle' });

  // Add missing state variables
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false);
  const [participatingOrgsCount, setParticipatingOrgsCount] = useState<number>(0);
  const [linkedActivitiesCount, setLinkedActivitiesCount] = useState<number>(0);
  const [resultsCount, setResultsCount] = useState<number>(0);
  const [capitalSpendPercentage, setCapitalSpendPercentage] = useState<number | null>(null);
  const [conditionsCount, setConditionsCount] = useState<number>(0);
  const [financingTermsCount, setFinancingTermsCount] = useState<number>(0);
  const [countryBudgetItemsCount, setCountryBudgetItemsCount] = useState<number>(0);
  const [focalPointsCount, setFocalPointsCount] = useState<number>(0);

  // Track sidebar collapse state to avoid covering the collapse button
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Track if any modal is open to blur footer buttons
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Detect when dialogs are open by observing DOM
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Check if any dialog overlay is present
      const hasDialog = document.querySelector('[role="dialog"]') !== null;
      setIsModalOpen(hasDialog);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  // Memoized callbacks to prevent infinite re-render loop
  const handlePlannedDisbursementsChange = useCallback((disb: any[]) => {
    console.log('[ActivityEditor] setPlannedDisbursements called with:', disb?.length || 0, 'disbursements');
    // Always update - the tab component already filters to only send data with IDs
    setPlannedDisbursements(disb);
  }, []);

  const handleResultsChange = useCallback((results: any[]) => {
    setResultsCount(Array.isArray(results) ? results.length : 0);
  }, []);

  // Handler for geography level change (autosave)
  const handleGeographyLevelChange = useCallback(async (level: 'activity' | 'transaction') => {
    // Get the current activity ID from state
    let currentActivityId: string | null = null;
    setGeneral((prev: any) => {
      currentActivityId = prev.id;
      return { ...prev, geographyLevel: level };
    });

    // Only save to database if we have an activity ID
    if (!currentActivityId || currentActivityId === 'NEW') {
      console.log('[ActivityEditor] Skipping geography level save - no activity ID yet');
      return;
    }

    try {
      console.log('[ActivityEditor] Saving geography level:', level, 'for activity:', currentActivityId);
      const response = await fetch(`/api/activities/${currentActivityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geography_level: level })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ActivityEditor] API error response:', errorData);
        throw new Error('Failed to update geography level');
      }

      console.log('[ActivityEditor] Geography level saved:', level);
      toast.success('Geography level saved');
    } catch (error) {
      console.error('[ActivityEditor] Error saving geography level:', error);
      toast.error('Failed to save geography level');
      // Revert on error
      setGeneral((prev: any) => ({ ...prev, geographyLevel: level === 'activity' ? 'transaction' : 'activity' }));
    }
  }, []);

  // Handler for sector export level change (autosave)
  const handleSectorExportLevelChange = useCallback(async (level: 'activity' | 'transaction') => {
    // Get the current activity ID from state
    let currentActivityId: string | null = null;
    setGeneral((prev: any) => {
      currentActivityId = prev.id;
      return { ...prev, sectorExportLevel: level };
    });

    // Only save to database if we have an activity ID
    if (!currentActivityId || currentActivityId === 'NEW') {
      console.log('[ActivityEditor] Skipping sector export level save - no activity ID yet');
      return;
    }

    try {
      console.log('[ActivityEditor] Saving sector export level:', level, 'for activity:', currentActivityId);
      const response = await fetch(`/api/activities/${currentActivityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectorExportLevel: level })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ActivityEditor] API error response:', errorData);
        throw new Error('Failed to update sector export level');
      }

      console.log('[ActivityEditor] Sector export level saved:', level);
      toast.success('Sector export level saved');
    } catch (error) {
      console.error('[ActivityEditor] Error saving sector export level:', error);
      toast.error('Failed to save sector export level');
      // Revert on error
      setGeneral((prev: any) => ({ ...prev, sectorExportLevel: level === 'activity' ? 'transaction' : 'activity' }));
    }
  }, []);

  // NOTE: Participating orgs, linked activities, results, country budget items, and metadata
  // are now loaded in the batch fetch in loadActivity() to prevent gradual green tick appearance

  // Use government endorsement hook for tab completion
  const { endorsement: governmentEndorsementData } = useGovernmentEndorsement(general.id || 'new');

  // Track XML import status from localStorage (IatiImportTab stores it there)
  React.useEffect(() => {
    if (!general.id || general.id === 'new') return;
    
    const checkXmlImportStatus = () => {
      try {
        const cachedData = localStorage.getItem(`iati_import_${general.id}`);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (parsed.importStatus) {
            setXmlImportStatus(parsed.importStatus);
          }
        }
      } catch (error) {
        // Ignore errors
      }
    };

    checkXmlImportStatus();
    
    // Listen for storage changes (when import completes)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `iati_import_${general.id}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.importStatus) {
            setXmlImportStatus(parsed.importStatus);
          }
        } catch (error) {
          // Ignore errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [general.id]);

  // Sync sidebar collapse state with localStorage
  React.useEffect(() => {
    // Read initial state
    const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    setSidebarCollapsed(collapsed);

    // Listen for changes from sidebar toggle
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed' && e.newValue !== null) {
        setSidebarCollapsed(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save form data to localStorage whenever form state changes
  React.useEffect(() => {
    // Don't save if we have an activity ID (means it's already saved to database)
    if (general.id) return;
    
    // Don't save if no meaningful data has been entered
    if (!general.title && !general.description && !general.acronym) return;
    
    const formData = {
      general,
      sectors,
      transactions,
      extendingPartners,
      implementingPartners,
      governmentPartners,
      contacts,
      governmentInputs,
      sdgMappings,
      tags,
      workingGroups,
      policyMarkers,
      specificLocations,
      coverageAreas,
      activityScope,
      budgets,
      plannedDisbursements,
      documents,
      subnationalBreakdowns
    };
    
    saveFormData(formData);
  }, [
    general, sectors, transactions, extendingPartners, implementingPartners,
    governmentPartners, contacts, governmentInputs, sdgMappings,
    tags, workingGroups, policyMarkers, specificLocations, coverageAreas,
    activityScope, budgets, plannedDisbursements, documents,
    subnationalBreakdowns, saveFormData
  ]);

  // Function to refresh transactions from server
  const refreshTransactions = useCallback(async () => {
    const activityId = searchParams?.get("id");
    if (!activityId) return;
    
    try {
      console.log('[AIMS] Refreshing transactions for activity:', activityId);
      const response = await fetch(`/api/activities/${activityId}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        setTransactionsLoaded(true);
        console.log('[AIMS] Refreshed transactions:', data.transactions?.length || 0);
      }
    } catch (error) {
      console.error('[AIMS] Error refreshing transactions:', error);
    }
  }, [searchParams]);

  // Listen for reporting org updates from MetadataTab
  useEffect(() => {
    const handleReportingOrgUpdate = (event: CustomEvent) => {
      const { activityId: updatedActivityId, organizationData } = event.detail;
      if (updatedActivityId === general.id && organizationData) {
        console.log('[ActivityEditor] Reporting org updated, refreshing data...');
        // Update the general data with new org information
        setGeneral((prev: any) => ({
          ...prev,
          created_by_org_name: organizationData.created_by_org_name,
          created_by_org_acronym: organizationData.created_by_org_acronym,
          createdByOrg: organizationData.reporting_org_id
        }));
      }
    };

    window.addEventListener('reporting-org-updated', handleReportingOrgUpdate as EventListener);
    return () => window.removeEventListener('reporting-org-updated', handleReportingOrgUpdate as EventListener);
  }, [general.id]);
  
  // Set initial section from URL parameter
  useEffect(() => {
    const sectionParam = searchParams?.get('section');
    if (sectionParam) {
      setActiveSection(sectionParam);
    }
  }, [searchParams]);

  // Extract transactionId from URL parameter for auto-opening transaction modal
  const transactionId = searchParams?.get('transactionId') || undefined;

  // Track previous activity ID to detect actual activity switches vs tab navigation
  const [previousActivityId, setPreviousActivityId] = useState<string | null>(null);

  // Clear form data only when actually switching to new activity creation
  useEffect(() => {
    const currentActivityId = searchParams?.get("id");
    
    // Only clear form data if:
    // 1. We're switching from an existing activity (previousActivityId exists) to new activity creation (no currentActivityId)
    // 2. OR this is the initial load with no activity ID
    const shouldClearFormData = !currentActivityId && (previousActivityId !== null || previousActivityId === null);
    
    if (shouldClearFormData && previousActivityId !== currentActivityId) {
      console.log('[AIMS] Switching to new activity creation - clearing form data');
      clearSavedFormData();
    }
    
    // Update tracked activity ID
    setPreviousActivityId(currentActivityId || null);
  }, [searchParams?.get("id"), clearSavedFormData]);

  // Reset form state only when legitimately creating a new activity
  useEffect(() => {
    const currentActivityId = searchParams?.get("id");
    
    // Only reset form state if:
    // 1. No current activity ID (creating new activity)
    // 2. AND we're actually switching activities (not just tab navigation)
    // 3. OR user has changed (login/logout scenario)
    const shouldResetForm = !currentActivityId && (
      previousActivityId !== currentActivityId || // Activity switch
      previousActivityId === null // Initial load for new activity
    );
    
    if (shouldResetForm) {
      console.log('[AIMS] Resetting form state for new activity creation');
      console.log('[AIMS DEBUG] User organization data for reset:', {
        user_organisation: user?.organisation,
        user_organization_name: user?.organization?.name,
        user_organizationId: user?.organizationId
      });
      setGeneral({
        id: "",
        partnerId: "",
        iatiId: "",
        title: "",
        acronym: "",
        description: "",
        // Add description fields
        descriptionObjectives: "",
        descriptionTargetGroups: "",
        descriptionOther: "",
        created_by_org_name: user?.organisation || user?.organization?.name || "",
        created_by_org_acronym: "",
        collaborationType: "",
        activityStatus: "", // No default status
        defaultAidType: "",
        defaultFinanceType: "",
        defaultCurrency: "",
        defaultFlowType: "",
        defaultTiedStatus: "",
        defaultDisbursementChannel: "",
        defaultModality: "",
        defaultModalityOverride: false,
        publicationStatus: "draft",
        submissionStatus: "draft",
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
        bannerPosition: 50,
        icon: "",
        iconScale: 100,
        createdBy: undefined,
        createdByOrg: user?.organizationId || "",
        reportingOrgId: user?.organizationId || "",
        createdAt: "",
        updatedAt: "",
        iatiIdentifier: "",
        otherIdentifier: "",
        otherIdentifiers: [],
        uuid: "",
        autoSync: false,
        lastSyncTime: "",
        syncStatus: "not_synced",
        autoSyncFields: [],
        activityScope: "4",
        hierarchy: 1,
        language: "en"
      });
      setSectors([]);
      setTransactions([]);
      setExtendingPartners([]);
      setImplementingPartners([]);
      setGovernmentPartners([]);
      setContacts([]);
      setGovernmentInputs({});
      setSdgMappings([]);
      setTags([]);
      setWorkingGroups([]);
      setPolicyMarkers([]);
      setSpecificLocations([]);
      setCoverageAreas([]);
      // Activity scope is now handled in general state
      setBudgets([]);
      setPlannedDisbursements([]);
      setDocuments([]);
      setSubnationalBreakdowns({});
    }
  }, [searchParams?.get("id"), previousActivityId, user?.organizationId]);

  // Handle user changes (login/logout) - reset form for new activity creation only
  useEffect(() => {
    const currentActivityId = searchParams?.get("id");
    
    // Only reset when user changes AND we're in new activity mode (no ID)
    if (!currentActivityId && user) {
      console.log('[AIMS] User changed during new activity creation - updating org info');
      setGeneral(prev => ({
        ...prev,
        created_by_org_name: user?.organisation || user?.organization?.name || "",
        createdByOrg: user?.organizationId || "",
        reportingOrgId: user?.organizationId || prev.reportingOrgId || ""
      }));
    }
  }, [user?.organizationId, user?.organisation, user?.organization?.name, searchParams]);

  // Set default reporting org when user loads for new activities (only if not already set)
  useEffect(() => {
    const currentActivityId = searchParams?.get("id");
    
    // Only set default for new activities (no ID) and when user is available
    if (!currentActivityId && user?.organizationId) {
      setGeneral(prev => {
        // Only update if reportingOrgId is not already set
        if (!prev.reportingOrgId) {
          console.log('[AIMS] Setting default reporting org to user organization:', user.organizationId);
          return {
            ...prev,
            reportingOrgId: user.organizationId
          };
        }
        return prev;
      });
    }
  }, [user?.organizationId, searchParams]);

  const [similarActivities, setSimilarActivities] = useState<ActivityMatch[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);
  const [sectorValidation, setSectorValidation] = useState<SectorValidation>({
    isValid: false,
    totalPercentage: 0,
    remainingPercentage: 100,
    errors: []
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAndNext, setSavingAndNext] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Set loading to false once user is loaded (for new activities or when user finishes loading)
  useEffect(() => {
    if (!userLoading) {
      // If there's no activity ID, we're creating a new activity - set loading to false immediately
      if (!searchParams?.get("id")) {
        setLoading(false);
      } else {
        // For existing activities, set a timeout to ensure loading is set to false
        // even if the loadActivity effect hasn't completed yet
        const timeoutId = setTimeout(() => {
          setLoading(false);
        }, 5000); // 5 second timeout as fallback
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [userLoading, searchParams]);
  
  // Sync loading bar with loading state
  useEffect(() => {
    if (loading) {
      startLoading();
    } else {
      stopLoading();
    }
    // Cleanup: ensure loading bar stops when component unmounts
    return () => {
      stopLoading();
    };
  }, [loading, startLoading, stopLoading]);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Navigation guard removed - all fields auto-save so no data loss on refresh
  // useEffect(() => {
  //   const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  //     if (hasUnsavedChanges) {
  //       e.preventDefault();
  //       e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  //       return e.returnValue;
  //     }
  //   };

  //   window.addEventListener('beforeunload', handleBeforeUnload);

  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //   };
  // }, [hasUnsavedChanges]);
  
  // Check if any autosave is currently in progress - MUST be after all state variables
  const isAnyAutosaveInProgress = useMemo(() => {
    const result = (
      saving ||
      savingAndNext ||
      submitting ||
      publishing
    );
    console.log('[DEBUG] isAnyAutosaveInProgress:', result, { saving, savingAndNext, submitting, publishing });
    return result;
  }, [
    saving,
    savingAndNext,
    submitting,
    publishing
  ]);
  const [tabLoading, setTabLoading] = useState(false);
  const [showMissingFieldsDialog, setShowMissingFieldsDialog] = useState(false);
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([]);
  const [showActivityCreatedAlert, setShowActivityCreatedAlert] = useState(false);
  const [titleAutosaveState, setTitleAutosaveState] = useState<{ isSaving: boolean; hasUnsavedChanges: boolean; lastSaved: Date | null; error: any }>({ isSaving: false, hasUnsavedChanges: false, lastSaved: null, error: null });
  const [activityId, setActivityId] = useState(general.id);
  
  // Update activityId state when general.id changes
  useEffect(() => {
    if (general.id && general.id !== activityId) {
      setActivityId(general.id);
    }
  }, [general.id, activityId]);

  // Update URL when activity is created to enable proper refresh behavior
  useEffect(() => {
    if (general.id && !searchParams?.get("id")) {
      // Activity was just created, update URL to include the ID
      console.log('[AIMS] Activity created, updating URL with ID:', general.id);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('id', general.id);
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [general.id, searchParams]);
  // Add state to track budgets and budgetNotProvided for Budgets tab completion
  const [budgetNotProvided, setBudgetNotProvided] = useState(false);
  
  // Load documents for tab completion
  React.useEffect(() => {
    const loadDocuments = async () => {
      if (!general.id) return;
      try {
        const response = await fetch(`/api/activities/${general.id}/documents`);
        if (response.ok) {
          const data = await response.json();
          if (data.documents && data.documents.length > 0) {
            setDocuments(data.documents);
          }
        }
      } catch (error) {
        console.error('Failed to load documents for tab completion:', error);
      }
    };
    loadDocuments();
  }, [general.id]);

  // Load government inputs from backend
  React.useEffect(() => {
    const loadGovernmentInputs = async () => {
      if (!general.id) return;
      try {
        const response = await fetch(`/api/activities/${general.id}/government-inputs`);
        if (response.ok) {
          const data = await response.json();
          if (data.governmentInputs) {
            setGovernmentInputs(data.governmentInputs);
          }
        }
      } catch (error) {
        console.error('Failed to load government inputs:', error);
      }
    };
    loadGovernmentInputs();
  }, [general.id]);

  // Add state to track focal points for Focal Points tab completion

  
  // Documents are now handled by dedicated API endpoints, no autosave needed
  const documentsAutosave = {
    saveNow: () => {
      // No-op: documents are saved directly to activity_documents table via upload API
      console.log('[DocumentsAutosave] Skipping autosave - using dedicated API');
    }
  };

  // Government Inputs autosave - custom implementation
  const governmentInputsAutosave = React.useMemo(() => ({
    saveNow: async (data: any) => {
      if (!general.id || !user?.id) {
        console.log('[GovernmentInputsAutosave] Skipping save - missing activity ID or user ID');
        return;
      }
      
      try {
        console.log('[GovernmentInputsAutosave] Saving government inputs...');
        const response = await fetch(`/api/activities/${general.id}/government-inputs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            userId: user.id
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[GovernmentInputsAutosave] API error response:', errorData);
          throw new Error(`Failed to save government inputs: ${errorData.message || errorData.error || response.status}`);
        }
        
        const result = await response.json();
        console.log('[GovernmentInputsAutosave] Government inputs saved successfully');
        return result;
      } catch (error) {
        console.error('[GovernmentInputsAutosave] Failed to save government inputs:', error);
        console.error('[GovernmentInputsAutosave] Error details:', error instanceof Error ? error.message : error);
        throw error;
      }
    }
  }), [general.id, user?.id]);

  // Autosave government inputs when they change
  React.useEffect(() => {
    if (!general.id || !user?.id) return;
    
    // Skip autosave on initial load (empty object)
    if (Object.keys(governmentInputs).length === 0) return;
    
    const timeoutId = setTimeout(() => {
      governmentInputsAutosave.saveNow(governmentInputs);
    }, 2000); // 2 second debounce
    
    return () => clearTimeout(timeoutId);
  }, [governmentInputs, general.id, user?.id]);


  // State for IATI Sync status
  const [iatiSyncState, setIatiSyncState] = useState({
    isEnabled: false,
    syncStatus: 'pending' as 'live' | 'pending' | 'outdated'
  });

  // State for Subnational Breakdown data


  const isEditing = !!searchParams?.get("id");
  
  // Show modal if no activity ID (new activity creation)
  useEffect(() => {
    if (!isEditing && !userLoading) {
      setShowCreateModal(true);
    }
  }, [isEditing, userLoading]);
  
  // Initialize activity editor pre-caching
  useEffect(() => {
    preCacheActivityEditor().catch(console.warn);
  }, [preCacheActivityEditor]);
  
  // Load activity data if editing
  useEffect(() => {
    // Don't run if user is still loading
    if (userLoading) {
      return;
    }
    
    const loadActivity = async () => {
      try {
        const activityId = searchParams?.get("id");
        
        if (activityId) {
          // OPTIMIZATION: Use cached activity data if available
          console.log('[AIMS] Loading activity with cache:', activityId);
          
          // RACE CONDITION FIX: Wait for all pending autosave operations to complete
          // This ensures we get the most up-to-date data when loading after activity creation
          console.log('[AIMS] Waiting for pending autosave operations to complete...');
          
          // Wait for all pending saves to complete (with shorter delay)
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms for all pending saves
          
          // Force cache invalidation to ensure fresh data
          invalidateActivityCache(activityId);
          
          // Bypass cache completely and fetch fresh data directly from API
          const apiUrl = `/api/activities/${activityId}/basic`;
          console.log('[AIMS] Fetching fresh data from API (bypassing cache):', apiUrl);
          const response = await fetch(apiUrl);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch activity: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('[AIMS] Activity loaded:', data.title);
          console.log('[AIMS DEBUG] Title and Acronym from API:', {
            title: data.title,
            acronym: data.acronym,
            title_narrative: data.title_narrative
          });
          console.log('[AIMS DEBUG] Organization data from API:', {
            created_by_org_name: data.created_by_org_name,
            created_by_org_acronym: data.created_by_org_acronym,
            reportingOrgId: data.reportingOrgId,
            createdByOrg: data.createdByOrg
          });
          // Update all state with loaded data
          setGeneral({
            id: data.id || activityId,
            partnerId: data.partnerId || "",
            iatiId: data.iatiId || "",
            title: data.title || "",
            acronym: data.acronym || "",
            description: data.description || "",
            // Add missing description fields
            descriptionObjectives: data.descriptionObjectives || "",
            descriptionTargetGroups: data.descriptionTargetGroups || "",
            descriptionOther: data.descriptionOther || "",
            created_by_org_name: data.created_by_org_name || "",
            created_by_org_acronym: data.created_by_org_acronym || "",
            collaborationType: data.collaborationType || "",
            activityStatus: data.activityStatus || "",
            defaultAidType: data.defaultAidType || "",
            defaultFinanceType: data.defaultFinanceType || "",
            defaultCurrency: data.defaultCurrency || "",
            defaultFlowType: data.defaultFlowType || "",
            defaultTiedStatus: data.defaultTiedStatus || "",
            defaultDisbursementChannel: data.defaultDisbursementChannel || "",
            defaultModality: data.defaultModality || data.default_modality || "",
            defaultModalityOverride: data.defaultModalityOverride || data.default_modality_override || false,
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
            plannedStartDescription: data.plannedStartDescription || "",
            plannedEndDate: data.plannedEndDate || "",
            plannedEndDescription: data.plannedEndDescription || "",
            actualStartDate: data.actualStartDate || "",
            actualStartDescription: data.actualStartDescription || "",
            actualEndDate: data.actualEndDate || "",
            actualEndDescription: data.actualEndDescription || "",
            banner: data.banner || "",
            bannerPosition: data.banner_position ?? data.bannerPosition ?? 50,
            icon: data.icon || "",
            iconScale: data.icon_scale ?? data.iconScale ?? 100,
            createdBy: data.createdBy || undefined,
            createdByOrg: data.createdByOrg || "",
            reportingOrgId: data.reporting_org_id || data.reportingOrgId || "",
            createdAt: data.createdAt || "",
            updatedAt: data.updatedAt || "",
            iatiIdentifier: data.iatiIdentifier || "",
            otherIdentifier: data.partnerId || data.otherIdentifier || "",
            otherIdentifiers: data.otherIdentifiers || data.other_identifiers || [],
            customDates: data.customDates || data.custom_dates || [],
            uuid: data.id || "",
            autoSync: data.autoSync || false,
            lastSyncTime: data.lastSyncTime || "",
            syncStatus: data.syncStatus || "not_synced",
            autoSyncFields: data.autoSyncFields || [],
            activityScope: data.activityScope || "4",
            language: data.language || "en",
            hierarchy: data.hierarchy || "1",
            // Budget status fields
            budgetStatus: data.budgetStatus || data.budget_status || "unknown",
            onBudgetPercentage: data.onBudgetPercentage ?? data.on_budget_percentage ?? null,
            budgetStatusNotes: data.budgetStatusNotes ?? data.budget_status_notes ?? null,
            // Geography level
            geographyLevel: data.geography_level || data.geographyLevel || "activity",
            // Sector export level (for IATI export)
            sectorExportLevel: data.sector_export_level || data.sectorExportLevel || "activity"
          });

          // Set capital spend percentage for tab completion
          console.log('[AIMS] Capital spend percentage from API:', data.capital_spend_percentage);
          setCapitalSpendPercentage(data.capital_spend_percentage ?? null);
          console.log('[AIMS] Capital spend state set to:', data.capital_spend_percentage ?? null);
          
          // Convert database sectors to ImprovedSectorAllocationForm format
          const convertedSectors = (data.sectors || []).map((sector: any) => ({
            id: sector.id || crypto.randomUUID(),
            code: sector.code,
            name: sector.name,
            percentage: sector.percentage || 0,
            category: sector.categoryName || sector.category,
            categoryCode: sector.categoryCode,
            categoryName: sector.categoryName,
            level: sector.level || (sector.code?.length === 3 ? 'group' : sector.code?.length === 5 ? 'subsector' : 'sector')
          }));
          console.log('🔄 [AIMS] === LOADING SECTORS FROM DATABASE ===');
          console.log('📊 [AIMS] Raw sectors from API:', JSON.stringify(data.sectors, null, 2));
          console.log('🔧 [AIMS] Converted sectors for form:', JSON.stringify(convertedSectors, null, 2));
          console.log('📈 [AIMS] Sector count - Raw:', data.sectors?.length || 0, 'Converted:', convertedSectors.length);
          setSectors(convertedSectors);
          // Only update transactions if explicitly provided (don't reset to empty during reload)
          if (data.transactions !== undefined) {
            setTransactions(data.transactions);
            setTransactionsLoaded(true);
          }
          setExtendingPartners(data.extendingPartners || []);
          setImplementingPartners(data.implementingPartners || []);
          setGovernmentPartners(data.governmentPartners || []);
          // Only update contacts if explicitly provided (don't reset to empty during reload)
          if (data.contacts !== undefined) {
            setContacts(data.contacts);
          }
          setGovernmentInputs(data.governmentInputs || {});
          console.log('[AIMS] Loaded SDG mappings:', data.sdgMappings?.length || 0, data.sdgMappings);
          setSdgMappings(data.sdgMappings || []);
          setTags(data.tags || []);
          setWorkingGroups(data.workingGroups || []);
          setPolicyMarkers(data.policyMarkers || []);
          
          if (data.locations) {
            console.log('[Activity New] Locations data received:', data.locations);
            console.log('[Activity New] Specific locations:', data.locations.specificLocations);
            console.log('[Activity New] Coverage areas:', data.locations.coverageAreas);
            setSpecificLocations(data.locations.specificLocations || []);
            setCoverageAreas(data.locations.coverageAreas || []);
          } else {
            console.log('[Activity New] No locations data in response');
          }
          
          // Set countries and regions data for tab completion
          if (data.recipient_countries) {
            console.log('[Activity New] Countries data received:', data.recipient_countries);
            setCountries(data.recipient_countries || []);
          }
          
          if (data.recipient_regions) {
            console.log('[Activity New] Regions data received:', data.recipient_regions);
            setRegions(data.recipient_regions || []);
          }
          
          // Activity scope is now handled in general state

          // BATCH FETCH: Fetch all tab completion data in parallel to avoid sequential state updates
          // This prevents green ticks from appearing one by one on page refresh
          console.log('[AIMS] Starting parallel fetch for tab completion data...');
          
          const [
            budgetsResult,
            budgetExceptionsResult,
            plannedDisbursementsResult,
            fssResult,
            humanitarianResult,
            transactionsResult,
            subnationalResult,
            contactsResult,
            conditionsResult,
            financingTermsResult,
            participatingOrgsResult,
            linkedActivitiesResult,
            resultsResult,
            countryBudgetItemsResult,
            metadataResult,
            focalPointsResult
          ] = await Promise.allSettled([
            // 1. Budgets API
            fetch(`/api/activities/${activityId}/budgets`).then(r => r.ok ? r.json() : null),
            // 2. Budget exceptions (Supabase)
            supabase.from('activity_budget_exceptions').select('*').eq('activity_id', activityId).single(),
            // 3. Planned disbursements (Supabase) - using direct query due to API bug
            supabase.from('planned_disbursements').select('*').eq('activity_id', activityId).order('period_start', { ascending: true }),
            // 4. Forward Spend FSS API
            fetch(`/api/activities/${activityId}/fss`).then(r => r.ok ? r.json() : null),
            // 5. Humanitarian API
            fetch(`/api/activities/${activityId}/humanitarian`).then(r => r.ok ? r.json() : null),
            // 6. Transactions API
            fetch(`/api/activities/${activityId}/transactions`).then(r => r.ok ? r.json() : null),
            // 7. Subnational breakdown API
            fetch(`/api/activities/${activityId}/subnational-breakdown`).then(r => r.ok ? r.json() : null),
            // 8. Contacts API
            fetch(`/api/activities/${activityId}/contacts`).then(r => r.ok ? r.json() : null),
            // 9. Conditions (Supabase)
            supabase.from('activity_conditions').select('id').eq('activity_id', activityId),
            // 10. Financing terms (Supabase) - both tables
            Promise.all([
              supabase.from('activity_financing_terms').select('id, rate_1, commitment_date').eq('activity_id', activityId).maybeSingle(),
              supabase.from('activity_loan_status').select('id').eq('activity_id', activityId)
            ]),
            // 11. Participating organizations API (for tab completion)
            fetch(`/api/activities/${activityId}/participating-organizations`).then(r => r.ok ? r.json() : []),
            // 12. Linked activities API (for tab completion)
            fetch(`/api/activities/${activityId}/linked`).then(r => r.ok ? r.json() : []),
            // 13. Results API (for tab completion)
            fetch(`/api/activities/${activityId}/results`).then(r => r.ok ? r.json() : { results: [] }),
            // 14. Country budget items API (for tab completion)
            fetch(`/api/activities/${activityId}/country-budget-items`).then(r => r.ok ? r.json() : { country_budget_items: [] }),
            // 15. Metadata API (for tab completion)
            fetch(`/api/activities/${activityId}/metadata`).then(r => r.ok ? r.json() : { metadata: null }),
            // 16. Focal Points API (for tab completion)
            fetch(`/api/activities/${activityId}/focal-points`).then(r => r.ok ? r.json() : { government_focal_points: [], development_partner_focal_points: [] })
          ]);

          // Process all results and prepare values
          let budgetsValue: any[] = [];
          let budgetNotProvidedValue = false;
          let plannedDisbursementsValue: any[] = [];
          let forwardSpendCountValue = 0;
          let humanitarianValue = false;
          let humanitarianScopesValue: any[] = [];
          let transactionsValue: any[] = [];
          let transactionsLoadedValue = false;
          let subnationalBreakdownsValue: Record<string, number> = {};
          let contactsValue: any[] | undefined = undefined;
          let conditionsCountValue = 0;
          let financingTermsCountValue = 0;
          let participatingOrgsCountValue = 0;
          let linkedActivitiesCountValue = 0;
          let resultsCountValue = 0;
          let countryBudgetItemsCountValue = 0;
          let metadataValue: any = null;
          let focalPointsCountValue = 0;

          // 1. Process budgets
          if (budgetsResult.status === 'fulfilled' && budgetsResult.value) {
            budgetsValue = budgetsResult.value || [];
            console.log('[AIMS] Loaded budgets for tab completion:', budgetsValue.length);
          } else if (budgetsResult.status === 'rejected') {
            console.warn('[AIMS] Failed to load budgets for tab completion:', budgetsResult.reason);
          }

          // 2. Process budget exceptions
          if (budgetExceptionsResult.status === 'fulfilled') {
            const { data: budgetExceptions, error: budgetExceptionsError } = budgetExceptionsResult.value;
            if (!budgetExceptionsError && budgetExceptions) {
              budgetNotProvidedValue = true;
              console.log('[AIMS] Found budget exception - budget not provided');
            }
          } else {
            console.warn('[AIMS] Failed to load budget exceptions for tab completion:', budgetExceptionsResult.reason);
          }

          // 3. Process planned disbursements
          if (plannedDisbursementsResult.status === 'fulfilled') {
            const { data: disbursementsData, error: disbursementsError } = plannedDisbursementsResult.value;
            if (disbursementsError) {
              console.error('[AIMS] Error fetching planned disbursements:', disbursementsError);
            } else {
              plannedDisbursementsValue = disbursementsData || [];
              console.log('[AIMS] Loaded planned disbursements for tab completion:', plannedDisbursementsValue.length);
            }
          } else {
            console.warn('[AIMS] Failed to load planned disbursements for tab completion:', plannedDisbursementsResult.reason);
          }

          // 4. Process Forward Spend (FSS)
          if (fssResult.status === 'fulfilled' && fssResult.value) {
            const forecastCount = fssResult.value?.forecasts?.length || 0;
            forwardSpendCountValue = forecastCount > 0 ? 1 : 0;
            console.log('[AIMS] Loaded Forward Spend for tab completion:', forecastCount, 'forecasts');
          } else if (fssResult.status === 'rejected') {
            console.warn('[AIMS] Failed to load Forward Spend for tab completion:', fssResult.reason);
          }

          // 5. Process Humanitarian data
          if (humanitarianResult.status === 'fulfilled' && humanitarianResult.value) {
            humanitarianValue = humanitarianResult.value.humanitarian || false;
            humanitarianScopesValue = humanitarianResult.value.humanitarian_scopes || [];
            console.log('[AIMS] Loaded Humanitarian for tab completion:', {
              humanitarian: humanitarianValue,
              scopesCount: humanitarianScopesValue.length
            });
          } else if (humanitarianResult.status === 'rejected') {
            console.warn('[AIMS] Failed to load Humanitarian for tab completion:', humanitarianResult.reason);
          }

          // 6. Process transactions
          if (transactionsResult.status === 'fulfilled' && transactionsResult.value) {
            const transactionsData = transactionsResult.value;
            // Handle both response formats: { data: [...] } or direct array [...]
            transactionsValue = Array.isArray(transactionsData) ? transactionsData : (transactionsData.data || []);
            transactionsLoadedValue = true;
            console.log('[AIMS] Loaded transactions for tab completion:', transactionsValue.length);
          } else if (transactionsResult.status === 'rejected') {
            console.warn('[AIMS] Failed to load transactions for tab completion:', transactionsResult.reason);
          }

          // 7. Process subnational breakdown
          if (subnationalResult.status === 'fulfilled' && subnationalResult.value) {
            const subnationalData = subnationalResult.value;
            if (Array.isArray(subnationalData)) {
              subnationalData.forEach((item: any) => {
                subnationalBreakdownsValue[item.region_name] = item.percentage;
              });
              console.log('[AIMS] Loaded subnational breakdown for tab completion:', Object.keys(subnationalBreakdownsValue).length, 'regions');
            }
          } else if (subnationalResult.status === 'rejected') {
            console.warn('[AIMS] Failed to load subnational breakdown for tab completion:', subnationalResult.reason);
          }

          // 8. Process contacts
          if (contactsResult.status === 'fulfilled' && contactsResult.value) {
            contactsValue = contactsResult.value;
            console.log('[AIMS] Loaded contacts for tab completion:', contactsValue?.length || 0);
          } else if (contactsResult.status === 'rejected') {
            console.warn('[AIMS] Failed to load contacts for tab completion:', contactsResult.reason);
          }

          // 9. Process conditions
          if (conditionsResult.status === 'fulfilled') {
            const { data: conditionsData, error: conditionsError } = conditionsResult.value;
            if (!conditionsError && conditionsData) {
              conditionsCountValue = conditionsData.length;
              console.log('[AIMS] Loaded conditions for tab completion:', conditionsCountValue);
            }
          } else {
            console.warn('[AIMS] Failed to load conditions for tab completion:', conditionsResult.reason);
          }

          // 10. Process financing terms
          if (financingTermsResult.status === 'fulfilled') {
            const [financingTermsResponse, loanStatusResponse] = financingTermsResult.value;
            const { data: financingTermsData, error: financingTermsError } = financingTermsResponse;
            const { data: loanStatusData, error: loanStatusError } = loanStatusResponse;

            // Has completed data if loan terms exist with key fields OR if any loan status exists
            const hasFinancingData =
              (financingTermsData && financingTermsData.rate_1 !== null && financingTermsData.commitment_date !== null) ||
              (loanStatusData && loanStatusData.length > 0);

            if (!financingTermsError && !loanStatusError) {
              financingTermsCountValue = hasFinancingData ? 1 : 0;
              console.log('[AIMS] Loaded financing terms for tab completion:', hasFinancingData);
            }
          } else {
            console.warn('[AIMS] Failed to load financing terms for tab completion:', financingTermsResult.reason);
          }

          // 11. Process participating organizations
          if (participatingOrgsResult.status === 'fulfilled' && participatingOrgsResult.value) {
            participatingOrgsCountValue = participatingOrgsResult.value.length || 0;
            console.log('[AIMS] Loaded participating orgs for tab completion:', participatingOrgsCountValue);
          } else if (participatingOrgsResult.status === 'rejected') {
            console.warn('[AIMS] Failed to load participating orgs for tab completion:', participatingOrgsResult.reason);
          }

          // 12. Process linked activities
          if (linkedActivitiesResult.status === 'fulfilled' && linkedActivitiesResult.value) {
            linkedActivitiesCountValue = Array.isArray(linkedActivitiesResult.value) ? linkedActivitiesResult.value.length : 0;
            console.log('[AIMS] Loaded linked activities for tab completion:', linkedActivitiesCountValue);
          } else if (linkedActivitiesResult.status === 'rejected') {
            console.warn('[AIMS] Failed to load linked activities for tab completion:', linkedActivitiesResult.reason);
          }

          // 13. Process results
          if (resultsResult.status === 'fulfilled' && resultsResult.value) {
            resultsCountValue = Array.isArray(resultsResult.value?.results) ? resultsResult.value.results.length : 0;
            console.log('[AIMS] Loaded results for tab completion:', resultsCountValue);
          } else if (resultsResult.status === 'rejected') {
            console.warn('[AIMS] Failed to load results for tab completion:', resultsResult.reason);
          }

          // 14. Process country budget items
          if (countryBudgetItemsResult.status === 'fulfilled' && countryBudgetItemsResult.value) {
            const items = countryBudgetItemsResult.value.country_budget_items || [];
            countryBudgetItemsCountValue = items.length;
            console.log('[AIMS] Loaded country budget items for tab completion:', countryBudgetItemsCountValue);
          } else if (countryBudgetItemsResult.status === 'rejected') {
            console.warn('[AIMS] Failed to load country budget items for tab completion:', countryBudgetItemsResult.reason);
          }

          // 15. Process metadata
          if (metadataResult.status === 'fulfilled' && metadataResult.value) {
            metadataValue = metadataResult.value.metadata || null;
            console.log('[AIMS] Loaded metadata for tab completion:', metadataValue ? 'has data' : 'no data');
          } else if (metadataResult.status === 'rejected') {
            console.warn('[AIMS] Failed to load metadata for tab completion:', metadataResult.reason);
          }

          // 16. Process focal points
          if (focalPointsResult.status === 'fulfilled' && focalPointsResult.value) {
            const govFocalPoints = focalPointsResult.value.government_focal_points || [];
            const dpFocalPoints = focalPointsResult.value.development_partner_focal_points || [];
            focalPointsCountValue = govFocalPoints.length + dpFocalPoints.length;
            console.log('[AIMS] Loaded focal points for tab completion:', focalPointsCountValue);
          } else if (focalPointsResult.status === 'rejected') {
            console.warn('[AIMS] Failed to load focal points for tab completion:', focalPointsResult.reason);
          }

          // BATCH STATE UPDATES: Update all state at once to trigger single re-render
          console.log('[AIMS] Applying batched state updates for tab completion...');
          setBudgets(budgetsValue);
          setBudgetNotProvided(budgetNotProvidedValue);
          setPlannedDisbursements(plannedDisbursementsValue);
          setForwardSpendCount(forwardSpendCountValue);
          setHumanitarian(humanitarianValue);
          setHumanitarianScopes(humanitarianScopesValue);
          setTransactions(transactionsValue);
          setTransactionsLoaded(transactionsLoadedValue);
          setSubnationalBreakdowns(subnationalBreakdownsValue);
          if (contactsValue !== undefined) {
            setContacts(contactsValue);
          }
          setConditionsCount(conditionsCountValue);
          setFinancingTermsCount(financingTermsCountValue);
          setParticipatingOrgsCount(participatingOrgsCountValue);
          setLinkedActivitiesCount(linkedActivitiesCountValue);
          setResultsCount(resultsCountValue);
          setCountryBudgetItemsCount(countryBudgetItemsCountValue);
          setFocalPointsCount(focalPointsCountValue);
          setMetadataData(metadataValue);
          console.log('[AIMS] Tab completion data loaded successfully')
        } else {
          // New activity - just set some defaults
          console.log('[AIMS] Creating new activity - user:', user);
          setGeneral((prev: any) => ({
            ...prev,
            created_by_org_name: user?.organisation || user?.organization?.name || "",
            createdByOrg: user?.organizationId || "",
            uuid: ""
          }));
        }
      } catch (error) {
        console.error('[AIMS] Error loading activity:', error);
        setError('Failed to load activity');
      } finally {
        // Always set loading to false
        setLoading(false);
      }
    };
    
    loadActivity();
  }, [searchParams, user, userLoading]);


  // REMOVED: localStorage persistence for existing activities
  // This was causing stale data issues on page refresh
  // Existing activities should always fetch fresh data from the API
  // localStorage is only used for NEW unsaved activities (handled by the other useEffect)

  // REMOVED: General tab rehydration logic
  // This was causing issues with stale localStorage data
  // All data should be loaded by the main useEffect on page load

  // Build sections array based on user role
  // Also allow super_user to see government inputs
  const showGovernmentInputs = user?.role?.includes('gov_partner') || user?.role === 'super_user';
  
  const getSectionLabel = (sectionId: string): string => {
    const sectionLabels: Record<string, string> = {
      metadata: "Metadata",
      general: "General Information",
      iati: "IATI Sync",
      sectors: "Sectors",
      humanitarian: "Humanitarian",
      locations: "Activity Locations",
      subnational_breakdown: "Subnational Breakdown",
      organisations: "Participating Organisations",
      contacts: "Activity Contacts",
      focal_points: "Focal Points",
      linked_activities: "Linked Activities",
      finances: "Transactions",
      results: "Results",
      "capital-spend": "Capital Spend",
      sdg: "SDG Alignment",
      "country-budget": "Country Budget Mapping",
      tags: "Tags",
      working_groups: "Working Groups",
      policy_markers: "Policy Markers",
      government: "Government Inputs",
      government_endorsement: "Government Endorsement",
      documents: "Documents & Images",
      aid_effectiveness: "Aid Effectiveness",
      budgets: "Budgets",
      "planned-disbursements": "Planned Disbursements",
      "forward-spending-survey": "Forward Spending Survey",
      "financing-terms": "Financing Terms",
      "conditions": "Conditions",
      "xml-import": "IATI Import"
    };
    return sectionLabels[sectionId] || sectionId;
  };

  const getSectionHelpText = (sectionId: string): string => {
    const sectionHelpTexts: Record<string, string> = {
      general: "This tab brings together the core details that define the activity, including its identifiers, title, description, imagery, collaboration type, status, and dates. Completing this section establishes the basic profile of the activity and provides a clear reference point for all other information entered elsewhere.",
      iati: "This tab controls synchronisation with the IATI Registry and Datastore. Enabling sync ensures that updates made to the activity in this system are reflected in your published IATI file, maintaining consistency between internal records and the official public dataset.",
      locations: "This tab records where the activity takes place. You can add locations using the map or by entering coordinates manually. Each location can include a name, type, address, and description, along with subnational breakdowns. These details establish the geographic footprint of the activity and allow analysis at the national, regional, or project-site level.",
      sectors: "This tab defines the focus areas of the activity. You select sub-sectors, and the system automatically links each choice to its corresponding sector and sector category. You can assign multiple sub-sectors and use percentage shares to show how the activity budget is divided. The allocations must add up to 100 percent, and a visual summary displays the distribution.",
      organisations: "This tab records the official roles of organisations involved in the activity. Participating organisations may be listed as extending partners, implementing partners, or government partners. Extending partners are entities that channel funds onward, implementing partners are responsible for delivering the activity, and government partners provide oversight or maintain responsibility under agreements such as MoUs. These roles define the structure of participation for reporting.",
      contacts: "The Contacts tab records key individuals associated with the activity, including their name, role, organisation, and contact details. It can also include a short narrative description of their responsibilities or function within the project. Adding contacts helps identify focal points for communication and coordination, while multiple entries allow both general enquiries and specific role-based contacts to be captured.",
      focal_points: "The Focal Points tab designates the individuals accountable for maintaining and validating the activity record. Recipient government focal points are officials who review or endorse the activity, while development partner focal points are the main contacts responsible for updating and managing the information on behalf of their organisations. Super users can assign focal points directly, and current focal points can hand off their role to another user who must accept the transfer.",
      "linked_activities": "The Linked Activities tab shows connections between this activity and others, defined through recognised relationship types such as parent, child, or related projects. Each linked activity is displayed with its title, identifier, and reporting organisation, along with its relationship to the current activity. A relationship visualisation provides a clear overview of how activities are structured and connected across partners.",
      tags: "Add custom tags to categorise this activity and make it easier to find through search and reporting. You can click on any tag to edit it inline. When creating tags, use clear and specific terms, such as \"water-infrastructure\" instead of simply \"water,\" to ensure accuracy. Tags ignore letter cases and will always be saved in lowercase. For consistency, try to reuse existing tags whenever possible. Careful tagging not only improves searchability but also strengthens the quality of filtering and reporting across activities.",
      working_groups: "In this section you can map the activity to the relevant technical or sector working groups. Doing so ensures that the activity is visible within the appropriate coordination structures, helps align it with other initiatives in the same area, and supports joint planning, monitoring and reporting. By linking your activity to the correct working group, you contribute to better coordination across partners and provide government and sector leads with a clearer picture of collective efforts.",
      policy_markers: "Assign OECD DAC and IATI-compliant policy markers to show how this activity addresses cross-cutting development issues. Policy markers are a standard way of signalling whether and to what extent an activity contributes to objectives such as gender equality, climate change, biodiversity, or disaster risk reduction. Each marker is scored to reflect the importance of the objective within the activity—for example, whether it is a principal objective, a significant objective, or not targeted at all. The Rio Markers are a specific subset that track environmental objectives in line with OECD DAC guidelines. Providing a short rationale alongside your chosen scores helps explain and justify the assessment, making the data more transparent and easier to interpret across organisations and reports.",
      documents: "You can drag and drop files into the upload area or click \"Choose Files\" to browse your computer. Supported formats include images (PNG, JPG, GIF), PDFs, Word documents, Excel sheets, and CSV files. Add a clear title and category so your uploads are easy to find later in the library.",
      "xml-import": "Import activity data from an IATI-compliant XML file. You can review and select which fields to import.",
      "capital-spend": "Capital expenditure represents the percentage of the total activity cost used for fixed assets or infrastructure (e.g., buildings, equipment, vehicles). This helps distinguish between capital investment and operational/recurrent costs.",
      "conditions": "Conditions are requirements that must be met for the activity to proceed. They can be policy-related (requiring implementation of particular policies), performance-based (requiring achievement of specific outputs or outcomes), or fiduciary (requiring use of specific financial management measures).",
      "country-budget": "Map activity budget to recipient country budget classifications.",
      "forward-spending-survey": "Complete this section to provide additional details about your activity.",
      "financing-terms": "Complete this section to provide additional details about your activity."
    };
    return sectionHelpTexts[sectionId] || "Complete this section to provide additional details about your activity.";
  };

  // Get permissions for current activity
  const permissions = getActivityPermissions(user, general.id ? { 
    ...general, 
    contributors: [],
    createdBy: general.createdBy 
  } as any : null);

  // Check required fields for validation
  const checkRequiredFields = useCallback(() => {
    const missing: string[] = [];
    
    if (!general.title?.trim()) missing.push("Activity Title");
    // Removed other required fields - only title is required now for publishing
    
    return missing;
  }, [general.title]);

  // Permission checks
  const canEdit = general.submissionStatus === 'draft' || general.submissionStatus === 'rejected' || user?.role === 'super_user';
  const canSubmit = user?.role === 'gov_partner_tier_2' || user?.role === 'dev_partner_tier_2';
  const canValidate = user?.role === 'gov_partner_tier_1' || user?.role === 'super_user';
  // Super users can always see the publish toggle
  const canPublish = user?.role === 'super_user' ? true :
                     ((user?.role === 'gov_partner_tier_1') && 
                      (general.submissionStatus === 'validated') &&
                      general.id && general.title?.trim() && general.description?.trim() && 
                      general.activityStatus && general.plannedStartDate && general.plannedEndDate);

  // 🚀 FIELD-LEVEL AUTOSAVE SYSTEM - saves individual fields immediately
  // Simplified updateActivityNestedField for backward compatibility
  const updateActivityNestedField = (field: string, value: any) => {
    console.log(`Field-level autosave: ${field} updated to`, value);
    // Individual fields now handle their own autosave via field-level hooks
  };
  
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
    // 1 = Pipeline - only planned dates
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

  // Tab completion status calculation
  const tabCompletionStatus = React.useMemo(() => {
    const generalCompletion = getTabCompletionStatus('general', general, getDateFieldStatus)
    // Sectors tab: compute completion based on actual sectors data
    const hasSectorsWithPercentage = sectors.some(sector => sector.percentage && sector.percentage > 0);
    const totalSectorsPercentage = sectors.reduce((sum, sector) => sum + (sector.percentage || 0), 0);
    const isSectorsProperlyAllocated = Math.abs(totalSectorsPercentage - 100) < 0.1;
    const isSectorsDataComplete = hasSectorsWithPercentage && isSectorsProperlyAllocated;
    
    const sectorsCompletion = {
      isComplete: isSectorsDataComplete,
      isInProgress: hasSectorsWithPercentage && !isSectorsProperlyAllocated
    };

    // Defaults sub-tab under Finances: require all fields filled AND saved
    const financesDefaultsCompletion = getTabCompletionStatus('finances', {
      default_aid_type: general.defaultAidType,
      default_finance_type: general.defaultFinanceType,
      default_flow_type: general.defaultFlowType,
      default_currency: general.defaultCurrency,
      default_tied_status: general.defaultTiedStatus,
      hasUnsavedChanges: hasUnsavedChanges
    });

    // Finances tab: green check if at least one transaction
    const financesComplete = transactions && transactions.length > 0;

    // Budgets tab: green check if at least one budget or budget not provided
    const budgetsComplete = (budgets && budgets.length > 0) || budgetNotProvided;

    // Planned Disbursements tab: green check if at least one planned disbursement
    const plannedDisbursementsComplete = plannedDisbursements && plannedDisbursements.length > 0;

    // Forward Spend tab: green check if FSS exists with forecasts
    const forwardSpendComplete = forwardSpendCount > 0;

    // Humanitarian tab: green check if flag is true or scopes exist
    const humanitarianCompletion = getTabCompletionStatus('humanitarian', {
      humanitarian: humanitarian,
      humanitarianScopes: humanitarianScopes
    });

    // SDG tab: green check if at least one SDG goal is mapped
    const sdgComplete = sdgMappings && sdgMappings.length > 0;

    // Budget Mapping tab: green check if at least one budget mapping exists
    const countryBudgetComplete = countryBudgetItemsCount > 0;

    // Locations tab: use the comprehensive locations completion check (includes subnational breakdown, countries, and regions)
    const locationsCompletion = getTabCompletionStatus('locations', { 
      specificLocations, 
      subnationalBreakdowns,
      countries,
      regions
    });

    // Tags tab: use the comprehensive tags completion check
    const tagsCompletion = getTabCompletionStatus('tags', tags);

    // Working Groups tab: use the comprehensive working groups completion check
    const workingGroupsCompletion = getTabCompletionStatus('working_groups', workingGroups);

    // Policy Markers tab: use the comprehensive policy markers completion check
    const policyMarkersCompletion = getTabCompletionStatus('policy_markers', policyMarkers);

    // Organizations tab: check if we have participating organizations
    // Use the actual participating organizations count from the OrganisationsSection
    
    // Also check the old partner arrays as a fallback for debugging
    const legacyOrgCount = (extendingPartners?.length || 0) + (implementingPartners?.length || 0) + (governmentPartners?.length || 0);
    
    const organizationsCompletion = getTabCompletionStatus('organisations', 
      // Create a mock array with the actual count from the participating organizations
      Array(participatingOrgsCount).fill({})
    );
    
    // Contacts tab: check if we have contacts
    const contactsCompletion = getTabCompletionStatus('contacts', contacts);
    
    // Linked Activities tab: complete when there is at least one linked activity
    const linkedActivitiesCompletion = getTabCompletionStatus('linked-activities', Array(linkedActivitiesCount).fill({}));
    
    // Results tab: green check if at least one result exists
    const resultsCompletion = getTabCompletionStatus('results', Array(resultsCount).fill({}));
    
    // Capital Spend tab: green check if percentage is provided and greater than 0
    const capitalSpendComplete = capitalSpendPercentage !== null && 
                                  capitalSpendPercentage !== undefined &&
                                  capitalSpendPercentage > 0 && 
                                  capitalSpendPercentage <= 100;
    
    // Documents & Images tab: green check if at least one document exists
    const documentsCompletion = getTabCompletionStatus('documents', documents);
    
    // Government Inputs tab: green check if at least one field is completed
    const governmentInputsCompletion = getTabCompletionStatus('government', governmentInputs);
    
    // Aid Effectiveness tab: check if all required fields are completed
    const aidEffectivenessCompletion = getTabCompletionStatus('aid_effectiveness', general);
    
    // TEMPORARY: Force completion for testing - remove this later
    // if (participatingOrgsCount === 0) {
    //   console.log('[TabCompletion] TESTING: Forcing organizations completion to true');
    //   organizationsCompletion = { isComplete: true, isInProgress: false, completedFields: ['test'], missingFields: [] };
    // }

    // IATI Sync tab completion logic
    const iatiSyncComplete = iatiSyncState.isEnabled && iatiSyncState.syncStatus === 'live';
    const iatiSyncInProgress = iatiSyncState.isEnabled && (iatiSyncState.syncStatus === 'pending' || iatiSyncState.syncStatus === 'outdated');

    // Metadata tab: check if any metadata fields exist
    const metadataCompletion = getTabCompletionStatus('metadata', metadataData);

    // XML Import tab: check if import was completed
    const xmlImportCompletion = getTabCompletionStatus('xml-import', xmlImportStatus);

    // Government Endorsement tab: check if endorsement exists
    const governmentEndorsementCompletion = getTabCompletionStatus('government_endorsement', governmentEndorsementData);

    return {
      general: generalCompletion ? { 
        isComplete: generalCompletion.isComplete,
        isInProgress: generalCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      iati: { 
        isComplete: iatiSyncComplete, 
        isInProgress: iatiSyncInProgress 
      },
      sectors: { 
        isComplete: sectorsCompletion.isComplete,
        isInProgress: sectorsCompletion.isInProgress 
      },
      locations: locationsCompletion ? { 
        isComplete: locationsCompletion.isComplete,
        isInProgress: locationsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      tags: tagsCompletion ? { 
        isComplete: tagsCompletion.isComplete,
        isInProgress: tagsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      working_groups: workingGroupsCompletion ? { 
        isComplete: workingGroupsCompletion.isComplete,
        isInProgress: workingGroupsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      policy_markers: policyMarkersCompletion ? { 
        isComplete: policyMarkersCompletion.isComplete,
        isInProgress: policyMarkersCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      organisations: organizationsCompletion ? { 
        isComplete: organizationsCompletion.isComplete,
        isInProgress: organizationsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      contacts: contactsCompletion ? {
        isComplete: contactsCompletion.isComplete,
        isInProgress: contactsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      focal_points: { 
        isComplete: focalPointsCount > 0, 
        isInProgress: false 
      },
      linked_activities: linkedActivitiesCompletion ? { 
        isComplete: linkedActivitiesCompletion.isComplete,
        isInProgress: linkedActivitiesCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      finances: { isComplete: financesComplete, isInProgress: false },
      finances_defaults: financesDefaultsCompletion ? { 
        isComplete: financesDefaultsCompletion.isComplete,
        isInProgress: financesDefaultsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      budgets: { isComplete: budgetsComplete, isInProgress: false },
      "planned-disbursements": { isComplete: plannedDisbursementsComplete, isInProgress: false },
      "forward-spending-survey": { isComplete: forwardSpendComplete, isInProgress: false },
      humanitarian: humanitarianCompletion ? { 
        isComplete: humanitarianCompletion.isComplete,
        isInProgress: humanitarianCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      results: resultsCompletion ? { 
        isComplete: resultsCompletion.isComplete,
        isInProgress: resultsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      "capital-spend": { 
        isComplete: capitalSpendComplete, 
        isInProgress: false 
      },
      "financing-terms": {
        isComplete: financingTermsCount > 0,
        isInProgress: false
      },
      conditions: {
        isComplete: conditionsCount > 0,
        isInProgress: false
      },
      documents: documentsCompletion ? { 
        isComplete: documentsCompletion.isComplete,
        isInProgress: documentsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      government: governmentInputsCompletion ? {
        isComplete: governmentInputsCompletion.isComplete,
        isInProgress: governmentInputsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      sdg: { isComplete: sdgComplete, isInProgress: false },
      "country-budget": { 
        isComplete: countryBudgetComplete, 
        isInProgress: false 
      },
      aid_effectiveness: aidEffectivenessCompletion ? {
        isComplete: aidEffectivenessCompletion.isComplete,
        isInProgress: aidEffectivenessCompletion.isInProgress
      } : { isComplete: false, isInProgress: false },
      metadata: metadataCompletion ? {
        isComplete: metadataCompletion.isComplete,
        isInProgress: metadataCompletion.isInProgress
      } : { isComplete: false, isInProgress: false },
      "xml-import": xmlImportCompletion ? {
        isComplete: xmlImportCompletion.isComplete,
        isInProgress: xmlImportCompletion.isInProgress
      } : { isComplete: false, isInProgress: false },
      government_endorsement: governmentEndorsementCompletion ? {
        isComplete: governmentEndorsementCompletion.isComplete,
        isInProgress: governmentEndorsementCompletion.isInProgress
      } : { isComplete: false, isInProgress: false }
    }
  }, [general, sectors, getDateFieldStatus, sectorValidation, specificLocations, countries, regions, tags, workingGroups, policyMarkers, hasUnsavedChanges, transactions, budgets, budgetNotProvided, plannedDisbursements, forwardSpendCount, humanitarian, humanitarianScopes, sdgMappings, iatiSyncState, subnationalBreakdowns, extendingPartners, implementingPartners, governmentPartners, participatingOrgsCount, linkedActivitiesCount, resultsCount, capitalSpendPercentage, conditionsCount, financingTermsCount, documents, contacts, countryBudgetItemsCount, focalPointsCount, metadataData, xmlImportStatus, governmentEndorsementData]);

  // Helper to get next section id - moved here to avoid temporal dead zone
  const getNextSection = useCallback((currentId: string) => {
    const sections = [
      "iati", "xml-import", 
      "general", "sectors", "humanitarian", "locations",
      "organisations", "contacts", "focal_points", "linked_activities",
      "finances", "planned-disbursements", "budgets", "forward-spending-survey", "results", "capital-spend", "financing-terms", "conditions",
      "sdg", "country-budget", "tags", "working_groups", "policy_markers",
      "documents", "aid_effectiveness",
      "metadata", "government", "government_endorsement"
    ].filter(id => (id !== "government" && id !== "government_endorsement") || showGovernmentInputs);
    
    const idx = sections.findIndex(s => s === currentId);
    return idx < sections.length - 1 ? sections[idx + 1] : null;
  }, [showGovernmentInputs]);

  // Helper to get previous section id
  const getPreviousSection = useCallback((currentId: string) => {
    const sections = [
      "iati", "xml-import", 
      "general", "sectors", "humanitarian", "locations",
      "organisations", "contacts", "focal_points", "linked_activities",
      "finances", "planned-disbursements", "budgets", "forward-spending-survey", "results", "capital-spend", "financing-terms", "conditions",
      "sdg", "country-budget", "tags", "working_groups", "policy_markers",
      "documents", "aid_effectiveness",
      "metadata", "government", "government_endorsement"
    ].filter(id => (id !== "government" && id !== "government_endorsement") || showGovernmentInputs);
    
    const idx = sections.findIndex(s => s === currentId);
    return idx > 0 ? sections[idx - 1] : null;
  }, [showGovernmentInputs]);

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


  // OPTIMIZED: Enhanced tab change with lazy loading
  const handleTabChange = async (value: string) => {
    // Prevent tab change while saving
    if (isAnyAutosaveInProgress) {
      toast.warning('Please wait while saving before switching tabs');
      return;
    }
    
    // Auto-create draft activity when navigating to IATI Import without an existing activity
    if (value === 'xml-import' && !general.id) {
      try {
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Imported Activity (Draft)',
            description: 'Activity created via IATI/XML import',
            status: '1',
            user_id: user?.id,
            created_via: 'import',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create draft activity');
        }

        const newActivity = await response.json();
        
        // Update general state with the new activity ID
        setGeneral((prev: any) => ({ 
          ...prev, 
          id: newActivity.id, 
          uuid: newActivity.uuid || newActivity.id,
          title: 'Imported Activity (Draft)',
          description: 'Activity created via IATI/XML import',
        }));
        
        toast.success('Draft activity created for import', {
          description: 'You can now import data from IATI',
        });
      } catch (error) {
        console.error('Error creating draft activity for import:', error);
        toast.error('Failed to create draft activity', {
          description: error instanceof Error ? error.message : 'Please try again',
        });
        return;
      }
    }
    
    console.log('[AIMS Performance] Switching to tab:', value);
    
    setTabLoading(true);
    setActiveSection(value);
    
    // Check if tab was already loaded BEFORE updating state
    const wasAlreadyLoaded = loadedTabs.has(value);
    
    // OPTIMIZATION: Mark tab as loaded for lazy loading
    setLoadedTabs(prev => {
      const newSet = new Set(prev);
      newSet.add(value);
      return newSet;
    });
    
    // Only add delay if tab hasn't been loaded before
    if (!wasAlreadyLoaded) {
      console.log('[AIMS Performance] First load of tab:', value, '- showing skeleton');
      // Simulate minimum loading time for smooth transition
      await new Promise(resolve => setTimeout(resolve, 300));
    } else {
      console.log('[AIMS Performance] Tab already loaded:', value, '- instant switch');
      // Instant switch for previously loaded tabs
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setTabLoading(false);
  };

  // Save activity to API
  const saveActivity = useCallback(async ({ publish = false, goToList = false, goToNext = false, suppressErrorToast = false }) => {
    console.log('[DEBUG] saveActivity called with:', { publish, goToList, goToNext, suppressErrorToast });
    if (!general.title?.trim()) {
      toast.error('Activity Title is required');
      return;
    }

    console.log('[DEBUG] Setting loading state');
    if (goToNext) {
      setSavingAndNext(true);
    } else {
      setSaving(true);
    }

    try {
      // Prepare payload with current General tab state
      const payload: any = {
        ...general,
        partnerId: general.otherIdentifier || "",
        iatiId: general.iatiIdentifier || null, // Map iatiIdentifier to iatiId for API
        activityScope: general.activityScope || "4",
        publicationStatus: publish ? "published" : (general.publicationStatus || "draft"),
        user: user ? { id: user.id } : undefined,
      };

      let activityId = general.id;

      // If no ID, create first via POST with essential fields
      if (!activityId) {
        console.log('[DEBUG] Creating new activity via POST');
        const createRes = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!createRes.ok) {
          const errorText = await createRes.text();
          console.error('[DEBUG] POST failed:', errorText);
          throw new Error(errorText);
        }
        const created = await createRes.json();
        console.log('[DEBUG] POST successful, created activity:', created.id);
        activityId = created.id;
        setGeneral((g: any) => ({ ...g, id: created.id, uuid: created.uuid || created.id }));
        setShowActivityCreatedAlert(true);
      } else {
        console.log('[DEBUG] Updating existing activity via PATCH');
        // Now persist the full General tab via PATCH
        const patchRes = await fetch(`/api/activities/${activityId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!patchRes.ok) {
          const errorText = await patchRes.text();
          console.error('[DEBUG] PATCH failed:', errorText);
          throw new Error(errorText);
        }
        console.log('[DEBUG] PATCH successful');
        // Some backends return 204 No Content for PATCH. Avoid awaiting JSON which can hang.
        try { await patchRes.text(); } catch (_) { /* ignore */ }
      }

      setHasUnsavedChanges(false);
      
      // Show appropriate toast message based on whether we created or updated
      if (!general.id) {
        // Activity was just created
        toast.success(
          <div className="flex items-center gap-2">
            <PartyPopper className="h-4 w-4" />
            <span>Activity created! All tabs are now unlocked and ready to use.</span>
          </div>,
          {
            duration: 4000,
            position: 'top-center'
          }
        );
      } else {
        // Activity was updated
        toast.success(publish ? 'Published' : 'Saved');
      }
      
      console.log('[DEBUG] Save successful, clearing loading states');

      if (goToNext) {
        const nextId = getNextSection(activeSection);
        if (nextId) await handleTabChange(nextId);
      } else if (goToList) {
        window.location.href = '/activities';
      }
    } catch (e: any) {
      console.error('[Manual Save] Failed:', e);
      if (!suppressErrorToast) {
        toast.error('Failed to save');
      }
      throw e; // Re-throw so the caller can handle it
    } finally {
      console.log('[DEBUG] Finally block - clearing loading states');
      setSaving(false);
      setSavingAndNext(false);
    }
  }, [general, user, setHasUnsavedChanges, activeSection, getNextSection, handleTabChange]);

  // Add a function to get the appropriate skeleton for each tab
  const getTabSkeleton = (section: string) => {
    switch (section) {
      case 'metadata':
        return <GenericTabSkeleton />;
      case 'sectors':
        return <SectorAllocationSkeleton />;
      case 'humanitarian':
        return <GenericTabSkeleton />;
      case 'organisations':
        return <OrganisationsSkeleton />;
      case 'finances':
        return <FinancesSkeleton />;
      case 'budgets':
        return <GenericTabSkeleton />;
      case 'planned-disbursements':
        return <GenericTabSkeleton />;
      case 'locations':
        return <LocationsSkeleton />;
      case 'linked_activities':
        return <LinkedActivitiesSkeleton />;
      default:
        return <GenericTabSkeleton />;
    }
  };

  // Add navigationGroups here to match ActivityEditorNavigation
  const navigationGroups = [
    {
      title: "TOOLS",
      sections: [
        { id: "iati", label: "IATI Link" },
        { id: "xml-import", label: "IATI Import" }
      ]
    },
    {
      title: "Activity Overview",
      sections: [
        { id: "general", label: "General" },
        { id: "sectors", label: "Sectors" },
        { id: "humanitarian", label: "Humanitarian" },
        { id: "locations", label: "Locations" }
      ]
    },
    {
      title: "Stakeholders",
      sections: [
        { id: "organisations", label: "Participating Organisations" },
        { id: "contacts", label: "Contacts" },
        { id: "linked_activities", label: "Linked Activities" }
      ]
    },
    {
      title: "Funding & Delivery",
      sections: [
        { id: "finances", label: "Financial Information" },
        { id: "planned-disbursements", label: "Planned Disbursements" },
        { id: "budgets", label: "Budgets" },
        { id: "forward-spending-survey", label: "Forward Spend" },
        { id: "results", label: "Results" },
        { id: "capital-spend", label: "Capital Spend" },
        { id: "financing-terms", label: "Financing Terms" },
        { id: "conditions", label: "Conditions" }
      ]
    },
    {
      title: "Strategic Alignment",
      sections: [
        { id: "sdg", label: "SDG Alignment" },
        { id: "country-budget", label: "Budget Mapping" },
        { id: "tags", label: "Tags" },
        { id: "working_groups", label: "Working Groups" },
        { id: "policy_markers", label: "Policy Markers" }
      ]
    },
    {
      title: "Supporting Info",
      sections: [
        { id: "documents", label: "Documents & Images" },
        { id: "aid_effectiveness", label: "Aid Effectiveness" }
      ]
    },
    {
      title: "Administration",
      sections: [
        { id: "metadata", label: "Metadata" },
        ...(showGovernmentInputs ? [{ id: "government", label: "Government Inputs" }] : []),
        ...(showGovernmentInputs ? [{ id: "government_endorsement", label: "Government Endorsement" }] : [])
      ]
    }
  ];
  const allSections = navigationGroups.flatMap(g => g.sections);
  const currentSectionIndex = allSections.findIndex(s => s.id === activeSection);
  const isLastSection = currentSectionIndex === allSections.length - 1;
  const isFirstSection = currentSectionIndex === 0;
  const nextSection = !isLastSection ? allSections[currentSectionIndex + 1] : null;
  const previousSection = !isFirstSection ? allSections[currentSectionIndex - 1] : null;

  if (loading) {
    return (
      <MainLayout>
        <ActivityEditorSkeleton />
      </MainLayout>
    );
  }

  // Always show the activity editor form - no modal needed

  return (
    <MainLayout>
      <DropdownProvider>
        {/* Field-level autosave system - no wrapper needed */}
        <div>
        {/* 3-Column Layout: Main Sidebar (fixed by MainLayout) | Editor Nav | Main Panel */}
        <div className="flex h-[calc(100vh-6rem)] overflow-hidden gap-x-6 lg:gap-x-8">
        {/* Activity Editor Navigation Panel */}
        <aside className="w-80 flex-shrink-0 bg-white overflow-y-auto pb-24">
          {/* Activity Metadata Summary - Only show when editing */}
          {isEditing && general.id && (
            <div className="bg-white p-4">
              <div className="space-y-2 text-sm">
                <div className="mb-3">
                    <Link
                      href={`/activities/${general.id}`}
                      className="text-lg font-semibold text-gray-900 leading-tight cursor-pointer transition-opacity duration-200 hover:opacity-80 inline"
                      title={`View activity profile: ${general.title || 'Untitled Activity'}${general.acronym ? ` (${general.acronym})` : ''}`}
                    >
                      {general.title || 'Untitled Activity'}
                      {general.acronym && <span className="text-sm text-gray-500"> ({general.acronym})</span>}
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const titleText = `${general.title || 'Untitled Activity'}${general.acronym ? ` (${general.acronym})` : ''}`;
                        navigator.clipboard.writeText(titleText);
                        toast.success('Activity title copied to clipboard');
                      }}
                      className="ml-1 p-1 hover:bg-gray-100 rounded transition-colors inline-flex items-center align-middle"
                      title="Copy activity title"
                    >
                      <Copy className="h-4 w-4 text-gray-600" />
                    </button>
                    {/* Activity Identifier and IATI ID */}
                    <div className="mt-2 space-y-1">
                      {general.partner_id && (
                        <div className="text-xs">
                          <span className="text-gray-600">Activity Identifier: </span>
                          <code className="inline px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-mono break-all" style={{ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' as const }}>
                            {general.partner_id}
                          </code>
                        </div>
                      )}
                      {general.iatiIdentifier && (
                        <div className="text-xs">
                          <code className="inline px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-mono break-all" style={{ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' as const }}>
                            {general.iatiIdentifier}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(general.iatiIdentifier);
                              toast.success('IATI ID copied to clipboard');
                            }}
                            className="ml-1 p-1 hover:bg-gray-100 rounded transition-colors inline-flex items-center align-middle"
                            title="Copy IATI ID"
                          >
                            <Copy className="h-3 w-3 text-gray-600" />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowActivityMetadata(!showActivityMetadata)}
                      className="text-xs text-gray-600 hover:text-gray-900 mt-2"
                    >
                      {showActivityMetadata ? 'Show less' : 'Show more'}
                    </button>
                  </div>
                  {/* Autosave Status Indicator removed per UX request */}
                  {/* Validation Status Badge */}
                  {general.submissionStatus && general.submissionStatus !== 'draft' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                        general.submissionStatus === 'submitted' ? 'text-blue-600 bg-blue-100' :
                        general.submissionStatus === 'validated' ? 'text-green-600 bg-green-100' :
                        general.submissionStatus === 'rejected' ? 'text-red-600 bg-red-100' :
                        general.submissionStatus === 'published' ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                      }`}>
                        {(() => {
                          switch (general.submissionStatus) {
                            case 'validated': return <><CheckCircle className="w-3 h-3" /> Validated</>
                            case 'published': return <><Megaphone className="w-3 h-3" /> Published</>
                            case 'submitted': return <><FileText className="w-3 h-3" /> Submitted</>
                            case 'rejected': return <><XCircle className="w-3 h-3" /> Rejected</>
                            default: return 'Unpublished'
                          }
                        })()}
                      </span>
                      {general.validatedByName && general.submissionStatus === 'validated' && (
                        <span className="text-xs text-gray-500">by {general.validatedByName}</span>
                      )}
                    </div>
                  )}
                  {showActivityMetadata && (
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-semibold">
                          Reported by {(() => {
                            if (general.created_by_org_name && general.created_by_org_acronym) {
                              return `${general.created_by_org_name} (${general.created_by_org_acronym})`;
                            }
                            return general.created_by_org_name || general.created_by_org_acronym || "Unknown Organization";
                          })()}
                        </p>
                        <p className="text-gray-600">
                          Submitted by {(() => {
                            // Format user name with position/role
                            if (general.createdBy?.name) {
                              const name = general.createdBy.name;
                              const position = (general.createdBy as any)?.jobTitle || (general.createdBy as any)?.title;
                              return position ? `${name}, ${position}` : name;
                            }
                            // Fallback to current user info with position/role
                            if (user?.name) {
                              const name = user.name;
                              const position = (user as any)?.jobTitle || (user as any)?.title;
                              return position ? `${name}, ${position}` : name;
                            }
                            return "Unknown User";
                          })()} on {general.createdAt ? format(new Date(general.createdAt), "d MMMM yyyy") : "Unknown date"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          
          {/* Activity Editor Navigation */}
          <div>
            <ActivityEditorNavigation
              activeSection={activeSection}
              onSectionChange={handleTabChange}
              showGovernmentInputs={showGovernmentInputs}
              activityCreated={!!general.id}
              tabCompletionStatus={tabCompletionStatus}
              disabled={isAnyAutosaveInProgress}
            />
          </div>
        </aside>

        {/* Main Content Panel */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="activity-editor pl-0 pr-6 md:pr-8 py-6 pb-24">
            <div className="flex items-center justify-end mb-6">
              <div className="flex items-center gap-6">
                {/* Publish Toggle */}
                                 {canPublish && (
                   <div className="flex items-center gap-4">
                     <span className="text-base font-semibold text-gray-700">Unpublished</span>
                     <Switch
                       checked={general.publicationStatus === 'published'}
                       onCheckedChange={async (checked) => {
                         if (checked) {
                           // Check if we have the required fields for publishing
                           if (!general.title?.trim() || !general.description?.trim() || !general.activityStatus || !general.plannedStartDate || !general.plannedEndDate) {
                             toast.error('Please fill in all required fields: Title, Description, Status, Planned Start Date, and Planned End Date');
                             return;
                           }

                           console.log('[AIMS] Attempting to publish activity');
                           const originalStatus = general.publicationStatus;

                           // Optimistically update the UI
                           setGeneral((prev: any) => ({ ...prev, publicationStatus: 'published' }));

                           try {
                             await saveActivity({ publish: true, suppressErrorToast: true });
                             console.log('[AIMS] Publish successful');
                           } catch (error) {
                             console.error('[AIMS] Publish failed, reverting state:', error);
                             // Revert the optimistic update on failure
                             setGeneral((prev: any) => ({ ...prev, publicationStatus: originalStatus }));
                             toast.error('Failed to publish activity. Please try again.');
                           }
                         } else {
                           // Unpublish the activity
                           console.log('[AIMS] Attempting to unpublish activity');
                           const originalStatus = general.publicationStatus;

                           // Optimistically update the UI
                           setGeneral((prev: any) => ({ ...prev, publicationStatus: 'draft' }));

                           try {
                             await saveActivity({ publish: false, suppressErrorToast: true });
                             console.log('[AIMS] Unpublish successful');
                           } catch (error) {
                             console.error('[AIMS] Unpublish failed, reverting state:', error);
                             // Revert the optimistic update on failure
                             setGeneral((prev: any) => ({ ...prev, publicationStatus: originalStatus }));
                             toast.error('Failed to unpublish activity. Please try again.');
                           }
                         }
                       }}
                       disabled={
                         // Disable only when minimum required fields are missing
                         (!general.title?.trim() || !general.description?.trim() ||
                          !general.activityStatus || !general.plannedStartDate || !general.plannedEndDate)
                       }
                       className="data-[state=checked]:bg-[#4C5568] scale-125"
                       title="Minimum required for publishing: Activity Title, Description, Activity Status, Planned Start Date, and Planned End Date"
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
          
          <div className="px-0 pr-6 md:pr-8 pb-32">
            <section>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-semibold">{getSectionLabel(activeSection)}</h2>
                <HelpTextTooltip content={getSectionHelpText(activeSection)}>
                  <HelpCircle className="w-5 h-5 text-gray-500 hover:text-gray-700 cursor-help" />
                </HelpTextTooltip>
              </div>
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
                    setTransactions={setTransactions}
                    refreshTransactions={refreshTransactions}
                    transactionId={transactionId}
                    extendingPartners={extendingPartners}
                    setExtendingPartners={setExtendingPartners}
                    implementingPartners={implementingPartners}
                    setImplementingPartners={setImplementingPartners}
                    governmentPartners={governmentPartners}
                    setGovernmentPartners={setGovernmentPartners}
                    fundingPartners={fundingPartners}
                    setFundingPartners={setFundingPartners}
                    contacts={contacts}
                    setContacts={setContacts}
                    updateContacts={setContacts}
                    governmentInputs={governmentInputs}
                    setGovernmentInputs={setGovernmentInputs}
                    sdgMappings={sdgMappings}
                    setSdgMappings={setSdgMappings}
                    tags={tags}
                    setTags={setTags}
                    workingGroups={workingGroups}
                    setWorkingGroups={setWorkingGroups}
                    policyMarkers={policyMarkers}
                    setPolicyMarkers={setPolicyMarkers}
                    specificLocations={specificLocations}
                    onSectionChange={setActiveSection}
                    getNextSection={getNextSection}
                    getPreviousSection={getPreviousSection}
                    setSpecificLocations={setSpecificLocations}
                    coverageAreas={coverageAreas}
                    setCoverageAreas={setCoverageAreas}
                    countries={countries}
                    setCountries={setCountries}
                    regions={regions}
                    setRegions={setRegions}
                    advancedLocations={advancedLocations}
                    setAdvancedLocations={setAdvancedLocations}
                    permissions={permissions}
                    setSectorValidation={setSectorValidation}
                    setSectorsCompletionStatus={setSectorsCompletionStatusWithLogging}
                    activityScope={activityScope}
                    setActivityScope={setActivityScope}
                    user={user}
                    getDateFieldStatus={getDateFieldStatus}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                    updateActivityNestedField={updateActivityNestedField}
                    setShowActivityCreatedAlert={setShowActivityCreatedAlert}
                    onTitleAutosaveState={(state: { isSaving: boolean; hasUnsavedChanges: boolean; lastSaved: Date | null; error: any }, id: string) => { setTitleAutosaveState(state); setActivityId(id); }}
                    tabCompletionStatus={tabCompletionStatus}
                    budgets={budgets}
                    setBudgets={setBudgets}
                    budgetNotProvided={budgetNotProvided}
                    setBudgetNotProvided={setBudgetNotProvided}
                    plannedDisbursements={plannedDisbursements}
                    setPlannedDisbursements={setPlannedDisbursements}
                    handlePlannedDisbursementsChange={handlePlannedDisbursementsChange}
                    handleResultsChange={handleResultsChange}
                    documents={documents}
                    setDocuments={setDocuments}
                    documentsAutosave={documentsAutosave}
                    governmentInputsAutosave={governmentInputsAutosave}
                    setIatiSyncState={setIatiSyncState}
                    subnationalBreakdowns={subnationalBreakdowns}
                    setSubnationalBreakdowns={setSubnationalBreakdowns}
                    setParticipatingOrgsCount={setParticipatingOrgsCount}
                    setLinkedActivitiesCount={setLinkedActivitiesCount}
                    setResultsCount={setResultsCount}
                    setCapitalSpendPercentage={setCapitalSpendPercentage}
                    setConditionsCount={setConditionsCount}
                    setFinancingTermsCount={setFinancingTermsCount}
                    setCountryBudgetItemsCount={setCountryBudgetItemsCount}
                    setForwardSpendCount={setForwardSpendCount}
                    clearSavedFormData={clearSavedFormData}
                    loadedTabs={loadedTabs}
                    setHumanitarian={setHumanitarian}
                    setHumanitarianScopes={setHumanitarianScopes}
                    setFocalPointsCount={setFocalPointsCount}
                    onGeographyLevelChange={handleGeographyLevelChange}
                    isNewActivity={!isEditing}
                  />
                </div>
              )}
            </section>
          </div>
          
          {/* Combined Footer with Navigation and Validation Actions */}
          <footer className={`fixed bottom-0 right-0 bg-transparent py-4 px-8 transition-all duration-400 ${sidebarCollapsed ? 'left-20' : 'left-72'} ${isModalOpen ? 'z-[40]' : 'z-[60]'}`}>
            <div className="max-w-full flex items-center justify-between gap-4">
              {/* Left side: Validation Actions */}
              <div className="flex items-center gap-4">
                {/* Validation Actions for Tier 1 Users */}
                {canValidate && general.submissionStatus === 'submitted' && (
                  <>
                    <button
                      className="bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                      type="button"
                      onClick={() => console.log('Approve clicked')}
                      disabled={submitting}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                      type="button"
                      onClick={() => {
                        const reason = window.prompt("Please provide a reason for rejection:");
                        if (reason) console.log('Reject clicked:', reason);
                      }}
                      disabled={submitting}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </>
                )}

                {/* Submit for Validation - For Tier 2 users with draft activities */}
                {canSubmit && general.submissionStatus === 'draft' && general.id && (
                  <button
                    className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                    type="button"
                    onClick={() => console.log('Submit for validation')}
                    disabled={submitting}
                  >
                    <Send className="h-4 w-4" />
                    Submit for Validation
                  </button>
                )}
              </div>

              {/* Center: Empty space for cleaner footer */}
              <div className="flex-1"></div>

              {/* Right side: Comments + Back + Save + Save & Next Navigation Buttons */}
              <div className={`flex items-center gap-3 transition-all ${isModalOpen ? 'blur-sm pointer-events-none' : ''}`}>
                {/* Comments Button */}
                {general.id ? (
                  <Button
                    variant="outline"
                    className="px-4 py-3 text-base font-semibold"
                    onClick={() => {
                      console.log('[Comments] Opening drawer for activity:', general.id);
                      setIsCommentsDrawerOpen(true);
                    }}
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Comments
                    {comments.length > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                        {comments.length}
                      </span>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="px-4 py-3 text-base font-semibold opacity-50 cursor-not-allowed"
                    disabled
                    title="Enter a title to enable comments"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Comments</span>
                  </Button>
                )}
                {/* Back Button */}
                <Button
                  variant="outline"
                  className="px-6 py-3 text-base font-semibold"
                  onClick={() => previousSection && handleTabChange(previousSection.id)}
                  disabled={!previousSection || tabLoading || isAnyAutosaveInProgress}
                  title={isAnyAutosaveInProgress ? "Please wait while saving..." : undefined}
                >
                  {tabLoading ? (
                    <>
                      <CircleDashed className="mr-2 h-5 w-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      Back
                    </>
                  )}
                </Button>

                {/* Save Button - Only show for existing activities */}
                {general.id && (
                  <Button
                    variant="outline"
                    className="px-6 py-3 text-base font-semibold"
                    onClick={() => saveActivity({})}
                    disabled={saving || tabLoading}
                  >
                    {saving ? (
                      <>
                        <CircleDashed className="mr-2 h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        Save
                      </>
                    )}
                  </Button>
                )}

                {/* Save & Next Button */}
                <Button
                  variant="default"
                  className="px-6 py-3 text-base font-semibold min-w-[160px]"
                  onClick={() => {
                    if (nextSection) {
                      saveActivity({ goToNext: true });
                    }
                  }}
                  disabled={!general.id || isLastSection || tabLoading || savingAndNext}
                  title={!general.id ? "Activity will be created automatically when you enter a title" : (savingAndNext ? "Saving activity..." : undefined)}
                >
                  <>
                    Save & Next
                    {savingAndNext ? (
                      <CircleDashed className="ml-2 h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowRight className="ml-2 h-5 w-5" />
                    )}
                  </>
                </Button>
              </div>
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
        activityId={general.id || ''}
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
      
      {/* Debug Panel - Disabled for field-level autosave */}
      
      {/* Debug Panel - Temporarily disabled to fix loading issue */}
      {/* <DebugPanel /> */}
        </div>
      </DropdownProvider>
    </MainLayout>
  );
}

export default function NewActivityPage() {
  return (
    <AsyncErrorBoundary 
      fallback="page"
      onError={(error, errorInfo) => {
        console.error('Activity Editor Error:', error, errorInfo);
      }}
    >
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <NewActivityPageContent />
      </Suspense>
    </AsyncErrorBoundary>
  );
}