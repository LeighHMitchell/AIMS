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
  original_ref?: string; // Original ref from XML before validation
  validated_ref?: string; // Ref after validation/correction
  wasCorrected?: boolean; // Flag indicating if correction was applied
  org_type?: string;
  activity_id_ref?: string;
  crs_channel_code?: string;
  narrative?: string;
  narrative_lang?: string;
}

/**
 * Organization registry prefixes and their associated countries
 */
const orgRegistryPrefixes: Record<string, { country: string; name: string }> = {
  "GB-COH": { country: "GB", name: "UK Companies House" },
  "BE-BCE_KBO": { country: "BE", name: "Belgian Business Registry" },
  "FR-RCS": { country: "FR", name: "French Company Registry" },
  "FI-PRO": { country: "FI", name: "Finnish Trade Register" },
  "XM-DAC": { country: "XM", name: "OECD DAC Codes" },
  "US-EIN": { country: "US", name: "US Employer Identification Number" },
  "NL-KVK": { country: "NL", name: "Dutch Chamber of Commerce" },
  "DE-X": { country: "DE", name: "German Registry" },
  "NO-BRC": { country: "NO", name: "Norwegian Business Registry" },
  "SE-ORG": { country: "SE", name: "Swedish Company Registry" },
};

/**
 * Country indicators in organization names
 */
const countryNameIndicators: Record<string, string[]> = {
  "GB": ["LIMITED", "LLP", "LTD", "CROWN AGENTS", "UK", "UNITED KINGDOM"],
  "BE": ["ASBL", "VZW", "BV", "NV", "BELGIUM", "BELGIË"],
  "FR": ["SARL", "SA", "SNC", "FRANCE"],
  "FI": ["OY", "AB", "FINLAND", "SUOMI"],
  "US": ["INC", "LLC", "CORP", "UNITED STATES", "USA"],
  "NL": ["BV", "NV", "NETHERLANDS", "NEDERLAND"],
  "DE": ["GMBH", "AG", "GERMANY", "DEUTSCHLAND"],
  "NO": ["AS", "NORWAY", "NORGE"],
  "SE": ["AB", "SWEDEN", "SVERIGE"],
};

/**
 * Extract registry prefix from an IATI org ref
 */
function extractRegistryPrefix(ref: string): string | null {
  if (!ref) return null;
  
  // Match patterns like "GB-COH-", "BE-BCE_KBO-", "FR-RCS-", etc.
  const match = ref.match(/^([A-Z]{2}-[A-Z0-9_]+)-/);
  return match ? match[1] : null;
}

/**
 * Check if an organization name suggests a specific country
 */
function getNameCountry(name: string): string | null {
  const upperName = name.toUpperCase();
  
  for (const [country, indicators] of Object.entries(countryNameIndicators)) {
    if (indicators.some(indicator => upperName.includes(indicator))) {
      return country;
    }
  }
  
  return null;
}

/**
 * Validate and correct organization name/ref mismatches
 */
interface OrgValidationInput {
  name: string;
  ref: string | null;
  role: string;
  activityId: string | null;
}

interface OrgValidationResult {
  name: string;
  ref: string | null;
  original_ref: string | null;
  validated_ref: string | null;
  wasCorrected: boolean;
  role: string;
  activityId: string | null;
}

/**
 * Validate and correct participating organization refs based on name/ref mismatches
 */
