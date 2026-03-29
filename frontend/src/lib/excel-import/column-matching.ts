import type { ExcelFieldDefinition, ColumnMatchResult } from './types';

/**
 * Normalize a header string for comparison:
 * strip spaces, underscores, hyphens; lowercase; trim
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\s_\-]+/g, '')
    .trim();
}

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Compute normalized similarity score (0-1) between two strings.
 */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Match Excel column headers to field definitions.
 * Returns a map from fieldKey to the best match result.
 */
export function matchColumns(
  headers: string[],
  fieldDefs: ExcelFieldDefinition[]
): Map<string, ColumnMatchResult> {
  const results = new Map<string, ColumnMatchResult>();
  const usedHeaders = new Set<number>();

  // Pass 1: exact matches (on normalized key or normalized label)
  headers.forEach((header, headerIdx) => {
    const normalizedHeader = normalizeHeader(header);

    for (const field of fieldDefs) {
      if (results.has(field.key)) continue;

      const normalizedKey = normalizeHeader(field.key);
      const normalizedLabel = normalizeHeader(field.label);

      if (normalizedHeader === normalizedKey || normalizedHeader === normalizedLabel) {
        results.set(field.key, {
          fieldKey: field.key,
          confidence: 'exact',
          originalHeader: header,
        });
        usedHeaders.add(headerIdx);
        break;
      }
    }
  });

  // Pass 2: fuzzy matches for unmatched fields
  for (const field of fieldDefs) {
    if (results.has(field.key)) continue;

    const normalizedKey = normalizeHeader(field.key);
    const normalizedLabel = normalizeHeader(field.label);

    let bestScore = 0;
    let bestHeaderIdx = -1;
    let bestHeader = '';

    headers.forEach((header, headerIdx) => {
      if (usedHeaders.has(headerIdx)) return;

      const normalizedHeader = normalizeHeader(header);
      const scoreKey = similarity(normalizedHeader, normalizedKey);
      const scoreLabel = similarity(normalizedHeader, normalizedLabel);
      const score = Math.max(scoreKey, scoreLabel);

      if (score > bestScore) {
        bestScore = score;
        bestHeaderIdx = headerIdx;
        bestHeader = header;
      }
    });

    // Threshold: shorter strings need higher similarity
    const threshold = normalizedKey.length <= 6 ? 0.75 : 0.7;

    if (bestScore >= threshold && bestHeaderIdx >= 0) {
      results.set(field.key, {
        fieldKey: field.key,
        confidence: 'fuzzy',
        originalHeader: bestHeader,
      });
      usedHeaders.add(bestHeaderIdx);
    }
  }

  return results;
}

/**
 * Get column headers that weren't matched to any field.
 */
export function getUnmatchedHeaders(
  headers: string[],
  matchedColumns: Map<string, ColumnMatchResult>
): string[] {
  const matchedHeaders = new Set(
    Array.from(matchedColumns.values()).map(m => m.originalHeader)
  );
  return headers.filter(h => !matchedHeaders.has(h));
}
