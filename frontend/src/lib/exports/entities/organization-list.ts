/**
 * Organization-list exports — flat CSV (one row per org) for the
 * /organizations page. Every coded field is split into code+name pairs.
 */

import {
  buildCsv,
  downloadCsv,
  buildExportFilename,
  coded,
  dateIso,
  type CsvColumn,
} from '@/lib/exports';

export type OrganizationListRow = Record<string, unknown> & {
  id?: string;
  name?: string;
  acronym?: string;
  Organisation_Type_Code?: string;
  Organisation_Type_Name?: string;
  type?: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  country_represented?: string;
  cooperation_modality?: string;
  residency_status?: string;
  iati_org_id?: string;
  registration_agency?: string;
  alias_refs?: string[];
  name_aliases?: string[];
  derived_category?: string;
  // Computed
  activeProjects?: number;
  reportedActivities?: number;
  associatedActivities?: number;
  providerTransactionCount?: number;
  receiverTransactionCount?: number;
  totalTransactionCount?: number;
  totalBudgeted?: number;
  totalDisbursed?: number;
  totalDisbursement?: number;
  lastProjectActivity?: string;
  projectsByStatus?: { active?: number; pipeline?: number; completed?: number; cancelled?: number };
  created_at?: string;
  updated_at?: string;
};

export function buildOrganizationListColumns(): ReadonlyArray<CsvColumn<OrganizationListRow>> {
  const cols: CsvColumn<OrganizationListRow>[] = [
    { header: 'organization_id', accessor: (o) => o.id ?? '' },
    { header: 'name', accessor: (o) => o.name ?? '' },
    { header: 'acronym', accessor: (o) => o.acronym ?? '' },
    { header: 'iati_org_ref', accessor: (o) => o.iati_org_id ?? '' },
    { header: 'organization_type_code', accessor: (o) => coded('organization_type', o.Organisation_Type_Code ?? o.type).code },
    { header: 'organization_type_name', accessor: (o) => coded('organization_type', o.Organisation_Type_Code ?? o.type).name || (o.Organisation_Type_Name ?? '') },
    { header: 'country_code', accessor: (o) => coded('country', o.country).code },
    { header: 'country_name', accessor: (o) => coded('country', o.country).name || (o.country ?? '') },
    { header: 'country_represented', accessor: (o) => o.country_represented ?? '' },
    { header: 'cooperation_modality', accessor: (o) => o.cooperation_modality ?? '' },
    { header: 'residency_status', accessor: (o) => o.residency_status ?? '' },
    { header: 'derived_category', accessor: (o) => o.derived_category ?? '' },
    { header: 'registration_agency', accessor: (o) => o.registration_agency ?? '' },
    { header: 'website', accessor: (o) => o.website ?? '' },
    { header: 'email', accessor: (o) => o.email ?? '' },
    { header: 'phone', accessor: (o) => o.phone ?? '' },
    { header: 'address', accessor: (o) => o.address ?? '' },
    { header: 'description', accessor: (o) => o.description ?? '' },
    { header: 'alias_refs', accessor: (o) => (o.alias_refs ?? []).join('; ') },
    { header: 'name_aliases', accessor: (o) => (o.name_aliases ?? []).join('; ') },

    // Computed/aggregate columns
    { header: 'active_projects', accessor: (o) => o.activeProjects ?? 0 },
    { header: 'reported_activities', accessor: (o) => o.reportedActivities ?? 0 },
    { header: 'associated_activities', accessor: (o) => o.associatedActivities ?? 0 },
    { header: 'provider_transactions', accessor: (o) => o.providerTransactionCount ?? 0 },
    { header: 'receiver_transactions', accessor: (o) => o.receiverTransactionCount ?? 0 },
    { header: 'total_transactions', accessor: (o) => o.totalTransactionCount ?? 0 },
    { header: 'projects_status_active', accessor: (o) => o.projectsByStatus?.active ?? 0 },
    { header: 'projects_status_pipeline', accessor: (o) => o.projectsByStatus?.pipeline ?? 0 },
    { header: 'projects_status_completed', accessor: (o) => o.projectsByStatus?.completed ?? 0 },
    { header: 'projects_status_cancelled', accessor: (o) => o.projectsByStatus?.cancelled ?? 0 },
    { header: 'total_budgeted_usd', accessor: (o) => o.totalBudgeted ?? 0 },
    { header: 'total_disbursed_usd', accessor: (o) => o.totalDisbursed ?? o.totalDisbursement ?? 0 },
    { header: 'last_project_activity', accessor: (o) => dateIso(o.lastProjectActivity) },

    { header: 'created_at', accessor: (o) => dateIso(o.created_at) },
    { header: 'updated_at', accessor: (o) => dateIso(o.updated_at) },
  ];
  return cols;
}

export interface ExportOrganizationsOptions {
  scope?: 'filtered' | 'all' | string;
}

export function exportOrganizationsCsv(
  rows: ReadonlyArray<OrganizationListRow>,
  options: ExportOrganizationsOptions = {}
): void {
  const csv = buildCsv(rows as OrganizationListRow[], buildOrganizationListColumns());
  const filename = buildExportFilename({
    entity: 'organizations',
    scope: options.scope ?? 'export',
    format: 'csv',
  });
  downloadCsv(csv, filename);
}
