/**
 * IATI v2.03 Transaction Party Inference
 * 
 * This module provides a pure function to infer missing provider_org and receiver_org
 * values for IATI transactions based on the activity's reporting organisation and
 * participating organisations.
 * 
 * The inference follows IATI Standard v2.03 rules and is:
 * - Deterministic: Same inputs always produce the same outputs
 * - Safe: Never invents organisations not in the participating list
 * - Transparent: Returns status indicating how values were determined
 * - Pure: No database calls or side effects
 * - Isomorphic: Works in both Node.js and browser environments
 */

import {
  ReportingOrg,
  ParticipatingOrg,
  TransactionForInference,
  TransactionPartyInferenceResult,
  PartyInferenceResult,
  InferTransactionPartiesInput,
  IATI_ROLE,
} from './types';
import { isIncomingTransaction } from './constants';

// ============================================================================
// Helper Functions - Organisation Filtering
// ============================================================================

/**
 * Get participating organisations by IATI role code
 */
function getOrgsByRole(
  participatingOrgs: ParticipatingOrg[],
  roleCode: number
): ParticipatingOrg[] {
  return participatingOrgs.filter((org) => org.iati_role_code === roleCode);
}

/**
 * Get funding organisations (IATI role code 1)
 * These are organisations that provide funds for the activity
 */
function getFundingOrgs(orgs: ParticipatingOrg[]): ParticipatingOrg[] {
  return getOrgsByRole(orgs, IATI_ROLE.FUNDING);
}

/**
 * Get accountable organisations (IATI role code 2)
 * These are organisations accountable for oversight of the activity
 */
function getAccountableOrgs(orgs: ParticipatingOrg[]): ParticipatingOrg[] {
  return getOrgsByRole(orgs, IATI_ROLE.ACCOUNTABLE);
}

/**
 * Get extending organisations (IATI role code 3)
 * These manage transfer of funds to implementing partners
 */
function getExtendingOrgs(orgs: ParticipatingOrg[]): ParticipatingOrg[] {
  return getOrgsByRole(orgs, IATI_ROLE.EXTENDING);
}

/**
 * Get implementing organisations (IATI role code 4)
 * These physically conduct the activity
 */
function getImplementingOrgs(orgs: ParticipatingOrg[]): ParticipatingOrg[] {
  return getOrgsByRole(orgs, IATI_ROLE.IMPLEMENTING);
}

// ============================================================================
// Helper Functions - Organisation Matching
// ============================================================================

/**
 * Check if a participating org matches the reporting organisation
 * Matching is done by comparing IATI organisation references
 */
function isReportingOrg(
  org: ParticipatingOrg,
  reportingOrg: ReportingOrg
): boolean {
  if (!org.iati_org_ref || !reportingOrg.ref) return false;
  return org.iati_org_ref === reportingOrg.ref;
}

/**
 * Get all participating orgs that are NOT the reporting organisation
 * Used for fallback inference when no specific role matches
 */
function getNonReportingOrgs(
  participatingOrgs: ParticipatingOrg[],
  reportingOrg: ReportingOrg
): ParticipatingOrg[] {
  return participatingOrgs.filter((org) => !isReportingOrg(org, reportingOrg));
}

// ============================================================================
// Helper Functions - Result Builders
// ============================================================================

/**
 * Create an exact result (value already present in transaction)
 */
function exactResult(
  orgId: string | null | undefined,
  orgRef?: string | null,
  name?: string | null
): PartyInferenceResult {
  return {
    value: orgId || null,
    status: 'exact',
    iatiRef: orgRef,
    name,
  };
}

/**
 * Create an inferred result from a participating org
 */
function inferredResult(org: ParticipatingOrg): PartyInferenceResult {
  return {
    value: org.organization_id,
    status: 'inferred',
    iatiRef: org.iati_org_ref,
    name: org.name,
  };
}

/**
 * Create an inferred result from the reporting org
 */
