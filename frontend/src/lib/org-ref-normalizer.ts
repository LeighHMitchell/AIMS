/**
 * Utility functions for normalizing and validating IATI organization references
 */

/**
 * Normalizes an organization reference/ID for display
 * - Removes all spaces and non-printable characters
 * - Converts to uppercase for consistency
 * - Preserves the original structure (hyphens, underscores, etc.)
 * 
 * @param ref - The raw organization reference from XML/database
 * @returns Normalized ref string or null if invalid/empty
 * 
 * @example
 * normaliseOrgRef("FR-RCS-523 369 619") // Returns "FR-RCS-523369619"
 * normaliseOrgRef("gb-coh-03259922") // Returns "GB-COH-03259922"
 * normaliseOrgRef("  BE-BCE_KBO-0474198059  ") // Returns "BE-BCE_KBO-0474198059"
 */
export function normaliseOrgRef(ref?: string | null): string | null {
  if (!ref) return null;
  
  // Remove all spaces and non-printable characters
  const cleaned = ref.trim().replace(/\s+/g, "");
  
  // Return null if empty after cleaning
  if (cleaned.length === 0) return null;
  
  // Ensure uppercase for consistency
  return cleaned.toUpperCase();
}

/**
 * Validates if a normalized organization reference matches the expected IATI pattern
 * 
 * IATI organization identifiers typically follow patterns like:
 * - Country code (2-3 chars) + separator + organization identifier
 * - Examples: GB-COH-123456, US-GOV-1, XI-IATI-EC_INTPA
 * 
 * @param ref - The normalized organization reference
 * @returns true if the ref matches a valid IATI pattern
 */
export function isValidIatiRef(ref: string | null): boolean {
  if (!ref) return false;
  
  // Pattern: 2-3 uppercase letters, hyphen, then alphanumeric/underscore/dot/hyphen
  // Examples: GB-COH-123456, US-GOV-1, XI-IATI-EC_INTPA, BE-BCE_KBO-0474198059
  const iatiPattern = /^[A-Z]{2,3}-[A-Z0-9._-]+$/;
  
  return iatiPattern.test(ref);
}

/**
 * Gets a display value for an organization reference with validation
 * 
 * @param ref - The raw organization reference
 * @param showInvalidIndicator - Whether to append a warning indicator for invalid refs
 * @returns Normalized ref string, null if invalid, or formatted string with indicator
 */
export function getDisplayOrgRef(
  ref?: string | null, 
  showInvalidIndicator: boolean = false
): string | null {
  const normalized = normaliseOrgRef(ref);
  
  if (!normalized) return null;
  
  // If validation is requested and ref is invalid, we'll handle it in the UI component
  // For now, just return the normalized value
  return normalized;
}

/**
 * Type for organization reference display data
 */
export interface OrgRefDisplay {
  raw: string | null | undefined;
  normalized: string | null;
  isValid: boolean;
}

/**
 * Gets complete display information for an organization reference
 * 
 * @param ref - The raw organization reference
 * @returns Object with raw, normalized, and validation info
 */
export function getOrgRefDisplay(ref?: string | null): OrgRefDisplay {
  const normalized = normaliseOrgRef(ref);
  const isValid = normalized ? isValidIatiRef(normalized) : false;
  
  return {
    raw: ref,
    normalized,
    isValid
  };
}










