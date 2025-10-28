/**
 * IATI Organization Parser
 * Parses IATI organization XML files according to the IATI standard
 */

interface ParsedIATIOrganization {
  // Mandatory fields
  identifier: string;
  name: string;
  names: Array<{
    narrative: string;
    language?: string;
  }>;
  reportingOrg: {
    ref?: string;
    type?: string;
    secondaryReporter?: boolean;
    name?: string;
    names?: Array<{
      narrative: string;
      language?: string;
    }>;
  };
  
  // Attributes
  lastUpdatedDateTime?: string;
  defaultCurrency?: string;
  defaultLanguage?: string;
  
  // Budgets
  totalBudgets?: Array<{
    status?: string;
    periodStart?: string;
    periodEnd?: string;
    value?: number;
    currency?: string;
    valueDate?: string;
    budgetLines?: Array<{
      ref?: string;
      value?: number;
      currency?: string;
      valueDate?: string;
      narrative?: string;
    }>;
  }>;
  
  recipientOrgBudgets?: Array<{
    status?: string;
    recipientOrg?: {
      ref?: string;
      name?: string;
    };
    periodStart?: string;
    periodEnd?: string;
    value?: number;
    currency?: string;
    valueDate?: string;
    budgetLines?: Array<{
      ref?: string;
      value?: number;
      currency?: string;
      valueDate?: string;
      narrative?: string;
    }>;
  }>;
  
  recipientCountryBudgets?: Array<{
    status?: string;
    recipientCountry?: {
      code?: string;
    };
    periodStart?: string;
    periodEnd?: string;
    value?: number;
    currency?: string;
    valueDate?: string;
    budgetLines?: Array<{
      ref?: string;
      value?: number;
      currency?: string;
      valueDate?: string;
      narrative?: string;
    }>;
  }>;
  
  recipientRegionBudgets?: Array<{
    status?: string;
    recipientRegion?: {
      vocabulary?: string;
      vocabularyUri?: string;
      code?: string;
    };
    periodStart?: string;
    periodEnd?: string;
    value?: number;
    currency?: string;
    valueDate?: string;
    budgetLines?: Array<{
      ref?: string;
      value?: number;
      currency?: string;
      valueDate?: string;
      narrative?: string;
    }>;
  }>;
  
  // Expenditures
  totalExpenditures?: Array<{
    periodStart?: string;
    periodEnd?: string;
    value?: number;
    currency?: string;
    valueDate?: string;
    expenseLines?: Array<{
      ref?: string;
      value?: number;
      currency?: string;
      valueDate?: string;
      narrative?: string;
      language?: string;
    }>;
  }>;
  
  // Document Links
  documentLinks?: Array<{
    url: string;
    format?: string;
    documentDate?: string;
    titles?: Array<{
      narrative: string;
      language?: string;
    }>;
    descriptions?: Array<{
      narrative: string;
      language?: string;
    }>;
    categories: string[];
    languages: string[];
    recipientCountries?: Array<{
      code: string;
      narrative?: string;
      language?: string;
    }>;
  }>;
}

export class IATIOrganizationParser {
  private xmlDoc: Document;

