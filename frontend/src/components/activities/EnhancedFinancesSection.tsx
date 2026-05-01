import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropdownState } from '@/contexts/DropdownContext';
import { DefaultFieldsSection } from '@/components/forms/DefaultFieldsSection';
import { SupabaseSelect, withSupabaseIntegration } from '@/components/forms/SupabaseSelect';
import TransactionsManager from '@/components/TransactionsManager';
import { AidTypeSelect } from '@/components/forms/AidTypeSelect';
import { DefaultFinanceTypeSelect } from '@/components/forms/DefaultFinanceTypeSelect';
import { FlowTypeSelect } from '@/components/forms/FlowTypeSelect';
import { CurrencySelector } from '@/components/forms/CurrencySelector';
import { TiedStatusSelect } from '@/components/forms/TiedStatusSelect';
import { DisbursementChannelSelect } from '@/components/forms/DisbursementChannelSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CheckCircle, CreditCard, Settings, Wallet, ArrowDownToLine, ArrowUpFromLine, Scale, Link2 } from 'lucide-react';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { ModalitySearchableSelect } from '@/components/forms/ModalitySearchableSelect';
import { FinanceTypeSearchableSelect } from '@/components/forms/FinanceTypeSearchableSelect';

import { areAllDefaultFieldsCompleted } from '@/utils/defaultFieldsValidation';
import { calculateModality } from '@/utils/modality-calculation';
import { useSupabaseFieldUpdate } from '@/hooks/use-supabase-field-update';
import { FundOverviewView } from '@/components/activities/fund/FundOverviewView';
import { FundContributionsView } from '@/components/activities/fund/FundContributionsView';
import { FundDisbursementsView } from '@/components/activities/fund/FundDisbursementsView';
import { FundReconciliationView } from '@/components/activities/fund/FundReconciliationView';
import { FundSuggestedLinksView } from '@/components/activities/fund/FundSuggestedLinksView';

// Enhanced components with Supabase integration
const SupabaseAidTypeSelect = withSupabaseIntegration(AidTypeSelect);
const SupabaseFinanceTypeSelect = withSupabaseIntegration(DefaultFinanceTypeSelect);
const SupabaseFlowTypeSelect = withSupabaseIntegration(FlowTypeSelect);
const SupabaseCurrencySelector = withSupabaseIntegration(CurrencySelector);
const SupabaseTiedStatusSelect = withSupabaseIntegration(TiedStatusSelect);
const SupabaseDisbursementChannelSelect = withSupabaseIntegration(DisbursementChannelSelect);
const SupabaseFinanceTypeSearchableSelect = withSupabaseIntegration(FinanceTypeSearchableSelect);
const SupabaseModalitySearchableSelect = withSupabaseIntegration(ModalitySearchableSelect);

interface ActivitySector {
  id?: string;
  sector_code?: string;
  sector_name?: string;
  percentage?: number;
}

interface EnhancedFinancesSectionProps {
  activityId: string | null;
  general: {
    defaultAidType?: string | null;
    defaultFinanceType?: string | null;
    defaultFlowType?: string | null;
    defaultCurrency?: string | null;
    defaultTiedStatus?: string | null;
    defaultDisbursementChannel?: string | null;
    defaultModality?: string | null; // Changed to camelCase
    defaultModalityOverride?: boolean; // Changed to camelCase
    otherIdentifier?: string | null;
    is_pooled_fund?: boolean;
  };
  onDefaultsChange?: (field: string, value: string | null | boolean) => void;
  transactions?: any[];
  onTransactionsChange?: (transactions: any[]) => void;
  onRefreshNeeded?: () => Promise<void>;
  disabled?: boolean;
  initialTransactionId?: string;
  geographyLevel?: 'activity' | 'transaction';
  activitySectors?: ActivitySector[];
  activityIsHumanitarian?: boolean;
}

