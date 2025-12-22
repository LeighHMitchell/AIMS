'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ActivityExportData {
  basic: any;
  transactions: any[];
  budgets: any[];
  locations: any[];
  sectors: any[];
  results: any[];
  organizations: any[];
  documents: any[];
}

/**
 * Fetches all data needed for activity export
 */
async function fetchActivityExportData(activityId: string): Promise<ActivityExportData> {
  const baseUrl = window.location.origin;
  
  try {
    const [
      basicRes,
      transactionsRes,
      budgetsRes,
      locationsRes,
      sectorsRes,
      resultsRes,
      orgsRes,
      docsRes
    ] = await Promise.all([
      fetch(`${baseUrl}/api/activities/${activityId}/basic`),
      fetch(`${baseUrl}/api/activities/${activityId}/transactions`),
      fetch(`${baseUrl}/api/activities/${activityId}/budgets`),
      fetch(`${baseUrl}/api/activities/${activityId}/locations`),
      fetch(`${baseUrl}/api/activities/${activityId}/sectors`),
      fetch(`${baseUrl}/api/activities/${activityId}/results`),
      fetch(`${baseUrl}/api/activities/${activityId}/participating-organizations`),
      fetch(`${baseUrl}/api/activities/${activityId}/documents`)
    ]);

    const [basic, transactions, budgets, locations, sectors, results, orgs, docs] = await Promise.all([
      basicRes.json().catch(() => ({})),
      transactionsRes.json().catch(() => []),
      budgetsRes.json().catch(() => []),
      locationsRes.json().catch(() => []),
      sectorsRes.json().then(data => data.sectors || []).catch(() => []),
      resultsRes.json().then(data => data.results || []).catch(() => []),
      orgsRes.json().then(data => data.organizations || []).catch(() => []),
      docsRes.json().then(data => data.documents || []).catch(() => [])
    ]);

    return {
      basic,
      transactions: Array.isArray(transactions) ? transactions : [],
      budgets: Array.isArray(budgets) ? budgets : [],
      locations: Array.isArray(locations) ? locations : [],
      sectors: Array.isArray(sectors) ? sectors : [],
      results: Array.isArray(results) ? results : [],
      organizations: Array.isArray(orgs) ? orgs : [],
      documents: Array.isArray(docs) ? docs : []
    };
  } catch (error) {
    console.error('Error fetching activity export data:', error);
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
 * Exports activity data to Excel
 */
export async function exportActivityToExcel(activityId: string): Promise<void> {
  const loadingToast = toast.loading('Preparing Excel export...');
  
  try {
    const data = await fetchActivityExportData(activityId);
    const activity = data.basic;
    const workbook = XLSX.utils.book_new();
    
    // Overview Sheet
    const overviewData = [
      ['Field', 'Value'],
      ['Title', activity?.title_narrative || ''],
      ['IATI ID', activity?.iati_identifier || ''],
      ['Status', activity?.activity_status || ''],
      ['Planned Start Date', activity?.planned_start_date ? formatDate(activity.planned_start_date) : ''],
      ['Planned End Date', activity?.planned_end_date ? formatDate(activity.planned_end_date) : ''],
      ['Actual Start Date', activity?.actual_start_date ? formatDate(activity.actual_start_date) : ''],
      ['Actual End Date', activity?.actual_end_date ? formatDate(activity.actual_end_date) : ''],
      ['Default Currency', activity?.default_currency || ''],
      ['Description', activity?.description_narrative || ''],
      ['Scope', activity?.activity_scope || ''],
      ['', ''],
      [getExportFooter(), '']
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');
    
    // Organizations Sheet
    if (data.organizations.length > 0) {
      const orgData = [
        ['Name', 'Role', 'Type', 'IATI Ref'],
        ...data.organizations.map(org => [
          org.organization?.name || org.narrative || '',
          org.role_type || org.iati_role_code || '',
          org.organization?.Organisation_Type_Name || org.org_type || '',
          org.organization?.iati_org_id || org.iati_org_ref || ''
        ])
      ];
      const orgSheet = XLSX.utils.aoa_to_sheet(orgData);
      XLSX.utils.book_append_sheet(workbook, orgSheet, 'Organisations');
    }
    
    // Transactions Sheet
    if (data.transactions.length > 0) {
      const transData = [
        ['Date', 'Type', 'Value', 'Currency', 'Provider', 'Receiver', 'Description'],
        ...data.transactions.map(trans => [
          trans.transaction_date ? formatDate(trans.transaction_date) : '',
          trans.transaction_type_name || trans.transaction_type || '',
          trans.value || '',
          trans.currency || activity?.default_currency || '',
          trans.provider_org_name || trans.provider_organization?.name || '',
          trans.receiver_org_name || trans.receiver_organization?.name || '',
          trans.description || ''
        ])
      ];
      const transSheet = XLSX.utils.aoa_to_sheet(transData);
      XLSX.utils.book_append_sheet(workbook, transSheet, 'Transactions');
    }
    
    // Budgets Sheet
    if (data.budgets.length > 0) {
      const budgetData = [
        ['Type', 'Status', 'Period Start', 'Period End', 'Value', 'Currency'],
        ...data.budgets.map(budget => [
          budget.type === 1 ? 'Original' : budget.type === 2 ? 'Revised' : '',
          budget.status === 1 ? 'Indicative' : budget.status === 2 ? 'Committed' : '',
          budget.period_start ? formatDate(budget.period_start) : '',
          budget.period_end ? formatDate(budget.period_end) : '',
          budget.value || '',
          budget.currency || ''
        ])
      ];
      const budgetSheet = XLSX.utils.aoa_to_sheet(budgetData);
      XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Budgets');
    }
    
    // Locations Sheet
    if (data.locations.length > 0) {
      const locData = [
        ['Name', 'Type', 'Latitude', 'Longitude', 'Exactness'],
        ...data.locations.map(loc => [
          loc.location_name || '',
          loc.location_type || '',
          loc.latitude || '',
          loc.longitude || '',
          loc.exactness || ''
        ])
      ];
      const locSheet = XLSX.utils.aoa_to_sheet(locData);
      XLSX.utils.book_append_sheet(workbook, locSheet, 'Locations');
    }
    
    // Sectors Sheet
    if (data.sectors.length > 0) {
      const sectorData = [
        ['Vocabulary', 'Code', 'Name', 'Percentage'],
        ...data.sectors.map(sector => [
          sector.vocabulary || '',
          sector.code || '',
          sector.name || '',
          sector.percentage || ''
        ])
      ];
      const sectorSheet = XLSX.utils.aoa_to_sheet(sectorData);
      XLSX.utils.book_append_sheet(workbook, sectorSheet, 'Sectors');
    }
    
    // Results Sheet
    if (data.results.length > 0) {
      const resultsData: any[][] = [
        ['Type', 'Title', 'Indicator', 'Baseline', 'Target', 'Actual']
      ];
      
      data.results.forEach(result => {
        const indicators = result.indicators || [];
        if (indicators.length > 0) {
          indicators.forEach((ind: any) => {
            resultsData.push([
              result.type || '',
              result.title?.narrative || result.title || '',
              ind.title?.narrative || ind.title || '',
              ind.baseline?.[0]?.value || '',
              ind.periods?.[0]?.target?.value || '',
              ind.periods?.[0]?.actual?.value || ''
            ]);
          });
        } else {
          resultsData.push([
            result.type || '',
            result.title?.narrative || result.title || '',
            '',
            '',
            '',
            ''
          ]);
        }
      });
      
      const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData);
      XLSX.utils.book_append_sheet(workbook, resultsSheet, 'Results');
    }
    
    // Documents Sheet
    if (data.documents.length > 0) {
      const docData = [
        ['Title', 'Format', 'URL', 'Category'],
        ...data.documents.map(doc => [
          doc.title || '',
          doc.format || '',
          doc.url || '',
          doc.activity_document_categories?.[0]?.category_code || ''
        ])
      ];
      const docSheet = XLSX.utils.aoa_to_sheet(docData);
      XLSX.utils.book_append_sheet(workbook, docSheet, 'Documents');
    }
    
    // Generate filename
    const identifier = activity?.iati_identifier || activityId.substring(0, 8);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `activity-${identifier}-${dateStr}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
    
    toast.dismiss(loadingToast);
    toast.success('Excel file exported successfully');
  } catch (error) {
    console.error('Error exporting activity to Excel:', error);
    toast.dismiss(loadingToast);
    toast.error('Failed to export Excel file');
  }
}
