/**
 * IATI Codelist Resolver
 * --------------------------------------------------------------------------
 * Single canonical entry point for code-to-label lookups across the app.
 * Backed by the existing codelist-registry.ts plus all new IATI codelists
 * added in PR1 of the export overhaul.
 *
 * Use `codeAndName(list, code)` for export rows where every coded field
 * needs both `<field>_code` and `<field>_name` columns.
 */

import { getCodelist, getAllCodelistKeys } from '@/lib/excel-import/codelist-registry';

export type IatiCodelist =
  | 'activity_status'
  | 'collaboration_type'
  | 'activity_scope'
  | 'currency'
  | 'country'
  | 'region'
  | 'policy_marker'
  | 'organization_type'
  | 'aid_type'
  | 'finance_type'
  | 'flow_type'
  | 'tied_status'
  | 'sector'
  | 'policy_significance'
  | 'sdg_goal'
  | 'org_role'
  | 'budget_status'
  | 'transaction_type'
  | 'disbursement_channel'
  | 'transaction_status'
  | 'geographic_exactness'
  | 'geographic_location_class'
  | 'geographic_location_reach'
  | 'geographic_vocabulary'
  | 'verification_status'
  | 'result_vocabulary'
  | 'tag_vocabulary'
  | 'policy_marker_vocabulary'
  | 'aid_type_vocabulary'
  | 'sector_vocabulary'
  | 'document_category'
  | 'budget_not_provided'
  | 'humanitarian_scope_type'
  | 'humanitarian_scope_vocabulary'
  | 'contact_type';

export interface CodeAndName {
  code: string;
  name: string;
}

const cache = new Map<IatiCodelist, Map<string, string>>();

function getMap(list: IatiCodelist): Map<string, string> {
  let m = cache.get(list);
  if (m) return m;
  m = new Map();
  for (const entry of getCodelist(list)) {
    m.set(String(entry.code), entry.name);
  }
  cache.set(list, m);
  return m;
}

/**
 * Look up the human-readable label for a code in the named codelist.
 * Returns '' for null/undefined/empty/unknown codes.
 */
export function getCodelistLabel(
  list: IatiCodelist,
  code: string | number | null | undefined
): string {
  if (code === null || code === undefined || code === '') return '';
  return getMap(list).get(String(code)) ?? '';
}

/**
 * Build a code+name pair suitable for exports. Always returns both fields,
 * even if the name lookup fails (name will be '' rather than undefined so
 * downstream CSV/xlsx writers produce a clean empty cell).
 */
export function codeAndName(
  list: IatiCodelist,
  code: string | number | null | undefined
): CodeAndName {
  if (code === null || code === undefined || code === '') {
    return { code: '', name: '' };
  }
  const codeStr = String(code);
  return { code: codeStr, name: getMap(list).get(codeStr) ?? '' };
}

/**
 * Quick check whether a codelist is registered.
 */
export function isRegisteredCodelist(list: string): list is IatiCodelist {
  return getAllCodelistKeys().includes(list);
}
