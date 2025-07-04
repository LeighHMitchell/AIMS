import React, { useState, useEffect } from 'react';
import { DefaultFieldsSection } from '@/components/forms/DefaultFieldsSection';
import { SupabaseSelect, withSupabaseIntegration } from '@/components/forms/SupabaseSelect';
import { AidTypeSelect } from '@/components/forms/AidTypeSelect';
import { DefaultFinanceTypeSelect } from '@/components/forms/DefaultFinanceTypeSelect';
import { FlowTypeSelect } from '@/components/forms/FlowTypeSelect';
import { CurrencySelector } from '@/components/forms/CurrencySelector';
import { TiedStatusSelect } from '@/components/forms/TiedStatusSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { SelectContent, SelectItem } from '@/components/ui/select';

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
  };
  onDefaultsChange?: (field: string, value: string | null) => void;
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

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Financial Information</h3>
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

      <Tabs defaultValue="defaults" className="space-y-4">
        <TabsList>
          <TabsTrigger value="defaults">Default Values</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="debug">Debug Info</TabsTrigger>
        </TabsList>

        {/* Default Values Tab */}
        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Defaults</CardTitle>
              <p className="text-sm text-gray-600">
                These values will be automatically applied to new transactions.
                Changes are saved immediately to the database.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Method 1: Using the comprehensive DefaultFieldsSection */}
              <DefaultFieldsSection
                activityId={activityId}
                initialValues={{
                  default_aid_type: general.defaultAidType,
                  default_finance_type: general.defaultFinanceType,
                  default_flow_type: general.defaultFlowType,
                  default_currency: general.defaultCurrency,
                  default_tied_status: general.defaultTiedStatus
                }}
                onFieldUpdate={handleFieldUpdate}
                disabled={disabled}
                showDebugInfo={false}
              />
            </CardContent>
          </Card>

          {/* Alternative Method: Individual enhanced components */}
          <Card>
            <CardHeader>
              <CardTitle>Alternative: Individual Field Controls</CardTitle>
              <p className="text-sm text-gray-600">
                Demonstration of individual Supabase-integrated select components.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aid Type (Direct Supabase)</label>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Finance Type (Direct Supabase)</label>
                  <SupabaseFinanceTypeSelect
                    activityId={activityId}
                    fieldName="default_finance_type"
                    value={general.defaultFinanceType}
                    onUpdateSuccess={handleFieldUpdate}
                    onUpdateError={handleFieldError}
                    placeholder="Select Finance Type"
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Flow Type (Direct Supabase)</label>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency (Direct Supabase)</label>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tied Status (Direct Supabase)</label>
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
              </div>
            </CardContent>
          </Card>

          {/* Pure SupabaseSelect Example */}
          <Card>
            <CardHeader>
              <CardTitle>Custom SupabaseSelect Example</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Supabase Select</label>
                <SupabaseSelect
                  activityId={activityId}
                  fieldName="default_currency"
                  value={general.defaultCurrency}
                  onUpdateSuccess={handleFieldUpdate}
                  onUpdateError={handleFieldError}
                  placeholder="Choose Currency"
                  disabled={disabled}
                  showStatus={true}
                  enableOptimisticUpdates={true}
                >
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="MMK">MMK - Myanmar Kyat</SelectItem>
                  </SelectContent>
                </SupabaseSelect>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
              <p className="text-sm text-gray-600">
                Financial transactions will inherit the default values set above.
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <p>Transaction management interface would go here.</p>
                <p className="text-sm">Transactions count: {transactions.length}</p>
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