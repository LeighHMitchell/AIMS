/**
 * IATI XML Parser for extracting activity data
 */

interface ParsedActivity {
  // Basic Info
  iatiIdentifier?: string;
  otherIdentifier?: string; // Other identifier (e.g., internal project ID)
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
  crsChannelCode?: string; // CRS Channel Code
  
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
  capitalSpendPercentage?: number;
  
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
  
  // Detailed Location Data (IATI location elements)
  locations?: Array<{
    ref?: string;
    locationReach?: string;
    locationId?: {
      vocabulary?: string;
      code?: string;
    };
    name?: string;
    description?: string;
    activityDescription?: string;
    administrative?: {
      vocabulary?: string;
      level?: string;
      code?: string;
    };
    point?: {
      srsName?: string;
      pos?: string;  // "latitude longitude"
    };
    exactness?: string;
    locationClass?: string;
    featureDesignation?: string;
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
    activityId?: string;
    crsChannelCode?: string;
    narrativeLang?: string;
  }>;
  
  // Other Identifiers
  otherIdentifiers?: Array<{
    ref?: string;
    type?: string;
    ownerOrg?: {
      ref?: string;
      narrative?: string;
    };
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
    vocabulary_uri?: string;
    code?: string;
    significance?: string;
    narrative?: string;
  }>;
  
  // Other Classifications
  tagClassifications?: Array<{
    vocabulary?: string;
    vocabularyUri?: string;
    code?: string;
    narrative?: string;
  }>;
  
  // Conditions
  conditions?: {
    attached: boolean;
    conditions: Array<{
      type?: string;
      narrative?: string;
      narrativeLang?: string;
    }>;
  };
  
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
  
  // Country Budget Items
  countryBudgetItems?: Array<{
    vocabulary?: string;
    budgetItems?: Array<{
      code?: string;
      percentage?: number;
      description?: {
        [lang: string]: string;
      };
    }>;
  }>;
}

export class IATIXMLParser {
  private xmlDoc: Document | null = null;