export function validateAndCorrectParticipatingOrgs(
  orgs: OrgValidationInput[]
): OrgValidationResult[] {
  // Group orgs by role
  const orgsByRole = new Map<string, OrgValidationInput[]>();
  orgs.forEach(org => {
    const role = org.role || '4';
    if (!orgsByRole.has(role)) {
      orgsByRole.set(role, []);
    }
    orgsByRole.get(role)!.push(org);
  });

  const correctedOrgs: OrgValidationResult[] = [];
  const corrections: Array<{ orgName: string; oldRef: string; newRef: string }> = [];

  // Process each role group
  orgsByRole.forEach((roleOrgs, role) => {
    // For role 4 (implementing), check for mismatches and swap if needed
    // DISABLED: This automatic swapping causes more problems than it solves
    // The IATI XML is typically correct as-is, so we should trust it
    if (false && role === '4' && roleOrgs.length >= 2) {
      // Find potential mismatches
      const mismatches: Array<{ org: OrgValidationInput; index: number }> = [];
      const availableRefs: string[] = [];

      roleOrgs.forEach((org, index) => {
        if (org.ref) {
          availableRefs.push(org.ref);
        }

        const nameCountry = getNameCountry(org.name);
        const refPrefix = org.ref ? extractRegistryPrefix(org.ref) : null;
        const refCountry = refPrefix ? orgRegistryPrefixes[refPrefix]?.country : null;

        // Check for mismatch
        if (nameCountry && refCountry && nameCountry !== refCountry) {
          mismatches.push({ org, index });
        }
      });

      // Try to correct mismatches by swapping refs
      if (mismatches.length > 0 && availableRefs.length >= 2) {
        // Create a copy of orgs for this role
        const correctedRoleOrgs = roleOrgs.map(org => ({ ...org }));
        
        // For each mismatch, try to find a better matching ref
        mismatches.forEach(({ org, index }) => {
          const nameCountry = getNameCountry(org.name);
          if (!nameCountry || !org.ref) return;
          
          // Find a ref that matches the name's country
          const betterRef = availableRefs.find(ref => {
            const prefix = extractRegistryPrefix(ref);
            const refCountry = prefix ? orgRegistryPrefixes[prefix]?.country : null;
            return refCountry === nameCountry && ref !== org.ref;
          });
          
          if (betterRef) {
            // Swap refs: assign betterRef to this org, and this org's ref to another org
            const oldRef = correctedRoleOrgs[index].ref!;
            correctedRoleOrgs[index].ref = betterRef;
            
            // Find the org that has betterRef and swap it
            const swapIndex = correctedRoleOrgs.findIndex(o => o.ref === betterRef && o.name !== org.name);
            if (swapIndex !== -1 && swapIndex !== index) {
              correctedRoleOrgs[swapIndex].ref = oldRef;
            }
            
            corrections.push({
              orgName: org.name,
              oldRef: oldRef,
              newRef: betterRef
            });
          }
        });
        
        // Convert back to validation results
        correctedRoleOrgs.forEach((org, index) => {
          const originalOrg = roleOrgs[index];
          correctedOrgs.push({
            name: org.name,
            ref: org.ref,
            original_ref: originalOrg.ref,
            validated_ref: org.ref,
            wasCorrected: org.ref !== originalOrg.ref,
            role: org.role,
            activityId: org.activityId
          });
        });
      } else {
        // No corrections needed, just map to results
        roleOrgs.forEach(org => {
          correctedOrgs.push({
            name: org.name,
            ref: org.ref,
            original_ref: org.ref,
            validated_ref: org.ref,
            wasCorrected: false,
            role: org.role,
            activityId: org.activityId
          });
        });
      }
    } else {
      // For other roles or single orgs, just validate without swapping
      // Collect available refs for this role group
      const roleRefs: string[] = [];
      roleOrgs.forEach(org => {
        if (org.ref) {
          roleRefs.push(org.ref);
        }
      });
      
      roleOrgs.forEach(org => {
        const nameCountry = getNameCountry(org.name);
        const refPrefix = org.ref ? extractRegistryPrefix(org.ref) : null;
        const refCountry = refPrefix ? orgRegistryPrefixes[refPrefix]?.country : null;
        
        let validatedRef = org.ref;
        let wasCorrected = false;
        
        // Specific known corrections
        if (org.name.toUpperCase().includes("CROWN AGENTS") && refPrefix === "BE-BCE_KBO") {
          validatedRef = "GB-COH-03259922";
          wasCorrected = true;
          corrections.push({
            orgName: org.name,
            oldRef: org.ref!,
            newRef: validatedRef
          });
        }
        
        // Check for ICE (Belgian org) that might have wrong ref
        if (org.name.toUpperCase().includes("ICE") && refPrefix && refPrefix !== "BE-BCE_KBO") {
          // If there's a BE-BCE_KBO ref available in the same role group, consider swapping
          const availableBERef = roleRefs.find(ref => extractRegistryPrefix(ref) === "BE-BCE_KBO");
          if (availableBERef) {
            validatedRef = availableBERef;
            wasCorrected = true;
            corrections.push({
              orgName: org.name,
              oldRef: org.ref!,
              newRef: validatedRef
            });
          }
        }
        
        correctedOrgs.push({
          name: org.name,
          ref: validatedRef,
          original_ref: org.ref,
          validated_ref: validatedRef,
          wasCorrected,
          role: org.role,
          activityId: org.activityId
        });
      });
    }
  });

  // Log corrections
  corrections.forEach(correction => {
    console.warn(
      `[Org Validation] Corrected org ref for "${correction.orgName}": ${correction.oldRef} → ${correction.newRef}`
    );
  });

  return correctedOrgs;
}

export function parseParticipatingOrgsFromXML(xmlDoc: Document | string): ParsedParticipatingOrg[] {
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

  // Step 1: Parse each org as an object with name, ref, role, activityId
  const parsedOrgs: Array<{
    name: string;
    ref: string | null;
    role: string;
    activityId: string | null;
    type?: string;
    crsChannel?: string;
    narrativeLang?: string;
    roleCode: number;
    roleType: 'funding' | 'extending' | 'implementing' | 'government';
  }> = [];

  orgElements.forEach(orgEl => {
    // Extract attributes
    const ref = orgEl.getAttribute('ref') || null;
    const roleCode = parseInt(orgEl.getAttribute('role') || '4', 10);
    const type = orgEl.getAttribute('type') || undefined;
    const activityId = orgEl.getAttribute('activity-id') || null;
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

    parsedOrgs.push({
      name: narrative,
      ref: ref,
      role: roleCode.toString(),
      activityId: activityId,
      type,
      crsChannel,
      narrativeLang: lang,
      roleCode,
      roleType
    });
  });

  // Step 2: Validate and correct org refs
  const validationInput: OrgValidationInput[] = parsedOrgs.map(org => ({
    name: org.name,
    ref: org.ref,
    role: org.role,
    activityId: org.activityId
  }));

  const validatedOrgs = validateAndCorrectParticipatingOrgs(validationInput);

  // Step 3: Map validated results back to ParsedParticipatingOrg format
  const orgs: ParsedParticipatingOrg[] = parsedOrgs.map((org, index) => {
    const validated = validatedOrgs[index];
    return {
      iati_role_code: org.roleCode,
      role_type: org.roleType,
      iati_org_ref: validated.validated_ref || undefined, // Use validated_ref for display
      original_ref: validated.original_ref || undefined,
      validated_ref: validated.validated_ref || undefined,
      wasCorrected: validated.wasCorrected,
      org_type: org.type,
      activity_id_ref: org.activityId || undefined,
      crs_channel_code: org.crsChannel,
      narrative: org.name,
      narrative_lang: org.narrativeLang
    };
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


