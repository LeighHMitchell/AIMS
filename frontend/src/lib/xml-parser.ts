/**
 * IATI XML Parser for extracting activity data
 */

interface ParsedActivity {
  // Basic Info
  iatiIdentifier?: string;
  title?: string;
  description?: string;
  descriptionObjectives?: string; // IATI description type="1"
  descriptionTargetGroups?: string; // IATI description type="2"  
  descriptionOther?: string; // IATI description type="4"
  activityStatus?: string;
  collaborationType?: string;
  activityScope?: string;
  language?: string;
  defaultCurrency?: string;
  
  // Dates
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  
  // Financial Info
  defaultFinanceType?: string;
  defaultFlowType?: string;
  defaultAidType?: string;
  defaultTiedStatus?: string;
  
  // Locations
  recipientCountries?: Array<{
    code?: string;
    percentage?: number;
    narrative?: string;
  }>;
  recipientRegions?: Array<{
    vocabulary?: string;
    code?: string;
    percentage?: number;
    narrative?: string;
  }>;
  
  // Sectors
  sectors?: Array<{
    vocabulary?: string;
    code?: string;
    percentage?: number;
    narrative?: string;
  }>;
  
  // Organizations/Partners
  reportingOrg?: {
    ref?: string;
    type?: string;
    narrative?: string;
  };
  participatingOrgs?: Array<{
    ref?: string;
    type?: string;
    role?: string;
    narrative?: string;
  }>;
  
  // Results
  results?: Array<{
    type?: string;
    title?: string;
    description?: string;
    indicators?: Array<{
      measure?: string;
      title?: string;
      description?: string;
      baseline?: {
        year?: string;
        value?: string;
        comment?: string;
      };
      targets?: Array<{
        period?: {
          start?: string;
          end?: string;
        };
        value?: string;
        comment?: string;
      }>;
    }>;
  }>;
  
  // Transactions
  transactions?: Array<{
    ref?: string;
    humanitarian?: boolean;
    type?: string;
    date?: string;
    value?: number;
    currency?: string;
    valueDate?: string;
    description?: string;
    providerOrg?: {
      ref?: string;
      type?: string;
      providerActivityId?: string;
      name?: string;
    };
    receiverOrg?: {
      ref?: string;
      type?: string;
      receiverActivityId?: string;
      name?: string;
    };
    disbursementChannel?: string;
    sector?: {
      vocabulary?: string;
      code?: string;
    };
    recipientCountry?: string;
    recipientRegion?: {
      code?: string;
      vocabulary?: string;
    };
    flowType?: string;
    financeType?: string;
    aidType?: {
      code?: string;
      vocabulary?: string;
    };
    tiedStatus?: string;
  }>;
  
  // Policy Markers
  policyMarkers?: Array<{
    vocabulary?: string;
    code?: string;
    significance?: string;
    narrative?: string;
  }>;
  
  // Other Classifications
  tagClassifications?: Array<{
    vocabulary?: string;
    code?: string;
    narrative?: string;
  }>;
  
  // Contact Info
  contactInfo?: Array<{
    type?: string;
    organization?: string;
    department?: string;
    person?: string;
    jobTitle?: string;
    telephone?: string;
    email?: string;
    mailingAddress?: string;
  }>;
  
  // Budgets
  budgets?: Array<{
    type?: string;
    status?: string;
    period?: {
      start?: string;
      end?: string;
    };
    value?: number;
    currency?: string;
    valueDate?: string;
  }>;
  
  plannedDisbursements?: Array<{
    type?: string;
    period?: {
      start?: string;
      end?: string;
    };
    value?: number;
    currency?: string;
    valueDate?: string;
    providerOrg?: {
      ref?: string;
      type?: string;
      providerActivityId?: string;
      name?: string;
    };
    receiverOrg?: {
      ref?: string;
      type?: string;
      receiverActivityId?: string;
      name?: string;
    };
  }>;
}

