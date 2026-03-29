import type { CodelistEntry, ImportedRowValue } from './types';
import { getCodelist } from './codelist-registry';
import { normalizeHeader, similarity } from './column-matching';

const CONFIDENCE_THRESHOLD = 0.85;
const MAX_SUGGESTIONS = 3;

/**
 * Resolve a raw cell value against a codelist.
 * Returns an ImportedRowValue with status indicating match quality.
 */
export function resolveCodelistValue(
  rawValue: string,
  codelistKey: string
): ImportedRowValue {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return { raw: rawValue, status: 'empty' };
  }

  const entries = getCodelist(codelistKey);
  if (entries.length === 0) {
    return { raw: rawValue, status: 'valid', resolved: trimmed };
  }

  // 1. Exact code match
  const exactCode = entries.find(e => e.code === trimmed);
  if (exactCode) {
    return {
      raw: rawValue,
      resolved: exactCode.code,
      resolvedName: exactCode.name,
      status: 'valid',
    };
  }

  // 2. Exact name match (case-insensitive)
  const normalizedInput = trimmed.toLowerCase();
  const exactName = entries.find(e => e.name.toLowerCase() === normalizedInput);
  if (exactName) {
    return {
      raw: rawValue,
      resolved: exactName.code,
      resolvedName: exactName.name,
      status: 'valid',
    };
  }

  // 3. Code prefix match (for sectors: "11110" in a value like "11110 - Education...")
  const codePrefix = entries.find(e => trimmed.startsWith(e.code + ' ') || trimmed.startsWith(e.code + '-'));
  if (codePrefix) {
    return {
      raw: rawValue,
      resolved: codePrefix.code,
      resolvedName: codePrefix.name,
      status: 'valid',
    };
  }

  // Also check if the raw value contains a code match (e.g., "Education (11110)")
  const codeInParens = entries.find(e => trimmed.includes(`(${e.code})`));
  if (codeInParens) {
    return {
      raw: rawValue,
      resolved: codeInParens.code,
      resolvedName: codeInParens.name,
      status: 'valid',
    };
  }

  // 4. Fuzzy matching — compute similarity scores
  const normalizedRaw = normalizeHeader(trimmed);
  const scored = entries.map(entry => {
    const normalizedCode = normalizeHeader(entry.code);
    const normalizedName = normalizeHeader(entry.name);
    const scoreCode = similarity(normalizedRaw, normalizedCode);
    const scoreName = similarity(normalizedRaw, normalizedName);

    // Also check if the input is a substring of the name
    const isSubstring = normalizedName.includes(normalizedRaw) || normalizedRaw.includes(normalizedName);
    const substringBonus = isSubstring ? 0.15 : 0;

    return {
      entry,
      score: Math.max(scoreCode, scoreName) + substringBonus,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const topSuggestions = scored.slice(0, MAX_SUGGESTIONS).map(s => s.entry);

  if (scored[0] && scored[0].score >= CONFIDENCE_THRESHOLD) {
    // High confidence — suggest but flag as warning
    return {
      raw: rawValue,
      resolved: scored[0].entry.code,
      resolvedName: scored[0].entry.name,
      status: 'warning',
      message: `Best match: "${scored[0].entry.name}" (${scored[0].entry.code})`,
      suggestions: topSuggestions,
    };
  }

  // Low confidence — error with suggestions
  return {
    raw: rawValue,
    status: 'error',
    message: `No match found for "${trimmed}"`,
    suggestions: topSuggestions,
  };
}

/**
 * Validate and convert a non-codelist value based on its expected type.
 */
export function validateFieldValue(
  rawValue: string,
  fieldType: 'string' | 'number' | 'date' | 'boolean'
): ImportedRowValue {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return { raw: rawValue, status: 'empty' };
  }

  switch (fieldType) {
    case 'string':
      return { raw: rawValue, resolved: trimmed, status: 'valid' };

    case 'number': {
      const num = parseFloat(trimmed.replace(/,/g, ''));
      if (isNaN(num)) {
        return {
          raw: rawValue,
          status: 'error',
          message: `"${trimmed}" is not a valid number`,
        };
      }
      return { raw: rawValue, resolved: String(num), status: 'valid' };
    }

    case 'date': {
      // Try common date formats
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) {
        return {
          raw: rawValue,
          status: 'error',
          message: `"${trimmed}" is not a valid date`,
        };
      }
      // Format as YYYY-MM-DD
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      return { raw: rawValue, resolved: `${yyyy}-${mm}-${dd}`, status: 'valid' };
    }

    case 'boolean': {
      const lower = trimmed.toLowerCase();
      const trueValues = ['true', 'yes', '1', 'y'];
      const falseValues = ['false', 'no', '0', 'n'];
      if (trueValues.includes(lower)) {
        return { raw: rawValue, resolved: 'true', status: 'valid' };
      }
      if (falseValues.includes(lower)) {
        return { raw: rawValue, resolved: 'false', status: 'valid' };
      }
      return {
        raw: rawValue,
        status: 'error',
        message: `"${trimmed}" is not a valid boolean (use yes/no, true/false, 1/0)`,
      };
    }

    default:
      return { raw: rawValue, resolved: trimmed, status: 'valid' };
  }
}
