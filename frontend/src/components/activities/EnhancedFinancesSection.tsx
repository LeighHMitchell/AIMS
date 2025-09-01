import React, { useState, useEffect } from 'react';
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
import { DisbursementChannelSearchableSelect } from '@/components/forms/DisbursementChannelSearchableSelect';
import { areAllDefaultFieldsCompleted } from '@/utils/defaultFieldsValidation';

// Enhanced components with Supabase integration
const SupabaseAidTypeSelect = withSupabaseIntegration(AidTypeSelect);
const SupabaseFinanceTypeSelect = withSupabaseIntegration(DefaultFinanceTypeSelect);
const SupabaseFlowTypeSelect = withSupabaseIntegration(FlowTypeSelect);
const SupabaseCurrencySelector = withSupabaseIntegration(CurrencySelector);
const SupabaseTiedStatusSelect = withSupabaseIntegration(TiedStatusSelect);

interface EnhancedFinancesSectionProps {
  activityId: string | null;
  general: {
    defaultAidType?: string | null;
    defaultFinanceType?: string | null;
    defaultFlowType?: string | null;
    defaultCurrency?: string | null;
    defaultTiedStatus?: string | null;
    defaultDisbursementChannel?: string | null;
    default_aid_modality?: string | null;
    default_aid_modality_override?: boolean;
  };
  onDefaultsChange?: (field: string, value: string | null | boolean) => void;
  transactions?: any[];
  onTransactionsChange?: (transactions: any[]) => void;
  disabled?: boolean;
}

export function EnhancedFinancesSection({
  activityId,
  general,
  onDefaultsChange,
  transactions = [],
  onTransactionsChange,
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
    general.default_aid_modality_override ?? false
  );

  // Check if all fields are completed for green tick
  const allFieldsCompleted = areAllDefaultFieldsCompleted({
    defaultAidType: general.defaultAidType,
    defaultFinanceType: general.defaultFinanceType,
    defaultFlowType: general.defaultFlowType,
    defaultCurrency: general.defaultCurrency,
    defaultTiedStatus: general.defaultTiedStatus,
    defaultDisbursementChannel: general.defaultDisbursementChannel,
    default_aid_modality: general.default_aid_modality,
  });

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

  const handleModalityOverrideChange = (checked: boolean) => {
    console.log(`[EnhancedFinancesSection] Modality override changed: ${checked}`);
    setModalityOverride(checked);
    handleFieldUpdate('default_aid_modality_override', checked);
    
    // If disabling override, clear the manual modality value
    if (!checked) {
      handleFieldUpdate('default_aid_modality', null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {updateStats.totalUpdates > 0 && (
            <>
              <Badge variant="outline" className="text-green-600">
                {updateStats.successfulUpdates} saved
              </Badge>
              {updateStats.failedUpdates > 0 && (
                <Badge variant="outline" className="text-red-600">
                  {updateStats.failedUpdates} failed
                </Badge>
              )}
            </>
          )}
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
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Debug Info
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
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Default Aid Type */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        Default Aid Type
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <HelpTextTooltip content="The type of aid for this activity" />
                      </label>
                      <SupabaseAidTypeSelect
                        activityId={activityId}
                        fieldName="default_aid_type"
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
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <HelpTextTooltip content="The default currency for financial transactions" />
                      </label>
                      <SupabaseCurrencySelector
                        activityId={activityId}
                        fieldName="default_currency"
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
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <HelpTextTooltip content="The flow type for this activity" />
                      </label>
                      <SupabaseFlowTypeSelect
                        activityId={activityId}
                        fieldName="default_flow_type"
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
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <HelpTextTooltip content="The tied status for this activity" />
                      </label>
                      <SupabaseTiedStatusSelect
                        activityId={activityId}
                        fieldName="default_tied_status"
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
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <HelpTextTooltip content="The finance type for this activity" />
                      </label>
                      <FinanceTypeSearchableSelect
                        value={general.defaultFinanceType || ""}
                        onValueChange={(value) => handleFieldUpdate('defaultFinanceType', value)}
                        placeholder="Select Finance Type"
                        disabled={disabled}
                        dropdownId="default-finance-type-select"
                      />
                    </div>

                    {/* Default Disbursement Channel */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        Default Disbursement Channel
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <HelpTextTooltip content="The disbursement channel for this activity" />
                      </label>
                      <DisbursementChannelSearchableSelect
                        value={general.defaultDisbursementChannel || ""}
                        onValueChange={(value) => handleFieldUpdate('defaultDisbursementChannel', value)}
                        placeholder="Select Disbursement Channel"
                        disabled={disabled}
                        dropdownId="default-disbursement-channel-select"
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
                    <CheckCircle className="h-4 w-4 text-green-500" />
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
                    <ModalitySearchableSelect
                      value={general.default_aid_modality || ""}
                      onValueChange={(value) => handleFieldUpdate('default_aid_modality', value)}
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
            transactions={transactions}
            onTransactionsChange={onTransactionsChange}
            defaultFinanceType={general.defaultFinanceType}
            defaultAidType={general.defaultAidType}
            defaultCurrency={general.defaultCurrency}
            defaultTiedStatus={general.defaultTiedStatus}
            defaultFlowType={general.defaultFlowType}
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

        {/* Debug Tab */}
        <TabsContent value="debug">
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Activity ID:</strong>
                    <div className="font-mono text-xs">{activityId || 'None'}</div>
                  </div>
                  <div>
                    <strong>Update Stats:</strong>
                    <div className="text-xs">
                      Total: {updateStats.totalUpdates} | 
                      Success: {updateStats.successfulUpdates} | 
                      Failed: {updateStats.failedUpdates}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-md text-sm">
                <strong>Current General State:</strong>
                <pre className="text-xs mt-2 overflow-auto">
                  {JSON.stringify({
                    defaultAidType: general.defaultAidType,
                    defaultFinanceType: general.defaultFinanceType,
                    defaultFlowType: general.defaultFlowType,
                    defaultCurrency: general.defaultCurrency,
                    defaultTiedStatus: general.defaultTiedStatus
                  }, null, 2)}
                </pre>
              </div>

              <div className="bg-gray-50 p-4 rounded-md text-sm">
                <strong>Last Update:</strong>
                <div className="text-xs">
                  {updateStats.lastUpdate ? updateStats.lastUpdate.toISOString() : 'Never'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}