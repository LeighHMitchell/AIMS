/**
 * Mapper for incoming transaction payloads before they are saved to the database.
 *
 * These functions are extracted from the POST handler in
 * src/app/api/activities/route.ts so they can be unit-tested independently.
 */

// ---------------------------------------------------------------------------
// Helper utilities (moved from route.ts; route.ts imports these)
// ---------------------------------------------------------------------------

/** Convert empty/null/string-"null" dates to null, pass-through otherwise. */
export function cleanDateValue(value: any): string | null {
  if (!value || value === '' || value === 'null') {
    return null;
  }
  return value;
}

/** Return true when the string is a well-formed UUID v4/v5 pattern. */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Accept a valid UUID string, return null for empty/absent values, and throw
 * for non-UUID strings (e.g. legacy integer-style IDs).
 */
export function cleanUUIDValue(value: any): string | null {
  if (!value || value === '' || value === 'null') {
    return null;
  }

  // Check if it's a valid UUID
  if (typeof value === 'string' && isValidUUID(value)) {
    return value;
  }

  // If it's a simple string ID like "1", "2", etc., throw an error
  throw new Error(`Invalid UUID format: ${value}. Expected a valid UUID v4 or null.`);
}

// ---------------------------------------------------------------------------
// Mapper context
// ---------------------------------------------------------------------------

export interface TransactionMapCtx {
  activityId: string;
  organizationId: string | null;
  createdBy: string | null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Return an array of human-readable validation error messages for a raw
 * incoming transaction.  An empty array means the row is valid.
 */
export function validateIncomingTransaction(transaction: any): string[] {
  const errors: string[] = [];

  if (!transaction.transaction_type && !transaction.type) {
    errors.push('transaction type');
  }
  if (!transaction.value && transaction.value !== 0) {
    errors.push('value');
  }
  if (!transaction.transaction_date && !transaction.transactionDate) {
    errors.push('transaction date');
  }
  if (!transaction.currency) {
    errors.push('currency');
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

/**
 * Map a single raw incoming transaction (from the request body) to the
 * canonical DB-row shape.
 *
 * Behavior is byte-identical to the inline `.map()` callback that previously
 * lived in route.ts.  Do NOT change conversion semantics here.
 */
export function mapIncomingTransaction(
  transaction: any,
  ctx: TransactionMapCtx
): Record<string, any> {
  const { activityId, organizationId, createdBy } = ctx;

  return {
    uuid: transaction.uuid || transaction.id || undefined, // Let DB generate if not provided
    activity_id: activityId,
    organization_id: organizationId,
    transaction_type: transaction.transaction_type || transaction.type,
    provider_org_name: transaction.provider_org_name || transaction.provider_org || transaction.providerOrg,
    receiver_org_name: transaction.receiver_org_name || transaction.receiver_org || transaction.receiverOrg,
    provider_org_id: cleanUUIDValue(transaction.provider_org_id),
    receiver_org_id: cleanUUIDValue(transaction.receiver_org_id),
    provider_org_type: transaction.provider_org_type,
    receiver_org_type: transaction.receiver_org_type,
    provider_org_ref: transaction.provider_org_ref,
    receiver_org_ref: transaction.receiver_org_ref,
    value: transaction.value || 0,
    currency: transaction.currency || 'USD',
    status: transaction.status || 'draft',
    transaction_date: cleanDateValue(transaction.transaction_date || transaction.transactionDate),
    value_date: cleanDateValue(transaction.value_date),
    transaction_reference: transaction.transaction_reference,
    description: transaction.description || transaction.narrative,
    aid_type: transaction.aidType || transaction.aid_type,
    tied_status: transaction.tiedStatus || transaction.tied_status,
    flow_type: transaction.flowType || transaction.flow_type,
    finance_type: transaction.finance_type,
    disbursement_channel: transaction.disbursement_channel,
    is_humanitarian: transaction.is_humanitarian ?? null,
    financing_classification: transaction.financing_classification,
    created_by: createdBy,
  };
}