export function EnhancedFinancesSection({
  activityId,
  general,
  onDefaultsChange,
  transactions = [],
  onTransactionsChange,
  onRefreshNeeded,
  disabled = false,
  initialTransactionId,
  geographyLevel = 'activity',
  activitySectors = [],
  activityIsHumanitarian = false,
}: EnhancedFinancesSectionProps) {
  // State for modality override toggle
  const [modalityOverride, setModalityOverride] = useState(
    general.defaultModalityOverride ?? false
  );

  // Sync modalityOverride state when general data changes
  useEffect(() => {
    setModalityOverride(general.defaultModalityOverride ?? false);
  }, [general.defaultModalityOverride]);

  // Check if all fields are completed for green tick (excluding disbursement channel as it's not in backend)
  const allFieldsCompleted = areAllDefaultFieldsCompleted({
    defaultAidType: general.defaultAidType ?? undefined,
    defaultFinanceType: general.defaultFinanceType ?? undefined,
    defaultFlowType: general.defaultFlowType ?? undefined,
    defaultCurrency: general.defaultCurrency ?? undefined,
    defaultTiedStatus: general.defaultTiedStatus ?? undefined,
    default_aid_modality: general.defaultModality ?? undefined, // Updated to camelCase
  });

  // Get individual field completion status
  const fieldCompletion = {
    aidType: Boolean(general.defaultAidType),
    financeType: Boolean(general.defaultFinanceType),
    flowType: Boolean(general.defaultFlowType),
    currency: Boolean(general.defaultCurrency),
    tiedStatus: Boolean(general.defaultTiedStatus),
    disbursementChannel: Boolean(general.defaultDisbursementChannel),
    modality: Boolean(general.defaultModality), // Updated to camelCase
  };

  // Exclusive dropdown state - only one dropdown open at a time
  const aidTypeDropdown = useDropdownState('defaults-aid-type');
  const currencyDropdown = useDropdownState('defaults-currency');
  const flowTypeDropdown = useDropdownState('defaults-flow-type');
  const tiedStatusDropdown = useDropdownState('defaults-tied-status');
  const financeTypeDropdown = useDropdownState('defaults-finance-type');
  const disbursementChannelDropdown = useDropdownState('defaults-disbursement-channel');

  // Use refs to hold the latest callbacks to avoid recreating useCallback wrappers
  const onDefaultsChangeRef = useRef(onDefaultsChange);
  onDefaultsChangeRef.current = onDefaultsChange;

  const handleFieldUpdate = useCallback((field: string, value: string | null) => {
    // Call parent callback via ref to avoid stale closure
    onDefaultsChangeRef.current?.(field, value);
  }, []);

  const handleFieldError = useCallback((field: string, error: Error) => {
    console.error(`[EnhancedFinancesSection] Field update error for ${field}:`, error);
  }, []);

  const handleMissingColumnError = useCallback((field: string, error: Error) => {
    // Handle missing column gracefully
    if (error.message.includes('default_modality') && error.message.includes('schema cache')) {
      console.warn(`[EnhancedFinancesSection] Column ${field} not yet added to Supabase. Skipping database save.`);
      // Still update local state
      handleFieldUpdate(field, null);
    } else {
      handleFieldError(field, error);
    }
  }, [handleFieldUpdate, handleFieldError]);

  // Supabase field update hook for boolean fields (declared after handleFieldUpdate and handleFieldError)
  const { updateField: updateSupabaseField } = useSupabaseFieldUpdate(activityId, {
    tableName: 'activities',
    onSuccess: handleFieldUpdate,
    onError: handleMissingColumnError,
    showSuccessToast: false,
    showErrorToast: false // Disable error toasts for missing columns
  });

  // Refs for stable access in the modality effect (avoids infinite re-render loop)
  const updateSupabaseFieldRef = useRef(updateSupabaseField);
  updateSupabaseFieldRef.current = updateSupabaseField;

  // Auto-calculate modality when relevant fields change and override is off
  useEffect(() => {
    if (!modalityOverride && general.defaultAidType && general.defaultFinanceType) {
      const calculatedModality = calculateModality(
        general.defaultAidType,
        general.defaultFinanceType
      );

      // Only update if different from current value
      if (calculatedModality !== general.defaultModality) {
        console.log('[EnhancedFinancesSection] Auto-calculating modality:', {
          aidType: general.defaultAidType,
          financeType: general.defaultFinanceType,
          calculated: calculatedModality,
          current: general.defaultModality
        });

        // Save to Supabase and update local state (gracefully handle missing columns)
        updateSupabaseFieldRef.current('defaultModality', calculatedModality).catch(error => {
          console.warn('[EnhancedFinancesSection] Could not save to database:', error.message);
        });
        onDefaultsChangeRef.current?.('defaultModality', calculatedModality);
      }
    }
  }, [general.defaultAidType, general.defaultFinanceType, modalityOverride, general.defaultModality]);

  const handleModalityOverrideChange = async (checked: boolean) => {
    setModalityOverride(checked);
    
    // Save to Supabase (gracefully handle missing columns)
    try {
      await updateSupabaseField('defaultModalityOverride', checked);
    } catch (error) {
      console.warn('[EnhancedFinancesSection] Could not save modality override to database:', error instanceof Error ? error.message : error);
    }
    
    // Update local state
    onDefaultsChange?.('defaultModalityOverride', checked);
    
    // If disabling override, recalculate modality automatically
    if (!checked && general.defaultAidType && general.defaultFinanceType) {
      const calculatedModality = calculateModality(
        general.defaultAidType,
        general.defaultFinanceType
      );
      try {
        await updateSupabaseField('defaultModality', calculatedModality);
      } catch (error) {
        console.warn('[EnhancedFinancesSection] Could not save calculated modality to database:', error instanceof Error ? error.message : error);
      }
      onDefaultsChange?.('defaultModality', calculatedModality);
    } else if (!checked) {
      // Clear modality if we can't calculate it
      try {
        await updateSupabaseField('defaultModality', null);
      } catch (error) {
        console.warn('[EnhancedFinancesSection] Could not clear modality in database:', error instanceof Error ? error.message : error);
      }
      onDefaultsChange?.('defaultModality', null);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Defaults
            {allFieldsCompleted && (
              <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))]" />
            )}
          </TabsTrigger>
          {general?.is_pooled_fund === true && (
            <TabsTrigger value="fund-overview" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Fund Overview
            </TabsTrigger>
          )}
          {general?.is_pooled_fund === true && (
            <TabsTrigger value="fund-contributions" className="flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              Contributions
            </TabsTrigger>
          )}
          {general?.is_pooled_fund === true && (
            <TabsTrigger value="fund-disbursements" className="flex items-center gap-2">
              <ArrowUpFromLine className="h-4 w-4" />
              Disbursements
            </TabsTrigger>
          )}
          {general?.is_pooled_fund === true && (
            <TabsTrigger value="fund-reconciliation" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Reconciliation
            </TabsTrigger>
          )}
          {general?.is_pooled_fund === true && (
            <TabsTrigger value="fund-suggestions" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Suggested Links
            </TabsTrigger>
          )}
        </TabsList>

        {/* Default Values Tab */}
        <TabsContent value="defaults" className="space-y-4">
          {/* Pooled fund aid type guidance */}
          {general?.is_pooled_fund === true && !general?.defaultAidType?.match(/^B0/) && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-body text-amber-900">
              <span className="mt-0.5 shrink-0 text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </span>
              <div>
                <p className="font-medium">Set a pooled fund aid type for IATI compliance</p>
                <p className="mt-1 text-amber-700">
                  This is marked as a pooled fund. The IATI standard expects a B-category aid type such as{' '}
                  <strong>B04</strong> (Basket funds / pooled funding),{' '}
                  <strong>B031</strong> (Multi-donor/multi-entity), or{' '}
                  <strong>B032</strong> (Multi-donor/single-entity). Select one below under Default Aid Type.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Default Fields */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Default Values
                    {allFieldsCompleted && (
                      <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))]" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Default Aid Type */}
                    <div className="space-y-2">
                      <label className="text-body font-medium flex items-center gap-2">
                        Default Aid Type
                        <HelpTextTooltip content="How aid is delivered (e.g., grant, loan, scholarship). Applied to new transactions unless overridden." />
                        {fieldCompletion.aidType && (
                          <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))]" />
                        )}
                      </label>
                      <SupabaseAidTypeSelect
                        activityId={activityId}
                        fieldName="defaultAidType"
                        value={general.defaultAidType}
                        onUpdateSuccess={handleFieldUpdate}
                        onUpdateError={handleFieldError}
                        placeholder="Select Aid Type"
                        disabled={disabled}
                        open={aidTypeDropdown.isOpen}
                        onOpenChange={aidTypeDropdown.setOpen}
                      />
                    </div>

                    {/* Default Currency */}
                    <div className="space-y-2">
                      <label className="text-body font-medium flex items-center gap-2">
                        Default Currency
                        <HelpTextTooltip content="Used for all transactions and budgets in this activity (e.g., USD, EUR, GBP)" />
                        {fieldCompletion.currency && (
                          <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))]" />
                        )}
                      </label>
                      <SupabaseCurrencySelector
                        activityId={activityId}
                        fieldName="defaultCurrency"
                        value={general.defaultCurrency}
                        onUpdateSuccess={handleFieldUpdate}
                        onUpdateError={handleFieldError}
                        placeholder="Select Currency"
                        disabled={disabled}
                        open={currencyDropdown.isOpen}
                        onOpenChange={currencyDropdown.setOpen}
                      />
                    </div>

                    {/* Default Flow Type */}
                    <div className="space-y-2">
                      <label className="text-body font-medium flex items-center gap-2">
                        Default Flow Type
                        <HelpTextTooltip content="The flow type for this activity" />
                        {fieldCompletion.flowType && (
                          <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))]" />
                        )}
                      </label>
                      <SupabaseFlowTypeSelect
                        activityId={activityId}
                        fieldName="defaultFlowType"
                        value={general.defaultFlowType}
                        onUpdateSuccess={handleFieldUpdate}
                        onUpdateError={handleFieldError}
                        placeholder="Select Flow Type"
                        disabled={disabled}
                        open={flowTypeDropdown.isOpen}
                        onOpenChange={flowTypeDropdown.setOpen}
                      />
                    </div>

                    {/* Default Tied Status */}
                    <div className="space-y-2">
                      <label className="text-body font-medium flex items-center gap-2">
                        Default Tied Status
                        <HelpTextTooltip content="The tied status for this activity" />
                        {fieldCompletion.tiedStatus && (
                          <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))]" />
                        )}
                      </label>
                      <SupabaseTiedStatusSelect
                        activityId={activityId}
                        fieldName="defaultTiedStatus"
                        value={general.defaultTiedStatus}
                        onUpdateSuccess={handleFieldUpdate}
                        onUpdateError={handleFieldError}
                        placeholder="Select Tied Status"
                        disabled={disabled}
                        open={tiedStatusDropdown.isOpen}
                        onOpenChange={tiedStatusDropdown.setOpen}
                      />
                    </div>

                    {/* Default Finance Type */}
                    <div className="space-y-2">
                      <label className="text-body font-medium flex items-center gap-2">
                        Default Finance Type
                        <HelpTextTooltip content="The finance type for this activity" />
                        {fieldCompletion.financeType && (
                          <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))]" />
                        )}
                      </label>
                      <SupabaseFinanceTypeSearchableSelect
                        activityId={activityId}
                        fieldName="defaultFinanceType"
                        value={general.defaultFinanceType || ""}
                        onUpdateSuccess={handleFieldUpdate}
                        onUpdateError={handleFieldError}
                        placeholder="Select Finance Type"
                        disabled={disabled}
                        dropdownId="defaults-finance-type"
                      />
                    </div>

                    {/* Default Disbursement Channel */}
                    <div className="space-y-2">
                      <label className="text-body font-medium flex items-center gap-2">
                        Default Disbursement Channel
                        <HelpTextTooltip content="Specifies the channel through which funds are delivered, such as government ministries, non-governmental organisations, or multilateral agencies." />
                        {fieldCompletion.disbursementChannel && (
                          <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))]" />
                        )}
                      </label>
                      <SupabaseDisbursementChannelSelect
                        activityId={activityId}
                        fieldName="defaultDisbursementChannel"
                        value={general.defaultDisbursementChannel}
                        onUpdateSuccess={handleFieldUpdate}
                        onUpdateError={handleFieldError}
                        placeholder="Select Disbursement Channel"
                        disabled={disabled}
                        open={disbursementChannelDropdown.isOpen}
                        onOpenChange={disbursementChannelDropdown.setOpen}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Default Modality Card */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Default Modality
                    {fieldCompletion.modality && (
                      <CheckCircle className="h-4 w-4 text-[hsl(var(--success-icon))]" />
                    )}
                    <HelpTextTooltip content="The default aid modality for this activity" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Override Auto Modality Toggle */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="override-auto-modality"
                        checked={modalityOverride}
                        onCheckedChange={handleModalityOverrideChange}
                        disabled={disabled}
                      />
                      <Label htmlFor="override-auto-modality" className="flex items-center gap-2">
                        Manually Set Modality
                        <HelpTextTooltip content="Modality describes how aid is delivered. Enable this to choose manually instead of auto-detecting from aid type and finance type." />
                      </Label>
                    </div>
                  </div>

                  {/* Default Modality Field */}
                  <div className="space-y-2">
                    <SupabaseModalitySearchableSelect
                      activityId={activityId}
                      fieldName="defaultModality"
                      value={general.defaultModality || ""}
                      onUpdateSuccess={handleFieldUpdate}
                      onUpdateError={handleFieldError}
                      placeholder="Select default modality"
                      disabled={disabled || !modalityOverride}
                      dropdownId="default-modality-select"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="border-0">
          <TransactionsManager
            activityId={activityId || "new"}
            activityPartnerId={general.otherIdentifier || undefined}
            transactions={transactions}
            onTransactionsChange={onTransactionsChange!}
            onRefreshNeeded={onRefreshNeeded}
            defaultFinanceType={general.defaultFinanceType || undefined}
            defaultAidType={general.defaultAidType || undefined}
            defaultCurrency={general.defaultCurrency || undefined}
            defaultTiedStatus={general.defaultTiedStatus || undefined}
            defaultFlowType={general.defaultFlowType || undefined}
            defaultDisbursementChannel={general.defaultDisbursementChannel || undefined}
            initialTransactionId={initialTransactionId}
            geographyLevel={geographyLevel}
            activitySectors={activitySectors}
            isPooledFund={general?.is_pooled_fund === true}
            activityIsHumanitarian={activityIsHumanitarian}
          />
        </TabsContent>

        {general?.is_pooled_fund === true && activityId && (
          <TabsContent value="fund-overview" className="space-y-4">
            <FundOverviewView activityId={activityId} />
          </TabsContent>
        )}

        {general?.is_pooled_fund === true && activityId && (
          <TabsContent value="fund-contributions" className="space-y-4">
            <FundContributionsView activityId={activityId} />
          </TabsContent>
        )}

        {general?.is_pooled_fund === true && activityId && (
          <TabsContent value="fund-disbursements" className="space-y-4">
            <FundDisbursementsView activityId={activityId} />
          </TabsContent>
        )}

        {general?.is_pooled_fund === true && activityId && (
          <TabsContent value="fund-reconciliation" className="space-y-4">
            <FundReconciliationView activityId={activityId} />
          </TabsContent>
        )}

        {general?.is_pooled_fund === true && activityId && (
          <TabsContent value="fund-suggestions" className="space-y-4">
            <FundSuggestedLinksView activityId={activityId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}