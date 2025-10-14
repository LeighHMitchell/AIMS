'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  TrendingUp
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
  const [showAddLoanStatus, setShowAddLoanStatus] = useState(false);
  const [newLoanStatus, setNewLoanStatus] = useState<Partial<CreateLoanStatusData>>({
    year: new Date().getFullYear(),
    currency: 'USD'
  });
  const [editingLoanStatusId, setEditingLoanStatusId] = useState<string | null>(null);
  const [editingLoanStatusValues, setEditingLoanStatusValues] = useState<Partial<UpdateLoanStatusData>>({});

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
  const handleAddLoanStatus = async () => {
    if (!newLoanStatus.year || !newLoanStatus.currency) {
      toast.error('Year and currency are required');
      return;
    }

    const data: CreateLoanStatusData = {
      activity_id: activityId,
      year: newLoanStatus.year,
      currency: newLoanStatus.currency,
      value_date: newLoanStatus.value_date || null,
      interest_received: newLoanStatus.interest_received || null,
      principal_outstanding: newLoanStatus.principal_outstanding || null,
      principal_arrears: newLoanStatus.principal_arrears || null,
      interest_arrears: newLoanStatus.interest_arrears || null
    };

    const success = await createLoanStatus(data);
    if (success) {
      setShowAddLoanStatus(false);
      setNewLoanStatus({
        year: new Date().getFullYear(),
        currency: 'USD'
      });
    }
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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

  return (
    <div className={cn("space-y-6", className)}>
      {/* Loan Terms Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-600" />
            Loan Terms
            {loanTermsSaved && <CheckCircle2 className="h-5 w-5 text-green-600" />}
          </CardTitle>
          <CardDescription>
            Interest rates, repayment schedule, and commitment dates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  disabled={readOnly}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
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
                  disabled={readOnly}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
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
                disabled={readOnly}
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
                disabled={readOnly}
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
                disabled={readOnly}
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
                disabled={readOnly}
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
                disabled={readOnly}
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
              disabled={readOnly}
              placeholder="Select CRS flags..."
            />
          </div>

          {/* Save Button */}
          {!readOnly && (
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveLoanTerms}
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
          )}
        </CardContent>
      </Card>

      {/* Loan Status Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-gray-600" />
                Loan Status (Yearly)
              </CardTitle>
              <CardDescription>
                Annual reporting of loan principal, arrears, and interest received
              </CardDescription>
            </div>
            {!readOnly && (
              <Button
                onClick={() => setShowAddLoanStatus(true)}
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
          {/* Add New Loan Status Form */}
          {showAddLoanStatus && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Add Loan Status for Year</h4>
                <Button
                  onClick={() => setShowAddLoanStatus(false)}
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="new-year" className="text-xs">Year *</Label>
                  <Input
                    id="new-year"
                    type="number"
                    value={newLoanStatus.year || ''}
                    onChange={(e) => setNewLoanStatus({ ...newLoanStatus, year: parseInt(e.target.value) })}
                    placeholder="2024"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="new-currency" className="text-xs">Currency *</Label>
                  <Input
                    id="new-currency"
                    type="text"
                    value={newLoanStatus.currency || ''}
                    onChange={(e) => setNewLoanStatus({ ...newLoanStatus, currency: e.target.value.toUpperCase() })}
                    placeholder="USD"
                    maxLength={3}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="new-value-date" className="text-xs">Value Date</Label>
                  <Input
                    id="new-value-date"
                    type="date"
                    value={newLoanStatus.value_date || ''}
                    onChange={(e) => setNewLoanStatus({ ...newLoanStatus, value_date: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="new-interest-received" className="text-xs">Interest Received</Label>
                  <Input
                    id="new-interest-received"
                    type="number"
                    step="0.01"
                    value={newLoanStatus.interest_received || ''}
                    onChange={(e) => setNewLoanStatus({ ...newLoanStatus, interest_received: parseFloat(e.target.value) })}
                    placeholder="0.00"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="new-principal-outstanding" className="text-xs">Principal Outstanding</Label>
                  <Input
                    id="new-principal-outstanding"
                    type="number"
                    step="0.01"
                    value={newLoanStatus.principal_outstanding || ''}
                    onChange={(e) => setNewLoanStatus({ ...newLoanStatus, principal_outstanding: parseFloat(e.target.value) })}
                    placeholder="0.00"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="new-principal-arrears" className="text-xs">Principal Arrears</Label>
                  <Input
                    id="new-principal-arrears"
                    type="number"
                    step="0.01"
                    value={newLoanStatus.principal_arrears || ''}
                    onChange={(e) => setNewLoanStatus({ ...newLoanStatus, principal_arrears: parseFloat(e.target.value) })}
                    placeholder="0.00"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="new-interest-arrears" className="text-xs">Interest Arrears</Label>
                  <Input
                    id="new-interest-arrears"
                    type="number"
                    step="0.01"
                    value={newLoanStatus.interest_arrears || ''}
                    onChange={(e) => setNewLoanStatus({ ...newLoanStatus, interest_arrears: parseFloat(e.target.value) })}
                    placeholder="0.00"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleAddLoanStatus} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Loan Status Table */}
          {loanStatuses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
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
                    <tr key={status.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{status.year}</td>
                      <td className="p-2">{status.currency}</td>
                      <td className="p-2">{status.value_date || '-'}</td>
                      <td className="p-2 text-right">{status.interest_received?.toLocaleString() || '-'}</td>
                      <td className="p-2 text-right">{status.principal_outstanding?.toLocaleString() || '-'}</td>
                      <td className="p-2 text-right">{status.principal_arrears?.toLocaleString() || '0'}</td>
                      <td className="p-2 text-right">{status.interest_arrears?.toLocaleString() || '0'}</td>
                      {!readOnly && (
                        <td className="p-2 text-center">
                          <Button
                            onClick={() => handleDeleteLoanStatus(status.id, status.year)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No loan status entries yet</p>
              <p className="text-sm">Click "Add Year" to record yearly loan status</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel Code (Read-Only Reference) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-gray-600" />
            CRS Channel Code
          </CardTitle>
          <CardDescription className="text-xs">
            Derived from participating organisations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {channelCode ? (
            <div className="p-3 bg-gray-50 rounded-md border">
              <div className="font-medium text-sm">{channelCode}</div>
              <div className="text-xs text-gray-600 mt-1">
                This channel code is automatically populated from the primary implementing organisation
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No channel code available. Add an implementing organisation with a CRS channel code.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

