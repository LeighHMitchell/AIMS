// Pure helpers for the d-portal-style Results framework presentation.
// No React, no data hooks — safe to import from both the editor and the profile.

import {
  ResultType,
  MeasureType,
  IndicatorPeriod,
  RESULT_TYPE_CODE_MAP,
  MEASURE_TYPE_CODE_MAP,
  STATUS_THRESHOLDS,
} from '@/types/results';

/**
 * Resolve a multilingual narrative ({ en: "...", ... }) — or a stringified one,
 * or a plain string — into a display string. Lifted from ResultsReadOnlyView so
 * both surfaces share one resolver.
 */
export function getLocalizedNarrative(value: any, defaultLanguage: string = 'en'): string {
  if (!value) return '';
  if (typeof value === 'string') {
    if (value.startsWith('{') && value.includes('"')) {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && parsed !== null) {
          return String(parsed[defaultLanguage] || parsed['en'] || Object.values(parsed)[0] || '');
        }
      } catch {
        return value;
      }
    }
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    if (value[defaultLanguage]) return String(value[defaultLanguage]);
    if (value['en']) return String(value['en']);
    const values = Object.values(value);
    if (values.length > 0 && values[0] != null) return String(values[0]);
  }
  return '';
}

/** Normalise a result `type` that may be a string ('output') or IATI code ('1'). */
export function normalizeResultType(type: any): ResultType {
  if (type === 'output' || type === 'outcome' || type === 'impact' || type === 'other') return type;
  return RESULT_TYPE_CODE_MAP[String(type)] || 'other';
}

/**
 * Normalise a measure that may be a MeasureType string OR a raw IATI code
 * ('1' unit, '2' percentage, '5' qualitative). Currency collapses to unit.
 */
export function normalizeMeasure(measure: any): 'unit' | 'percentage' | 'qualitative' {
  const m: MeasureType | undefined =
    measure === 'unit' || measure === 'percentage' || measure === 'qualitative' || measure === 'currency'
      ? measure
      : MEASURE_TYPE_CODE_MAP[String(measure)];
  if (m === 'percentage') return 'percentage';
  if (m === 'qualitative') return 'qualitative';
  return 'unit'; // unit + currency
}

export function isQualitative(measure: any): boolean {
  return normalizeMeasure(measure) === 'qualitative';
}

/** Format a numeric value per measure (unit → 1,234 · percentage → 12%). */
export function formatMeasureValue(value: number | string | null | undefined, measure: any): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num as number)) return String(value);
  if (normalizeMeasure(measure) === 'percentage') return `${num}%`;
  return (num as number).toLocaleString();
}

/** % achieved for a period: round(actual/target*100) when both numeric & target≠0, else null. */
export function getPeriodAchievement(period: IndicatorPeriod): number | null {
  const target = period.target_value;
  const actual = period.actual_value;
  if (target == null || actual == null) return null;
  const t = Number(target);
  const a = Number(actual);
  if (isNaN(t) || isNaN(a) || t === 0) return null;
  return Math.round((a / t) * 100);
}

export interface StatusStyle {
  key: 'green' | 'yellow' | 'red' | 'gray';
  textClass: string;
  dotClass: string;
}

/** Traffic-light style for a % using STATUS_THRESHOLDS (GREEN≥85, YELLOW≥60, else red). */
export function getStatusStyle(pct: number | null): StatusStyle {
  if (pct == null) return { key: 'gray', textClass: 'text-muted-foreground', dotClass: 'bg-muted-foreground/40' };
  if (pct >= STATUS_THRESHOLDS.GREEN) return { key: 'green', textClass: 'text-green-700', dotClass: 'bg-green-600' };
  if (pct >= STATUS_THRESHOLDS.YELLOW) return { key: 'yellow', textClass: 'text-amber-600', dotClass: 'bg-amber-500' };
  return { key: 'red', textClass: 'text-red-600', dotClass: 'bg-red-600' };
}

/** Format a single ISO date as YYYY-MM-DD (or '' when absent). */
export function formatIsoDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  return d.toISOString().slice(0, 10);
}

/** "2024-07-01 : 2025-06-30" period range (d-portal style). */
export function formatPeriodRange(period: IndicatorPeriod): string {
  const start = formatIsoDate(period.period_start);
  const end = formatIsoDate(period.period_end);
  if (start && end) return `${start} : ${end}`;
  return start || end || '';
}

/** Derive a period-type label ("Annual", "Quarterly"…) from the period duration. */
export function derivePeriodTypeLabel(period: IndicatorPeriod): string {
  if (!period.period_start || !period.period_end) return '';
  const start = new Date(period.period_start);
  const end = new Date(period.period_end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  if (months >= 11 && months <= 13) return 'Annual';
  if (months >= 5 && months <= 7) return 'Semi-annual';
  if (months >= 2 && months <= 4) return 'Quarterly';
  if (months === 1) return 'Monthly';
  return '';
}

/**
 * Result-type banner shading. Consistent with the app's modal headers
 * (bg-surface-muted = the left-sidebar shade) rather than a saturated colour.
 * The OUTPUT/OUTCOME/IMPACT text label carries the type distinction.
 */
export const RESULT_TYPE_BANNER_CLASSES: Record<ResultType, string> = {
  output: 'bg-surface-muted text-foreground',
  outcome: 'bg-surface-muted text-foreground',
  impact: 'bg-surface-muted text-foreground',
  other: 'bg-surface-muted text-foreground',
};
