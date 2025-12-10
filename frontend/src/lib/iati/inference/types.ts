/**
 * IATI v2.03 Transaction Party Inference Types
 * 
 * This module defines TypeScript interfaces for the transaction party inference system.
 * All types follow IATI Standard v2.03 specifications.
 */

/**
 * IATI Organisation Role Codes
 * Reference: https://iatistandard.org/en/iati-standard/203/codelists/organisationrole/
 */
export const IATI_ROLE = {
  /** Organisation that provides funds */
  FUNDING: 1,
  /** Organisation accountable for oversight of the activity */
  ACCOUNTABLE: 2,
  /** Organisation that manages transfer of funds to implementing partners */
  EXTENDING: 3,
  /** Organisation physically conducting the activity */
  IMPLEMENTING: 4,
} as const;

export type IATIRoleCode = (typeof IATI_ROLE)[keyof typeof IATI_ROLE];

/**
 * Status of the inference result
 * - 'exact': Value was already present in the transaction (no inference needed)
 * - 'inferred': Value was determined using IATI rules
 * - 'ambiguous': Multiple candidates exist, cannot determine unambiguously
 */
export type InferenceStatus = 'exact' | 'inferred' | 'ambiguous';

/**
 * Result for a single party (provider or receiver)
 */
export interface PartyInferenceResult {
  /** The organization_id (UUID) if resolved, null if ambiguous or not found */
  value: string | null;
  /** How the value was determined */
  status: InferenceStatus;
  /** The IATI organisation reference (for metadata/debugging) */
  iatiRef?: string | null;
  /** Organisation name (for display purposes) */
  name?: string | null;
}

/**
 * Combined inference result for both provider and receiver
 */
export interface TransactionPartyInferenceResult {
  provider: PartyInferenceResult;
  receiver: PartyInferenceResult;
}

/**
 * Reporting organisation input structure
 * This represents the organisation publishing the IATI data
 */
export interface ReportingOrg {
  /** IATI organisation reference (e.g., "AU-5", "GB-GOV-1") */
  ref: string;
  /** Internal UUID if already matched to organisations table */
  organization_id?: string;
  /** Organisation name */
  name?: string;
}

/**
 * Participating organisation input structure
 * This represents an organisation involved in the activity
 */
export interface ParticipatingOrg {
  /** Internal UUID from organisations table */
  organization_id: string;
  /** IATI role code (1=Funding, 2=Accountable, 3=Extending, 4=Implementing) */
  iati_role_code: number;
  /** IATI organisation reference */
  iati_org_ref?: string | null;
  /** Organisation name (from narrative element) */
  name?: string | null;
}

/**
 * Transaction input for inference
 * Contains the fields needed to determine provider/receiver
 */
export interface TransactionForInference {
  /** IATI transaction type code ('1', '2', '3', etc.) */
  transactionType: string;
  /** Existing provider organisation UUID (if present in transaction) */
  providerOrgId?: string | null;
  /** Existing provider IATI organisation reference */
  providerOrgRef?: string | null;
  /** Existing receiver organisation UUID (if present in transaction) */
  receiverOrgId?: string | null;
  /** Existing receiver IATI organisation reference */
  receiverOrgRef?: string | null;
}

/**
 * Main function input combining all required data
 */
export interface InferTransactionPartiesInput {
  /** The reporting organisation (publisher of the IATI data) */
  reportingOrg: ReportingOrg;
  /** List of participating organisations for the activity */
  participatingOrgs: ParticipatingOrg[];
  /** The transaction to infer parties for */
  transaction: TransactionForInference;
}

