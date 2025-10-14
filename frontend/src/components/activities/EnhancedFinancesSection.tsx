import React, { useState, useEffect, useCallback } from 'react';
import { DefaultFieldsSection } from '@/components/forms/DefaultFieldsSection';
import { SupabaseSelect, withSupabaseIntegration } from '@/components/forms/SupabaseSelect';
import LinkedTransactionsEditorTab from '@/components/activities/LinkedTransactionsEditorTab';
import TransactionsManager from '@/components/TransactionsManager';
import { AidTypeSelect } from '@/components/forms/AidTypeSelect';
import { DefaultFinanceTypeSelect } from '@/components/forms/DefaultFinanceTypeSelect';
import { FlowTypeSelect } from '@/components/forms/FlowTypeSelect';
import { CurrencySelector } from '@/components/forms/CurrencySelector';
import { TiedStatusSelect } from '@/components/forms/TiedStatusSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CheckCircle, BarChart3, CreditCard, Link, Settings } from 'lucide-react';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { ModalitySearchableSelect } from '@/components/forms/ModalitySearchableSelect';
import { FinanceTypeSearchableSelect } from '@/components/forms/FinanceTypeSearchableSelect';

import { areAllDefaultFieldsCompleted } from '@/utils/defaultFieldsValidation';
import { calculateModality } from '@/utils/modality-calculation';
import { useSupabaseFieldUpdate } from '@/hooks/use-supabase-field-update';

// Enhanced components with Supabase integration
const SupabaseAidTypeSelect = withSupabaseIntegration(AidTypeSelect);
const SupabaseFinanceTypeSelect = withSupabaseIntegration(DefaultFinanceTypeSelect);
const SupabaseFlowTypeSelect = withSupabaseIntegration(FlowTypeSelect);
const SupabaseCurrencySelector = withSupabaseIntegration(CurrencySelector);
const SupabaseTiedStatusSelect = withSupabaseIntegration(TiedStatusSelect);
const SupabaseFinanceTypeSearchableSelect = withSupabaseIntegration(FinanceTypeSearchableSelect);
const SupabaseModalitySearchableSelect = withSupabaseIntegration(ModalitySearchableSelect);

interface EnhancedFinancesSectionProps {
  activityId: string | null;
  general: {
    defaultAidType?: string | null;
    defaultFinanceType?: string | null;
    defaultFlowType?: string | null;
    defaultCurrency?: string | null;
    defaultTiedStatus?: string | null;
    defaultModality?: string | null; // Changed to camelCase
    defaultModalityOverride?: boolean; // Changed to camelCase
    otherIdentifier?: string | null;
  };
  onDefaultsChange?: (field: string, value: string | null | boolean) => void;
  transactions?: any[];
  onTransactionsChange?: (transactions: any[]) => void;
  onRefreshNeeded?: () => Promise<void>;
  disabled?: boolean;
}

