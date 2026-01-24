/**
 * Library Document Types
 * 
 * Types for the centralized document library that aggregates documents from
 * activities, transactions, organizations, results, and standalone uploads.
 */

// Source types for documents
export type DocumentSourceType = 
  | 'activity' 
  | 'transaction' 
  | 'organization' 
  | 'result' 
  | 'indicator'
  | 'baseline'
  | 'period'
  | 'standalone';

// Linked entity reference (for merged documents)
export interface LinkedEntity {
  type: DocumentSourceType;
  id: string;
  name: string;
  url?: string; // URL to navigate to the entity
}

// Unified document interface for the library view
export interface UnifiedDocument {
  id: string;
  url: string;
  format: string;
  title: string; // Primary title (extracted from JSONB, preferring 'en')
  titleNarratives?: Array<{ text: string; lang: string }>; // Full narrative array
  description?: string; // Primary description
  descriptionNarratives?: Array<{ text: string; lang: string }>;
  categoryCode?: string;
  categoryName?: string; // Human-readable category name
  languageCodes?: string[];
  documentDate?: string;
  recipientCountries?: string[];
  
  // File metadata
  fileName?: string;
  fileSize?: number;
  filePath?: string;
  isExternal: boolean;
  thumbnailUrl?: string;
  
  // Source tracking
  sourceType: DocumentSourceType;
  sourceId: string;
  sourceName: string; // Activity title, org name, transaction ref, etc.
  sourceUrl?: string; // URL to navigate to the source
  
  // For documents that appear in multiple places (same URL)
  linkedEntities: LinkedEntity[];
  
  // Audit info
  uploadedBy?: string;
  uploadedByEmail?: string;
  uploadedByName?: string;
  reportingOrgId?: string;
  reportingOrgName?: string;
  reportingOrgAcronym?: string;
  reportingOrgLogo?: string;
  createdAt: string;
  updatedAt?: string;
}

// Filter options for the library
export interface LibraryFilters {
  search?: string;
  sourceTypes?: DocumentSourceType[];
  categoryCodes?: string[];
  formats?: string[]; // MIME types or format groups
  reportingOrgIds?: string[];
  uploadedByOrgIds?: string[];
  documentDateFrom?: string;
  documentDateTo?: string;
  uploadDateFrom?: string;
  uploadDateTo?: string;
}

// Sort options
export type LibrarySortField = 
  | 'title' 
  | 'categoryCode' 
  | 'format' 
  | 'sourceType' 
  | 'documentDate' 
  | 'createdAt'
  | 'reportingOrgName';

export type SortOrder = 'asc' | 'desc';

export interface LibrarySortOptions {
  field: LibrarySortField;
  order: SortOrder;
}

// Pagination
export interface LibraryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API response
export interface LibraryResponse {
  documents: UnifiedDocument[];
  pagination: LibraryPagination;
  filters: LibraryFilters;
}

// Request params
export interface LibraryRequestParams extends LibraryFilters {
  page?: number;
  limit?: number;
  sortBy?: LibrarySortField;
  sortOrder?: SortOrder;
}

// Standalone document creation (for super users)
export interface CreateLibraryDocumentInput {
  url: string;
  format: string;
  title: Array<{ text: string; lang: string }>;
  description?: Array<{ text: string; lang: string }>;
  categoryCode?: string;
  languageCodes?: string[];
  documentDate?: string;
  recipientCountries?: string[];
  fileName?: string;
  fileSize?: number;
  filePath?: string;
  isExternal: boolean;
  organizationId?: string;
}

// Update document input
export interface UpdateLibraryDocumentInput {
  title?: Array<{ text: string; lang: string }>;
  description?: Array<{ text: string; lang: string }>;
  categoryCode?: string;
  languageCodes?: string[];
  documentDate?: string;
  recipientCountries?: string[];
  organizationId?: string;
}

