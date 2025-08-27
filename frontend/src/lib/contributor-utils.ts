/**
 * Utility functions for handling ActivityContributor data consistency
 * 
 * This addresses the inconsistency between database format (snake_case) 
 * and frontend format (camelCase) for ActivityContributor properties.
 */

export interface DatabaseActivityContributor {
  id: string;
  activity_id: string;
  organization_id: string;
  organization_name: string;
  status: 'nominated' | 'accepted' | 'declined';
  role: string;
  nominated_by: string | null;
  nominated_by_name: string | null;
  nominated_at: string;
  responded_at: string | null;
  can_edit_own_data: boolean;
  can_view_other_drafts: boolean;
  created_at: string;
  updated_at: string;
}

export interface FrontendActivityContributor {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationAcronym?: string;
  status: 'nominated' | 'accepted' | 'declined' | 'requested';
  role: 'funder' | 'implementer' | 'coordinator' | 'contributor' | 'partner';
  displayOrder?: number;
  nominatedBy: string;
  nominatedByName: string;
  nominatedAt: string;
  respondedAt?: string;
  canEditOwnData: boolean;
  canViewOtherDrafts: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ActivityContributor = DatabaseActivityContributor | FrontendActivityContributor;

/**
 * Normalizes contributor data to ensure consistent property access
 */
export function normalizeContributor(contributor: any): FrontendActivityContributor {
  return {
    id: contributor.id,
    organizationId: contributor.organization_id || contributor.organizationId,
    organizationName: contributor.organization_name || contributor.organizationName,
    organizationAcronym: contributor.organization_acronym || contributor.organizationAcronym,
    status: contributor.status,
    role: contributor.role,
    displayOrder: contributor.display_order || contributor.displayOrder,
    nominatedBy: contributor.nominated_by || contributor.nominatedBy,
    nominatedByName: contributor.nominated_by_name || contributor.nominatedByName,
    nominatedAt: contributor.nominated_at || contributor.nominatedAt,
    respondedAt: contributor.responded_at || contributor.respondedAt,
    canEditOwnData: contributor.can_edit_own_data ?? contributor.canEditOwnData ?? true,
    canViewOtherDrafts: contributor.can_view_other_drafts ?? contributor.canViewOtherDrafts ?? false,
    createdAt: contributor.created_at || contributor.createdAt,
    updatedAt: contributor.updated_at || contributor.updatedAt,
  };
}

/**
 * Checks if an organization is already a contributor, handling both property formats
 */
export function isOrganizationContributor(contributors: ActivityContributor[], organizationId: string): boolean {
  return contributors.some(c => {
    const normalizedContributor = normalizeContributor(c);
    return normalizedContributor.organizationId === organizationId;
  });
}

/**
 * Gets the organization ID from a contributor, handling both property formats
 */
export function getContributorOrganizationId(contributor: ActivityContributor): string {
  return (contributor as any).organization_id || (contributor as any).organizationId;
}

/**
 * Gets the organization name from a contributor, handling both property formats
 */
export function getContributorOrganizationName(contributor: ActivityContributor): string {
  return (contributor as any).organization_name || (contributor as any).organizationName;
}