  constructor(xmlContent: string) {
    const parser = new DOMParser();
    this.xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Check for parsing errors
    const parseError = this.xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`XML parsing error: ${parseError.textContent}`);
    }
  }

  parseOrganization(): ParsedIATIOrganization {
    const org = this.xmlDoc.querySelector('iati-organisation');
    if (!org) {
      throw new Error('No iati-organisation element found in XML');
    }

    // Extract identifier (mandatory)
    const identifier = org.querySelector('organisation-identifier')?.textContent?.trim();
    if (!identifier) {
      throw new Error('Organization identifier is required but not found');
    }

    // Extract names (mandatory, with multi-language support)
    const nameEl = org.querySelector('name');
    if (!nameEl) {
      throw new Error('Organization name is required but not found');
    }
    
    const names = this.extractNarratives(nameEl);
    if (names.length === 0) {
      throw new Error('Organization name must contain at least one narrative');
    }
    
    const primaryName = names.find(n => !n.language || n.language === 'en')?.narrative || names[0].narrative;

    // Extract reporting org (mandatory)
    const reportingOrgEl = org.querySelector('reporting-org');
    if (!reportingOrgEl) {
      throw new Error('Reporting organization is required but not found');
    }
    
    const reportingOrg = {
      ref: reportingOrgEl.getAttribute('ref') || undefined,
      type: reportingOrgEl.getAttribute('type') || undefined,
      secondaryReporter: reportingOrgEl.getAttribute('secondary-reporter') === '1',
      name: this.extractNarratives(reportingOrgEl)[0]?.narrative,
      names: this.extractNarratives(reportingOrgEl)
    };

    const result: ParsedIATIOrganization = {
      identifier,
      name: primaryName,
      names,
      reportingOrg,
      lastUpdatedDateTime: org.getAttribute('last-updated-datetime') || undefined,
      defaultCurrency: org.getAttribute('default-currency') || undefined,
      defaultLanguage: org.getAttribute('xml:lang') || undefined,
    };

    // Parse budgets
    result.totalBudgets = this.parseTotalBudgets(org);
    result.recipientOrgBudgets = this.parseRecipientOrgBudgets(org);
    result.recipientCountryBudgets = this.parseRecipientCountryBudgets(org);
    result.recipientRegionBudgets = this.parseRecipientRegionBudgets(org);
    
    // Parse expenditures
    result.totalExpenditures = this.parseTotalExpenditures(org);
    
    // Parse document links
    result.documentLinks = this.parseDocumentLinks(org);

    return result;
  }

  private extractNarratives(element: Element | null): Array<{ narrative: string; language?: string }> {
    if (!element) return [];
    
    const narratives = element.querySelectorAll('narrative');
    if (narratives.length === 0) {
      // If no narrative elements, check for direct text content
      const text = element.textContent?.trim();
      if (text) {
        return [{ narrative: text }];
      }
      return [];
    }
    
    return Array.from(narratives).map(narrative => ({
      narrative: narrative.textContent?.trim() || '',
      language: narrative.getAttribute('xml:lang') || undefined
    })).filter(n => n.narrative);
  }

  private parseTotalBudgets(org: Element): Array<any> {
    const budgets = org.querySelectorAll('total-budget');
    return Array.from(budgets).map(budget => {
      const value = budget.querySelector('value');
      const periodStart = budget.querySelector('period-start');
      const periodEnd = budget.querySelector('period-end');
      const budgetLines = budget.querySelectorAll('budget-line');
      
      return {
        status: budget.getAttribute('status') || undefined,
        periodStart: periodStart?.getAttribute('iso-date') || undefined,
        periodEnd: periodEnd?.getAttribute('iso-date') || undefined,
        value: value?.textContent ? parseFloat(value.textContent) : undefined,
        currency: value?.getAttribute('currency') || undefined,
        valueDate: value?.getAttribute('value-date') || undefined,
        budgetLines: Array.from(budgetLines).map(line => ({
          ref: line.getAttribute('ref') || undefined,
          value: line.querySelector('value')?.textContent ? parseFloat(line.querySelector('value')!.textContent!) : undefined,
          currency: line.querySelector('value')?.getAttribute('currency') || undefined,
          valueDate: line.querySelector('value')?.getAttribute('value-date') || undefined,
          narrative: this.extractNarratives(line)[0]?.narrative
        }))
      };
    });
  }

  private parseRecipientOrgBudgets(org: Element): Array<any> {
    const budgets = org.querySelectorAll('recipient-org-budget');
    return Array.from(budgets).map(budget => {
      const recipientOrgEl = budget.querySelector('recipient-org');
      const value = budget.querySelector('value');
      const periodStart = budget.querySelector('period-start');
      const periodEnd = budget.querySelector('period-end');
      const budgetLines = budget.querySelectorAll('budget-line');
      
      return {
        status: budget.getAttribute('status') || undefined,
        recipientOrg: recipientOrgEl ? {
          ref: recipientOrgEl.getAttribute('ref') || undefined,
          name: this.extractNarratives(recipientOrgEl)[0]?.narrative
        } : undefined,
        periodStart: periodStart?.getAttribute('iso-date') || undefined,
        periodEnd: periodEnd?.getAttribute('iso-date') || undefined,
        value: value?.textContent ? parseFloat(value.textContent) : undefined,
        currency: value?.getAttribute('currency') || undefined,
        valueDate: value?.getAttribute('value-date') || undefined,
        budgetLines: Array.from(budgetLines).map(line => ({
          ref: line.getAttribute('ref') || undefined,
          value: line.querySelector('value')?.textContent ? parseFloat(line.querySelector('value')!.textContent!) : undefined,
          currency: line.querySelector('value')?.getAttribute('currency') || undefined,
          valueDate: line.querySelector('value')?.getAttribute('value-date') || undefined,
          narrative: this.extractNarratives(line)[0]?.narrative
        }))
      };
    });
  }

  private parseRecipientCountryBudgets(org: Element): Array<any> {
    const budgets = org.querySelectorAll('recipient-country-budget');
    return Array.from(budgets).map(budget => {
      const recipientCountryEl = budget.querySelector('recipient-country');
      const value = budget.querySelector('value');
      const periodStart = budget.querySelector('period-start');
      const periodEnd = budget.querySelector('period-end');
      const budgetLines = budget.querySelectorAll('budget-line');
      
      return {
        status: budget.getAttribute('status') || undefined,
        recipientCountry: recipientCountryEl ? {
          code: recipientCountryEl.getAttribute('code') || undefined
        } : undefined,
        periodStart: periodStart?.getAttribute('iso-date') || undefined,
        periodEnd: periodEnd?.getAttribute('iso-date') || undefined,
        value: value?.textContent ? parseFloat(value.textContent) : undefined,
        currency: value?.getAttribute('currency') || undefined,
        valueDate: value?.getAttribute('value-date') || undefined,
        budgetLines: Array.from(budgetLines).map(line => ({
          ref: line.getAttribute('ref') || undefined,
          value: line.querySelector('value')?.textContent ? parseFloat(line.querySelector('value')!.textContent!) : undefined,
          currency: line.querySelector('value')?.getAttribute('currency') || undefined,
          valueDate: line.querySelector('value')?.getAttribute('value-date') || undefined,
          narrative: this.extractNarratives(line)[0]?.narrative
        }))
      };
    });
  }

  private parseRecipientRegionBudgets(org: Element): Array<any> {
    const budgets = org.querySelectorAll('recipient-region-budget');
    return Array.from(budgets).map(budget => {
      const recipientRegionEl = budget.querySelector('recipient-region');
      const value = budget.querySelector('value');
      const periodStart = budget.querySelector('period-start');
      const periodEnd = budget.querySelector('period-end');
      const budgetLines = budget.querySelectorAll('budget-line');
      
      return {
        status: budget.getAttribute('status') || undefined,
        recipientRegion: recipientRegionEl ? {
          vocabulary: recipientRegionEl.getAttribute('vocabulary') || undefined,
          vocabularyUri: recipientRegionEl.getAttribute('vocabulary-uri') || undefined,
          code: recipientRegionEl.getAttribute('code') || undefined
        } : undefined,
        periodStart: periodStart?.getAttribute('iso-date') || undefined,
        periodEnd: periodEnd?.getAttribute('iso-date') || undefined,
        value: value?.textContent ? parseFloat(value.textContent) : undefined,
        currency: value?.getAttribute('currency') || undefined,
        valueDate: value?.getAttribute('value-date') || undefined,
        budgetLines: Array.from(budgetLines).map(line => ({
          ref: line.getAttribute('ref') || undefined,
          value: line.querySelector('value')?.textContent ? parseFloat(line.querySelector('value')!.textContent!) : undefined,
          currency: line.querySelector('value')?.getAttribute('currency') || undefined,
          valueDate: line.querySelector('value')?.getAttribute('value-date') || undefined,
          narrative: this.extractNarratives(line)[0]?.narrative
        }))
      };
    });
  }

  private parseTotalExpenditures(org: Element): Array<any> {
    const expenditures = org.querySelectorAll('total-expenditure');
    return Array.from(expenditures).map(expenditure => {
      const value = expenditure.querySelector('value');
      const periodStart = expenditure.querySelector('period-start');
      const periodEnd = expenditure.querySelector('period-end');
      const expenseLines = expenditure.querySelectorAll('expense-line');
      
      return {
        periodStart: periodStart?.getAttribute('iso-date') || undefined,
        periodEnd: periodEnd?.getAttribute('iso-date') || undefined,
        value: value?.textContent ? parseFloat(value.textContent) : undefined,
        currency: value?.getAttribute('currency') || undefined,
        valueDate: value?.getAttribute('value-date') || undefined,
        expenseLines: Array.from(expenseLines).map(line => {
          const narratives = this.extractNarratives(line);
          return {
            ref: line.getAttribute('ref') || undefined,
            value: line.querySelector('value')?.textContent ? parseFloat(line.querySelector('value')!.textContent!) : undefined,
            currency: line.querySelector('value')?.getAttribute('currency') || undefined,
            valueDate: line.querySelector('value')?.getAttribute('value-date') || undefined,
            narrative: narratives[0]?.narrative,
            language: narratives[0]?.language || 'en'
          };
        })
      };
    });
  }

  private parseDocumentLinks(org: Element): Array<any> {
    const documentLinks = org.querySelectorAll('document-link');
    return Array.from(documentLinks).map(docLink => {
      const url = docLink.getAttribute('url');
      if (!url) return null;

      const titleEl = docLink.querySelector('title');
      const descriptionEl = docLink.querySelector('description');
      const categories = Array.from(docLink.querySelectorAll('category')).map(cat => cat.getAttribute('code')).filter(Boolean);
      const languages = Array.from(docLink.querySelectorAll('language')).map(lang => lang.getAttribute('code')).filter(Boolean);
      const recipientCountries = Array.from(docLink.querySelectorAll('recipient-country')).map(country => {
        const narratives = this.extractNarratives(country);
        return {
          code: country.getAttribute('code') || '',
          narrative: narratives[0]?.narrative,
          language: narratives[0]?.language || 'en'
        };
      });

      return {
        url,
        format: docLink.getAttribute('format') || undefined,
        documentDate: docLink.querySelector('document-date')?.getAttribute('iso-date') || undefined,
        titles: titleEl ? this.extractNarratives(titleEl) : [],
        descriptions: descriptionEl ? this.extractNarratives(descriptionEl) : [],
        categories,
        languages,
        recipientCountries
      };
    }).filter(Boolean);
  }
}

