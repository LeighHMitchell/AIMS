import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parseIATIOrganization, validateIATIOrganizationXML } from '@/lib/iati-organization-parser';

interface ImportIATIRequest {
  iatiId?: string;
  xmlContent?: string;
  source?: 'registry' | 'xml' | 'url';
  url?: string;
}

interface ImportIATIResponse {
  success: boolean;
  organization?: any;
  data?: any;
  error?: string;
  warnings?: string[];
}

/**
 * Import organization data from IATI ID, XML content, or URL
 */
export async function POST(request: NextRequest): Promise<NextResponse<ImportIATIResponse>> {
  try {
    const body: ImportIATIRequest = await request.json();
    const { iatiId, xmlContent, source = 'registry', url } = body;

    let iatiXmlContent: string;
    let organizationData: any;

    // Determine how to get the XML content
    if (source === 'xml' && xmlContent) {
      iatiXmlContent = xmlContent;
    } else if (source === 'url' && url) {
      iatiXmlContent = await fetchXMLFromURL(url);
    } else if (source === 'registry' && iatiId) {
      iatiXmlContent = await fetchIATIOrganizationFromRegistry(iatiId);
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid request: must provide either iatiId, xmlContent, or url'
      }, { status: 400 });
    }

    // Validate XML content
    const validation = validateIATIOrganizationXML(iatiXmlContent);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid IATI XML',
        warnings: validation.errors
      }, { status: 400 });
    }

    // Parse the organization data
    try {
      organizationData = parseIATIOrganization(iatiXmlContent);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: `Failed to parse IATI organization: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 400 });
    }

    // Check if organization already exists
    const supabase = getSupabaseAdmin();
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, name, iati_org_id')
      .eq('iati_org_id', organizationData.identifier)
      .single();

    if (existingOrg) {
      // Update existing organization
      const updatedOrg = await updateExistingOrganization(existingOrg.id, organizationData);
      return NextResponse.json({
        success: true,
        organization: updatedOrg,
        data: organizationData,
        warnings: [`Organization with IATI ID "${organizationData.identifier}" already exists. Updated existing record.`]
      });
    } else {
      // Create new organization
      const newOrg = await createNewOrganization(organizationData);
      return NextResponse.json({
        success: true,
        organization: newOrg,
        data: organizationData
      });
    }

  } catch (error) {
    console.error('[IATI Import] Error importing organization:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to import organization: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

/**
 * Fetch IATI organization XML from registry by ID
 */
async function fetchIATIOrganizationFromRegistry(iatiId: string): Promise<string> {
  // Try different IATI registry endpoints
  const registryUrls = [
    `https://iatiregistry.org/api/3/action/package_show?id=${encodeURIComponent(iatiId)}`,
    `https://iatidatastore.iatistandard.org/api/1/access/organization.xml?format=xml&organization=${encodeURIComponent(iatiId)}`,
  ];

  for (const registryUrl of registryUrls) {
    try {
      const response = await fetch(registryUrl, {
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'User-Agent': 'AIMS-IATI-Importer/1.0'
        },
        timeout: 30000
      });

      if (response.ok) {
        const content = await response.text();
        
        // Check if this looks like XML
        if (content.trim().startsWith('<?xml') || content.includes('<iati-organisation')) {
          return content;
        }
        
        // If it's JSON (from registry API), extract the resource URLs
        if (content.trim().startsWith('{')) {
          const data = JSON.parse(content);
          if (data.result?.resources) {
            for (const resource of data.result.resources) {
              if (resource.url && resource.format?.toLowerCase() === 'xml') {
                return await fetchXMLFromURL(resource.url);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[IATI Import] Failed to fetch from ${registryUrl}:`, error);
      continue;
    }
  }

  throw new Error(`Could not fetch IATI organization data for ID: ${iatiId}`);
}

/**
 * Fetch XML content from a URL
 */
async function fetchXMLFromURL(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/xml, text/xml, */*',
      'User-Agent': 'AIMS-IATI-Importer/1.0'
    },
    timeout: 30000
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch XML from ${url}: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

/**
 * Create a new organization from IATI data
 */
async function createNewOrganization(iatiData: any): Promise<any> {
  const supabase = getSupabaseAdmin();

  // Prepare main organization data
  const orgData = {
    name: iatiData.name,
    iati_org_id: iatiData.identifier,
    reporting_org_ref: iatiData.reportingOrg?.ref,
    reporting_org_type: iatiData.reportingOrg?.type,
    reporting_org_name: iatiData.reportingOrg?.name,
    reporting_org_secondary_reporter: iatiData.reportingOrg?.secondaryReporter || false,
    last_updated_datetime: iatiData.lastUpdatedDateTime,
    default_currency: iatiData.defaultCurrency || 'USD',
    default_language: iatiData.defaultLanguage || 'en',
    Organisation_Type_Code: iatiData.reportingOrg?.type || '90', // Default to "Other"
  };

  // Insert main organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert([orgData])
    .select()
    .single();

  if (orgError) {
    throw new Error(`Failed to create organization: ${orgError.message}`);
  }

  // Insert multi-language names
  if (iatiData.names && iatiData.names.length > 0) {
    const nameData = iatiData.names.map((name: any) => ({
      organization_id: org.id,
      language_code: name.language || 'en',
      narrative: name.narrative
    }));

    await supabase.from('organization_names').insert(nameData);
  }

  // Insert budgets
  await insertOrganizationBudgets(org.id, iatiData);

  // Insert expenditures
  await insertOrganizationExpenditures(org.id, iatiData);

  // Insert document links
  await insertOrganizationDocumentLinks(org.id, iatiData);

  return org;
}

/**
 * Update an existing organization with IATI data
 */
async function updateExistingOrganization(orgId: string, iatiData: any): Promise<any> {
  const supabase = getSupabaseAdmin();

  // Update main organization data
  const orgData = {
    name: iatiData.name,
    reporting_org_ref: iatiData.reportingOrg?.ref,
    reporting_org_type: iatiData.reportingOrg?.type,
    reporting_org_name: iatiData.reportingOrg?.name,
    reporting_org_secondary_reporter: iatiData.reportingOrg?.secondaryReporter || false,
    last_updated_datetime: iatiData.lastUpdatedDateTime,
    default_currency: iatiData.defaultCurrency || 'USD',
    default_language: iatiData.defaultLanguage || 'en',
    updated_at: new Date().toISOString()
  };

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .update(orgData)
    .eq('id', orgId)
    .select()
    .single();

  if (orgError) {
    throw new Error(`Failed to update organization: ${orgError.message}`);
  }

  // Clear and re-insert related data
  await supabase.from('organization_names').delete().eq('organization_id', orgId);
  await supabase.from('organization_budgets').delete().eq('organization_id', orgId);
  await supabase.from('organization_expenditures').delete().eq('organization_id', orgId);
  await supabase.from('organization_document_links').delete().eq('organization_id', orgId);

  // Insert updated data
  if (iatiData.names && iatiData.names.length > 0) {
    const nameData = iatiData.names.map((name: any) => ({
      organization_id: orgId,
      language_code: name.language || 'en',
      narrative: name.narrative
    }));

    await supabase.from('organization_names').insert(nameData);
  }

  await insertOrganizationBudgets(orgId, iatiData);
  await insertOrganizationExpenditures(orgId, iatiData);
  await insertOrganizationDocumentLinks(orgId, iatiData);

  return org;
}

/**
 * Insert organization budgets and budget lines
 */
async function insertOrganizationBudgets(orgId: string, iatiData: any): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Insert total budgets
  if (iatiData.totalBudgets && iatiData.totalBudgets.length > 0) {
    for (const budget of iatiData.totalBudgets) {
      const { data: budgetRecord } = await supabase
        .from('organization_budgets')
        .insert({
          organization_id: orgId,
          budget_type: 'total',
          budget_status: budget.status || '1',
          period_start: budget.periodStart,
          period_end: budget.periodEnd,
          value: budget.value,
          currency: budget.currency || 'USD',
          value_date: budget.valueDate
        })
        .select()
        .single();

      // Insert budget lines
      if (budgetRecord && budget.budgetLines && budget.budgetLines.length > 0) {
        const budgetLineData = budget.budgetLines.map((line: any) => ({
          budget_id: budgetRecord.id,
          ref: line.ref,
          value: line.value,
          currency: line.currency || 'USD',
          value_date: line.valueDate,
          narrative: line.narrative,
          language_code: 'en'
        }));

        await supabase.from('organization_budget_lines').insert(budgetLineData);
      }
    }
  }

  // Insert recipient organization budgets
  if (iatiData.recipientOrgBudgets && iatiData.recipientOrgBudgets.length > 0) {
    for (const budget of iatiData.recipientOrgBudgets) {
      const { data: budgetRecord } = await supabase
        .from('organization_budgets')
        .insert({
          organization_id: orgId,
          budget_type: 'recipient-org',
          budget_status: budget.status || '1',
          period_start: budget.periodStart,
          period_end: budget.periodEnd,
          value: budget.value,
          currency: budget.currency || 'USD',
          value_date: budget.valueDate,
          recipient_ref: budget.recipientOrg?.ref,
          recipient_narrative: budget.recipientOrg?.name
        })
        .select()
        .single();

      // Insert budget lines
      if (budgetRecord && budget.budgetLines && budget.budgetLines.length > 0) {
        const budgetLineData = budget.budgetLines.map((line: any) => ({
          budget_id: budgetRecord.id,
          ref: line.ref,
          value: line.value,
          currency: line.currency || 'USD',
          value_date: line.valueDate,
          narrative: line.narrative,
          language_code: 'en'
        }));

        await supabase.from('organization_budget_lines').insert(budgetLineData);
      }
    }
  }

  // Insert recipient country budgets
  if (iatiData.recipientCountryBudgets && iatiData.recipientCountryBudgets.length > 0) {
    for (const budget of iatiData.recipientCountryBudgets) {
      const { data: budgetRecord } = await supabase
        .from('organization_budgets')
        .insert({
          organization_id: orgId,
          budget_type: 'recipient-country',
          budget_status: budget.status || '1',
          period_start: budget.periodStart,
          period_end: budget.periodEnd,
          value: budget.value,
          currency: budget.currency || 'USD',
          value_date: budget.valueDate,
          recipient_ref: budget.recipientCountry?.code
        })
        .select()
        .single();

      // Insert budget lines
      if (budgetRecord && budget.budgetLines && budget.budgetLines.length > 0) {
        const budgetLineData = budget.budgetLines.map((line: any) => ({
          budget_id: budgetRecord.id,
          ref: line.ref,
          value: line.value,
          currency: line.currency || 'USD',
          value_date: line.valueDate,
          narrative: line.narrative,
          language_code: 'en'
        }));

        await supabase.from('organization_budget_lines').insert(budgetLineData);
      }
    }
  }

  // Insert recipient region budgets
  if (iatiData.recipientRegionBudgets && iatiData.recipientRegionBudgets.length > 0) {
    for (const budget of iatiData.recipientRegionBudgets) {
      const { data: budgetRecord } = await supabase
        .from('organization_budgets')
        .insert({
          organization_id: orgId,
          budget_type: 'recipient-region',
          budget_status: budget.status || '1',
          period_start: budget.periodStart,
          period_end: budget.periodEnd,
          value: budget.value,
          currency: budget.currency || 'USD',
          value_date: budget.valueDate,
          recipient_ref: budget.recipientRegion?.code,
          recipient_vocabulary: budget.recipientRegion?.vocabulary,
          recipient_vocabulary_uri: budget.recipientRegion?.vocabularyUri
        })
        .select()
        .single();

      // Insert budget lines
      if (budgetRecord && budget.budgetLines && budget.budgetLines.length > 0) {
        const budgetLineData = budget.budgetLines.map((line: any) => ({
          budget_id: budgetRecord.id,
          ref: line.ref,
          value: line.value,
          currency: line.currency || 'USD',
          value_date: line.valueDate,
          narrative: line.narrative,
          language_code: 'en'
        }));

        await supabase.from('organization_budget_lines').insert(budgetLineData);
      }
    }
  }
}

/**
 * Insert organization expenditures and expense lines
 */
async function insertOrganizationExpenditures(orgId: string, iatiData: any): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (iatiData.totalExpenditures && iatiData.totalExpenditures.length > 0) {
    for (const expenditure of iatiData.totalExpenditures) {
      const { data: expenditureRecord } = await supabase
        .from('organization_expenditures')
        .insert({
          organization_id: orgId,
          period_start: expenditure.periodStart,
          period_end: expenditure.periodEnd,
          value: expenditure.value,
          currency: expenditure.currency || 'USD',
          value_date: expenditure.valueDate
        })
        .select()
        .single();

      // Insert expense lines
      if (expenditureRecord && expenditure.expenseLines && expenditure.expenseLines.length > 0) {
        const expenseLineData = expenditure.expenseLines.map((line: any) => ({
          expenditure_id: expenditureRecord.id,
          ref: line.ref,
          value: line.value,
          currency: line.currency || 'USD',
          value_date: line.valueDate,
          narrative: line.narrative,
          language_code: line.language || 'en'
        }));

        await supabase.from('organization_expense_lines').insert(expenseLineData);
      }
    }
  }
}

/**
 * Insert organization document links with all related data
 */
async function insertOrganizationDocumentLinks(orgId: string, iatiData: any): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (iatiData.documentLinks && iatiData.documentLinks.length > 0) {
    for (const docLink of iatiData.documentLinks) {
      const { data: documentRecord } = await supabase
        .from('organization_document_links')
        .insert({
          organization_id: orgId,
          url: docLink.url,
          format: docLink.format,
          document_date: docLink.documentDate
        })
        .select()
        .single();

      if (!documentRecord) continue;

      // Insert titles
      if (docLink.titles && docLink.titles.length > 0) {
        const titleData = docLink.titles.map((title: any) => ({
          document_link_id: documentRecord.id,
          narrative: title.narrative,
          language_code: title.language || 'en'
        }));

        await supabase.from('organization_document_titles').insert(titleData);
      }

      // Insert descriptions
      if (docLink.descriptions && docLink.descriptions.length > 0) {
        const descriptionData = docLink.descriptions.map((desc: any) => ({
          document_link_id: documentRecord.id,
          narrative: desc.narrative,
          language_code: desc.language || 'en'
        }));

        await supabase.from('organization_document_descriptions').insert(descriptionData);
      }

      // Insert categories
      if (docLink.categories && docLink.categories.length > 0) {
        const categoryData = docLink.categories.map((category: string) => ({
          document_link_id: documentRecord.id,
          category_code: category
        }));

        await supabase.from('organization_document_categories').insert(categoryData);
      }

      // Insert languages
      if (docLink.languages && docLink.languages.length > 0) {
        const languageData = docLink.languages.map((language: string) => ({
          document_link_id: documentRecord.id,
          language_code: language
        }));

        await supabase.from('organization_document_languages').insert(languageData);
      }

      // Insert recipient countries
      if (docLink.recipientCountries && docLink.recipientCountries.length > 0) {
        const countryData = docLink.recipientCountries.map((country: any) => ({
          document_link_id: documentRecord.id,
          country_code: country.code,
          narrative: country.narrative,
          language_code: country.language || 'en'
        }));

        await supabase.from('organization_document_recipient_countries').insert(countryData);
      }
    }
  }
}
