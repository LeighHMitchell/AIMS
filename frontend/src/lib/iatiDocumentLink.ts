import { z } from 'zod';

// Core types
export type Narrative = {
  text: string;
  lang: string;
};

export type IatiDocumentLink = {
  url: string;
  format: string; // IANA MIME type
  title: Narrative[]; // At least one required
  description?: Narrative[];
  categoryCode?: string; // IATI Document Category
  languageCodes?: string[]; // ISO 639-1
  documentDate?: string; // YYYY-MM-DD
  recipientCountries?: string[]; // ISO 3166-1 alpha-2
  recipientRegion?: {
    code: string;
    vocabulary: string; // default '1' (OECD DAC)
    vocabularyUri?: string; // required if vocabulary === '99'
  };
  isImage?: boolean; // derived from format
  thumbnailUrl?: string; // URL to generated thumbnail
};

// IATI Codelists
export const DOCUMENT_CATEGORIES = [
  { code: 'A01', name: 'Pre- and post-project impact appraisal', description: 'Documentation relating to project impact appraisals' },
  { code: 'A02', name: 'Objectives / Purpose of activity', description: 'Statement of objectives and purpose' },
  { code: 'A03', name: 'Intended ultimate beneficiaries', description: 'Documentation on intended beneficiaries' },
  { code: 'A04', name: 'Conditions', description: 'Specific conditions attached to the activity' },
  { code: 'A05', name: 'Budget', description: 'Budget documentation' },
  { code: 'A06', name: 'Summary information about contract', description: 'Contract summary information' },
  { code: 'A07', name: 'Review of project performance and evaluation', description: 'Reviews and evaluations' },
  { code: 'A08', name: 'Results, outcomes and outputs', description: 'Documentation on results and outcomes' },
  { code: 'A09', name: 'Memorandum of understanding', description: 'MoU documentation' },
  { code: 'A10', name: 'Tender', description: 'Tender documentation' },
  { code: 'A11', name: 'Contract', description: 'Formal contract documentation' },
  { code: 'A12', name: 'Activity web page', description: 'Web page for the activity' },
  { code: 'B01', name: 'Annual report', description: 'Annual report documentation' },
  { code: 'B02', name: 'Institutional Strategy paper', description: 'Strategic planning documentation' },
  { code: 'B03', name: 'Country strategy paper', description: 'Country-specific strategy' },
  { code: 'B04', name: 'Aid Allocation Policy', description: 'Policy on aid allocation' },
  { code: 'B05', name: 'Procurement Policy and Procedure', description: 'Procurement policies' },
  { code: 'B06', name: 'Institutional Audit Report', description: 'Audit reports' },
  { code: 'B07', name: 'Country Audit Report', description: 'Country-specific audit' },
  { code: 'B08', name: 'Exclusions Policy', description: 'Policy on exclusions' },
  { code: 'B09', name: 'Institutional Evaluation Report', description: 'Evaluation reports' },
  { code: 'B10', name: 'Country Evaluation Report', description: 'Country-specific evaluation' },
  { code: 'B11', name: 'Sector strategy', description: 'Sector-specific strategy' },
  { code: 'B12', name: 'Thematic strategy', description: 'Thematic strategy documentation' },
  { code: 'B13', name: 'Country-level Memorandum of Understanding', description: 'Country MoU' },
  { code: 'B14', name: 'Evaluations policy', description: 'Policy on evaluations' },
  { code: 'B15', name: 'General Terms and Conditions', description: 'General T&Cs' },
  { code: 'B16', name: 'Organisation web page', description: 'Organisation website' },
  { code: 'B17', name: 'Country/Region web page', description: 'Country/region website' },
  { code: 'B18', name: 'Sector web page', description: 'Sector-specific website' },
];

