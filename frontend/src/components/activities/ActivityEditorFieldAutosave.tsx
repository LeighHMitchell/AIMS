import React from 'react';
import { useFieldAutosave, useDefaultAidTypeAutosave } from '@/hooks/use-field-autosave-new';
import { Input } from '@/components/ui/input';
import { AidTypeSelect } from '@/components/forms/AidTypeSelect';
import { ActivityStatusSelect } from '@/components/forms/ActivityStatusSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LabelSaveIndicator } from '@/components/ui/save-indicator';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { toast } from 'sonner';

interface ActivityEditorFieldAutosaveProps {
  activityId: string;
  userId: string;
  activity: {
    title: string;
    activityStatus: string;
    defaultAidType?: string;
  };
  onActivityChange: (field: string, value: any) => void;
  onActivityCreated?: (activityData: any) => void;
  showOnlyTitle?: boolean;
  showOnlyStatus?: boolean;
  showOnlyAidType?: boolean;
  additionalData?: Record<string, any>; // Pre-entered values to include in activity creation
  fieldLockStatus?: {
    isLocked: boolean;
    tooltipMessage: string;
  };
  saveOnBlur?: boolean; // New prop for save on blur functionality
  dropdownId?: string; // Unique identifier for dropdown instances
}

export function ActivityEditorFieldAutosave({
  activityId,
  userId,
  activity,
  onActivityChange,
  onActivityCreated,
  showOnlyTitle = false,
  showOnlyStatus = false,
  showOnlyAidType = false,
  additionalData = {},
  fieldLockStatus,
  saveOnBlur,
  dropdownId
}: ActivityEditorFieldAutosaveProps) {
  
  // Initialize field autosave hooks with success callbacks
  const titleAutosave = useFieldAutosave('title', { 
    activityId,
    userId,
    immediate: true,
    additionalData,
    onSuccess: (data) => {
      if (data.id && !activityId) {
        // New activity was created
        onActivityCreated?.(data);
      }
    }
  });
  
  const statusAutosave = useFieldAutosave('activityStatus', { 
    activityId,
    userId,
    immediate: true,
    additionalData,
    onSuccess: (data) => {
      if (data.id && !activityId) {
        // New activity was created
        onActivityCreated?.(data);
      }
      toast.success('Activity Status saved', { position: 'top-right' });
    }
  });
  
  const aidTypeAutosave = useDefaultAidTypeAutosave(activityId, userId);

  // Handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    onActivityChange('title', newTitle);
    titleAutosave.triggerFieldSave(newTitle);
  };

  // Handle status changes
  const handleStatusChange = (value: string) => {
    onActivityChange('activityStatus', value);
    statusAutosave.triggerFieldSave(value);
  };

  // Handle aid type changes
  const handleAidTypeChange = (value: string | null) => {
    const stringValue = value || '';
    onActivityChange('defaultAidType', stringValue);
    aidTypeAutosave.triggerFieldSave(stringValue);
  };

  // Determine which fields to show
  const showAll = !showOnlyTitle && !showOnlyStatus && !showOnlyAidType;
  const shouldShowTitle = showAll || showOnlyTitle;
  const shouldShowStatus = showAll || showOnlyStatus;
  const shouldShowAidType = showAll || showOnlyAidType;

  return (
    <div className="space-y-6">
      {/* Title Field with Autosave */}
      {shouldShowTitle && (
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={titleAutosave.state.isSaving}
            isSaved={titleAutosave.state.isPersistentlySaved}
            className="text-gray-700"
          >
            Activity Title
          </LabelSaveIndicator>
          <div>
            <Input
              id="title"
              value={activity.title || ''}
              onChange={(e) => {
                onActivityChange('title', e.target.value);
                if (!saveOnBlur) {
                  titleAutosave.triggerFieldSave(e.target.value);
                }
              }}
              placeholder="Enter activity title"
              className="w-full"
              onBlur={() => {
                if (saveOnBlur) {
                  titleAutosave.triggerFieldSave(activity.title);
                }
              }}
            />
            {titleAutosave.state.error && (
              <p className="text-xs text-red-600 mt-1">{titleAutosave.state.error.toString()}</p>
            )}
          </div>
        </div>
      )}

      {/* Status Field with Autosave */}
      {shouldShowStatus && (
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={statusAutosave.state.isSaving}
            isSaved={statusAutosave.state.isPersistentlySaved}
            hasValue={!!activity.activityStatus}
            className={fieldLockStatus?.isLocked ? 'text-gray-400' : 'text-gray-700'}
          >
            {!showOnlyStatus ? (
              <>
                Activity Status
                {fieldLockStatus?.isLocked && (
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
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Activity Status</span>
                <HelpTextTooltip>
                  Indicates the current phase of the activity. This field should be regularly updated to reflect the activity's progress over time.
                </HelpTextTooltip>
                {fieldLockStatus?.isLocked && (
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
            )}
          </LabelSaveIndicator>
          <div className={fieldLockStatus?.isLocked ? 'opacity-50' : ''}>
            <ActivityStatusSelect
              value={activity.activityStatus || ''}
              onValueChange={(value) => {
                if (!fieldLockStatus?.isLocked) {
                  onActivityChange('activityStatus', value);
                  statusAutosave.triggerFieldSave(value);
                }
              }}
              placeholder="Select activity status"
              disabled={fieldLockStatus?.isLocked}
              dropdownId={dropdownId ? `${dropdownId}-status` : 'activity-status-select'}
            />
            {statusAutosave.state.error && (
              <p className="text-xs text-red-600 mt-1">{statusAutosave.state.error.toString()}</p>
            )}
          </div>
        </div>
      )}

      {/* Default Aid Type with Autosave */}
      {shouldShowAidType && (
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={aidTypeAutosave.state.isSaving}
            isSaved={aidTypeAutosave.state.isPersistentlySaved}
            className={fieldLockStatus?.isLocked ? 'text-gray-400' : 'text-gray-700'}
          >
            Default Aid Type
            {fieldLockStatus?.isLocked && (
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
          <div className={fieldLockStatus?.isLocked ? 'opacity-50' : ''}>
            <AidTypeSelect
              value={activity.defaultAidType}
              onValueChange={handleAidTypeChange}
              placeholder="Select default aid type"
            />
            {aidTypeAutosave.state.error && (
              <p className="text-xs text-red-600 mt-1">{aidTypeAutosave.state.error.toString()}</p>
            )}
          </div>
        </div>
      )}

      {/* Autosave Status Summary - only show if showing all fields */}
      {showAll && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Autosave Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="font-medium">Title:</span>
              <span className={`ml-1 ${titleAutosave.state.isSaving ? 'text-blue-600' : 'text-green-600'}`}>
                {titleAutosave.state.isSaving ? 'Saving...' : 'Saved'}
              </span>
            </div>
            <div>
              <span className="font-medium">Status:</span>
              <span className={`ml-1 ${statusAutosave.state.isSaving ? 'text-blue-600' : 'text-green-600'}`}>
                {statusAutosave.state.isSaving ? 'Saving...' : 'Saved'}
              </span>
            </div>
            <div>
              <span className="font-medium">Aid Type:</span>
              <span className={`ml-1 ${aidTypeAutosave.state.isSaving ? 'text-blue-600' : 'text-green-600'}`}>
                {aidTypeAutosave.state.isSaving ? 'Saving...' : 'Saved'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 