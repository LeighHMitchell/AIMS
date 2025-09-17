"use client"

export const dynamic = 'force-dynamic';

import React, { useState, useCallback, useEffect, useMemo, Suspense, useRef } from "react";
import Image from "next/image";
import { MainLayout } from "@/components/layout/main-layout";
import { useRouter, useSearchParams } from "next/navigation";
import { EnhancedFinancesSection } from "@/components/activities/EnhancedFinancesSection";
import ImprovedSectorAllocationForm from "@/components/activities/ImprovedSectorAllocationForm";
import OrganisationsSection from "@/components/OrganisationsSection";
import ContactsSection from "@/components/ContactsSection";
import { GovernmentInputsSectionEnhanced } from "@/components/GovernmentInputsSectionEnhanced";
import ContributorsSection from "@/components/ContributorsSection";
import { BannerUpload } from "@/components/BannerUpload";
import { IconUpload } from "@/components/IconUpload";
import { toast } from "sonner";
import { Transaction } from "@/types/transaction";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityStatusSelect } from "@/components/forms/ActivityStatusSelect";
import { CollaborationTypeSelect } from "@/components/forms/CollaborationTypeSelect";
import { ActivityScopeSearchableSelect } from "@/components/forms/ActivityScopeSearchableSelect";
import { DropdownProvider } from "@/contexts/DropdownContext";
import { LinkedActivityTitle } from "@/components/ui/linked-activity-title";
import { CreateActivityModal } from "@/components/modals/CreateActivityModal";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EnhancedDatePicker } from "@/components/ui/enhanced-date-picker";
import { format } from "date-fns";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, AlertCircle, CheckCircle, XCircle, Send, Users, X, UserPlus, ChevronLeft, ChevronRight, HelpCircle, Save, ArrowRight, ArrowLeft, Globe, RefreshCw, ShieldCheck, PartyPopper, Lock, Copy, ExternalLink, Info, Share, CircleDashed } from "lucide-react";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FieldHelp, RequiredFieldIndicator, ActivityCompletionRating } from "@/components/ActivityFieldHelpers";
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
import { LabelSaveIndicator } from '@/components/ui/save-indicator';
import { getTabCompletionStatus } from "@/utils/tab-completion";

// Remove test utilities import that's causing module not found error
// if (process.env.NODE_ENV === 'development') {
//   import('@/utils/autosave-test');
// }


import { IATISyncPanel } from "@/components/activities/IATISyncPanel";
import IatiLinkTab from "@/components/activities/IatiLinkTab";
import XmlImportTab from "@/components/activities/XmlImportTab";
import ActivityBudgetsTab from "@/components/activities/ActivityBudgetsTab";
import PlannedDisbursementsTab from "@/components/activities/PlannedDisbursementsTab";
import { AidTypeSelect } from "@/components/forms/AidTypeSelect";
import { ResultsTab } from "@/components/activities/ResultsTab";
import MetadataTab from "@/components/activities/MetadataTab";
import FocalPointsTab from "@/components/activities/FocalPointsTab";
import { DocumentsAndImagesTabInline } from "@/components/activities/DocumentsAndImagesTabInline";
import { IatiDocumentLink } from "@/lib/iatiDocumentLink";

import GovernmentEndorsementTab from "@/components/activities/GovernmentEndorsementTab";