export const FILE_FORMATS: Record<string, string> = {
  // Documents
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'text/csv': 'CSV',
  'application/json': 'JSON',
  'application/xml': 'XML',
  'text/xml': 'XML',
  'text/plain': 'Text',
  'text/html': 'HTML',
  
  // Images
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/svg+xml': 'SVG',
  'image/webp': 'WebP',
  'image/bmp': 'BMP',
  
  // Videos
  'video/mp4': 'MP4',
  'video/webm': 'WebM',
  'video/ogg': 'OGG',
  'video/quicktime': 'MOV',
  
  // Audio
  'audio/mpeg': 'MP3',
  'audio/wav': 'WAV',
  'audio/ogg': 'OGG Audio',
  
  // Archives
  'application/zip': 'ZIP',
  'application/x-rar-compressed': 'RAR',
  'application/gzip': 'GZIP',
};

export const COMMON_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
  { code: 'sw', name: 'Swahili' },
  { code: 'am', name: 'Amharic' },
  { code: 'fa', name: 'Persian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'bn', name: 'Bengali' },
  { code: 'id', name: 'Indonesian' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
];

// File extension to MIME type mapping
export const EXT_TO_MIME: Record<string, string> = {
  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
  
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  
  // Videos
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.oga': 'audio/ogg',
  
  // Archives
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.gz': 'application/gzip',
  '.tar': 'application/x-tar',
};

// Validation schemas
const narrativeSchema = z.object({
  text: z.string().min(1, 'Document title is required'),
  lang: z.string().length(2, 'Language must be 2-letter ISO 639-1 code'),
});

const descriptionNarrativeSchema = z.object({
  text: z.string(), // Allow empty descriptions
  lang: z.string().length(2, 'Language must be 2-letter ISO 639-1 code'),
});

const recipientRegionSchema = z.object({
  code: z.string().min(1, 'Region code is required'),
  vocabulary: z.string().default('1'),
  vocabularyUri: z.string().optional(),
}).refine(
  (data) => data.vocabulary !== '99' || (data.vocabularyUri && data.vocabularyUri.length > 0),
  { message: 'vocabularyUri is required when vocabulary is 99' }
);

export const documentLinkSchema = z.object({
  url: z.string().url('Must be a valid URL').refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    { message: 'URL must start with http:// or https://' }
  ),
  format: z.string().refine(
    (format) => Object.keys(FILE_FORMATS).includes(format),
    { message: 'Format must be a valid IANA MIME type from IATI FileFormat codelist' }
  ),
  title: z.array(narrativeSchema).min(1, 'At least one title is required'),
  description: z.array(descriptionNarrativeSchema).optional(),
  categoryCode: z.string().refine(
    (code) => DOCUMENT_CATEGORIES.some(cat => cat.code === code),
    { message: 'Invalid document category code' }
  ).optional(),
  languageCodes: z.array(z.string().length(2)).optional(),
  documentDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must be in YYYY-MM-DD format'
  ).optional(),
  recipientCountries: z.array(z.string().length(2)).optional(),
  recipientRegion: recipientRegionSchema.optional(),
  isImage: z.boolean().optional(),
  thumbnailUrl: z.string().url('Must be a valid URL').optional(),
});

// Helper functions
export function inferMimeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    
    for (const [ext, mime] of Object.entries(EXT_TO_MIME)) {
      if (pathname.endsWith(ext)) {
        return mime;
      }
    }
  } catch {
    // Invalid URL
  }
  
  return null;
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

export function getFormatLabel(mime: string): string {
  return FILE_FORMATS[mime] || 'Unknown';
}

// Validation
export interface ValidationIssue {
  path: string;
  message: string;
}

export function validateIatiDocument(doc: IatiDocumentLink): { 
  ok: boolean; 
  issues: ValidationIssue[] 
} {
  // Ensure doc is not null/undefined
  if (!doc) {
    return {
      ok: false,
      issues: [{ path: '', message: 'Document is required' }],
    };
  }
  
  try {
    documentLinkSchema.parse(doc);
    return { ok: true, issues: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return {
        ok: false,
        issues: zodError.issues.map((issue) => ({
          path: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path || ''),
          message: issue.message || 'Validation error',
        })),
      };
    }
    console.error('Validation error:', error);
    return {
      ok: false,
      issues: [{ path: '', message: error instanceof Error ? error.message : 'Unknown validation error' }],
    };
  }
}

