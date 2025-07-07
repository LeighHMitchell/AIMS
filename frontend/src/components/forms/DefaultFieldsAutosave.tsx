import React from 'react';
import { 
  useDefaultAidTypeAutosave, 
  useDefaultFinanceTypeAutosave, 
  useDefaultCurrencyAutosave, 
  useDefaultTiedStatusAutosave, 
  useDefaultFlowTypeAutosave 
} from '@/hooks/use-field-autosave-new';
import { AidTypeSelect } from '@/components/forms/AidTypeSelect';
import { CurrencyCombobox } from '@/components/ui/currency-combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DefaultFieldsAutosaveProps {
  activityId: string;
  userId: string;
  defaults: {
    defaultAidType?: string;
    defaultFinanceType?: string;
    defaultCurrency?: string;
    defaultTiedStatus?: string;
    defaultFlowType?: string;
  };
  onDefaultsChange?: (field: string, value: string) => void;
}

export function DefaultFieldsAutosave({ 
  activityId, 
  userId, 
  defaults, 
  onDefaultsChange 
}: DefaultFieldsAutosaveProps) {
  
  // Initialize field autosave hooks
  const aidTypeAutosave = useDefaultAidTypeAutosave(activityId, userId);
  const financeTypeAutosave = useDefaultFinanceTypeAutosave(activityId, userId);
  const currencyAutosave = useDefaultCurrencyAutosave(activityId, userId);
  const tiedStatusAutosave = useDefaultTiedStatusAutosave(activityId, userId);
  const flowTypeAutosave = useDefaultFlowTypeAutosave(activityId, userId);

  // Handle field changes with autosave
  const handleAidTypeChange = (value: string | null) => {
    const stringValue = value || '';
    console.log('[DefaultFields] Aid type changed to:', stringValue);
    onDefaultsChange?.('defaultAidType', stringValue);
    aidTypeAutosave.triggerFieldSave(stringValue);
  };

  const handleFinanceTypeChange = (value: string) => {
    console.log('[DefaultFields] Finance type changed to:', value);
    onDefaultsChange?.('defaultFinanceType', value);
    financeTypeAutosave.triggerFieldSave(value);
  };

  const handleCurrencyChange = (value: string | null) => {
    const stringValue = value || 'USD';
    console.log('[DefaultFields] Currency changed to:', stringValue);
    onDefaultsChange?.('defaultCurrency', stringValue);
    currencyAutosave.triggerFieldSave(stringValue);
  };

  const handleTiedStatusChange = (value: string) => {
    console.log('[DefaultFields] Tied status changed to:', value);
    onDefaultsChange?.('defaultTiedStatus', value);
    tiedStatusAutosave.triggerFieldSave(value);
  };

  const handleFlowTypeChange = (value: string) => {
    console.log('[DefaultFields] Flow type changed to:', value);
    onDefaultsChange?.('defaultFlowType', value);
    flowTypeAutosave.triggerFieldSave(value);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900">Default Values</h3>
        <p className="text-sm text-gray-600 mt-1">
          These defaults will be automatically applied to new transactions in this activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Default Aid Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            Default Aid Type
            {aidTypeAutosave.state.isSaving && (
              <span className="ml-2 text-xs text-blue-600">Saving...</span>
            )}
          </label>
          <AidTypeSelect
            value={defaults.defaultAidType || ''}
            onValueChange={handleAidTypeChange}
            placeholder="Select default aid type"
          />
          {aidTypeAutosave.state.error && (
            <p className="text-xs text-red-600">Failed to save: {aidTypeAutosave.state.error.message}</p>
          )}
        </div>

        {/* Default Flow Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            Default Flow Type
            {flowTypeAutosave.state.isSaving && (
              <span className="ml-2 text-xs text-blue-600">Saving...</span>
            )}
          </label>
          <Select value={defaults.defaultFlowType || ''} onValueChange={handleFlowTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select default flow type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">ODA - Official Development Assistance</SelectItem>
              <SelectItem value="20">OOF - Other Official Flows</SelectItem>
              <SelectItem value="30">Private Grants</SelectItem>
              <SelectItem value="35">Private Market</SelectItem>
              <SelectItem value="40">Non-flow</SelectItem>
            </SelectContent>
          </Select>
          {flowTypeAutosave.state.error && (
            <p className="text-xs text-red-600">Failed to save: {flowTypeAutosave.state.error.message}</p>
          )}
        </div>

        {/* Default Finance Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            Default Finance Type
            {financeTypeAutosave.state.isSaving && (
              <span className="ml-2 text-xs text-blue-600">Saving...</span>
            )}
          </label>
          <Select value={defaults.defaultFinanceType || ''} onValueChange={handleFinanceTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select default finance type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="110">Standard Grant</SelectItem>
              <SelectItem value="111">Budget Support</SelectItem>
              <SelectItem value="112">Sector Budget Support</SelectItem>
              <SelectItem value="113">Pooled Funding</SelectItem>
              <SelectItem value="210">Standard Loan</SelectItem>
              <SelectItem value="211">Concessional Loan</SelectItem>
              <SelectItem value="212">Non-concessional Loan</SelectItem>
            </SelectContent>
          </Select>
          {financeTypeAutosave.state.error && (
            <p className="text-xs text-red-600">Failed to save: {financeTypeAutosave.state.error.message}</p>
          )}
        </div>

        {/* Default Currency */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            Default Currency
            {currencyAutosave.state.isSaving && (
              <span className="ml-2 text-xs text-blue-600">Saving...</span>
            )}
          </label>
          <CurrencyCombobox
            value={defaults.defaultCurrency || 'USD'}
            onValueChange={handleCurrencyChange}
            placeholder="Select default currency"
          />
          {currencyAutosave.state.error && (
            <p className="text-xs text-red-600">Failed to save: {currencyAutosave.state.error.message}</p>
          )}
        </div>

        {/* Default Tied Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            Default Tied Status
            {tiedStatusAutosave.state.isSaving && (
              <span className="ml-2 text-xs text-blue-600">Saving...</span>
            )}
          </label>
          <Select value={defaults.defaultTiedStatus || ''} onValueChange={handleTiedStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select default tied status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Tied</SelectItem>
              <SelectItem value="2">Partially tied</SelectItem>
              <SelectItem value="3">Untied</SelectItem>
              <SelectItem value="4">Not reported</SelectItem>
            </SelectContent>
          </Select>
          {tiedStatusAutosave.state.error && (
            <p className="text-xs text-red-600">Failed to save: {tiedStatusAutosave.state.error.message}</p>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Autosave Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
          <div>
            <span className="font-medium">Aid Type:</span>
            <span className={`ml-1 ${aidTypeAutosave.state.isSaving ? 'text-blue-600' : 'text-green-600'}`}>
              {aidTypeAutosave.state.isSaving ? 'Saving...' : 'Saved'}
            </span>
          </div>
          <div>
            <span className="font-medium">Flow Type:</span>
            <span className={`ml-1 ${flowTypeAutosave.state.isSaving ? 'text-blue-600' : 'text-green-600'}`}>
              {flowTypeAutosave.state.isSaving ? 'Saving...' : 'Saved'}
            </span>
          </div>
          <div>
            <span className="font-medium">Finance Type:</span>
            <span className={`ml-1 ${financeTypeAutosave.state.isSaving ? 'text-blue-600' : 'text-green-600'}`}>
              {financeTypeAutosave.state.isSaving ? 'Saving...' : 'Saved'}
            </span>
          </div>
          <div>
            <span className="font-medium">Currency:</span>
            <span className={`ml-1 ${currencyAutosave.state.isSaving ? 'text-blue-600' : 'text-green-600'}`}>
              {currencyAutosave.state.isSaving ? 'Saving...' : 'Saved'}
            </span>
          </div>
          <div>
            <span className="font-medium">Tied Status:</span>
            <span className={`ml-1 ${tiedStatusAutosave.state.isSaving ? 'text-blue-600' : 'text-green-600'}`}>
              {tiedStatusAutosave.state.isSaving ? 'Saving...' : 'Saved'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 