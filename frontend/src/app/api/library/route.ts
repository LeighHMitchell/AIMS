import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { DOCUMENT_CATEGORIES } from '@/lib/iatiDocumentLink';
import type { 
  UnifiedDocument, 
  LibraryFilters, 
  LibraryResponse,
  DocumentSourceType,
  LinkedEntity 
} from '@/types/library-document';

export const dynamic = 'force-dynamic';

// Helper to extract primary title from JSONB narrative array
function extractTitle(titleData: any): string {
  if (!titleData) return 'Untitled';
  
  // If it's already a string, return it
  if (typeof titleData === 'string') return titleData;
  
  // If it's an array of narratives
  if (Array.isArray(titleData)) {
    // Prefer English
    const enNarrative = titleData.find((n: any) => n.lang === 'en' || n.language === 'en');
    if (enNarrative?.text) return enNarrative.text;
    // Fallback to first narrative
    if (titleData[0]?.text) return titleData[0].text;
  }
  
  // If it's an object with 'en' key (JSONB format)
  if (typeof titleData === 'object' && titleData.en) {
    return titleData.en;
  }
  
  return 'Untitled';
}

// Helper to extract narratives array from various formats
function extractNarratives(data: any): Array<{ text: string; lang: string }> | undefined {
  if (!data) return undefined;
  
  if (Array.isArray(data)) {
    return data.map((n: any) => ({
      text: n.text || n.narrative || '',
      lang: n.lang || n.language || 'en'
    }));
  }
  
  if (typeof data === 'object') {
    return Object.entries(data).map(([lang, text]) => ({
      text: String(text),
      lang
    }));
  }
  
  return undefined;
}

// Helper to get category name from code
function getCategoryName(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const category = DOCUMENT_CATEGORIES.find(c => c.code === code);
  return category?.name;
}

// Helper to format organization name with acronym
function formatOrgName(org: { name?: string; acronym?: string } | null | undefined): string | undefined {
  if (!org) return undefined;
  const name = org.name;
  const acronym = org.acronym;
  
  if (name && acronym) {
    return `${name} (${acronym})`;
  }
  return name || acronym || undefined;
}

// Helper to extract organization details
function extractOrgDetails(org: { name?: string; acronym?: string; logo?: string; iati_org_id?: string } | null | undefined) {
  if (!org) return { name: undefined, acronym: undefined, logo: undefined, iatiOrgId: undefined };
  return {
    name: org.name || undefined,
    acronym: org.acronym || undefined,
    logo: org.logo || undefined,
    iatiOrgId: org.iati_org_id || undefined,
  };
}