// XML Serialization
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function toIatiXml(doc: IatiDocumentLink): string {
  const lines: string[] = [];
  
  // Start tag with attributes
  lines.push(`<document-link url="${escapeXml(doc.url)}" format="${escapeXml(doc.format)}">`);
  
  // Title narratives
  lines.push('  <title>');
  doc.title.forEach(narrative => {
    lines.push(`    <narrative xml:lang="${narrative.lang}">${escapeXml(narrative.text)}</narrative>`);
  });
  lines.push('  </title>');
  
  // Description narratives (optional)
  if (doc.description && doc.description.length > 0) {
    lines.push('  <description>');
    doc.description.forEach(narrative => {
      lines.push(`    <narrative xml:lang="${narrative.lang}">${escapeXml(narrative.text)}</narrative>`);
    });
    lines.push('  </description>');
  }
  
  // Category (optional)
  if (doc.categoryCode) {
    lines.push(`  <category code="${doc.categoryCode}"/>`);
  }
  
  // Languages (optional)
  if (doc.languageCodes) {
    doc.languageCodes.forEach(code => {
      lines.push(`  <language code="${code}"/>`);
    });
  }
  
  // Document date (optional)
  if (doc.documentDate) {
    lines.push(`  <document-date iso-date="${doc.documentDate}"/>`);
  }
  
  // Recipient countries (optional)
  if (doc.recipientCountries) {
    doc.recipientCountries.forEach(code => {
      lines.push(`  <recipient-country code="${code}"/>`);
    });
  }
  
  // Recipient region (optional)
  if (doc.recipientRegion) {
    const attrs = [`code="${doc.recipientRegion.code}"`];
    if (doc.recipientRegion.vocabulary !== '1') {
      attrs.push(`vocabulary="${doc.recipientRegion.vocabulary}"`);
    }
    if (doc.recipientRegion.vocabularyUri) {
      attrs.push(`vocabulary-uri="${escapeXml(doc.recipientRegion.vocabularyUri)}"`);
    }
    lines.push(`  <recipient-region ${attrs.join(' ')}/>`);
  }
  
  lines.push('</document-link>');
  
  return lines.join('\n');
}

// JSON Serialization
export function toIatiJson(doc: IatiDocumentLink): object {
  const json: any = {
    url: doc.url,
    format: doc.format,
    title: doc.title.map(n => ({
      narrative: {
        text: n.text,
        lang: n.lang,
      },
    })),
  };
  
  if (doc.description && doc.description.length > 0) {
    json.description = doc.description.map(n => ({
      narrative: {
        text: n.text,
        lang: n.lang,
      },
    }));
  }
  
  if (doc.categoryCode) {
    json.category = { code: doc.categoryCode };
  }
  
  if (doc.languageCodes && doc.languageCodes.length > 0) {
    json.language = doc.languageCodes.map(code => ({ code }));
  }
  
  if (doc.documentDate) {
    json.documentDate = { isoDate: doc.documentDate };
  }
  
  if (doc.recipientCountries && doc.recipientCountries.length > 0) {
    json.recipientCountry = doc.recipientCountries.map(code => ({ code }));
  }
  
  if (doc.recipientRegion) {
    json.recipientRegion = {
      code: doc.recipientRegion.code,
      vocabulary: doc.recipientRegion.vocabulary,
    };
    if (doc.recipientRegion.vocabularyUri) {
      json.recipientRegion.vocabularyUri = doc.recipientRegion.vocabularyUri;
    }
  }
  
  return json;
}

// Clipboard utilities
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
  } catch {
    return '';
  }
}