export class IATIXMLParser {
  private xmlDoc: Document | null = null;

  constructor(xmlContent: string) {
    try {
      // Check if content is HTML instead of XML
      if (xmlContent.trim().startsWith('<!DOCTYPE html') || xmlContent.trim().startsWith('<html')) {
        throw new Error('Received HTML instead of XML. This often happens when the server returns an error page. Please check the file and try again.');
      }
      
      // Check for common HTML patterns that might indicate an error page
      if (xmlContent.includes('<meta') && xmlContent.includes('<head>') && xmlContent.includes('</head>')) {
        throw new Error('The response appears to be an HTML error page. Please ensure you are uploading a valid IATI XML file.');
      }
      
      // Preprocess XML to handle common entity issues
      const preprocessedXml = this.preprocessXmlContent(xmlContent);
      
      const parser = new DOMParser();
      this.xmlDoc = parser.parseFromString(preprocessedXml, 'text/xml');
      
      // Check for parsing errors
      const parseError = this.xmlDoc.querySelector('parsererror');
      if (parseError) {
        // Extract more specific error information
        const errorText = parseError.textContent || '';
        if (errorText.includes('Opening and ending tag mismatch')) {
          throw new Error('XML structure error: Tags are not properly matched. This might indicate the file is corrupted or not a valid XML file.');
        } else if (errorText.includes('meta') && errorText.includes('head')) {
          throw new Error('The file appears to contain HTML content instead of XML. Please ensure you are uploading an IATI XML file.');
        }
        throw new Error('XML parsing error: ' + errorText);
      }
    } catch (error) {
      throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Preprocess XML content to handle common entity and formatting issues
   */
  private preprocessXmlContent(xmlContent: string): string {
    // Replace common HTML entities that aren't defined in XML
    const entityReplacements: { [key: string]: string } = {
      '&middot;': '·',
      '&ndash;': '–',
      '&mdash;': '—',
      '&lsquo;': "'",
      '&rsquo;': "'",
      '&ldquo;': '"',
      '&rdquo;': '"',
      '&hellip;': '…',
      '&nbsp;': ' ',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™'
    };

    let processedContent = xmlContent;
    
    // Replace entities
    for (const [entity, replacement] of Object.entries(entityReplacements)) {
      processedContent = processedContent.replace(new RegExp(entity, 'g'), replacement);
    }

    // Clean up any remaining undefined entities by removing them
    // This regex matches &entityname; patterns that aren't standard XML entities
    processedContent = processedContent.replace(/&(?!lt;|gt;|amp;|quot;|apos;)[a-zA-Z][a-zA-Z0-9]*;/g, '');

    return processedContent;
  }

  /**
   * Extract text content from an element, handling multiple narrative elements
   */
  private extractNarrative(element: Element | null): string | undefined {
    if (!element) return undefined;

    // First try to find narrative child elements
    const narratives = element.querySelectorAll('narrative');
    if (narratives.length > 0) {
      // Use the first English narrative, or first available if no English
      for (let i = 0; i < narratives.length; i++) {
        const narrative = narratives[i];
        const lang = narrative.getAttribute('xml:lang');
        if (!lang || lang === 'en') {
          return narrative.textContent?.trim() || undefined;
        }
      }
      // If no English, return first narrative
      return narratives[0].textContent?.trim() || undefined;
    }

    // If no narrative child, check if element itself has text content
    return element.textContent?.trim() || undefined;
  }

  /**
   * Extract date from activity-date elements
   */
  private extractActivityDate(type: string): string | undefined {
    if (!this.xmlDoc) return undefined;

    const dateElement = this.xmlDoc.querySelector(`iati-activity activity-date[type="${type}"]`);
    if (!dateElement) return undefined;

    return dateElement.getAttribute('iso-date') || undefined;
  }

  /**
   * Parse the main activity data
   */
  public parseActivity(): ParsedActivity {
    if (!this.xmlDoc) {
      throw new Error('No XML document loaded');
    }

    const activity = this.xmlDoc.querySelector('iati-activity');
    if (!activity) {
      throw new Error('No iati-activity element found in XML');
    }

    const result: ParsedActivity = {};

    // === BASIC INFO ===
    
    // IATI Identifier
    const iatiId = activity.querySelector('iati-identifier');
    if (iatiId) {
      result.iatiIdentifier = iatiId.textContent?.trim();
    }

    // Title
    const title = activity.querySelector('title');
    result.title = this.extractNarrative(title);

    // Description
    const description = activity.querySelector('description');
    result.description = this.extractNarrative(description);
    
    // IATI specific description types
    const descriptions = activity.querySelectorAll('description');
    console.log('[XML Parser] Found descriptions:', descriptions.length);
    descriptions.forEach(desc => {
      const type = desc.getAttribute('type');
      const narrative = this.extractNarrative(desc);
      console.log(`[XML Parser] Description type="${type || 'none'}", narrative="${narrative?.substring(0, 100)}..."`);
      if (narrative) {
        switch (type) {
          case '1':
            result.description = narrative; // General activity description
            break;
          case '2':
            result.descriptionObjectives = narrative; // Objectives of the activity
            break;
          case '3':
            result.descriptionTargetGroups = narrative; // Target groups / beneficiaries
            break;
          case '4':
            result.descriptionOther = narrative; // Other description
            break;
          default:
            // If no type attribute, treat as general description
            if (!type && !result.description) {
              result.description = narrative;
            }
        }
      }
    });

    // Activity Status
    const status = activity.querySelector('activity-status');
    if (status) {
      result.activityStatus = status.getAttribute('code') || undefined;
    }

    // Collaboration Type
    const collaborationType = activity.querySelector('collaboration-type');
    if (collaborationType) {
      result.collaborationType = collaborationType.getAttribute('code') || undefined;
    }

    // Activity Scope
    const scope = activity.querySelector('activity-scope');
    if (scope) {
      result.activityScope = scope.getAttribute('code') || undefined;
    }

    // Language (from xml:lang attribute on root activity or from narrative elements)
    result.language = activity.getAttribute('xml:lang') || 
                     activity.getAttribute('default-language') ||
                     undefined;

    // Default Currency
    result.defaultCurrency = activity.getAttribute('default-currency') || undefined;

    // === DATES ===
    result.plannedStartDate = this.extractActivityDate('1'); // Planned start
    result.actualStartDate = this.extractActivityDate('2'); // Actual start
    result.plannedEndDate = this.extractActivityDate('3'); // Planned end
    result.actualEndDate = this.extractActivityDate('4'); // Actual end

    // === FINANCIAL INFO ===
    
    // Default Finance Type
    const defaultFinanceType = activity.querySelector('default-finance-type');
    if (defaultFinanceType) {
      result.defaultFinanceType = defaultFinanceType.getAttribute('code') || undefined;
    }

    // Default Flow Type
    const defaultFlowType = activity.querySelector('default-flow-type');
    if (defaultFlowType) {
      result.defaultFlowType = defaultFlowType.getAttribute('code') || undefined;
    }

    // Default Aid Type
    const defaultAidType = activity.querySelector('default-aid-type');
    if (defaultAidType) {
      result.defaultAidType = defaultAidType.getAttribute('code') || undefined;
    }

    // Default Tied Status
    const defaultTiedStatus = activity.querySelector('default-tied-status');
    if (defaultTiedStatus) {
      result.defaultTiedStatus = defaultTiedStatus.getAttribute('code') || undefined;
    }

    // === LOCATIONS ===
    
    // Recipient Countries - only direct children of activity
    const countries = Array.from(activity.children).filter(child => child.tagName === 'recipient-country');
    if (countries.length > 0) {
      result.recipientCountries = [];
      for (let i = 0; i < countries.length; i++) {
        const country = countries[i];
        result.recipientCountries.push({
          code: country.getAttribute('code') || undefined,
          percentage: country.getAttribute('percentage') ? parseFloat(country.getAttribute('percentage')!) : undefined,
          narrative: this.extractNarrative(country),
        });
      }
    }

    // Recipient Regions - only direct children of activity
    const regions = Array.from(activity.children).filter(child => child.tagName === 'recipient-region');
    if (regions.length > 0) {
      result.recipientRegions = [];
      for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        result.recipientRegions.push({
          vocabulary: region.getAttribute('vocabulary') || undefined,
          code: region.getAttribute('code') || undefined,
          percentage: region.getAttribute('percentage') ? parseFloat(region.getAttribute('percentage')!) : undefined,
          vocabularyUri: region.getAttribute('vocabulary-uri') || undefined,
          narrative: this.extractNarrative(region),
        });
      }
    }

    // === SECTORS ===
    
    // Only get direct child sectors, not those nested in transactions
    const sectors = Array.from(activity.children).filter(child => child.tagName === 'sector');
    if (sectors.length > 0) {
      result.sectors = [];
      for (let i = 0; i < sectors.length; i++) {
        const sector = sectors[i];
        result.sectors.push({
          vocabulary: sector.getAttribute('vocabulary') || undefined,
          code: sector.getAttribute('code') || undefined,
          percentage: sector.getAttribute('percentage') ? parseFloat(sector.getAttribute('percentage')!) : undefined,
          narrative: this.extractNarrative(sector),
        });
      }
    }

    // === ORGANIZATIONS/PARTNERS ===
    
    // Reporting Organization
    const reportingOrg = activity.querySelector('reporting-org');
    if (reportingOrg) {
      result.reportingOrg = {
        ref: reportingOrg.getAttribute('ref') || undefined,
        type: reportingOrg.getAttribute('type') || undefined,
        narrative: this.extractNarrative(reportingOrg),
      };
    }

    // Participating Organizations
    const participatingOrgs = activity.querySelectorAll('participating-org');
    if (participatingOrgs.length > 0) {
      result.participatingOrgs = [];
      for (let i = 0; i < participatingOrgs.length; i++) {
        const org = participatingOrgs[i];
        result.participatingOrgs.push({
          ref: org.getAttribute('ref') || undefined,
          type: org.getAttribute('type') || undefined,
          role: org.getAttribute('role') || undefined,
          narrative: this.extractNarrative(org),
        });
      }
    }

    // === RESULTS ===
    
    const results = activity.querySelectorAll('result');
    if (results.length > 0) {
      result.results = [];
      for (let i = 0; i < results.length; i++) {
        const resultElement = results[i];
        const resultTitle = resultElement.querySelector('title');
        const resultDescription = resultElement.querySelector('description');
        
        const resultData: any = {
          type: resultElement.getAttribute('type') || undefined,
          title: this.extractNarrative(resultTitle),
          description: this.extractNarrative(resultDescription),
        };

        // Parse indicators
        const indicators = resultElement.querySelectorAll('indicator');
        if (indicators.length > 0) {
          resultData.indicators = [];
          for (let j = 0; j < indicators.length; j++) {
            const indicator = indicators[j];
            const indicatorTitle = indicator.querySelector('title');
            const indicatorDescription = indicator.querySelector('description');
            const baseline = indicator.querySelector('baseline');

            const indicatorData: any = {
              measure: indicator.getAttribute('measure') || undefined,
              title: this.extractNarrative(indicatorTitle),
              description: this.extractNarrative(indicatorDescription),
            };

            // Parse baseline
            if (baseline) {
              const baselineComment = baseline.querySelector('comment');
              indicatorData.baseline = {
                year: baseline.getAttribute('year') || undefined,
                value: baseline.getAttribute('value') || undefined,
                comment: this.extractNarrative(baselineComment),
              };
            }

            // Parse targets
            const targets = indicator.querySelectorAll('target');
            if (targets.length > 0) {
              indicatorData.targets = [];
              for (let k = 0; k < targets.length; k++) {
                const target = targets[k];
                const period = target.querySelector('period');
                const targetComment = target.querySelector('comment');

                const targetData: any = {
                  value: target.getAttribute('value') || undefined,
                  comment: this.extractNarrative(targetComment),
                };

                if (period) {
                  const periodStart = period.querySelector('period-start');
                  const periodEnd = period.querySelector('period-end');
                  targetData.period = {
                    start: periodStart?.getAttribute('iso-date') || undefined,
                    end: periodEnd?.getAttribute('iso-date') || undefined,
                  };
                }

                indicatorData.targets.push(targetData);
              }
            }

            resultData.indicators.push(indicatorData);
          }
        }

        result.results.push(resultData);
      }
    }

    // === TRANSACTIONS ===
    
    const transactions = activity.querySelectorAll('transaction');
    if (transactions.length > 0) {
      result.transactions = [];
      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        const transactionType = transaction.querySelector('transaction-type');
        const transactionDate = transaction.querySelector('transaction-date');
        const value = transaction.querySelector('value');
        const description = transaction.querySelector('description');
        const providerOrg = transaction.querySelector('provider-org');
        const receiverOrg = transaction.querySelector('receiver-org');
        const disbursementChannel = transaction.querySelector('disbursement-channel');
        const sector = transaction.querySelector('sector');
        const recipientCountry = transaction.querySelector('recipient-country');
        const recipientRegion = transaction.querySelector('recipient-region');
        const flowType = transaction.querySelector('flow-type');
        const financeType = transaction.querySelector('finance-type');
        const aidType = transaction.querySelector('aid-type');
        const tiedStatus = transaction.querySelector('tied-status');

        const transactionData: any = {
          ref: transaction.getAttribute('ref') || undefined,
          humanitarian: transaction.getAttribute('humanitarian') === '1' || transaction.getAttribute('humanitarian') === 'true',
          type: transactionType?.getAttribute('code') || undefined,
          date: transactionDate?.getAttribute('iso-date') || undefined,
          value: value?.textContent ? parseFloat(value.textContent) : undefined,
          currency: value?.getAttribute('currency') || undefined,
          valueDate: value?.getAttribute('value-date') || undefined,
          description: this.extractNarrative(description),
          disbursementChannel: disbursementChannel?.getAttribute('code') || undefined,
          recipientCountry: recipientCountry?.getAttribute('code') || undefined,
          flowType: flowType?.getAttribute('code') || undefined,
          financeType: financeType?.getAttribute('code') || undefined,
          tiedStatus: tiedStatus?.getAttribute('code') || undefined,
        };

        if (providerOrg) {
          transactionData.providerOrg = {
            ref: providerOrg.getAttribute('ref') || undefined,
            type: providerOrg.getAttribute('type') || undefined,
            providerActivityId: providerOrg.getAttribute('provider-activity-id') || undefined,
            name: this.extractNarrative(providerOrg),
          };
        }

        if (receiverOrg) {
          transactionData.receiverOrg = {
            ref: receiverOrg.getAttribute('ref') || undefined,
            type: receiverOrg.getAttribute('type') || undefined,
            receiverActivityId: receiverOrg.getAttribute('receiver-activity-id') || undefined,
            name: this.extractNarrative(receiverOrg),
          };
        }

        if (sector) {
          transactionData.sector = {
            vocabulary: sector.getAttribute('vocabulary') || undefined,
            code: sector.getAttribute('code') || undefined,
          };
        }

        if (recipientRegion) {
          transactionData.recipientRegion = {
            code: recipientRegion.getAttribute('code') || undefined,
            vocabulary: recipientRegion.getAttribute('vocabulary') || undefined,
          };
        }

        if (aidType) {
          transactionData.aidType = {
            code: aidType.getAttribute('code') || undefined,
            vocabulary: aidType.getAttribute('vocabulary') || undefined,
          };
        }

        result.transactions.push(transactionData);
      }
    }

    // === POLICY MARKERS ===
    
    const policyMarkers = activity.querySelectorAll('policy-marker');
    if (policyMarkers.length > 0) {
      result.policyMarkers = [];
      for (let i = 0; i < policyMarkers.length; i++) {
        const marker = policyMarkers[i];
        result.policyMarkers.push({
          vocabulary: marker.getAttribute('vocabulary') || undefined,
          code: marker.getAttribute('code') || undefined,
          significance: marker.getAttribute('significance') || undefined,
          narrative: this.extractNarrative(marker),
        });
      }
    }

    // === TAG CLASSIFICATIONS ===
    
    const tags = activity.querySelectorAll('tag');
    if (tags.length > 0) {
      result.tagClassifications = [];
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        result.tagClassifications.push({
          vocabulary: tag.getAttribute('vocabulary') || undefined,
          code: tag.getAttribute('code') || undefined,
          narrative: this.extractNarrative(tag),
        });
      }
    }