function inferredFromReportingOrg(
  reportingOrg: ReportingOrg
): PartyInferenceResult {
  return {
    value: reportingOrg.organization_id || null,
    status: 'inferred',
    iatiRef: reportingOrg.ref,
    name: reportingOrg.name,
  };
}

/**
 * Create an ambiguous result (cannot determine unambiguously)
 */
function ambiguousResult(): PartyInferenceResult {
  return {
    value: null,
    status: 'ambiguous',
  };
}

// ============================================================================
// Outgoing Transaction Inference
// ============================================================================

/**
 * Infer provider for outgoing transactions
 * 
 * Rule: For outgoing transactions, the provider is always the reporting organisation
 * (the org sending/disbursing the funds)
 */
function inferProviderForOutgoing(
  transaction: TransactionForInference,
  reportingOrg: ReportingOrg
): PartyInferenceResult {
  // If provider already present, return exact
  if (transaction.providerOrgId) {
    return exactResult(
      transaction.providerOrgId,
      transaction.providerOrgRef
    );
  }

  // Provider is the reporting organisation
  return inferredFromReportingOrg(reportingOrg);
}

/**
 * Infer receiver for outgoing transactions
 * 
 * Priority order (only if receiver is missing):
 * 1. If exactly one implementing org exists (role=4) -> use it
 * 2. Else if no implementing orgs AND exactly one accountable org (role=2) -> use it
 * 3. Else if only one participating org other than reporting org -> use it
 * 4. Otherwise -> ambiguous
 */
function inferReceiverForOutgoing(
  transaction: TransactionForInference,
  reportingOrg: ReportingOrg,
  participatingOrgs: ParticipatingOrg[]
): PartyInferenceResult {
  // If receiver already present, return exact
  if (transaction.receiverOrgId) {
    return exactResult(
      transaction.receiverOrgId,
      transaction.receiverOrgRef
    );
  }

  // Rule 1: Exactly one implementing organisation
  const implementingOrgs = getImplementingOrgs(participatingOrgs);
  if (implementingOrgs.length === 1) {
    return inferredResult(implementingOrgs[0]);
  }

  // Rule 2: No implementing orgs AND exactly one accountable org
  if (implementingOrgs.length === 0) {
    const accountableOrgs = getAccountableOrgs(participatingOrgs);
    if (accountableOrgs.length === 1) {
      return inferredResult(accountableOrgs[0]);
    }
  }

  // Rule 3: Only one participating org other than reporting org
  const nonReportingOrgs = getNonReportingOrgs(participatingOrgs, reportingOrg);
  if (nonReportingOrgs.length === 1) {
    return inferredResult(nonReportingOrgs[0]);
  }

  // Cannot determine unambiguously
  return ambiguousResult();
}

// ============================================================================
// Incoming Transaction Inference
// ============================================================================

/**
 * Infer receiver for incoming transactions
 * 
 * Rule: For incoming transactions, the receiver is always the reporting organisation
 * (the org receiving the funds)
 */
function inferReceiverForIncoming(
  transaction: TransactionForInference,
  reportingOrg: ReportingOrg
): PartyInferenceResult {
  // If receiver already present, return exact
  if (transaction.receiverOrgId) {
    return exactResult(
      transaction.receiverOrgId,
      transaction.receiverOrgRef
    );
  }

  // Receiver is the reporting organisation
  return inferredFromReportingOrg(reportingOrg);
}

/**
 * Infer provider for incoming transactions
 * 
 * Priority order (only if provider is missing):
 * 1. If reporting org is also a funding org (by UUID match) -> use reporting org
 *    This handles self-funding scenarios where reporting org == funding org
 * 2. If exactly one funding org exists (role=1) -> use it
 * 3. Else if exactly one extending org exists (role=3) -> use it
 * 4. Else if reporting org is also the only funding org (by IATI ref) -> use reporting org
 * 5. Otherwise -> ambiguous
 */
