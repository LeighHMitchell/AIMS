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
import { MessageSquare, AlertCircle, CheckCircle, XCircle, Send, Users, X, UserPlus, ChevronLeft, ChevronRight, HelpCircle, Save, ArrowRight, ArrowLeft, Globe, RefreshCw, ShieldCheck, PartyPopper, Lock, Copy } from "lucide-react";
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
import PolicyMarkersSection from "@/components/PolicyMarkersSection";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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
// Removed old bulk autosave imports - now using field-level autosave
// import { AutosaveFormWrapper } from "@/components/forms/AutosaveFormWrapper";
// import { AutosaveDebugPanel } from "@/components/debug/AutosaveDebugPanel";
// import { useActivityAutosave } from "@/hooks/use-activity-autosave";
import { AutosaveStatus } from "@/components/AutosaveStatus";
import { ActivityEditorFieldAutosave } from '@/components/activities/ActivityEditorFieldAutosave';
import { useDescriptionAutosave, useDateFieldAutosave, useFieldAutosave } from '@/hooks/use-field-autosave-new';
import { LabelSaveIndicator } from '@/components/ui/save-indicator';
import { getTabCompletionStatus } from "@/utils/tab-completion";

// Remove test utilities import that's causing module not found error
// if (process.env.NODE_ENV === 'development') {
//   import('@/utils/autosave-test');
// }


import { IATISyncPanel } from "@/components/activities/IATISyncPanel";
import ActivityBudgetsTab from "@/components/activities/ActivityBudgetsTab";
import PlannedDisbursementsTab from "@/components/activities/PlannedDisbursementsTab";
import { AidTypeSelect } from "@/components/forms/AidTypeSelect";

