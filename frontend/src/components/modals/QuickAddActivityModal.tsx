'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SelectIATI } from '@/components/ui/SelectIATI';
import {
  Loader2,
  Plus,
  ExternalLink,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  MapPin,
  Wallet,
  FileCheck,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { ACTIVITY_STATUS_GROUPS } from '@/data/activity-status-types';
import { IATI_COUNTRIES } from '@/data/iati-countries';
import { getAllCurrenciesWithPinned } from '@/data/currencies';
import { AID_MODALITY_TYPES } from '@/data/aid-modality-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownProvider } from '@/contexts/DropdownContext';
import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-fetch';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

const contentVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// ============================================================================
// WIZARD STEPS
// ============================================================================

const STEPS = [
  { id: 1, name: 'Basic Info', description: 'Title & status', icon: FileText },
  { id: 2, name: 'Location & Dates', description: 'Where & when', icon: MapPin },
  { id: 3, name: 'Defaults', description: 'Financial settings', icon: Wallet },
  { id: 4, name: 'Review', description: 'Confirm details', icon: FileCheck },
];

// ============================================================================
// TYPES
// ============================================================================

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

interface FormData {
  title: string;
  description: string;
  activityStatus: string;
  plannedStartDate: string;
  plannedEndDate: string;
  countryCode: string;
  defaultCurrency: string;
  defaultAidType: string;
  defaultFinanceType: string;
}

// ============================================================================
// SIDEBAR STEP COMPONENT
// ============================================================================

function SidebarStep({
  step,
  currentStep,
  totalSteps,
}: {
  step: (typeof STEPS)[0];
  currentStep: number;
  totalSteps: number;
}) {
  const Icon = step.icon;
  const isCompleted = currentStep > step.id;
  const isCurrent = currentStep === step.id;

  return (
    <div className="relative flex items-center gap-3 py-3">
      {/* Vertical Line */}
      {step.id !== totalSteps && (
        <div className="absolute left-5 top-12 h-full w-[2px] bg-border/30">
          <motion.div
            className="h-full w-full bg-primary"
            initial={{ height: '0%' }}
            animate={{ height: isCompleted ? '100%' : '0%' }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Icon Bubble */}
      <motion.div
        className={cn(
          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300',
          isCompleted
            ? 'border-primary bg-primary text-primary-foreground'
            : isCurrent
              ? 'border-primary bg-background text-primary shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'
              : 'border-border/50 bg-background/50 text-muted-foreground'
        )}
        whileHover={{ scale: 1.05 }}
      >
        {isCompleted ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </motion.div>

      {/* Text Info */}
      <div className="flex flex-col">
        <span
          className={cn(
            'text-sm font-medium transition-colors duration-300',
            isCurrent || isCompleted ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {step.name}
        </span>
        <span className="text-xs text-muted-foreground/70">{step.description}</span>
      </div>
    </div>
  );
}

// ============================================================================
// REVIEW ITEM COMPONENT
// ============================================================================

function ReviewItem({
  label,
  value,
  isEmpty = false,
}: {
  label: string;
  value: string;
  isEmpty?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/30 bg-background/60 p-3 transition-colors hover:bg-background/80">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'text-sm font-medium text-right max-w-[200px] truncate',
          isEmpty ? 'text-muted-foreground/50 italic' : 'text-foreground'
        )}
      >
        {isEmpty ? 'Not set' : value}
      </dd>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QuickAddActivityModal({ isOpen, onClose, user }: QuickAddActivityModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState<FormData>({
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

  // Prepare country groups for SelectIATI
  const countryGroups = [
    {
      label: 'Countries',
      options: IATI_COUNTRIES.filter((c) => !c.withdrawn).map((country) => ({
        code: country.code,
        name: country.name,
      })),
    },
  ];

  // Prepare currency groups for SelectIATI
  const currencyGroups = [
    {
      label: 'Common Currencies',
      options: getAllCurrenciesWithPinned()
        .slice(0, 6)
        .map((curr) => ({
          code: curr.code,
          name: `${curr.name}${curr.symbol ? ` (${curr.symbol})` : ''}`,
        })),
    },
    {
      label: 'All Currencies',
      options: getAllCurrenciesWithPinned()
        .slice(6)
        .map((curr) => ({
          code: curr.code,
          name: `${curr.name}${curr.symbol ? ` (${curr.symbol})` : ''}`,
        })),
    },
  ];

  // Prepare aid modality groups for SelectIATI
  const aidModalityGroups = [
    {
      label: 'Aid Modality Types',
      options: AID_MODALITY_TYPES.map((type) => ({
        code: type.code,
        name: type.name,
        description: type.description,
      })),
    },
  ];

  // Finance type options
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
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.title.trim()) {
        errors.title = 'Activity title is required';
      } else if (formData.title.trim().length < 3) {
        errors.title = 'Activity title must be at least 3 characters';
      }
      if (!formData.activityStatus) {
        errors.activityStatus = 'Activity status is required';
      }
    }

    if (step === 2) {
      if (!formData.countryCode) {
        errors.countryCode = 'Country selection is required';
      }
      if (formData.plannedStartDate && formData.plannedEndDate) {
        const startDate = new Date(formData.plannedStartDate);
        const endDate = new Date(formData.plannedEndDate);
        if (endDate < startDate) {
          errors.plannedEndDate = 'End date must be after start date';
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = async () => {
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
      const response = await apiFetch('/api/activities', {
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
          const selectedCountry = IATI_COUNTRIES.find((c) => c.code === formData.countryCode);
          const locationData = {
            activity_id: activity.id,
            location_type: 'coverage',
            location_name: selectedCountry?.name || formData.countryCode,
            admin_unit: formData.countryCode,
            coverage_scope: 'national',
          };

          await apiFetch('/api/locations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(locationData),
          });
        } catch (locationError) {
          console.error('Failed to create location:', locationError);
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

      // Reset and close
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating activity:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create activity. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
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
    setCurrentStep(1);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  // Helper functions to get display values
  const getStatusName = () => {
    const allStatuses = ACTIVITY_STATUS_GROUPS.flatMap((g) => g.options);
    return allStatuses.find((s) => s.code === formData.activityStatus)?.name || '';
  };

  const getCountryName = () => {
    return IATI_COUNTRIES.find((c) => c.code === formData.countryCode)?.name || '';
  };

  const getCurrencyName = () => {
    const allCurrencies = getAllCurrenciesWithPinned();
    const currency = allCurrencies.find((c) => c.code === formData.defaultCurrency);
    return currency ? `${currency.name} (${currency.code})` : formData.defaultCurrency;
  };

  const getAidModalityName = () => {
    return AID_MODALITY_TYPES.find((t) => t.code === formData.defaultAidType)?.name || '';
  };

  const getFinanceTypeName = () => {
    const allTypes = financeTypeGroups.flatMap((g) => g.options);
    return allTypes.find((t) => t.code === formData.defaultFinanceType)?.name || '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-hidden p-0"
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking on popover content (portaled outside dialog)
          const target = e.target as HTMLElement;
          if (target.closest('[data-popover-content]') || target.closest('[role="listbox"]') || target.closest('[role="option"]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          // Prevent closing when interacting with popover content
          const target = e.target as HTMLElement;
          if (target.closest('[data-popover-content]') || target.closest('[role="listbox"]') || target.closest('[role="option"]')) {
            e.preventDefault();
          }
        }}
      >
        <DropdownProvider>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative overflow-hidden"
          >
            {/* Header */}
            <div className="border-b border-border/40 bg-background/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Quick Add Activity</h2>
                  <p className="text-sm text-muted-foreground">
                    Create a new activity with essential information
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="ml-auto border-primary/20 bg-primary/5 text-primary"
                >
                  Step {currentStep} of {STEPS.length}
                </Badge>
              </div>
            </div>

            <div className="grid md:grid-cols-[240px_1fr]">
              {/* Left Sidebar - Steps */}
              <div className="hidden md:block border-r border-border/40 bg-muted/30 p-6">
                <div className="space-y-0">
                  {STEPS.map((step) => (
                    <SidebarStep
                      key={step.id}
                      step={step}
                      currentStep={currentStep}
                      totalSteps={STEPS.length}
                    />
                  ))}
                </div>
              </div>

              {/* Right Content Area */}
              <div className="flex flex-col min-h-[500px] max-h-[calc(90vh-120px)]">
                <div className="flex-1 overflow-y-auto p-6">
                  <motion.div
                    key={currentStep}
                    variants={contentVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                  >
                    {/* Step Header */}
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">
                        {STEPS[currentStep - 1].name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {currentStep === 1 && 'Enter the basic information for your activity'}
                        {currentStep === 2 && 'Set the location and timeline'}
                        {currentStep === 3 && 'Configure default financial settings'}
                        {currentStep === 4 && 'Review and confirm your activity details'}
                      </p>
                    </div>

                    {/* Step 1: Basic Info */}
                    {currentStep === 1 && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="activity-title">
                            Activity Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
                          </Label>
                          <Input
                            id="activity-title"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            placeholder="Enter a descriptive title for your activity..."
                            disabled={isCreating}
                            className={cn(
                              'bg-background/60',
                              validationErrors.title && 'border-destructive'
                            )}
                            autoFocus
                          />
                          {validationErrors.title && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {validationErrors.title}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            This will be the main identifier for your activity.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="activity-description">Description</Label>
                          <Textarea
                            id="activity-description"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Provide a brief description of the activity..."
                            disabled={isCreating}
                            rows={3}
                            className="bg-background/60"
                          />
                          <p className="text-xs text-muted-foreground">
                            A short overview of what the activity aims to achieve.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Activity Status <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
                          </Label>
                          <SelectIATI
                            groups={ACTIVITY_STATUS_GROUPS}
                            value={formData.activityStatus}
                            onValueChange={(value) => handleInputChange('activityStatus', value)}
                            placeholder="Select status"
                            disabled={isCreating}
                            dropdownId="quick-add-status"
                            error={validationErrors.activityStatus}
                          />
                          <p className="text-xs text-muted-foreground">
                            Current stage of the activity lifecycle
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Location & Dates */}
                    {currentStep === 2 && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label>
                            Country <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
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
                          <p className="text-xs text-muted-foreground">
                            Primary country where the activity takes place
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="start-date">Planned Start Date</Label>
                            <Input
                              id="start-date"
                              type="date"
                              value={formData.plannedStartDate}
                              onChange={(e) => handleInputChange('plannedStartDate', e.target.value)}
                              disabled={isCreating}
                              className="bg-background/60"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="end-date">Planned End Date</Label>
                            <Input
                              id="end-date"
                              type="date"
                              value={formData.plannedEndDate}
                              onChange={(e) => handleInputChange('plannedEndDate', e.target.value)}
                              disabled={isCreating}
                              className={cn(
                                'bg-background/60',
                                validationErrors.plannedEndDate && 'border-destructive'
                              )}
                            />
                            {validationErrors.plannedEndDate && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {validationErrors.plannedEndDate}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Financial Defaults */}
                    {currentStep === 3 && (
                      <div className="space-y-5">
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
                          <p className="text-xs text-muted-foreground">
                            Default currency for financial transactions
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Default Aid Modality</Label>
                          <SelectIATI
                            groups={aidModalityGroups}
                            value={formData.defaultAidType}
                            onValueChange={(value) => handleInputChange('defaultAidType', value)}
                            placeholder="Select aid modality (optional)"
                            disabled={isCreating}
                            dropdownId="quick-add-aid-type"
                          />
                          <p className="text-xs text-muted-foreground">
                            Type of aid being provided
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Default Finance Type</Label>
                          <SelectIATI
                            groups={financeTypeGroups}
                            value={formData.defaultFinanceType}
                            onValueChange={(value) => handleInputChange('defaultFinanceType', value)}
                            placeholder="Select finance type (optional)"
                            disabled={isCreating}
                            dropdownId="quick-add-finance-type"
                          />
                          <p className="text-xs text-muted-foreground">
                            Classification of financing mechanism (e.g., grant, loan)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Review */}
                    {currentStep === 4 && (
                      <div className="space-y-6">
                        <div className="rounded-xl border border-border/40 bg-muted/20 p-5">
                          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Basic Information
                          </h4>
                          <div className="grid gap-2">
                            <ReviewItem label="Title" value={formData.title} />
                            <ReviewItem
                              label="Description"
                              value={formData.description}
                              isEmpty={!formData.description}
                            />
                            <ReviewItem label="Status" value={getStatusName()} />
                          </div>
                        </div>

                        <div className="rounded-xl border border-border/40 bg-muted/20 p-5">
                          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Location & Timeline
                          </h4>
                          <div className="grid gap-2">
                            <ReviewItem label="Country" value={getCountryName()} />
                            <ReviewItem
                              label="Start Date"
                              value={formData.plannedStartDate}
                              isEmpty={!formData.plannedStartDate}
                            />
                            <ReviewItem
                              label="End Date"
                              value={formData.plannedEndDate}
                              isEmpty={!formData.plannedEndDate}
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-border/40 bg-muted/20 p-5">
                          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Financial Defaults
                          </h4>
                          <div className="grid gap-2">
                            <ReviewItem label="Currency" value={getCurrencyName()} />
                            <ReviewItem
                              label="Aid Modality"
                              value={getAidModalityName()}
                              isEmpty={!formData.defaultAidType}
                            />
                            <ReviewItem
                              label="Finance Type"
                              value={getFinanceTypeName()}
                              isEmpty={!formData.defaultFinanceType}
                            />
                          </div>
                        </div>

                        {/* Organization Info */}
                        {(user?.organisation || user?.organization?.name) && (
                          <Alert className="border-primary/20 bg-primary/5">
                            <AlertDescription className="text-sm">
                              <strong>Reporting Organization:</strong>{' '}
                              {user.organization?.name || user.organisation}
                              {user.organization?.acronym && ` (${user.organization.acronym})`}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Footer / Navigation */}
                <div className="border-t border-border/40 bg-background/80 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      disabled={currentStep === 1 || isCreating}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
                        Cancel
                      </Button>

                      {currentStep === STEPS.length ? (
                        <Button
                          onClick={handleCreate}
                          disabled={isCreating}
                          className="gap-2 min-w-[140px]"
                        >
                          {isCreating ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Create Activity
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button onClick={handleNext} className="gap-2">
                          Next Step
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </DropdownProvider>
      </DialogContent>
    </Dialog>
  );
}
