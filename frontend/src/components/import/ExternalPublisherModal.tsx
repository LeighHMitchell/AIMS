'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  HelpCircle, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  GitBranch,
  Merge,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
// Inline strings for demo - in production would come from i18n
const iatiImportStrings = {
  modalTitle: 'External Publisher Detected',
  'summary.reportingOrg': 'Reporting Organisation',
  'summary.yourOrg': 'Your Organisation',
  'summary.iatiId': 'IATI Identifier',
  'summary.lastUpdated': 'Last Updated',
  'summary.notProvided': 'Not provided',
  'noPublisher.banner': 'You have no publisher identifiers set up. All activities will be treated as external.',
  duplicateWarning: 'Warning: An activity with this IATI identifier already exists in your system.',
  'option.reference.title': 'Link as Reference',
  'option.reference.help': 'Add this activity as a read-only reference. It will not count towards your totals.',
  'option.reference.tooltip1': 'Good for mapping related activities from other publishers',
  'option.reference.tooltip2': 'Activity remains owned by original publisher',
  'option.fork.title': 'Fork as Local Draft',
  'option.fork.help': 'Create an editable copy under your organisation. You must assign a new IATI identifier.',
  'option.fork.tooltip1': 'Creates a draft copy you can edit and publish',
  'option.fork.tooltip2': 'Must change IATI identifier before publishing',
  'option.merge.title': 'Merge into Current Activity',
  'option.merge.help': 'Link this external record to the activity you are currently editing.',
  'option.merge.tooltip1': 'Links external data to your current activity',
  'option.merge.tooltip2': 'No duplicate activity is created',
  'merge.title': 'Select Activity to Merge',
  footnote: 'This decision affects data ownership and reporting. You can change it later if needed.',
  'btn.cancel': 'Cancel',
  'btn.continue': 'Continue',
  'btn.back': 'Back'
};

export interface ExternalPublisherModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: {
    iatiId: string;
    reportingOrgRef: string;
    reportingOrgName?: string;
    lastUpdated?: string;
  };
  userOrgName: string;
  userPublisherRefs: string[];
  onChoose: (choice: 'reference' | 'fork' | 'merge', targetActivityId?: string) => void;
  currentActivityId?: string; // The activity being edited
  existingActivity?: {
    id: string;
    iatiId: string;
    reportingOrgRef: string;
  } | null;
}

type ImportOption = 'reference' | 'fork' | 'merge';

export function ExternalPublisherModal({
  isOpen,
  onClose,
  meta,
  userOrgName,
  userPublisherRefs,
  onChoose,
  currentActivityId,
  existingActivity
}: ExternalPublisherModalProps) {
  const [selectedOption, setSelectedOption] = useState<ImportOption | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedOption(null);
    }
  }, [isOpen]);

  const handleOptionChange = (option: ImportOption) => {
    setSelectedOption(option);
  };

  const handleContinue = () => {
    if (!selectedOption) return;
    
    if (selectedOption === 'merge' && currentActivityId) {
      onChoose(selectedOption, currentActivityId);
    } else if (selectedOption !== 'merge') {
      onChoose(selectedOption);
    }
  };


  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return iatiImportStrings['summary.notProvided'];
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return format(date, 'PPP');
    } catch {
      return dateString;
    }
  };

  const hasNoPublisherRef = !userPublisherRefs || userPublisherRefs.length === 0;
  const hasDuplicateIatiId = existingActivity?.iatiId === meta.iatiId;

  // No longer need MergePicker - merge now uses current activity automatically

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            {iatiImportStrings.modalTitle}
          </DialogTitle>
          <DialogDescription>
            This activity is reported by a different organisation. Choose how you'd like to handle it.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Information */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">
                {iatiImportStrings['summary.reportingOrg']}:
              </span>
              <div className="mt-1">
                {meta.reportingOrgName || meta.reportingOrgRef}
                <Badge variant="outline" className="ml-2 text-xs">
                  {meta.reportingOrgRef}
                </Badge>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">
                {iatiImportStrings['summary.yourOrg']}:
              </span>
              <div className="mt-1">
                {userOrgName}
                {userPublisherRefs.length > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {userPublisherRefs.join(', ')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-200">
            <div>
              <span className="font-medium text-gray-700">
                {iatiImportStrings['summary.iatiId']}:
              </span>
              <div className="mt-1 font-mono text-xs bg-white px-2 py-1 rounded border">
                {meta.iatiId}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">
                {iatiImportStrings['summary.lastUpdated']}:
              </span>
              <div className="mt-1">
                {formatLastUpdated(meta.lastUpdated)}
              </div>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {hasNoPublisherRef && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {iatiImportStrings['noPublisher.banner']}
            </AlertDescription>
          </Alert>
        )}

        {hasDuplicateIatiId && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {iatiImportStrings.duplicateWarning}
            </AlertDescription>
          </Alert>
        )}

        {/* Options */}
        <div className="space-y-4">
          <RadioGroup value={selectedOption || ''} onValueChange={handleOptionChange}>
            
            {/* Option 1: Reference */}
            <div className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="reference" id="reference" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="reference" className="text-base font-medium cursor-pointer flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {iatiImportStrings['option.reference.title']}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 rounded-full"
                            type="button"
                            aria-label="Show examples"
                          >
                            <HelpCircle className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2 text-xs">
                            <p>• {iatiImportStrings['option.reference.tooltip1']}</p>
                            <p>• {iatiImportStrings['option.reference.tooltip2']}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <p className="text-sm text-gray-600">
                    {iatiImportStrings['option.reference.help']}
                  </p>
                </div>
              </div>
            </div>

            {/* Option 2: Fork */}
            <div className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="fork" id="fork" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="fork" className="text-base font-medium cursor-pointer flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    {iatiImportStrings['option.fork.title']}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 rounded-full"
                            type="button"
                            aria-label="Show examples"
                          >
                            <HelpCircle className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2 text-xs">
                            <p>• {iatiImportStrings['option.fork.tooltip1']}</p>
                            <p>• {iatiImportStrings['option.fork.tooltip2']}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <p className="text-sm text-gray-600">
                    {iatiImportStrings['option.fork.help']}
                  </p>
                </div>
              </div>
            </div>

            {/* Option 3: Merge */}
            <div className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="merge" id="merge" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="merge" className="text-base font-medium cursor-pointer flex items-center gap-2">
                    <Merge className="h-4 w-4" />
                    {iatiImportStrings['option.merge.title']}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 rounded-full"
                            type="button"
                            aria-label="Show examples"
                          >
                            <HelpCircle className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2 text-xs">
                            <p>• {iatiImportStrings['option.merge.tooltip1']}</p>
                            <p>• {iatiImportStrings['option.merge.tooltip2']}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <p className="text-sm text-gray-600">
                    {iatiImportStrings['option.merge.help']}
                  </p>
                  {selectedOption === 'merge' && currentActivityId && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border">
                      <p className="text-xs text-blue-800">
                        Will merge into current activity: {currentActivityId}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </RadioGroup>
        </div>

        {/* Footnote */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <Info className="h-3 w-3 inline mr-1" />
          {iatiImportStrings.footnote}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            {iatiImportStrings['btn.cancel']}
          </Button>
          
          <Button
            onClick={handleContinue}
            disabled={!selectedOption || (selectedOption === 'merge' && !currentActivityId)}
          >
            {iatiImportStrings['btn.continue']}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}