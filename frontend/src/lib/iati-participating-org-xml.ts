/**
 * IATI Participating Organization XML Generator and Parser
 * 
 * Handles generation and parsing of <participating-org> elements according to
 * IATI Standard v2.03
 * 
 * Reference: https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/participating-org/
 */

import { ParticipatingOrganization } from '@/hooks/use-participating-organizations';

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate IATI XML for participating organizations
 * 
 * Example output:
 * <participating-org ref="GB-COH-123456" role="1" type="21" activity-id="GB-COH-123456-PROJ1">
 *   <narrative>Organization Name</narrative>
 *   <narrative xml:lang="fr">Nom de l'organisation</narrative>
 * </participating-org>
 */
export function generateParticipatingOrgXML(participatingOrgs: ParticipatingOrganization[]): string {
  if (!participatingOrgs || participatingOrgs.length === 0) {
    return '';
  }

  return participatingOrgs.map(org => {
    const attributes: string[] = [];
    
    // Add @ref attribute (optional but recommended)
    if (org.iati_org_ref) {
      attributes.push(`ref="${escapeXml(org.iati_org_ref)}"`);
    }
    
    // Add @role attribute (required)
    attributes.push(`role="${org.iati_role_code}"`);
    
    // Add @type attribute (optional)
    if (org.org_type) {
      attributes.push(`type="${org.org_type}"`);
    }
    
    // Add @activity-id attribute (optional)
    if (org.activity_id_ref) {
      attributes.push(`activity-id="${escapeXml(org.activity_id_ref)}"`);
    }
    
    // Add @crs-channel-code attribute (optional)
    if (org.crs_channel_code) {
      attributes.push(`crs-channel-code="${org.crs_channel_code}"`);
    }

    // Determine narrative text (use custom narrative or fall back to organization name)
    const narrativeText = org.narrative || org.organization?.name || '';
    const langAttr = org.narrative_lang && org.narrative_lang !== 'en' 
      ? ` xml:lang="${org.narrative_lang}"` 
      : '';

    // Build the XML element
    const attributeString = attributes.join(' ');
    
    return `  <participating-org ${attributeString}>
   <narrative${langAttr}>${escapeXml(narrativeText)}</narrative>
  </participating-org>`;
  }).join('\n');
}

/**
 * Parse participating-org elements from IATI XML
 * 
 * Returns an array of participating organization data that can be used to
 * create new participating organization records
 */
export interface ParsedParticipatingOrg {
  iati_role_code: number;
  role_type: 'funding' | 'extending' | 'implementing' | 'government';
  iati_org_ref?: string;
  org_type?: string;
  activity_id_ref?: string;
  crs_channel_code?: string;
  narrative?: string;
  narrative_lang?: string;
}

export function parseParticipatingOrgsFromXML(xmlDoc: Document | string): ParsedParticipatingOrg[] {
  const orgs: ParsedParticipatingOrg[] = [];
  
  // Parse string to Document if needed
  let doc: Document;
  if (typeof xmlDoc === 'string') {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlDoc, 'text/xml');
  } else {
    doc = xmlDoc;
  }

  // Find all participating-org elements
  const orgElements = doc.querySelectorAll('participating-org');

  orgElements.forEach(orgEl => {
    // Extract attributes
    const ref = orgEl.getAttribute('ref') || undefined;
    const roleCode = parseInt(orgEl.getAttribute('role') || '4', 10);
    const type = orgEl.getAttribute('type') || undefined;
    const activityId = orgEl.getAttribute('activity-id') || undefined;
    const crsChannel = orgEl.getAttribute('crs-channel-code') || undefined;
    
    // Extract narrative elements (there can be multiple for different languages)
    const narrativeEl = orgEl.querySelector('narrative');
    const narrative = narrativeEl?.textContent?.trim() || '';
    const lang = narrativeEl?.getAttribute('xml:lang') || 'en';

    // Map IATI role code to internal role_type
    const roleTypeMap: Record<number, 'funding' | 'extending' | 'implementing' | 'government'> = {
      1: 'funding',
      2: 'government',  // Accountable maps to government in our system
      3: 'extending',
      4: 'implementing'
    };

    const roleType = roleTypeMap[roleCode] || 'implementing';

    orgs.push({
      iati_role_code: roleCode,
      role_type: roleType,
      iati_org_ref: ref,
      org_type: type,
      activity_id_ref: activityId,
      crs_channel_code: crsChannel,
      narrative,
      narrative_lang: lang
    });
  });

  return orgs;
}

/**
 * Match a parsed participating org to an existing organization in the database
 * by IATI identifier
 */
export function matchOrganizationByIATIRef(
  parsedOrg: ParsedParticipatingOrg,
  organizations: Array<{ id: string; iati_org_id?: string; name: string }>
): string | null {
  if (!parsedOrg.iati_org_ref) {
    return null;
  }

  const matchedOrg = organizations.find(
    org => org.iati_org_id === parsedOrg.iati_org_ref
  );

  return matchedOrg?.id || null;
}

/**
 * Match a parsed participating org to an existing organization by name
 * (fallback if IATI ref doesn't match)
 */
export function matchOrganizationByName(
  parsedOrg: ParsedParticipatingOrg,
  organizations: Array<{ id: string; name: string }>
): string | null {
  if (!parsedOrg.narrative) {
    return null;
  }

  // Try exact match first
  const exactMatch = organizations.find(
    org => org.name.toLowerCase() === parsedOrg.narrative!.toLowerCase()
  );

  if (exactMatch) {
    return exactMatch.id;
  }

  // Try partial match (contains)
  const partialMatch = organizations.find(
    org => org.name.toLowerCase().includes(parsedOrg.narrative!.toLowerCase()) ||
           parsedOrg.narrative!.toLowerCase().includes(org.name.toLowerCase())
  );

  return partialMatch?.id || null;
}

/**
 * Generate a complete IATI activity XML snippet with participating organizations
 * (useful for export/download features)
 */
export function generateIATIActivitySnippet(
  activityIdentifier: string,
  participatingOrgs: ParticipatingOrganization[]
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<iati-activity>
  <iati-identifier>${escapeXml(activityIdentifier)}</iati-identifier>
  
  <!-- Participating Organizations -->
${generateParticipatingOrgXML(participatingOrgs)}
  
</iati-activity>`;
}

/**
 * Validate participating organization data against IATI rules
 */
export function validateParticipatingOrg(org: Partial<ParsedParticipatingOrg>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Role code is required
  if (!org.iati_role_code || org.iati_role_code < 1 || org.iati_role_code > 4) {
    errors.push('Role code must be between 1 and 4');
  }

  // Role type is required
  if (!org.role_type) {
    errors.push('Role type is required');
  }

  // Narrative should be present (recommended but not strictly required)
  if (!org.narrative || org.narrative.trim() === '') {
    errors.push('Organization name (narrative) is recommended');
  }

  // If org_type is provided, validate it's a valid code
  if (org.org_type) {
    const validTypes = ['10', '15', '21', '22', '23', '24', '30', '40', '60', '70', '71', '72', '73', '80', '90'];
    if (!validTypes.includes(org.org_type)) {
      errors.push(`Invalid organization type code: ${org.org_type}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}


