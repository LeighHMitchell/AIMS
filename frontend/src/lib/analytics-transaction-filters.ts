/**
 * Analytics Transaction Filters
 *
 * Utility for excluding internal transfers between pooled fund activities
 * from portfolio-level analytics to avoid double-counting.
 *
 * A transaction is an internal transfer if it belongs to a pooled fund activity AND:
 * - It's outgoing (type 2/3/4) AND receiver_activity_uuid is set
 *   (money going to another activity in the system)
 * - It's incoming (type 1/11/13) AND provider_activity_uuid is set
 *   (money came from another activity in the system)
 *
 * Only pooled fund transactions are excluded — regular activities with activity
 * links are NOT affected, preserving their transactions in portfolio totals.
 */

/** Outgoing transaction types: Commitment (2), Disbursement (3), Expenditure (4) */
const OUTGOING_TYPES = ['2', '3', '4'];

/** Incoming transaction types: Incoming Funds (1), Incoming Commitment (11), Incoming Pledge (13) */
const INCOMING_TYPES = ['1', '11', '13'];

/**
 * Fetch IDs of all pooled fund activities. Call this once per request,
 * then pass the result to `excludeInternalTransfers`.
 */
export async function getPooledFundIds(supabaseClient: any): Promise<string[]> {
  const { data: pooledFunds } = await supabaseClient
    .from('activities')
    .select('id')
    .eq('is_pooled_fund', true);
  return pooledFunds?.map((f: any) => f.id) || [];
}

/**
 * Apply internal-transfer exclusion filters to a Supabase query on the
 * transactions table. Only excludes transactions belonging to pooled fund
 * activities that have activity links set.
 *
 * @param query - A Supabase query builder already targeting the transactions table
 * @param pooledFundIds - Array of pooled fund activity IDs (from `getPooledFundIds`)
 * @param transactionTypes - Optional array of transaction type codes being queried.
 *   If provided, only the relevant filter is applied (outgoing or incoming).
 *   If omitted or mixed, both filters are applied.
 * @returns The query with additional exclusion filters applied
 */
export function excludeInternalTransfers<T>(
  query: T,
  pooledFundIds: string[],
  transactionTypes?: string[]
): T {
  const q = query as any;

  // If no pooled funds exist, no exclusion needed
  if (pooledFundIds.length === 0) {
    return q;
  }

  const idList = pooledFundIds.join(',');

  if (transactionTypes && transactionTypes.length > 0) {
    const hasOutgoing = transactionTypes.some(t => OUTGOING_TYPES.includes(t));
    const hasIncoming = transactionTypes.some(t => INCOMING_TYPES.includes(t));

    if (hasOutgoing && !hasIncoming) {
      // Only outgoing types: exclude where activity is a pooled fund AND receiver_activity_uuid is set
      return q.or(`receiver_activity_uuid.is.null,activity_id.not.in.(${idList})`);
    }
    if (hasIncoming && !hasOutgoing) {
      // Only incoming types: exclude where activity is a pooled fund AND provider_activity_uuid is set
      return q.or(`provider_activity_uuid.is.null,activity_id.not.in.(${idList})`);
    }
  }

  // Mixed or unknown types: exclude both directions for pooled funds only
  return q
    .or(`receiver_activity_uuid.is.null,activity_id.not.in.(${idList})`)
    .or(`provider_activity_uuid.is.null,activity_id.not.in.(${idList})`);
}