    // === CONTACT INFO ===
    
    const contactInfos = activity.querySelectorAll('contact-info');
    if (contactInfos.length > 0) {
      result.contactInfo = [];
      for (let i = 0; i < contactInfos.length; i++) {
        const contact = contactInfos[i];
        const organization = contact.querySelector('organisation');
        const department = contact.querySelector('department');
        const person = contact.querySelector('person-name');
        const jobTitle = contact.querySelector('job-title');
        const telephone = contact.querySelector('telephone');
        const email = contact.querySelector('email');
        const mailingAddress = contact.querySelector('mailing-address');

        result.contactInfo.push({
          type: contact.getAttribute('type') || undefined,
          organization: this.extractNarrative(organization),
          department: this.extractNarrative(department),
          person: this.extractNarrative(person),
          jobTitle: this.extractNarrative(jobTitle),
          telephone: telephone?.textContent?.trim() || undefined,
          email: email?.textContent?.trim() || undefined,
          mailingAddress: this.extractNarrative(mailingAddress),
        });
      }
    }

    // === BUDGETS ===
    
    const budgets = activity.querySelectorAll('budget');
    if (budgets.length > 0) {
      result.budgets = [];
      for (let i = 0; i < budgets.length; i++) {
        const budget = budgets[i];
        const value = budget.querySelector('value');
        const period = budget.querySelector('period');

        const budgetData: any = {
          type: budget.getAttribute('type') || undefined,
          status: budget.getAttribute('status') || undefined,
          value: value?.textContent ? parseFloat(value.textContent) : undefined,
          currency: value?.getAttribute('currency') || undefined,
          valueDate: value?.getAttribute('value-date') || undefined,
        };

        if (period) {
          const periodStart = period.querySelector('period-start');
          const periodEnd = period.querySelector('period-end');
          budgetData.period = {
            start: periodStart?.getAttribute('iso-date') || undefined,
            end: periodEnd?.getAttribute('iso-date') || undefined,
          };
        }

        result.budgets.push(budgetData);
      }
    }

