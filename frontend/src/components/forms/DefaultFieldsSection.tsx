import React from 'react';
import { useActivityDefaults } from '@/hooks/use-activity-defaults';
import { AidTypeSelect } from './AidTypeSelect';
import { DefaultFinanceTypeSelect } from './DefaultFinanceTypeSelect';
import { FlowTypeSelect } from './FlowTypeSelect';
import { CurrencySelector } from './CurrencySelector';
import { TiedStatusSelect } from './TiedStatusSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface DefaultFieldsSectionProps {
  activityId: string | null;
  initialValues?: {
    default_aid_type?: string | null;
    default_finance_type?: string | null;
    default_flow_type?: string | null;
    default_currency?: string | null;
    default_tied_status?: string | null;
  };
  onFieldUpdate?: (field: string, value: string | null) => void;
  disabled?: boolean;
  showDebugInfo?: boolean;
}

export function DefaultFieldsSection({
  activityId,
  initialValues,
  onFieldUpdate,
  disabled = false,
  showDebugInfo = false
}: DefaultFieldsSectionProps) {
  const {
    values,
    updateDefaultAidType,
    updateDefaultFinanceType,
    updateDefaultFlowType,
    updateDefaultCurrency,
    updateDefaultTiedStatus,
    isUpdating,
    lastUpdated,
    error,
    hasUnsavedChanges
  } = useActivityDefaults({
    activityId,
    initialValues,
    onFieldUpdate: (field, value) => {
      console.log(`[DefaultFieldsSection] Field updated: ${field} = ${value}`);
      onFieldUpdate?.(field, value);
    },
    onError: (field, error) => {
      console.error(`[DefaultFieldsSection] Error updating ${field}:`, error);
    }
  });

  const handleAidTypeChange = async (value: string | null) => {
    console.log('[DefaultFieldsSection] Aid Type changing to:', value);
    await updateDefaultAidType(value);
  };

  const handleFinanceTypeChange = async (value: string | null) => {
    console.log('[DefaultFieldsSection] Finance Type changing to:', value);
    await updateDefaultFinanceType(value);
  };

  const handleFlowTypeChange = async (value: string | null) => {
    console.log('[DefaultFieldsSection] Flow Type changing to:', value);
    await updateDefaultFlowType(value);
  };

  const handleCurrencyChange = async (value: string | null) => {
    console.log('[DefaultFieldsSection] Currency changing to:', value);
    await updateDefaultCurrency(value);
  };

  const handleTiedStatusChange = async (value: string | null) => {
    console.log('[DefaultFieldsSection] Tied Status changing to:', value);
    await updateDefaultTiedStatus(value);
  };

  const getUpdateStatusIcon = () => {
    if (isUpdating) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (lastUpdated) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  const getUpdateStatusText = () => {
    if (isUpdating) return 'Saving...';
    if (error) return `Error: ${error}`;
    if (lastUpdated) return `Saved at ${lastUpdated.toLocaleTimeString()}`;
    return '';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Default Values</CardTitle>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Unsaved Changes
              </Badge>
            )}
            {getUpdateStatusIcon()}
            <span className="text-sm text-gray-500">{getUpdateStatusText()}</span>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Set default values that will be applied to new transactions for this activity.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Debug Information */}
        {showDebugInfo && (
          <div className="bg-gray-50 p-3 rounded-md text-xs">
            <div><strong>Activity ID:</strong> {activityId || 'None'}</div>
            <div><strong>Current Values:</strong> {JSON.stringify(values, null, 2)}</div>
            <div><strong>Is Updating:</strong> {isUpdating ? 'Yes' : 'No'}</div>
            <div><strong>Has Unsaved Changes:</strong> {hasUnsavedChanges ? 'Yes' : 'No'}</div>
            <div><strong>Last Updated:</strong> {lastUpdated?.toISOString() || 'Never'}</div>
          </div>
        )}

        {/* Row 1: Aid Type and Finance Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Default Aid Type
            </label>
            <AidTypeSelect
              id="default-aid-type"
              value={values.default_aid_type || ''}
              onValueChange={handleAidTypeChange}
              placeholder="Select Aid Type"
              disabled={disabled || isUpdating}
            />
            {showDebugInfo && (
              <div className="text-xs text-gray-500">
                Current: {values.default_aid_type || 'null'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Default Finance Type
            </label>
            <DefaultFinanceTypeSelect
              id="default-finance-type"
              value={values.default_finance_type || ''}
              onValueChange={handleFinanceTypeChange}
              placeholder="Select Finance Type"
              disabled={disabled || isUpdating}
            />
            {showDebugInfo && (
              <div className="text-xs text-gray-500">
                Current: {values.default_finance_type || 'null'}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Flow Type and Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Default Flow Type
            </label>
            <FlowTypeSelect
              id="default-flow-type"
              value={values.default_flow_type || ''}
              onValueChange={handleFlowTypeChange}
              placeholder="Select Flow Type"
              disabled={disabled || isUpdating}
            />
            {showDebugInfo && (
              <div className="text-xs text-gray-500">
                Current: {values.default_flow_type || 'null'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Default Currency
            </label>
            <CurrencySelector
              id="default-currency"
              value={values.default_currency || ''}
              onValueChange={handleCurrencyChange}
              forceDropUp={true}
              placeholder="Select Currency"
              disabled={disabled || isUpdating}
            />
            {showDebugInfo && (
              <div className="text-xs text-gray-500">
                Current: {values.default_currency || 'null'}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Tied Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Default Tied Status
            </label>
            <TiedStatusSelect
              id="default-tied-status"
              value={values.default_tied_status || ''}
              onValueChange={handleTiedStatusChange}
              placeholder="Select Tied Status"
              disabled={disabled || isUpdating}
            />
            {showDebugInfo && (
              <div className="text-xs text-gray-500">
                Current: {values.default_tied_status || 'null'}
              </div>
            )}
          </div>
          <div></div> {/* Empty space for grid alignment */}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">
                Failed to save changes: {error}
              </span>
            </div>
          </div>
        )}

        {/* Success Display */}
        {lastUpdated && !error && !isUpdating && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700">
                Default values saved successfully at {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}