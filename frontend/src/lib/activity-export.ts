'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';
import { supabase } from '@/lib/supabase';
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
  // Sections added for "Export for Review"
  sdg_mappings: any[];
  working_groups: any[];
  conditions: any[];
  loan_terms: any | null;
  loan_statuses: any[];
  subnational_allocations: any[];
  recipient_countries_regions: any[];
  focal_points: any[];
  government_endorsement: any | null;
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
  // Per-section failures are logged so the developer console can show which
  // endpoints came back empty (the export itself stays silent for the user).
  const safeJson = async <T>(path: string, unwrap?: (json: any) => T, fallback?: T): Promise<T> => {
    try {
      const res = await apiFetch(endpointFor(path));
      if (!res.ok) {
        console.warn(`[activity-export] ${path} returned ${res.status} — section will be empty in export`);
        return (fallback as T);
      }
      const json = await res.json().catch(() => undefined);
      if (unwrap) return unwrap(json);
      return Array.isArray(json) ? (json as unknown as T) : ((fallback ?? ([] as unknown)) as T);
    } catch (e: any) {
      console.warn(`[activity-export] ${path} threw — section will be empty in export:`, e?.message ?? e);
      return (fallback as T);
    }
  };

  // Helper for tables fetched directly via the Supabase client (used for
  // sections that don't have a per-activity REST endpoint).
  const safeSupabaseList = async (table: string, selectExpr: string = '*'): Promise<any[]> => {
    try {
      const { data, error } = await supabase.from(table).select(selectExpr).eq('activity_id', activityId);
      if (error) {
        console.warn(`[activity-export] supabase ${table} error:`, error.message);
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (e: any) {
      console.warn(`[activity-export] supabase ${table} threw:`, e?.message ?? e);
      return [];
    }
  };
  const safeSupabaseSingle = async (table: string): Promise<any | null> => {
    try {
      const { data, error } = await supabase.from(table).select('*').eq('activity_id', activityId).maybeSingle();
      if (error) {
        console.warn(`[activity-export] supabase ${table} (single) error:`, error.message);
        return null;
      }
      return data ?? null;
    } catch (e: any) {
      console.warn(`[activity-export] supabase ${table} (single) threw:`, e?.message ?? e);
      return null;
    }
  };

  // Direct-from-supabase fallback for the activity row itself. Some auth /
  // edge-runtime / network conditions cause the REST `basic` endpoint to come
  // back blank; in that case we fall back to a raw activity SELECT so the
  // Overview sheet still populates.
  const fetchActivityRowDirect = async (): Promise<Record<string, any>> => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .maybeSingle();
      if (error) {
        console.warn('[activity-export] direct activity SELECT error:', error.message);
        return {};
      }
      return data ?? {};
    } catch (e: any) {
      console.warn('[activity-export] direct activity SELECT threw:', e?.message ?? e);
      return {};
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
    sdgMappings,
    workingGroups,
    conditions,
    loanTerms,
    loanStatuses,
    subnationalAllocations,
    recipientCountriesRegions,
    focalPoints,
    governmentEndorsement,
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
    safeSupabaseList('activity_sdg_mappings'),
    // Join the parent working_groups row so we get code/label/description for
    // the export, not just the FK on the join table.
    safeSupabaseList('activity_working_groups', '*, working_groups(id, code, label, description)'),
    safeSupabaseList('activity_conditions'),
    safeSupabaseSingle('activity_financing_terms'),
    safeSupabaseList('activity_loan_status'),
    safeJson<any[]>('subnational-breakdown', (j) => j?.allocations ?? j?.subnational_breakdown ?? (Array.isArray(j) ? j : []), []),
    safeJson<any[]>('countries-regions', (j) => j?.allocations ?? j?.countries_regions ?? (Array.isArray(j) ? j : []), []),
    // The focal-points endpoint returns
    //   { government_focal_points: [...], development_partner_focal_points: [...] }
    // — combine both and tag rows with their type so the export sheet stays flat.
    safeJson<any[]>('focal-points', (j) => {
      if (Array.isArray(j)) return j;
      const gov = (j?.government_focal_points ?? []).map((r: any) => ({ ...r, focal_point_type: 'government_focal_point' }));
      const dp = (j?.development_partner_focal_points ?? []).map((r: any) => ({ ...r, focal_point_type: 'development_partner_focal_point' }));
      return [...gov, ...dp];
    }, []),
    safeJson<any>('government-endorsement', (j) => j?.endorsement ?? j ?? null, null),
  ]);

  // If the REST `basic` endpoint came back empty (auth/edge issues, blank
  // shell, etc.), merge in a direct supabase SELECT of the activity row so
  // the Overview sheet still has the raw fields. The basic API's transformed
  // camelCase keys take precedence; the raw snake_case row fills the gaps.
  let basicMerged = basic ?? {};
  const basicLooksEmpty = !basic || Object.keys(basic).filter(k => basic[k] !== null && basic[k] !== undefined && basic[k] !== '').length < 3;
  if (basicLooksEmpty) {
    const direct = await fetchActivityRowDirect();
    basicMerged = { ...direct, ...basicMerged };
  }

  return {
    basic: basicMerged,
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
    sdg_mappings: Array.isArray(sdgMappings) ? sdgMappings : [],
    working_groups: Array.isArray(workingGroups) ? workingGroups : [],
    conditions: Array.isArray(conditions) ? conditions : [],
    loan_terms: loanTerms ?? null,
    loan_statuses: Array.isArray(loanStatuses) ? loanStatuses : [],
    subnational_allocations: Array.isArray(subnationalAllocations) ? subnationalAllocations : [],
    recipient_countries_regions: Array.isArray(recipientCountriesRegions) ? recipientCountriesRegions : [],
    focal_points: Array.isArray(focalPoints) ? focalPoints : [],
    government_endorsement: governmentEndorsement ?? null,
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
/**
 * Coerce any of the multilingual / structured-narrative shapes the AIMS schema
 * stores into a flat string suitable for an Excel cell. Handles:
 *   - plain string
 *   - `{ narrative: '...' }`              (IATI element)
 *   - `{ en: '...', fr: '...' }`          (language-keyed dict, e.g. conditions)
 *   - `[{ lang: 'en', text: '...' }]`     (IATI multi-language array)
 *   - `[{ narrative: '...' }]`
 */
function extractNarrativeText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    if (val.length === 0) return '';
    const parts = val
      .map(v => extractNarrativeText(v))
      .filter(Boolean);
    return parts.join('; ');
  }
  if (typeof val === 'object') {
    if (typeof val.narrative === 'string') return val.narrative;
    if (val.narrative && typeof val.narrative === 'object') return extractNarrativeText(val.narrative);
    if (typeof val.text === 'string') return val.text;
    if (typeof val.en === 'string') return val.en;
    // Language-keyed dict — return the first non-empty string value.
    for (const k of Object.keys(val)) {
      const v = (val as any)[k];
      if (typeof v === 'string' && v) return v;
      if (v && typeof v === 'object') {
        const nested = extractNarrativeText(v);
        if (nested) return nested;
      }
    }
  }
  return '';
}