// Format groups for filtering
export const FORMAT_GROUPS = {
  pdf: ['application/pdf'],
  document: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/html',
  ],
  spreadsheet: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
  presentation: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  image: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    'image/bmp',
  ],
  video: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
  ],
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
  ],
  archive: [
    'application/zip',
    'application/x-rar-compressed',
    'application/gzip',
  ],
  data: [
    'application/json',
    'application/xml',
    'text/xml',
  ],
} as const;

export type FormatGroup = keyof typeof FORMAT_GROUPS;

// Helper to get format group from MIME type
export function getFormatGroup(mimeType: string): FormatGroup | 'other' {
  for (const [group, mimes] of Object.entries(FORMAT_GROUPS)) {
    if ((mimes as readonly string[]).includes(mimeType)) {
      return group as FormatGroup;
    }
  }
  return 'other';
}

// Helper to get human-readable format label
export function getFormatLabel(mimeType: string): string {
  const labels: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'application/vnd.oasis.opendocument.text': 'ODT',
    'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
    'application/vnd.oasis.opendocument.presentation': 'ODP',
    'application/rtf': 'RTF',
    'text/csv': 'CSV',
    'text/plain': 'TXT',
    'text/html': 'HTML',
    'text/markdown': 'MD',
    'application/json': 'JSON',
    'application/xml': 'XML',
    'text/xml': 'XML',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/svg+xml': 'SVG',
    'image/webp': 'WebP',
    'image/tiff': 'TIFF',
    'image/bmp': 'BMP',
    'video/mp4': 'MP4',
    'video/webm': 'WebM',
    'video/quicktime': 'MOV',
    'video/x-msvideo': 'AVI',
    'audio/mpeg': 'MP3',
    'audio/wav': 'WAV',
    'audio/ogg': 'OGG',
    'application/zip': 'ZIP',
    'application/x-rar-compressed': 'RAR',
    'application/gzip': 'GZ',
    'application/x-7z-compressed': '7Z',
    'application/octet-stream': 'File',
  };
  
  // Check for exact match first
  if (labels[mimeType]) {
    return labels[mimeType];
  }
  
  // Try case-insensitive match
  const lowerMime = mimeType.toLowerCase();
  for (const [key, value] of Object.entries(labels)) {
    if (key.toLowerCase() === lowerMime) {
      return value;
    }
  }
  
  // Extract a simple label from the MIME type
  const parts = mimeType.split('/');
  if (parts.length === 2) {
    const subtype = parts[1];
    // Handle vnd.* MIME types - extract the last meaningful part
    if (subtype.startsWith('vnd.')) {
      const vndParts = subtype.split('.');
      const lastPart = vndParts[vndParts.length - 1];
      // Common patterns
      if (lastPart === 'document') return 'DOC';
      if (lastPart === 'sheet') return 'XLS';
      if (lastPart === 'presentation') return 'PPT';
      if (lastPart === 'text') return 'TXT';
      return lastPart.toUpperCase().slice(0, 4);
    }
    // Handle x-* MIME types
    if (subtype.startsWith('x-')) {
      return subtype.slice(2).toUpperCase().slice(0, 4);
    }
    // Simple subtype
    return subtype.toUpperCase().slice(0, 4);
  }
  
  return 'File';
}

// Source type labels
export const SOURCE_TYPE_LABELS: Record<DocumentSourceType, string> = {
  activity: 'Activity',
  transaction: 'Transaction',
  organization: 'Organization',
  result: 'Result',
  indicator: 'Indicator',
  baseline: 'Baseline',
  period: 'Period',
  standalone: 'Library',
};

// Source type icons (lucide icon names)
export const SOURCE_TYPE_ICONS: Record<DocumentSourceType, string> = {
  activity: 'FileText',
  transaction: 'Receipt',
  organization: 'Building2',
  result: 'Target',
  indicator: 'BarChart3',
  baseline: 'GitBranch',
  period: 'Calendar',
  standalone: 'Library',
};