// Separate component for General section to properly use hooks
function GeneralSection({ general, setGeneral, user, getDateFieldStatus, setHasUnsavedChanges, updateActivityNestedField, setShowActivityCreatedAlert, onTitleAutosaveState }: any) {
  // Field-level autosave hooks with context-aware success callbacks
  const descriptionAutosave = useDescriptionAutosave(general.id, user?.id);
  const collaborationTypeAutosave = useFieldAutosave('collaborationType', {
    activityId: general.id,
    userId: user?.id,
    onSuccess: () => {
      toast.success('Collaboration Type saved', { position: 'top-right' });
    },
  });
  const publicationStatusAutosave = useFieldAutosave('publicationStatus', { activityId: general.id, userId: user?.id });
  const plannedStartDateAutosave = useFieldAutosave('plannedStartDate', {
    activityId: general.id,
    userId: user?.id,
    onSuccess: () => {
      toast.success('Planned Start Date saved', { position: 'top-right' });
    },
  });
  const plannedEndDateAutosave = useFieldAutosave('plannedEndDate', {
    activityId: general.id,
    userId: user?.id,
    onSuccess: () => {
      toast.success('Planned End Date saved', { position: 'top-right' });
    },
  });
  const actualStartDateAutosave = useFieldAutosave('actualStartDate', {
    activityId: general.id,
    userId: user?.id,
    onSuccess: () => {
      toast.success('Actual Start Date saved', { position: 'top-right' });
    },
  });
  const actualEndDateAutosave = useFieldAutosave('actualEndDate', {
    activityId: general.id,
    userId: user?.id,
    onSuccess: () => {
      toast.success('Actual End Date saved', { position: 'top-right' });
    },
  });
  
  // Context-aware autosave hooks for Activity ID and IATI Identifier
  const activityIdAutosave = useFieldAutosave('otherIdentifier', { 
    activityId: general.id, 
    userId: user?.id,
    onSuccess: (data: any) => {
      if (general.id) {
        toast.success('Activity ID saved successfully', { position: 'top-right' });
      } else {
        toast.success('The Activity ID has been stored and will be saved after activity creation.', { position: 'top-right' });
      }
    }
  });
  
  const iatiIdentifierAutosave = useFieldAutosave('iatiIdentifier', { 
    activityId: general.id, 
    userId: user?.id,
    onSuccess: (data: any) => {
      if (general.id) {
        toast.success('IATI Identifier saved successfully', { position: 'top-right' });
      } else {
        toast.success('The IATI Identifier has been stored and will be saved after activity creation.', { position: 'top-right' });
      }
    }
  });

  // Banner and Icon autosave hooks
  const bannerAutosave = useFieldAutosave('banner', {
    activityId: general.id,
    userId: user?.id,
    onSuccess: () => toast.success('Activity Banner saved', { position: 'top-right' }),
  });
  const iconAutosave = useFieldAutosave('icon', {
    activityId: general.id,
    userId: user?.id,
    onSuccess: () => toast.success('Activity Icon saved', { position: 'top-right' }),
  });

  // UUID autosave hook (read-only field)
  const uuidAutosave = useFieldAutosave('uuid', {
    activityId: general.id,
    userId: user?.id,
    onSuccess: () => toast.success('UUID saved', { position: 'top-right' }),
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
    activityId: general.id,
    userId: user?.id,
    immediate: true,
    additionalData: {
      banner: general.banner || null,
      icon: general.icon || null,
      partnerId: general.otherIdentifier || null,
      iatiId: general.iatiIdentifier || null
    },
    onSuccess: (data) => {
      if (data.id && !general.id) {
        // New activity was created
        setGeneral((g: any) => ({ ...g, id: data.id, uuid: data.uuid }));
        setShowActivityCreatedAlert(true);
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
      }
    }
  });

  // Expose title autosave state up
  React.useEffect(() => {
    if (onTitleAutosaveState) {
      onTitleAutosaveState(titleAutosave.state, general.id);
    }
  }, [titleAutosave.state, general.id]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
      {/* Banner and Icon Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        <div className="lg:col-span-3 flex flex-col">
          <LabelSaveIndicator
            isSaving={bannerAutosave.state.isSaving}
            isSaved={!!general.banner}
            className="text-gray-700 mb-2"
          >
            <div className="flex items-center gap-2">
              Activity Banner
              <HelpTextTooltip>
                Upload a banner image (1200×300 pixels) to visually represent the activity. This image will appear on the activity profile page, activity cards, and other locations throughout the application.
              </HelpTextTooltip>
            </div>
          </LabelSaveIndicator>
          <div className="flex-1">
            <BannerUpload
              currentBanner={general.banner}
              onBannerChange={banner => {
                setGeneral((g: any) => ({ ...g, banner }));
                if (general.id) bannerAutosave.triggerFieldSave(banner);
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
            isSaved={!!general.icon}
            className="text-gray-700 mb-2"
          >
            <div className="flex items-center gap-2">
              Activity Icon/Logo
              <HelpTextTooltip>
                Upload a square image (256×256 pixels) to serve as the activity's icon or logo. It will be displayed on the activity profile page, activity cards, tables, and summaries across the application.
              </HelpTextTooltip>
            </div>
          </LabelSaveIndicator>
          <div className="flex-1">
            <IconUpload
              currentIcon={general.icon}
              onIconChange={icon => {
                setGeneral((g: any) => ({ ...g, icon }));
                if (general.id) iconAutosave.triggerFieldSave(icon);
              }}
              activityId={general.id || "new"}
            />
          </div>
          {iconAutosave.state.error && (
            <p className="text-xs text-red-600">Failed to save: {iconAutosave.state.error.message}</p>
          )}
        </div>
      </div>

      {/* Activity ID, IATI Identifier, and UUID Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={activityIdAutosave.state.isSaving}
            isSaved={!!general.otherIdentifier?.trim()}
            className="text-gray-700"
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
                setGeneral((g: any) => ({ ...g, otherIdentifier: e.target.value }));
              }}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  if (general.id) {
                    activityIdAutosave.triggerFieldSave(e.target.value);
                  } else {
                    toast.success('The Activity ID has been stored and will be saved after activity creation.');
                  }
                }
              }}
              placeholder="Enter your organization's activity ID"
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
            isSaved={!!general.iatiIdentifier?.trim()}
            className="text-gray-700"
          >
            <div className="flex items-center gap-2">
              IATI Identifier
              <HelpTextTooltip>
                A globally unique identifier that combines the reporting organisation's registered IATI prefix and the activity ID. Enables consistent linking and sharing of data in the IATI Registry.
              </HelpTextTooltip>
            </div>
          </LabelSaveIndicator>
          <div className="relative">
            <Input
              id="iatiIdentifier"
              type="text"
              value={general.iatiIdentifier || ''}
              onChange={(e) => {
                setGeneral((g: any) => ({ ...g, iatiIdentifier: e.target.value }));
              }}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  if (general.id) {
                    iatiIdentifierAutosave.triggerFieldSave(e.target.value);
                  } else {
                    toast.success('The IATI Identifier has been stored and will be saved after activity creation.');
                  }
                }
              }}
              placeholder="Enter IATI identifier"
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
            isSaved={!!general.uuid}
            className="text-gray-700"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Universally Unique Identifier
              </span>
              <HelpTextTooltip>
                A system-generated identifier automatically assigned when an activity is created. Ensures global uniqueness within the database.
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

      {/* Field-level Autosave for Title */}
      <div className="space-y-2">
        <LabelSaveIndicator
          isSaving={titleAutosave.state.isSaving}
          isSaved={!!general.title?.trim()}
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
              titleAutosave.triggerFieldSave(e.target.value);
            }}
            placeholder="Enter activity title"
            className="w-full"
          />
          {titleAutosave.state.error && (
            <p className="text-xs text-red-600 mt-1">{titleAutosave.state.error.toString()}</p>
          )}
        </div>
      </div>

      {/* Description with field-level autosave */}
      <div className="space-y-2">
        <LabelSaveIndicator
          isSaving={descriptionAutosave.state.isSaving}
          isSaved={!!general.description?.trim()}
          className={fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}
        >
                      <div className="flex items-center gap-2">
              Activity Description
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
          <RichTextEditor
            content={general.description || ''}
            onChange={(content) => {
              if (!fieldLockStatus.isLocked) {
                setGeneral((g: any) => ({ ...g, description: content }));
                descriptionAutosave.triggerFieldSave(content);
              }
            }}
            placeholder="Describe your activity's objectives, scope, and expected outcomes..."
            className="min-h-[300px]"
            disabled={fieldLockStatus.isLocked}
          />
        </div>
        {descriptionAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {descriptionAutosave.state.error.message}</p>}
      </div>

      {/* Row 6-7: All Type Selectors */}
      <div className="space-y-6">
        {/* Collaboration Type and Activity Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="w-full space-y-2">
            <LabelSaveIndicator
              isSaving={collaborationTypeAutosave.state.isSaving}
              isSaved={!!general.collaborationType}
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
                    console.log('[AIMS DEBUG] CollaborationType changed from', general.collaborationType, 'to', value);
                    setGeneral((g: any) => ({ ...g, collaborationType: value }));
                    collaborationTypeAutosave.triggerFieldSave(value);
                  }
                }}
                placeholder="Select Collaboration Type"
                disabled={fieldLockStatus.isLocked}
              />
            </div>
            {collaborationTypeAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {collaborationTypeAutosave.state.error.message}</p>}
          </div>
          <div className="w-full space-y-2">
            <LabelSaveIndicator
              isSaving={false}
              isSaved={!!general.activityStatus}
              className={fieldLockStatus.isLocked ? 'text-gray-400' : 'text-gray-700'}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Activity Status</span>
                <HelpTextTooltip>
                  Indicates the current phase of the activity. This field should be regularly updated to reflect the activity's progress over time.
                </HelpTextTooltip>
              </div>
            </LabelSaveIndicator>
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
      </div>

      {/* Row 8: Date Fields */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Activity Dates</h3>
          <HelpTextTooltip>
            Actual Start and End Dates become available based on the activity's status. The Actual Start Date is enabled once the status is set to Implementation or later. The Actual End Date becomes available when the status reaches Completion, Finalisation, or a subsequent phase.
          </HelpTextTooltip>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <LabelSaveIndicator
              isSaving={plannedStartDateAutosave.state.isSaving}
              isSaved={!!general.plannedStartDate}
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
            <input
              type="date"
              id="plannedStartDate"
              value={general.plannedStartDate || ''}
              onChange={(e) => {
                if (!fieldLockStatus.isLocked) {
                  setGeneral((g: any) => ({ ...g, plannedStartDate: e.target.value }));
                  plannedStartDateAutosave.triggerFieldSave(e.target.value);
                }
              }}
              disabled={fieldLockStatus.isLocked}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${fieldLockStatus.isLocked ? "bg-gray-100 cursor-not-allowed opacity-50" : ""}`}
            />
            {plannedStartDateAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {plannedStartDateAutosave.state.error.message}</p>}
          </div>
          <div className="space-y-2">
            <LabelSaveIndicator
              isSaving={plannedEndDateAutosave.state.isSaving}
              isSaved={!!general.plannedEndDate}
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
            <input
              type="date"
              id="plannedEndDate"
              value={general.plannedEndDate || ''}
              onChange={(e) => {
                if (!fieldLockStatus.isLocked) {
                  setGeneral((g: any) => ({ ...g, plannedEndDate: e.target.value }));
                  plannedEndDateAutosave.triggerFieldSave(e.target.value);
                }
              }}
              disabled={fieldLockStatus.isLocked}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${fieldLockStatus.isLocked ? "bg-gray-100 cursor-not-allowed opacity-50" : ""}`}
            />
            {plannedEndDateAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {plannedEndDateAutosave.state.error.message}</p>}
          </div>
          <div className="space-y-2">
            <LabelSaveIndicator
              isSaving={actualStartDateAutosave.state.isSaving}
              isSaved={!!general.actualStartDate}
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
            <input
              type="date"
              id="actualStartDate"
              value={general.actualStartDate || ''}
              onChange={(e) => {
                if (!fieldLockStatus.isLocked && getDateFieldStatus().actualStartDate) {
                  setGeneral((g: any) => ({ ...g, actualStartDate: e.target.value }));
                  actualStartDateAutosave.triggerFieldSave(e.target.value);
                }
              }}
              disabled={fieldLockStatus.isLocked || !getDateFieldStatus().actualStartDate}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${(fieldLockStatus.isLocked || !getDateFieldStatus().actualStartDate) ? "bg-gray-100 cursor-not-allowed opacity-50" : ""}`}
            />
            {actualStartDateAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {actualStartDateAutosave.state.error.message}</p>}
          </div>
          <div className="space-y-2">
            <LabelSaveIndicator
              isSaving={actualEndDateAutosave.state.isSaving}
              isSaved={!!general.actualEndDate}
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
            <input
              type="date"
              id="actualEndDate"
              value={general.actualEndDate || ''}
              onChange={(e) => {
                if (!fieldLockStatus.isLocked && getDateFieldStatus().actualEndDate) {
                  setGeneral((g: any) => ({ ...g, actualEndDate: e.target.value }));
                  actualEndDateAutosave.triggerFieldSave(e.target.value);
                }
              }}
              disabled={fieldLockStatus.isLocked || !getDateFieldStatus().actualEndDate}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${(fieldLockStatus.isLocked || !getDateFieldStatus().actualEndDate) ? "bg-gray-100 cursor-not-allowed opacity-50" : ""}`}
            />
            {actualEndDateAutosave.state.error && <p className="text-xs text-red-600">Failed to save: {actualEndDateAutosave.state.error.message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionContent({ section, general, setGeneral, sectors, setSectors, transactions, setTransactions, refreshTransactions, extendingPartners, setExtendingPartners, implementingPartners, setImplementingPartners, governmentPartners, setGovernmentPartners, contacts, setContacts, updateContacts, governmentInputs, setGovernmentInputs, contributors, setContributors, sdgMappings, setSdgMappings, tags, setTags, workingGroups, setWorkingGroups, policyMarkers, setPolicyMarkers, specificLocations, setSpecificLocations, coverageAreas, setCoverageAreas, permissions, setSectorValidation, activityScope, setActivityScope, user, getDateFieldStatus, setHasUnsavedChanges, updateActivityNestedField, setShowActivityCreatedAlert, onTitleAutosaveState, tabCompletionStatus, budgets, setBudgets, budgetNotProvided, setBudgetNotProvided, plannedDisbursements, setPlannedDisbursements, setIatiSyncState, setSubnationalBreakdowns, onSectionChange, getNextSection, getPreviousSection, setParticipatingOrgsCount, setContributorsCount }: any) {
  switch (section) {
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
      />;
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
            onStateChange={setIatiSyncState}
            canEdit={permissions?.canEditActivity ?? true}
          />
        </div>
      );
    case "sectors":
      return (
        <div className="w-full">
          <h3 className="text-xl font-semibold text-gray-900">Sectors</h3>
          <p className="text-sm text-gray-600 mt-1">
            Assign OECD DAC sector codes and allocate percentages for this activity.
          </p>
          <div className="mt-6">
            <ImprovedSectorAllocationForm
              allocations={sectors}
              onChange={(newSectors) => {
                console.log('🎯 [AIMS] === SECTORS CHANGED IN FORM ===');
                console.log('📊 [AIMS] New sectors:', JSON.stringify(newSectors, null, 2));
                console.log('📈 [AIMS] Sector count:', newSectors.length);
                setSectors(newSectors);
              }}
              onValidationChange={setSectorValidation}
              activityId={general.id}
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
        onContributorsChange={setContributorsCount}
      />;
    case "organisations":
      return <OrganisationsSection
        activityId={general.id}
        extendingPartners={extendingPartners}
        implementingPartners={implementingPartners}
        governmentPartners={governmentPartners}
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
          }
        }}
      />;
    case "locations":
      return <CombinedLocationsTab 
        specificLocations={specificLocations}
        coverageAreas={coverageAreas}
        onSpecificLocationsChange={setSpecificLocations}
        onCoverageAreasChange={setCoverageAreas}
        activityId={general.id}
        canEdit={permissions?.canEditActivity ?? true}
        onSubnationalDataChange={setSubnationalBreakdowns}
        activityTitle={general.title}
        activitySector={general.primarySector}
      />;
    case "finances":
      return <FinancesSection 
        activityId={general.id || "new"}
        transactions={transactions}
        onTransactionsChange={setTransactions}
        onRefreshTransactions={refreshTransactions}
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
          // Log the general state after update
          setTimeout(() => {
            console.log('[AIMS DEBUG] General state after update:', general);
            console.log('[AIMS DEBUG] Specific field value:', general[field]);
          }, 100);
        }}
        tabCompletionStatus={tabCompletionStatus}
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
      return <div className="bg-white rounded shadow p-8">[Results fields go here]</div>;
    case "contacts":
      return <ContactsSection contacts={contacts} onChange={updateContacts} activityId={general.id} />;
    case "government":
      return <GovernmentInputsSection governmentInputs={governmentInputs} onChange={setGovernmentInputs} />;
    case "documents":
      return <div className="bg-white rounded shadow p-8">[Documents & Images fields go here]</div>;
    case "aid_effectiveness":
      return <AidEffectivenessForm general={general} onUpdate={setGeneral} />;
    case "sdg":
      return <SDGAlignmentSection sdgMappings={sdgMappings} onUpdate={setSdgMappings} activityId={general.id} />;
    case "tags":
      return <TagsSection activityId={general.id} tags={tags} onChange={setTags} />;
    case "working_groups":
      return <WorkingGroupsSection activityId={general.id} workingGroups={workingGroups} onChange={setWorkingGroups} setHasUnsavedChanges={setHasUnsavedChanges} />;
    case "policy_markers":
      return <PolicyMarkersSection activityId={general.id} policyMarkers={policyMarkers} onChange={setPolicyMarkers} setHasUnsavedChanges={setHasUnsavedChanges} />;
    case "linked_activities":
      return <LinkedActivitiesEditorTab 
        activityId={general.id} 
        currentUserId={user?.id}
        canEdit={permissions?.canEditActivity ?? true}
      />;

    default:
      return null;
  }
}

