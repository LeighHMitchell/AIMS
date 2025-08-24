/**
 * Utility functions for validating default fields completion
 */

export interface DefaultFieldsData {
  defaultAidType?: string;
  defaultFinanceType?: string;
  defaultFlowType?: string;
  defaultCurrency?: string;
  defaultTiedStatus?: string;
  default_aid_modality?: string;
  defaultDisbursementChannel?: string;
}

/**
 * Check if a field has a meaningful value (not empty or null)
 */
export function hasFieldValue(value?: string | null): boolean {
  return Boolean(value && value.trim() !== '');
}

/**
 * Check if all required default fields are completed
 * Note: All fields are considered required for full completion
 */
export function areAllDefaultFieldsCompleted(defaults: DefaultFieldsData): boolean {
  return (
    hasFieldValue(defaults.defaultAidType) &&
    hasFieldValue(defaults.defaultFinanceType) &&
    hasFieldValue(defaults.defaultFlowType) &&
    hasFieldValue(defaults.defaultCurrency) &&
    hasFieldValue(defaults.defaultTiedStatus) &&
    hasFieldValue(defaults.default_aid_modality) &&
    hasFieldValue(defaults.defaultDisbursementChannel)
  );
}

/**
 * Get completion status for individual fields
 */
export function getFieldCompletionStatus(defaults: DefaultFieldsData) {
  return {
    defaultAidType: hasFieldValue(defaults.defaultAidType),
    defaultFinanceType: hasFieldValue(defaults.defaultFinanceType),
    defaultFlowType: hasFieldValue(defaults.defaultFlowType),
    defaultCurrency: hasFieldValue(defaults.defaultCurrency),
    defaultTiedStatus: hasFieldValue(defaults.defaultTiedStatus),
    default_aid_modality: hasFieldValue(defaults.default_aid_modality),
    defaultDisbursementChannel: hasFieldValue(defaults.defaultDisbursementChannel),
  };
}

/**
 * Count how many fields are completed
 */
export function getCompletedFieldsCount(defaults: DefaultFieldsData): number {
  const completionStatus = getFieldCompletionStatus(defaults);
  return Object.values(completionStatus).filter(Boolean).length;
}

/**
 * Get total number of default fields
 */
export function getTotalFieldsCount(): number {
  return 7; // Aid Type, Finance Type, Flow Type, Currency, Tied Status, Modality, Disbursement Channel
}