// Query activity documents
async function queryActivityDocuments(supabase: any, filters: LibraryFilters): Promise<UnifiedDocument[]> {
  let query = supabase
    .from('activity_documents')
    .select(`
      *,
      activities!inner(
        id,
        title_narrative,
        iati_identifier,
        reporting_org_id,
        organizations:reporting_org_id(id, name, acronym, logo, iati_org_id)
      )
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.categoryCodes && filters.categoryCodes.length > 0) {
    query = query.in('category_code', filters.categoryCodes);
  }
  if (filters.formats && filters.formats.length > 0) {
    query = query.in('format', filters.formats);
  }
  if (filters.reportingOrgIds && filters.reportingOrgIds.length > 0) {
    query = query.in('activities.reporting_org_id', filters.reportingOrgIds);
  }
  if (filters.documentDateFrom) {
    query = query.gte('document_date', filters.documentDateFrom);
  }
  if (filters.documentDateTo) {
    query = query.lte('document_date', filters.documentDateTo);
  }
  if (filters.uploadDateFrom) {
    query = query.gte('created_at', filters.uploadDateFrom);
  }
  if (filters.uploadDateTo) {
    query = query.lte('created_at', filters.uploadDateTo);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching activity documents:', error);
    return [];
  }

  return (data || []).map((doc: any): UnifiedDocument => {
    const orgDetails = extractOrgDetails(doc.activities?.organizations);
    return {
      id: `activity-${doc.id}`,
      url: doc.url,
      format: doc.format,
      title: extractTitle(doc.title),
      titleNarratives: extractNarratives(doc.title),
      description: extractTitle(doc.description),
      descriptionNarratives: extractNarratives(doc.description),
      categoryCode: doc.category_code,
      categoryName: getCategoryName(doc.category_code),
      languageCodes: doc.language_codes,
      documentDate: doc.document_date,
      recipientCountries: doc.recipient_countries,
      fileName: doc.file_name,
      fileSize: doc.file_size,
      filePath: doc.file_path,
      isExternal: doc.is_external || false,
      thumbnailUrl: doc.thumbnail_url,
      sourceType: 'activity',
      sourceId: doc.activity_id,
      sourceName: doc.activities?.title_narrative || 'Unknown Activity',
      sourceUrl: `/activities/${doc.activity_id}`,
      linkedEntities: [{
        type: 'activity',
        id: doc.activity_id,
        name: doc.activities?.title_narrative || 'Unknown Activity',
        url: `/activities/${doc.activity_id}`
      }],
      uploadedBy: doc.uploaded_by,
      reportingOrgId: doc.activities?.reporting_org_id,
      reportingOrgName: formatOrgName(doc.activities?.organizations),
      reportingOrgAcronym: orgDetails.acronym,
      reportingOrgLogo: orgDetails.logo,
      reportingOrgIatiId: orgDetails.iatiOrgId,
      sourceIdentifier: doc.activities?.iati_identifier,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    };
  });
}

// Query transaction documents
async function queryTransactionDocuments(supabase: any, filters: LibraryFilters): Promise<UnifiedDocument[]> {
  let query = supabase
    .from('transaction_documents')
    .select(`
      *,
      transactions:transaction_id(
        uuid,
        ref,
        activity_id,
        activities:activity_id(
          id,
          title_narrative,
          iati_identifier,
          reporting_org_id,
          organizations:reporting_org_id(id, name, acronym, logo, iati_org_id)
        )
      )
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.formats && filters.formats.length > 0) {
    query = query.in('file_type', filters.formats);
  }
  if (filters.uploadDateFrom) {
    query = query.gte('created_at', filters.uploadDateFrom);
  }
  if (filters.uploadDateTo) {
    query = query.lte('created_at', filters.uploadDateTo);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching transaction documents:', error);
    return [];
  }

  return (data || []).filter((doc: any) => {
    // Filter by reporting org if specified
    if (filters.reportingOrgIds && filters.reportingOrgIds.length > 0) {
      const reportingOrgId = doc.transactions?.activities?.reporting_org_id;
      if (!reportingOrgId || !filters.reportingOrgIds.includes(reportingOrgId)) {
        return false;
      }
    }
    return true;
  }).map((doc: any): UnifiedDocument => {
    const transaction = doc.transactions;
    const activity = transaction?.activities;
    const url = doc.file_url || doc.external_url || '';
    const orgDetails = extractOrgDetails(activity?.organizations);
    
    return {
      id: `transaction-${doc.id}`,
      url,
      format: doc.file_type || 'application/octet-stream',
      title: doc.file_name || 'Untitled',
      description: doc.description,
      categoryCode: undefined, // Transaction docs don't have IATI categories
      languageCodes: undefined,
      documentDate: undefined,
      fileName: doc.file_name,
      fileSize: doc.file_size,
      isExternal: !!doc.external_url,
      sourceType: 'transaction',
      sourceId: doc.transaction_id,
      sourceName: transaction?.ref || `Transaction ${doc.transaction_id?.slice(0, 8)}`,
      sourceUrl: activity?.id ? `/activities/${activity.id}?tab=transactions` : undefined,
      linkedEntities: [{
        type: 'transaction',
        id: doc.transaction_id,
        name: transaction?.ref || 'Transaction',
        url: activity?.id ? `/activities/${activity.id}?tab=transactions` : undefined
      }],
      uploadedBy: doc.uploaded_by,
      uploadedByEmail: doc.uploaded_by_email,
      reportingOrgId: activity?.reporting_org_id,
      reportingOrgName: formatOrgName(activity?.organizations),
      reportingOrgAcronym: orgDetails.acronym,
      reportingOrgLogo: orgDetails.logo,
      reportingOrgIatiId: orgDetails.iatiOrgId,
      sourceIdentifier: activity?.iati_identifier,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    };
  });
}