function NewActivityPageContent() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  
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

  // All state declarations first
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
    activityStatus: "1",
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
    otherIdentifier: "",
    uuid: "",
    autoSync: false,
    lastSyncTime: "",
    syncStatus: "not_synced" as "live" | "pending" | "outdated" | "not_synced",
    autoSyncFields: [] as string[]
  });
  const [sectors, setSectors] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  
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
        console.log('[AIMS] Refreshed transactions:', data.transactions?.length || 0);
      }
    } catch (error) {
      console.error('[AIMS] Error refreshing transactions:', error);
    }
  }, [searchParams]);
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
  const [participatingOrgsCount, setParticipatingOrgsCount] = useState<number>(0);
  const [contributorsCount, setContributorsCount] = useState<number>(0);
  
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAndNext, setSavingAndNext] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [showMissingFieldsDialog, setShowMissingFieldsDialog] = useState(false);
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([]);
  const [showActivityCreatedAlert, setShowActivityCreatedAlert] = useState(false);
  const [titleAutosaveState, setTitleAutosaveState] = useState<{ isSaving: boolean; hasUnsavedChanges: boolean; lastSaved: Date | null; error: any }>({ isSaving: false, hasUnsavedChanges: false, lastSaved: null, error: null });
  const [activityId, setActivityId] = useState(general.id);
  // Add state to track budgets and budgetNotProvided for Budgets tab completion
  const [budgets, setBudgets] = useState<any[]>([]);
  const [budgetNotProvided, setBudgetNotProvided] = useState(false);
  // Add state to track planned disbursements for Planned Disbursements tab completion
  const [plannedDisbursements, setPlannedDisbursements] = useState<any[]>([]);

  // State for IATI Sync status
  const [iatiSyncState, setIatiSyncState] = useState({
    isEnabled: false,
    syncStatus: 'pending' as 'live' | 'pending' | 'outdated'
  });

  // State for Subnational Breakdown data
  const [subnationalBreakdowns, setSubnationalBreakdowns] = useState<Record<string, number>>({});

  const isEditing = !!searchParams?.get("id");
  
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
          // Editing existing activity
          console.log('[AIMS] Loading activity:', activityId);
          const response = await fetch(`/api/activities/${activityId}`);
          
          if (!response.ok) {
            throw new Error('Failed to load activity');
          }
          
          const data = await response.json();
          console.log('[AIMS] Activity loaded:', data.title);
          
          // Update all state with loaded data
          setGeneral({
            id: data.id || activityId,
            partnerId: data.partnerId || "",
            iatiId: data.iatiId || "",
            title: data.title || "",
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
          
          setActivityScope(data.activityScope || "national");

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
        } else {
          // New activity - just set some defaults
          console.log('[AIMS] Creating new activity');
          setGeneral(prev => ({
            ...prev,
            created_by_org_name: user?.organisation || user?.organization?.name || "",
            createdByOrg: user?.organizationId || "",
            uuid: generateUUID()
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
      sectors: "Sectors",
      locations: "Activity Locations",
      subnational_breakdown: "Subnational Breakdown",
      organisations: "Organisations",
      contributors: "Contributors",
      contacts: "Contacts",
      linked_activities: "Linked Activities",
      finances: "Finances",
      results: "Results",
      sdg: "SDG Alignment",
      tags: "Tags",
      working_groups: "Working Groups",
      policy_markers: "Policy Markers",
      government: "Government Inputs",
      documents: "Documents & Images",
      aid_effectiveness: "Aid Effectiveness",
      budgets: "Budgets",
      "planned-disbursements": "Planned Disbursements"
    };
    return sectionLabels[sectionId] || sectionId;
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
  const canPublish = (user?.role === 'gov_partner_tier_1' || user?.role === 'super_user') && 
                     (general.submissionStatus === 'validated' || user?.role === 'super_user') &&
                     general.id && general.title?.trim() && general.description?.trim() && 
                     general.activityStatus && general.plannedStartDate && general.plannedEndDate;

  // 🚀 FIELD-LEVEL AUTOSAVE SYSTEM - saves individual fields immediately
  // Simplified autosave state for field-level autosave system
  const autosaveState = {
    isSaving: false,
    hasUnsavedChanges: false,
    lastSaved: null,
    error: null
  };
  
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

  // Tab completion status calculation
  const tabCompletionStatus = React.useMemo(() => {
    const generalCompletion = getTabCompletionStatus('general', general, getDateFieldStatus)
    // Sectors tab: use the comprehensive sector completion check
    const sectorsCompletion = getTabCompletionStatus('sectors', sectors);

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

    // Locations tab: use the comprehensive locations completion check (includes subnational breakdown)
    const locationsCompletion = getTabCompletionStatus('locations', { 
      specificLocations, 
      subnationalBreakdowns 
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
      sectors: sectorsCompletion ? { 
        isComplete: sectorsCompletion.isComplete,
        isInProgress: sectorsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
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
      finances: { isComplete: financesComplete, isInProgress: false },
      finances_defaults: financesDefaultsCompletion ? { 
        isComplete: financesDefaultsCompletion.isComplete,
        isInProgress: financesDefaultsCompletion.isInProgress 
      } : { isComplete: false, isInProgress: false },
      budgets: { isComplete: budgetsComplete, isInProgress: false },
      "planned-disbursements": { isComplete: plannedDisbursementsComplete, isInProgress: false },
      sdg: { isComplete: sdgComplete, isInProgress: false }
    }
  }, [general, getDateFieldStatus, sectorValidation, sectors, specificLocations, tags, workingGroups, policyMarkers, hasUnsavedChanges, transactions, budgets, budgetNotProvided, plannedDisbursements, sdgMappings, iatiSyncState, subnationalBreakdowns, extendingPartners, implementingPartners, governmentPartners, participatingOrgsCount, contributorsCount]);

  // Helper to get next section id - moved here to avoid temporal dead zone
  const getNextSection = useCallback((currentId: string) => {
    const sections = [
      "general", "iati", "sectors", "locations", "organisations", "contributors", "contacts", 
      "linked_activities",
      "finances", "budgets", "planned-disbursements", "results", "sdg", "tags", "working_groups", "policy_markers", "government", "documents", "aid_effectiveness"
    ].filter(id => id !== "government" || showGovernmentInputs);
    
    const idx = sections.findIndex(s => s === currentId);
    return idx < sections.length - 1 ? sections[idx + 1] : null;
  }, [showGovernmentInputs]);

  // Helper to get previous section id
  const getPreviousSection = useCallback((currentId: string) => {
    const sections = [
      "general", "iati", "sectors", "locations", "organisations", "contributors", "contacts", 
      "linked_activities",
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
      // Always construct a fresh payload for each call
      const payload = {
        ...general,
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
        // Handle status fields
        activityStatus: general.activityStatus || "1",
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
          activityStatus: data.activityStatus || "1",
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
  }, [general, sectors, transactions, transactionsLoaded, extendingPartners, implementingPartners, governmentPartners, contacts, sdgMappings, tags, workingGroups, policyMarkers, activeSection, router, user, isEditing, sectorValidation, hasUnsavedChanges]);

  // Add loading state when switching tabs
  const handleTabChange = async (value: string) => {
    
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
      title: "Activity Overview",
      sections: [
        { id: "general", label: "General" },
        { id: "iati", label: "IATI Sync" },
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
        { id: "linked_activities", label: "Linked Activities" }
      ]
    },
    {
      title: "Funding & Delivery",
      sections: [
        { id: "finances", label: "Finances" },
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
        ...(showGovernmentInputs ? [{ id: "government", label: "Government Inputs" }] : []),
        { id: "aid_effectiveness", label: "Aid Effectiveness", optional: true }
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

  return (
    <MainLayout>
      {/* Field-level autosave system - no wrapper needed */}
      <div>
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
                  {/* Autosave Status Indicator */}
                  <AutosaveStatus
                    isAutoSaving={autosaveState.isSaving}
                    hasUnsavedChanges={hasUnsavedChanges || autosaveState.hasUnsavedChanges}
                    lastSaved={autosaveState.lastSaved}
                    lastError={autosaveState.error}
                    className="mt-2"
                  />
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
                    <span className="text-gray-500">Reported by:</span>
                    <span className="ml-2 font-medium block break-words">
                      {(() => {
                        if (general.created_by_org_name && general.created_by_org_acronym) {
                          return `${general.created_by_org_name} (${general.created_by_org_acronym})`;
                        }
                        return general.created_by_org_name || general.created_by_org_acronym || 'Unknown';
                      })()}
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
              activityCreated={!!general.id}
              tabCompletionStatus={tabCompletionStatus}
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
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Edit Activity</h1>
              <div className="flex items-center gap-6">
                {/* Publish Toggle */}
                {(canPublish || !isEditing) && (
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
                          saveActivity({ publish: true });
                        } else {
                          // Unpublish the activity
                          setGeneral(prev => ({ ...prev, publicationStatus: 'draft' }));
                          saveActivity({ publish: false });
                        }
                      }}
                      disabled={!general.title?.trim() || submitting || publishing}
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
                    setTransactions={setTransactions}
                    refreshTransactions={refreshTransactions}
                    extendingPartners={extendingPartners}
                    setExtendingPartners={setExtendingPartners}
                    implementingPartners={implementingPartners}
                    setImplementingPartners={setImplementingPartners}
                    governmentPartners={governmentPartners}
                    setGovernmentPartners={setGovernmentPartners}
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
                    permissions={permissions}
                    setSectorValidation={setSectorValidation}
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
                    setIatiSyncState={setIatiSyncState}
                    setSubnationalBreakdowns={setSubnationalBreakdowns}
                    setParticipatingOrgsCount={setParticipatingOrgsCount}
                    setContributorsCount={setContributorsCount}
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

              {/* Center: Saved Status */}
              <div className="flex-1 text-center">
                {(!activityId && titleAutosaveState.isSaving) ? (
                  <span className="text-orange-600 font-medium">Creating activity...</span>
                ) : titleAutosaveState.isSaving ? (
                  <span className="text-orange-600 font-medium">Saving...</span>
                ) : (!titleAutosaveState.isSaving && !titleAutosaveState.hasUnsavedChanges && titleAutosaveState.lastSaved) ? (
                  <span className="text-green-700 font-medium">Saved</span>
                ) : null}
              </div>

              {/* Right side: Comments + Back + Next Navigation Buttons */}
              <div className="flex items-center gap-3">
                {/* Comments Button */}
                {isEditing && general.id && (
                  <Button
                    variant="outline"
                    className="px-4 py-3 text-base font-semibold"
                    onClick={() => setIsCommentsDrawerOpen(true)}
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Comments
                    {comments.length > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                        {comments.length}
                      </span>
                    )}
                  </Button>
                )}
                
                {/* Back Button */}
                <Button
                  variant="outline"
                  className="px-6 py-3 text-base font-semibold"
                  onClick={() => previousSection && handleTabChange(previousSection.id)}
                  disabled={!previousSection || tabLoading}
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </Button>

                {/* Next Button */}
                <Button
                  variant="default"
                  className="px-6 py-3 text-base font-semibold"
                  onClick={() => nextSection && handleTabChange(nextSection.id)}
                  disabled={isLastSection || tabLoading}
                >
                  Next
                  <ArrowRight className="ml-2 h-5 w-5" />
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
      
      {/* Debug Panel - Disabled for field-level autosave */}
      
      {/* Debug Panel */}
      <DebugPanel />
      </div>
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