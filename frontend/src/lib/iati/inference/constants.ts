/**
 * IATI v2.03 Transaction Type Constants
 * 
 * Defines which transaction types are incoming vs outgoing flows.
 * Reference: https://iatistandard.org/en/iati-standard/203/codelists/transactiontype/
 */

/**
 * Transaction types that represent incoming flows to the reporting organisation
 * - '1' = Incoming Commitment
 * - '12' = Incoming Funds
 */
export const INCOMING_TRANSACTION_TYPES = new Set(['1', '12']);

/**
 * Transaction types that represent outgoing flows from the reporting organisation
 * - '2' = Outgoing Commitment
 * - '3' = Disbursement
 * - '4' = Expenditure
 * - '5' = Interest Repayment
 * - '6' = Loan Repayment
 * - '7' = Reimbursement
 * - '8' = Purchase of Equity
 * - '9' = Sale of Equity
 * - '11' = Credit Guarantee
 * - '13' = Commitment Cancellation
 */
export const OUTGOING_TRANSACTION_TYPES = new Set([
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '11',
  '13',
]);

/**
 * Check if a transaction type represents an incoming flow
 * @param transactionType - The IATI transaction type code as a string
 * @returns true if the transaction is an incoming flow
 */
export function isIncomingTransaction(transactionType: string): boolean {
  return INCOMING_TRANSACTION_TYPES.has(transactionType);
}

/**
 * Check if a transaction type represents an outgoing flow
 * @param transactionType - The IATI transaction type code as a string
 * @returns true if the transaction is an outgoing flow
 */
export function isOutgoingTransaction(transactionType: string): boolean {
  return !INCOMING_TRANSACTION_TYPES.has(transactionType);
}







