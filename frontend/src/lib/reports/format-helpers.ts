/**
 * Shared formatting helpers for report exports, so every report applies the
 * same cross-cutting display conventions (decided 2026-05-29):
 *   - Activity titles include the activity acronym when present.
 *   - Organisation names are shown as "Full Name (ACRONYM)".
 *   - Location admin (ADM) levels are derived consistently.
 */

/** "Full Title (ACRONYM)" when an acronym is present, otherwise the title. */
export function titleWithAcronym(title?: string | null, acronym?: string | null): string {
  const t = (title ?? '').trim();
  const a = (acronym ?? '').trim();
  if (t && a && !t.includes(`(${a})`)) return `${t} (${a})`;
  return t;
}

/**
 * "Full Name (ACRONYM)" when both are present; otherwise whichever exists,
 * falling back to `fallback` then 'Unknown'. Used for the "Reporting
 * Organisation" column and any org-name column.
 */
export function orgWithAcronym(
  name?: string | null,
  acronym?: string | null,
  fallback?: string | null
): string {
  const n = (name ?? '').trim();
  const a = (acronym ?? '').trim();
  if (n && a) return `${n} (${a})`;
  return n || a || (fallback ?? '').trim() || 'Unknown';
}

/** Location row fields needed to derive an ADM level. */
export interface AdmLevelFields {
  admin_level?: string | number | null;
  township_name?: string | null;
  township_code?: string | null;
  district_name?: string | null;
  district_code?: string | null;
  state_region_name?: string | null;
  state_region_code?: string | null;
}

/**
 * Derive the administrative level label for a location (Myanmar hierarchy:
 * State/Region = ADM1, District = ADM2, Township = ADM3). Prefers an explicit
 * `admin_level` when set; otherwise infers from the most granular populated
 * field. Returns '' when no level can be determined.
 */
export function admLevel(loc: AdmLevelFields): string {
  const explicit = loc.admin_level == null ? '' : `${loc.admin_level}`.trim();
  if (explicit) return /^\d$/.test(explicit) ? `ADM${explicit}` : explicit;
  if (loc.township_name || loc.township_code) return 'ADM3';
  if (loc.district_name || loc.district_code) return 'ADM2';
  if (loc.state_region_name || loc.state_region_code) return 'ADM1';
  return '';
}

/** Distinct, sorted ADM levels across a set of location rows, e.g. "ADM1, ADM3". */
export function admLevelSummary(locs: AdmLevelFields[]): string {
  const set = new Set<string>();
  for (const l of locs) {
    const lvl = admLevel(l);
    if (lvl) set.add(lvl);
  }
  return Array.from(set).sort().join(', ');
}
