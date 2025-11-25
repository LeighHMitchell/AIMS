'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ActivityAcronym {
  iatiIdentifier: string;
  title: string;
  detectedAcronym: string | null;
}

interface AcronymReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (acronyms: Record<string, string>) => void;
  activities: ActivityAcronym[];
}

export function AcronymReviewModal({ 
  isOpen, 
  onClose, 
  onContinue, 
  activities 
}: AcronymReviewModalProps) {
  // Initialize user acronyms with detected acronyms
  const [userAcronyms, setUserAcronyms] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize with detected acronyms when modal opens or activities change
    if (isOpen) {
      const initial: Record<string, string> = {};
      activities.forEach(activity => {
        if (activity.detectedAcronym) {
          initial[activity.iatiIdentifier] = activity.detectedAcronym;
        }
      });
      setUserAcronyms(initial);
      setValidationErrors({});
    }
  }, [isOpen, activities]);

  const handleAcronymChange = (iatiIdentifier: string, value: string) => {
    // Update the acronym value
    const newAcronyms = { ...userAcronyms };
    
    if (value.trim() === '') {
      delete newAcronyms[iatiIdentifier];
    } else {
      newAcronyms[iatiIdentifier] = value;
    }
    
    setUserAcronyms(newAcronyms);

    // Validate
    const errors = { ...validationErrors };
    if (value.length > 20) {
      errors[iatiIdentifier] = 'Acronym must be 20 characters or less';
    } else if (value.trim() !== '' && !/^[A-Z]/.test(value)) {
      errors[iatiIdentifier] = 'Warning: Acronyms typically start with uppercase';
    } else {
      delete errors[iatiIdentifier];
    }
    setValidationErrors(errors);
  };

  const handleClearAcronym = (iatiIdentifier: string) => {
    const newAcronyms = { ...userAcronyms };
    delete newAcronyms[iatiIdentifier];
    setUserAcronyms(newAcronyms);

    const errors = { ...validationErrors };
    delete errors[iatiIdentifier];
    setValidationErrors(errors);
  };

  const handleAcceptAll = () => {
    const allAcronyms: Record<string, string> = {};
    activities.forEach(activity => {
      if (activity.detectedAcronym) {
        allAcronyms[activity.iatiIdentifier] = activity.detectedAcronym;
      }
    });
    setUserAcronyms(allAcronyms);
    setValidationErrors({});
    toast.success('Accepted all detected acronyms');
  };

  const handleClearAll = () => {
    setUserAcronyms({});
    setValidationErrors({});
    toast.success('Cleared all acronyms');
  };

  const handleContinue = () => {
    // Check for validation errors
    const hasErrors = Object.values(validationErrors).some(error => 
      error.includes('must be')
    );

    if (hasErrors) {
      toast.error('Please fix validation errors before continuing');
      return;
    }

    onContinue(userAcronyms);
  };

  const detectedCount = activities.filter(a => a.detectedAcronym).length;
  const acceptedCount = Object.keys(userAcronyms).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Review Activity Acronyms
          </DialogTitle>
          <DialogDescription>
            We detected {detectedCount} potential acronym{detectedCount !== 1 ? 's' : ''} from activity titles. 
            Review and edit them below, or clear any that don&apos;t look correct.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {/* Helper buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcceptAll}
              disabled={detectedCount === 0}
            >
              Accept All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={acceptedCount === 0}
            >
              Clear All
            </Button>
            <div className="ml-auto text-sm text-gray-500">
              {acceptedCount} of {activities.length} activities have acronyms
            </div>
          </div>

          {/* Activities table */}
          <div className="space-y-4">
            {activities.map((activity) => {
              const currentValue = userAcronyms[activity.iatiIdentifier] || '';
              const error = validationErrors[activity.iatiIdentifier];
              const hasError = error && error.includes('must be');
              const hasWarning = error && !error.includes('must be');

              return (
                <div 
                  key={activity.iatiIdentifier} 
                  className="border rounded-lg p-4 space-y-3"
                >
                  {/* Activity title */}
                  <div>
                    <Label className="text-xs text-gray-500 font-normal">Activity Title</Label>
                    <p className="text-sm font-medium mt-1">{activity.title}</p>
                  </div>

                  {/* Acronym input */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`acronym-${activity.iatiIdentifier}`}>
                        Acronym
                        {activity.detectedAcronym && (
                          <span className="ml-2 text-xs text-gray-500 font-normal">
                            (auto-detected: {activity.detectedAcronym})
                          </span>
                        )}
                      </Label>
                      <Input
                        id={`acronym-${activity.iatiIdentifier}`}
                        value={currentValue}
                        onChange={(e) => handleAcronymChange(activity.iatiIdentifier, e.target.value)}
                        placeholder="Enter acronym or leave blank..."
                        maxLength={25}
                        className={hasError ? 'border-red-500' : hasWarning ? 'border-yellow-500' : ''}
                      />
                      {error && (
                        <div className={`flex items-center gap-1 text-xs ${hasError ? 'text-red-600' : 'text-yellow-600'}`}>
                          <AlertCircle className="h-3 w-3" />
                          {error}
                        </div>
                      )}
                    </div>
                    {currentValue && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClearAcronym(activity.iatiIdentifier)}
                        className="mt-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleContinue}>
            Continue Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



