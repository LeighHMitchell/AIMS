'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
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
  'summary.reportingOrg': 'Source Publisher',
  'summary.yourOrg': 'Your Organisation', 
  'summary.iatiId': 'Source IATI Identifier',
  'summary.reportingOrg.help': 'The organisation listed in the imported XML file.',
  'summary.yourOrg.help': 'The organisation currently logged into the system.',
  'summary.iatiId.help': 'The activity identifier from the imported XML.',
  'summary.lastUpdated': 'Last Updated',
  'summary.notProvided': 'Not provided',
  'noPublisher.banner': 'You have no publisher identifiers set up. All activities will be treated as external.',
  duplicateWarning: 'Warning: An activity with this IATI identifier already exists in your system.',
  'option.reference.title': 'Link as Reference',
  'option.reference.help': 'Add this activity as a read-only reference. It will not count towards your totals.',
  'option.reference.tooltip': 'Use this option to add the selected activity as a read-only reference. The activity will remain external and cannot be edited. It will not contribute to your organisation\'s budgets, commitments, or disbursement totals. This is useful if you need contextual information without duplicating data.',
  'option.fork.title': 'Fork as Local Draft',
  'option.fork.help': 'Create an editable copy under your organisation. You must assign a new IATI identifier.',
  'option.fork.tooltip': 'Create an editable copy of the activity under your organisation. You must assign a new, unique IATI Activity Identifier before publishing. The forked version becomes your responsibility to maintain and will be counted in your organisation\'s totals.',
  'option.merge.title': 'Merge into Current Activity',
  'option.merge.help': 'Link this external record to the activity you are currently editing.',
  'option.merge.tooltip': 'Attach the external activity record directly to the one you are editing. This creates a link between the two datasets, allowing you to maintain your own reporting while showing its connection to the external activity (for example, a donor\'s parent record or an implementing partner\'s sub-activity).',
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
  currentActivityIatiId?: string; // The IATI ID of the current activity
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
  currentActivityIatiId,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            {iatiImportStrings.modalTitle}
          </DialogTitle>
          <DialogDescription>
            This activity is reported by a different organisation. Choose how you'd like to handle it.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Information - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Source Publisher */}
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {iatiImportStrings['summary.reportingOrg']}
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 rounded-full"
                        type="button"
                        aria-label="Help"
                      >
                        <HelpCircle className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{iatiImportStrings['summary.reportingOrg.help']}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{meta.reportingOrgName || 'Unknown Organisation'}</p>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{meta.reportingOrgRef}</span>
              </div>
            </div>
          </Card>

          {/* Your Organisation */}
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {iatiImportStrings['summary.yourOrg']}
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 rounded-full"
                        type="button"
                        aria-label="Help"
                      >
                        <HelpCircle className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{iatiImportStrings['summary.yourOrg.help']}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{userOrgName || 'Unknown Organisation'}</p>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {userPublisherRefs.length > 0 ? userPublisherRefs[0] : 'No Ref'}
                </span>
              </div>
            </div>
          </Card>

          {/* Source IATI Identifier */}
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {iatiImportStrings['summary.iatiId']}
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 rounded-full"
                        type="button"
                        aria-label="Help"
                      >
                        <HelpCircle className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        The activity identifier<br />
                        from the imported XML.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded break-all">{meta.iatiId}</span>
            </div>
          </Card>
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
            <div className="bg-background border border-border rounded-lg p-6 space-y-4 hover:border-gray-300 transition-colors">
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
                        <TooltipContent className="max-w-sm">
                          <p className="text-xs">
                            {iatiImportStrings['option.reference.tooltip']}
                          </p>
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
            <div className="bg-background border border-border rounded-lg p-6 space-y-4 hover:border-gray-300 transition-colors">
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
                        <TooltipContent className="max-w-sm">
                          <p className="text-xs">
                            {iatiImportStrings['option.fork.tooltip']}
                          </p>
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
            <div className="bg-background border border-border rounded-lg p-6 space-y-4 hover:border-gray-300 transition-colors relative">
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
                        <TooltipContent className="max-w-sm">
                          <p className="text-xs">
                            {iatiImportStrings['option.merge.tooltip']}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <p className="text-sm text-gray-600">
                    {iatiImportStrings['option.merge.help']}
                  </p>
                </div>
              </div>
              {selectedOption === 'merge' && currentActivityId && (
                <div className="absolute top-1/3 -translate-y-1/2 right-4 w-56 p-4 bg-background border border-border rounded-lg hover:border-gray-300 transition-colors shadow-md z-10">
                  <p className="text-xs text-gray-700 leading-tight">
                    Will merge into current activity:
                  </p>
                  <div className="mt-1">
                    <span className="font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded text-xs break-all">
                      {currentActivityIatiId || currentActivityId}
                    </span>
                  </div>
                </div>
              )}
            </div>

          </RadioGroup>
        </div>

        {/* Footnote */}
        <div className="text-xs text-gray-500 p-3">
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