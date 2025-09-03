import { XMLParser } from 'fast-xml-parser';

export interface IatiMeta {
  iatiId: string;
  reportingOrgRef: string;
  reportingOrgName?: string;
  lastUpdated?: string;
  linkedDataUri?: string;
}

export class IatiParseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'IatiParseError';
  }
}

/**
 * Extract metadata from an IATI XML file
 * @param file - The XML file to parse
 * @returns Promise resolving to extracted metadata
 * @throws IatiParseError for parsing failures
 */
export async function extractIatiMeta(file: File): Promise<IatiMeta> {
  try {
    // Check file type
    if (!file.type.includes('xml') && !file.name.toLowerCase().endsWith('.xml')) {
      throw new IatiParseError('File must be an XML document', 'INVALID_FILE_TYPE');
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      throw new IatiParseError('XML file is too large (maximum 50MB)', 'FILE_TOO_LARGE');
    }

    // Read and validate UTF-8 encoding
    let text: string;
    try {
      text = await file.text();
    } catch (error) {
      throw new IatiParseError('Failed to read file. Ensure it uses UTF-8 encoding.', 'ENCODING_ERROR');
    }

    if (!text.trim()) {
      throw new IatiParseError('XML file is empty', 'EMPTY_FILE');
    }

    // Configure XML parser with namespace support
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      ignoreNamespace: false,
      allowBooleanAttributes: true,
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
      parseTrueNumberOnly: false
    });

    let doc: any;
    try {
      doc = parser.parse(text);
    } catch (error) {
      throw new IatiParseError('Invalid XML format. Please check the file structure.', 'XML_PARSE_ERROR');
    }

    // Find the activity element - handle both single activities and activity collections
    let activity: any = null;
    
    // Try different possible structures
    if (doc['iati-activities']?.['iati-activity']) {
      const activities = doc['iati-activities']['iati-activity'];
      activity = Array.isArray(activities) ? activities[0] : activities;
    } else if (doc['iati-activity']) {
      activity = doc['iati-activity'];
    }

    // Handle namespaced elements (e.g., with xmlns prefixes)
    if (!activity) {
      // Look for any element ending with 'iati-activity'
      const findActivity = (obj: any): any => {
        for (const key in obj) {
          if (key.endsWith('iati-activity') || key.endsWith(':iati-activity')) {
            return Array.isArray(obj[key]) ? obj[key][0] : obj[key];
          }
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            const found = findActivity(obj[key]);
            if (found) return found;
          }
        }
        return null;
      };
      activity = findActivity(doc);
    }

    if (!activity) {
      throw new IatiParseError('Could not find <iati-activity> element in the XML file.', 'NO_ACTIVITY_FOUND');
    }

    // Extract IATI identifier
    let iatiId: string = '';
    const identifierElement = activity['iati-identifier'];
    if (identifierElement) {
      if (typeof identifierElement === 'string') {
        iatiId = identifierElement.trim();
      } else if (identifierElement['#text']) {
        iatiId = identifierElement['#text'].toString().trim();
      }
    }

    if (!iatiId) {
      throw new IatiParseError('Missing <iati-identifier> element. This is required for IATI compliance.', 'MISSING_IATI_ID');
    }

    // Extract reporting organisation
    const reportingOrg = activity['reporting-org'];
    if (!reportingOrg) {
      throw new IatiParseError('Missing <reporting-org> element. This is required to identify the publisher.', 'MISSING_REPORTING_ORG');
    }

    const reportingOrgRef = reportingOrg.ref?.toString().trim();
    if (!reportingOrgRef) {
      throw new IatiParseError('Missing reporting-org/@ref attribute. This is required to identify the publisher.', 'MISSING_REPORTING_ORG_REF');
    }

    // Extract reporting organisation name
    let reportingOrgName: string | undefined = undefined;
    if (reportingOrg.narrative) {
      if (Array.isArray(reportingOrg.narrative)) {
        // Take the first narrative, preferring English
        const englishNarrative = reportingOrg.narrative.find((n: any) => 
          !n['xml:lang'] || n['xml:lang'] === 'en'
        );
        reportingOrgName = englishNarrative?.['#text'] || reportingOrg.narrative[0]?.['#text'] || reportingOrg.narrative[0];
      } else if (typeof reportingOrg.narrative === 'string') {
        reportingOrgName = reportingOrg.narrative;
      } else if (reportingOrg.narrative['#text']) {
        reportingOrgName = reportingOrg.narrative['#text'];
      }
    }

    // Extract last updated datetime
    let lastUpdated: string | undefined = undefined;
    const lastUpdatedElement = activity['last-updated-datetime'];
    if (lastUpdatedElement) {
      lastUpdated = lastUpdatedElement.toString().trim();
    }

    // Extract linked data URI if present
    let linkedDataUri: string | undefined = undefined;
    if (activity['linked-data-uri']) {
      linkedDataUri = activity['linked-data-uri'].toString().trim();
    }

    return {
      iatiId,
      reportingOrgRef,
      reportingOrgName: reportingOrgName?.trim() || undefined,
      lastUpdated: lastUpdated || undefined,
      linkedDataUri: linkedDataUri || undefined
    };

  } catch (error) {
    if (error instanceof IatiParseError) {
      throw error;
    }
    
    // Log unexpected errors for debugging
    console.error('Unexpected error parsing IATI XML:', error);
    throw new IatiParseError('An unexpected error occurred while parsing the XML file.', 'UNKNOWN_ERROR');
  }
}

/**
 * Validate if a string looks like a valid IATI identifier
 */
export function validateIatiId(iatiId: string): boolean {
  // IATI IDs should follow the pattern: {publisher-ref}-{identifier}
  // But we'll be lenient and just check it's not empty and has reasonable length
  return iatiId.length > 0 && iatiId.length <= 255 && !iatiId.includes('<') && !iatiId.includes('>');
}

/**
 * Validate if a string looks like a valid organisation reference
 */
export function validateOrgRef(orgRef: string): boolean {
  // Organisation refs should be reasonable identifiers
  return orgRef.length > 0 && orgRef.length <= 100 && !orgRef.includes('<') && !orgRef.includes('>');
}