/**
 * IATI Location Export and Validation Library
 * Converts database locations to IATI v2.03 compliant XML
 */

import { type LocationSchema } from '@/lib/schemas/location';

// IATI Codelist mappings for export
const IATI_CODELISTS = {
  locationReach: {
    '1': '1',
    '2': '2'
  },
  exactness: {
    '1': '1',
    '2': '2',
    '3': '3'
  },
  locationClass: {
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5'
  },
  locationIdVocabulary: {
    'G1': 'G1',
    'G2': 'G2',
    'A1': 'A1',
    'A4': 'A4',
    'A5': 'A5',
    'A6': 'A6',
    'A8': 'A8'
  },
  administrativeLevel: {
    '0': '0',
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5'
  }
};

/**
 * Generate stable location reference for cross-referencing
 * @param location - Location object
 * @returns Stable reference string
 */
export function generateLocationRef(location: LocationSchema): string {
  const base = location.location_name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `loc-${base}-${location.id?.slice(-8) || 'unknown'}`;
}

/**
 * Convert location to IATI XML structure
 * @param location - Location object from database
 * @param xmlLang - Language for narratives (default: 'en')
 * @returns IATI location XML object
 */
export function convertLocationToIATI(
  location: LocationSchema,
  xmlLang: string = 'en'
): any {
  const locationRef = generateLocationRef(location);

  const iatiLocation: any = {
    '@ref': locationRef,
  };

  // Location name narrative
  if (location.location_name) {
    iatiLocation['location-name'] = {
      narrative: [
        {
          '@xml:lang': xmlLang,
          '#text': location.location_name
        }
      ]
    };
  }

  // Location description narrative
  if (location.location_description) {
    iatiLocation['location-description'] = {
      narrative: [
        {
          '@xml:lang': xmlLang,
          '#text': location.location_description
        }
      ]
    };
  }

  // Activity description at location
  if (location.activity_location_description) {
    iatiLocation['activity-description'] = {
      narrative: [
        {
          '@xml:lang': xmlLang,
          '#text': location.activity_location_description
        }
      ]
    };
  }

  // Location reach
  if (location.location_reach) {
    iatiLocation['location-reach'] = {
      '@code': IATI_CODELISTS.locationReach[location.location_reach]
    };
  }

  // Exactness
  if (location.exactness) {
    iatiLocation['exactness'] = {
      '@code': IATI_CODELISTS.exactness[location.exactness]
    };
  }

  // Location class
  if (location.location_class) {
    iatiLocation['location-class'] = {
      '@code': IATI_CODELISTS.locationClass[location.location_class]
    };
  }

  // Feature designation
  if (location.feature_designation) {
    iatiLocation['feature-designation'] = {
      '@code': location.feature_designation
    };
  }

  // Location ID (gazetteer)
  if (location.location_id_vocabulary && location.location_id_code) {
    iatiLocation['location-id'] = {
      '@vocabulary': IATI_CODELISTS.locationIdVocabulary[location.location_id_vocabulary],
      '@code': location.location_id_code
    };
  }

  // Point coordinates (only if not sensitive)
  if (location.latitude && location.longitude && !location.is_sensitive) {
    iatiLocation['point'] = {
      '@srsName': location.srs_name || 'http://www.opengis.net/def/crs/EPSG/0/4326',
      'pos': `${location.latitude} ${location.longitude}`
    };
  }

  // Administrative divisions
  if (location.admin_level && location.admin_code) {
    iatiLocation['administrative'] = {
      '@level': IATI_CODELISTS.administrativeLevel[location.admin_level],
      '@code': location.admin_code
    };
  }

  return iatiLocation;
}

/**
 * Convert multiple locations to IATI XML structure
 * @param locations - Array of location objects
 * @param xmlLang - Language for narratives (default: 'en')
 * @returns Array of IATI location XML objects
 */