// Query organization documents
async function queryOrganizationDocuments(supabase: any, filters: LibraryFilters): Promise<UnifiedDocument[]> {
  let query = supabase
    .from('organization_document_links')
    .select(`
      *,
      organizations:organization_id(id, name, acronym, logo, iati_org_id),
      organization_document_titles(narrative, language_code),
      organization_document_descriptions(narrative, language_code),
      organization_document_categories(category_code)
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.reportingOrgIds && filters.reportingOrgIds.length > 0) {
    query = query.in('organization_id', filters.reportingOrgIds);
  }
  if (filters.documentDateFrom) {
    query = query.gte('document_date', filters.documentDateFrom);
  }
  if (filters.documentDateTo) {
    query = query.lte('document_date', filters.documentDateTo);
  }
  if (filters.uploadDateFrom) {
    query = query.gte('created_at', filters.uploadDateFrom);
  }
  if (filters.uploadDateTo) {
    query = query.lte('created_at', filters.uploadDateTo);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching organization documents:', error);
    return [];
  }

  return (data || []).filter((doc: any) => {
    // Filter by category if specified
    if (filters.categoryCodes && filters.categoryCodes.length > 0) {
      const docCategories = doc.organization_document_categories?.map((c: any) => c.category_code) || [];
      if (!docCategories.some((c: string) => filters.categoryCodes!.includes(c))) {
        return false;
      }
    }
    // Filter by format if specified
    if (filters.formats && filters.formats.length > 0) {
      if (!doc.format || !filters.formats.includes(doc.format)) {
        return false;
      }
    }
    return true;
  }).map((doc: any): UnifiedDocument => {
    // Extract title from related table
    const titles = doc.organization_document_titles || [];
    const enTitle = titles.find((t: any) => t.language_code === 'en');
    const title = enTitle?.narrative || titles[0]?.narrative || 'Untitled';
    
    // Extract description
    const descriptions = doc.organization_document_descriptions || [];
    const enDesc = descriptions.find((d: any) => d.language_code === 'en');
    const description = enDesc?.narrative || descriptions[0]?.narrative;
    
    // Extract categories
    const categories = doc.organization_document_categories || [];
    const categoryCode = categories[0]?.category_code;
    
    const orgDetails = extractOrgDetails(doc.organizations);
    
    return {
      id: `organization-${doc.id}`,
      url: doc.url,
      format: doc.format || 'application/octet-stream',
      title,
      titleNarratives: titles.map((t: any) => ({ text: t.narrative, lang: t.language_code })),
      description,
      descriptionNarratives: descriptions.map((d: any) => ({ text: d.narrative, lang: d.language_code })),
      categoryCode,
      categoryName: getCategoryName(categoryCode),
      languageCodes: undefined,
      documentDate: doc.document_date,
      fileName: undefined,
      fileSize: undefined,
      isExternal: true,
      sourceType: 'organization',
      sourceId: doc.organization_id,
      sourceName: doc.organizations?.name || doc.organizations?.acronym || 'Unknown Organization',
      sourceUrl: `/organizations/${doc.organization_id}`,
      linkedEntities: [{
        type: 'organization',
        id: doc.organization_id,
        name: doc.organizations?.name || 'Organization',
        url: `/organizations/${doc.organization_id}`
      }],
      reportingOrgId: doc.organization_id,
      reportingOrgName: formatOrgName(doc.organizations),
      reportingOrgAcronym: orgDetails.acronym,
      reportingOrgLogo: orgDetails.logo,
      reportingOrgIatiId: orgDetails.iatiOrgId,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    };
  });
}

// Query result document links
async function queryResultDocuments(supabase: any, filters: LibraryFilters): Promise<UnifiedDocument[]> {
  let query = supabase
    .from('result_document_links')
    .select(`
      *,
      activity_results:result_id(
        id,
        title,
        activity_id,
        activities:activity_id(
          id,
          title_narrative,
          iati_identifier,
          reporting_org_id,
          organizations:reporting_org_id(id, name, acronym, logo, iati_org_id)
        )
      )
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.categoryCodes && filters.categoryCodes.length > 0) {
    query = query.in('category_code', filters.categoryCodes);
  }
  if (filters.documentDateFrom) {
    query = query.gte('document_date', filters.documentDateFrom);
  }
  if (filters.documentDateTo) {
    query = query.lte('document_date', filters.documentDateTo);
  }
  if (filters.uploadDateFrom) {
    query = query.gte('created_at', filters.uploadDateFrom);
  }
  if (filters.uploadDateTo) {
    query = query.lte('created_at', filters.uploadDateTo);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching result documents:', error);
    return [];
  }

  return (data || []).filter((doc: any) => {
    // Filter by reporting org if specified
    if (filters.reportingOrgIds && filters.reportingOrgIds.length > 0) {
      const reportingOrgId = doc.activity_results?.activities?.reporting_org_id;
      if (!reportingOrgId || !filters.reportingOrgIds.includes(reportingOrgId)) {
        return false;
      }
    }
    // Filter by format if specified
    if (filters.formats && filters.formats.length > 0) {
      if (!doc.format || !filters.formats.includes(doc.format)) {
        return false;
      }
    }
    return true;
  }).map((doc: any): UnifiedDocument => {
    const result = doc.activity_results;
    const activity = result?.activities;
    const orgDetails = extractOrgDetails(activity?.organizations);
    
    return {
      id: `result-${doc.id}`,
      url: doc.url,
      format: doc.format || 'application/octet-stream',
      title: extractTitle(doc.title),
      titleNarratives: extractNarratives(doc.title),
      description: extractTitle(doc.description),
      descriptionNarratives: extractNarratives(doc.description),
      categoryCode: doc.category_code,
      categoryName: getCategoryName(doc.category_code),
      languageCodes: doc.language_code ? [doc.language_code] : undefined,
      documentDate: doc.document_date,
      fileName: undefined,
      fileSize: undefined,
      isExternal: true,
      sourceType: 'result',
      sourceId: doc.result_id,
      sourceName: extractTitle(result?.title) || 'Result',
      sourceUrl: activity?.id ? `/activities/${activity.id}?tab=results` : undefined,
      linkedEntities: [{
        type: 'result',
        id: doc.result_id,
        name: extractTitle(result?.title) || 'Result',
        url: activity?.id ? `/activities/${activity.id}?tab=results` : undefined
      }],
      reportingOrgId: activity?.reporting_org_id,
      reportingOrgName: formatOrgName(activity?.organizations),
      reportingOrgAcronym: orgDetails.acronym,
      reportingOrgLogo: orgDetails.logo,
      reportingOrgIatiId: orgDetails.iatiOrgId,
      sourceIdentifier: activity?.iati_identifier,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    };
  });
}

