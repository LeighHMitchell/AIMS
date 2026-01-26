'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  isUpdating: boolean;
  readOnly: boolean;
}

export function ReadinessChecklistItem({
  item,
  response,
  documents,
  onUpdateResponse,
  onUploadDocument,
  onDeleteDocument,
  isUpdating,
  readOnly,
}: ReadinessChecklistItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'not_required':
        return <MinusCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <ChevronRight className="h-5 w-5 text-gray-300" />;
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
        currentStatus === 'not_required' && "border-gray-200 bg-gray-50/50 opacity-75",
      )}>
        {/* Main Row - Always Visible */}
        <div 
          className="p-4 flex items-start gap-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Status Indicator */}
          <div className="flex-shrink-0 mt-0.5">
            {isUpdating ? (
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            ) : (
              getStatusIcon()
            )}
          </div>

          {/* Item Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                {item.responsible_agency_type && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.responsible_agency_type}
                  </p>
                )}
              </div>
              
              {/* Quick indicators */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Document indicator */}
                {hasDocuments && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Paperclip className="h-3 w-3" />
                    {documents.length}
                  </Badge>
                )}
                
                {/* Required badge */}
                {item.is_required && currentStatus !== 'completed' && currentStatus !== 'not_required' && (
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                )}

                {/* Guidance tooltip */}
                {item.guidance_text && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">{item.guidance_text}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {/* Expand/Collapse */}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t border-gray-100">
            <div className="mt-4 space-y-4 pl-9">
              {/* Description */}
              {item.description && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {item.description}
                </div>
              )}

              {/* Guidance */}
              {item.guidance_text && (
                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg flex gap-2">
                  <HelpCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-400" />
                  <span>{item.guidance_text}</span>
                </div>
              )}

              {/* Status Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Status</Label>
                <RadioGroup
                  value={currentStatus}
                  onValueChange={handleStatusChange}
                  disabled={readOnly || isUpdating}
                  className="flex flex-wrap gap-4"
                >
                  {CHECKLIST_STATUS_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={option.value} 
                        id={`${item.id}-${option.value}`} 
                      />
                      <Label 
                        htmlFor={`${item.id}-${option.value}`}
                        className={cn("text-sm cursor-pointer", option.color)}
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Document Upload */}
              <ReadinessDocumentUpload
                documents={documents}
                onUpload={handleDocumentUpload}
                onDelete={onDeleteDocument}
                isUploading={isUpdating}
                readOnly={readOnly}
                isRequired={item.is_required && currentStatus === 'completed' && !hasDocuments}
              />

              {/* Remarks */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Remarks
                  {currentStatus === 'not_required' && (
                    <span className="text-xs text-gray-500 ml-2">(Explain why not required)</span>
                  )}
                </Label>
                <Textarea
                  value={localRemarks}
                  onChange={handleRemarksChange}
                  placeholder="Add any notes or context..."
                  rows={2}
                  disabled={readOnly || isUpdating}
                  className="text-sm"
                />
              </div>

              {/* Completion Info */}
              {response?.completed_by && response?.completed_at && (
                <div className="text-xs text-gray-500 pt-2 border-t">
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
