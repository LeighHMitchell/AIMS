/**
 * Scoring Engine — pure TypeScript, no React/browser APIs.
 *
 * Evaluates a project against a set of dimension criteria and produces
 * a 0–100 composite score plus per-dimension breakdowns.
 */

import type {
  ScoringDimension,
  SubCriterionConfig,
  ScoringCriterion,
  DimensionScoreResult,
  ScoreResult,
  ProjectDocument,
} from '@/types/project-bank';

// ── Helpers ────────────────────────────────────────────────────

/** Resolve a dotted field path from a project data bag */
function resolveFieldPath(data: Record<string, any>, fieldPath: string): any {
  const parts = fieldPath.split('.');
  let value: any = data;
  for (let i = 0; i < parts.length; i++) {
    if (value == null) return undefined;
    value = value[parts[i]];
  }
  return value;
}

// ── Rule Evaluators ────────────────────────────────────────────

function evalBooleanField(value: any, config: SubCriterionConfig): number {
  return value === true ? config.max_points : 0;
}

function evalNotNull(value: any, config: SubCriterionConfig): number {
  if (value == null) return 0;
  if (typeof value === 'string' && value.trim() === '') return 0;
  return config.max_points;
}

function evalArrayLength(value: any, config: SubCriterionConfig): number {
  const arr = Array.isArray(value) ? value : [];
  const len = arr.length;
  if (!config.thresholds || config.thresholds.length === 0) {
    return len > 0 ? config.max_points : 0;
  }
  // thresholds sorted ascending by min — pick highest matched
  const sorted = [...config.thresholds].sort((a, b) => a.min - b.min);
  let earned = 0;
  sorted.forEach(t => {
    if (len >= t.min) earned = t.points;
  });
  return Math.min(earned, config.max_points);
}

function evalNumericThreshold(value: any, config: SubCriterionConfig): number {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return 0;
  if (!config.thresholds || config.thresholds.length === 0) {
    return num > 0 ? config.max_points : 0;
  }
  const sorted = [...config.thresholds].sort((a, b) => a.min - b.min);
  let earned = 0;
  sorted.forEach(t => {
    if (num >= t.min) earned = t.points;
  });
  return Math.min(earned, config.max_points);
}

function evalEnumMap(value: any, config: SubCriterionConfig): number {
  if (value == null || !config.enum_values) return 0;
  const key = String(value).toLowerCase().replace(/[\s-]+/g, '_');
  return Math.min(config.enum_values[key] ?? 0, config.max_points);
}

function evalTextLength(value: any, config: SubCriterionConfig): number {
  const text = typeof value === 'string' ? value.trim() : '';
  const len = text.length;
  if (len === 0) return 0;
  if (!config.thresholds || config.thresholds.length === 0) {
    return len > 0 ? config.max_points : 0;
  }
  const sorted = [...config.thresholds].sort((a, b) => a.min - b.min);
  let earned = 0;
  sorted.forEach(t => {
    if (len >= t.min) earned = t.points;
  });
  return Math.min(earned, config.max_points);
}

function evalDocumentExists(
  _value: any,
  config: SubCriterionConfig,
  documents: ProjectDocument[]
): number {
  // field_path here is the document_type
  const docType = config.field_path;
  const found = documents.some(d => d.document_type === docType);
  return found ? config.max_points : 0;
}

function evalJsonFieldExists(value: any, config: SubCriterionConfig): number {
  if (value == null) return 0;
  if (Array.isArray(value) && value.length === 0) return 0;
  if (typeof value === 'object' && Object.keys(value).length === 0) return 0;
  return config.max_points;
}

function evalRiskRegisterQuality(value: any, config: SubCriterionConfig): number {
  // Risk register is expected to be an array of risk objects
  if (!Array.isArray(value) || value.length === 0) return 0;

  const totalRisks = value.length;
  let completedFields = 0;
  let totalFields = 0;

  value.forEach((risk: any) => {
    const fields = ['category', 'description', 'likelihood', 'impact', 'mitigation', 'owner'];
    fields.forEach(f => {
      totalFields++;
      if (risk[f] != null && String(risk[f]).trim() !== '') completedFields++;
    });
  });

  if (totalFields === 0) return 0;

  const completionRatio = completedFields / totalFields;
  // At least 3 risks with >75% field completion gets full points
  if (totalRisks >= 3 && completionRatio >= 0.75) return config.max_points;
  if (totalRisks >= 2 && completionRatio >= 0.5) return Math.round(config.max_points * 0.6);
  if (totalRisks >= 1) return Math.round(config.max_points * 0.3);
  return 0;
}

