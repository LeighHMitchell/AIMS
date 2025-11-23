/**
 * Text utility functions for processing and extracting information from text
 */

/**
 * Extract acronym from activity title
 * Handles patterns like:
 * - "Full Name (ACRONYM)"
 * - "Full Name (ACRONYM) - Additional text"
 * - "Full Name [ACRONYM]"
 * 
 * @param title The activity title
 * @returns Object with acronym and cleaned title (title without acronym in parentheses)
 */
export function extractAcronymFromTitle(title: string | null | undefined): {
  acronym: string | null;
  cleanTitle: string;
} {
  if (!title) {
    return { acronym: null, cleanTitle: '' };
  }

  // Pattern 1: Match text in parentheses at the end or before additional text
  // Examples: "Full Name (CAPRED)", "Full Name (CSO SPACE) - Phase 2"
  const parenthesesPattern = /\(([A-Z][A-Z0-9\s-]{1,20})\)(?:\s*[-–—]\s*|$)/;
  const parenthesesMatch = title.match(parenthesesPattern);
  
  if (parenthesesMatch) {
    const acronym = parenthesesMatch[1].trim();
    // Only consider it an acronym if it's mostly uppercase and not too long
    const uppercaseRatio = (acronym.match(/[A-Z]/g) || []).length / acronym.replace(/\s/g, '').length;
    
    if (uppercaseRatio >= 0.6 && acronym.length <= 20) {
      // Remove the acronym from the title (optional - you might want to keep it)
      const cleanTitle = title.replace(parenthesesPattern, '').trim();
      return { acronym, cleanTitle: cleanTitle || title };
    }
  }

  // Pattern 2: Match text in square brackets
  // Example: "Full Name [CAPRED]"
  const bracketsPattern = /\[([A-Z][A-Z0-9\s-]{1,20})\](?:\s*[-–—]\s*|$)/;
  const bracketsMatch = title.match(bracketsPattern);
  
  if (bracketsMatch) {
    const acronym = bracketsMatch[1].trim();
    const uppercaseRatio = (acronym.match(/[A-Z]/g) || []).length / acronym.replace(/\s/g, '').length;
    
    if (uppercaseRatio >= 0.6 && acronym.length <= 20) {
      const cleanTitle = title.replace(bracketsPattern, '').trim();
      return { acronym, cleanTitle: cleanTitle || title };
    }
  }

  // No acronym found
  return { acronym: null, cleanTitle: title };
}

