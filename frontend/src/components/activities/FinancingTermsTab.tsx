'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  CheckCircle2, 
  Info, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Save,
  ChevronDown,
  DollarSign,
  Calendar,
  TrendingUp,
  Pencil,
  Percent,
  Clock,
  FileText
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { cn } from '@/lib/utils';
import { useFinancingTerms } from '@/hooks/use-financing-terms';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  FinancingTermsTabProps,
  CreateLoanStatusData,
  UpdateLoanStatusData,
  OtherFlag
} from '@/types/financing-terms';
import { REPAYMENT_TYPES } from '@/data/repayment-types';
import { REPAYMENT_PLANS } from '@/data/repayment-plans';
import { OECD_CRS_FLAGS } from '@/data/oecd-crs-flags';
import { RepaymentTypeSelect } from '@/components/forms/RepaymentTypeSelect';
import { RepaymentPlanSelect } from '@/components/forms/RepaymentPlanSelect';
import { OECDCRSFlagsMultiSelect } from '@/components/forms/OECDCRSFlagsMultiSelect';
import { AddLoanStatusModal } from './AddLoanStatusModal';

export function FinancingTermsTab({ 
  activityId, 
  readOnly = false,
  className,
  onFinancingTermsChange 
}: FinancingTermsTabProps) {
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

  // Notify parent of completion status
  useEffect(() => {
    onFinancingTermsChange?.(hasCompletedData);
  }, [hasCompletedData, onFinancingTermsChange]);

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

    console.log('[FinancingTerms] Saving loan terms...');
    setSavingLoanTerms(true);
    setLoanTermsSaved(false);

    try {
      // Build other_flags array
      const otherFlags: OtherFlag[] = selectedCRSFlags.map(code => ({
        code,
        significance: '1' // Applicable
      }));

      const data = {
        activity_id: activityId,
        rate_1: loanTermsForm.rate_1 ? parseFloat(loanTermsForm.rate_1) : null,
        rate_2: loanTermsForm.rate_2 ? parseFloat(loanTermsForm.rate_2) : null,
        repayment_type_code: loanTermsForm.repayment_type_code || null,
        repayment_plan_code: loanTermsForm.repayment_plan_code || null,
        commitment_date: loanTermsForm.commitment_date || null,
        repayment_first_date: loanTermsForm.repayment_first_date || null,
        repayment_final_date: loanTermsForm.repayment_final_date || null,
        other_flags: otherFlags
      };

      console.log('[FinancingTerms] Data to save:', data);
      const success = await saveLoanTerms(data);
      console.log('[FinancingTerms] Save result:', success);

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
  const handleUpdateLoanStatus = async (id: string) => {
    const success = await updateLoanStatus(id, editingLoanStatusValues);
    if (success) {
      setEditingLoanStatusId(null);
      setEditingLoanStatusValues({});
    }
  };

  // Handle delete loan status
  const handleDeleteLoanStatus = async (id: string, year: number) => {
    if (window.confirm(`Are you sure you want to delete the loan status for year ${year}?`)) {
      await deleteLoanStatus(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
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

  // Helper function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
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
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            Loan Terms
            {loanTermsSaved && <CheckCircle2 className="h-5 w-5 text-green-600" />}
          </CardTitle>
          <CardDescription>
            Interest rates, repayment schedule, and commitment dates
          </CardDescription>
            </div>
            {!readOnly && (
              <Dialog open={showLoanTermsModal} onOpenChange={setShowLoanTermsModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    Edit Loan Terms
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[75vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Edit Loan Terms</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Rates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate-1" className="flex items-center gap-2">
                Interest Rate 1
                <HelpTextTooltip content="Primary interest rate for the loan (percentage)" />
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
                Interest Rate 2
                <HelpTextTooltip content="Secondary interest rate if applicable (percentage)" />
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
              <Input
                id="commitment-date"
                type="date"
                value={loanTermsForm.commitment_date}
                onChange={(e) => setLoanTermsForm({ ...loanTermsForm, commitment_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repayment-first-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                First Repayment
                <HelpTextTooltip content="Date of first scheduled repayment" />
              </Label>
              <Input
                id="repayment-first-date"
                type="date"
                value={loanTermsForm.repayment_first_date}
                onChange={(e) => setLoanTermsForm({ ...loanTermsForm, repayment_first_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repayment-final-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Final Repayment
                <HelpTextTooltip content="Date of final scheduled repayment" />
              </Label>
              <Input
                id="repayment-final-date"
                type="date"
                value={loanTermsForm.repayment_final_date}
                onChange={(e) => setLoanTermsForm({ ...loanTermsForm, repayment_final_date: e.target.value })}
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
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
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Interest Rate 1</div>
                        <div className="text-lg font-semibold text-foreground">
                          {loanTermsForm.rate_1 ? `${loanTermsForm.rate_1}%` : '-'}
                        </div>
                      </div>
                      <div className="border-t pt-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Interest Rate 2</div>
                        <div className="text-lg font-semibold text-foreground">
                          {loanTermsForm.rate_2 ? `${loanTermsForm.rate_2}%` : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Repayment Info Card */}
              <Card className="hover:border-border transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Repayment Type</div>
                        <div className="text-sm font-semibold text-foreground">
                          {loanTermsForm.repayment_type_code ? 
                            getRepaymentTypeLabel(loanTermsForm.repayment_type_code) : 
                            '-'
                          }
                        </div>
                      </div>
                      <div className="border-t pt-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Repayment Plan</div>
                        <div className="text-sm font-semibold text-foreground">
                          {loanTermsForm.repayment_plan_code ? 
                            getRepaymentPlanLabel(loanTermsForm.repayment_plan_code) : 
                            '-'
                          }
                        </div>
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
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Commitment Date</div>
                      <div className="text-sm font-semibold text-foreground">
                        {loanTermsForm.commitment_date ? formatDate(loanTermsForm.commitment_date) : '-'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* First Repayment */}
              <Card className="hover:border-border transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">First Repayment</div>
                      <div className="text-sm font-semibold text-foreground">
                        {loanTermsForm.repayment_first_date ? formatDate(loanTermsForm.repayment_first_date) : '-'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Final Repayment */}
              <Card className="hover:border-border transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Final Repayment</div>
                      <div className="text-sm font-semibold text-foreground">
                        {loanTermsForm.repayment_final_date ? formatDate(loanTermsForm.repayment_final_date) : '-'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Third Row: OECD CRS Flags */}
            <div className="grid grid-cols-1 gap-4">
              <Card className="hover:border-border transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground mb-1">OECD CRS Flags</div>
                      <div className="text-sm font-semibold text-foreground">
                        {selectedCRSFlags.length > 0 ? `${selectedCRSFlags.length} selected` : '-'}
                      </div>
                    </div>
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
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Loan Status (Yearly)
              </CardTitle>
              <CardDescription>
                Annual reporting of loan principal, arrears, and interest received
              </CardDescription>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="text-left p-2 font-medium">Year</th>
                    <th className="text-left p-2 font-medium">Currency</th>
                    <th className="text-left p-2 font-medium">Value Date</th>
                    <th className="text-right p-2 font-medium">Interest Received</th>
                    <th className="text-right p-2 font-medium">Principal Outstanding</th>
                    <th className="text-right p-2 font-medium">Principal Arrears</th>
                    <th className="text-right p-2 font-medium">Interest Arrears</th>
                    {!readOnly && <th className="text-center p-2 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loanStatuses.map((status) => (
                    <tr key={status.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{status.year}</td>
                      <td className="p-2">{status.currency}</td>
                      <td className="p-2">{status.value_date || '-'}</td>
                      <td className="p-2 text-right">{status.interest_received?.toLocaleString() || '-'}</td>
                      <td className="p-2 text-right">{status.principal_outstanding?.toLocaleString() || '-'}</td>
                      <td className="p-2 text-right">{status.principal_arrears?.toLocaleString() || '0'}</td>
                      <td className="p-2 text-right">{status.interest_arrears?.toLocaleString() || '0'}</td>
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
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
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
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p>No loan status entries yet</p>
              <p className="text-sm">Click "Add Year" to record yearly loan status</p>
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
    </div>
  );
}