export function EnhancedFinancesSection({
  activityId,
  general,
  onDefaultsChange,
  transactions = [],
  onTransactionsChange,
  onRefreshNeeded,
  disabled = false
}: EnhancedFinancesSectionProps) {
  const [updateStats, setUpdateStats] = useState({
    totalUpdates: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    lastUpdate: null as Date | null
  });

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
    modality: Boolean(general.defaultModality), // Updated to camelCase
  };

  const handleFieldUpdate = (field: string, value: string | null) => {
    console.log(`[EnhancedFinancesSection] Field updated: ${field} = ${value}`);
    
    // Update stats
    setUpdateStats(prev => ({
      ...prev,
      totalUpdates: prev.totalUpdates + 1,
      successfulUpdates: prev.successfulUpdates + 1,
      lastUpdate: new Date()
    }));

    // Call parent callback
    onDefaultsChange?.(field, value);
  };

  const handleFieldError = (field: string, error: Error) => {
    console.error(`[EnhancedFinancesSection] Field update error for ${field}:`, error);
    
    // Update stats
    setUpdateStats(prev => ({
      ...prev,
      totalUpdates: prev.totalUpdates + 1,
      failedUpdates: prev.failedUpdates + 1,
      lastUpdate: new Date()
    }));
  };

  // Supabase field update hook for boolean fields (declared after handleFieldUpdate and handleFieldError)
  const { updateField: updateSupabaseField } = useSupabaseFieldUpdate(activityId, {
    tableName: 'activities',
    onSuccess: handleFieldUpdate,
    onError: (field, error) => {
      // Handle missing column gracefully
      if (error.message.includes('default_modality') && error.message.includes('schema cache')) {
        console.warn(`[EnhancedFinancesSection] Column ${field} not yet added to Supabase. Skipping database save.`);
        // Still update local state
        handleFieldUpdate(field, null);
      } else {
        handleFieldError(field, error);
      }
    },
    showSuccessToast: false,
    showErrorToast: false // Disable error toasts for missing columns
  });

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
        updateSupabaseField('defaultModality', calculatedModality).catch(error => {
          console.warn('[EnhancedFinancesSection] Could not save to database:', error.message);
        });
        onDefaultsChange?.('defaultModality', calculatedModality);
      }
    }
  }, [general.defaultAidType, general.defaultFinanceType, modalityOverride, general.defaultModality, updateSupabaseField, onDefaultsChange]);

  const handleModalityOverrideChange = async (checked: boolean) => {
    console.log(`[EnhancedFinancesSection] Modality override changed: ${checked}`);
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
      console.log('[EnhancedFinancesSection] Recalculating modality after disabling override:', calculatedModality);
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
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Update statistics badges removed per user request */}
        </div>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="linked-transactions" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Linked Transactions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Defaults
            {allFieldsCompleted && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Default Values Tab */}
        <TabsContent value="defaults" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Default Fields */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Default Values
                    {allFieldsCompleted && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Default Aid Type */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        Default Aid Type
                        {fieldCompletion.aidType && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <HelpTextTooltip content="The type of aid for this activity" />
                      </label>
                      <SupabaseAidTypeSelect
                        activityId={activityId}
                        fieldName="defaultAidType"
                        value={general.defaultAidType}
                        onUpdateSuccess={handleFieldUpdate}
                        onUpdateError={handleFieldError}
                        placeholder="Select Aid Type"
                        disabled={disabled}
                      />
                    </div>

                    {/* Default Currency */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        Default Currency
                        {fieldCompletion.currency && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <HelpTextTooltip content="The default currency for financial transactions" />
                      </label>
                      <SupabaseCurrencySelector
                        activityId={activityId}
                        fieldName="defaultCurrency"
                        value={general.defaultCurrency}
                        onUpdateSuccess={handleFieldUpdate}
                        onUpdateError={handleFieldError}
                        placeholder="Select Currency"
                        disabled={disabled}
                      />
                    </div>

                    {/* Default Flow Type */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        Default Flow Type
                        {fieldCompletion.flowType && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <HelpTextTooltip content="The flow type for this activity" />
                      </label>
                      <SupabaseFlowTypeSelect
                        activityId={activityId}
                        fieldName="defaultFlowType"
                        value={general.defaultFlowType}
                        onUpdateSuccess={handleFieldUpdate}
                        onUpdateError={handleFieldError}
                        placeholder="Select Flow Type"
                        disabled={disabled}
                      />
                    </div>

                    {/* Default Tied Status */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        Default Tied Status
                        {fieldCompletion.tiedStatus && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <HelpTextTooltip content="The tied status for this activity" />
                      </label>
                      <SupabaseTiedStatusSelect
                        activityId={activityId}
                        fieldName="defaultTiedStatus"
                        value={general.defaultTiedStatus}
                        onUpdateSuccess={handleFieldUpdate}
                        onUpdateError={handleFieldError}
                        placeholder="Select Tied Status"
                        disabled={disabled}
                      />
                    </div>

                    {/* Default Finance Type */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        Default Finance Type
                        {fieldCompletion.financeType && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <HelpTextTooltip content="The finance type for this activity" />
                      </label>
                      <SupabaseFinanceTypeSearchableSelect
                        activityId={activityId}
                        fieldName="defaultFinanceType"
                        value={general.defaultFinanceType || ""}
                        onUpdateSuccess={handleFieldUpdate}
                        onUpdateError={handleFieldError}
                        placeholder="Select Finance Type"
                        disabled={disabled}
                        dropdownId="default-finance-type-select"
                      />
                    </div>

                    {/* Placeholder for future field */}
                    <div className="space-y-2">
                      {/* Future field can be added here */}
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
                      <CheckCircle className="h-4 w-4 text-green-500" />
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
                        Override Auto Modality
                        <HelpTextTooltip content="When enabled, manually set modality instead of automatic detection" />
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
        <TabsContent value="transactions">
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
          />
        </TabsContent>

        {/* Linked Transactions Tab */}
        <TabsContent value="linked-transactions">
          <LinkedTransactionsEditorTab 
            activityId={activityId || "new"}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Financial Analytics</CardTitle>
              <p className="text-sm text-gray-600">
                Financial analysis and reporting for this activity.
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <p>Analytics will include:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Financial flow over time charts</li>
                  <li>Currency distribution analysis</li>
                  <li>Organization transaction breakdowns</li>
                  <li>Transaction type analysis</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}