    // === PLANNED DISBURSEMENTS ===
    
    const plannedDisbursements = activity.querySelectorAll('planned-disbursement');
    if (plannedDisbursements.length > 0) {
      result.plannedDisbursements = [];
      for (let i = 0; i < plannedDisbursements.length; i++) {
        const disbursement = plannedDisbursements[i];
        const value = disbursement.querySelector('value');
        const period = disbursement.querySelector('period');
        const providerOrg = disbursement.querySelector('provider-org');
        const receiverOrg = disbursement.querySelector('receiver-org');

        const disbursementData: any = {
          type: disbursement.getAttribute('type') || undefined,
          value: value?.textContent ? parseFloat(value.textContent) : undefined,
          currency: value?.getAttribute('currency') || undefined,
          valueDate: value?.getAttribute('value-date') || undefined,
        };

        if (period) {
          const periodStart = period.querySelector('period-start');
          const periodEnd = period.querySelector('period-end');
          disbursementData.period = {
            start: periodStart?.getAttribute('iso-date') || undefined,
            end: periodEnd?.getAttribute('iso-date') || undefined,
          };
        }

        if (providerOrg) {
          disbursementData.providerOrg = {
            ref: providerOrg.getAttribute('ref') || undefined,
            type: providerOrg.getAttribute('type') || undefined,
            providerActivityId: providerOrg.getAttribute('provider-activity-id') || undefined,
            name: this.extractNarrative(providerOrg),
          };
        }

        if (receiverOrg) {
          disbursementData.receiverOrg = {
            ref: receiverOrg.getAttribute('ref') || undefined,
            type: receiverOrg.getAttribute('type') || undefined,
            receiverActivityId: receiverOrg.getAttribute('receiver-activity-id') || undefined,
            name: this.extractNarrative(receiverOrg),
          };
        }

        result.plannedDisbursements.push(disbursementData);
      }
    }