function inferProviderForIncoming(
  transaction: TransactionForInference,
  reportingOrg: ReportingOrg,
  participatingOrgs: ParticipatingOrg[]
): PartyInferenceResult {
  // If provider already present, return exact
  if (transaction.providerOrgId) {
    return exactResult(
      transaction.providerOrgId,
      transaction.providerOrgRef
    );
  }

  const fundingOrgs = getFundingOrgs(participatingOrgs);

  // Rule 1: Reporting org is also a funding org (by UUID match)
  // This handles self-funding scenarios where reporting_org == funding_org
  // When an organization both reports and funds an activity, it's the provider
  if (reportingOrg.organization_id) {
    const reportingOrgIsFunderByUUID = fundingOrgs.some(
      (org) => org.organization_id === reportingOrg.organization_id
    );
    if (reportingOrgIsFunderByUUID) {
      return inferredFromReportingOrg(reportingOrg);
    }
  }

  // Rule 2: Exactly one funding organisation
  if (fundingOrgs.length === 1) {
    return inferredResult(fundingOrgs[0]);
  }

  // Rule 3: Exactly one extending organisation (if no single funder)
  if (fundingOrgs.length === 0) {
    const extendingOrgs = getExtendingOrgs(participatingOrgs);
    if (extendingOrgs.length === 1) {
      return inferredResult(extendingOrgs[0]);
    }
  }

  // Rule 4: Reporting org is also the only funding org (by IATI ref)
  // This handles the edge case where reporting org funds itself but only matched by ref
  const reportingOrgAsFunder = fundingOrgs.find((org) =>
    isReportingOrg(org, reportingOrg)
  );
  if (reportingOrgAsFunder && fundingOrgs.length === 1) {
    return inferredFromReportingOrg(reportingOrg);
  }

  // Cannot determine unambiguously
  return ambiguousResult();
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Infer provider_org and receiver_org for a transaction
 * 
 * This function is pure and does not write to the database.
 * It follows IATI v2.03 rules for inferring missing party information.
 * 
 * @param input - The reporting org, participating orgs, and transaction
 * @returns Inference results for both provider and receiver
 * 
 * @example
 * ```typescript
 * const result = inferTransactionParties({
 *   reportingOrg: { ref: 'AU-5', organization_id: 'uuid-1', name: 'Australia' },
 *   participatingOrgs: [
 *     { organization_id: 'uuid-1', iati_role_code: 1, iati_org_ref: 'AU-5', name: 'Australia' },
 *     { organization_id: 'uuid-2', iati_role_code: 4, iati_org_ref: 'XM-DAC-41122', name: 'UNICEF' },
 *   ],
 *   transaction: { transactionType: '3' }, // Disbursement (outgoing)
 * });
 * 
 * // Result:
 * // {
 * //   provider: { value: 'uuid-1', status: 'inferred', iatiRef: 'AU-5', name: 'Australia' },
 * //   receiver: { value: 'uuid-2', status: 'inferred', iatiRef: 'XM-DAC-41122', name: 'UNICEF' }
 * // }
 * ```
 */
export function inferTransactionParties(
  input: InferTransactionPartiesInput
): TransactionPartyInferenceResult {
  const { reportingOrg, participatingOrgs, transaction } = input;

  if (isIncomingTransaction(transaction.transactionType)) {
    // Incoming transaction: provider is external, receiver is reporting org
    return {
      provider: inferProviderForIncoming(
        transaction,
        reportingOrg,
        participatingOrgs
      ),
      receiver: inferReceiverForIncoming(transaction, reportingOrg),
    };
  } else {
    // Outgoing transaction: provider is reporting org, receiver is external
    return {
      provider: inferProviderForOutgoing(transaction, reportingOrg),
      receiver: inferReceiverForOutgoing(
        transaction,
        reportingOrg,
        participatingOrgs
      ),
    };
  }
}