export interface ActivityExportMeta {
  /** Display name of the person triggering the export. */
  exportedByName?: string;
  /** Email of the person triggering the export. */
  exportedByEmail?: string;
  /** Page URL the export was triggered from. */
  exportedFromUrl?: string;
}

export async function exportActivityToExcel(
  activityId: string,
  meta?: ActivityExportMeta
): Promise<void> {
  const loadingToast = toast.loading('Preparing Excel export...');

  try {
    const data = await fetchActivityExportData(activityId);
    const activity = data.basic ?? {};
    const wb = new XlsxWorkbookBuilder();
    const defaultCurrency = activity?.default_currency ?? 'USD';

    // ---- Overview ----
    // The basic endpoint returns a mix of snake_case and camelCase keys
    // (see app/api/activities/[id]/basic/route.ts). Use a small helper that
    // tries each candidate name in order so the export still resolves a value
    // regardless of which casing the API used.
    const a = activity ?? {};
    const pick = (...keys: string[]): any => {
      for (const k of keys) {
        const v = a[k];
        if (v !== undefined && v !== null && v !== '') return v;
      }
      return '';
    };

    const aidType = coded('aid_type', pick('default_aid_type', 'defaultAidType'));
    const flowType = coded('flow_type', pick('default_flow_type', 'defaultFlowType'));
    const financeType = coded('finance_type', pick('default_finance_type', 'defaultFinanceType'));
    const tiedStatus = coded('tied_status', pick('default_tied_status', 'defaultTiedStatus'));
    const status = coded('activity_status', pick('activity_status', 'activityStatus'));
    const collab = coded('collaboration_type', pick('collaboration_type', 'collaborationType'));
    const scope = coded('activity_scope', pick('activity_scope', 'activityScope'));
    const currency = coded('currency', defaultCurrency);

    // Format the IATI <other-identifier> list (separate from the legacy single
    // partner-id field in `other_identifier`).
    const otherIdentifiers = (a.other_identifiers ?? a.otherIdentifiers ?? []) as any[];
    const otherIdentifiersText = Array.isArray(otherIdentifiers) && otherIdentifiers.length > 0
      ? otherIdentifiers.map((o: any) => {
          const ref = o.ref ?? o.identifier ?? '';
          const type = o.type ?? o.identifier_type ?? '';
          const ownerOrg = o.owner_org_narrative ?? o.ownerOrgNarrative ?? o.owner_org_ref ?? '';
          return [ref, type ? `(type ${type})` : '', ownerOrg ? `[${ownerOrg}]` : ''].filter(Boolean).join(' ');
        }).join('; ')
      : '';

    // Three-column rows: [Field, Description (plain-IATI), Value].
    const overview: Array<[string, string, string | number]> = [
      ['Field', 'Description', 'Value'],

      // ── Identification ───────────────────────────────────────────────
      ['Activity Title', 'Free-text title of the activity (IATI <title>).', pick('title_narrative', 'title')],
      ['Acronym', 'Short common acronym for the activity, if any.', pick('acronym')],
      ['Activity Identifier', 'Globally unique IATI identifier for this activity (IATI <iati-identifier>). Format: XX-AAA-NNNN-Project.', pick('iati_identifier', 'iatiIdentifier', 'iatiId')],
      ['System Generated ID', 'Internal AIMS database identifier (UUID). Not part of IATI.', pick('id', 'uuid') || activityId],
      ['Auto-Reference', 'AIMS-internal short reference assigned at creation (e.g. PD-####). Not part of IATI.', pick('auto_ref', 'autoRef')],
      ['Other Identifier (Partner ID)', 'Single legacy partner-assigned identifier — kept for backward compatibility.', pick('other_identifier', 'otherIdentifier', 'partnerId')],
      ['Other Identifier Types', 'IATI <other-identifier> list — alternate identifiers from other systems, with type code and owning organisation.', otherIdentifiersText],

      // ── Description ──────────────────────────────────────────────────
      ['General Description', 'IATI <description type="1"> — main descriptive narrative.', pick('description_narrative', 'description')],
      ['Description: Objectives', 'IATI <description type="2"> — objectives or expected outcomes.', pick('description_objectives', 'descriptionObjectives')],
      ['Description: Target Groups', 'IATI <description type="3"> — beneficiary groups the activity targets.', pick('description_target_groups', 'descriptionTargetGroups')],
      ['Description: Other', 'IATI <description type="4"> — any other descriptive narrative.', pick('description_other', 'descriptionOther')],

      // ── Status & Lifecycle ───────────────────────────────────────────
      ['Activity Status (code)', 'IATI <activity-status> code — lifecycle stage.', status.code],
      ['Activity Status (name)', 'Plain-language label for the activity status.', status.name],
      ['Publication Status', 'AIMS-only — "draft" while in editor, "published" when made public.', pick('publication_status', 'publicationStatus')],
      ['Submission Status', 'AIMS-only — workflow state: draft / submitted / validated / rejected / published.', pick('submission_status', 'submissionStatus')],
      ['Hierarchy', 'IATI @hierarchy — 1 = parent, 2 = child, 3 = sub-child of a parent activity.', pick('hierarchy')],

      // ── Reporting Org ────────────────────────────────────────────────
      ['Reporting Org ID', 'AIMS UUID for the organisation reporting this activity (IATI <reporting-org>).', pick('reporting_org_id', 'reportingOrgId')],
      ['Reporting Org Ref', 'IATI @ref of the reporting organisation (e.g. GB-COH-1234567).', pick('reporting_org_ref', 'reportingOrgRef')],
      ['Created By Organisation', 'Organisation that initially created this activity record in AIMS.', pick('created_by_org_name')],
      ['Created By Organisation (acronym)', 'Acronym of the creating organisation.', pick('created_by_org_acronym')],

      // ── Default IATI fields ──────────────────────────────────────────
      ['Collaboration Type (code)', 'IATI <collaboration-type> — bilateral, multilateral, triangular, etc.', collab.code],
      ['Collaboration Type (name)', 'Plain-language label for the collaboration type.', collab.name],
      ['Activity Scope (code)', 'IATI <activity-scope> — geographic reach: global, regional, national, sub-national.', scope.code],
      ['Activity Scope (name)', 'Plain-language label for the activity scope.', scope.name],
      ['Default Currency (code)', 'IATI @default-currency — three-letter ISO 4217 code applied where transaction currency is unspecified.', currency.code],
      ['Default Currency (name)', 'Plain-language name of the default currency.', currency.name],
      ['Default Aid Type (code)', 'IATI <default-aid-type> code — modality (project-type, budget support, technical assistance, etc.).', aidType.code],
      ['Default Aid Type (name)', 'Plain-language label for the default aid type.', aidType.name],
      ['Default Flow Type (code)', 'IATI <default-flow-type> code — ODA, OOF, private flows, etc.', flowType.code],
      ['Default Flow Type (name)', 'Plain-language label for the default flow type.', flowType.name],
      ['Default Finance Type (code)', 'IATI <default-finance-type> code — standard grant, concessional loan, equity, etc.', financeType.code],
      ['Default Finance Type (name)', 'Plain-language label for the default finance type.', financeType.name],
      ['Default Tied Status (code)', 'IATI <default-tied-status> code — tied, partially tied, untied.', tiedStatus.code],
      ['Default Tied Status (name)', 'Plain-language label for the default tied status.', tiedStatus.name],
      ['Default Aid Modality', 'AIMS-only modality classification (not part of the IATI standard).', pick('default_aid_modality', 'defaultAidModality')],
      ['Default Aid Modality Override', 'AIMS-only — whether transactions may override the activity-level modality.', bool(pick('default_aid_modality_override') as any)],

      // ── Dates ────────────────────────────────────────────────────────
      ['Planned Start Date', 'IATI <activity-date type="1"> — originally planned start date.', dateIso(pick('planned_start_date', 'plannedStartDate'))],
      ['Planned End Date', 'IATI <activity-date type="3"> — originally planned end date.', dateIso(pick('planned_end_date', 'plannedEndDate'))],
      ['Actual Start Date', 'IATI <activity-date type="2"> — date the activity actually started.', dateIso(pick('actual_start_date', 'actualStartDate'))],
      ['Actual End Date', 'IATI <activity-date type="4"> — date the activity actually ended.', dateIso(pick('actual_end_date', 'actualEndDate'))],

      // ── Other attributes ─────────────────────────────────────────────
      ['Humanitarian', 'IATI @humanitarian flag — true if the activity addresses a humanitarian crisis.', bool(pick('humanitarian') as any)],
      ['Capital Spend %', 'IATI <capital-spend> — percentage of commitment that is capital expenditure.', percentage(pick('capital_spend_percentage') as any)],
      ['Budget Status', 'AIMS-only — whether the activity is "on-budget" in the recipient government\'s national budget.', pick('budget_status', 'budgetStatus')],
      ['On-Budget %', 'AIMS-only — percentage of value reflected in the recipient government\'s budget.', percentage(pick('on_budget_percentage', 'onBudgetPercentage') as any)],
      ['Linked Data URI', 'IATI @linked-data-uri — canonical URL for additional metadata about this activity.', pick('linked_data_uri', 'linkedDataUri')],
      ['Language', 'IATI @xml:lang — default language of narrative fields (ISO 639-1).', pick('language')],

      // ── System metadata ──────────────────────────────────────────────
      ['Created At', 'When the activity record was first created in AIMS.', dateIso(pick('created_at', 'createdAt'))],
      ['Updated At', 'When the activity record was last modified in AIMS.', dateIso(pick('updated_at', 'updatedAt'))],

      // ── Export metadata ──────────────────────────────────────────────
      ['', '', ''],
      ['Exported By (name)', 'Person who triggered this Excel export.', meta?.exportedByName ?? ''],
      ['Exported By (email)', 'Email of the person who triggered this export.', meta?.exportedByEmail ?? ''],
      ['Exported At', 'Timestamp the export was generated (ISO-8601 UTC).', new Date().toISOString()],
      ['Exported From URL', 'URL of the page the export was generated from.', meta?.exportedFromUrl ?? (typeof window !== 'undefined' ? window.location.href : '')],
      ['', '', ''],
      [getExportFooter(), '', ''],
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
        // AIMS internal UUID for the org (joins to other tables / activities).
        { header: 'organization_uuid', accessor: (o: any) => o.organization?.id ?? o.organization_id ?? '' },
        // IATI org identifier (e.g. XM-DAC-47066, GB-COH-1234567) — what IATI uses to identify the org globally.
        { header: 'organization_iati_id', accessor: (o: any) => o.organization?.iati_org_id ?? o.iati_org_ref ?? '' },
        {
          header: 'organization_type_code',
          accessor: (o: any) =>
            coded(
              'organization_type',
              o.organization?.Organisation_Type_Code ?? o.org_type ?? o.organization?.type ?? '',
            ).code,
        },
        {
          header: 'organization_type_name',
          accessor: (o: any) => {
            const code =
              o.organization?.Organisation_Type_Code ?? o.org_type ?? o.organization?.type ?? '';
            // Prefer the codelist-resolved label, but fall back to the joined
            // Organisation_Type_Name if the codelist doesn't recognise the code.
            return coded('organization_type', code).name || o.organization?.Organisation_Type_Name || '';
          },
        },
        { header: 'organization_country', accessor: (o: any) => o.organization?.country ?? '' },
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
      // The /planned-disbursements endpoint enriches each row with the joined
      // organisation's iati_org_id, acronym, type, country (see provider_org_iati_id etc.).
      wb.addSheet('PlannedDisbursements', [
        { header: 'planned_disbursement_id', accessor: (p: any) => p.id ?? '' },
        { header: 'period_start', accessor: (p: any) => dateIso(p.period_start) },
        { header: 'period_end', accessor: (p: any) => dateIso(p.period_end) },
        { header: 'value', accessor: (p: any) => p.value ?? p.amount ?? '' },
        { header: 'currency_code', accessor: (p: any) => coded('currency', p.currency).code },
        { header: 'currency_name', accessor: (p: any) => coded('currency', p.currency).name },
        { header: 'value_date', accessor: (p: any) => dateIso(p.value_date) },
        { header: 'usd_value', accessor: (p: any) => p.usd_amount ?? p.amount_usd ?? p.usd_value ?? '' },
        { header: 'provider_org_uuid', accessor: (p: any) => p.provider_org_id ?? '' },
        { header: 'provider_org_iati_id', accessor: (p: any) => p.provider_org_iati_id ?? p.provider_org_ref ?? '' },
        { header: 'provider_org_name', accessor: (p: any) => p.provider_org_name ?? '' },
        { header: 'provider_org_acronym', accessor: (p: any) => p.provider_org_acronym ?? '' },
        { header: 'provider_org_type_code', accessor: (p: any) => coded('organization_type', p.provider_org_type ?? '').code },
        { header: 'provider_org_type_name', accessor: (p: any) => coded('organization_type', p.provider_org_type ?? '').name },
        { header: 'receiver_org_uuid', accessor: (p: any) => p.receiver_org_id ?? '' },
        { header: 'receiver_org_iati_id', accessor: (p: any) => p.receiver_org_iati_id ?? p.receiver_org_ref ?? '' },
        { header: 'receiver_org_name', accessor: (p: any) => p.receiver_org_name ?? '' },
        { header: 'receiver_org_acronym', accessor: (p: any) => p.receiver_org_acronym ?? '' },
        { header: 'receiver_org_type_code', accessor: (p: any) => coded('organization_type', p.receiver_org_type ?? '').code },
        { header: 'receiver_org_type_name', accessor: (p: any) => coded('organization_type', p.receiver_org_type ?? '').name },
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
      // Result type codes follow the IATI codelist (1 = Output, 2 = Outcome,
      // 3 = Impact, 9 = Other). The AIMS schema also stores these as text
      // labels (`output`/`outcome`/`impact`/`other`), so handle both.
      const resultTypeName = (val: any): string => {
        const v = String(val ?? '').toLowerCase();
        if (v === '1' || v === 'output') return 'Output';
        if (v === '2' || v === 'outcome') return 'Outcome';
        if (v === '3' || v === 'impact') return 'Impact';
        if (v === '9' || v === 'other') return 'Other';
        return '';
      };
      const resultTypeCode = (val: any): string => {
        const v = String(val ?? '').toLowerCase();
        if (v === 'output') return '1';
        if (v === 'outcome') return '2';
        if (v === 'impact') return '3';
        if (v === 'other') return '9';
        return v;
      };
      wb.addSheet('Results', [
        { header: 'result_id', accessor: (r: any) => r.id ?? '' },
        { header: 'result_type_code', accessor: (r: any) => resultTypeCode(r.type ?? r.result_type) },
        { header: 'result_type_name', accessor: (r: any) => resultTypeName(r.type ?? r.result_type) },
        { header: 'aggregation_status', accessor: (r: any) => bool(r.aggregation_status) },
        { header: 'title', accessor: (r: any) => extractNarrativeText(r.title ?? r.title_narrative) },
        { header: 'description', accessor: (r: any) => extractNarrativeText(r.description ?? r.description_narrative) },
      ], data.results);

      const indicatorRows: any[] = [];
      for (const r of data.results) {
        for (const ind of r.indicators ?? []) {
          indicatorRows.push({ result_id: r.id, ...ind });
        }
      }
      if (indicatorRows.length > 0) {
        const measureName = (val: any): string => {
          const m = String(val ?? '').toLowerCase();
          if (m === '1' || m === 'unit') return 'Unit';
          if (m === '2' || m === 'percentage') return 'Percentage';
          if (m === '3' || m === 'nominal') return 'Nominal';
          if (m === '4' || m === 'ordinal') return 'Ordinal';
          if (m === '5' || m === 'qualitative') return 'Qualitative';
          return '';
        };
        const measureCode = (val: any): string => {
          const m = String(val ?? '').toLowerCase();
          if (m === 'unit') return '1';
          if (m === 'percentage') return '2';
          if (m === 'nominal') return '3';
          if (m === 'ordinal') return '4';
          if (m === 'qualitative') return '5';
          return m;
        };
        wb.addSheet('Indicators', [
          { header: 'result_id', accessor: 'result_id' as any },
          { header: 'indicator_id', accessor: (i: any) => i.id ?? '' },
          { header: 'measure_code', accessor: (i: any) => measureCode(i.measure ?? i.indicator_type) },
          { header: 'measure_name', accessor: (i: any) => measureName(i.measure ?? i.indicator_type) },
          { header: 'ascending', accessor: (i: any) => bool(i.ascending) },
          { header: 'aggregation_status', accessor: (i: any) => bool(i.aggregation_status) },
          { header: 'title', accessor: (i: any) => extractNarrativeText(i.title ?? i.title_narrative) },
          { header: 'description', accessor: (i: any) => extractNarrativeText(i.description) },
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
      // The /policy-markers endpoint exposes the joined codelist row at
      // `policy_marker_details` (uuid, code, iati_code, name, vocabulary).
      // Fall back to top-level fields for older shapes / direct supabase.
      const pmCode = (p: any) => p.policy_marker_details?.iati_code ?? p.policy_marker_details?.code ?? p.iati_code ?? p.code ?? '';
      const pmName = (p: any) => p.policy_marker_details?.name ?? p.name ?? coded('policy_marker', pmCode(p)).name ?? '';
      const pmVocab = (p: any) => p.policy_marker_details?.vocabulary ?? p.vocabulary ?? '1';
      wb.addSheet('PolicyMarkers', [
        { header: 'policy_marker_vocabulary_code', accessor: (p: any) => coded('policy_marker_vocabulary', pmVocab(p)).code },
        { header: 'policy_marker_vocabulary_name', accessor: (p: any) => coded('policy_marker_vocabulary', pmVocab(p)).name },
        { header: 'policy_marker_code', accessor: (p: any) => pmCode(p) },
        { header: 'policy_marker_name', accessor: (p: any) => pmName(p) },
        { header: 'significance_code', accessor: (p: any) => coded('policy_significance', p.significance).code || String(p.significance ?? '') },
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
      // The contacts endpoint joins to a `contacts` row (note the alias) that
      // holds first_name / last_name etc. Compose a full name from those
      // pieces, falling back through every observed shape.
      const composeName = (c: any): string => {
        const inner = c.contacts ?? c.contact ?? {};
        const first = c.first_name ?? inner.first_name ?? '';
        const middle = c.middle_name ?? inner.middle_name ?? '';
        const last = c.last_name ?? inner.last_name ?? '';
        const composed = [first, middle, last].filter(Boolean).join(' ').trim();
        return composed || c.name || c.full_name || inner.name || c.email || inner.email || '';
      };
      wb.addSheet('Contacts', [
        { header: 'contact_id', accessor: (c: any) => c.id ?? '' },
        { header: 'contact_type', accessor: (c: any) => c.type ?? '' },
        { header: 'contact_role', accessor: (c: any) => c.contact_role ?? '' },
        { header: 'name', accessor: composeName },
        {
          header: 'organisation',
          accessor: (c: any) =>
            c.organizations?.name ?? c.contacts?.organizations?.name ?? c.organisation_name ?? c.organization_name ?? c.contacts?.organisation ?? c.organisation ?? '',
        },
        { header: 'department', accessor: (c: any) => c.department ?? c.contacts?.department ?? '' },
        { header: 'job_title', accessor: (c: any) => c.job_title ?? c.contacts?.job_title ?? c.position ?? c.contacts?.position ?? '' },
        { header: 'telephone', accessor: (c: any) => c.telephone ?? c.phone ?? c.phone_number ?? c.contacts?.phone ?? c.contacts?.phone_number ?? '' },
        { header: 'email', accessor: (c: any) => c.email ?? c.contacts?.email ?? '' },
        { header: 'website', accessor: (c: any) => c.website ?? c.contacts?.website ?? '' },
        { header: 'mailing_address', accessor: (c: any) => c.mailing_address ?? c.contacts?.mailing_address ?? c.address ?? '' },
      ], data.contacts);
    }

    // ---- Related Activities ----
    // Filter out totally empty rows that come from the join table when nothing
    // else is populated (no related_activity_id, no IATI ref, no relationship).
    {
      const meaningful = (data.related_activities ?? []).filter((r: any) =>
        (r.related_activity_id ?? r.related_activity_uuid ?? '') ||
        (r.external_iati_identifier ?? r.iati_identifier ?? r.related_iati_identifier ?? '') ||
        (r.relationship_type ?? r.relationship_type_code ?? '')
      );
      if (meaningful.length > 0) {
        wb.addSheet('RelatedActivities', [
          { header: 'related_activity_id', accessor: (r: any) => r.related_activity_id ?? r.related_activity_uuid ?? '' },
          { header: 'iati_identifier', accessor: (r: any) => r.external_iati_identifier ?? r.iati_identifier ?? r.related_iati_identifier ?? '' },
          { header: 'relationship_type_code', accessor: (r: any) => String(r.relationship_type ?? r.relationship_type_code ?? '') },
          { header: 'relationship_type_name', accessor: (r: any) => {
            const t = String(r.relationship_type ?? r.relationship_type_code ?? '');
            const map: Record<string, string> = {
              '1': 'Parent', '2': 'Child', '3': 'Sibling', '4': 'Co-funded',
              '5': 'Third-party report',
            };
            return map[t] ?? '';
          } },
          { header: 'narrative', accessor: (r: any) => extractNarrativeText(r.narrative) },
        ], meaningful);
      }
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
      // Vocabulary code 98/99 fall outside the IATI codelist — surface a
      // sensible label so the reviewer doesn't see a blank cell.
      const vocabName = (h: any) => {
        const code = String(h.vocabulary ?? '');
        const fromCodelist = coded('humanitarian_scope_vocabulary', code).name;
        if (fromCodelist) return fromCodelist;
        if (code === '98') return 'Reporting Organisation';
        if (code === '99') return 'Reporting Organisation (custom)';
        return '';
      };
      wb.addSheet('HumanitarianScopes', [
        { header: 'type_code', accessor: (h: any) => coded('humanitarian_scope_type', h.humanitarian_scope_type ?? h.type).code },
        { header: 'type_name', accessor: (h: any) => {
          const code = h.humanitarian_scope_type ?? h.type;
          return coded('humanitarian_scope_type', code).name || (String(code) === '1' ? 'Emergency' : String(code) === '2' ? 'Appeal' : '');
        } },
        { header: 'vocabulary_code', accessor: (h: any) => String(h.vocabulary ?? '') },
        { header: 'vocabulary_name', accessor: vocabName },
        { header: 'scope_code', accessor: (h: any) => h.humanitarian_scope_code ?? h.code ?? '' },
        { header: 'narrative', accessor: (h: any) => extractNarrativeText(h.narrative) },
      ], data.humanitarian_scopes);
    }

    // ---- SDGs ----
    if (data.sdg_mappings.length > 0) {
      const SDG_GOAL_NAMES: Record<string, string> = {
        '1': 'No Poverty', '2': 'Zero Hunger', '3': 'Good Health and Well-being',
        '4': 'Quality Education', '5': 'Gender Equality', '6': 'Clean Water and Sanitation',
        '7': 'Affordable and Clean Energy', '8': 'Decent Work and Economic Growth',
        '9': 'Industry, Innovation and Infrastructure', '10': 'Reduced Inequalities',
        '11': 'Sustainable Cities and Communities', '12': 'Responsible Consumption and Production',
        '13': 'Climate Action', '14': 'Life Below Water', '15': 'Life on Land',
        '16': 'Peace, Justice and Strong Institutions', '17': 'Partnerships for the Goals',
      };
      const ALIGNMENT_NAMES: Record<string, string> = {
        primary: 'Primary', secondary: 'Secondary', indirect: 'Indirect',
      };
      wb.addSheet('SDGs', [
        { header: 'sdg_goal_code', accessor: (s: any) => String(s.sdg_goal ?? '') },
        { header: 'sdg_goal_name', accessor: (s: any) => SDG_GOAL_NAMES[String(s.sdg_goal ?? '')] ?? '' },
        { header: 'sdg_target_code', accessor: (s: any) => s.sdg_target ?? '' },
        { header: 'alignment_strength_code', accessor: (s: any) => s.alignment_strength ?? '' },
        { header: 'alignment_strength_name', accessor: (s: any) => ALIGNMENT_NAMES[String(s.alignment_strength ?? '').toLowerCase()] ?? '' },
        { header: 'notes', accessor: (s: any) => s.notes ?? '' },
      ], data.sdg_mappings);
    }

    // ---- Working Groups ----
    if (data.working_groups.length > 0) {
      wb.addSheet('WorkingGroups', [
        // Joined parent row lives at .working_groups (singular FK alias) per the supabase select
        { header: 'working_group_code', accessor: (w: any) => w.working_groups?.code ?? w.code ?? '' },
        { header: 'working_group_name', accessor: (w: any) => w.working_groups?.label ?? w.label ?? w.name ?? '' },
        { header: 'description', accessor: (w: any) => w.working_groups?.description ?? w.description ?? '' },
        { header: 'vocabulary', accessor: (w: any) => w.vocabulary ?? '' },
      ], data.working_groups);
    }

    // ---- Conditions ----
    if (data.conditions.length > 0) {
      const CONDITION_TYPE_NAMES: Record<string, string> = {
        '1': 'Policy', '2': 'Performance', '3': 'Fiduciary',
      };
      // Conditions narrative is `Record<string, string>` keyed by language code
      // (see types/conditions.ts: `narrative: Record<string, string>`).
      // Extract the English narrative if present, otherwise the first available language.
      const extractNarrative = (n: any): string => {
        if (!n) return '';
        if (typeof n === 'string') return n;
        if (typeof n === 'object') {
          if (n.en) return String(n.en);
          const firstKey = Object.keys(n)[0];
          return firstKey ? String(n[firstKey] ?? '') : '';
        }
        return String(n);
      };
      wb.addSheet('Conditions', [
        { header: 'condition_type_code', accessor: (c: any) => String(c.condition_type ?? c.type ?? '') },
        { header: 'condition_type_name', accessor: (c: any) => CONDITION_TYPE_NAMES[String(c.condition_type ?? c.type ?? '')] ?? '' },
        { header: 'narrative', accessor: (c: any) => extractNarrative(c.narrative) },
        { header: 'attached', accessor: (c: any) => bool(c.attached) },
      ], data.conditions);
    }

    // ---- Subnational Allocations ----
    // Many activities have an entry per administrative region with 0% so the
    // editor can show a complete list — we only export rows with a non-zero
    // allocation to keep the sheet useful for reviewers.
    {
      const allocated = (data.subnational_allocations ?? []).filter((a: any) => {
        const p = Number(a.percentage ?? a.allocation_percentage ?? 0);
        return Number.isFinite(p) && p > 0;
      });
      if (allocated.length > 0) {
        wb.addSheet('SubnationalAllocations', [
          { header: 'region_code', accessor: (a: any) => a.region_code ?? a.code ?? a.iso_code ?? a.region_id ?? '' },
          { header: 'region_name', accessor: (a: any) => a.region_name ?? a.name ?? a.label ?? a.region?.name ?? '' },
          { header: 'admin_level', accessor: (a: any) => a.admin_level ?? a.adm_level ?? '' },
          { header: 'percentage', accessor: (a: any) => percentage(a.percentage ?? a.allocation_percentage) },
        ], allocated);
      }
    }

    // ---- Recipient Countries / Regions ----
    if (data.recipient_countries_regions.length > 0) {
      wb.addSheet('RecipientCountriesRegions', [
        { header: 'kind', accessor: (r: any) => r.kind ?? r.type ?? r.entity_type ?? '' },
        { header: 'vocabulary_code', accessor: (r: any) => r.vocabulary ?? '' },
        { header: 'code', accessor: (r: any) => r.code ?? r.country_code ?? r.region_code ?? '' },
        { header: 'name', accessor: (r: any) => r.name ?? r.country_name ?? r.region_name ?? r.label ?? '' },
        { header: 'percentage', accessor: (r: any) => percentage(r.percentage) },
      ], data.recipient_countries_regions);
    }

    // ---- Focal Points ----
    if (data.focal_points.length > 0) {
      wb.addSheet('FocalPoints', [
        { header: 'focal_point_id', accessor: (f: any) => f.id ?? '' },
        {
          header: 'focal_point_type',
          accessor: (f: any) =>
            f.focal_point_type === 'government_focal_point' ? 'Government' :
            f.focal_point_type === 'development_partner_focal_point' ? 'Development Partner' :
            f.focal_point_type ?? f.type ?? '',
        },
        {
          header: 'name',
          accessor: (f: any) => {
            if (f.name) return f.name;
            const composed = [f.first_name, f.last_name].filter(Boolean).join(' ').trim();
            return composed || f.email || '';
          },
        },
        { header: 'role', accessor: (f: any) => f.role ?? f.job_title ?? f.position ?? '' },
        {
          header: 'organization_name',
          accessor: (f: any) => f.users?.organizations?.name ?? f.organization_name ?? f.organisation_name ?? f.organisation ?? '',
        },
        { header: 'email', accessor: (f: any) => f.email ?? '' },
        { header: 'status', accessor: (f: any) => f.status ?? f.focal_point_status ?? '' },
        { header: 'assigned_at', accessor: (f: any) => dateIso(f.assigned_at) },
      ], data.focal_points);
    }

    // ---- Government Endorsement / Readiness ----
    if (data.government_endorsement) {
      const g = data.government_endorsement;
      const rows: Array<[string, string | number]> = [
        ['Field', 'Value'],
        ['validating_authority', g.validating_authority ?? ''],
        ['effective_date', dateIso(g.effective_date)],
        ['agreement_number', g.agreement_number ?? ''],
        ['agreement_url', g.agreement_url ?? ''],
        ['notes', g.notes ?? ''],
        ['readiness_stage', g.readiness_stage ?? ''],
        ['endorsed_by', g.endorsed_by_name ?? g.endorsed_by ?? ''],
        ['endorsed_at', dateIso(g.endorsed_at)],
      ];
      wb.addRawSheet('GovernmentEndorsement', rows);
    }

    // ---- Loan Terms (single key/value sheet) ----
    if (data.loan_terms) {
      const lt = data.loan_terms;
      const REPAYMENT_TYPE_NAMES: Record<string, string> = {
        '1': 'Equal principal payments', '2': 'Annuity', '3': 'Lump sum', '5': 'Other',
      };
      const REPAYMENT_PLAN_NAMES: Record<string, string> = {
        '1': 'Annual', '2': 'Semi-annual', '4': 'Quarterly', '12': 'Monthly', '5': 'Other',
      };
      const rtCode = String(lt.repayment_type_code ?? '');
      const rpCode = String(lt.repayment_plan_code ?? '');
      const rows: Array<[string, string | number]> = [
        ['Field', 'Value'],
        ['rate_1', lt.rate_1 ?? ''],
        ['rate_2', lt.rate_2 ?? ''],
        ['repayment_type_code', rtCode],
        ['repayment_type_name', REPAYMENT_TYPE_NAMES[rtCode] ?? ''],
        ['repayment_plan_code', rpCode],
        ['repayment_plan_name', REPAYMENT_PLAN_NAMES[rpCode] ?? ''],
        ['commitment_date', dateIso(lt.commitment_date)],
        ['repayment_first_date', dateIso(lt.repayment_first_date)],
        ['repayment_final_date', dateIso(lt.repayment_final_date)],
        ['other_flags', Array.isArray(lt.other_flags) ? lt.other_flags.join('; ') : (lt.other_flags ?? '')],
      ];
      wb.addRawSheet('LoanTerms', rows);
    }

    // ---- Loan Status (year-by-year rows) ----
    if (data.loan_statuses.length > 0) {
      wb.addSheet('LoanStatus', [
        { header: 'year', accessor: (s: any) => s.year ?? '' },
        { header: 'currency_code', accessor: (s: any) => coded('currency', s.currency).code },
        { header: 'currency_name', accessor: (s: any) => coded('currency', s.currency).name },
        { header: 'value_date', accessor: (s: any) => dateIso(s.value_date) },
        { header: 'interest_received', accessor: (s: any) => s.interest_received ?? '' },
        { header: 'principal_outstanding', accessor: (s: any) => s.principal_outstanding ?? '' },
        { header: 'principal_arrears', accessor: (s: any) => s.principal_arrears ?? '' },
        { header: 'interest_arrears', accessor: (s: any) => s.interest_arrears ?? '' },
      ], data.loan_statuses);
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