/**
 * Helper function to parse IATI organization XML content
 */
export function parseIATIOrganization(xmlContent: string): ParsedIATIOrganization {
  const parser = new IATIOrganizationParser(xmlContent);
  return parser.parseOrganization();
}

/**
 * Helper function to validate IATI organization XML structure
 */
export function validateIATIOrganizationXML(xmlContent: string): { isValid: boolean; errors: string[]; summary?: any } {
  try {
    const parser = new IATIOrganizationParser(xmlContent);
    const org = parser.parseOrganization();
    
    const errors: string[] = [];
    
    // Mandatory field validation
    if (!org.identifier) errors.push('Organization identifier is required');
    if (!org.name) errors.push('Organization name is required');
    if (!org.reportingOrg?.ref && !org.reportingOrg?.name) {
      errors.push('Reporting organization reference or name is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      summary: {
        identifier: org.identifier,
        name: org.name,
        hasMultipleLanguages: org.names.length > 1,
        totalBudgets: org.totalBudgets?.length || 0,
        recipientBudgets: (org.recipientOrgBudgets?.length || 0) + (org.recipientCountryBudgets?.length || 0) + (org.recipientRegionBudgets?.length || 0),
        expenditures: org.totalExpenditures?.length || 0,
        documentLinks: org.documentLinks?.length || 0
      }
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
    };
  }
}
