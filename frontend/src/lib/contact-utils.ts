/**
 * Contact utility functions for parsing and validating IATI contact data
 */

/**
 * Extract first name from IATI person-name narrative
 * IATI format: "A. Example" -> firstName: "A."
 * @param fullName - The full name from IATI person-name/narrative
 * @returns The first name portion
 */
export function extractFirstName(fullName: string | undefined | null): string {
  if (!fullName) return '';
  
  const trimmed = fullName.trim();
  const parts = trimmed.split(' ');
  
  if (parts.length === 1) {
    // Single name, use as first name
    return parts[0];
  }
  
  // Return first part as first name
  return parts[0];
}

/**
 * Extract last name from IATI person-name narrative
 * IATI format: "A. Example" -> lastName: "Example"
 * @param fullName - The full name from IATI person-name/narrative
 * @returns The last name portion
 */
export function extractLastName(fullName: string | undefined | null): string {
  if (!fullName) return '';
  
  const trimmed = fullName.trim();
  const parts = trimmed.split(' ');
  
  if (parts.length === 1) {
    // Single name, use as last name
    return parts[0];
  }
  
  // Return everything after first part as last name
  return parts.slice(1).join(' ');
}

/**
 * Extract middle name from IATI person-name narrative if present
 * IATI format: "John M. Smith" -> middleName: "M."
 * @param fullName - The full name from IATI person-name/narrative
 * @returns The middle name portion if present
 */
export function extractMiddleName(fullName: string | undefined | null): string | undefined {
  if (!fullName) return undefined;
  
  const trimmed = fullName.trim();
  const parts = trimmed.split(' ');
  
  if (parts.length > 2) {
    // Return middle parts (everything between first and last)
    return parts.slice(1, -1).join(' ');
  }
  
  return undefined;
}

/**
 * Validate and normalize IATI contact type code
 * IATI ContactType codelist: 1=General, 2=Project Management, 3=Financial, 4=Communications
 * @param type - The contact type code from IATI
 * @returns Object with validation status and friendly label
 */
export function validateIatiContactType(type: string | undefined | null): { valid: boolean; label: string; code: string } {
  const typeLabels: Record<string, string> = {
    '1': 'General Enquiries',
    '2': 'Project Management',
    '3': 'Financial Management',
    '4': 'Communications'
  };
  
  if (!type) {
    return { valid: true, label: typeLabels['1'], code: '1' };
  }
  
  const normalizedType = type.trim();
  
  if (typeLabels[normalizedType]) {
    return { valid: true, label: typeLabels[normalizedType], code: normalizedType };
  }
  
  // Default to General Enquiries if invalid
  console.warn(`[Contact Utils] Invalid IATI contact type '${type}', defaulting to '1' (General Enquiries)`);
  return { valid: false, label: typeLabels['1'], code: '1' };
}

/**
 * Get IATI contact type icon based on type code
 * @param type - The contact type code (1-4)
 * @returns Emoji icon for the contact type
 */
export function getContactTypeIcon(type: string | undefined | null): string {
  const icons: Record<string, string> = {
    '1': '📧', // General Enquiries
    '2': '💼', // Project Management
    '3': '💰', // Financial Management
    '4': '📢'  // Communications
  };
  
  return icons[type || '1'] || icons['1'];
}

/**
 * Extract narrative text from IATI element structure
 * @param element - Object with narrative property or string
 * @returns The narrative text
 */
export function extractNarrative(element: any): string | undefined {
  if (!element) return undefined;
  
  if (typeof element === 'string') return element;
  
  if (element.narrative) {
    return typeof element.narrative === 'string' ? element.narrative : element.narrative.text;
  }
  
  return undefined;
}

/**
 * Map IATI contact data to simplified database contact format
 * @param iatiContact - Contact data from IATI XML
 * @returns Contact object in simplified database format
 */
export function mapIatiContactToDb(iatiContact: any) {
  const personName = iatiContact.person || iatiContact.personName;
  const fullName = extractNarrative(personName);
  const typeValidation = validateIatiContactType(iatiContact.type);
  
  return {
    type: typeValidation.code,
    title: '', // IATI doesn't specify title, leave empty
    firstName: extractFirstName(fullName) || 'Unknown',
    lastName: extractLastName(fullName) || 'Contact',
    position: extractNarrative(iatiContact.jobTitle) || 'Not specified', // Use jobTitle as position/role
    jobTitle: extractNarrative(iatiContact.jobTitle), // IATI job-title field
    organisation: extractNarrative(iatiContact.organization),
    organisationId: null, // Will be matched later if possible
    department: extractNarrative(iatiContact.department), // IATI department field
    email: iatiContact.email,
    phone: iatiContact.telephone,
    phoneNumber: iatiContact.telephone,
    website: iatiContact.website, // IATI website field
    mailingAddress: extractNarrative(iatiContact.mailingAddress), // IATI mailing-address field
    importedFromIati: true, // Mark this contact as imported from IATI XML
  };
}