export function convertLocationsToIATI(
  locations: LocationSchema[],
  xmlLang: string = 'en'
): any[] {
  return locations.map(location => convertLocationToIATI(location, xmlLang));
}

/**
 * Generate IATI XML string for locations
 * @param locations - Array of location objects
 * @param xmlLang - Language for narratives (default: 'en')
 * @returns XML string
 */
export function generateLocationsXML(
  locations: LocationSchema[],
  xmlLang: string = 'en'
): string {
  const iatiLocations = convertLocationsToIATI(locations, xmlLang);

  // Simple XML generation (in production, use a proper XML library)
  const locationsXML = iatiLocations.map(location => {
    const attributes = Object.entries(location)
      .filter(([key]) => key.startsWith('@'))
      .map(([key, value]) => `${key.replace('@', '')}="${value}"`)
      .join(' ');

    const elements = Object.entries(location)
      .filter(([key]) => !key.startsWith('@'))
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map(item => `<${key}>${generateElementXML(item)}</${key}>`).join('\n      ');
        }
        return `      <${key}>${generateElementXML(value)}</${key}>`;
      })
      .join('\n      ');

    return `    <location ${attributes}>
${elements}
    </location>`;
  }).join('\n');

  return locationsXML;
}

/**
 * Generate XML for nested elements
 * @param element - Element object
 * @returns XML string
 */
function generateElementXML(element: any): string {
  if (typeof element === 'string') {
    return element;
  }

  if (element['@xml:lang']) {
    const lang = element['@xml:lang'];
    const text = element['#text'];
    return `<narrative xml:lang="${lang}">${text}</narrative>`;
  }

  const attributes = Object.entries(element)
    .filter(([key]) => key.startsWith('@'))
    .map(([key, value]) => `${key.replace('@', '')}="${value}"`)
    .join(' ');

  const content = Object.entries(element)
    .filter(([key]) => !key.startsWith('@'))
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(item => `  <${key}>${generateElementXML(item)}</${key}>`).join('\n  ');
      }
      return `  <${key}>${generateElementXML(value)}</${key}>`;
    })
    .join('\n  ');

  return `<${attributes ? `${attributes}` : ''}>\n${content}\n</${element['#name'] || 'element'}>`;
}

/**
 * Validate location data against IATI requirements
 * @param location - Location object
 * @returns Validation result
 */
