/**
 * Single export filename convention:
 *
 *   <entity>-<scope>-<yyyy-MM-dd>.<ext>
 *
 *   activities-filtered-2026-04-25.csv
 *   activities-all-2026-04-25.xlsx
 *   activity-MM-1-2007-2026-04-25.xlsx
 *   organization-asian-development-bank-2026-04-25.xlsx
 *
 * Use buildExportFilename() everywhere. Don't hand-format dates.
 */

import { format } from 'date-fns';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json' | 'xml';

export interface ExportFilenameInput {
  /** Singular or plural entity name, lowercase. e.g. "activity", "activities", "transactions". */
  entity: string;
  /**
   * Optional sub-scope: "filtered", "all", an IATI identifier, an org slug.
   * Will be slugified (lowercase, alphanumeric + dash, max 60 chars).
   */
  scope?: string | null;
  /** File extension without the leading dot. */
  format: ExportFormat;
  /** Date to embed; defaults to today. */
  date?: Date;
}

const MAX_SCOPE_LEN = 60;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SCOPE_LEN);
}

export function buildExportFilename(input: ExportFilenameInput): string {
  const date = format(input.date ?? new Date(), 'yyyy-MM-dd');
  const parts = [slugify(input.entity)];
  if (input.scope) {
    const slug = slugify(input.scope);
    if (slug) parts.push(slug);
  }
  parts.push(date);
  return `${parts.filter(Boolean).join('-')}.${input.format}`;
}