function evalCountFilledFields(data: Record<string, any>, config: SubCriterionConfig): number {
  // field_path is comma-separated list of fields
  const fields = config.field_path.split(',').map(f => f.trim());
  let filled = 0;
  fields.forEach(fp => {
    const val = resolveFieldPath(data, fp);
    if (val != null && String(val).trim() !== '') filled++;
  });

  if (!config.thresholds || config.thresholds.length === 0) {
    return filled > 0 ? config.max_points : 0;
  }
  const sorted = [...config.thresholds].sort((a, b) => a.min - b.min);
  let earned = 0;
  sorted.forEach(t => {
    if (filled >= t.min) earned = t.points;
  });
  return Math.min(earned, config.max_points);
}

// ── Core Scoring ───────────────────────────────────────────────

function evaluateSubCriterion(
  config: SubCriterionConfig,
  data: Record<string, any>,
  documents: ProjectDocument[]
): number {
  // Special cases that don't use simple field resolution
  if (config.rule_type === 'document_exists') {
    return evalDocumentExists(undefined, config, documents);
  }
  if (config.rule_type === 'count_filled_fields') {
    return evalCountFilledFields(data, config);
  }

  const value = resolveFieldPath(data, config.field_path);

  switch (config.rule_type) {
    case 'boolean_field':
      return evalBooleanField(value, config);
    case 'not_null':
      return evalNotNull(value, config);
    case 'array_length':
      return evalArrayLength(value, config);
    case 'numeric_threshold':
      return evalNumericThreshold(value, config);
    case 'enum_map':
      return evalEnumMap(value, config);
    case 'text_length':
      return evalTextLength(value, config);
    case 'json_field_exists':
      return evalJsonFieldExists(value, config);
    case 'risk_register_quality':
      return evalRiskRegisterQuality(value, config);
    default:
      return 0;
  }
}

function scoreDimension(
  criteria: ScoringCriterion,
  data: Record<string, any>,
  documents: ProjectDocument[]
): DimensionScoreResult {
  const subCriteria = criteria.sub_criteria || [];
  const subScores = subCriteria.map(sc => {
    const earned = evaluateSubCriterion(sc, data, documents);
    return {
      key: sc.key,
      label: sc.label,
      earned: Math.min(earned, sc.max_points),
      max: sc.max_points,
    };
  });

  let rawSum = 0;
  let maxSum = 0;
  subScores.forEach(s => {
    rawSum += s.earned;
    maxSum += s.max;
  });

  const normalized = maxSum > 0 ? Math.round((rawSum / maxSum) * 100 * 100) / 100 : 0;
  const weight = Number(criteria.dimension_weight);
  const weighted = Math.round(normalized * (weight / 100) * 100) / 100;

  return {
    dimension: criteria.dimension,
    raw_score: rawSum,
    max_score: maxSum,
    normalized,
    weighted,
    weight,
    sub_scores: subScores,
  };
}

/**
 * Calculate a project's composite score.
 *
 * @param projectData - flat project row merged with nested data (fs1_narrative, fs2_study_data already nested)
 * @param documents   - project documents array
 * @param criteria    - scoring criteria for the relevant stage
 */
export function calculateScore(
  projectData: Record<string, any>,
  documents: ProjectDocument[],
  criteria: ScoringCriterion[]
): ScoreResult {
  const dimensionResults: Partial<Record<ScoringDimension, DimensionScoreResult>> = {};
  let compositeScore = 0;

  criteria.forEach(c => {
    const result = scoreDimension(c, projectData, documents);
    dimensionResults[c.dimension] = result;
    compositeScore += result.weighted;
  });

  // Clamp to 0–100
  compositeScore = Math.min(100, Math.max(0, Math.round(compositeScore * 100) / 100));

  return {
    composite_score: compositeScore,
    dimension_scores: dimensionResults as Record<ScoringDimension, DimensionScoreResult>,
  };
}
