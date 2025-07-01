import { TransactionType, TRANSACTION_TYPE_LABELS } from '@/types/transaction';

/**
 * Legacy transaction type mapping for backward compatibility
 * Maps old single-letter codes to IATI numeric codes
 */
const LEGACY_TYPE_MAPPING: Record<string, TransactionType> = {
  "C": "2",   // Commitment -> Outgoing Commitment
  "D": "3",   // Disbursement
  "E": "4",   // Expenditure
  "IF": "12", // Incoming Funds
  "IC": "1",  // Incoming Commitment
  // Common variations
  "COMMITMENT": "2",
  "DISBURSEMENT": "3", 
  "EXPENDITURE": "4",
  "INCOMING_FUNDS": "12",
  "INCOMING_COMMITMENT": "1"
};

/**
 * Normalizes transaction type to IATI standard format
 * @param type - Raw transaction type (could be legacy code or IATI code)
 * @returns Standardized IATI transaction type code
 */
export function normalizeTransactionType(type: string | undefined | null): TransactionType | null {
  if (!type) return null;
  
  const upperType = type.toString().toUpperCase().trim();
  
  // Check if it's already a valid IATI code
  if (upperType in TRANSACTION_TYPE_LABELS) {
    return upperType as TransactionType;
  }
  
  // Check legacy mapping
  if (upperType in LEGACY_TYPE_MAPPING) {
    return LEGACY_TYPE_MAPPING[upperType];
  }
  
  // Log unknown types for debugging
  console.warn(`Unknown transaction type: ${type}`);
  return null;
}

/**
 * Gets the human-readable label for a transaction type
 * @param type - Transaction type (any format)
 * @returns Human-readable label or the original type if unknown
 */
export function getTransactionTypeLabel(type: string | undefined | null): string {
  const normalizedType = normalizeTransactionType(type);
  if (normalizedType && normalizedType in TRANSACTION_TYPE_LABELS) {
    return TRANSACTION_TYPE_LABELS[normalizedType];
  }
  return type || 'Unknown';
}

/**
 * Checks if a transaction type represents a commitment
 * @param type - Transaction type (any format)
 * @returns True if it's a commitment type
 */
export function isCommitmentType(type: string | undefined | null): boolean {
  const normalizedType = normalizeTransactionType(type);
  return normalizedType === '1' || normalizedType === '2';
}

/**
 * Checks if a transaction type represents a disbursement
 * @param type - Transaction type (any format)
 * @returns True if it's a disbursement type
 */
export function isDisbursementType(type: string | undefined | null): boolean {
  const normalizedType = normalizeTransactionType(type);
  return normalizedType === '3';
}

/**
 * Checks if a transaction type represents an expenditure
 * @param type - Transaction type (any format)
 * @returns True if it's an expenditure type
 */
export function isExpenditureType(type: string | undefined | null): boolean {
  const normalizedType = normalizeTransactionType(type);
  return normalizedType === '4';
}

/**
 * Checks if a transaction type represents incoming funds
 * @param type - Transaction type (any format)
 * @returns True if it's an incoming funds type
 */
export function isIncomingFundsType(type: string | undefined | null): boolean {
  const normalizedType = normalizeTransactionType(type);
  return normalizedType === '12';
}

/**
 * Gets all valid transaction types for form dropdowns
 * @returns Array of {value, label} objects
 */
export function getTransactionTypeOptions() {
  return Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => ({
    value,
    label
  }));
}

/**
 * Categorizes transaction types for financial calculations
 * @param type - Transaction type (any format)
 * @returns Category: 'commitment', 'disbursement', 'expenditure', 'incoming', or 'other'
 */
export function categorizeTransactionType(type: string | undefined | null): 'commitment' | 'disbursement' | 'expenditure' | 'incoming' | 'other' {
  const normalizedType = normalizeTransactionType(type);
  
  switch (normalizedType) {
    case '1':
    case '2':
      return 'commitment';
    case '3':
      return 'disbursement';
    case '4':
      return 'expenditure';
    case '12':
      return 'incoming';
    default:
      return 'other';
  }
}