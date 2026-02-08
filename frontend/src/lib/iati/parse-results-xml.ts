import { XMLParser } from 'fast-xml-parser';

// ============================================================
// Types for parsed results (matches shape expected by results-importer)
// ============================================================

export interface ParsedDocumentLink {
  format?: string;
  url: string;
  title?: string;
  description?: string;
  category_code?: string;
  language_code?: string;
  document_date?: string;
  link_type?: 'target' | 'actual';
}

export interface ParsedReference {
  vocabulary: string;
  code: string;
  vocabulary_uri?: string;
  indicator_uri?: string;
}

export interface ParsedBaselineDimension {
  name: string;
  value: string;
}

export interface ParsedBaselineLocation {
  location_ref: string;
}

export interface ParsedBaseline {
  baseline_year?: number;
  iso_date?: string;
  value?: number;
  comment?: string;
  locations?: ParsedBaselineLocation[];
  dimensions?: ParsedBaselineDimension[];
  document_links?: ParsedDocumentLink[];
}

export interface ParsedPeriodLocation {
  location_ref: string;
  location_type: 'target' | 'actual';
}

export interface ParsedPeriodDimension {
  name: string;
  value: string;
  dimension_type: 'target' | 'actual';
}

export interface ParsedPeriod {
  period_start: string;
  period_end: string;
  target_value?: number;
  target_comment?: string;
  actual_value?: number;
  actual_comment?: string;
  target_locations?: ParsedPeriodLocation[];
  actual_locations?: ParsedPeriodLocation[];
  target_dimensions?: ParsedPeriodDimension[];
  actual_dimensions?: ParsedPeriodDimension[];
  target_document_links?: ParsedDocumentLink[];
  actual_document_links?: ParsedDocumentLink[];
}

export interface ParsedIATIIndicator {
  measure: string;
  ascending: boolean;
  aggregation_status: boolean;
  title?: string;
  description?: string;
  references?: ParsedReference[];
  document_links?: ParsedDocumentLink[];
  baseline?: ParsedBaseline;
  periods?: ParsedPeriod[];
}

export interface ParsedIATIResult {
  type: string;
  aggregation_status: boolean;
  title?: string;
  description?: string;
  references?: ParsedReference[];
  document_links?: ParsedDocumentLink[];
  indicators?: ParsedIATIIndicator[];
}

// ============================================================
// XML Fetching
// ============================================================

const IATI_API_KEY = process.env.IATI_API_KEY || process.env.NEXT_PUBLIC_IATI_API_KEY;

/**
 * Fetch raw IATI XML for a single activity from the Datastore `/iati` endpoint.
 * Returns the XML string, or null if the activity was not found.
 * Retries on 429 (rate limit) with exponential backoff.
 */
