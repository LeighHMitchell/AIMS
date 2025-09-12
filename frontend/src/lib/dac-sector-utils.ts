import dacSectorsData from '@/data/dac-sectors.json';

// Type definitions
interface DacSector {
  code: string;
  name: string;
  description: string;
}

type DacSectorCategory = {
  [category: string]: DacSector[];
};

// Cast the imported data
const sectorsData = dacSectorsData as DacSectorCategory;

/**
 * Extract category code from a full sector code
 * @param sectorCode - The 5-digit sector code (e.g., "11220")
 * @returns The 3-digit category code (e.g., "112")
 */
export function getCategoryCode(sectorCode: string): string {
  return sectorCode.substring(0, 3);
}

/**
 * Get category information from a sector code
 * @param sectorCode - The 5-digit sector code (e.g., "11220")
 * @returns Object with category code and name, or null if not found
 */
export function getCategoryInfo(sectorCode: string): { code: string; name: string } | null {
  const categoryCode = getCategoryCode(sectorCode);
  
  // Search through all categories to find the matching one
  for (const [categoryKey, sectors] of Object.entries(sectorsData)) {
    // Extract the category code from the key (e.g., "112" from "112 - Basic Education")
    const keyCategoryCode = categoryKey.split(' ')[0];
    
    if (keyCategoryCode === categoryCode) {
      // Extract the category name (everything after the first " - ")
      const categoryName = categoryKey.substring(categoryKey.indexOf(' - ') + 3);
      return {
        code: categoryCode,
        name: categoryName
      };
    }
  }
  
  return null;
}

/**
 * Get sector information by code
 * @param sectorCode - The 5-digit sector code (e.g., "11220")
 * @returns The sector object or null if not found
 */
export function getSectorInfo(sectorCode: string): DacSector | null {
  for (const sectors of Object.values(sectorsData)) {
    const sector = sectors.find(s => s.code === sectorCode);
    if (sector) {
      return sector;
    }
  }
  return null;
}

/**
 * Validate if a sector code exists in the DAC sectors data
 * @param sectorCode - The sector code to validate
 * @returns true if the sector code exists
 */
export function isValidSectorCode(sectorCode: string): boolean {
  return getSectorInfo(sectorCode) !== null;
}

/**
 * Get the clean sector name without the code prefix
 * @param sectorName - The full sector name (e.g., "11220 - Primary education")
 * @returns The clean name (e.g., "Primary education")
 */
export function getCleanSectorName(sectorName: string): string {
  const dashIndex = sectorName.indexOf(' - ');
  return dashIndex > -1 ? sectorName.substring(dashIndex + 3) : sectorName;
}

/**
 * Get sector information by code, handling both 3-digit and 5-digit codes
 * @param sectorCode - The sector code (e.g., "111", "11220")
 * @returns The sector object with name and description, or null if not found
 */
export function getSectorInfoFlexible(sectorCode: string): { name: string; description: string } | null {
  if (!sectorCode) return null;
  
  // For 5-digit codes, use the existing function
  if (sectorCode.length === 5) {
    const sectorInfo = getSectorInfo(sectorCode);
    if (sectorInfo) {
      return {
        name: sectorInfo.name,
        description: sectorInfo.description
      };
    }
  }
  
  // For 3-digit codes, look up the category
  if (sectorCode.length === 3) {
    const categoryInfo = getCategoryInfo(sectorCode + '00'); // Convert 3-digit to 5-digit for lookup
    if (categoryInfo) {
      return {
        name: categoryInfo.name,
        description: `Category: ${categoryInfo.name}`
      };
    }
  }
  
  // For other lengths, try to find a matching category
  if (sectorCode.length >= 3) {
    const categoryCode = sectorCode.substring(0, 3);
    const categoryInfo = getCategoryInfo(categoryCode + '00');
    if (categoryInfo) {
      return {
        name: categoryInfo.name,
        description: `Category: ${categoryInfo.name}`
      };
    }
  }
  
  return null;
} 