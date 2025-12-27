'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { SelectIATI } from '@/components/ui/SelectIATI';
import { Loader2, Plus, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ACTIVITY_STATUS_GROUPS } from '@/data/activity-status-types';
import { IATI_COUNTRIES } from '@/data/iati-countries';
import { getAllCurrenciesWithPinned } from '@/data/currencies';
import { AID_MODALITY_TYPES } from '@/data/aid-modality-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownProvider } from '@/contexts/DropdownContext';

interface QuickAddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    id: string;
    name: string;
    email: string;
    organisation?: string;
    organizationId?: string;
    organization?: {
      id: string;
      name: string;
      acronym?: string;
    };
  } | null;
}

export function QuickAddActivityModal({ isOpen, onClose, user }: QuickAddActivityModalProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    activityStatus: '', // No default status
    plannedStartDate: '',
    plannedEndDate: '',
    countryCode: '',
    defaultCurrency: 'USD',
    defaultAidType: '',
    defaultFinanceType: '',
  });

  // Prepare country groups for SelectIATI
  const countryGroups = [
    {
      label: 'Countries',
      options: IATI_COUNTRIES.filter(c => !c.withdrawn).map(country => ({
        code: country.code,
        name: country.name,
      })),
    },
  ];

  // Prepare currency groups for SelectIATI
  const currencyGroups = [
    {
      label: 'Common Currencies',
      options: getAllCurrenciesWithPinned().slice(0, 6).map(curr => ({
        code: curr.code,
        name: `${curr.name}${curr.symbol ? ` (${curr.symbol})` : ''}`,
      })),
    },
    {
      label: 'All Currencies',
      options: getAllCurrenciesWithPinned().slice(6).map(curr => ({
        code: curr.code,
        name: `${curr.name}${curr.symbol ? ` (${curr.symbol})` : ''}`,
      })),
    },
  ];

  // Prepare aid modality groups for SelectIATI
  const aidModalityGroups = [
    {
      label: 'Aid Modality Types',
      options: AID_MODALITY_TYPES.map(type => ({
        code: type.code,
        name: type.name,
        description: type.description,
      })),
    },
  ];

  // Finance type options (simplified list of most common types)
  const financeTypeGroups = [
    {
      label: 'Grants',
      options: [
        { code: '110', name: 'Standard grant', description: 'Standard grant without specific conditions' },
        { code: '111', name: 'Subsidies to national private investors' },
      ],
    },
    {
      label: 'Loans',
      options: [
        { code: '410', name: 'Aid loan excluding debt reorganisation' },
        { code: '411', name: 'Investment-related loan to developing countries' },
        { code: '421', name: 'Standard loan' },
        { code: '422', name: 'Reimbursable grant' },
      ],
    },
    {
      label: 'Equity & Guarantees',
      options: [
        { code: '510', name: 'Common equity' },
        { code: '520', name: 'Shares in collective investment vehicles' },
        { code: '1100', name: 'Guarantees/insurance' },
      ],
    },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate required fields
    if (!formData.title.trim()) {
      errors.title = 'Activity title is required';
    } else if (formData.title.trim().length < 3) {
      errors.title = 'Activity title must be at least 3 characters';
    }

    if (!formData.countryCode) {
      errors.countryCode = 'Country selection is required';
    }

    // Validate dates
    if (formData.plannedStartDate && formData.plannedEndDate) {
      const startDate = new Date(formData.plannedStartDate);
      const endDate = new Date(formData.plannedEndDate);
      if (endDate < startDate) {
        errors.plannedEndDate = 'End date must be after start date';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    setIsCreating(true);

    try {
      // Prepare activity data for API
      const activityData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        activityStatus: formData.activityStatus,
        plannedStartDate: formData.plannedStartDate || undefined,
        plannedEndDate: formData.plannedEndDate || undefined,
        defaultCurrency: formData.defaultCurrency,
        defaultAidType: formData.defaultAidType || undefined,
        defaultFinanceType: formData.defaultFinanceType || undefined,
        publicationStatus: 'draft',
        submissionStatus: 'draft',
        created_via: 'quick_add',
        user: {
          id: user?.id,
          organizationId: user?.organizationId || user?.organization?.id,
        },
      };

      // Create the activity
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create activity');
      }

      const activity = await response.json();

      // Create location record if country is selected
      if (formData.countryCode && activity.id) {
        try {
          const selectedCountry = IATI_COUNTRIES.find(c => c.code === formData.countryCode);
          const locationData = {
            activity_id: activity.id,
            location_type: 'coverage',
            location_name: selectedCountry?.name || formData.countryCode,
            admin_unit: formData.countryCode,
            coverage_scope: 'national',
          };

          await fetch('/api/locations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(locationData),
          });
        } catch (locationError) {
          console.error('Failed to create location:', locationError);
          // Don't fail the whole operation if location creation fails
        }
      }

      // Show success toast with link to full editor
      toast.success(
        <div className="flex flex-col gap-2">
          <div className="font-semibold">Activity created successfully!</div>
          <div className="text-sm text-muted-foreground">
            You can view it in your portfolio or continue editing.
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-fit"
            onClick={() => router.push(`/activities/new?id=${activity.id}`)}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Open in Full Editor
          </Button>
        </div>,
        {
          duration: 8000,
          position: 'top-center',
        }
      );

      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        activityStatus: '',
        plannedStartDate: '',
        plannedEndDate: '',
        countryCode: '',
        defaultCurrency: 'USD',
        defaultAidType: '',
        defaultFinanceType: '',
      });
      onClose();
    } catch (error) {
      console.error('Error creating activity:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create activity. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      title: '',
      description: '',
      activityStatus: '',
      plannedStartDate: '',
      plannedEndDate: '',
      countryCode: '',
      defaultCurrency: 'USD',
      defaultAidType: '',
      defaultFinanceType: '',
    });
    setValidationErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DropdownProvider>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Plus className="h-5 w-5" />
              Quick Add Activity
            </DialogTitle>
            <DialogDescription>
              Create a new activity with essential information. You can add more details later in the full editor.
            </DialogDescription>
          </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Activity Title - Required */}
          <div className="space-y-2">
            <Label htmlFor="activity-title">
              Activity Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="activity-title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter a descriptive title for your activity..."
              disabled={isCreating}
              className={validationErrors.title ? 'border-red-500' : ''}
              autoFocus
            />
            {validationErrors.title && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.title}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              This will be the main identifier for your activity.
            </p>
          </div>

          {/* Description - Optional */}
          <div className="space-y-2">
            <Label htmlFor="activity-description">Description (Optional)</Label>
            <Textarea
              id="activity-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Provide a brief description of the activity..."
              disabled={isCreating}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              A short overview of what the activity aims to achieve.
            </p>
          </div>

          {/* Two-column layout for compact fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Activity Status */}
            <div className="space-y-2">
              <Label>
                Activity Status <span className="text-red-500">*</span>
              </Label>
              <SelectIATI
                groups={ACTIVITY_STATUS_GROUPS}
                value={formData.activityStatus}
                onValueChange={(value) => handleInputChange('activityStatus', value)}
                placeholder="Select status"
                disabled={isCreating}
                dropdownId="quick-add-status"
              />
              <p className="text-xs text-muted-foreground">Current stage of the activity</p>
            </div>

            {/* Country/Region */}
            <div className="space-y-2">
              <Label>
                Country <span className="text-red-500">*</span>
              </Label>
              <SelectIATI
                groups={countryGroups}
                value={formData.countryCode}
                onValueChange={(value) => handleInputChange('countryCode', value)}
                placeholder="Select country"
                disabled={isCreating}
                dropdownId="quick-add-country"
                error={validationErrors.countryCode}
              />
              <p className="text-xs text-muted-foreground">Primary country for this activity</p>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start-date">Planned Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.plannedStartDate}
                onChange={(e) => handleInputChange('plannedStartDate', e.target.value)}
                disabled={isCreating}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="end-date">Planned End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.plannedEndDate}
                onChange={(e) => handleInputChange('plannedEndDate', e.target.value)}
                disabled={isCreating}
                className={validationErrors.plannedEndDate ? 'border-red-500' : ''}
              />
              {validationErrors.plannedEndDate && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.plannedEndDate}
                </p>
              )}
            </div>

            {/* Default Currency */}
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <SelectIATI
                groups={currencyGroups}
                value={formData.defaultCurrency}
                onValueChange={(value) => handleInputChange('defaultCurrency', value)}
                placeholder="Select currency"
                disabled={isCreating}
                dropdownId="quick-add-currency"
              />
              <p className="text-xs text-muted-foreground">Currency for financial transactions</p>
            </div>

            {/* Default Aid Type/Modality */}
            <div className="space-y-2">
              <Label>Default Aid Modality (Optional)</Label>
              <SelectIATI
                groups={aidModalityGroups}
                value={formData.defaultAidType}
                onValueChange={(value) => handleInputChange('defaultAidType', value)}
                placeholder="Select aid modality"
                disabled={isCreating}
                dropdownId="quick-add-aid-type"
              />
              <p className="text-xs text-muted-foreground">Type of aid being provided</p>
            </div>
          </div>

          {/* Default Finance Type - Full width */}
          <div className="space-y-2">
            <Label>Default Finance Type (Optional)</Label>
            <SelectIATI
              groups={financeTypeGroups}
              value={formData.defaultFinanceType}
              onValueChange={(value) => handleInputChange('defaultFinanceType', value)}
              placeholder="Select finance type"
              disabled={isCreating}
              dropdownId="quick-add-finance-type"
            />
            <p className="text-xs text-muted-foreground">
              Classification of financing mechanism (e.g., grant, loan)
            </p>
          </div>

          {/* Organization Info Display */}
          {user?.organisation || user?.organization?.name ? (
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Reporting Organization:</strong>{' '}
                {user.organization?.name || user.organisation}
                {user.organization?.acronym && ` (${user.organization.acronym})`}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating} className="min-w-[120px]">
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Activity
                </>
              )}
            </Button>
          </DialogFooter>
        </DropdownProvider>
      </DialogContent>
    </Dialog>
  );
}