    return result;
  }

  /**
   * Get validation errors for the XML structure
   */
  public validateStructure(): string[] {
    const errors: string[] = [];

    if (!this.xmlDoc) {
      errors.push('No XML document loaded');
      return errors;
    }

    // Check for root element
    const activities = this.xmlDoc.querySelectorAll('iati-activities');
    const singleActivity = this.xmlDoc.querySelectorAll('iati-activity');

    if (activities.length === 0 && singleActivity.length === 0) {
      errors.push('No iati-activities or iati-activity root element found');
    }

    if (activities.length > 0 && singleActivity.length === 0) {
      errors.push('iati-activities element found but no iati-activity children');
    }

    if (singleActivity.length > 1) {
      errors.push('Multiple iati-activity elements found. This parser only supports single activity files.');
    }

    // Check for required elements
    const activity = this.xmlDoc.querySelector('iati-activity');
    if (activity) {
      const iatiId = activity.querySelector('iati-identifier');
      if (!iatiId || !iatiId.textContent?.trim()) {
        errors.push('Missing or empty iati-identifier');
      }

      const title = activity.querySelector('title');
      if (!title || !this.extractNarrative(title)) {
        errors.push('Missing or empty title');
      }
    }

    return errors;
  }

  /**
   * Get a summary of what was found in the XML
   */
  public getSummary(): { [key: string]: any } {
    try {
      const activity = this.parseActivity();
      return {
        hasIdentifier: !!activity.iatiIdentifier,
        hasTitle: !!activity.title,
        hasDescription: !!activity.description,
        hasDescriptionObjectives: !!activity.descriptionObjectives,
        hasDescriptionTargetGroups: !!activity.descriptionTargetGroups,
        hasDescriptionOther: !!activity.descriptionOther,
        hasStatus: !!activity.activityStatus,
        hasCollaborationType: !!activity.collaborationType,
        hasPlannedDates: !!(activity.plannedStartDate || activity.plannedEndDate),
        hasActualDates: !!(activity.actualStartDate || activity.actualEndDate),
        sectorCount: activity.sectors?.length || 0,
        countryCount: activity.recipientCountries?.length || 0,
        transactionCount: activity.transactions?.length || 0,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown parsing error'
      };
    }
  }
}

/**
 * Helper function to create a parser instance and parse activity
 */
export function parseIATIActivity(xmlContent: string): ParsedActivity {
  const parser = new IATIXMLParser(xmlContent);
  return parser.parseActivity();
}

/**
 * Helper function to validate IATI XML structure
 */
export function validateIATIXML(xmlContent: string): { isValid: boolean; errors: string[]; summary?: any } {
  try {
    const parser = new IATIXMLParser(xmlContent);
    const errors = parser.validateStructure();
    const summary = parser.getSummary();
    
    return {
      isValid: errors.length === 0,
      errors,
      summary
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}