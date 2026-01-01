'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
      fetch(`${baseUrl}/api/organizations/${orgId}`),
      fetch(`${baseUrl}/api/organizations/${orgId}/activities`),
      fetch(`${baseUrl}/api/organizations/${orgId}/transactions`),
      fetch(`${baseUrl}/api/organizations/${orgId}/contacts`)
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
 * Exports organization data to Excel
 */
export async function exportOrganizationToExcel(orgId: string): Promise<void> {
  const loadingToast = toast.loading('Preparing Excel export...');
  
  try {
    const data = await fetchOrganizationExportData(orgId);
    const org = data.profile;
    const workbook = XLSX.utils.book_new();
    
    // Profile Sheet
    const profileData = [
      ['Field', 'Value'],
      ['Name', org?.name || ''],
      ['Acronym', org?.acronym || ''],
      ['Type', org?.Organisation_Type_Name || org?.type || ''],
      ['Country', org?.country || ''],
      ['IATI Ref', org?.iati_org_id || ''],
      ['Website', org?.website || ''],
      ['Email', org?.email || ''],
      ['Phone', org?.phone || ''],
      ['Description', org?.description || ''],
      ['', ''],
      [getExportFooter(), '']
    ];
    const profileSheet = XLSX.utils.aoa_to_sheet(profileData);
    XLSX.utils.book_append_sheet(workbook, profileSheet, 'Profile');
    
    // Activities Sheet
    if (data.activities.length > 0) {
      const activityData = [
        ['Title', 'IATI ID', 'Status', 'Role', 'Start Date', 'End Date'],
        ...data.activities.map(activity => [
          activity.title || activity.title_narrative || '',
          activity.iati_identifier || activity.iati_id || '',
          activity.activity_status || '',
          activity.role || '',
          activity.planned_start_date || activity.start_date ? formatDate(activity.planned_start_date || activity.start_date) : '',
          activity.planned_end_date || activity.end_date ? formatDate(activity.planned_end_date || activity.end_date) : ''
        ])
      ];
      const activitySheet = XLSX.utils.aoa_to_sheet(activityData);
      XLSX.utils.book_append_sheet(workbook, activitySheet, 'Activities');
    }
    
    // Transactions Sheet
    if (data.transactions.length > 0) {
      const transData = [
        ['Date', 'Activity', 'Type', 'Value', 'Currency', 'Counterparty'],
        ...data.transactions.map(trans => [
          trans.transaction_date ? formatDate(trans.transaction_date) : '',
          trans.activity_title || trans.activity?.title || '',
          trans.transaction_type_name || trans.transaction_type || '',
          trans.value || '',
          trans.currency || '',
          trans.provider_org_id === orgId 
            ? (trans.receiver_org_name || trans.receiver_organization?.name || '')
            : (trans.provider_org_name || trans.provider_organization?.name || '')
        ])
      ];
      const transSheet = XLSX.utils.aoa_to_sheet(transData);
      XLSX.utils.book_append_sheet(workbook, transSheet, 'Transactions');
    }
    
    // Contacts Sheet
    if (data.contacts.length > 0) {
      const contactData = [
        ['Name', 'Role', 'Email', 'Phone'],
        ...data.contacts.map(contact => [
          contact.name || '',
          contact.role || contact.job_title || '',
          contact.email || '',
          contact.phone || ''
        ])
      ];
      const contactSheet = XLSX.utils.aoa_to_sheet(contactData);
      XLSX.utils.book_append_sheet(workbook, contactSheet, 'Contacts');
    }
    
    // Generate filename
    const nameSlug = (org?.name || orgId).replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 30);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const filename = `organization-${nameSlug}-${dateStr}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
    
    toast.dismiss(loadingToast);
    toast.success('Excel file exported successfully');
  } catch (error) {
    console.error('Error exporting organization to Excel:', error);
    toast.dismiss(loadingToast);
    toast.error('Failed to export Excel file');
  }
}



