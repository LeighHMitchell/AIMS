import React from 'react';
import { toast } from 'sonner';
import { 
  useDefaultAidTypeAutosave, 
  useDefaultFinanceTypeAutosave, 
  useDefaultCurrencyAutosave, 
  useDefaultTiedStatusAutosave, 
  useDefaultFlowTypeAutosave,
  useDefaultAidModalityAutosave,
  useDefaultAidModalityAutosaveSilent,
  useDefaultAidModalityOverrideAutosave,
  useDefaultDisbursementChannelAutosave
} from '@/hooks/use-field-autosave-new';
import { AidTypeSelect } from '@/components/forms/AidTypeSelect';
import { CurrencySelector } from '@/components/forms/CurrencySelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlowTypeSelect } from '@/components/forms/FlowTypeSelect';
import { FinanceTypeSelect } from '@/components/forms/FinanceTypeSelect';
import { TiedStatusSelect } from '@/components/forms/TiedStatusSelect';
import { DisbursementChannelSelect } from '@/components/forms/DisbursementChannelSelect';
import { LabelSaveIndicator, SaveIndicator } from '@/components/ui/save-indicator';
import { CheckCircle, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { getFieldCompletionStatus, hasFieldValue } from '@/utils/defaultFieldsValidation';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';


interface DefaultFieldsAutosaveProps {
  activityId: string;
  userId: string;
  defaults: {
    defaultAidType?: string;
    defaultFinanceType?: string;
    defaultCurrency?: string;
    defaultTiedStatus?: string;
    defaultFlowType?: string;
    default_aid_modality?: string;
    default_aid_modality_override?: boolean;
    defaultDisbursementChannel?: string;
  };
  onDefaultsChange?: (field: string, value: string) => void;
}

export function DefaultFieldsAutosave({ 
  activityId, 
  userId, 
  defaults, 
  onDefaultsChange 
}: DefaultFieldsAutosaveProps) {
  
  // Initialize field autosave hooks with success callbacks
  const aidTypeAutosave = useDefaultAidTypeAutosave(activityId, userId);
  const financeTypeAutosave = useDefaultFinanceTypeAutosave(activityId, userId);
  const currencyAutosave = useDefaultCurrencyAutosave(activityId, userId);
  const tiedStatusAutosave = useDefaultTiedStatusAutosave(activityId, userId);
  const flowTypeAutosave = useDefaultFlowTypeAutosave(activityId, userId);
  const modalityAutosave = useDefaultAidModalityAutosave(activityId, userId);
  const modalityAutosaveSilent = useDefaultAidModalityAutosaveSilent(activityId, userId);
  const modalityOverrideAutosave = useDefaultAidModalityOverrideAutosave(activityId, userId);
  const disbursementChannelAutosave = useDefaultDisbursementChannelAutosave(activityId, userId);

  // Calculate field completion status
  const fieldCompletionStatus = getFieldCompletionStatus({
    defaultAidType: defaults.defaultAidType,
    defaultFinanceType: defaults.defaultFinanceType,
    defaultFlowType: defaults.defaultFlowType,
    defaultCurrency: defaults.defaultCurrency || 'USD', // Include fallback for completion check
    defaultTiedStatus: defaults.defaultTiedStatus,
    default_aid_modality: defaults.default_aid_modality,
    defaultDisbursementChannel: defaults.defaultDisbursementChannel,
  });

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

  const handleTiedStatusChange = (value: string | null) => {
    const stringValue = value || '';
    console.log('[DefaultFields] Tied status changed to:', stringValue);
    onDefaultsChange?.('defaultTiedStatus', stringValue);
    tiedStatusAutosave.triggerFieldSave(stringValue);
  };

  const handleFlowTypeChange = (value: string | null) => {
    const stringValue = value || '';
    console.log('[DefaultFields] Flow type changed to:', stringValue);
    onDefaultsChange?.('defaultFlowType', stringValue);
    flowTypeAutosave.triggerFieldSave(stringValue);
  };

  const handleDisbursementChannelChange = (value: string | null) => {
    const stringValue = value || '';
    console.log('[DefaultFields] Disbursement channel changed to:', stringValue);
    console.log('[DefaultFields] Disbursement channel autosave state:', disbursementChannelAutosave.state);
    onDefaultsChange?.('defaultDisbursementChannel', stringValue);
    disbursementChannelAutosave.triggerFieldSave(stringValue);
  };

  // --- Default Modality State ---
  const initialModality = defaults.default_aid_modality ?? '';
  const initialOverride = defaults.default_aid_modality_override ?? false;
  const [modality, setModality] = React.useState(initialModality);
  const [modalityOverride, setModalityOverride] = React.useState(initialOverride);

  // --- Auto-calc logic (no longer uses Flow Type) ---
  function calculateModality(aidType: string, financeType: string) {
    // 1. Technical Assistance aid types
    const technicalAssistanceAidTypes = ["D01", "D02", "E01", "E02"];
    const isTA = technicalAssistanceAidTypes.includes(aidType);

    // 2. Grant and Loan finance types
    const grantFinanceTypes = [
      "110", "111", "112", "113", "114", "115", "116", "117", "118", // Standard grants
      "210", // Debt relief grant
      "310", "311" // In-kind grants
    ];
    const loanFinanceTypes = [
      "421", "422", "423", "424", "425", // Standard/concessional loans
      "431", "433" // Other loan types
    ];
    // 3. Reimbursable/ambiguous/withdrawn types
    const reimbursableOrAmbiguous = ["422"]; // Reimbursable grant
    // 510+ and 600+ are investment/guarantee, so check prefix
    const isInvestmentOrGuarantee = (code: string) => {
      if (!code) return false;
      const n = parseInt(code, 10);
      return (n >= 510 && n < 600) || (n >= 600);
    };

    // 4. Combine logic
    if (!financeType) return "5"; // Other / Needs Review
    if (reimbursableOrAmbiguous.includes(financeType) || isInvestmentOrGuarantee(financeType)) return "5";

    if (grantFinanceTypes.includes(financeType)) {
      if (isTA) return "3"; // Grant – Technical Assistance
      return "1"; // Grant
    }
    if (loanFinanceTypes.includes(financeType)) {
      if (isTA) return "4"; // Loan – Technical Assistance
      return "2"; // Loan
    }
    // All else
    return "5"; // Other / Needs Review
  }

  // --- Recalculate when relevant fields change and override is off ---
  React.useEffect(() => {
    if (!modalityOverride) {
      const newModality = calculateModality(
        defaults.defaultAidType || '',
        defaults.defaultFinanceType || ''
      );
      const newModalityString = String(newModality);
      
      // Only update and save if the calculated modality is different from current
      if (newModalityString !== modality) {
        console.log('[DefaultFields] Modality auto-calculated:', { 
          from: modality, 
          to: newModalityString,
          aidType: defaults.defaultAidType,
          financeType: defaults.defaultFinanceType
        });
        setModality(newModalityString);
        onDefaultsChange?.('default_aid_modality', newModalityString);
        onDefaultsChange?.('default_aid_modality_override', 'false');
        modalityAutosaveSilent.triggerFieldSave(newModalityString);
      }
    }
    // eslint-disable-next-line
  }, [defaults.defaultAidType, defaults.defaultFinanceType, modalityOverride, modality]);

  // --- Handler for user override toggle ---
  const handleOverrideToggle = (checked: boolean) => {
    setModalityOverride(checked);
    onDefaultsChange?.('default_aid_modality_override', checked ? 'true' : 'false');
    modalityOverrideAutosave.triggerFieldSave(checked ? 'true' : 'false');
    if (!checked) {
      // When turning override off, recalc and save
      const newModality = calculateModality(
        defaults.defaultAidType || '',
        defaults.defaultFinanceType || ''
      );
      setModality(String(newModality));
      onDefaultsChange?.('default_aid_modality', String(newModality));
      modalityAutosaveSilent.triggerFieldSave(String(newModality));
    }
  };

  // --- Handler for user selection ---
  const handleModalityChange = (val: string) => {
    setModality(val);
    onDefaultsChange?.('default_aid_modality', val);
    onDefaultsChange?.('default_aid_modality_override', 'true');
    modalityAutosave.triggerFieldSave(val);
    modalityOverrideAutosave.triggerFieldSave('true');
  };

  // --- Handler for clearing modality ---
  const handleModalityClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModality('');
    onDefaultsChange?.('default_aid_modality', '');
    modalityAutosave.triggerFieldSave('');
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-gray-900">Default Values</h3>
          <HelpTextTooltip content="These defaults will be automatically applied to new transactions in this activity." />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Main Default Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Row 1: Aid Type, Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Default Aid Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Default Aid Type
                </label>
                <HelpTextTooltip content="Specifies the type of assistance being provided, such as project-type interventions, budget support, or debt relief. This value applies to all financial transactions under an activity unless specified otherwise." />
                <SaveIndicator 
                  isSaving={aidTypeAutosave.state.isSaving}
                  isSaved={!!aidTypeAutosave.state.lastSaved || fieldCompletionStatus.defaultAidType}
                  size="sm"
                  className=""
                />
              </div>
              <AidTypeSelect
                value={defaults.defaultAidType || ''}
                onValueChange={handleAidTypeChange}
                placeholder="Select default aid type"
              />
              {aidTypeAutosave.state.error && (
                <p className="text-xs text-red-600">Failed to save: {aidTypeAutosave.state.error.message}</p>
              )}
            </div>

            {/* Default Currency */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Default Currency
                </label>
                <HelpTextTooltip content="Indicates the ISO 4217 three-letter currency code used for all financial values in a report. If no default is set, each monetary value must have its own currency." />
                <SaveIndicator 
                  isSaving={currencyAutosave.state.isSaving}
                  isSaved={!!currencyAutosave.state.lastSaved || fieldCompletionStatus.defaultCurrency}
                  size="sm"
                  className=""
                />
              </div>
              <CurrencySelector
                value={defaults.defaultCurrency || 'USD'}
                onValueChange={handleCurrencyChange}
                placeholder="Select default currency"
                className="w-full"
              />
              {currencyAutosave.state.error && (
                <p className="text-xs text-red-600">Failed to save: {currencyAutosave.state.error.message}</p>
              )}
            </div>
          </div>

          {/* Row 2: Flow Type, Tied Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Default Flow Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Default Flow Type
                </label>
                <HelpTextTooltip content="Classifies the resource flow, for example, as concessional aid, other official flows, or private development finance. This setting applies by default across transactions unless a different flow type is recorded." />
                <SaveIndicator 
                  isSaving={flowTypeAutosave.state.isSaving}
                  isSaved={!!flowTypeAutosave.state.lastSaved || fieldCompletionStatus.defaultFlowType}
                  size="sm"
                  className=""
                />
              </div>
              <FlowTypeSelect
                value={defaults.defaultFlowType || ''}
                onValueChange={handleFlowTypeChange}
                placeholder="Select default flow type"
              />
              {flowTypeAutosave.state.error && (
                <p className="text-xs text-red-600">Failed to save: {flowTypeAutosave.state.error.message}</p>
              )}
            </div>

            {/* Default Tied Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Default Tied Status
                </label>
                <HelpTextTooltip content="Shows whether the aid is untied, tied, or partially tied. This default can be overridden at the transaction level, but ensures clarity on restrictions that may apply to funding." />
                <SaveIndicator 
                  isSaving={tiedStatusAutosave.state.isSaving}
                  isSaved={!!tiedStatusAutosave.state.lastSaved || fieldCompletionStatus.defaultTiedStatus}
                  size="sm"
                  className=""
                />
              </div>
              <TiedStatusSelect
                value={defaults.defaultTiedStatus || ''}
                onValueChange={handleTiedStatusChange}
                placeholder="Select default tied status"
                disabled={tiedStatusAutosave.state.isSaving}
                className="w-full"
              />
              {tiedStatusAutosave.state.error && (
                <p className="text-xs text-red-600">Failed to save: {tiedStatusAutosave.state.error.message}</p>
              )}
            </div>
          </div>

          {/* Row 3: Finance Type, Disbursement Channel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Default Finance Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Default Finance Type
                </label>
                <HelpTextTooltip content="Defines the financial mechanism being used, such as grants, loans, equity, or debt relief. This value is set as the default for all financial transactions in an activity." />
                <SaveIndicator 
                  isSaving={financeTypeAutosave.state.isSaving}
                  isSaved={!!financeTypeAutosave.state.lastSaved || fieldCompletionStatus.defaultFinanceType}
                  size="sm"
                  className=""
                />
              </div>
              <FinanceTypeSelect
                value={defaults.defaultFinanceType || ''}
                onChange={handleFinanceTypeChange}
                placeholder="Select default finance type"
                disabled={financeTypeAutosave.state.isSaving}
              />
              {financeTypeAutosave.state.error && (
                <p className="text-xs text-red-600">Failed to save: {financeTypeAutosave.state.error.message}</p>
              )}
            </div>

            {/* Default Disbursement Channel */}
            <div className="space-y-2 pb-12">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Default Disbursement Channel
                </label>
                <HelpTextTooltip content="Specifies the channel through which funds are delivered, such as government ministries, non-governmental organisations, or multilateral agencies. This provides clarity on how resources reach the implementing body." />
                <SaveIndicator 
                  isSaving={disbursementChannelAutosave.state.isSaving}
                  isSaved={!!disbursementChannelAutosave.state.lastSaved || fieldCompletionStatus.defaultDisbursementChannel}
                  size="sm"
                  className=""
                />
              </div>
              <DisbursementChannelSelect
                value={defaults.defaultDisbursementChannel || ''}
                onValueChange={handleDisbursementChannelChange}
                placeholder="Select default disbursement channel"
                disabled={disbursementChannelAutosave.state.isSaving}
                className="w-full"
              />
              {disbursementChannelAutosave.state.error && (
                <p className="text-xs text-red-600">Failed to save: {disbursementChannelAutosave.state.error.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Modality Card */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Default Modality
                <HelpTextTooltip content="Provides an overarching classification that combines aid type, flow type, finance type, and tied status. It offers a simplified summary view of how resources are structured and delivered by default across an activity." />
                {/* Show green tick when both Finance Type and Aid Type are completed (required for modality calculation) */}
                {fieldCompletionStatus.defaultFinanceType && fieldCompletionStatus.defaultAidType && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-8">
              {/* Default Modality */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <SaveIndicator 
                    isSaving={modalityAutosave.state.isSaving}
                    isSaved={!!modalityAutosave.state.lastSaved && !modalityAutosave.state.isSaving}
                    size="sm"
                    className=""
                  />
                </div>
                <div className="relative">
                  <Select
                    value={String(modality)}
                    onValueChange={handleModalityChange}
                    disabled={!modalityOverride}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select default modality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-2">1</span>
                        <span className="font-medium">Grant</span>
                      </SelectItem>
                      <SelectItem value="2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-2">2</span>
                        <span className="font-medium">Loan</span>
                      </SelectItem>
                      <SelectItem value="3">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-2">3</span>
                        <span className="font-medium">Grant – Technical Assistance</span>
                      </SelectItem>
                      <SelectItem value="4">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-2">4</span>
                        <span className="font-medium">Loan – Technical Assistance</span>
                      </SelectItem>
                      <SelectItem value="5">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-2">5</span>
                        <span className="font-medium">Other / Needs Review</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {modality && modalityOverride && (
                    <button
                      type="button"
                      onClick={handleModalityClear}
                      className="absolute right-7 top-1/2 transform -translate-y-1/2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                      aria-label="Clear selection"
                      tabIndex={-1}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Override Default Modality */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Override Default Modality
                </label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={modalityOverride}
                    onCheckedChange={handleOverrideToggle}
                    id="modality-override"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 