// Query indicator document links
async function queryIndicatorDocuments(supabase: any, filters: LibraryFilters): Promise<UnifiedDocument[]> {
  let query = supabase
    .from('indicator_document_links')
    .select(`
      *,
      result_indicators:indicator_id(
        id,
        title,
        result_id,
        activity_results:result_id(
          id,
          activity_id,
          activities:activity_id(
            id,
            title_narrative,
            reporting_org_id,
            organizations:reporting_org_id(id, name, acronym, logo, iati_org_id)
          )
        )
      )
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.categoryCodes && filters.categoryCodes.length > 0) {
    query = query.in('category_code', filters.categoryCodes);
  }
  if (filters.documentDateFrom) {
    query = query.gte('document_date', filters.documentDateFrom);
  }
  if (filters.documentDateTo) {
    query = query.lte('document_date', filters.documentDateTo);
  }
  if (filters.uploadDateFrom) {
    query = query.gte('created_at', filters.uploadDateFrom);
  }
  if (filters.uploadDateTo) {
    query = query.lte('created_at', filters.uploadDateTo);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching indicator documents:', error);
    return [];
  }

  return (data || []).filter((doc: any) => {
    // Filter by reporting org if specified
    if (filters.reportingOrgIds && filters.reportingOrgIds.length > 0) {
      const reportingOrgId = doc.result_indicators?.activity_results?.activities?.reporting_org_id;
      if (!reportingOrgId || !filters.reportingOrgIds.includes(reportingOrgId)) {
        return false;
      }
    }
    // Filter by format if specified
    if (filters.formats && filters.formats.length > 0) {
      if (!doc.format || !filters.formats.includes(doc.format)) {
        return false;
      }
    }
    return true;
  }).map((doc: any): UnifiedDocument => {
    const indicator = doc.result_indicators;
    const result = indicator?.activity_results;
    const activity = result?.activities;
    const orgDetails = extractOrgDetails(activity?.organizations);
    
    return {
      id: `indicator-${doc.id}`,
      url: doc.url,
      format: doc.format || 'application/octet-stream',
      title: extractTitle(doc.title),
      titleNarratives: extractNarratives(doc.title),
      description: extractTitle(doc.description),
      descriptionNarratives: extractNarratives(doc.description),
      categoryCode: doc.category_code,
      categoryName: getCategoryName(doc.category_code),
      languageCodes: doc.language_code ? [doc.language_code] : undefined,
      documentDate: doc.document_date,
      fileName: undefined,
      fileSize: undefined,
      isExternal: true,
      sourceType: 'indicator',
      sourceId: doc.indicator_id,
      sourceName: extractTitle(indicator?.title) || 'Indicator',
      sourceUrl: activity?.id ? `/activities/${activity.id}?tab=results` : undefined,
      linkedEntities: [{
        type: 'indicator',
        id: doc.indicator_id,
        name: extractTitle(indicator?.title) || 'Indicator',
        url: activity?.id ? `/activities/${activity.id}?tab=results` : undefined
      }],
      reportingOrgId: activity?.reporting_org_id,
      reportingOrgName: formatOrgName(activity?.organizations),
      reportingOrgAcronym: orgDetails.acronym,
      reportingOrgLogo: orgDetails.logo,
      reportingOrgIatiId: orgDetails.iatiOrgId,
      sourceIdentifier: activity?.iati_identifier,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    };
  });
}

// Query standalone library documents
async function queryStandaloneDocuments(supabase: any, filters: LibraryFilters): Promise<UnifiedDocument[]> {
  // Note: We can't join auth.users directly, so we query library_documents separately
  // and get user info from the public.users table if needed
  let query = supabase
    .from('library_documents')
    .select(`
      *,
      organizations:organization_id(id, name, acronym, logo, iati_org_id)
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.categoryCodes && filters.categoryCodes.length > 0) {
    query = query.in('category_code', filters.categoryCodes);
  }
  if (filters.formats && filters.formats.length > 0) {
    query = query.in('format', filters.formats);
  }
  if (filters.reportingOrgIds && filters.reportingOrgIds.length > 0) {
    query = query.in('organization_id', filters.reportingOrgIds);
  }
  if (filters.documentDateFrom) {
    query = query.gte('document_date', filters.documentDateFrom);
  }
  if (filters.documentDateTo) {
    query = query.lte('document_date', filters.documentDateTo);
  }
  if (filters.uploadDateFrom) {
    query = query.gte('created_at', filters.uploadDateFrom);
  }
  if (filters.uploadDateTo) {
    query = query.lte('created_at', filters.uploadDateTo);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching library documents:', error);
    return [];
  }

  console.log('[Library] Standalone documents found:', data?.length || 0);

  return (data || []).map((doc: any): UnifiedDocument => {
    const orgDetails = extractOrgDetails(doc.organizations);
    return {
      id: `standalone-${doc.id}`,
      url: doc.url,
      format: doc.format,
      title: extractTitle(doc.title),
      titleNarratives: extractNarratives(doc.title),
      description: extractTitle(doc.description),
      descriptionNarratives: extractNarratives(doc.description),
      categoryCode: doc.category_code,
      categoryName: getCategoryName(doc.category_code),
      languageCodes: doc.language_codes,
      documentDate: doc.document_date,
      recipientCountries: doc.recipient_countries,
      fileName: doc.file_name,
      fileSize: doc.file_size,
      filePath: doc.file_path,
      isExternal: doc.is_external || false,
      sourceType: 'standalone',
      sourceId: doc.id,
      sourceName: 'Library',
      linkedEntities: [],
      uploadedBy: doc.uploaded_by,
      reportingOrgId: doc.organization_id,
      reportingOrgName: formatOrgName(doc.organizations),
      reportingOrgAcronym: orgDetails.acronym,
      reportingOrgLogo: orgDetails.logo,
      reportingOrgIatiId: orgDetails.iatiOrgId,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    };
  });
}

