/**
 * IATI Transaction Party Inference Module
 * 
 * This module exports utilities for inferring missing provider_org and receiver_org
 * values in IATI transactions based on activity context.
 * 
 * @example
 * ```typescript
 * import { inferTransactionParties, IATI_ROLE } from '@/lib/iati/inference';
 * 
 * const result = inferTransactionParties({
 *   reportingOrg: { ref: 'AU-5', organization_id: 'uuid-1' },
 *   participatingOrgs: [...],
 *   transaction: { transactionType: '3' },
 * });
 * 
 * if (result.provider.status === 'inferred') {
 *   console.log('Provider inferred:', result.provider.value);
 * }
 * ```
 */

// Main inference function
export { inferTransactionParties } from './transactionPartyInference';

// Types
export type {
  IATIRoleCode,
  InferenceStatus,
  PartyInferenceResult,
  TransactionPartyInferenceResult,
  ReportingOrg,
  ParticipatingOrg,
  TransactionForInference,
  InferTransactionPartiesInput,
} from './types';

// Constants
export { IATI_ROLE } from './types';
export {
  INCOMING_TRANSACTION_TYPES,
  OUTGOING_TRANSACTION_TYPES,
  isIncomingTransaction,
  isOutgoingTransaction,
} from './constants';
