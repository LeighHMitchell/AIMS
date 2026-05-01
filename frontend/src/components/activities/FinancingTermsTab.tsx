'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import {
  CheckCircle,
  Info,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Calendar,
  Pencil
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getSortIcon } from '@/components/ui/table';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { cn } from '@/lib/utils';
import { useFinancingTerms } from '@/hooks/use-financing-terms';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  FinancingTermsTabProps,
  CreateLoanStatusData,
  CreateLoanTermsData,
  UpdateLoanStatusData,
  OtherFlag,
  RepaymentType,
  RepaymentPlan
} from '@/types/financing-terms';
import { REPAYMENT_TYPES } from '@/data/repayment-types';
import { REPAYMENT_PLANS } from '@/data/repayment-plans';
import { OECD_CRS_FLAGS } from '@/data/oecd-crs-flags';
import { RepaymentTypeSelect } from '@/components/forms/RepaymentTypeSelect';
import { RepaymentPlanSelect } from '@/components/forms/RepaymentPlanSelect';
import { OECDCRSFlagsMultiSelect } from '@/components/forms/OECDCRSFlagsMultiSelect';
import { AddLoanStatusModal } from './AddLoanStatusModal';
import { DatePicker } from '@/components/ui/date-picker';

export function FinancingTermsTab({ 
  activityId, 
  readOnly = false,
  className,
  onFinancingTermsChange 
}: FinancingTermsTabProps) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const {
    loanTerms,
    loanStatuses,
    loading,
    error,
    hasCompletedData,
    saveLoanTerms,
    createLoanStatus,
    updateLoanStatus,
    deleteLoanStatus
  } = useFinancingTerms(activityId);

  // Check if activity is saved
  const isActivitySaved = activityId && activityId !== 'new';

  // Local state for loan terms form
  const [loanTermsForm, setLoanTermsForm] = useState({
    rate_1: '',
    rate_2: '',
    repayment_type_code: '',
    repayment_plan_code: '',
    commitment_date: '',
    repayment_first_date: '',
    repayment_final_date: ''
  });

  const [selectedCRSFlags, setSelectedCRSFlags] = useState<string[]>([]);
  const [showCRSInfo, setShowCRSInfo] = useState(false);
  const [channelCode, setChannelCode] = useState<string | null>(null);

  // State for loan status management
  const [showAddLoanStatusModal, setShowAddLoanStatusModal] = useState(false);
  const [editingLoanStatusId, setEditingLoanStatusId] = useState<string | null>(null);
  const [editingLoanStatusValues, setEditingLoanStatusValues] = useState<Partial<UpdateLoanStatusData>>({});

  // Sort state for Loan Status (Yearly) table
  type LoanStatusSortKey = 'year' | 'value_date' | 'interest_received' | 'principal_outstanding' | 'principal_arrears' | 'interest_arrears';
  const [loanStatusSort, setLoanStatusSort] = useState<{ key: LoanStatusSortKey; direction: 'asc' | 'desc' }>({ key: 'year', direction: 'desc' });

  const handleLoanStatusSort = (key: LoanStatusSortKey) => {
    setLoanStatusSort(prev =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const sortedLoanStatuses = React.useMemo(() => {
    const arr = [...loanStatuses];
    const { key, direction } = loanStatusSort;
    arr.sort((a, b) => {
      const av = (a as any)[key];
      const bv = (b as any)[key];
      const aNull = av == null;
      const bNull = bv == null;
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return direction === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [loanStatuses, loanStatusSort]);

  // State for loan terms modal
  const [showLoanTermsModal, setShowLoanTermsModal] = useState(false);

  // Saving states
  const [savingLoanTerms, setSavingLoanTerms] = useState(false);
  const [loanTermsSaved, setLoanTermsSaved] = useState(false);

  // Load loan terms into form
  useEffect(() => {
    if (loanTerms) {
      setLoanTermsForm({
        rate_1: loanTerms.rate_1?.toString() || '',
        rate_2: loanTerms.rate_2?.toString() || '',
        repayment_type_code: loanTerms.repayment_type_code || '',
        repayment_plan_code: loanTerms.repayment_plan_code || '',
        commitment_date: loanTerms.commitment_date || '',
        repayment_first_date: loanTerms.repayment_first_date || '',
        repayment_final_date: loanTerms.repayment_final_date || ''
      });

      // Load CRS flags
      if (loanTerms.other_flags && Array.isArray(loanTerms.other_flags)) {
        setSelectedCRSFlags(loanTerms.other_flags.map((f: OtherFlag) => f.code));
      }
    }
  }, [loanTerms]);

  // Stable ref for callback to avoid infinite re-render loop
  const onFinancingTermsChangeRef = useRef(onFinancingTermsChange);
  onFinancingTermsChangeRef.current = onFinancingTermsChange;

  // Notify parent of completion status
  useEffect(() => {
    onFinancingTermsChangeRef.current?.(hasCompletedData);
  }, [hasCompletedData]);

  // Fetch channel code from primary participating org
  useEffect(() => {
    async function fetchChannelCode() {
      if (!isActivitySaved) return;

      try {
        const { data, error } = await supabase
          .from('activity_participating_orgs')
          .select('crs_channel_code, role')
          .eq('activity_id', activityId)
          .eq('role', '4') // Implementing partner
          .limit(1)
          .maybeSingle();

        if (!error && data?.crs_channel_code) {
          setChannelCode(data.crs_channel_code);
        }
      } catch (err) {
        console.error('Error fetching channel code:', err);
      }
    }

    fetchChannelCode();
  }, [activityId, isActivitySaved]);

  // Handle loan terms save
  const handleSaveLoanTerms = async () => {
    if (!isActivitySaved) {
      toast.error('Please save the activity first');
      return;
    }

    setSavingLoanTerms(true);
    setLoanTermsSaved(false);

    try {
      // Build other_flags array
      const otherFlags: OtherFlag[] = selectedCRSFlags.map(code => ({
        code,
        significance: '1' // Applicable
      }));

      const data: CreateLoanTermsData = {
        activity_id: activityId,
        rate_1: loanTermsForm.rate_1 ? parseFloat(loanTermsForm.rate_1) : null,
        rate_2: loanTermsForm.rate_2 ? parseFloat(loanTermsForm.rate_2) : null,
        repayment_type_code: (loanTermsForm.repayment_type_code || null) as RepaymentType | null,
        repayment_plan_code: (loanTermsForm.repayment_plan_code || null) as RepaymentPlan | null,
        commitment_date: loanTermsForm.commitment_date || null,
        repayment_first_date: loanTermsForm.repayment_first_date || null,
        repayment_final_date: loanTermsForm.repayment_final_date || null,
        other_flags: otherFlags
      };

      const success = await saveLoanTerms(data);

      if (success) {
        setLoanTermsSaved(true);
        setTimeout(() => setLoanTermsSaved(false), 3000);
        toast.success('Loan terms saved successfully!');
      } else {
        toast.error('Failed to save loan terms. Check the console for details.');
      }
    } catch (error) {
      console.error('[FinancingTerms] Error in handleSaveLoanTerms:', error);
      toast.error('An error occurred while saving loan terms');
    } finally {
      setSavingLoanTerms(false);
    }
  };

  // Handle add loan status
  const handleAddLoanStatus = async (data: CreateLoanStatusData) => {
    const success = await createLoanStatus(data);
    return success;
  };

  // Handle update loan status
  const handleUpdateLoanStatus = async (id: string, data?: Partial<CreateLoanStatusData>): Promise<boolean> => {
    const payload = data ?? editingLoanStatusValues;
    const success = await updateLoanStatus(id, payload);
    if (success) {
      setEditingLoanStatusId(null);
      setEditingLoanStatusValues({});
    }
    return !!success;
  };

  // Handle delete loan status
  const handleDeleteLoanStatus = async (id: string, year: number) => {
    if (await confirm({ title: 'Delete loan status?', description: `Are you sure you want to delete the loan status for year ${year}?`, confirmLabel: 'Delete', cancelLabel: 'Keep' })) {
      const snapshot = loanStatuses.find(s => s.id === id);
      await deleteLoanStatus(id);
      toast(`Removed loan status for ${year}`, snapshot ? {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              // Re-create via the same path used for adding
              await createLoanStatus({
                activity_id: activityId,
                year: snapshot.year,
                value: (snapshot as any).value,
                currency: (snapshot as any).currency,
                value_date: (snapshot as any).value_date,
              } as any);
              toast.success('Loan status restored');
            } catch {
              toast.error("Couldn't restore the loan status. Please add it again manually.");
            }
          },
        },
      } : undefined);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-foreground"></div>
      </div>
    );
  }

  if (!isActivitySaved) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Please save the activity first before adding financing terms.
        </AlertDescription>
      </Alert>
    );
  }

  // Helper function to get repayment type label
  const getRepaymentTypeLabel = (code: string) => {
    const type = REPAYMENT_TYPES.find(t => t.code === code);
    return type ? type.name : code;
  };

  // Helper function to get repayment plan label
  const getRepaymentPlanLabel = (code: string) => {
    const plan = REPAYMENT_PLANS.find(p => p.code === code);
    return plan ? plan.name : code;
  };

  // Helper function to format date as "1 Jan 2023" (used in tables)
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to format date as "1 January 2023" (used in display cards)
  const formatDateLong = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Loan Terms Hero Cards */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
          <CardTitle className="flex items-center gap-2">
            Loan Terms
            <HelpTextTooltip content="Interest rates, repayment schedule, and commitment dates" />
            {loanTermsSaved && <CheckCircle className="h-5 w-5 text-[hsl(var(--success-icon))]" />}
          </CardTitle>
            </div>
            {!readOnly && (
              <Dialog open={showLoanTermsModal} onOpenChange={setShowLoanTermsModal}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit Loan Terms
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[75vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Edit Loan Terms</DialogTitle>
                    <DialogDescription>Update the loan repayment terms including rates, dates, and payment schedule.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Rates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate-1" className="flex items-center gap-2">
                Primary Interest Rate
                <HelpTextTooltip content="The main interest rate for the loan (percentage)" />
              </Label>
              <div className="relative">
                <Input
                  id="rate-1"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={loanTermsForm.rate_1}
                  onChange={(e) => setLoanTermsForm({ ...loanTermsForm, rate_1: e.target.value })}
                  placeholder="e.g., 4.00"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate-2" className="flex items-center gap-2">
                Secondary Interest Rate
                <HelpTextTooltip content="A second interest rate, if applicable (percentage)" />
              </Label>
              <div className="relative">
                <Input
                  id="rate-2"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={loanTermsForm.rate_2}
                  onChange={(e) => setLoanTermsForm({ ...loanTermsForm, rate_2: e.target.value })}
                  placeholder="e.g., 3.00"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Repayment Type and Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Repayment Type
                <HelpTextTooltip content="How the principal amount is repaid" />
              </Label>
              <RepaymentTypeSelect
                value={loanTermsForm.repayment_type_code}
                onValueChange={(value) => setLoanTermsForm({ ...loanTermsForm, repayment_type_code: value })}
                placeholder="Select repayment type..."
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Repayment Plan
                <HelpTextTooltip content="Frequency of repayments" />
              </Label>
              <RepaymentPlanSelect
                value={loanTermsForm.repayment_plan_code}
                onValueChange={(value) => setLoanTermsForm({ ...loanTermsForm, repayment_plan_code: value })}
                placeholder="Select repayment plan..."
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commitment-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Commitment Date
                <HelpTextTooltip content="Date when the loan was committed" />
              </Label>
              <DatePicker
                id="commitment-date"
                value={loanTermsForm.commitment_date}
                onChange={(value) => setLoanTermsForm({ ...loanTermsForm, commitment_date: value })}
                placeholder="Select commitment date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repayment-first-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                First Repayment
                <HelpTextTooltip content="Date of first scheduled repayment" />
              </Label>
              <DatePicker
                id="repayment-first-date"
                value={loanTermsForm.repayment_first_date}
                onChange={(value) => setLoanTermsForm({ ...loanTermsForm, repayment_first_date: value })}
                placeholder="Select first repayment date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repayment-final-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Final Repayment
                <HelpTextTooltip content="Date of final scheduled repayment" />
              </Label>
              <DatePicker
                id="repayment-final-date"
                value={loanTermsForm.repayment_final_date}
                onChange={(value) => setLoanTermsForm({ ...loanTermsForm, repayment_final_date: value })}
                placeholder="Select final repayment date"
              />
            </div>
          </div>

          {/* OECD CRS Flags */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              OECD CRS Flags
              <HelpTextTooltip content="Select applicable OECD CRS reporting flags" />
            </Label>
            <OECDCRSFlagsMultiSelect
              value={selectedCRSFlags}
              onValueChange={setSelectedCRSFlags}
              placeholder="Select CRS flags..."
            />
          </div>

          {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                        onClick={() => {
                          handleSaveLoanTerms();
                          setShowLoanTermsModal(false);
                        }}
                disabled={savingLoanTerms}
                className="flex items-center gap-2"
              >
                {savingLoanTerms ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Loan Terms
                  </>
                )}
              </Button>
            </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* First Row: Interest Rates and Repayment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Interest Rates Card */}
              <Card className="hover:border-border transition-colors">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div>
                      <div className="text-helper font-medium text-muted-foreground mb-1 flex items-center">
                        Primary Interest Rate
                        <HelpTextTooltip size="sm" content="The main interest rate for the loan (percentage)" />
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        {loanTermsForm.rate_1 ? `${loanTermsForm.rate_1}%` : '-'}
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="text-helper font-medium text-muted-foreground mb-1 flex items-center">
                        Secondary Interest Rate
                        <HelpTextTooltip size="sm" content="A second interest rate, if applicable (percentage)" />
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        {loanTermsForm.rate_2 ? `${loanTermsForm.rate_2}%` : '-'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Repayment Info Card */}
              <Card className="hover:border-border transition-colors">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div>
                      <div className="text-helper font-medium text-muted-foreground mb-1 flex items-center">
                        Repayment Type
                        <HelpTextTooltip size="sm" content="How the principal amount is repaid" />
                      </div>
                      <div className="text-body font-semibold text-foreground">
                        {loanTermsForm.repayment_type_code ?
                          getRepaymentTypeLabel(loanTermsForm.repayment_type_code) :
                          '-'
                        }
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="text-helper font-medium text-muted-foreground mb-1 flex items-center">
                        Repayment Plan
                        <HelpTextTooltip size="sm" content="Frequency of repayments" />
                      </div>
                      <div className="text-body font-semibold text-foreground">
                        {loanTermsForm.repayment_plan_code ?
                          getRepaymentPlanLabel(loanTermsForm.repayment_plan_code) :
                          '-'
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Second Row: Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Commitment Date */}
              <Card className="hover:border-border transition-colors">
                <CardContent className="p-6">
                  <div className="text-helper font-medium text-muted-foreground mb-1 flex items-center">
                    Commitment Date
                    <HelpTextTooltip size="sm" content="Date when the loan was committed" />
                  </div>
                  <div className="text-body font-semibold text-foreground">
                    {loanTermsForm.commitment_date ? formatDateLong(loanTermsForm.commitment_date) : '-'}
                  </div>
                </CardContent>
              </Card>

              {/* First Repayment */}
              <Card className="hover:border-border transition-colors">
                <CardContent className="p-6">
                  <div className="text-helper font-medium text-muted-foreground mb-1 flex items-center">
                    First Repayment
                    <HelpTextTooltip size="sm" content="Date of first scheduled repayment" />
                  </div>
                  <div className="text-body font-semibold text-foreground">
                    {loanTermsForm.repayment_first_date ? formatDateLong(loanTermsForm.repayment_first_date) : '-'}
                  </div>
                </CardContent>
              </Card>

              {/* Final Repayment */}
              <Card className="hover:border-border transition-colors">
                <CardContent className="p-6">
                  <div className="text-helper font-medium text-muted-foreground mb-1 flex items-center">
                    Final Repayment
                    <HelpTextTooltip size="sm" content="Date of final scheduled repayment" />
                  </div>
                  <div className="text-body font-semibold text-foreground">
                    {loanTermsForm.repayment_final_date ? formatDateLong(loanTermsForm.repayment_final_date) : '-'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Third Row: OECD CRS Flags */}
            <div className="grid grid-cols-1 gap-4">
              <Card className="hover:border-border transition-colors">
                <CardContent className="p-6">
                  <div className="text-helper font-medium text-muted-foreground mb-1 flex items-center">
                    OECD CRS Flags
                    <HelpTextTooltip size="sm" content="Applicable OECD CRS reporting flags for this loan" />
                  </div>
                  <div className="text-body font-semibold text-foreground">
                    {selectedCRSFlags.length > 0 ? `${selectedCRSFlags.length} selected` : '-'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loan Status Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Loan Status
                <HelpTextTooltip content="Annual reporting of loan principal, arrears, and interest received" />
              </CardTitle>
            </div>
            {!readOnly && (
              <Button
                onClick={() => setShowAddLoanStatusModal(true)}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Year
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>

          {/* Loan Status Table */}
          {loanStatuses.length > 0 ? (
            <div className="relative w-full overflow-x-auto overflow-y-visible">
              <table className="w-full caption-bottom text-body border border-border dark:border-gray-700 rounded-lg">
                <thead className="bg-surface-muted">
                  <tr>
                    {([
                      { key: 'year', label: 'Year', align: 'left' },
                      { key: 'value_date', label: 'Value Date', align: 'left', widthClass: 'min-w-[120px] whitespace-nowrap' },
                      { key: 'interest_received', label: 'Interest Received', align: 'right' },
                      { key: 'principal_outstanding', label: 'Principal Outstanding', align: 'right' },
                      { key: 'principal_arrears', label: 'Principal Arrears', align: 'right' },
                      { key: 'interest_arrears', label: 'Interest Arrears', align: 'right' }
                    ] as { key: LoanStatusSortKey; label: string; align: 'left' | 'right'; widthClass?: string }[]).map(col => {
                      const isActive = loanStatusSort.key === col.key;
                      return (
                        <th
                          key={col.key}
                          className={cn(
                            'p-2 font-medium select-none cursor-pointer hover:bg-muted/40',
                            col.align === 'right' ? 'text-right' : 'text-left',
                            col.widthClass
                          )}
                          onClick={() => handleLoanStatusSort(col.key)}
                          aria-sort={isActive ? (loanStatusSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <span className={cn('inline-flex items-center gap-1', col.align === 'right' && 'justify-end w-full')}>
                            {col.label}
                            {getSortIcon(col.key, loanStatusSort.key, loanStatusSort.direction)}
                          </span>
                        </th>
                      );
                    })}
                    {!readOnly && <th className="text-center p-2 font-medium" />}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedLoanStatuses.map((status) => (
                    <tr key={status.id} className="hover:bg-muted/50">
                      <td className="p-2 font-medium">{status.year}</td>
                      <td className="p-2 whitespace-nowrap">{status.value_date ? formatDate(status.value_date) : '-'}</td>
                      <td className="p-2 text-right tabular-nums">
                        {status.interest_received != null ? (
                          <>
                            {status.currency && <span className="text-muted-foreground text-helper">{status.currency}</span>}
                            {status.currency ? ' ' : ''}
                            {status.interest_received.toLocaleString()}
                          </>
                        ) : '-'}
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {status.principal_outstanding != null ? (
                          <>
                            {status.currency && <span className="text-muted-foreground text-helper">{status.currency}</span>}
                            {status.currency ? ' ' : ''}
                            {status.principal_outstanding.toLocaleString()}
                          </>
                        ) : '-'}
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {status.principal_arrears != null ? (
                          <>
                            {status.currency && <span className="text-muted-foreground text-helper">{status.currency}</span>}
                            {status.currency ? ' ' : ''}
                            {status.principal_arrears.toLocaleString()}
                          </>
                        ) : '0'}
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {status.interest_arrears != null ? (
                          <>
                            {status.currency && <span className="text-muted-foreground text-helper">{status.currency}</span>}
                            {status.currency ? ' ' : ''}
                            {status.interest_arrears.toLocaleString()}
                          </>
                        ) : '0'}
                      </td>
                      {!readOnly && (
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              onClick={() => {
                                setEditingLoanStatusId(status.id);
                                setEditingLoanStatusValues({
                                  year: status.year,
                                  currency: status.currency,
                                  value_date: status.value_date,
                                  interest_received: status.interest_received,
                                  principal_outstanding: status.principal_outstanding,
                                  principal_arrears: status.principal_arrears,
                                  interest_arrears: status.interest_arrears
                                });
                                setShowAddLoanStatusModal(true);
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteLoanStatus(status.id, status.year)}
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <img src="/images/empty-galley.webp" alt="No loan status entries" className="h-32 mx-auto mb-4 opacity-50" />
              <h3 className="text-base font-semibold mb-2">No yearly loan status recorded</h3>
              <p className="text-muted-foreground">
                Add annual reporting data for principal outstanding, arrears, and interest received.
              </p>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Add Loan Status Modal */}
      <AddLoanStatusModal
        open={showAddLoanStatusModal}
        onOpenChange={(open) => {
          setShowAddLoanStatusModal(open);
          if (!open) {
            setEditingLoanStatusId(null);
            setEditingLoanStatusValues({});
          }
        }}
        onSubmit={handleAddLoanStatus}
        onUpdate={handleUpdateLoanStatus}
        activityId={activityId}
        editingId={editingLoanStatusId}
        editingValues={editingLoanStatusValues}
      />
      <ConfirmDialog />
    </div>
  );
}