// Merge documents with the same URL
function mergeDocumentsByUrl(documents: UnifiedDocument[]): UnifiedDocument[] {
  const urlMap = new Map<string, UnifiedDocument>();
  
  for (const doc of documents) {
    const existing = urlMap.get(doc.url);
    
    if (existing) {
      // Merge linked entities
      existing.linkedEntities = [
        ...existing.linkedEntities,
        ...doc.linkedEntities
      ];
      // Use the most recent date
      if (doc.createdAt > existing.createdAt) {
        existing.createdAt = doc.createdAt;
      }
    } else {
      urlMap.set(doc.url, { ...doc });
    }
  }
  
  return Array.from(urlMap.values());
}

// Apply text search filter
function applySearchFilter(documents: UnifiedDocument[], search: string): UnifiedDocument[] {
  if (!search) return documents;
  
  const searchLower = search.toLowerCase();
  
  return documents.filter(doc => {
    return (
      doc.title.toLowerCase().includes(searchLower) ||
      doc.description?.toLowerCase().includes(searchLower) ||
      doc.sourceName.toLowerCase().includes(searchLower) ||
      doc.fileName?.toLowerCase().includes(searchLower) ||
      doc.categoryName?.toLowerCase().includes(searchLower) ||
      doc.reportingOrgName?.toLowerCase().includes(searchLower)
    );
  });
}