export function validateLocationForIATI(location: LocationSchema): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!location.location_name) {
    errors.push('Location name is required');
  }

  // Site location requirements
  if (location.location_type === 'site') {
    if (!location.latitude || !location.longitude) {
      errors.push('Site locations must have latitude and longitude');
    }

    // Validate coordinate ranges
    if (location.latitude && (location.latitude < -90 || location.latitude > 90)) {
      errors.push('Latitude must be between -90 and 90');
    }
    if (location.longitude && (location.longitude < -180 || location.longitude > 180)) {
      errors.push('Longitude must be between -180 and 180');
    }

    // Recommendations for IATI compliance
    if (!location.exactness) {
      warnings.push('Consider setting Exactness for better IATI compliance');
    }
    if (!location.location_class) {
      warnings.push('Consider setting Location Class for better IATI compliance');
    }
  }

  // Coverage location requirements
  if (location.location_type === 'coverage') {
    if (!location.coverage_scope) {
      errors.push('Coverage locations must have a coverage scope');
    }
  }

  // Gazetteer validation
  if (location.location_id_vocabulary && !location.location_id_code) {
    errors.push('Location ID code is required when vocabulary is specified');
  }
  if (location.location_id_code && !location.location_id_vocabulary) {
    errors.push('Location ID vocabulary is required when code is specified');
  }

  // Administrative validation
  if (location.admin_level && !location.admin_code) {
    errors.push('Administrative code is required when administrative level is specified');
  }
  if (location.admin_code && !location.admin_level) {
    errors.push('Administrative level is required when administrative code is specified');
  }

  // Percentage validation (business rule, not IATI requirement)
  if (location.percentage_allocation !== undefined) {
    if (location.percentage_allocation < 0 || location.percentage_allocation > 100) {
      errors.push('Percentage allocation must be between 0 and 100');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate multiple locations for IATI export
 * @param locations - Array of location objects
 * @returns Validation result
 */
export function validateLocationsForIATI(locations: LocationSchema[]): {
  isValid: boolean;
  totalErrors: number;
  totalWarnings: number;
  locationErrors: Record<string, { errors: string[]; warnings: string[] }>;
} {
  const locationErrors: Record<string, { errors: string[]; warnings: string[] }> = {};
  let totalErrors = 0;
  let totalWarnings = 0;

  locations.forEach(location => {
    const validation = validateLocationForIATI(location);
    if (validation.errors.length > 0 || validation.warnings.length > 0) {
      locationErrors[location.id || 'unknown'] = {
        errors: validation.errors,
        warnings: validation.warnings
      };
      totalErrors += validation.errors.length;
      totalWarnings += validation.warnings.length;
    }
  });

  return {
    isValid: totalErrors === 0,
    totalErrors,
    totalWarnings,
    locationErrors
  };
}

/**
 * Export locations for sensitive data handling
 * @param locations - Array of location objects
 * @param includeSensitive - Whether to include sensitive locations
 * @returns Filtered locations
 */
export function exportLocationsForIATI(
  locations: LocationSchema[],
  includeSensitive: boolean = true
): LocationSchema[] {
  if (includeSensitive) {
    return locations;
  }

  return locations.filter(location => !location.is_sensitive);
}

/**
 * Generate sample IATI activity XML with locations for testing
 * @param activityId - Activity identifier
 * @param locations - Array of location objects
 * @returns Complete IATI activity XML string
 */
export function generateSampleActivityXML(
  activityId: string,
  locations: LocationSchema[]
): string {
  const iatiLocations = convertLocationsToIATI(locations);
  const locationsXML = generateLocationsXML(locations);

  return `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03" generated-datetime="${new Date().toISOString()}" xmlns="http://www.iatistandard.org">
  <iati-activity>
    <iati-identifier>${activityId}</iati-identifier>
    <reporting-org ref="test-org">
      <narrative>Test Organization</narrative>
    </reporting-org>
    <title>
      <narrative>Test Activity</narrative>
    </title>
    <description>
      <narrative>Test activity description</narrative>
    </description>
    <activity-status code="2"/>
    <activity-date iso-date="${new Date().toISOString().split('T')[0]}" type="1"/>
    <sector vocabulary="1" code="11110">
      <narrative>Education policy and administrative management</narrative>
    </sector>
    <default-aid-type code="C01" vocabulary="1"/>
    <default-finance-type code="110"/>
    <default-flow-type code="10"/>
    <default-tied-status code="5"/>
${locationsXML}
  </iati-activity>
</iati-activities>`;
}

/**
 * XSD Validation interface (for future implementation)
 */
export interface XSDValidationResult {
  isValid: boolean;
  errors: Array<{
    line: number;
    column: number;
    message: string;
    path: string;
  }>;
}

/**
 * Validate IATI XML against XSD schema
 * @param xmlString - IATI XML string
 * @returns Validation result
 */
export async function validateIATIXML(xmlString: string): Promise<XSDValidationResult> {
  // This would implement XSD validation using a library like libxmljs or similar
  // For now, return a mock result
  return {
    isValid: true,
    errors: []
  };
}

/**
 * Export locations with sensitive data handling
 * @param locations - Array of location objects
 * @param options - Export options
 * @returns IATI XML string
 */
export function exportLocationsToIATI(
  locations: LocationSchema[],
  options: {
    includeSensitive?: boolean;
    xmlLang?: string;
  } = {}
): string {
  const { includeSensitive = true, xmlLang = 'en' } = options;

  const locationsToExport = exportLocationsForIATI(locations, includeSensitive);
  return generateLocationsXML(locationsToExport, xmlLang);
}
