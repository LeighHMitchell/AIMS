/**
 * Analytics Transaction Filters
 *
 * Utility for excluding internal transfers between activities (e.g. pooled fund
 * disbursements to child activities) from portfolio-level analytics.
 *
 * A transaction is an internal transfer if:
 * - It's outgoing (type 2/3/4) AND receiver_activity_uuid is set
 *   (money going to another activity in the system)
 * - It's incoming (type 1/11/13) AND provider_activity_uuid is set
 *   (money came from another activity in the system)
 *
 * By excluding these, only "boundary" transactions are counted: money entering
 * from external donors and money leaving to external implementers.
 */

/** Outgoing transaction types: Commitment (2), Disbursement (3), Expenditure (4) */
const OUTGOING_TYPES = ['2', '3', '4'];

/** Incoming transaction types: Incoming Funds (1), Incoming Commitment (11), Incoming Pledge (13) */
const INCOMING_TYPES = ['1', '11', '13'];

/**
 * Apply internal-transfer exclusion filters to a Supabase query on the
 * transactions table.
 *
 * @param query - A Supabase query builder already targeting the transactions table
 * @param transactionTypes - Optional array of transaction type codes being queried.
 *   If provided, only the relevant filter is applied (outgoing or incoming).
 *   If omitted or mixed, both filters are applied.
 * @returns The query with additional `.is()` filters applied
 */
export function excludeInternalTransfers<T>(query: T, transactionTypes?: string[]): T {
  const q = query as any;

  if (transactionTypes && transactionTypes.length > 0) {
    const hasOutgoing = transactionTypes.some(t => OUTGOING_TYPES.includes(t));
    const hasIncoming = transactionTypes.some(t => INCOMING_TYPES.includes(t));

    if (hasOutgoing && !hasIncoming) {
      // Only outgoing types: exclude where receiver_activity_uuid is set
      return q.is('receiver_activity_uuid', null);
    }
    if (hasIncoming && !hasOutgoing) {
      // Only incoming types: exclude where provider_activity_uuid is set
      return q.is('provider_activity_uuid', null);
    }
  }

  // Mixed or unknown types: apply both filters
  return q
    .is('receiver_activity_uuid', null)
    .is('provider_activity_uuid', null);
}
