'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  ChevronDown, 
  ChevronUp,
  ChevronRight,
  CheckCircle,
  Clock,
  MinusCircle,
  HelpCircle,
  Paperclip,
  Loader2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { RequiredDot } from '@/components/ui/required-dot';

import type { 
  ReadinessChecklistItem as ChecklistItemType,
  ActivityReadinessResponse,
  ReadinessEvidenceDocument,
  UpdateReadinessResponseRequest,
  ChecklistStatus,
} from '@/types/readiness';
import { CHECKLIST_STATUS_OPTIONS } from '@/types/readiness';
import { ReadinessDocumentUpload } from './ReadinessDocumentUpload';

interface ReadinessChecklistItemProps {
  item: ChecklistItemType;
  response: ActivityReadinessResponse | null;
  documents: ReadinessEvidenceDocument[];
  onUpdateResponse: (data: UpdateReadinessResponseRequest) => Promise<void>;
  onUploadDocument: (file: File) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onRenameDocument?: (documentId: string, fileName: string) => Promise<void>;
  isUpdating: boolean;
  readOnly: boolean;
  /** Controlled expansion — when provided, parent owns the open/closed state. */
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export function ReadinessChecklistItem({
  item,
  response,
  documents,
  onUpdateResponse,
  onUploadDocument,
  onDeleteDocument,
  onRenameDocument,
  isUpdating,
  readOnly,
  isExpanded: controlledExpanded,
  onToggleExpanded,
}: ReadinessChecklistItemProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(false);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? (controlledExpanded as boolean) : uncontrolledExpanded;
  const toggleExpanded = () => {
    if (isControlled) onToggleExpanded?.();
    else setUncontrolledExpanded((v) => !v);
  };
  const [localRemarks, setLocalRemarks] = useState(response?.remarks || '');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRemarksRef = useRef(response?.remarks || '');

  const currentStatus = response?.status || 'not_completed';
  const hasDocuments = documents.length > 0;

  // Sync local remarks when response changes from outside
  useEffect(() => {
    if (response?.remarks !== lastSavedRemarksRef.current) {
      setLocalRemarks(response?.remarks || '');
      lastSavedRemarksRef.current = response?.remarks || '';
    }
  }, [response?.remarks]);

  const getStatusIcon = () => {
    switch (currentStatus) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-[hsl(var(--success-icon))]" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      case 'not_required':
        return <MinusCircle className="h-5 w-5 text-muted-foreground/50" />;
      default:
        return <ChevronRight className="h-5 w-5 text-muted-foreground/30" />;
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await onUpdateResponse({
      status: newStatus as ChecklistStatus,
      remarks: localRemarks || null,
    });
  };

  // Debounced auto-save for remarks
  const saveRemarks = useCallback(async (remarks: string) => {
    if (remarks !== lastSavedRemarksRef.current) {
      lastSavedRemarksRef.current = remarks;
      await onUpdateResponse({
        status: currentStatus,
        remarks: remarks || null,
      });
    }
  }, [currentStatus, onUpdateResponse]);

  const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newRemarks = e.target.value;
    setLocalRemarks(newRemarks);
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set new debounced save (1 second delay)
    debounceTimeoutRef.current = setTimeout(() => {
      saveRemarks(newRemarks);
    }, 1000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Handle document upload - auto-mark as completed
  const handleDocumentUpload = async (file: File) => {
    await onUploadDocument(file);
    // Auto-mark as completed if not already completed or not_required
    if (currentStatus !== 'completed' && currentStatus !== 'not_required') {
      await onUpdateResponse({
        status: 'completed',
        remarks: localRemarks || null,
      });
    }
  };

  return (
    <TooltipProvider>
      <div className={cn(
        "border rounded-lg transition-all",
        currentStatus === 'not_required' && "border-border bg-muted/50 opacity-75",
      )}>
        {/* Main Row - Always Visible */}
        <div
          className="p-4 flex items-start gap-3 cursor-pointer"
          onClick={toggleExpanded}
        >
          {/* Expand/Collapse chevron */}
          <div className="flex-shrink-0 mt-0.5">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Item Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-body font-medium text-foreground">
                {item.title}
                {item.is_required && currentStatus !== 'completed' && currentStatus !== 'not_required' && (
                  <RequiredDot className="ml-1" />
                )}
              </h4>
              {/* Guidance tooltip - inline with title */}
              {item.guidance_text && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-body">{item.guidance_text}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {item.description && (
              <p className="text-body text-muted-foreground mt-1">{item.description}</p>
            )}
          </div>

          {/* Right-side indicators */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Document indicator */}
            {hasDocuments && (
              <Badge variant="outline" className="text-helper gap-1">
                <Paperclip className="h-3 w-3" />
                {documents.length}
              </Badge>
            )}

            {/* Status Indicator */}
            <div className="flex-shrink-0">
              {isUpdating ? (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              ) : (
                getStatusIcon()
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-0">
            <div className="mt-4 space-y-4 pl-9">
              {/* Status Selection */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-4">
                  {CHECKLIST_STATUS_OPTIONS.map((option) => {
                    const isSelected = currentStatus === option.value;
                    return (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${item.id}-${option.value}`}
                          checked={isSelected}
                          disabled={readOnly || isUpdating}
                          onCheckedChange={() => {
                            if (!isSelected) handleStatusChange(option.value);
                          }}
                        />
                        <Label
                          htmlFor={`${item.id}-${option.value}`}
                          className={cn("text-body cursor-pointer", option.color)}
                        >
                          {option.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Document Upload */}
              <ReadinessDocumentUpload
                documents={documents}
                onUpload={handleDocumentUpload}
                onDelete={onDeleteDocument}
                onRename={onRenameDocument ?? (async () => {})}
                isUploading={isUpdating}
                readOnly={readOnly}
                isRequired={item.is_required && currentStatus === 'completed' && !hasDocuments}
                guidanceText={item.guidance_text}
              />

              {/* Remarks */}
              <div className="space-y-2">
                <Label className="text-body font-medium text-foreground flex items-center gap-1.5">
                  Remarks
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-body">
                        Add any notes or context for this item — e.g. why it isn't yet complete,
                        who owns the next action, blockers, or an explanation when marking Not Required.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Textarea
                  value={localRemarks}
                  onChange={handleRemarksChange}
                  placeholder="Add any notes or context..."
                  rows={2}
                  disabled={readOnly || isUpdating}
                  className="text-body"
                />
              </div>

              {/* Completion Info */}
              {response?.completed_by && response?.completed_at && (
                <div className="text-helper text-muted-foreground pt-2 border-t">
                  Completed by {response.completed_by_user?.name || 'Unknown'} on{' '}
                  {format(new Date(response.completed_at), 'MMMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default ReadinessChecklistItem;
