import React from 'react';
import { useActivityDefaults } from '@/hooks/use-activity-defaults';
import { AidTypeSelect } from './AidTypeSelect';
import { DefaultFinanceTypeSelect } from './DefaultFinanceTypeSelect';
import { FlowTypeSelect } from './FlowTypeSelect';
import { CurrencySelector } from './CurrencySelector';
import { TiedStatusSelect } from './TiedStatusSelect';
import { DisbursementChannelSelect } from './DisbursementChannelSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { areAllDefaultFieldsCompleted } from '@/utils/defaultFieldsValidation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DefaultFieldsSectionProps {
  activityId: string | null;
  initialValues?: {
    default_aid_type?: string | null;
    default_finance_type?: string | null;
    default_flow_type?: string | null;
    default_currency?: string | null;
    default_tied_status?: string | null;
    default_disbursement_channel?: string | null;
    default_aid_modality?: string | null;
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

  // Check if all core fields are completed for green tick
  // Note: Only checking the 5 core fields managed by useActivityDefaults hook
  const coreFieldsCompleted = Boolean(
    values.default_aid_type && 
    values.default_finance_type && 
    values.default_flow_type && 
    values.default_currency && 
    values.default_tied_status &&
    initialValues?.default_disbursement_channel &&
    initialValues?.default_aid_modality
  );

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
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">Default Values</CardTitle>
            <HelpTextTooltip content="These defaults will be automatically applied to new transactions in this activity." />
            {coreFieldsCompleted && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
          </div>
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
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Default Aid Type
              </label>
              <HelpTextTooltip content="Specifies the type of assistance being provided, such as project-type interventions, budget support, or debt relief. This value applies to all financial transactions under an activity unless specified otherwise." />
            </div>
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
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Default Finance Type
              </label>
              <HelpTextTooltip content="Defines the financial mechanism being used, such as grants, loans, equity, or debt relief. This value is set as the default for all financial transactions in an activity." />
            </div>
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
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Default Flow Type
              </label>
              <HelpTextTooltip content="Classifies the resource flow, for example, as concessional aid, other official flows, or private development finance. This setting applies by default across transactions unless a different flow type is recorded." />
            </div>
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
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Default Currency
              </label>
              <HelpTextTooltip content="Indicates the ISO 4217 three-letter currency code used for all financial values in a report. If no default is set, each monetary value must have its own currency." />
            </div>
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

        {/* Row 3: Tied Status and Disbursement Channel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Default Tied Status
              </label>
              <HelpTextTooltip content="Shows whether the aid is untied, tied, or partially tied. This default can be overridden at the transaction level, but ensures clarity on restrictions that may apply to funding." />
            </div>
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
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Default Disbursement Channel
              </label>
              <HelpTextTooltip content="Specifies the channel through which funds are delivered, such as government ministries, non-governmental organisations, or multilateral agencies. This provides clarity on how resources reach the implementing body." />
            </div>
            <DisbursementChannelSelect
              id="default-disbursement-channel"
              value={initialValues?.default_disbursement_channel || ''}
              onValueChange={(value) => onFieldUpdate?.('default_disbursement_channel', value)}
              placeholder="Select Disbursement Channel"
              disabled={disabled || isUpdating}
            />
            {showDebugInfo && (
              <div className="text-xs text-gray-500">
                Current: {initialValues?.default_disbursement_channel || 'null'}
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Modality */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Default Modality
              </label>
              <HelpTextTooltip content="Provides an overarching classification that combines aid type, flow type, finance type, and tied status. It offers a simplified summary view of how resources are structured and delivered by default across an activity." />
            </div>
            <Select
              value={initialValues?.default_aid_modality || ''}
              onValueChange={(value) => onFieldUpdate?.('default_aid_modality', value)}
              disabled={disabled || isUpdating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Default Modality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="budget_support">Budget Support</SelectItem>
                <SelectItem value="project_intervention">Project-type Interventions</SelectItem>
                <SelectItem value="technical_assistance">Technical Assistance</SelectItem>
                <SelectItem value="humanitarian_aid">Humanitarian Aid</SelectItem>
                <SelectItem value="debt_relief">Debt Relief</SelectItem>
              </SelectContent>
            </Select>
            {showDebugInfo && (
              <div className="text-xs text-gray-500">
                Current: {initialValues?.default_aid_modality || 'null'}
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