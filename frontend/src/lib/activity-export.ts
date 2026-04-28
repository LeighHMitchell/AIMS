'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';
import {
  XlsxWorkbookBuilder,
  buildExportFilename,
  coded,
  monetary,
  dateIso,
  bool,
  percentage,
} from '@/lib/exports';

interface ActivityExportData {
  basic: any;
  transactions: any[];
  budgets: any[];
  planned_disbursements: any[];
  locations: any[];
  sectors: any[];
  results: any[];
  organizations: any[];
  documents: any[];
  contacts: any[];
  related_activities: any[];
  country_budget_items: any[];
  humanitarian_scopes: any[];
  policy_markers: any[];
  tags: any[];
}

/**
 * Fetches all data needed for activity export.
 *
 * Best-effort: each endpoint is independent, so if one 404s the others still
 * succeed and the corresponding sheet is just omitted.
 */
async function fetchActivityExportData(activityId: string): Promise<ActivityExportData> {
  const baseUrl = window.location.origin;
  const endpointFor = (path: string) => `${baseUrl}/api/activities/${activityId}/${path}`;

  // Helper that always resolves — never rejects — so one failure doesn't kill
  // the whole export. unwrap() understands the shape variations our APIs use.
  const safeJson = async <T>(path: string, unwrap?: (json: any) => T, fallback?: T): Promise<T> => {
    try {
      const res = await apiFetch(endpointFor(path));
      if (!res.ok) return (fallback as T);
      const json = await res.json().catch(() => undefined);
      if (unwrap) return unwrap(json);
      return Array.isArray(json) ? (json as unknown as T) : ((fallback ?? ([] as unknown)) as T);
    } catch {
      return (fallback as T);
    }
  };

  const [
    basic,
    transactions,
    budgets,
    plannedDisbursements,
    locations,
    sectors,
    results,
    orgs,
    docs,
    contacts,
    relatedActivities,
    countryBudgetItems,
    humanitarianScopes,
    policyMarkers,
    tags,
  ] = await Promise.all([
    safeJson<any>('basic', (j) => j ?? {}, {}),
    safeJson<any[]>('transactions', undefined, []),
    safeJson<any[]>('budgets', undefined, []),
    safeJson<any[]>('planned-disbursements', (j) => Array.isArray(j) ? j : (j?.planned_disbursements ?? j?.data ?? []), []),
    safeJson<any[]>('locations', undefined, []),
    safeJson<any[]>('sectors', (j) => j?.sectors ?? (Array.isArray(j) ? j : []), []),
    safeJson<any[]>('results', (j) => j?.results ?? (Array.isArray(j) ? j : []), []),
    safeJson<any[]>('participating-organizations', (j) => j?.organizations ?? (Array.isArray(j) ? j : []), []),
    safeJson<any[]>('documents', (j) => j?.documents ?? (Array.isArray(j) ? j : []), []),
    safeJson<any[]>('contacts', (j) => j?.contacts ?? (Array.isArray(j) ? j : []), []),
    safeJson<any[]>('related-activities', (j) => j?.related_activities ?? (Array.isArray(j) ? j : []), []),
    safeJson<any[]>('country-budget-items', (j) => j?.items ?? (Array.isArray(j) ? j : []), []),
    safeJson<any[]>('humanitarian', (j) => j?.scopes ?? j?.humanitarian_scopes ?? (Array.isArray(j) ? j : []), []),
    safeJson<any[]>('policy-markers', (j) => j?.policy_markers ?? (Array.isArray(j) ? j : []), []),
    safeJson<any[]>('tags', (j) => j?.tags ?? (Array.isArray(j) ? j : []), []),
  ]);

  return {
    basic,
    transactions: Array.isArray(transactions) ? transactions : [],
    budgets: Array.isArray(budgets) ? budgets : [],
    planned_disbursements: Array.isArray(plannedDisbursements) ? plannedDisbursements : [],
    locations: Array.isArray(locations) ? locations : [],
    sectors: Array.isArray(sectors) ? sectors : [],
    results: Array.isArray(results) ? results : [],
    organizations: Array.isArray(orgs) ? orgs : [],
    documents: Array.isArray(docs) ? docs : [],
    contacts: Array.isArray(contacts) ? contacts : [],
    related_activities: Array.isArray(relatedActivities) ? relatedActivities : [],
    country_budget_items: Array.isArray(countryBudgetItems) ? countryBudgetItems : [],
    humanitarian_scopes: Array.isArray(humanitarianScopes) ? humanitarianScopes : [],
    policy_markers: Array.isArray(policyMarkers) ? policyMarkers : [],
    tags: Array.isArray(tags) ? tags : [],
  };
}