/**
 * Normalize contact data from various sources (contact, user, IATI) to a common format
 * @param input - Contact data from any source
 * @param source - The source of the contact data
 * @returns Normalized contact object
 */
export function normalizeContact(input: any, source: 'contact' | 'user' | 'iati'): any {
  if (source === 'iati') {
    return mapIatiContactToDb(input);
  }
  
  if (source === 'contact') {
    // For contact source (from activity_contacts table)
    return {
      id: input.id,
      title: input.title || undefined,
      firstName: input.firstName || input.first_name || '',
      lastName: input.lastName || input.last_name || '',
      email: input.email || '',
      phone: input.phone || input.phoneNumber || input.phone_number || '',
      phoneNumber: input.phoneNumber || input.phone_number || input.phone || '',
      countryCode: input.countryCode || input.country_code || '',
      organisation: input.organisation || input.organisation_name || '',
      organisationId: input.organisationId || input.organisation_id || null,
      organisationAcronym: input.organisationAcronym || input.organisation_acronym || '',
      position: input.position || '',
      jobTitle: input.jobTitle || input.job_title || '',
      department: input.department || '',
      type: input.type || '1',
      profilePhoto: input.profilePhoto || input.profile_photo || '',
      website: input.website || '',
      mailingAddress: input.mailingAddress || input.mailing_address || '',
      isFocalPoint: input.isFocalPoint || input.is_focal_point || false,
      importedFromIati: input.importedFromIati || input.imported_from_iati || false,
    };
  }
  
  // For user source (legacy - no longer used but kept for compatibility)
  return {
    firstName: input.firstName || input.first_name || '',
    lastName: input.lastName || input.last_name || '',
    email: input.email || '',
    phone: input.phone || input.phone_number || '',
    organisation: input.organization || input.organisation || '',
    organisationId: input.organizationId || input.organization_id || null,
    position: input.position || '',
    type: '1', // Default to General Enquiries
  };
}

/**
 * Check if two contacts are duplicates based on email OR full name
 * @param a - First contact
 * @param b - Second contact
 * @returns True if contacts are duplicates
 */
export function areContactsDuplicate(a: any, b: any): boolean {
  // Check email match (case insensitive) - if both have emails
  const emailMatch = a.email && b.email && 
    a.email.toLowerCase().trim() === b.email.toLowerCase().trim();
  
  // Check name match (case insensitive) - both first and last name must match
  const firstNameMatch = a.firstName && b.firstName &&
    a.firstName.toLowerCase().trim() === b.firstName.toLowerCase().trim();
  const lastNameMatch = a.lastName && b.lastName &&
    a.lastName.toLowerCase().trim() === b.lastName.toLowerCase().trim();
  const fullNameMatch = firstNameMatch && lastNameMatch;
  
  // Contacts are duplicates if:
  // 1. Email matches (both have emails and they're the same), OR
  // 2. Full name matches (both first and last name match)
  return emailMatch || fullNameMatch;
}

/**
 * Deduplicate an array of contacts
 * @param contacts - Array of contacts
 * @returns Deduplicated array of contacts
 */
export function deduplicateContacts(contacts: any[]): any[] {
  const seen = new Map<string, any>();
  
  for (const contact of contacts) {
    const key = `${contact.email?.toLowerCase() || ''}_${contact.firstName?.toLowerCase() || ''}_${contact.lastName?.toLowerCase() || ''}`;
    
    if (!seen.has(key)) {
      seen.set(key, contact);
    } else {
      // If duplicate found, merge with existing
      const existing = seen.get(key);
      seen.set(key, mergeContact(existing, contact));
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Merge two contact objects, preferring non-empty values from source b
 * @param a - Base contact
 * @param b - Contact to merge (takes priority for non-empty fields)
 * @returns Merged contact
 */
export function mergeContact(a: any, b: any): any {
  const merged = { ...a };
  
  // Merge each field, preferring non-empty values from b
  for (const key of Object.keys(b)) {
    if (b[key] !== undefined && b[key] !== null && b[key] !== '') {
      merged[key] = b[key];
    }
  }
  
  // Special handling for boolean flags - use OR logic
  if (a.isFocalPoint || b.isFocalPoint) {
    merged.isFocalPoint = true;
  }
  if (a.hasEditingRights || b.hasEditingRights) {
    merged.hasEditingRights = true;
  }
  
  return merged;
}