// Utility function to format date without timezone conversion
const formatDateToString = (date: Date | null): string => {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Separate component for General section to properly use hooks
function GeneralSection({ general, setGeneral, user, getDateFieldStatus, setHasUnsavedChanges, updateActivityNestedField, setShowActivityCreatedAlert, onTitleAutosaveState, clearSavedFormData }: any) {
  const hasShownInitialToast = useRef(false);
  const lastSavedDescriptionRef = useRef<string>('');
  const hasUserEditedDescriptionRef = useRef(false);
  
  // Track pending autosave operations
  const [pendingSaves, setPendingSaves] = useState(new Set<string>());

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

  // Initialize tracking refs with current data on first load
  useEffect(() => {
    lastSavedDescriptionRef.current = general.description || '';
    // Reset the edit flag when the component mounts or when switching between activities
    hasUserEditedDescriptionRef.current = false;
  }, [general.id]); // Only reset when activity ID changes

  // Field-level autosave hooks with context-aware success callbacks
  // Pass 'NEW' for new activities to trigger creation on first save
  // IMPORTANT: All hooks must be called before any early returns (Rules of Hooks)
  const effectiveActivityId = general.id || 'NEW';
  const descriptionAutosave = useFieldAutosave('description', { 
    activityId: effectiveActivityId,
    userId: user?.id,
    debounceMs: 3000, // Longer debounce for rich text
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data, isUserInitiated = false) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      // Only show toast if this was a user-initiated change AND the user has actually edited the description
      if (isUserInitiated && hasUserEditedDescriptionRef.current) {
        toast.success('Description saved', { position: 'top-right' });
        lastSavedDescriptionRef.current = general.description || '';
      }
    }
  });

  const descriptionObjectivesAutosave = useFieldAutosave('descriptionObjectives', { 
    activityId: effectiveActivityId,
    userId: user?.id,
    debounceMs: 3000, // Longer debounce for rich text
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data, isUserInitiated = false) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      if (isUserInitiated) {
        toast.success('Objectives saved', { position: 'top-right' });
      }
    }
  });

  const descriptionTargetGroupsAutosave = useFieldAutosave('descriptionTargetGroups', { 
    activityId: effectiveActivityId,
    userId: user?.id,
    debounceMs: 3000, // Longer debounce for rich text
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data, isUserInitiated = false) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      if (isUserInitiated) {
        toast.success('Target Groups saved', { position: 'top-right' });
      }
    }
  });

  const descriptionOtherAutosave = useFieldAutosave('descriptionOther', { 
    activityId: effectiveActivityId,
    userId: user?.id,
    debounceMs: 3000, // Longer debounce for rich text
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data, isUserInitiated = false) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      if (isUserInitiated) {
        toast.success('Other Description saved', { position: 'top-right' });
      }
    }
  });

  const collaborationTypeAutosave = useFieldAutosave('collaborationType', {
    activityId: effectiveActivityId,
    userId: user?.id,
    additionalData: {
      title: general.title || 'New Activity'
    },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      toast.success('Collaboration Type saved', { position: 'top-right' });
    },
  });

  const activityScopeAutosave = useFieldAutosave('activityScope', {
    activityId: effectiveActivityId,
    userId: user?.id,
    additionalData: {
      title: general.title || 'New Activity'
    },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      toast.success('Activity Scope saved', { position: 'top-right' });
    },
  });


  const publicationStatusAutosave = useFieldAutosave('publicationStatus', { 
    activityId: effectiveActivityId, 
    userId: user?.id,
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
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      toast.success('Planned Start Date saved', { position: 'top-right' });
    },
  });
  const plannedEndDateAutosave = useFieldAutosave('plannedEndDate', {
    activityId: effectiveActivityId,
    userId: user?.id,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      toast.success('Planned End Date saved', { position: 'top-right' });
    },
  });
  const actualStartDateAutosave = useFieldAutosave('actualStartDate', {
    activityId: effectiveActivityId,
    userId: user?.id,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      toast.success('Actual Start Date saved', { position: 'top-right' });
    },
  });
  const actualEndDateAutosave = useFieldAutosave('actualEndDate', {
    activityId: effectiveActivityId,
    userId: user?.id,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      toast.success('Actual End Date saved', { position: 'top-right' });
    },
  });
  
  // Context-aware autosave hooks for Activity ID and IATI Identifier
  const activityIdAutosave = useFieldAutosave('otherIdentifier', { 
    activityId: effectiveActivityId, 
    userId: user?.id,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data: any) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      if (general.id) {
        toast.success('Activity ID saved successfully', { position: 'top-right' });
      } else {
        toast.success('The Activity ID has been stored and will be saved after activity creation.', { position: 'top-right' });
      }
    }
  });
  
  const iatiIdentifierAutosave = useFieldAutosave('iatiIdentifier', { 
    activityId: effectiveActivityId, 
    userId: user?.id,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data: any) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      if (general.id) {
        toast.success('IATI Identifier saved successfully', { position: 'top-right' });
      } else {
        toast.success('The IATI Identifier has been stored and will be saved after activity creation.', { position: 'top-right' });
      }
    }
  });

  // Banner and Icon autosave hooks
  const bannerAutosave = useFieldAutosave('banner', {
    activityId: effectiveActivityId,
    userId: user?.id,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      toast.success('Activity Banner saved', { position: 'top-right' });
    },
  });
  const iconAutosave = useFieldAutosave('icon', {
    activityId: effectiveActivityId,
    userId: user?.id,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      toast.success('Activity Icon saved', { position: 'top-right' });
    },
  });

  // UUID autosave hook (read-only field)
  const uuidAutosave = useFieldAutosave('uuid', {
    activityId: effectiveActivityId,
    userId: user?.id,
    additionalData: { title: general.title || 'New Activity' },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      toast.success('UUID saved', { position: 'top-right' });
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

  const fieldLockStatus = getFieldLockStatus();

  // Copy function for identifier fields
  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${fieldName} copied to clipboard`, { position: 'top-right' });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy to clipboard', { position: 'top-right' });
    }
  };

  // Field-level autosave hooks with context-aware success callbacks
  const titleAutosave = useFieldAutosave('title', { 
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: true, // ✅ FIXED: Make title save immediately for consistency
    debounceMs: 500, // ✅ FIXED: Use shorter debounce for faster saves
    additionalData: {
      // Remove heavy image data from initial activity creation
      partnerId: general.otherIdentifier || null,
      iatiId: general.iatiIdentifier || null
    },
    onStart: () => {
      setPendingSaves(prev => new Set([...prev, 'title']));
    },
    onSuccess: (data) => {
      setPendingSaves(prev => {
        const newSet = new Set(prev);
        newSet.delete('title');
        return newSet;
      });
      if (data.id && !general.id) {
        // New activity was created
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
        
        // Upload images separately after activity creation to improve performance
        setTimeout(() => {
          // Check image sizes before uploading (base64 strings ~1.37x larger than original file)
          const maxImageSize = 2 * 1024 * 1024; // 2MB limit for base64 strings (~1.5MB actual file)
          
          if (general.banner) {
            if (general.banner.length > maxImageSize) {
              toast.error('Banner image is too large. Please use an image smaller than 1.5MB.');
            } else {
              // Stagger image uploads to prevent simultaneous heavy requests
              setTimeout(() => bannerAutosave.triggerFieldSave(general.banner), 200);
            }
          }
          if (general.icon) {
            if (general.icon.length > maxImageSize) {
              toast.error('Icon image is too large. Please use an image smaller than 1.5MB.');
            } else {
              // Upload icon after banner to prevent timeouts
              setTimeout(() => iconAutosave.triggerFieldSave(general.icon), 500);
            }
          }
        }, 100); // Small delay to ensure activity ID is set
        
        toast.success(
          <div className="flex items-center gap-2">
            <PartyPopper className="h-4 w-4" />
            <span>Activity created! All tabs are now unlocked and ready to use.</span>
          </div>,
          {
            duration: 4000,
            position: 'top-right'
          }
        );
      } else {
        // Existing activity title was updated
        toast.success('Activity Title saved', { position: 'top-right' });
      }
    },
    onError: (error) => {
      console.error('[Activity Creation] Failed to create activity:', error);
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          <span>Failed to create activity. Please try again.</span>
        </div>,
        {
          duration: 5000,
          position: 'top-right'
        }
      );
    }
  });

  const acronymAutosave = useFieldAutosave('acronym', {
    activityId: effectiveActivityId,
    userId: user?.id,
    immediate: true, // ✅ FIXED: Make acronym save immediately like title
    debounceMs: 500, // ✅ FIXED: Use same short debounce as title
    onStart: () => {
      setPendingSaves(prev => new Set([...prev, 'acronym']));
    },
    onSuccess: (data) => {
      setPendingSaves(prev => {
        const newSet = new Set(prev);
        newSet.delete('acronym');
        return newSet;
      });
      if (data.id && !general.id) {
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid || data.id }));
        setShowActivityCreatedAlert(true);
      }
      toast.success('Activity Acronym saved', { position: 'top-right' });
    }
  });

  // Show orange toast when creating activity
  React.useEffect(() => {
    const isNewActivity = !general.id;
    const isSaving = titleAutosave.state.isSaving;
    
    if (isNewActivity && isSaving && general.title) {
      toast(
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Creating activity... Please wait.</span>
        </div>,
        {
          id: 'creating-activity',
          duration: Infinity, // Keep showing until dismissed
          position: 'top-right',
          style: {
            background: '#fed7aa', // Orange background
            color: '#9a3412', // Dark orange text
            border: '1px solid #fdba74' // Orange border
          }
        }
      );
    } else if (general.id || titleAutosave.state.error) {
      // Dismiss the toast when activity is created or if there's an error
      toast.dismiss('creating-activity');
    }
  }, [titleAutosave.state.isSaving, titleAutosave.state.error, general.id, general.title]);

  // Expose title autosave state up
  React.useEffect(() => {
    if (onTitleAutosaveState) {
      onTitleAutosaveState(titleAutosave.state, general.id);
    }
  }, [titleAutosave.state, general.id]);

  // Show initial toast when component mounts if activity not created
  useEffect(() => {
    if (!general.id && !hasShownInitialToast.current) {
      toast.info("Start by entering an Activity Title to create the activity and unlock all form fields!", {
        position: 'top-right',
        duration: 5000,
      });
      hasShownInitialToast.current = true;
    }
  }, [general.id]);

  // Handler for when users click on disabled fields
  const handleDisabledFieldClick = (fieldName: string) => {
    if (!general.id) {
      toast.warning(`Please wait for the activity to be created to unlock the ${fieldName} field`, {
        position: 'top-right',
        duration: 3000,
      });
    }
  };

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
          <LabelSaveIndicator
            isSaving={bannerAutosave.state.isSaving}
            isSaved={bannerAutosave.state.isPersistentlySaved}
            hasValue={!!general.banner}
            className={`${!general.id ? 'text-gray-400' : 'text-gray-700'} mb-2`}
          >
            <div className="flex items-center gap-2">
              Activity Banner
              <HelpTextTooltip>
                Upload a banner image (1200×300 pixels) to visually represent the activity. This image will be displayed on the activity profile page, activity cards, and other locations across the application.
              </HelpTextTooltip>
            </div>
          </LabelSaveIndicator>
          <div 
            className={`flex-1 ${!general.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !general.id && handleDisabledFieldClick('Activity Banner')}
          >
            <BannerUpload
              currentBanner={general.banner}
              onBannerChange={banner => {
                if (general.id) {
                  setGeneral((g: any) => ({ ...g, banner }));
                  bannerAutosave.triggerFieldSave(banner);
                }
              }}
              activityId={general.id || "new"}
            />
          </div>
          {bannerAutosave.state.error && (
            <p className="text-xs text-red-600">Failed to save: {bannerAutosave.state.error.message}</p>
          )}
        </div>
        <div className="flex flex-col">
          <LabelSaveIndicator
            isSaving={iconAutosave.state.isSaving}
            isSaved={iconAutosave.state.isPersistentlySaved}
            hasValue={!!general.icon}
            className={`${!general.id ? 'text-gray-400' : 'text-gray-700'} mb-2`}
          >
            <div className="flex items-center gap-2">
              Activity Icon/Logo
              <HelpTextTooltip>
                Upload a square image (256×256 pixels) to represent the activity's icon or logo. This image will be displayed on the activity profile page, activity cards, and summaries across the application.
              </HelpTextTooltip>
            </div>
          </LabelSaveIndicator>
          <div 
            className={`flex-1 ${!general.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !general.id && handleDisabledFieldClick('Activity Icon/Logo')}
          >
            <IconUpload
              currentIcon={general.icon}
              onIconChange={icon => {
                if (general.id) {
                  setGeneral((g: any) => ({ ...g, icon }));
                  iconAutosave.triggerFieldSave(icon);
                }
              }}
              activityId={general.id || "new"}
            />
          </div>
          {iconAutosave.state.error && (
            <p className="text-xs text-red-600">Failed to save: {iconAutosave.state.error.message}</p>
          )}
        </div>
      </div>

      {/* Field-level Autosave for Title and Acronym */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Activity Title - takes up 3 columns */}
        <div className="lg:col-span-3 space-y-2">
          <LabelSaveIndicator
            isSaving={titleAutosave.state.isSaving}
            isSaved={titleAutosave.state.isPersistentlySaved}
            hasValue={!!general.title?.trim()}
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
                if (e.target.value.trim()) {
                  titleAutosave.triggerFieldSave(e.target.value);
                }
              }}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  titleAutosave.triggerFieldSave(e.target.value);
                }
              }}
              placeholder="Enter activity title"
              className="w-full"
            />
            {titleAutosave.state.error && (
              <p className="text-xs text-red-600 mt-1">{titleAutosave.state.error.toString()}</p>
            )}
          </div>
        </div>
        
        {/* Activity Acronym - takes up 1 column */}
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={acronymAutosave.state.isSaving}
            isSaved={acronymAutosave.state.isPersistentlySaved}
            hasValue={!!general.acronym?.trim()}
            className={`${!general.id ? 'text-gray-400' : 'text-gray-700'}`}
          >
            <div className="flex items-center gap-2">
              Activity Acronym
              <HelpTextTooltip>
                This field is used to record a short acronym or abbreviation for the activity. It helps users quickly identify and reference the activity across the application, especially in lists, cards, and summaries.
              </HelpTextTooltip>
            </div>
          </LabelSaveIndicator>
          <div>
            <Input
              id="acronym"
              value={general.acronym || ''}
              onChange={(e) => {
                setGeneral((g: any) => ({ ...g, acronym: e.target.value }));
                if (e.target.value.trim()) {
                  acronymAutosave.triggerFieldSave(e.target.value);
                }
              }}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  acronymAutosave.triggerFieldSave(e.target.value);
                }
              }}
              placeholder="Enter acronym"
              className="w-full"
            />
            {acronymAutosave.state.error && (
              <p className="text-xs text-red-600 mt-1">{acronymAutosave.state.error.toString()}</p>
            )}
          </div>
        </div>
      </div>

      {/* Auto-save notification for new activities */}
      {!general.id && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              <strong>Auto-save enabled:</strong> Your form data is automatically saved locally and will be restored if you refresh the page or navigate away.
            </span>
          </div>
        </div>
      )}

      {/* Activity ID, IATI Identifier, and UUID Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={activityIdAutosave.state.isSaving}
            isSaved={activityIdAutosave.state.isPersistentlySaved}
            hasValue={!!general.otherIdentifier?.trim()}
            className={!general.id ? 'text-gray-400' : 'text-gray-700'}
          >
            <div className="flex items-center gap-2">
              Activity ID
              <HelpTextTooltip>
                An internal identifier that is unique within the reporting organisation. Used for internal referencing and system management. Distinct from the IATI Identifier and typically follows the organisation's established naming conventions.
              </HelpTextTooltip>
            </div>
          </LabelSaveIndicator>
          <div className="relative">
            <Input
              id="activityId"
              type="text"
              value={general.otherIdentifier || ''}
              onChange={(e) => {
                if (general.title?.trim()) {
                  setGeneral((g: any) => ({ ...g, otherIdentifier: e.target.value }));
                }
              }}
              onBlur={(e) => {
                if (e.target.value.trim() && general.title?.trim()) {
                  if (general.id) {
                    activityIdAutosave.triggerFieldSave(e.target.value);
                  } else {
                    toast.success('The Activity ID has been stored and will be saved after activity creation.');
                  }
                }
              }}
              onClick={() => handleDisabledFieldClick('Activity ID')}
              placeholder="Enter your organization's activity ID"
              disabled={!general.id}
              className={!general.id ? 'bg-gray-50' : ''}
            />
            {general.otherIdentifier && (
              <button
                onClick={() => handleCopy(general.otherIdentifier, 'Activity ID')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                title="Copy Activity ID"
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
            className={!general.id ? 'text-gray-400' : 'text-gray-700'}
          >
            <div className="flex items-center gap-2">
              IATI Identifier
              <HelpTextTooltip>
                This field is used to link activities reported in the application with those in the IATI Registry. It allows users to match locally reported activities with existing entries and, if desired, to keep them synchronised with the IATI Registry.
              </HelpTextTooltip>
            </div>
          </LabelSaveIndicator>
          <div className="relative">
            <Input
              id="iatiIdentifier"
              type="text"
              value={general.iatiIdentifier || ''}
              onChange={(e) => {
                if (general.title?.trim()) {
                  setGeneral((g: any) => ({ ...g, iatiIdentifier: e.target.value }));
                }
              }}
              onBlur={(e) => {
                if (e.target.value.trim() && general.title?.trim()) {
                  if (general.id) {
                    iatiIdentifierAutosave.triggerFieldSave(e.target.value);
                  } else {
                    toast.success('The IATI Identifier has been stored and will be saved after activity creation.');
                  }
                }
              }}
              onClick={() => handleDisabledFieldClick('IATI Identifier')}
              placeholder="Enter IATI identifier"
              disabled={!general.id}
              className={!general.id ? 'bg-gray-50' : ''}
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
          <button
            type="button"
            onClick={() => setVisibleDescriptionFields(prev => ({ ...prev, objectives: !prev.objectives }))}
            className="w-full flex items-center gap-2 text-left hover:text-gray-900 focus:outline-none text-sm font-medium text-gray-700"
          >
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${visibleDescriptionFields.objectives ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Activity Description - Objectives
            <HelpTextTooltip>
              Describe the specific objectives that this activity aims to achieve. This should outline what the activity intends to accomplish and the changes it seeks to bring about.
            </HelpTextTooltip>
            {/* Save indicator positioned right after help tooltip */}
            {descriptionObjectivesAutosave.state.isSaving && (
              <CircleDashed className="w-4 h-4 text-orange-600 animate-spin" />
            )}
            {!descriptionObjectivesAutosave.state.isSaving && (descriptionObjectivesAutosave.state.isPersistentlySaved || !!general.descriptionObjectives?.trim()) && (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
          </button>
          {visibleDescriptionFields.objectives && (
            <div className="mt-2">
              <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
                <Textarea
                  value={general.descriptionObjectives || ''}
                  onChange={(e) => {
                    if (!fieldLockStatus.isLocked) {
                      setGeneral((g: any) => ({ ...g, descriptionObjectives: e.target.value }));
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
          <button
            type="button"
            onClick={() => setVisibleDescriptionFields(prev => ({ ...prev, targetGroups: !prev.targetGroups }))}
            className="w-full flex items-center gap-2 text-left hover:text-gray-900 focus:outline-none text-sm font-medium text-gray-700"
          >
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${visibleDescriptionFields.targetGroups ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Activity Description - Target Groups
            <HelpTextTooltip>
              Identify and describe the target groups that will benefit from this activity. Include information about demographics, locations, and any specific characteristics of the intended beneficiaries.
            </HelpTextTooltip>
            {/* Save indicator positioned right after help tooltip */}
            {descriptionTargetGroupsAutosave.state.isSaving && (
              <CircleDashed className="w-4 h-4 text-orange-600 animate-spin" />
            )}
            {!descriptionTargetGroupsAutosave.state.isSaving && (descriptionTargetGroupsAutosave.state.isPersistentlySaved || !!general.descriptionTargetGroups?.trim()) && (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
          </button>
          {visibleDescriptionFields.targetGroups && (
            <div className="mt-2">
              <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
                <Textarea
                  value={general.descriptionTargetGroups || ''}
                  onChange={(e) => {
                    if (!fieldLockStatus.isLocked) {
                      setGeneral((g: any) => ({ ...g, descriptionTargetGroups: e.target.value }));
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
          <button
            type="button"
            onClick={() => setVisibleDescriptionFields(prev => ({ ...prev, other: !prev.other }))}
            className="w-full flex items-center gap-2 text-left hover:text-gray-900 focus:outline-none text-sm font-medium text-gray-700"
          >
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${visibleDescriptionFields.other ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Activity Description - Other
            <HelpTextTooltip>
              Any additional information about the activity that doesn't fit into the general description or other categories. This could include context, background information, or other relevant details.
            </HelpTextTooltip>
            {/* Save indicator positioned right after help tooltip */}
            {descriptionOtherAutosave.state.isSaving && (
              <CircleDashed className="w-4 h-4 text-orange-600 animate-spin" />
            )}
            {!descriptionOtherAutosave.state.isSaving && (descriptionOtherAutosave.state.isPersistentlySaved || !!general.descriptionOther?.trim()) && (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
          </button>
          {visibleDescriptionFields.other && (
            <div className="mt-2">
              <div className={fieldLockStatus.isLocked ? 'opacity-50' : ''}>
                <Textarea
                  value={general.descriptionOther || ''}
                  onChange={(e) => {
                    if (!fieldLockStatus.isLocked) {
                      setGeneral((g: any) => ({ ...g, descriptionOther: e.target.value }));
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
                      position: 'top-right'
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
          <div className="w-full">
            {/* Empty column for now - can be used for another field later */}
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
            <EnhancedDatePicker
              value={general.plannedStartDate ? new Date(general.plannedStartDate + 'T00:00:00') : undefined}
              onChange={(date) => {
                if (!fieldLockStatus.isLocked) {
                  const dateString = formatDateToString(date);
                  setGeneral((g: any) => ({ ...g, plannedStartDate: dateString }));
                  plannedStartDateAutosave.triggerFieldSave(dateString);
                }
              }}
              placeholder="dd/mm/yyyy"
              format="dd/mm/yyyy"
              disabled={fieldLockStatus.isLocked}
              className={fieldLockStatus.isLocked ? "opacity-50" : ""}
            />
            {plannedStartDateAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {plannedStartDateAutosave.state.error.message}</p>}
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
            <EnhancedDatePicker
              value={general.plannedEndDate ? new Date(general.plannedEndDate + 'T00:00:00') : undefined}
              onChange={(date) => {
                if (!fieldLockStatus.isLocked) {
                  const dateString = formatDateToString(date);
                  setGeneral((g: any) => ({ ...g, plannedEndDate: dateString }));
                  plannedEndDateAutosave.triggerFieldSave(dateString);
                }
              }}
              placeholder="dd/mm/yyyy"
              format="dd/mm/yyyy"
              disabled={fieldLockStatus.isLocked}
              className={fieldLockStatus.isLocked ? "opacity-50" : ""}
            />
            {plannedEndDateAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {plannedEndDateAutosave.state.error.message}</p>}
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
            <EnhancedDatePicker
              value={general.actualStartDate ? new Date(general.actualStartDate + 'T00:00:00') : undefined}
              onChange={(date) => {
                if (!fieldLockStatus.isLocked && getDateFieldStatus().actualStartDate) {
                  const dateString = formatDateToString(date);
                  setGeneral((g: any) => ({ ...g, actualStartDate: dateString }));
                  actualStartDateAutosave.triggerFieldSave(dateString);
                }
              }}
              placeholder="dd/mm/yyyy"
              format="dd/mm/yyyy"
              disabled={fieldLockStatus.isLocked || !getDateFieldStatus().actualStartDate}
              className={(fieldLockStatus.isLocked || !getDateFieldStatus().actualStartDate) ? "opacity-50" : ""}
            />
            {actualStartDateAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {actualStartDateAutosave.state.error.message}</p>}
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
            <EnhancedDatePicker
              value={general.actualEndDate ? new Date(general.actualEndDate + 'T00:00:00') : undefined}
              onChange={(date) => {
                if (!fieldLockStatus.isLocked && getDateFieldStatus().actualEndDate) {
                  const dateString = formatDateToString(date);
                  setGeneral((g: any) => ({ ...g, actualEndDate: dateString }));
                  actualEndDateAutosave.triggerFieldSave(dateString);
                }
              }}
              placeholder="dd/mm/yyyy"
              format="dd/mm/yyyy"
              disabled={fieldLockStatus.isLocked || !getDateFieldStatus().actualEndDate}
              className={(fieldLockStatus.isLocked || !getDateFieldStatus().actualEndDate) ? "opacity-50" : ""}
            />
            {actualEndDateAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {actualEndDateAutosave.state.error.message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionContent({ section, general, setGeneral, sectors, setSectors, transactions, setTransactions, refreshTransactions, extendingPartners, setExtendingPartners, implementingPartners, setImplementingPartners, governmentPartners, setGovernmentPartners, fundingPartners, setFundingPartners, contacts, setContacts, updateContacts, governmentInputs, setGovernmentInputs, contributors, setContributors, sdgMappings, setSdgMappings, tags, setTags, workingGroups, setWorkingGroups, policyMarkers, setPolicyMarkers, specificLocations, setSpecificLocations, coverageAreas, setCoverageAreas, countries, setCountries, regions, setRegions, advancedLocations, setAdvancedLocations, permissions, setSectorValidation, setSectorsCompletionStatusWithLogging, activityScope, setActivityScope, user, getDateFieldStatus, setHasUnsavedChanges, updateActivityNestedField, setShowActivityCreatedAlert, onTitleAutosaveState, tabCompletionStatus, budgets, setBudgets, budgetNotProvided, setBudgetNotProvided, plannedDisbursements, setPlannedDisbursements, documents, setDocuments, documentsAutosave, focalPoints, setFocalPoints, setIatiSyncState, subnationalBreakdowns, setSubnationalBreakdowns, onSectionChange, getNextSection, getPreviousSection, setParticipatingOrgsCount, setContributorsCount, setLinkedActivitiesCount, setResultsCount, clearSavedFormData, loadedTabs }: any) {
  
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
      console.log('🔥 ACTIVITY EDITOR: Rendering XML Import section for activityId:', general.id);
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <XmlImportTab 
            activityId={general.id || ''}
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
            />
        </div>
      );
    case "contributors":
      return <ContributorsSection 
        contributors={contributors} 
        onChange={setContributors} 
        permissions={permissions}
        activityId={general.id}
        onContributorsChange={setContributorsCount}
      />;
    case "organisations":
      return <OrganisationsSection
        activityId={general.id}
        extendingPartners={extendingPartners}
        implementingPartners={implementingPartners}
        governmentPartners={governmentPartners}
        fundingPartners={fundingPartners}
        contributors={contributors}
        onParticipatingOrganizationsChange={setParticipatingOrgsCount}
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
      />;
    case "finances":
      return <EnhancedFinancesSection 
        activityId={general.id || "new"}
        general={general}
        transactions={transactions}
        onTransactionsChange={setTransactions}
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
        onDisbursementsChange={setPlannedDisbursements}
      />;
    case "results":
      return <ResultsTab 
        activityId={general.id} 
        readOnly={!permissions?.canEditActivity}
        onResultsChange={(results) => {
          setResultsCount(Array.isArray(results) ? results.length : 0);
        }}
        defaultLanguage="en"
      />;
    case "contacts":
      // Debug logging for partner data
      console.log('[ACTIVITY EDITOR DEBUG] Passing partner data to ContactsSection:', {
        extendingPartners,
        implementingPartners,
        governmentPartners,
        contributors
      });
      
      return <ContactsSection 
        contacts={contacts} 
        onChange={updateContacts} 
        activityId={general.id} 
        reportingOrgId={general.createdByOrg || general.reportingOrgId}
        reportingOrgName={general.created_by_org_name || general.created_by_org_acronym}
        extendingPartners={extendingPartners}
        implementingPartners={implementingPartners}
        governmentPartners={governmentPartners}
        contributors={contributors}
      />;
    case "focal_points":
      return <FocalPointsTab 
        activityId={general.id} 
        onFocalPointsChange={setFocalPoints}
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
      created_by_org_name: "",
      created_by_org_acronym: "",
      collaborationType: "",
      activityStatus: "1", // Default to Pipeline (IATI code 1)
      activityScope: "4", // Default to National
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
      otherIdentifier: "",
      uuid: "",
      autoSync: false,
      lastSyncTime: "",
      syncStatus: "not_synced" as "live" | "pending" | "outdated" | "not_synced",
      autoSyncFields: [] as string[]
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
  
  const [contributors, setContributors] = useState<any[]>([]);
  
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
  
  const [documents, setDocuments] = useState<any[]>([]);
  
  const [focalPoints, setFocalPoints] = useState<any[]>([]);
  
  const [subnationalBreakdowns, setSubnationalBreakdowns] = useState<Record<string, number>>({});

  // Add missing state variables
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false);
  const [participatingOrgsCount, setParticipatingOrgsCount] = useState<number>(0);
  const [contributorsCount, setContributorsCount] = useState<number>(0);
  const [linkedActivitiesCount, setLinkedActivitiesCount] = useState<number>(0);
  const [resultsCount, setResultsCount] = useState<number>(0);


  // Debug the participatingOrgsCount changes
  React.useEffect(() => {
    console.log('[NewActivityPage] participatingOrgsCount changed to:', participatingOrgsCount);
  }, [participatingOrgsCount]);

  // Debug the contributorsCount changes
  React.useEffect(() => {
    console.log('[NewActivityPage] contributorsCount changed to:', contributorsCount);
  }, [contributorsCount]);

  // Fetch participating organizations count on page load for tab completion
  React.useEffect(() => {
    const fetchParticipatingOrgsCount = async () => {
      if (!general.id) return;
      
      try {
        console.log('[NewActivityPage] Fetching participating orgs count for tab completion...');
        const response = await fetch(`/api/activities/${general.id}/participating-organizations`);
        
        if (response.ok) {
          const data = await response.json();
          const count = data.length || 0;
          console.log('[NewActivityPage] Found', count, 'participating organizations for tab completion');
          setParticipatingOrgsCount(count);
        } else {
          console.log('[NewActivityPage] Failed to fetch participating orgs for tab completion');
        }
      } catch (error) {
        console.error('[NewActivityPage] Error fetching participating orgs for tab completion:', error);
      }
    };

    fetchParticipatingOrgsCount();
  }, [general.id]);

  // Fetch contributors count on page load for tab completion
  React.useEffect(() => {
    const fetchContributorsCount = async () => {
      if (!general.id) return;
      
      try {
        console.log('[NewActivityPage] Fetching contributors count for tab completion...');
        const response = await fetch(`/api/activities/${general.id}/contributors`);
        
        if (response.ok) {
          const data = await response.json();
          const count = data.length || 0;
          console.log('[NewActivityPage] Found', count, 'contributors for tab completion');
          setContributorsCount(count);
        } else {
          console.log('[NewActivityPage] Failed to fetch contributors for tab completion');
        }
      } catch (error) {
        console.error('[NewActivityPage] Error fetching contributors for tab completion:', error);
      }
    };

    fetchContributorsCount();
  }, [general.id]);

  // Fetch linked activities count on page load for tab completion
  React.useEffect(() => {
    const fetchLinkedActivitiesCount = async () => {
      if (!general.id) return;
      try {
        const response = await fetch(`/api/activities/${general.id}/linked`);
        if (response.ok) {
          const data = await response.json();
          const count = Array.isArray(data) ? data.length : 0;
          setLinkedActivitiesCount(count);
        } else {
          setLinkedActivitiesCount(0);
        }
      } catch (error) {
        // If table missing or any error, treat as zero
        setLinkedActivitiesCount(0);
      }
    };

    fetchLinkedActivitiesCount();
  }, [general.id]);

  // Fetch results count on page load for tab completion
  React.useEffect(() => {
    const fetchResultsCount = async () => {
      if (!general.id) return;
      try {
        const response = await fetch(`/api/activities/${general.id}/results`);
        if (response.ok) {
          const data = await response.json();
          const count = Array.isArray(data?.results) ? data.results.length : 0;
          setResultsCount(count);
        } else {
          setResultsCount(0);
        }
      } catch (error) {
        setResultsCount(0);
      }
    };

    fetchResultsCount();
  }, [general.id]);

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
      contributors,
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
      focalPoints,
      subnationalBreakdowns
    };
    
    saveFormData(formData);
  }, [
    general, sectors, transactions, extendingPartners, implementingPartners,
    governmentPartners, contacts, governmentInputs, contributors, sdgMappings,
    tags, workingGroups, policyMarkers, specificLocations, coverageAreas,
    activityScope, budgets, plannedDisbursements, documents, focalPoints,
    subnationalBreakdowns, saveFormData
  ]);

  // Function to refresh transactions from server
  const refreshTransactions = useCallback(async () => {
    const activityId = searchParams?.get("id");
    if (!activityId) return;
    
    try {
      console.log('[AIMS] Refreshing transactions for activity:', activityId);
      const response = await fetch(`/api/activities/${activityId}`);
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

  // Clear form data when navigating to new activity (no ID in URL)
  useEffect(() => {
    const activityId = searchParams?.get("id");
    if (!activityId) {
      // We're creating a new activity - clear any saved form data
      console.log('[AIMS] Creating new activity - clearing form data');
      clearSavedFormData();
    }
  }, [searchParams, clearSavedFormData]);

  // Reset form state when navigating to new activity (no ID in URL)
  useEffect(() => {
    const activityId = searchParams?.get("id");
    if (!activityId) {
      // Reset all form state to blank defaults
      console.log('[AIMS] Resetting form state for new activity');
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
        descriptionObjectives: "",
        descriptionTargetGroups: "",
        descriptionOther: "",
        created_by_org_name: user?.organisation || user?.organization?.name || "",
        created_by_org_acronym: "",
        collaborationType: "",
        activityStatus: "1", // Default to Pipeline (IATI code 1)
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
        icon: "",
        createdBy: undefined,
        createdByOrg: user?.organizationId || "",
        createdAt: "",
        updatedAt: "",
        iatiIdentifier: "",
        otherIdentifier: "",
        uuid: "",
        autoSync: false,
        lastSyncTime: "",
        syncStatus: "not_synced",
        autoSyncFields: [],
        activityScope: "4",
        language: "en"
      });
      setSectors([]);
      setTransactions([]);
      setExtendingPartners([]);
      setImplementingPartners([]);
      setGovernmentPartners([]);
      setContacts([]);
      setGovernmentInputs({});
      setContributors([]);
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
      setFocalPoints([]);
      setSubnationalBreakdowns({});
    }
  }, [searchParams, user]);

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Check if any autosave is currently in progress - MUST be after all state variables
  const isAnyAutosaveInProgress = useMemo(() => {
    return (
      saving ||
      savingAndNext ||
      submitting ||
      publishing
    );
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
          throw new Error(`Failed to save government inputs: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[GovernmentInputsAutosave] Government inputs saved successfully');
        return result;
      } catch (error) {
        console.error('[GovernmentInputsAutosave] Failed to save government inputs:', error);
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
  }, [governmentInputs, general.id, user?.id, governmentInputsAutosave]);


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
    const loadActivity = async () => {
      try {
        const activityId = searchParams?.get("id");
        
        if (activityId) {
          // OPTIMIZATION: Use cached activity data if available
          console.log('[AIMS] Loading activity with cache:', activityId);
          
          // RACE CONDITION FIX: Wait for all pending autosave operations to complete
          // This ensures we get the most up-to-date data when loading after activity creation
          console.log('[AIMS] Waiting for pending autosave operations to complete...');
          
          // Wait for all pending saves to complete (with longer delay)
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for all pending saves
          
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
            descriptionObjectives: data.descriptionObjectives || "",
            descriptionTargetGroups: data.descriptionTargetGroups || "",
            descriptionOther: data.descriptionOther || "",
            created_by_org_name: data.created_by_org_name || "",
            created_by_org_acronym: data.created_by_org_acronym || "",
            collaborationType: data.collaborationType || "",
            activityStatus: data.activityStatus || "1",
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
            otherIdentifier: data.partnerId || data.otherIdentifier || "",
            uuid: data.id || "",
            autoSync: data.autoSync || false,
            lastSyncTime: data.lastSyncTime || "",
            syncStatus: data.syncStatus || "not_synced",
            autoSyncFields: data.autoSyncFields || [],
            activityScope: data.activityScope || "4",
            language: data.language || "en"
          });
          
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
          setTransactions(data.transactions || []);
          setTransactionsLoaded(true);
          setExtendingPartners(data.extendingPartners || []);
          setImplementingPartners(data.implementingPartners || []);
          setGovernmentPartners(data.governmentPartners || []);
          setContacts(data.contacts || []);
          setGovernmentInputs(data.governmentInputs || {});
          setContributors(data.contributors || []);
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

          // Fetch budgets for tab completion status
          try {
            const budgetsResponse = await fetch(`/api/activities/${activityId}/budgets`);
            if (budgetsResponse.ok) {
              const budgetsData = await budgetsResponse.json();
              setBudgets(budgetsData || []);
              console.log('[AIMS] Loaded budgets for tab completion:', budgetsData?.length || 0);
            }
          } catch (error) {
            console.warn('[AIMS] Failed to load budgets for tab completion:', error);
          }

          // Fetch budget exceptions to check "budget not provided" status
          try {
            const { data: budgetExceptions, error: budgetExceptionsError } = await supabase
              .from('activity_budget_exceptions')
              .select('*')
              .eq('activity_id', activityId)
              .single();
            
            if (!budgetExceptionsError && budgetExceptions) {
              setBudgetNotProvided(true);
              console.log('[AIMS] Found budget exception - budget not provided');
            } else {
              setBudgetNotProvided(false);
            }
          } catch (error) {
            console.warn('[AIMS] Failed to load budget exceptions for tab completion:', error);
            setBudgetNotProvided(false);
          }

          // Fetch planned disbursements for tab completion status  
          try {
            const disbursementsResponse = await fetch(`/api/activities/${activityId}/planned-disbursements`);
            if (disbursementsResponse.ok) {
              const disbursementsData = await disbursementsResponse.json();
              setPlannedDisbursements(disbursementsData || []);
              console.log('[AIMS] Loaded planned disbursements for tab completion:', disbursementsData?.length || 0);
            }
          } catch (error) {
            console.warn('[AIMS] Failed to load planned disbursements for tab completion:', error);
          }

          // Fetch subnational breakdown for tab completion status
          try {
            const subnationalResponse = await fetch(`/api/activities/${activityId}/subnational-breakdown`);
            if (subnationalResponse.ok) {
              const subnationalData = await subnationalResponse.json();
              const breakdownsMap: Record<string, number> = {};
              subnationalData.forEach((item: any) => {
                breakdownsMap[item.region_name] = item.percentage;
              });
              setSubnationalBreakdowns(breakdownsMap);
              console.log('[AIMS] Loaded subnational breakdown for tab completion:', Object.keys(breakdownsMap).length, 'regions');
            }
          } catch (error) {
            console.warn('[AIMS] Failed to load subnational breakdown for tab completion:', error);
          }

          // Fetch focal points for tab completion status
          try {
            const focalPointsResponse = await fetch(`/api/activities/${activityId}/focal-points`);
            if (focalPointsResponse.ok) {
              const focalPointsData = await focalPointsResponse.json();
              setFocalPoints(focalPointsData);
              console.log('[AIMS] Loaded focal points for tab completion:', focalPointsData);
            }
          } catch (error) {
            console.warn('[AIMS] Failed to load focal points for tab completion:', error);
          }
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
  }, [searchParams, user]);


  // REMOVED: localStorage persistence for existing activities
  // This was causing stale data issues on page refresh
  // Existing activities should always fetch fresh data from the API
  // localStorage is only used for NEW unsaved activities (handled by the other useEffect)

  // REMOVED: General tab rehydration logic
  // This was causing issues with stale localStorage data
  // All data should be loaded by the main useEffect on page load

  // Debug logging for user role
  console.log('[AIMS DEBUG] Current user:', user);
  console.log('[AIMS DEBUG] User role:', user?.role);
  console.log('[AIMS DEBUG] Role includes gov_partner:', user?.role?.includes('gov_partner'));
  
  // Build sections array based on user role
  // Also allow super_user to see government inputs
  const showGovernmentInputs = user?.role?.includes('gov_partner') || user?.role === 'super_user';
  
  const getSectionLabel = (sectionId: string): string => {
    const sectionLabels: Record<string, string> = {
      metadata: "Metadata",
      general: "General Information",
      iati: "IATI Sync",
      sectors: "Sectors",
      locations: "Activity Locations",
      subnational_breakdown: "Subnational Breakdown",
      organisations: "Organisations",
      contributors: "Activity Contributors",
      contacts: "Activity Contacts",
      focal_points: "Focal Points",
      linked_activities: "Linked Activities",
      finances: "Finances",
      results: "Results",
      sdg: "SDG Alignment",
      tags: "Tags",
      working_groups: "Working Groups",
      policy_markers: "Policy Markers",
      government: "Government Inputs",
      government_endorsement: "Government Endorsement",
      documents: "Documents & Images",
      aid_effectiveness: "Aid Effectiveness",
      budgets: "Budgets",
      "planned-disbursements": "Planned Disbursements",
      "xml-import": "XML Import"
    };
    return sectionLabels[sectionId] || sectionId;
  };

  const getSectionHelpText = (sectionId: string): string => {
    const sectionHelpTexts: Record<string, string> = {
      general: "This tab brings together the core details that define the activity, including its identifiers, title, description, imagery, collaboration type, status, and dates. Completing this section establishes the basic profile of the activity and provides a clear reference point for all other information entered elsewhere.",
      iati: "This tab controls synchronisation with the IATI Registry and Datastore. Enabling sync ensures that updates made to the activity in this system are reflected in your published IATI file, maintaining consistency between internal records and the official public dataset.",
      locations: "This tab records where the activity takes place. You can add locations using the map or by entering coordinates manually. Each location can include a name, type, address, and description, along with subnational breakdowns. These details establish the geographic footprint of the activity and allow analysis at the national, regional, or project-site level.",
      sectors: "This tab defines the focus areas of the activity. You select sub-sectors, and the system automatically links each choice to its corresponding sector and sector category. You can assign multiple sub-sectors and use percentage shares to show how the activity budget is divided. The allocations must add up to 100 percent, and a visual summary displays the distribution.",
      organisations: "This tab records the official roles of organisations involved in the activity. Participating organisations may be listed as extending partners, implementing partners, or government partners. Extending partners are entities that channel funds onward, implementing partners are responsible for delivering the activity, and government partners provide oversight or maintain responsibility under agreements such as MoUs. These roles define the structure of participation for reporting, while data entry permissions are managed separately in the Contributors tab.",
      contributors: "The Contributors tab identifies organisations that are permitted to add or update information within the activity record. Contributors can enter their own financial transactions, results, and implementation details, but this does not alter their formal role in the activity, which is defined in the Organisations tab. Each contributor sees and manages only their own entries, while the activity creator and designated government validators retain visibility across all contributions.",
      contacts: "The Contacts tab records key individuals associated with the activity, including their name, role, organisation, and contact details. It can also include a short narrative description of their responsibilities or function within the project. Adding contacts helps identify focal points for communication and coordination, while multiple entries allow both general enquiries and specific role-based contacts to be captured.",
      "focal_points": "The Focal Points tab designates the individuals accountable for maintaining and validating the activity record. Recipient government focal points are officials who review or endorse the activity, while development partner focal points are the main contacts responsible for updating and managing the information on behalf of their organisations. Assigning focal points ensures clarity on who is responsible for the accuracy and upkeep of the record.",
      "linked_activities": "The Linked Activities tab shows connections between this activity and others, defined through recognised relationship types such as parent, child, or related projects. Each linked activity is displayed with its title, identifier, and reporting organisation, along with its relationship to the current activity. A relationship visualisation provides a clear overview of how activities are structured and connected across partners.",
      tags: "Add custom tags to categorise this activity and make it easier to find through search and reporting. You can click on any tag to edit it inline. When creating tags, use clear and specific terms, such as \"water-infrastructure\" instead of simply \"water,\" to ensure accuracy. Tags ignore letter cases and will always be saved in lowercase. For consistency, try to reuse existing tags whenever possible. Careful tagging not only improves searchability but also strengthens the quality of filtering and reporting across activities.",
      working_groups: "In this section you can map the activity to the relevant technical or sector working groups. Doing so ensures that the activity is visible within the appropriate coordination structures, helps align it with other initiatives in the same area, and supports joint planning, monitoring and reporting. By linking your activity to the correct working group, you contribute to better coordination across partners and provide government and sector leads with a clearer picture of collective efforts.",
      policy_markers: "Assign OECD DAC and IATI-compliant policy markers to show how this activity addresses cross-cutting development issues. Policy markers are a standard way of signalling whether and to what extent an activity contributes to objectives such as gender equality, climate change, biodiversity, or disaster risk reduction. Each marker is scored to reflect the importance of the objective within the activity—for example, whether it is a principal objective, a significant objective, or not targeted at all. The Rio Markers are a specific subset that track environmental objectives in line with OECD DAC guidelines. Providing a short rationale alongside your chosen scores helps explain and justify the assessment, making the data more transparent and easier to interpret across organisations and reports.",
      documents: "You can drag and drop files into the upload area or click \"Choose Files\" to browse your computer. Supported formats include images (PNG, JPG, GIF), PDFs, Word documents, Excel sheets, and CSV files. Add a clear title and category so your uploads are easy to find later in the library.",
      "xml-import": "Import activity data from an IATI-compliant XML file. You can review and select which fields to import."
    };
    return sectionHelpTexts[sectionId] || "Complete this section to provide additional details about your activity.";
  };

  // Get permissions for current activity
  const permissions = getActivityPermissions(user, general.id ? { 
    ...general, 
    contributors,
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
    console.log('[DEBUG] tabCompletionStatus memo running, sectors.length:', sectors.length);
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
    
    console.log('[TabCompletion] Sectors completion status:', {
      sectorsCount: sectors.length,
      hasSectorsWithPercentage,
      totalSectorsPercentage,
      isSectorsProperlyAllocated,
      isSectorsDataComplete,
      sectorsCompletion
    });
    

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

    // SDG tab: green check if at least one SDG goal is mapped
    const sdgComplete = sdgMappings && sdgMappings.length > 0;

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
    console.log('[TabCompletion] participatingOrgsCount:', participatingOrgsCount);
    
    // Also check the old partner arrays as a fallback for debugging
    const legacyOrgCount = (extendingPartners?.length || 0) + (implementingPartners?.length || 0) + (governmentPartners?.length || 0);
    console.log('[TabCompletion] Legacy org count (extending + implementing + government):', legacyOrgCount);
    
    const organizationsCompletion = getTabCompletionStatus('organisations', 
      // Create a mock array with the actual count from the participating organizations
      Array(participatingOrgsCount).fill({})
    );
    console.log('[TabCompletion] organizationsCompletion:', organizationsCompletion);
    
    // Contributors tab: check if we have contributors
    console.log('[TabCompletion] contributorsCount:', contributorsCount);
    const contributorsCompletion = getTabCompletionStatus('contributors', 
      // Create a mock array with the actual count from the contributors
      Array(contributorsCount).fill({})
    );
    console.log('[TabCompletion] contributorsCompletion:', contributorsCompletion);
    
    // Contacts tab: check if we have contacts
    const contactsCompletion = getTabCompletionStatus('contacts', contacts);
    
    // Linked Activities tab: complete when there is at least one linked activity
    const linkedActivitiesCompletion = getTabCompletionStatus('linked-activities', Array(linkedActivitiesCount).fill({}));
    
    // Results tab: green check if at least one result exists
    const resultsCompletion = getTabCompletionStatus('results', Array(resultsCount).fill({}));
    
    // Documents & Images tab: green check if at least one document exists
    const documentsCompletion = getTabCompletionStatus('documents', documents);
    
    // Government Inputs tab: green check if at least one field is completed
    const governmentInputsCompletion = getTabCompletionStatus('government', governmentInputs);
    
    // Focal Points tab: green check if at least one focal point is assigned
    const focalPointsCompletion = getTabCompletionStatus('focal_points', focalPoints);
    
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
      contributors: contributorsCompletion ? { 
        isComplete: contributorsCompletion.isComplete,
        isInProgress: contributorsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      contacts: contactsCompletion ? { 
        isComplete: contactsCompletion.isComplete,
        isInProgress: contactsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
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
      results: resultsCompletion ? { 
        isComplete: resultsCompletion.isComplete,
        isInProgress: resultsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      documents: documentsCompletion ? { 
        isComplete: documentsCompletion.isComplete,
        isInProgress: documentsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      government: governmentInputsCompletion ? {
        isComplete: governmentInputsCompletion.isComplete,
        isInProgress: governmentInputsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      focal_points: focalPointsCompletion ? { 
        isComplete: focalPointsCompletion.isComplete,
        isInProgress: focalPointsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      sdg: { isComplete: sdgComplete, isInProgress: false },
      aid_effectiveness: aidEffectivenessCompletion ? {
        isComplete: aidEffectivenessCompletion.isComplete,
        isInProgress: aidEffectivenessCompletion.isInProgress
      } : { isComplete: false, isInProgress: false }
    }
  }, [general, sectors, getDateFieldStatus, sectorValidation, sectorsCompletionStatus, specificLocations, tags, workingGroups, policyMarkers, hasUnsavedChanges, transactions, budgets, budgetNotProvided, plannedDisbursements, sdgMappings, iatiSyncState, subnationalBreakdowns, extendingPartners, implementingPartners, governmentPartners, participatingOrgsCount, contributorsCount, linkedActivitiesCount, resultsCount, documents, governmentInputs, focalPoints]);

  // Helper to get next section id - moved here to avoid temporal dead zone
  const getNextSection = useCallback((currentId: string) => {
    const sections = [
      "general", "iati", "xml-import", "sectors", "locations", "organisations", "contributors", "contacts", 
      "focal_points", "linked_activities",
      "finances", "budgets", "planned-disbursements", "results", "sdg", "tags", "working_groups", "policy_markers", "government", "documents", "aid_effectiveness"
    ].filter(id => id !== "government" || showGovernmentInputs);
    
    const idx = sections.findIndex(s => s === currentId);
    return idx < sections.length - 1 ? sections[idx + 1] : null;
  }, [showGovernmentInputs]);

  // Helper to get previous section id
  const getPreviousSection = useCallback((currentId: string) => {
    const sections = [
      "general", "iati", "xml-import", "sectors", "locations", "organisations", "contributors", "contacts", 
      "focal_points", "linked_activities",
      "finances", "budgets", "planned-disbursements", "results", "sdg", "tags", "working_groups", "policy_markers", "government", "documents", "aid_effectiveness"
    ].filter(id => id !== "government" || showGovernmentInputs);
    
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
      // Store large data separately to avoid payload size issues
      const largeFields = {
        banner: general.banner,
        icon: general.icon,
        documents: documents
      };

      // Always construct a fresh payload for each call - EXCLUDE large base64 data
      const payload = {
        ...general,
        // EXPLICITLY EXCLUDE large base64 fields to prevent payload size issues
        banner: undefined,
        icon: undefined,
        // Map frontend fields to API fields
        partnerId: general.otherIdentifier || "", // Map otherIdentifier to partnerId for API
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
        // EXCLUDE documents from main payload - handle separately
        documents: [],
        // Handle status fields
        activityStatus: general.activityStatus || "1",
        publicationStatus: publish ? "published" : "draft",
        // Include user's organization ID for new activities
        createdByOrg: general.createdByOrg || user?.organizationId,
        // Include user information for logging
        user: user ? {
          id: user.id,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId
        } : null,
        // Include general_info structure for JSONB storage
        general_info: {}
      };

      // If we have an ID, include it in the payload for updates
      if (general.id) {
        payload.id = general.id;
      }

      // Debug payload size to identify large fields
      const payloadString = JSON.stringify(payload);
      const payloadSizeBytes = new TextEncoder().encode(payloadString).length;
      const payloadSizeMB = payloadSizeBytes / (1024 * 1024);
      
      console.log("[AIMS] Payload size analysis:", {
        totalSizeMB: payloadSizeMB.toFixed(2),
        totalSizeBytes: payloadSizeBytes,
        isLarge: payloadSizeMB > 5
      });
      
      // Analyze individual field sizes
      Object.keys(payload).forEach(key => {
        try {
          const fieldString = JSON.stringify((payload as any)[key]);
          const fieldSizeBytes = new TextEncoder().encode(fieldString).length;
          const fieldSizeMB = fieldSizeBytes / (1024 * 1024);
          if (fieldSizeMB > 0.1) { // Log fields larger than 100KB
            console.log(`[AIMS] Large field '${key}':`, {
              sizeMB: fieldSizeMB.toFixed(2),
              sizeBytes: fieldSizeBytes,
              type: typeof (payload as any)[key],
              isArray: Array.isArray((payload as any)[key])
            });
          }
        } catch (e) {
          console.log(`[AIMS] Could not analyze field '${key}':`, e);
        }
      });

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
        
        // Handle transaction warnings if present
        if (data.warnings && data.warnings.length > 0) {
          console.warn("[AIMS] Transaction warnings received:", data.warnings);
          toast.warning("Activity saved with transaction issues", {
            description: data.warnings.join('. '),
            duration: 8000
          });
        }
        
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
          
          // Now save large fields separately to avoid payload size issues
          console.log("[AIMS] Saving large fields separately...");
          
          // Save banner if present using field-level API
          if (largeFields.banner && largeFields.banner.startsWith('data:')) {
            try {
              console.log("[AIMS] Saving banner separately...");
              const bannerRes = await fetch(`/api/activities/field`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  activityId: data.id,
                  field: 'banner',
                  value: largeFields.banner,
                  user: user ? {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    organizationId: user.organizationId
                  } : null
                }),
              });
              if (bannerRes.ok) {
                console.log("[AIMS] Banner saved successfully");
              } else {
                console.warn("[AIMS] Banner save failed:", bannerRes.status);
              }
            } catch (bannerError) {
              console.error("[AIMS] Banner save error:", bannerError);
            }
          }
          
          // Save icon if present using field-level API
          if (largeFields.icon && largeFields.icon.startsWith('data:')) {
            try {
              console.log("[AIMS] Saving icon separately...");
              const iconRes = await fetch(`/api/activities/field`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                  activityId: data.id,
                  field: 'icon',
                  value: largeFields.icon,
                  user: user ? {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    organizationId: user.organizationId
                  } : null
                }),
              });
              if (iconRes.ok) {
                console.log("[AIMS] Icon saved successfully");
              } else {
                console.warn("[AIMS] Icon save failed:", iconRes.status);
              }
            } catch (iconError) {
              console.error("[AIMS] Icon save error:", iconError);
            }
          }
          
          console.log("[AIMS] Large fields processing complete");
        }
        
        // Update the state with the response data
        setGeneral({
          id: data.id,
          partnerId: data.partnerId || "",
          iatiId: data.iatiId || "",
          title: data.title || "",
          acronym: data.acronym || "",
          description: data.description || "",
          created_by_org_name: data.created_by_org_name || "",
          created_by_org_acronym: data.created_by_org_acronym || "",
          collaborationType: data.collaborationType || "",
          activityStatus: data.activityStatus || "1",
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
          plannedEndDate: data.plannedEndDate || "",
          actualStartDate: data.actualStartDate || "",
          actualEndDate: data.actualEndDate || "",
          banner: largeFields.banner || data.banner || "",
          icon: largeFields.icon || data.icon || "",
          createdBy: data.createdBy || undefined,
          createdByOrg: data.createdByOrg || "",
          createdAt: data.createdAt || "",
          updatedAt: data.updatedAt || "",
          iatiIdentifier: data.iatiIdentifier || "",
          otherIdentifier: data.partnerId || data.otherIdentifier || "",
          uuid: data.uuid || "",
          autoSync: data.autoSync || false,
          lastSyncTime: data.lastSyncTime || "",
          syncStatus: data.syncStatus || "not_synced",
          autoSyncFields: data.autoSyncFields || []
        });
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
        console.log('[AIMS DEBUG] After save - converting sectors:', data.sectors);
        console.log('[AIMS DEBUG] After save - to form format:', convertedSectors);
        setSectors(convertedSectors);
        setTransactions(data.transactions || []);
        setTransactionsLoaded(true);
        setExtendingPartners(data.extendingPartners || []);
        setImplementingPartners(data.implementingPartners || []);
        setGovernmentPartners(data.governmentPartners || []);
        setContacts(data.contacts || []);
        setGovernmentInputs(data.governmentInputs || {});
        if (data.locations) {
          console.log('[Activity New] Locations data received (2nd load):', data.locations);
          setSpecificLocations(data.locations.specificLocations || []);
          setCoverageAreas(data.locations.coverageAreas || []);
        } else {
          console.log('[Activity New] No locations data in response (2nd load)');
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
        
        // Show appropriate success message with warnings if any
        const successMsg = publish 
          ? "Activity published successfully"
          : (general.publicationStatus === 'published' && !publish) 
            ? "Activity unpublished successfully"
            : "Activity saved";
        
        // Handle warnings from unpublishing
        if (data.warnings && data.warnings.length > 0) {
          toast.success(successMsg);
          // Show warnings as info toasts
          data.warnings.forEach((warning: string) => {
            toast.info(`Warning: ${warning}`, { duration: 5000 });
          });
        } else {
          toast.success(successMsg);
        }
        
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
        
        // Provide more specific error messages for transaction failures
        if (errorData.error?.includes('Failed to save some transactions')) {
          let errorMessage = "Failed to save some transactions";
          
          if (errorData.warnings && errorData.warnings.length > 0) {
            errorMessage += "\n\nValidation Issues:\n• " + errorData.warnings.join('\n• ');
          }
          
          if (errorData.transactionError) {
            errorMessage += `\n\nDatabase Error: ${errorData.transactionError.message}`;
            if (errorData.transactionError.hint) {
              errorMessage += `\nSuggestion: ${errorData.transactionError.hint}`;
            }
          }
          
          throw new Error(errorMessage);
        } else {
          throw new Error(errorData.error || "Failed to save activity");
        }
      }
    } catch (err: any) {
      console.error("[AIMS] Error saving activity:", err);
      setError(err.message || "Failed to save activity");
      toast.error(err.message || "Failed to save activity");
      // Re-throw the error so callers can handle it
      throw err;
    } finally {
      setSubmitting(false);
      setSaving(false);
      setSavingAndNext(false);
      setPublishing(false);
    }
  }, [general, sectors, transactions, transactionsLoaded, extendingPartners, implementingPartners, governmentPartners, contacts, sdgMappings, tags, workingGroups, policyMarkers, activeSection, router, user, isEditing, sectorValidation, hasUnsavedChanges]);

  // OPTIMIZED: Enhanced tab change with lazy loading
  const handleTabChange = async (value: string) => {
    // Prevent tab change while saving
    if (isAnyAutosaveInProgress) {
      toast.warning('Please wait while saving before switching tabs');
      return;
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

  // Add a function to get the appropriate skeleton for each tab
  const getTabSkeleton = (section: string) => {
    switch (section) {
      case 'metadata':
        return <GenericTabSkeleton />;
      case 'sectors':
        return <SectorAllocationSkeleton />;
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
      case 'focal_points':
        return <GenericTabSkeleton />;
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
        { id: "xml-import", label: "XML Import" }
      ]
    },
    {
      title: "Activity Overview",
      sections: [
        { id: "general", label: "General" },
        { id: "sectors", label: "Sectors" },
        { id: "locations", label: "Locations" }
      ]
    },
    {
      title: "Stakeholders",
      sections: [
        { id: "organisations", label: "Organisations" },
        { id: "contributors", label: "Contributors" },
        { id: "contacts", label: "Contacts" },
        { id: "focal_points", label: "Focal Points" },
        { id: "linked_activities", label: "Linked Activities" }
      ]
    },
    {
      title: "Funding & Delivery",
      sections: [
        { id: "finances", label: "Financial Information" },
        { id: "budgets", label: "Budgets" },
        { id: "planned-disbursements", label: "Planned Disbursements" },
        { id: "results", label: "Results" }
      ]
    },
    {
      title: "Strategic Alignment",
      sections: [
        { id: "sdg", label: "SDG Alignment" },
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

  // Show modal for new activity creation
  if (!isEditing) {
    return (
      <MainLayout>
        <CreateActivityModal 
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            router.push('/activities');
          }}
        />
      </MainLayout>
    );
  }

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
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="space-y-2 text-sm">
                <div className="mb-3">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 text-left">
                        <LinkedActivityTitle
                          title={`${general.title || 'Untitled Activity'}${general.acronym ? ` (${general.acronym})` : ''}`}
                          activityId={general.id}
                          className="text-lg font-semibold text-gray-900 leading-tight break-words"
                          fallbackElement="h3"
                          showIcon={false}
                        />
                      </div>
                      <ExternalLink className="h-5 w-5 ml-2 text-gray-400 flex-shrink-0" />
                    </div>
                    <button
                      onClick={() => setShowActivityMetadata(!showActivityMetadata)}
                      className="text-xs text-gray-600 hover:text-gray-900 mt-1"
                    >
                      {showActivityMetadata ? 'Show less' : 'Show more'}
                    </button>
                  </div>
                  {/* Autosave Status Indicator removed per UX request */}
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
                            default: return 'Unpublished'
                          }
                        })()}
                      </span>
                      {general.validatedByName && general.submissionStatus === 'validated' && (
                        <span className="text-xs text-gray-500">by {general.validatedByName}</span>
                      )}
                    </div>
                  )}
                </div>
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
                            const position = general.createdBy.jobTitle || general.createdBy.title;
                            return position ? `${name}, ${position}` : name;
                          }
                          // Fallback to current user info with position/role
                          if (user?.name) {
                            const name = user.name;
                            const position = user.jobTitle || user.title;
                            return position ? `${name}, ${position}` : name;
                          }
                          return "Unknown User";
                        })()} on {general.createdAt ? format(new Date(general.createdAt), "d MMMM yyyy") : "Unknown date"}
                      </p>
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
        <main className="flex-1 min-w-0 overflow-y-auto bg-white">
          <div className="activity-editor pl-0 pr-6 md:pr-8 py-6 pb-24">
            <div className="flex items-center justify-end mb-6">
              <div className="flex items-center gap-6">
                {/* Publish Toggle */}
                                 {(canPublish || !isEditing) && (
                   <div className="flex items-center gap-4">
                     <span className="text-base font-semibold text-gray-700">Unpublished</span>
                     <TooltipProvider>
                       <Tooltip>
                         <TooltipTrigger asChild>
                           <div>
                             <Switch
                               checked={general.publicationStatus === 'published'}
                               onCheckedChange={async (checked) => {
                                 if (checked) {
                                   // Check if we have the required fields for publishing
                                   if (!general.title?.trim() || !general.description?.trim() || !general.activityStatus || !general.plannedStartDate || !general.plannedEndDate) {
                                     toast.error('Please fill in all required fields: Title, Description, Status, Planned Start Date, and Planned End Date');
                                     return;
                                   }
                                   saveActivity({ publish: true });
                                 } else {
                                   // Unpublish the activity
                                   console.log('[AIMS] Attempting to unpublish activity');
                                   const originalStatus = general.publicationStatus;
                                   
                                   // Optimistically update the UI
                                   setGeneral((prev: any) => ({ ...prev, publicationStatus: 'draft' }));
                                   
                                   try {
                                     await saveActivity({ publish: false });
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
                               className="data-[state=checked]:bg-green-600 scale-125"
                             />
                           </div>
                         </TooltipTrigger>
                         <TooltipContent className="max-w-sm">
                           <p className="text-sm">
                             Minimum required for publishing: Activity Title, Description, Activity Status, Planned Start Date, and Planned End Date. Complete these basic fields to enable the publish option.
                           </p>
                         </TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                     <span className="text-base font-semibold text-gray-700">Published</span>
                   </div>
                 )}
              </div>
            </div>
            
            {/* Activity Completion Rating Widget */}
            <div className="mb-6">
              <ActivityCompletionRating
                activity={general}
                transactions={transactions}
                sectors={sectors}
              />
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
                    documents={documents}
                    setDocuments={setDocuments}
                    documentsAutosave={documentsAutosave}
                    governmentInputsAutosave={governmentInputsAutosave}
                    focalPoints={focalPoints}
                    setFocalPoints={setFocalPoints}
                    setIatiSyncState={setIatiSyncState}
                    subnationalBreakdowns={subnationalBreakdowns}
                    setSubnationalBreakdowns={setSubnationalBreakdowns}
                    setParticipatingOrgsCount={setParticipatingOrgsCount}
                    setContributorsCount={setContributorsCount}
                    setLinkedActivitiesCount={setLinkedActivitiesCount}
                    setResultsCount={setResultsCount}
                    clearSavedFormData={clearSavedFormData}
                    loadedTabs={loadedTabs}
                  />
                </div>
              )}
            </section>
          </div>
          
          {/* Combined Footer with Navigation and Validation Actions */}
          <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-8 z-[60] shadow-lg">
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

              {/* Right side: Comments + Back + Next Navigation Buttons */}
              <div className="flex items-center gap-3">
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
                  {isAnyAutosaveInProgress ? (
                    <>
                      <CircleDashed className="mr-2 h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      Back
                    </>
                  )}
                </Button>

                {/* Next Button */}
                <Button
                  variant="default"
                  className="px-6 py-3 text-base font-semibold"
                  onClick={() => nextSection && handleTabChange(nextSection.id)}
                  disabled={isLastSection || tabLoading || isAnyAutosaveInProgress}
                  title={isAnyAutosaveInProgress ? "Please wait while saving..." : undefined}
                >
                  {isAnyAutosaveInProgress ? (
                    <>
                      Saving...
                      <CircleDashed className="ml-2 h-5 w-5 animate-spin" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
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