/**
 * Type definitions for Project References
 * Links activities to government, donor, and internal project codes
 * for budget reconciliation and aid-on-budget tracking
 */

/**
 * Reference type categories
 */
export type ReferenceType = 'government' | 'donor' | 'internal';

/**
 * Reference type display labels
 */
export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  government: 'Government Project',
  donor: 'Donor Reference',
  internal: 'Internal Reference',
};

/**
 * Reference type descriptions
 */
export const REFERENCE_TYPE_DESCRIPTIONS: Record<ReferenceType, string> = {
  government: 'National or ministry project codes used in government systems',
  donor: 'Development partner internal project identifiers',
  internal: 'System-generated or internal tracking references',
};

/**
 * Project Reference (domain model)
 */
export interface ProjectReference {
  id: string;
  activityId: string;
  referenceType: ReferenceType;
  code: string;
  name?: string;
  vocabulary?: string;
  vocabularyUri?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;

  // Joined data (optional)
  activity?: {
    id: string;
    iatiIdentifier?: string;
    title?: string;
  };
}

/**
 * Database row format (snake_case)
 */
export interface ProjectReferenceRow {
  id: string;
  activity_id: string;
  reference_type: ReferenceType;
  code: string;
  name?: string;
  vocabulary?: string;
  vocabulary_uri?: string;
  is_primary: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;

  // Joined data
  activities?: {
    id: string;
    iati_identifier?: string;
    title?: string;
  };
}

/**
 * Form data for creating/editing project references
 */
export interface ProjectReferenceFormData {
  activityId: string;
  referenceType: ReferenceType;
  code: string;
  name?: string;
  vocabulary?: string;
  vocabularyUri?: string;
  isPrimary?: boolean;
  notes?: string;
}

/**
 * API response for project references list
 */
export interface ProjectReferencesResponse {
  success: boolean;
  data: ProjectReference[];
  total: number;
  error?: string;
}

/**
 * Bulk import row format (CSV)
 */
export interface ProjectReferenceBulkImportRow {
  activity_iati_id: string;  // IATI identifier to match
  reference_type: ReferenceType;
  code: string;
  name?: string;
  vocabulary?: string;
  is_primary?: boolean;
}

/**
 * Bulk import result
 */
export interface ProjectReferenceBulkImportResult {
  success: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: {
    row: number;
    activityIatiId: string;
    error: string;
  }[];
}

/**
 * Convert database row to ProjectReference
 */
export function toProjectReference(row: ProjectReferenceRow): ProjectReference {
  return {
    id: row.id,
    activityId: row.activity_id,
    referenceType: row.reference_type,
    code: row.code,
    name: row.name,
    vocabulary: row.vocabulary,
    vocabularyUri: row.vocabulary_uri,
    isPrimary: row.is_primary,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    activity: row.activities
      ? {
          id: row.activities.id,
          iatiIdentifier: row.activities.iati_identifier,
          title: row.activities.title,
        }
      : undefined,
  };
}

/**
 * Convert ProjectReferenceFormData to database row format
 */
export function toProjectReferenceRow(
  data: ProjectReferenceFormData
): Partial<ProjectReferenceRow> {
  return {
    activity_id: data.activityId,
    reference_type: data.referenceType,
    code: data.code,
    name: data.name,
    vocabulary: data.vocabulary,
    vocabulary_uri: data.vocabularyUri,
    is_primary: data.isPrimary ?? false,
    notes: data.notes,
  };
}

/**
 * Grouped project references by activity (for admin display)
 */
export interface GroupedProjectReferences {
  activityId: string;
  activityIatiId?: string;
  activityTitle?: string;
  references: ProjectReference[];
}
