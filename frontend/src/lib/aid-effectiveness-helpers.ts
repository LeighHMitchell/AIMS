/**
 * Shared helpers for Aid Effectiveness value checking.
 *
 * After the boolean→string migration, fields store string values:
 * - Yes/No radio fields: 'yes' | 'no'
 * - Country-specific dropdowns: admin-defined label | negative option (e.g. 'Not included')
 * - Multi-option dropdowns: one of several labels (e.g. 'Formal structured', 'Not consulted')
 *
 * Dashboard APIs need to distinguish "positive" from "negative" responses.
 */

const NEGATIVE_VALUES = new Set([
  'no',
  'Not included',
  'Not linked',
  'Not assessed',
  'Not based on national plan',
  'Not consulted',
  'Not involved',
  'Not engaged',
  'Not targeted (GEN-0)',
  'No funding to CSOs',
]);

/**
 * Returns true if the value represents a positive/affirmative response.
 * Works for all field types: yes/no radios, country dropdowns, and multi-option dropdowns.
 */
export function isPositiveValue(value: unknown): boolean {
  if (!value || typeof value !== 'string') return false;
  return !NEGATIVE_VALUES.has(value);
}