export async function fetchActivityXml(
  iatiIdentifier: string,
  apiKey?: string,
  maxRetries: number = 3
): Promise<string | null> {
  const key = apiKey || IATI_API_KEY;
  if (!key) return null;

  const query = `iati_identifier_exact:"${iatiIdentifier}"`;
  const url = `https://api.iatistandard.org/datastore/activity/iati?q=${encodeURIComponent(query)}`;

  const headers: HeadersInit = {
    Accept: 'application/xml',
    'User-Agent': 'AIMS-IATI-BulkImport/1.0',
  };
  if (key) {
    headers['Ocp-Apim-Subscription-Key'] = key;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: abortController.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
        console.warn(`[parse-results-xml] 429 rate limited for ${iatiIdentifier}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) return null;

      const xml = await response.text();
      if (!xml || !xml.includes('<iati-activity')) return null;

      return xml;
    } catch {
      clearTimeout(timeoutId);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return null;
    }
  }

  return null;
}

// ============================================================
// Batch pre-fetching with concurrency control
// ============================================================

/**
 * Run an array of async task functions with a concurrency limit.
 * Uses a simple worker-pool pattern — no external packages needed.
 */
async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => runNext()
  );
  await Promise.all(workers);
  return results;
}

/**
 * Pre-fetch and parse IATI results XML for a batch of activity identifiers
 * with concurrency control and 429 retry handling.
 *
 * Returns a Map of iatiIdentifier → ParsedIATIResult[].
 * Activities with no results or fetch failures get an empty array.
 */
export async function fetchAndParseAllResults(
  iatiIdentifiers: string[],
  apiKey: string,
  concurrency: number = 5
): Promise<Map<string, ParsedIATIResult[]>> {
  const resultMap = new Map<string, ParsedIATIResult[]>();

  if (iatiIdentifiers.length === 0) return resultMap;

  let completed = 0;
  const total = iatiIdentifiers.length;

  const tasks = iatiIdentifiers.map((iatiId) => async (): Promise<void> => {
    try {
      const xml = await fetchActivityXml(iatiId, apiKey);
      if (xml) {
        const parsed = parseResultsFromXml(xml, iatiId);
        resultMap.set(iatiId, parsed);
      } else {
        resultMap.set(iatiId, []);
      }
    } catch (err) {
      console.error(`[Bulk Import] Pre-fetch failed for ${iatiId}:`, err);
      resultMap.set(iatiId, []);
    }

    completed++;
    if (completed % 50 === 0 || completed === total) {
      console.log(`[Bulk Import] Pre-fetched results XML: ${completed}/${total} complete`);
    }
  });

  await withConcurrencyLimit(tasks, concurrency);

  return resultMap;
}

// ============================================================
// XML Parsing
// ============================================================

const resultTypeMap: Record<string, string> = {
  '1': 'output',
  '2': 'outcome',
  '3': 'impact',
  '9': 'other',
};

const measureMap: Record<string, string> = {
  '1': 'unit',
  '2': 'percentage',
  '3': 'qualitative',
  '4': 'qualitative',
  '5': 'qualitative',
};

/**
 * Extract the first English-language narrative text from a fast-xml-parser element.
 * fast-xml-parser returns narrative as:
 *   - string (simple text content)
 *   - { '#text': '...', 'xml:lang': 'en' }
 *   - [ { '#text': '...' }, ... ] (array via isArray config)
 */
function extractNarrative(element: any): string | undefined {
  if (!element) return undefined;

  // Element with child <narrative>
  const narrative = element.narrative;
  if (!narrative) {
    // Element itself might be a plain string
    if (typeof element === 'string') return element;
    if (element['#text']) return String(element['#text']);
    return undefined;
  }

  if (typeof narrative === 'string') return narrative;
  if (typeof narrative === 'number') return String(narrative);

  if (Array.isArray(narrative)) {
    // Prefer English narrative
    const english = narrative.find(
      (n: any) => !n['xml:lang'] || n['xml:lang'] === 'en'
    );
    const pick = english || narrative[0];
    if (!pick) return undefined;
    if (typeof pick === 'string') return pick;
    if (typeof pick === 'number') return String(pick);
    return pick['#text'] != null ? String(pick['#text']) : undefined;
  }

  // Single narrative object
  if (narrative['#text'] != null) return String(narrative['#text']);
  return undefined;
}

function parseDocLinks(parent: any): ParsedDocumentLink[] {
  const links = parent?.['document-link'];
  if (!links) return [];
  const arr = Array.isArray(links) ? links : [links];

  return arr
    .filter((dl: any) => {
      const url = dl?.url;
      return url && typeof url === 'string' && url.trim().length > 0;
    })
    .map((dl: any) => {
      let fixedUrl = String(dl.url).trim();
      if (fixedUrl.startsWith('http:') && !fixedUrl.startsWith('http://')) {
        fixedUrl = fixedUrl.replace('http:', 'http://');
      }
      if (fixedUrl.startsWith('https:') && !fixedUrl.startsWith('https://')) {
        fixedUrl = fixedUrl.replace('https:', 'https://');
      }

      return {
        format: dl.format || undefined,
        url: fixedUrl,
        title: extractNarrative(dl.title),
        description: extractNarrative(dl.description),
        category_code: dl.category?.code || undefined,
        language_code: dl.language?.code || 'en',
        document_date: dl['document-date']?.['iso-date'] || undefined,
      } as ParsedDocumentLink;
    });
}

function parseReferences(parent: any): ParsedReference[] {
  const refs = parent?.reference;
  if (!refs) return [];
  const arr = Array.isArray(refs) ? refs : [refs];

  return arr
    .filter((r: any) => r?.vocabulary && r?.code)
    .map((r: any) => ({
      vocabulary: String(r.vocabulary),
      code: String(r.code),
      vocabulary_uri: r['vocabulary-uri'] || undefined,
      indicator_uri: r['indicator-uri'] || undefined,
    }));
}

function parseLocations(parent: any): { location_ref: string }[] {
  const locs = parent?.location;
  if (!locs) return [];
  const arr = Array.isArray(locs) ? locs : [locs];
  return arr.map((l: any) => ({ location_ref: l?.ref ? String(l.ref) : '' }));
}

function parseDimensions(parent: any): { name: string; value: string }[] {
  const dims = parent?.dimension;
  if (!dims) return [];
  const arr = Array.isArray(dims) ? dims : [dims];
  return arr.map((d: any) => ({
    name: d?.name ? String(d.name) : '',
    value: d?.value ? String(d.value) : '',
  }));
}

/**
 * Parse `<result>` elements from raw IATI XML (fast-xml-parser based).
 * Returns an array of ParsedIATIResult matching the shape expected by importResultsForActivity().
 */
export function parseResultsFromXml(
  xml: string,
  iatiIdentifier: string
): ParsedIATIResult[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    allowBooleanAttributes: true,
    parseAttributeValue: false, // keep strings to avoid precision issues
    parseTagValue: true,
    trimValues: true,
    isArray: (name: string) =>
      [
        'iati-activity',
        'result',
        'indicator',
        'period',
        'reference',
        'document-link',
        'location',
        'dimension',
        'narrative',
      ].includes(name),
  });

  let doc: any;
  try {
    doc = parser.parse(xml);
  } catch {
    console.error(`[parse-results-xml] Failed to parse XML for ${iatiIdentifier}`);
    return [];
  }

  // Find the target activity
  const activities =
    doc?.['iati-activities']?.['iati-activity'] || doc?.['iati-activity'];
  if (!activities) return [];

  const activityList = Array.isArray(activities) ? activities : [activities];

  // Find the activity matching the requested identifier
  const activity = activityList.find((a: any) => {
    const id = a?.['iati-identifier'];
    const idStr = typeof id === 'string' ? id : id?.['#text'];
    return idStr && String(idStr).trim() === iatiIdentifier;
  }) || activityList[0]; // fallback to first if only one returned

  if (!activity) return [];

  const resultElements = activity.result;
  if (!resultElements || !Array.isArray(resultElements) || resultElements.length === 0) {
    return [];
  }

  const results: ParsedIATIResult[] = [];

  for (const resultEl of resultElements) {
    const typeCode = String(resultEl.type || '1');
    const resultData: ParsedIATIResult = {
      type: resultTypeMap[typeCode] || 'output',
      aggregation_status: resultEl['aggregation-status'] === '1' || resultEl['aggregation-status'] === true,
      title: extractNarrative(resultEl.title),
      description: extractNarrative(resultEl.description),
      references: parseReferences(resultEl),
      document_links: parseDocLinks(resultEl),
      indicators: [],
    };

    // Parse indicators
    const indicators = resultEl.indicator;
    if (indicators && Array.isArray(indicators)) {
      for (const indEl of indicators) {
        const measureCode = String(indEl.measure || '1');
        const indicatorData: ParsedIATIIndicator = {
          measure: measureMap[measureCode] || 'unit',
          ascending:
            indEl.ascending === '1' || indEl.ascending === 'true' || indEl.ascending === true,
          aggregation_status:
            indEl['aggregation-status'] === '1' || indEl['aggregation-status'] === true,
          title: extractNarrative(indEl.title),
          description: extractNarrative(indEl.description),
          references: parseReferences(indEl),
          document_links: parseDocLinks(indEl),
          periods: [],
        };

        // Parse baseline
        const baselineEl = indEl.baseline;
        if (baselineEl) {
          const bl = Array.isArray(baselineEl) ? baselineEl[0] : baselineEl;
          indicatorData.baseline = {
            baseline_year: bl.year ? parseInt(String(bl.year), 10) : undefined,
            iso_date: bl['iso-date'] || undefined,
            value: bl.value != null ? parseFloat(String(bl.value)) : undefined,
            comment: extractNarrative(bl.comment),
            locations: parseLocations(bl),
            dimensions: parseDimensions(bl),
            document_links: parseDocLinks(bl),
          };
          // Clean NaN
          if (indicatorData.baseline.value != null && isNaN(indicatorData.baseline.value)) {
            indicatorData.baseline.value = undefined;
          }
          if (indicatorData.baseline.baseline_year != null && isNaN(indicatorData.baseline.baseline_year)) {
            indicatorData.baseline.baseline_year = undefined;
          }
        }

        // Parse periods
        const periods = indEl.period;
        if (periods && Array.isArray(periods)) {
          for (const pEl of periods) {
            const periodData: ParsedPeriod = {
              period_start: pEl['period-start']?.['iso-date'] || '',
              period_end: pEl['period-end']?.['iso-date'] || '',
              target_locations: [],
              actual_locations: [],
              target_dimensions: [],
              actual_dimensions: [],
              target_document_links: [],
              actual_document_links: [],
            };

            // Target
            const target = pEl.target;
            if (target) {
              const t = Array.isArray(target) ? target[0] : target;
              if (t.value != null) {
                const tv = parseFloat(String(t.value));
                if (!isNaN(tv)) periodData.target_value = tv;
              }
              periodData.target_comment = extractNarrative(t.comment);
              periodData.target_locations = parseLocations(t).map((l) => ({
                ...l,
                location_type: 'target' as const,
              }));
              periodData.target_dimensions = parseDimensions(t).map((d) => ({
                ...d,
                dimension_type: 'target' as const,
              }));
              periodData.target_document_links = parseDocLinks(t).map((dl) => ({
                ...dl,
                link_type: 'target' as const,
              }));
            }

            // Actual
            const actual = pEl.actual;
            if (actual) {
              const a = Array.isArray(actual) ? actual[0] : actual;
              if (a.value != null) {
                const av = parseFloat(String(a.value));
                if (!isNaN(av)) periodData.actual_value = av;
              }
              periodData.actual_comment = extractNarrative(a.comment);
              periodData.actual_locations = parseLocations(a).map((l) => ({
                ...l,
                location_type: 'actual' as const,
              }));
              periodData.actual_dimensions = parseDimensions(a).map((d) => ({
                ...d,
                dimension_type: 'actual' as const,
              }));
              periodData.actual_document_links = parseDocLinks(a).map((dl) => ({
                ...dl,
                link_type: 'actual' as const,
              }));
            }

            indicatorData.periods!.push(periodData);
          }
        }

        resultData.indicators!.push(indicatorData);
      }
    }

    results.push(resultData);
  }

  return results;
}