// Sort documents
function sortDocuments(
  documents: UnifiedDocument[], 
  sortBy: string, 
  sortOrder: 'asc' | 'desc'
): UnifiedDocument[] {
  return [...documents].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'categoryCode':
        comparison = (a.categoryCode || '').localeCompare(b.categoryCode || '');
        break;
      case 'format':
        comparison = a.format.localeCompare(b.format);
        break;
      case 'sourceType':
        comparison = a.sourceType.localeCompare(b.sourceType);
        break;
      case 'documentDate':
        const dateA = a.documentDate ? new Date(a.documentDate).getTime() : 0;
        const dateB = b.documentDate ? new Date(b.documentDate).getTime() : 0;
        comparison = dateA - dateB;
        break;
      case 'reportingOrgName':
        comparison = (a.reportingOrgName || '').localeCompare(b.reportingOrgName || '');
        break;
      case 'createdAt':
      default:
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

// GET - Fetch all documents from all sources
export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const filters: LibraryFilters = {
      search: searchParams.get('search') || undefined,
      sourceTypes: searchParams.get('sourceTypes')?.split(',').filter(Boolean) as DocumentSourceType[] || undefined,
      categoryCodes: searchParams.get('categoryCodes')?.split(',').filter(Boolean) || undefined,
      formats: searchParams.get('formats')?.split(',').filter(Boolean) || undefined,
      reportingOrgIds: searchParams.get('reportingOrgIds')?.split(',').filter(Boolean) || undefined,
      uploadedByOrgIds: searchParams.get('uploadedByOrgIds')?.split(',').filter(Boolean) || undefined,
      documentDateFrom: searchParams.get('documentDateFrom') || undefined,
      documentDateTo: searchParams.get('documentDateTo') || undefined,
      uploadDateFrom: searchParams.get('uploadDateFrom') || undefined,
      uploadDateTo: searchParams.get('uploadDateTo') || undefined,
    };
    
    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '24', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    // Determine which sources to query
    const sourceTypes = filters.sourceTypes || ['activity', 'transaction', 'organization', 'result', 'indicator', 'standalone'];
    
    // Query all relevant sources in parallel
    const queryPromises: Promise<UnifiedDocument[]>[] = [];
    
    if (sourceTypes.includes('activity')) {
      queryPromises.push(queryActivityDocuments(supabase, filters));
    }
    if (sourceTypes.includes('transaction')) {
      queryPromises.push(queryTransactionDocuments(supabase, filters));
    }
    if (sourceTypes.includes('organization')) {
      queryPromises.push(queryOrganizationDocuments(supabase, filters));
    }
    if (sourceTypes.includes('result')) {
      queryPromises.push(queryResultDocuments(supabase, filters));
    }
    if (sourceTypes.includes('indicator')) {
      queryPromises.push(queryIndicatorDocuments(supabase, filters));
    }
    if (sourceTypes.includes('standalone')) {
      queryPromises.push(queryStandaloneDocuments(supabase, filters));
    }
    
    // Execute all queries in parallel
    const results = await Promise.all(queryPromises);
    
    // Flatten results
    let allDocuments = results.flat();
    
    // Merge documents with the same URL
    allDocuments = mergeDocumentsByUrl(allDocuments);

    // Filter by specific URLs if provided (used by bookmark views)
    const urlsParam = searchParams.get('urls');
    if (urlsParam) {
      const urls = new Set(urlsParam.split(',').map(u => decodeURIComponent(u)));
      allDocuments = allDocuments.filter(doc => urls.has(doc.url));
    }

    // Apply text search filter
    if (filters.search) {
      allDocuments = applySearchFilter(allDocuments, filters.search);
    }
    
    // Sort documents
    allDocuments = sortDocuments(allDocuments, sortBy, sortOrder);
    
    // Calculate pagination
    const total = allDocuments.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    // Paginate
    const paginatedDocuments = allDocuments.slice(startIndex, endIndex);
    
    const response: LibraryResponse = {
      documents: paginatedDocuments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      filters,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Library API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