/**
 * Formats a date for display
 */
function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  try {
    return format(new Date(date), 'MMM d, yyyy');
  } catch {
    return String(date);
  }
}

/**
 * Formats a number with currency
 */
function formatCurrency(value: number | null | undefined, currency: string = 'USD'): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Gets export footer text
 */
function getExportFooter(): string {
  const now = new Date();
  const dateStr = format(now, 'MMM d, yyyy');
  const timeStr = format(now, 'h:mm a');
  return `Exported from the Aether DFMIS on ${dateStr} at ${timeStr}`;
}

/**
 * Exports activity data to PDF
 */
export async function exportActivityToPDF(activityId: string): Promise<void> {
  const loadingToast = toast.loading('Preparing PDF export...');
  
  try {
    const data = await fetchActivityExportData(activityId);
    const activity = data.basic;
    
    const doc = new jsPDF();
    let yPos = 20;
    
    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Activity Profile Export', 14, yPos);
    yPos += 10;
    
    // Overview Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Overview', 14, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const overviewData = [
      ['Title', activity?.title_narrative || '—'],
      ['IATI ID', activity?.iati_identifier || '—'],
      ['Status', activity?.activity_status || '—'],
      ['Planned Start', formatDate(activity?.planned_start_date)],
      ['Planned End', formatDate(activity?.planned_end_date)],
      ['Actual Start', formatDate(activity?.actual_start_date)],
      ['Actual End', formatDate(activity?.actual_end_date)],
      ['Currency', activity?.default_currency || '—'],
      ['Description', (activity?.description_narrative || '').substring(0, 200) + (activity?.description_narrative?.length > 200 ? '...' : '')]
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Value']],
      body: overviewData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240] }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Organizations Section
    if (data.organizations.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Organizations', 14, yPos);
      yPos += 8;
      
      const orgData = data.organizations.map(org => [
        org.organization?.name || org.narrative || '—',
        org.role_type || org.iati_role_code || '—',
        org.organization?.Organisation_Type_Name || org.org_type || '—',
        org.organization?.iati_org_id || org.iati_org_ref || '—'
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Name', 'Role', 'Type', 'IATI Ref']],
        body: orgData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [240, 240, 240] }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Transactions Section
    if (data.transactions.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Transactions', 14, yPos);
      yPos += 8;
      
      const transData = data.transactions.slice(0, 50).map(trans => [
        formatDate(trans.transaction_date),
        trans.transaction_type_name || trans.transaction_type || '—',
        formatCurrency(trans.value, trans.currency || activity?.default_currency),
        trans.provider_org_name || trans.provider_organization?.name || '—',
        trans.receiver_org_name || trans.receiver_organization?.name || '—',
        (trans.description || '').substring(0, 50)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Type', 'Value', 'Provider', 'Receiver', 'Description']],
        body: transData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [240, 240, 240] }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Budgets Section
    if (data.budgets.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Budgets', 14, yPos);
      yPos += 8;
      
      const budgetData = data.budgets.map(budget => [
        budget.type === 1 ? 'Original' : budget.type === 2 ? 'Revised' : '—',
        budget.status === 1 ? 'Indicative' : budget.status === 2 ? 'Committed' : '—',
        formatDate(budget.period_start),
        formatDate(budget.period_end),
        formatCurrency(budget.value, budget.currency)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Type', 'Status', 'Period Start', 'Period End', 'Value']],
        body: budgetData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [240, 240, 240] }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Locations Section
    if (data.locations.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Locations', 14, yPos);
      yPos += 8;
      
      const locData = data.locations.map(loc => [
        loc.location_name || '—',
        loc.location_type || '—',
        loc.latitude ? loc.latitude.toFixed(4) : '—',
        loc.longitude ? loc.longitude.toFixed(4) : '—',
        loc.exactness || '—'
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Name', 'Type', 'Latitude', 'Longitude', 'Exactness']],
        body: locData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [240, 240, 240] }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Sectors Section
    if (data.sectors.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Sectors', 14, yPos);
      yPos += 8;
      
      const sectorData = data.sectors.map(sector => [
        sector.vocabulary || '—',
        sector.code || '—',
        sector.name || '—',
        sector.percentage ? `${sector.percentage}%` : '—'
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Vocabulary', 'Code', 'Name', 'Percentage']],
        body: sectorData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [240, 240, 240] }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Results Section
    if (data.results.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Results', 14, yPos);
      yPos += 8;
      
      const resultsData: string[][] = [];
      data.results.forEach(result => {
        const indicators = result.indicators || [];
        if (indicators.length > 0) {
          indicators.forEach((ind: any) => {
            resultsData.push([
              result.type || '—',
              (result.title?.narrative || result.title || '—').substring(0, 30),
              (ind.title?.narrative || ind.title || '—').substring(0, 30),
              ind.baseline?.[0]?.value || '—',
              ind.periods?.[0]?.target?.value || '—',
              ind.periods?.[0]?.actual?.value || '—'
            ]);
          });
        } else {
          resultsData.push([
            result.type || '—',
            (result.title?.narrative || result.title || '—').substring(0, 30),
            '—',
            '—',
            '—',
            '—'
          ]);
        }
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [['Type', 'Title', 'Indicator', 'Baseline', 'Target', 'Actual']],
        body: resultsData.slice(0, 30),
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [240, 240, 240] }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Documents Section
    if (data.documents.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Documents', 14, yPos);
      yPos += 8;
      
      const docData = data.documents.map(doc => [
        doc.title || '—',
        doc.format || '—',
        doc.url ? 'Yes' : '—',
        doc.activity_document_categories?.[0]?.category_code || '—'
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Title', 'Format', 'URL', 'Category']],
        body: docData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [240, 240, 240] }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Add footer to each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(getExportFooter(), 14, doc.internal.pageSize.height - 10);
    }
    
    // Generate filename
    const identifier = activity?.iati_identifier || activityId.substring(0, 8);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `activity-${identifier}-${dateStr}.pdf`;
    
    doc.save(filename);
    
    toast.dismiss(loadingToast);
    toast.success('PDF exported successfully');
  } catch (error) {
    console.error('Error exporting activity to PDF:', error);
    toast.dismiss(loadingToast);
    toast.error('Failed to export PDF');
  }
}

/**
 * Exports activity data to Excel.
 *
 * Multi-sheet workbook with full IATI 2.03 coverage. Every coded field is
 * split into adjacent `<field>_code` and `<field>_name` columns. Sheets:
 *   Overview, ParticipatingOrgs, Transactions, Budgets, PlannedDisbursements,
 *   Sectors, Locations, Results, Indicators, Documents, PolicyMarkers,
 *   Tags, Contacts, RelatedActivities, CountryBudgetItems, HumanitarianScopes
 */
export async function exportActivityToExcel(activityId: string): Promise<void> {
  const loadingToast = toast.loading('Preparing Excel export...');

  try {
    const data = await fetchActivityExportData(activityId);
    const activity = data.basic ?? {};
    const wb = new XlsxWorkbookBuilder();
    const defaultCurrency = activity?.default_currency ?? 'USD';

    // ---- Overview ----
    const aidType = coded('aid_type', activity?.default_aid_type);
    const flowType = coded('flow_type', activity?.default_flow_type);
    const financeType = coded('finance_type', activity?.default_finance_type);
    const tiedStatus = coded('tied_status', activity?.default_tied_status);
    const status = coded('activity_status', activity?.activity_status);
    const collab = coded('collaboration_type', activity?.collaboration_type);
    const scope = coded('activity_scope', activity?.activity_scope);
    const currency = coded('currency', defaultCurrency);
    const overview: Array<[string, string | number]> = [
      ['Field', 'Value'],
      ['uuid', activity?.id ?? activityId],
      ['iati_identifier', activity?.iati_identifier ?? ''],
      ['other_identifier', activity?.other_identifier ?? ''],
      ['title', activity?.title_narrative ?? ''],
      ['acronym', activity?.acronym ?? ''],
      ['description_general', activity?.description_narrative ?? ''],
      ['description_objectives', activity?.description_objectives ?? ''],
      ['description_target_groups', activity?.description_target_groups ?? ''],
      ['description_other', activity?.description_other ?? ''],
      ['activity_status_code', status.code],
      ['activity_status_name', status.name],
      ['publication_status', activity?.publication_status ?? ''],
      ['submission_status', activity?.submission_status ?? ''],
      ['collaboration_type_code', collab.code],
      ['collaboration_type_name', collab.name],
      ['activity_scope_code', scope.code],
      ['activity_scope_name', scope.name],
      ['hierarchy', activity?.hierarchy ?? ''],
      ['default_currency_code', currency.code],
      ['default_currency_name', currency.name],
      ['default_aid_type_code', aidType.code],
      ['default_aid_type_name', aidType.name],
      ['default_flow_type_code', flowType.code],
      ['default_flow_type_name', flowType.name],
      ['default_finance_type_code', financeType.code],
      ['default_finance_type_name', financeType.name],
      ['default_tied_status_code', tiedStatus.code],
      ['default_tied_status_name', tiedStatus.name],
      ['default_aid_modality', activity?.default_aid_modality ?? ''],
      ['default_aid_modality_override', bool(activity?.default_aid_modality_override)],
      ['humanitarian', bool(activity?.humanitarian)],
      ['linked_data_uri', activity?.linked_data_uri ?? ''],
      ['language', activity?.language ?? ''],
      ['reporting_org_id', activity?.reporting_org_id ?? ''],
      ['reporting_org_ref', activity?.reporting_org_ref ?? ''],
      ['created_by_org_name', activity?.created_by_org_name ?? ''],
      ['created_by_org_acronym', activity?.created_by_org_acronym ?? ''],
      ['planned_start_date', dateIso(activity?.planned_start_date)],
      ['planned_end_date', dateIso(activity?.planned_end_date)],
      ['actual_start_date', dateIso(activity?.actual_start_date)],
      ['actual_end_date', dateIso(activity?.actual_end_date)],
      ['capital_spend_percentage', percentage(activity?.capital_spend_percentage)],
      ['budget_status', activity?.budget_status ?? ''],
      ['on_budget_percentage', percentage(activity?.on_budget_percentage)],
      ['created_at', dateIso(activity?.created_at)],
      ['updated_at', dateIso(activity?.updated_at)],
      ['', ''],
      [getExportFooter(), ''],
    ];
    wb.addRawSheet('Overview', overview);

    // ---- Participating Organisations ----
    if (data.organizations.length > 0) {
      wb.addSheet('ParticipatingOrgs', [
        { header: 'role_code', accessor: (o: any) => coded('org_role', o.role_type ?? '').code },
        { header: 'role_name', accessor: (o: any) => coded('org_role', o.role_type ?? '').name },
        { header: 'iati_role_code', accessor: (o: any) => o.iati_role_code ?? '' },
        { header: 'organization_name', accessor: (o: any) => o.organization?.name ?? o.narrative ?? '' },
        { header: 'organization_acronym', accessor: (o: any) => o.organization?.acronym ?? '' },
        { header: 'organization_id', accessor: (o: any) => o.organization?.id ?? o.organization_id ?? '' },
        { header: 'iati_org_ref', accessor: (o: any) => o.organization?.iati_org_id ?? o.iati_org_ref ?? '' },
        { header: 'org_type_code', accessor: (o: any) => coded('organization_type', o.org_type ?? o.organization?.type ?? '').code },
        { header: 'org_type_name', accessor: (o: any) => coded('organization_type', o.org_type ?? o.organization?.type ?? '').name },
        { header: 'narrative', accessor: (o: any) => o.narrative ?? '' },
        { header: 'secondary_reporter', accessor: (o: any) => bool(o.secondary_reporter) },
      ], data.organizations);
    }

    // ---- Transactions ----
    if (data.transactions.length > 0) {
      wb.addSheet('Transactions', [
        { header: 'transaction_id', accessor: (t: any) => t.id ?? t.uuid ?? '' },
        { header: 'transaction_reference', accessor: (t: any) => t.transaction_reference ?? '' },
        { header: 'transaction_date', accessor: (t: any) => dateIso(t.transaction_date) },
        { header: 'transaction_type_code', accessor: (t: any) => coded('transaction_type', t.transaction_type).code },
        { header: 'transaction_type_name', accessor: (t: any) => coded('transaction_type', t.transaction_type).name },
        { header: 'value', accessor: (t: any) => monetary(t.value, t.currency ?? defaultCurrency, t.value_usd ?? t.usd_value).value },
        { header: 'currency_code', accessor: (t: any) => monetary(t.value, t.currency ?? defaultCurrency).currencyCode },
        { header: 'currency_name', accessor: (t: any) => monetary(t.value, t.currency ?? defaultCurrency).currencyName },
        { header: 'value_date', accessor: (t: any) => dateIso(t.value_date) },
        { header: 'usd_value', accessor: (t: any) => t.value_usd ?? t.usd_value ?? '' },
        { header: 'usd_conversion_date', accessor: (t: any) => dateIso(t.usd_conversion_date) },
        { header: 'usd_exchange_rate', accessor: (t: any) => t.usd_exchange_rate ?? '' },
        { header: 'description', accessor: (t: any) => t.description ?? '' },
        { header: 'flow_type_code', accessor: (t: any) => coded('flow_type', t.flow_type).code },
        { header: 'flow_type_name', accessor: (t: any) => coded('flow_type', t.flow_type).name },
        { header: 'finance_type_code', accessor: (t: any) => coded('finance_type', t.finance_type).code },
        { header: 'finance_type_name', accessor: (t: any) => coded('finance_type', t.finance_type).name },
        { header: 'aid_type_code', accessor: (t: any) => coded('aid_type', t.aid_type).code },
        { header: 'aid_type_name', accessor: (t: any) => coded('aid_type', t.aid_type).name },
        { header: 'aid_type_vocabulary_code', accessor: (t: any) => coded('aid_type_vocabulary', t.aid_type_vocabulary).code },
        { header: 'aid_type_vocabulary_name', accessor: (t: any) => coded('aid_type_vocabulary', t.aid_type_vocabulary).name },
        { header: 'tied_status_code', accessor: (t: any) => coded('tied_status', t.tied_status).code },
        { header: 'tied_status_name', accessor: (t: any) => coded('tied_status', t.tied_status).name },
        { header: 'disbursement_channel_code', accessor: (t: any) => coded('disbursement_channel', t.disbursement_channel).code },
        { header: 'disbursement_channel_name', accessor: (t: any) => coded('disbursement_channel', t.disbursement_channel).name },
        { header: 'is_humanitarian', accessor: (t: any) => bool(t.is_humanitarian) },
        { header: 'provider_org_ref', accessor: (t: any) => t.provider_org_ref ?? t.provider_organization?.iati_org_id ?? '' },
        { header: 'provider_org_name', accessor: (t: any) => t.provider_org_name ?? t.provider_organization?.name ?? '' },
        { header: 'provider_org_type_code', accessor: (t: any) => coded('organization_type', t.provider_org_type ?? t.provider_organization?.type ?? '').code },
        { header: 'provider_org_type_name', accessor: (t: any) => coded('organization_type', t.provider_org_type ?? t.provider_organization?.type ?? '').name },
        { header: 'provider_activity_id', accessor: (t: any) => t.provider_org_activity_id ?? t.provider_activity_id ?? '' },
        { header: 'receiver_org_ref', accessor: (t: any) => t.receiver_org_ref ?? t.receiver_organization?.iati_org_id ?? '' },
        { header: 'receiver_org_name', accessor: (t: any) => t.receiver_org_name ?? t.receiver_organization?.name ?? '' },
        { header: 'receiver_org_type_code', accessor: (t: any) => coded('organization_type', t.receiver_org_type ?? t.receiver_organization?.type ?? '').code },
        { header: 'receiver_org_type_name', accessor: (t: any) => coded('organization_type', t.receiver_org_type ?? t.receiver_organization?.type ?? '').name },
        { header: 'receiver_activity_id', accessor: (t: any) => t.receiver_org_activity_id ?? t.receiver_activity_id ?? '' },
        { header: 'transaction_status', accessor: (t: any) => t.status ?? '' },
        { header: 'created_at', accessor: (t: any) => dateIso(t.created_at) },
      ], data.transactions);
    }

    // ---- Budgets ----
    if (data.budgets.length > 0) {
      wb.addSheet('Budgets', [
        { header: 'budget_id', accessor: (b: any) => b.id ?? '' },
        { header: 'budget_type_code', accessor: (b: any) => String(b.type ?? '') },
        { header: 'budget_type_name', accessor: (b: any) => b.type === 1 ? 'Original' : b.type === 2 ? 'Revised' : '' },
        { header: 'budget_status_code', accessor: (b: any) => String(b.status ?? '') },
        { header: 'budget_status_name', accessor: (b: any) => b.status === 1 ? 'Indicative' : b.status === 2 ? 'Committed' : '' },
        { header: 'period_start', accessor: (b: any) => dateIso(b.period_start) },
        { header: 'period_end', accessor: (b: any) => dateIso(b.period_end) },
        { header: 'value', accessor: (b: any) => b.value ?? '' },
        { header: 'currency_code', accessor: (b: any) => coded('currency', b.currency).code },
        { header: 'currency_name', accessor: (b: any) => coded('currency', b.currency).name },
        { header: 'value_date', accessor: (b: any) => dateIso(b.value_date) },
        { header: 'usd_value', accessor: (b: any) => b.usd_value ?? '' },
      ], data.budgets);
    }

    // ---- Planned Disbursements ----
    if (data.planned_disbursements.length > 0) {
      wb.addSheet('PlannedDisbursements', [
        { header: 'planned_disbursement_id', accessor: (p: any) => p.id ?? '' },
        { header: 'period_start', accessor: (p: any) => dateIso(p.period_start) },
        { header: 'period_end', accessor: (p: any) => dateIso(p.period_end) },
        { header: 'value', accessor: (p: any) => p.value ?? p.amount ?? '' },
        { header: 'currency_code', accessor: (p: any) => coded('currency', p.currency).code },
        { header: 'currency_name', accessor: (p: any) => coded('currency', p.currency).name },
        { header: 'value_date', accessor: (p: any) => dateIso(p.value_date) },
        { header: 'usd_value', accessor: (p: any) => p.usd_amount ?? p.amount_usd ?? '' },
        { header: 'provider_org_ref', accessor: (p: any) => p.provider_org_ref ?? '' },
        { header: 'provider_org_name', accessor: (p: any) => p.provider_org_name ?? '' },
        { header: 'receiver_org_ref', accessor: (p: any) => p.receiver_org_ref ?? '' },
        { header: 'receiver_org_name', accessor: (p: any) => p.receiver_org_name ?? '' },
      ], data.planned_disbursements);
    }

    // ---- Sectors ----
    if (data.sectors.length > 0) {
      wb.addSheet('Sectors', [
        { header: 'sector_vocabulary_code', accessor: (s: any) => coded('sector_vocabulary', s.vocabulary ?? '1').code },
        { header: 'sector_vocabulary_name', accessor: (s: any) => coded('sector_vocabulary', s.vocabulary ?? '1').name },
        { header: 'sector_code', accessor: (s: any) => s.code ?? s.sector_code ?? '' },
        { header: 'sector_name', accessor: (s: any) => s.name ?? s.sector_name ?? '' },
        { header: 'sector_category_code', accessor: (s: any) => s.category_code ?? '' },
        { header: 'sector_category_name', accessor: (s: any) => s.category_name ?? '' },
        { header: 'percentage', accessor: (s: any) => percentage(s.percentage) },
      ], data.sectors);
    }

    // ---- Locations ----
    if (data.locations.length > 0) {
      wb.addSheet('Locations', [
        { header: 'location_id', accessor: (l: any) => l.id ?? '' },
        { header: 'location_name', accessor: (l: any) => l.location_name ?? '' },
        { header: 'description', accessor: (l: any) => l.description ?? '' },
        { header: 'latitude', accessor: (l: any) => l.latitude ?? '' },
        { header: 'longitude', accessor: (l: any) => l.longitude ?? '' },
        { header: 'location_reach_code', accessor: (l: any) => coded('geographic_location_reach', l.location_reach).code },
        { header: 'location_reach_name', accessor: (l: any) => coded('geographic_location_reach', l.location_reach).name },
        { header: 'location_class_code', accessor: (l: any) => coded('geographic_location_class', l.location_class).code },
        { header: 'location_class_name', accessor: (l: any) => coded('geographic_location_class', l.location_class).name },
        { header: 'exactness_code', accessor: (l: any) => coded('geographic_exactness', l.exactness).code },
        { header: 'exactness_name', accessor: (l: any) => coded('geographic_exactness', l.exactness).name },
        { header: 'feature_designation', accessor: (l: any) => l.feature_designation ?? '' },
        { header: 'location_id_vocabulary_code', accessor: (l: any) => coded('geographic_vocabulary', l.location_id_vocabulary).code },
        { header: 'location_id_vocabulary_name', accessor: (l: any) => coded('geographic_vocabulary', l.location_id_vocabulary).name },
        { header: 'location_id_code', accessor: (l: any) => l.location_id_code ?? '' },
        { header: 'admin_unit', accessor: (l: any) => l.admin_unit ?? '' },
        { header: 'state_region_code', accessor: (l: any) => l.state_region_code ?? '' },
        { header: 'state_region_name', accessor: (l: any) => l.state_region_name ?? '' },
      ], data.locations);
    }

    // ---- Results + Indicators ----
    if (data.results.length > 0) {
      wb.addSheet('Results', [
        { header: 'result_id', accessor: (r: any) => r.id ?? '' },
        { header: 'result_type_code', accessor: (r: any) => coded('transaction_status', r.type ?? '').code || String(r.type ?? '') },
        { header: 'result_type_name', accessor: (r: any) => {
          const t = String(r.type ?? r.result_type ?? '');
          if (t === '1') return 'Output';
          if (t === '2') return 'Outcome';
          if (t === '3') return 'Impact';
          if (t === '9') return 'Other';
          return '';
        } },
        { header: 'aggregation_status', accessor: (r: any) => bool(r.aggregation_status) },
        { header: 'title', accessor: (r: any) => r.title?.narrative ?? r.title ?? r.title_narrative ?? '' },
        { header: 'description', accessor: (r: any) => r.description?.narrative ?? r.description ?? r.description_narrative ?? '' },
      ], data.results);

      const indicatorRows: any[] = [];
      for (const r of data.results) {
        for (const ind of r.indicators ?? []) {
          indicatorRows.push({ result_id: r.id, ...ind });
        }
      }
      if (indicatorRows.length > 0) {
        wb.addSheet('Indicators', [
          { header: 'result_id', accessor: 'result_id' as any },
          { header: 'indicator_id', accessor: (i: any) => i.id ?? '' },
          { header: 'measure_code', accessor: (i: any) => String(i.measure ?? i.indicator_type ?? '') },
          { header: 'measure_name', accessor: (i: any) => {
            const m = String(i.measure ?? i.indicator_type ?? '');
            if (m === '1') return 'Unit';
            if (m === '2') return 'Percentage';
            if (m === '3') return 'Nominal';
            if (m === '4') return 'Ordinal';
            if (m === '5') return 'Qualitative';
            return '';
          } },
          { header: 'ascending', accessor: (i: any) => bool(i.ascending) },
          { header: 'aggregation_status', accessor: (i: any) => bool(i.aggregation_status) },
          { header: 'title', accessor: (i: any) => i.title?.narrative ?? i.title ?? i.title_narrative ?? '' },
          { header: 'description', accessor: (i: any) => i.description?.narrative ?? i.description ?? '' },
          { header: 'baseline_year', accessor: (i: any) => i.baseline?.[0]?.year ?? '' },
          { header: 'baseline_value', accessor: (i: any) => i.baseline?.[0]?.value ?? '' },
          { header: 'target_value', accessor: (i: any) => i.periods?.[0]?.target?.value ?? '' },
          { header: 'actual_value', accessor: (i: any) => i.periods?.[0]?.actual?.value ?? '' },
          { header: 'period_start', accessor: (i: any) => dateIso(i.periods?.[0]?.period_start) },
          { header: 'period_end', accessor: (i: any) => dateIso(i.periods?.[0]?.period_end) },
        ], indicatorRows);
      }
    }

    // ---- Documents ----
    if (data.documents.length > 0) {
      wb.addSheet('Documents', [
        { header: 'document_id', accessor: (d: any) => d.id ?? '' },
        { header: 'url', accessor: (d: any) => d.url ?? '' },
        { header: 'format', accessor: (d: any) => d.format ?? '' },
        { header: 'title', accessor: (d: any) => Array.isArray(d.title) ? d.title.map((t: any) => t.text ?? t).join('; ') : (d.title ?? '') },
        { header: 'description', accessor: (d: any) => Array.isArray(d.description) ? d.description.map((t: any) => t.text ?? t).join('; ') : (d.description ?? '') },
        { header: 'category_code', accessor: (d: any) => coded('document_category', d.category_code ?? d.activity_document_categories?.[0]?.category_code).code },
        { header: 'category_name', accessor: (d: any) => coded('document_category', d.category_code ?? d.activity_document_categories?.[0]?.category_code).name },
        { header: 'language_codes', accessor: (d: any) => Array.isArray(d.language_codes) ? d.language_codes.join('; ') : (d.language_codes ?? '') },
        { header: 'document_date', accessor: (d: any) => dateIso(d.document_date) },
      ], data.documents);
    }

    // ---- Policy Markers ----
    if (data.policy_markers.length > 0) {
      wb.addSheet('PolicyMarkers', [
        { header: 'policy_marker_vocabulary_code', accessor: (p: any) => coded('policy_marker_vocabulary', p.vocabulary ?? '1').code },
        { header: 'policy_marker_vocabulary_name', accessor: (p: any) => coded('policy_marker_vocabulary', p.vocabulary ?? '1').name },
        { header: 'policy_marker_code', accessor: (p: any) => coded('policy_marker', p.iati_code ?? p.code).code },
        { header: 'policy_marker_name', accessor: (p: any) => coded('policy_marker', p.iati_code ?? p.code).name || (p.name ?? '') },
        { header: 'significance_code', accessor: (p: any) => coded('policy_significance', p.significance).code },
        { header: 'significance_name', accessor: (p: any) => coded('policy_significance', p.significance).name },
        { header: 'rationale', accessor: (p: any) => p.rationale ?? '' },
      ], data.policy_markers);
    }

    // ---- Tags ----
    if (data.tags.length > 0) {
      wb.addSheet('Tags', [
        { header: 'tag_vocabulary_code', accessor: (t: any) => coded('tag_vocabulary', t.vocabulary).code },
        { header: 'tag_vocabulary_name', accessor: (t: any) => coded('tag_vocabulary', t.vocabulary).name },
        { header: 'tag_code', accessor: (t: any) => t.code ?? '' },
        { header: 'tag_name', accessor: (t: any) => t.name ?? '' },
        { header: 'vocabulary_uri', accessor: (t: any) => t.vocabulary_uri ?? '' },
      ], data.tags);
    }

    // ---- Contacts ----
    if (data.contacts.length > 0) {
      wb.addSheet('Contacts', [
        { header: 'contact_id', accessor: (c: any) => c.id ?? '' },
        { header: 'contact_type', accessor: (c: any) => c.type ?? '' },
        { header: 'contact_role', accessor: (c: any) => c.contact_role ?? '' },
        { header: 'name', accessor: (c: any) => c.name ?? c.full_name ?? '' },
        { header: 'organisation', accessor: (c: any) => c.organisation_name ?? c.organization_name ?? '' },
        { header: 'department', accessor: (c: any) => c.department ?? '' },
        { header: 'job_title', accessor: (c: any) => c.job_title ?? c.position ?? '' },
        { header: 'telephone', accessor: (c: any) => c.telephone ?? c.phone ?? '' },
        { header: 'email', accessor: (c: any) => c.email ?? '' },
        { header: 'website', accessor: (c: any) => c.website ?? '' },
        { header: 'mailing_address', accessor: (c: any) => c.mailing_address ?? c.address ?? '' },
      ], data.contacts);
    }

    // ---- Related Activities ----
    if (data.related_activities.length > 0) {
      wb.addSheet('RelatedActivities', [
        { header: 'related_activity_id', accessor: (r: any) => r.related_activity_id ?? '' },
        { header: 'iati_identifier', accessor: (r: any) => r.external_iati_identifier ?? r.iati_identifier ?? '' },
        { header: 'relationship_type_code', accessor: (r: any) => String(r.relationship_type ?? '') },
        { header: 'relationship_type_name', accessor: (r: any) => {
          const t = String(r.relationship_type ?? '');
          const map: Record<string, string> = {
            '1': 'Parent', '2': 'Child', '3': 'Sibling', '4': 'Co-funded',
            '5': 'Third-party report',
          };
          return map[t] ?? '';
        } },
        { header: 'narrative', accessor: (r: any) => r.narrative ?? '' },
      ], data.related_activities);
    }

    // ---- Country Budget Items ----
    if (data.country_budget_items.length > 0) {
      wb.addSheet('CountryBudgetItems', [
        { header: 'vocabulary_code', accessor: (c: any) => c.vocabulary ?? '' },
        { header: 'code', accessor: (c: any) => c.code ?? '' },
        { header: 'description', accessor: (c: any) => c.description ?? '' },
        { header: 'percentage', accessor: (c: any) => percentage(c.percentage) },
      ], data.country_budget_items);
    }

    // ---- Humanitarian Scopes ----
    if (data.humanitarian_scopes.length > 0) {
      wb.addSheet('HumanitarianScopes', [
        { header: 'type_code', accessor: (h: any) => coded('humanitarian_scope_type', h.humanitarian_scope_type ?? h.type).code },
        { header: 'type_name', accessor: (h: any) => coded('humanitarian_scope_type', h.humanitarian_scope_type ?? h.type).name },
        { header: 'vocabulary_code', accessor: (h: any) => coded('humanitarian_scope_vocabulary', h.vocabulary).code },
        { header: 'vocabulary_name', accessor: (h: any) => coded('humanitarian_scope_vocabulary', h.vocabulary).name },
        { header: 'scope_code', accessor: (h: any) => h.humanitarian_scope_code ?? h.code ?? '' },
        { header: 'narrative', accessor: (h: any) => h.narrative ?? '' },
      ], data.humanitarian_scopes);
    }

    const identifier = activity?.iati_identifier || activityId.substring(0, 8);
    const filename = buildExportFilename({ entity: 'activity', scope: identifier, format: 'xlsx' });
    wb.download(filename);

    toast.dismiss(loadingToast);
    toast.success('Excel file exported successfully');
  } catch (error) {
    console.error('Error exporting activity to Excel:', error);
    toast.dismiss(loadingToast);
    toast.error('Failed to export Excel file');
  }
}



