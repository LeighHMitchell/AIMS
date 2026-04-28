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
} from '@/lib/exports';

interface OrganizationExportData {
  profile: any;
  activities: any[];
  transactions: any[];
  contacts: any[];
}

/**
 * Fetches all data needed for organization export
 */
async function fetchOrganizationExportData(orgId: string): Promise<OrganizationExportData> {
  const baseUrl = window.location.origin;
  
  try {
    const [
      profileRes,
      activitiesRes,
      transactionsRes,
      contactsRes
    ] = await Promise.all([
      apiFetch(`${baseUrl}/api/organizations/${orgId}`),
      apiFetch(`${baseUrl}/api/organizations/${orgId}/activities`),
      apiFetch(`${baseUrl}/api/organizations/${orgId}/transactions`),
      apiFetch(`${baseUrl}/api/organizations/${orgId}/contacts`)
    ]);

    const [profile, activities, transactions, contacts] = await Promise.all([
      profileRes.json().catch(() => ({})),
      activitiesRes.json().then(data => data.activities || []).catch(() => []),
      transactionsRes.json().catch(() => []),
      contactsRes.json().catch(() => [])
    ]);

    return {
      profile,
      activities: Array.isArray(activities) ? activities : [],
      transactions: Array.isArray(transactions) ? transactions : [],
      contacts: Array.isArray(contacts) ? contacts : []
    };
  } catch (error) {
    console.error('Error fetching organization export data:', error);
    throw error;
  }
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
 * Exports organization data to PDF
 */
export async function exportOrganizationToPDF(orgId: string): Promise<void> {
  const loadingToast = toast.loading('Preparing PDF export...');
  
  try {
    const data = await fetchOrganizationExportData(orgId);
    const org = data.profile;
    
    const doc = new jsPDF();
    let yPos = 20;
    
    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Organization Profile Export', 14, yPos);
    yPos += 10;
    
    // Profile Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Profile', 14, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const profileData = [
      ['Name', org?.name || '—'],
      ['Acronym', org?.acronym || '—'],
      ['Type', org?.Organisation_Type_Name || org?.type || '—'],
      ['Country', org?.country || '—'],
      ['IATI Ref', org?.iati_org_id || '—'],
      ['Website', org?.website || '—'],
      ['Email', org?.email || '—'],
      ['Phone', org?.phone || '—'],
      ['Description', (org?.description || '').substring(0, 200) + (org?.description?.length > 200 ? '...' : '')]
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Value']],
      body: profileData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240] }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Activities Section
    if (data.activities.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Activities', 14, yPos);
      yPos += 8;
      
      const activityData = data.activities.slice(0, 50).map(activity => [
        activity.title || activity.title_narrative || '—',
        activity.iati_identifier || activity.iati_id || '—',
        activity.activity_status || '—',
        activity.role || '—',
        formatDate(activity.planned_start_date || activity.start_date),
        formatDate(activity.planned_end_date || activity.end_date)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Title', 'IATI ID', 'Status', 'Role', 'Start Date', 'End Date']],
        body: activityData,
        theme: 'grid',
        styles: { fontSize: 8 },
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
        trans.activity_title || trans.activity?.title || '—',
        trans.transaction_type_name || trans.transaction_type || '—',
        formatCurrency(trans.value, trans.currency),
        trans.provider_org_name || trans.provider_organization?.name || '—',
        trans.receiver_org_name || trans.receiver_organization?.name || '—'
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Activity', 'Type', 'Value', 'Provider', 'Receiver']],
        body: transData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [240, 240, 240] }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Contacts Section
    if (data.contacts.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Contacts', 14, yPos);
      yPos += 8;
      
      const contactData = data.contacts.map(contact => [
        contact.name || '—',
        contact.role || contact.job_title || '—',
        contact.email || '—',
        contact.phone || '—'
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Name', 'Role', 'Email', 'Phone']],
        body: contactData,
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
    const nameSlug = (org?.name || orgId).replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 30);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `organization-${nameSlug}-${dateStr}.pdf`;
    
    doc.save(filename);
    
    toast.dismiss(loadingToast);
    toast.success('PDF exported successfully');
  } catch (error) {
    console.error('Error exporting organization to PDF:', error);
    toast.dismiss(loadingToast);
    toast.error('Failed to export PDF');
  }
}

/**
 * Exports organization data to Excel.
 * Multi-sheet workbook: Profile, Activities, Transactions, Contacts.
 * Every coded field is split into adjacent code+name columns; every monetary
 * value carries currency code + name + USD when available.
 */
export async function exportOrganizationToExcel(orgId: string): Promise<void> {
  const loadingToast = toast.loading('Preparing Excel export...');

  try {
    const data = await fetchOrganizationExportData(orgId);
    const org = data.profile ?? {};
    const wb = new XlsxWorkbookBuilder();

    // ---- Profile (Field/Value) ----
    const orgType = coded('organization_type', org?.organisation_type ?? org?.type);
    const country = coded('country', org?.country_code ?? org?.country);
    const currency = coded('currency', org?.default_currency ?? 'USD');
    const lang = coded('currency', undefined); // Language list not in registry; emit blank pair
    const profile: Array<[string, string | number]> = [
      ['Field', 'Value'],
      ['organization_id', org?.id ?? orgId],
      ['name', org?.name ?? ''],
      ['acronym', org?.acronym ?? ''],
      ['iati_org_ref', org?.iati_org_id ?? ''],
      ['organization_type_code', orgType.code],
      ['organization_type_name', orgType.name],
      ['country_code', country.code],
      ['country_name', country.name],
      ['default_currency_code', currency.code],
      ['default_currency_name', currency.name],
      ['default_language_code', lang.code],
      ['default_language_name', lang.name],
      ['website', org?.website ?? ''],
      ['email', org?.email ?? ''],
      ['phone', org?.phone ?? ''],
      ['description', org?.description ?? ''],
      ['total_budget_usd', org?.total_budget_usd ?? ''],
      ['total_expenditure_usd', org?.total_expenditure_usd ?? ''],
      ['registration_agency', org?.registration_agency ?? ''],
      ['logo_url', org?.logo ?? ''],
      ['created_at', dateIso(org?.created_at)],
      ['updated_at', dateIso(org?.updated_at)],
      ['', ''],
      [getExportFooter(), ''],
    ];
    wb.addRawSheet('Profile', profile);

    // ---- Activities ----
    if (data.activities.length > 0) {
      wb.addSheet('Activities', [
        { header: 'activity_uuid', accessor: (a: any) => a.id ?? '' },
        { header: 'iati_identifier', accessor: (a: any) => a.iati_identifier ?? a.iati_id ?? '' },
        { header: 'other_identifier', accessor: (a: any) => a.other_identifier ?? '' },
        { header: 'title', accessor: (a: any) => a.title ?? a.title_narrative ?? '' },
        { header: 'acronym', accessor: (a: any) => a.acronym ?? '' },
        { header: 'activity_status_code', accessor: (a: any) => coded('activity_status', a.activity_status).code },
        { header: 'activity_status_name', accessor: (a: any) => coded('activity_status', a.activity_status).name },
        { header: 'role_code', accessor: (a: any) => coded('org_role', a.role).code },
        { header: 'role_name', accessor: (a: any) => coded('org_role', a.role).name || a.role || '' },
        { header: 'planned_start_date', accessor: (a: any) => dateIso(a.planned_start_date ?? a.start_date) },
        { header: 'planned_end_date', accessor: (a: any) => dateIso(a.planned_end_date ?? a.end_date) },
        { header: 'actual_start_date', accessor: (a: any) => dateIso(a.actual_start_date) },
        { header: 'actual_end_date', accessor: (a: any) => dateIso(a.actual_end_date) },
      ], data.activities);
    }

    // ---- Transactions ----
    if (data.transactions.length > 0) {
      wb.addSheet('Transactions', [
        { header: 'transaction_id', accessor: (t: any) => t.uuid ?? t.id ?? '' },
        { header: 'activity_uuid', accessor: (t: any) => t.activity_id ?? '' },
        { header: 'activity_title', accessor: (t: any) => t.activity_title ?? t.activity?.title ?? '' },
        { header: 'activity_iati_id', accessor: (t: any) => t.activity_iati_id ?? t.activity?.iati_identifier ?? '' },
        { header: 'transaction_date', accessor: (t: any) => dateIso(t.transaction_date) },
        { header: 'transaction_type_code', accessor: (t: any) => coded('transaction_type', t.transaction_type).code },
        { header: 'transaction_type_name', accessor: (t: any) => coded('transaction_type', t.transaction_type).name },
        { header: 'value', accessor: (t: any) => monetary(t.value, t.currency).value },
        { header: 'currency_code', accessor: (t: any) => monetary(t.value, t.currency).currencyCode },
        { header: 'currency_name', accessor: (t: any) => monetary(t.value, t.currency).currencyName },
        { header: 'usd_value', accessor: (t: any) => t.value_usd ?? t.usd_value ?? '' },
        { header: 'flow_type_code', accessor: (t: any) => coded('flow_type', t.flow_type).code },
        { header: 'flow_type_name', accessor: (t: any) => coded('flow_type', t.flow_type).name },
        { header: 'finance_type_code', accessor: (t: any) => coded('finance_type', t.finance_type).code },
        { header: 'finance_type_name', accessor: (t: any) => coded('finance_type', t.finance_type).name },
        { header: 'aid_type_code', accessor: (t: any) => coded('aid_type', t.aid_type).code },
        { header: 'aid_type_name', accessor: (t: any) => coded('aid_type', t.aid_type).name },
        { header: 'tied_status_code', accessor: (t: any) => coded('tied_status', t.tied_status).code },
        { header: 'tied_status_name', accessor: (t: any) => coded('tied_status', t.tied_status).name },
        { header: 'role', accessor: (t: any) => t.provider_org_id === orgId ? 'provider' : t.receiver_org_id === orgId ? 'receiver' : '' },
        { header: 'counterparty_name', accessor: (t: any) =>
            t.provider_org_id === orgId
              ? (t.receiver_org_name ?? t.receiver_organization?.name ?? '')
              : (t.provider_org_name ?? t.provider_organization?.name ?? '') },
        { header: 'counterparty_ref', accessor: (t: any) =>
            t.provider_org_id === orgId
              ? (t.receiver_org_ref ?? '')
              : (t.provider_org_ref ?? '') },
        { header: 'description', accessor: (t: any) => t.description ?? '' },
      ], data.transactions);
    }

    // ---- Contacts ----
    if (data.contacts.length > 0) {
      wb.addSheet('Contacts', [
        { header: 'contact_id', accessor: (c: any) => c.id ?? '' },
        { header: 'name', accessor: (c: any) => c.name ?? c.full_name ?? '' },
        { header: 'role_or_job_title', accessor: (c: any) => c.role ?? c.job_title ?? '' },
        { header: 'department', accessor: (c: any) => c.department ?? '' },
        { header: 'email', accessor: (c: any) => c.email ?? '' },
        { header: 'phone', accessor: (c: any) => c.phone ?? c.telephone ?? '' },
      ], data.contacts);
    }

    const filename = buildExportFilename({
      entity: 'organization',
      scope: org?.acronym ?? org?.name ?? orgId,
      format: 'xlsx',
    });
    wb.download(filename);

    toast.dismiss(loadingToast);
    toast.success('Excel file exported successfully');
  } catch (error) {
    console.error('Error exporting organization to Excel:', error);
    toast.dismiss(loadingToast);
    toast.error('Failed to export Excel file');
  }
}