  constructor(xmlContent: string) {
    try {
      // Check if content is empty or too short
      if (!xmlContent || xmlContent.trim().length === 0) {
        throw new Error('The file appears to be empty. Please ensure you are uploading a valid IATI XML file.');
      }
      
      // Check file size (warn if very large)
      if (xmlContent.length > 50 * 1024 * 1024) { // 50MB
        console.warn('[XML Parser] Large file detected:', xmlContent.length, 'bytes');
      }
      
      // Check if content is HTML instead of XML
      if (xmlContent.trim().startsWith('<!DOCTYPE html') || xmlContent.trim().startsWith('<html')) {
        throw new Error('Received HTML instead of XML. This often happens when the server returns an error page. Please check the file and try again.');
      }
      
      // Check for common HTML patterns that might indicate an error page
      if (xmlContent.includes('<meta') && xmlContent.includes('<head>') && xmlContent.includes('</head>')) {
        throw new Error('The response appears to be an HTML error page. Please ensure you are uploading a valid IATI XML file.');
      }
      
      // Check for basic XML structure
      if (!xmlContent.includes('<') || !xmlContent.includes('>')) {
        throw new Error('The file does not appear to contain valid XML content. Please ensure you are uploading an IATI XML file.');
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
        } else if (errorText.includes('I/O read operation failed')) {
          throw new Error('File read error: The XML file may be corrupted, too large, or contain invalid characters. Please try a different file or check the file format.');
        }
        throw new Error('XML parsing error: ' + errorText);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('I/O read operation failed')) {
        throw new Error('File read error: The XML file may be corrupted, too large, or contain invalid characters. Please try a different file or check the file format.');
      }
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
    
    // Remove BOM if present
    if (processedContent.charCodeAt(0) === 0xFEFF) {
      processedContent = processedContent.slice(1);
    }
    
    // Normalize line endings
    processedContent = processedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Replace entities
    for (const [entity, replacement] of Object.entries(entityReplacements)) {
      processedContent = processedContent.replace(new RegExp(entity, 'g'), replacement);
    }

    // Clean up any remaining undefined entities by removing them
    // This regex matches &entityname; patterns that aren't standard XML entities
    processedContent = processedContent.replace(/&(?!lt;|gt;|amp;|quot;|apos;)[a-zA-Z][a-zA-Z0-9]*;/g, '');

    // Remove any null bytes or other problematic characters
    processedContent = processedContent.replace(/\0/g, '');

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

    // Other Identifier
    const otherId = activity.querySelector('other-identifier');
    if (otherId) {
      result.otherIdentifier = otherId.textContent?.trim();
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

    // Capital Spend Percentage
    const capitalSpend = activity.querySelector('capital-spend');
    if (capitalSpend) {
      const percentage = capitalSpend.getAttribute('percentage');
      if (percentage) {
        const numValue = parseFloat(percentage);
        // Validate that it's a number and within range 0-100
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
          // Round to 2 decimal places for consistency with DECIMAL(5,2)
          result.capitalSpendPercentage = Math.round(numValue * 100) / 100;
        } else if (!isNaN(numValue)) {
          console.warn(`[XML Parser] Capital spend percentage ${numValue} is out of valid range (0-100), ignoring value`);
        }
      }
    }

    // CRS Channel Code
    const crsChannelCode = activity.querySelector('crs-add');
    if (crsChannelCode) {
      const channelCode = crsChannelCode.querySelector('channel-code');
      if (channelCode) {
        result.crsChannelCode = channelCode.textContent?.trim();
      }
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

    // Detailed Locations - only direct children of activity (not nested in transactions/results)
    const locationElements = Array.from(activity.children).filter(child => child.tagName === 'location');
    if (locationElements.length > 0) {
      result.locations = [];
      for (let i = 0; i < locationElements.length; i++) {
        const location = locationElements[i];
        const locationName = location.querySelector('name');
        const locationDesc = location.querySelector('description');
        const activityDesc = location.querySelector('activity-description');
        const locationReach = location.querySelector('location-reach');
        const locationId = location.querySelector('location-id');
        const administrative = location.querySelector('administrative');
        const point = location.querySelector('point');
        const exactness = location.querySelector('exactness');
        const locationClass = location.querySelector('location-class');
        const featureDesignation = location.querySelector('feature-designation');

        const locationData: any = {
          ref: location.getAttribute('ref') || undefined,
          name: this.extractNarrative(locationName),
          description: this.extractNarrative(locationDesc),
          activityDescription: this.extractNarrative(activityDesc),
          locationReach: locationReach?.getAttribute('code') || undefined,
          exactness: exactness?.getAttribute('code') || undefined,
          locationClass: locationClass?.getAttribute('code') || undefined,
          featureDesignation: featureDesignation?.getAttribute('code') || undefined,
        };

        // Location ID (gazetteer reference)
        if (locationId) {
          locationData.locationId = {
            vocabulary: locationId.getAttribute('vocabulary') || undefined,
            code: locationId.getAttribute('code') || undefined,
          };
        }

        // Administrative divisions
        if (administrative) {
          locationData.administrative = {
            vocabulary: administrative.getAttribute('vocabulary') || undefined,
            level: administrative.getAttribute('level') || undefined,
            code: administrative.getAttribute('code') || undefined,
          };
        }

        // Point coordinates
        if (point) {
          const pos = point.querySelector('pos');
          if (pos && pos.textContent) {
            locationData.point = {
              srsName: point.getAttribute('srsName') || 'http://www.opengis.net/def/crs/EPSG/0/4326',
              pos: pos.textContent.trim(),
            };
          }
        }

        result.locations.push(locationData);
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
        
        // Get ALL narratives including multilingual ones
        const narrativeElements = org.querySelectorAll('narrative');
        let primaryNarrative = '';
        let narrativeLang = 'en';
        const multilingualNarratives: Array<{ lang: string; text: string }> = [];
        
        if (narrativeElements.length > 0) {
          // Try to find narrative without xml:lang first (primary)
          let foundPrimary = false;
          for (let j = 0; j < narrativeElements.length; j++) {
            const narrative = narrativeElements[j];
            const lang = narrative.getAttribute('xml:lang');
            const text = narrative.textContent?.trim() || '';
            
            if (!lang || lang === 'en') {
              if (!foundPrimary) {
                primaryNarrative = text;
                narrativeLang = lang || 'en';
                foundPrimary = true;
              }
            } else {
              // Add non-English narratives to multilingual array
              if (text) {
                multilingualNarratives.push({ lang, text });
              }
            }
          }
          
          // If no primary found, use the first one
          if (!foundPrimary && narrativeElements.length > 0) {
            primaryNarrative = narrativeElements[0].textContent?.trim() || '';
            narrativeLang = narrativeElements[0].getAttribute('xml:lang') || 'en';
          }
        }
        
        console.log('[XML Parser] Participating org:', org.getAttribute('ref'), 'Multilingual narratives:', multilingualNarratives);
        
        result.participatingOrgs.push({
          ref: org.getAttribute('ref') || undefined,
          type: org.getAttribute('type') || undefined,
          role: org.getAttribute('role') || undefined,
          activityId: org.getAttribute('activity-id') || undefined,
          crsChannelCode: org.getAttribute('crs-channel-code') || undefined,
          narrative: primaryNarrative || undefined,
          narrativeLang: narrativeLang,
          narratives: multilingualNarratives.length > 0 ? multilingualNarratives : undefined,
        });
      }
    }

    // === OTHER IDENTIFIERS ===
    
    // Parse other-identifier elements with their owner-org data
    const otherIdentifiers = activity.querySelectorAll('other-identifier');
    if (otherIdentifiers.length > 0) {
      result.otherIdentifiers = [];
      
      for (let i = 0; i < otherIdentifiers.length; i++) {
        const otherIdElement = otherIdentifiers[i];
        const ownerOrg = otherIdElement.querySelector('owner-org');
        
        const otherIdentifierData: any = {
          ref: otherIdElement.getAttribute('ref') || undefined,
          type: otherIdElement.getAttribute('type') || undefined,
        };
        
        // Parse owner-org if present
        if (ownerOrg) {
          otherIdentifierData.ownerOrg = {
            ref: ownerOrg.getAttribute('ref') || undefined,
            narrative: this.extractNarrative(ownerOrg) || undefined,
          };
          
          console.log('[XML Parser] Other-identifier with owner-org:', {
            identifierRef: otherIdentifierData.ref,
            identifierType: otherIdentifierData.type,
            ownerOrgRef: otherIdentifierData.ownerOrg.ref,
            ownerOrgNarrative: otherIdentifierData.ownerOrg.narrative
          });
        }
        
        result.otherIdentifiers.push(otherIdentifierData);
      }
    }

    // === RESULTS (IATI v2.03 Compliant) ===
    
    const results = activity.querySelectorAll('result');
    if (results.length > 0) {
      result.results = [];
      for (let i = 0; i < results.length; i++) {
        const resultElement = results[i];
        const resultTitle = resultElement.querySelector('title');
        const resultDescription = resultElement.querySelector('description');
        
        // Map IATI result type codes to our internal types
        const resultTypeCode = resultElement.getAttribute('type') || '1';
        const resultTypeMap: Record<string, string> = {
          '1': 'output',
          '2': 'outcome',
          '3': 'impact',
          '9': 'other'
        };
        
        const resultData: any = {
          type: resultTypeMap[resultTypeCode] || 'output',
          aggregation_status: resultElement.getAttribute('aggregation-status') === '1',
          title: this.extractNarrative(resultTitle),
          description: this.extractNarrative(resultDescription),
          references: [],
          document_links: []
        };

        // Parse result-level references
        const resultReferences = resultElement.querySelectorAll(':scope > reference');
        for (let j = 0; j < resultReferences.length; j++) {
          const ref = resultReferences[j];
          const vocabulary = ref.getAttribute('vocabulary');
          const code = ref.getAttribute('code');
          
          // Only include references with valid vocabulary and code
          if (vocabulary && code) {
            resultData.references.push({
              vocabulary: vocabulary,
              code: code,
              vocabulary_uri: ref.getAttribute('vocabulary-uri') || undefined
            });
          }
        }

        // Parse result-level document-links
        const resultDocLinks = resultElement.querySelectorAll(':scope > document-link');
        for (let j = 0; j < resultDocLinks.length; j++) {
          const docLink = resultDocLinks[j];
          const docTitle = docLink.querySelector('title');
          const docDescription = docLink.querySelector('description');
          const docCategory = docLink.querySelector('category');
          const docLanguage = docLink.querySelector('language');
          const docDate = docLink.querySelector('document-date');
          
          const url = docLink.getAttribute('url');
          
          // Only include document links with valid URLs
          if (url && url.trim()) {
            // Fix common URL issues (like missing // after http:)
            let fixedUrl = url.trim();
            if (fixedUrl.startsWith('http:') && !fixedUrl.startsWith('http://')) {
              fixedUrl = fixedUrl.replace('http:', 'http://');
            }
            if (fixedUrl.startsWith('https:') && !fixedUrl.startsWith('https://')) {
              fixedUrl = fixedUrl.replace('https:', 'https://');
            }
            
            resultData.document_links.push({
              format: docLink.getAttribute('format') || undefined,
              url: fixedUrl,
              title: this.extractNarrative(docTitle),
              description: this.extractNarrative(docDescription),
              category_code: docCategory?.getAttribute('code') || undefined,
              language_code: docLanguage?.getAttribute('code') || 'en',
              document_date: docDate?.getAttribute('iso-date') || undefined
            });
          }
        }

        // Parse indicators
        const indicators = resultElement.querySelectorAll('indicator');
        if (indicators.length > 0) {
          resultData.indicators = [];
          for (let j = 0; j < indicators.length; j++) {
            const indicator = indicators[j];
            const indicatorTitle = indicator.querySelector('title');
            const indicatorDescription = indicator.querySelector('description');
            
            // Map IATI measure codes to our internal types
            const measureCode = indicator.getAttribute('measure') || '1';
            const measureMap: Record<string, string> = {
              '1': 'unit',
              '2': 'percentage',
              '3': 'qualitative',
              '4': 'qualitative',
              '5': 'qualitative'
            };

            const indicatorData: any = {
              measure: measureMap[measureCode] || 'unit',
              ascending: indicator.getAttribute('ascending') === '1' || indicator.getAttribute('ascending') === 'true',
              aggregation_status: indicator.getAttribute('aggregation-status') === '1',
              title: this.extractNarrative(indicatorTitle),
              description: this.extractNarrative(indicatorDescription),
              references: [],
              document_links: []
            };

            // Parse indicator-level references
            const indicatorReferences = indicator.querySelectorAll(':scope > reference');
            for (let k = 0; k < indicatorReferences.length; k++) {
              const ref = indicatorReferences[k];
              indicatorData.references.push({
                vocabulary: ref.getAttribute('vocabulary') || '',
                code: ref.getAttribute('code') || '',
                vocabulary_uri: ref.getAttribute('vocabulary-uri') || undefined,
                indicator_uri: ref.getAttribute('indicator-uri') || undefined
              });
            }

            // Parse indicator-level document-links
            const indicatorDocLinks = indicator.querySelectorAll(':scope > document-link');
            for (let k = 0; k < indicatorDocLinks.length; k++) {
              const docLink = indicatorDocLinks[k];
              const docTitle = docLink.querySelector('title');
              const docDescription = docLink.querySelector('description');
              const docCategory = docLink.querySelector('category');
              const docLanguage = docLink.querySelector('language');
              const docDate = docLink.querySelector('document-date');
              
              indicatorData.document_links.push({
                format: docLink.getAttribute('format') || undefined,
                url: docLink.getAttribute('url') || '',
                title: this.extractNarrative(docTitle),
                description: this.extractNarrative(docDescription),
                category_code: docCategory?.getAttribute('code') || undefined,
                language_code: docLanguage?.getAttribute('code') || 'en',
                document_date: docDate?.getAttribute('iso-date') || undefined
              });
            }

            // Parse baseline
            const baseline = indicator.querySelector('baseline');
            if (baseline) {
              const baselineComment = baseline.querySelector('comment');
              indicatorData.baseline = {
                baseline_year: baseline.getAttribute('year') ? parseInt(baseline.getAttribute('year')!) : undefined,
                iso_date: baseline.getAttribute('iso-date') || undefined,
                value: baseline.getAttribute('value') ? parseFloat(baseline.getAttribute('value')!) : undefined,
                comment: this.extractNarrative(baselineComment),
                locations: [],
                dimensions: [],
                document_links: []
              };

              // Parse baseline locations
              const baselineLocations = baseline.querySelectorAll('location');
              for (let k = 0; k < baselineLocations.length; k++) {
                const loc = baselineLocations[k];
                indicatorData.baseline.locations.push({
                  location_ref: loc.getAttribute('ref') || ''
                });
              }

              // Parse baseline dimensions
              const baselineDimensions = baseline.querySelectorAll('dimension');
              for (let k = 0; k < baselineDimensions.length; k++) {
                const dim = baselineDimensions[k];
                indicatorData.baseline.dimensions.push({
                  name: dim.getAttribute('name') || '',
                  value: dim.getAttribute('value') || '',
                  dimension_type: 'baseline'
                });
              }

              // Parse baseline document-links
              const baselineDocLinks = baseline.querySelectorAll('document-link');
              for (let k = 0; k < baselineDocLinks.length; k++) {
                const docLink = baselineDocLinks[k];
                const docTitle = docLink.querySelector('title');
                const docDescription = docLink.querySelector('description');
                const docCategory = docLink.querySelector('category');
                const docLanguage = docLink.querySelector('language');
                const docDate = docLink.querySelector('document-date');
                
                indicatorData.baseline.document_links.push({
                  format: docLink.getAttribute('format') || undefined,
                  url: docLink.getAttribute('url') || '',
                  title: this.extractNarrative(docTitle),
                  description: this.extractNarrative(docDescription),
                  category_code: docCategory?.getAttribute('code') || undefined,
                  language_code: docLanguage?.getAttribute('code') || 'en',
                  document_date: docDate?.getAttribute('iso-date') || undefined
                });
              }
            }

            // Parse periods (CRITICAL: IATI has <period> elements, not <target> at top level)
            const periods = indicator.querySelectorAll('period');
            if (periods.length > 0) {
              indicatorData.periods = [];
              for (let k = 0; k < periods.length; k++) {
                const period = periods[k];
                const periodStart = period.querySelector('period-start');
                const periodEnd = period.querySelector('period-end');
                const target = period.querySelector('target');
                const actual = period.querySelector('actual');

                const periodData: any = {
                  period_start: periodStart?.getAttribute('iso-date') || '',
                  period_end: periodEnd?.getAttribute('iso-date') || '',
                  target_locations: [],
                  actual_locations: [],
                  target_dimensions: [],
                  actual_dimensions: [],
                  target_document_links: [],
                  actual_document_links: []
                };

                // Parse target data
                if (target) {
                  periodData.target_value = target.getAttribute('value') ? parseFloat(target.getAttribute('value')!) : undefined;
                  const targetComment = target.querySelector('comment');
                  periodData.target_comment = this.extractNarrative(targetComment);

                  // Parse target locations
                  const targetLocations = target.querySelectorAll('location');
                  for (let l = 0; l < targetLocations.length; l++) {
                    const loc = targetLocations[l];
                    periodData.target_locations.push({
                      location_ref: loc.getAttribute('ref') || '',
                      location_type: 'target'
                    });
                  }

                  // Parse target dimensions
                  const targetDimensions = target.querySelectorAll('dimension');
                  for (let l = 0; l < targetDimensions.length; l++) {
                    const dim = targetDimensions[l];
                    periodData.target_dimensions.push({
                      name: dim.getAttribute('name') || '',
                      value: dim.getAttribute('value') || '',
                      dimension_type: 'target'
                    });
                  }

                  // Parse target document-links
                  const targetDocLinks = target.querySelectorAll('document-link');
                  for (let l = 0; l < targetDocLinks.length; l++) {
                    const docLink = targetDocLinks[l];
                    const docTitle = docLink.querySelector('title');
                    const docDescription = docLink.querySelector('description');
                    const docCategory = docLink.querySelector('category');
                    const docLanguage = docLink.querySelector('language');
                    const docDate = docLink.querySelector('document-date');
                    
                    periodData.target_document_links.push({
                      format: docLink.getAttribute('format') || undefined,
                      url: docLink.getAttribute('url') || '',
                      title: this.extractNarrative(docTitle),
                      description: this.extractNarrative(docDescription),
                      category_code: docCategory?.getAttribute('code') || undefined,
                      language_code: docLanguage?.getAttribute('code') || 'en',
                      document_date: docDate?.getAttribute('iso-date') || undefined,
                      link_type: 'target'
                    });
                  }
                }

                // Parse actual data
                if (actual) {
                  periodData.actual_value = actual.getAttribute('value') ? parseFloat(actual.getAttribute('value')!) : undefined;
                  const actualComment = actual.querySelector('comment');
                  periodData.actual_comment = this.extractNarrative(actualComment);

                  // Parse actual locations
                  const actualLocations = actual.querySelectorAll('location');
                  for (let l = 0; l < actualLocations.length; l++) {
                    const loc = actualLocations[l];
                    periodData.actual_locations.push({
                      location_ref: loc.getAttribute('ref') || '',
                      location_type: 'actual'
                    });
                  }

                  // Parse actual dimensions
                  const actualDimensions = actual.querySelectorAll('dimension');
                  for (let l = 0; l < actualDimensions.length; l++) {
                    const dim = actualDimensions[l];
                    periodData.actual_dimensions.push({
                      name: dim.getAttribute('name') || '',
                      value: dim.getAttribute('value') || '',
                      dimension_type: 'actual'
                    });
                  }

                  // Parse actual document-links
                  const actualDocLinks = actual.querySelectorAll('document-link');
                  for (let l = 0; l < actualDocLinks.length; l++) {
                    const docLink = actualDocLinks[l];
                    const docTitle = docLink.querySelector('title');
                    const docDescription = docLink.querySelector('description');
                    const docCategory = docLink.querySelector('category');
                    const docLanguage = docLink.querySelector('language');
                    const docDate = docLink.querySelector('document-date');
                    
                    periodData.actual_document_links.push({
                      format: docLink.getAttribute('format') || undefined,
                      url: docLink.getAttribute('url') || '',
                      title: this.extractNarrative(docTitle),
                      description: this.extractNarrative(docDescription),
                      category_code: docCategory?.getAttribute('code') || undefined,
                      language_code: docLanguage?.getAttribute('code') || 'en',
                      document_date: docDate?.getAttribute('iso-date') || undefined,
                      link_type: 'actual'
                    });
                  }
                }

                indicatorData.periods.push(periodData);
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
          // NEW: Add activity ID link to transaction data
          transactionData.provider_org_activity_id = providerOrg.getAttribute('provider-activity-id') || undefined;
        }

        if (receiverOrg) {
          transactionData.receiverOrg = {
            ref: receiverOrg.getAttribute('ref') || undefined,
            type: receiverOrg.getAttribute('type') || undefined,
            receiverActivityId: receiverOrg.getAttribute('receiver-activity-id') || undefined,
            name: this.extractNarrative(receiverOrg),
          };
          // NEW: Add activity ID link to transaction data
          transactionData.receiver_org_activity_id = receiverOrg.getAttribute('receiver-activity-id') || undefined;
        }

        // NEW: Parse multiple sectors (IATI compliant)
        const sectorElements = Array.from(transaction.querySelectorAll('sector'));
        if (sectorElements.length > 0) {
          transactionData.sectors = sectorElements.map(s => ({
            code: s.getAttribute('code') || '',
            vocabulary: s.getAttribute('vocabulary') || '1',
            percentage: s.getAttribute('percentage') ? parseFloat(s.getAttribute('percentage')!) : undefined,
            narrative: this.extractNarrative(s),
          }));
        }
        // Keep backward compatibility with single sector
        if (sector) {
          transactionData.sector = {
            vocabulary: sector.getAttribute('vocabulary') || undefined,
            code: sector.getAttribute('code') || undefined,
          };
        }

        // NEW: Parse multiple recipient regions
        const recipientRegionElements = Array.from(transaction.querySelectorAll('recipient-region'));
        if (recipientRegionElements.length > 0) {
          transactionData.recipient_regions = recipientRegionElements.map(r => ({
            code: r.getAttribute('code') || '',
            vocabulary: r.getAttribute('vocabulary') || '1',
            percentage: r.getAttribute('percentage') ? parseFloat(r.getAttribute('percentage')!) : undefined,
            narrative: this.extractNarrative(r),
          }));
        }
        // Keep backward compatibility with single region
        if (recipientRegion) {
          transactionData.recipientRegion = {
            code: recipientRegion.getAttribute('code') || undefined,
            vocabulary: recipientRegion.getAttribute('vocabulary') || undefined,
          };
        }

        // NEW: Parse multiple aid types
        const aidTypeElements = Array.from(transaction.querySelectorAll('aid-type'));
        if (aidTypeElements.length > 0) {
          transactionData.aid_types = aidTypeElements.map(a => ({
            code: a.getAttribute('code') || '',
            vocabulary: a.getAttribute('vocabulary') || '1',
          }));
        }
        // Keep backward compatibility with single aid type
        if (aidType) {
          transactionData.aidType = {
            code: aidType.getAttribute('code') || undefined,
            vocabulary: aidType.getAttribute('vocabulary') || undefined,
          };
        }

        // NEW: Parse multiple recipient countries
        const recipientCountryElements = Array.from(transaction.querySelectorAll('recipient-country'));
        if (recipientCountryElements.length > 0) {
          transactionData.recipient_countries = recipientCountryElements.map(c => ({
            code: c.getAttribute('code') || '',
            percentage: c.getAttribute('percentage') ? parseFloat(c.getAttribute('percentage')!) : undefined,
          }));
        }

        // NEW: Capture vocabulary attributes for classifications
        transactionData.flow_type_vocabulary = flowType?.getAttribute('vocabulary') || '1';
        transactionData.finance_type_vocabulary = financeType?.getAttribute('vocabulary') || '1';
        transactionData.tied_status_vocabulary = tiedStatus?.getAttribute('vocabulary') || '1';
        transactionData.disbursement_channel_vocabulary = disbursementChannel?.getAttribute('vocabulary') || '1';

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
          vocabulary_uri: marker.getAttribute('vocabulary-uri') || undefined,
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
          vocabularyUri: tag.getAttribute('vocabulary-uri') || undefined,
          code: tag.getAttribute('code') || undefined,
          narrative: this.extractNarrative(tag),
        });
      }
    }

    // === CONDITIONS ===
    
    const conditionsElement = activity.querySelector('conditions');
    if (conditionsElement) {
      result.conditions = {
        attached: conditionsElement.getAttribute('attached') === '1',
        conditions: []
      };
      
      const conditionElements = conditionsElement.querySelectorAll('condition');
      for (let i = 0; i < conditionElements.length; i++) {
        const condition = conditionElements[i];
        const narratives = condition.querySelectorAll('narrative');
        
        // Extract primary narrative
        const narrative = this.extractNarrative(condition);
        
        result.conditions.conditions.push({
          type: condition.getAttribute('type') || undefined,
          narrative: narrative,
          narrativeLang: narratives[0]?.getAttribute('xml:lang') || 'en'
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
        const website = contact.querySelector('website');
        const mailingAddress = contact.querySelector('mailing-address');

        result.contactInfo.push({
          type: contact.getAttribute('type') || undefined,
          organization: this.extractNarrative(organization),
          department: this.extractNarrative(department),
          personName: this.extractNarrative(person),
          jobTitle: this.extractNarrative(jobTitle),
          telephone: telephone?.textContent?.trim() || undefined,
          email: email?.textContent?.trim() || undefined,
          website: website?.textContent?.trim() || undefined,
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
        // Query period-start and period-end directly (no wrapper element in IATI standard)
        const periodStart = budget.querySelector('period-start');
        const periodEnd = budget.querySelector('period-end');

        const budgetData: any = {
          type: budget.getAttribute('type') || '1', // Default to Original
          status: budget.getAttribute('status') || '1', // Default to Indicative
          value: value?.textContent ? parseFloat(value.textContent) : undefined,
          currency: value?.getAttribute('currency') || activity.getAttribute('default-currency') || undefined,
          valueDate: value?.getAttribute('value-date') || undefined,
        };

        // Always extract period dates
        budgetData.period = {
          start: periodStart?.getAttribute('iso-date') || undefined,
          end: periodEnd?.getAttribute('iso-date') || undefined,
        };

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
        const periodStart = disbursement.querySelector('period-start');
        const periodEnd = disbursement.querySelector('period-end');
        const providerOrg = disbursement.querySelector('provider-org');
        const receiverOrg = disbursement.querySelector('receiver-org');

        const disbursementData: any = {
          type: disbursement.getAttribute('type') || undefined,
          value: value?.textContent ? parseFloat(value.textContent) : undefined,
          currency: value?.getAttribute('currency') || undefined,
          valueDate: value?.getAttribute('value-date') || undefined,
        };

        // IATI standard: period-start and period-end are direct children, not wrapped in <period>
        if (periodStart || periodEnd) {
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

    // === COUNTRY BUDGET ITEMS ===
    
    const countryBudgetItemsElements = activity.querySelectorAll('country-budget-items');
    if (countryBudgetItemsElements.length > 0) {
      result.countryBudgetItems = [];
      for (let i = 0; i < countryBudgetItemsElements.length; i++) {
        const cbiElement = countryBudgetItemsElements[i];
        const vocabulary = cbiElement.getAttribute('vocabulary');
        
        if (!vocabulary) continue;
        
        const budgetItemElements = cbiElement.querySelectorAll('budget-item');
        const budgetItems: any[] = [];
        
        for (let j = 0; j < budgetItemElements.length; j++) {
          const budgetItem = budgetItemElements[j];
          const code = budgetItem.getAttribute('code');
          const percentageStr = budgetItem.getAttribute('percentage');
          const percentage = percentageStr ? parseFloat(percentageStr) : undefined;
          
          // Extract multi-language descriptions
          const descriptionElement = budgetItem.querySelector('description');
          let description: { [lang: string]: string } = {};
          
          if (descriptionElement) {
            const narratives = descriptionElement.querySelectorAll('narrative');
            if (narratives.length > 0) {
              for (let k = 0; k < narratives.length; k++) {
                const narrative = narratives[k];
                const lang = narrative.getAttribute('xml:lang') || 'en';
                const text = narrative.textContent?.trim();
                if (text) {
                  description[lang] = text;
                }
              }
            } else {
              // If no narrative elements, try to get direct text content
              const directText = descriptionElement.textContent?.trim();
              if (directText) {
                description['en'] = directText;
              }
            }
          }
          
          budgetItems.push({
            code,
            percentage,
            description: Object.keys(description).length > 0 ? description : undefined
          });
        }
        
        result.countryBudgetItems.push({
          vocabulary,
          budgetItems
        });
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
        locationCount: activity.locations?.length || 0,
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