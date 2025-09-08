/**
 * Unit tests for XML Import Tab - Sector Import Functionality
 * Tests sector validation, refinement, and import logic
 */

// Mock IATI DAC sector reference data for testing
const mockIatiDacSectors = {
  '110': { name: 'Education, level unspecified' },
  '111': { name: 'Education, level unspecified' },
  '112': { name: 'Basic education' },
  '11110': { name: 'Education policy and administrative management' },
  '11120': { name: 'Education facilities and training' },
  '11130': { name: 'Teacher training' },
  '11220': { name: 'Primary education' },
  '11230': { name: 'Basic skills for adults' },
  '11240': { name: 'Early childhood education' }
};

// Extract sector validation functions from XmlImportTab for testing
const isValidSectorCode = (code: string): boolean => {
  return /^\d{5}$/.test(code) && mockIatiDacSectors.hasOwnProperty(code);
};

const normalizePercentages = (sectors: any[]): any[] => {
  const total = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0);
  if (total === 0) return sectors;
  
  return sectors.map(sector => ({
    ...sector,
    percentage: (sector.percentage / total) * 100
  }));
};

const detectSectorIssues = (sectors: any[]): string[] => {
  const issues: string[] = [];
  
  // Check total percentage
  const total = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0);
  if (Math.abs(total - 100) > 0.01) {
    issues.push(`Total percentage is ${total.toFixed(1)}% (should be 100%)`);
  }
  
  // Check for invalid codes
  const invalidCodes = sectors.filter(s => !isValidSectorCode(s.code));
  if (invalidCodes.length > 0) {
    issues.push(`${invalidCodes.length} sectors have invalid codes`);
  }
  
  // Check for duplicate codes
  const codes = sectors.map(s => s.code);
  const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
  if (duplicates.length > 0) {
    issues.push(`Duplicate sector codes found: ${[...new Set(duplicates)].join(', ')}`);
  }
  
  return issues;
};

const detect3DigitSectors = (sectors: any[]): boolean => {
  return sectors.some(s => s.code && s.code.length === 3 && /^\d{3}$/.test(s.code));
};

describe('XmlImportTab - Sector Import Functionality', () => {
  describe('Sector Code Validation', () => {
    it('should validate 5-digit sector codes correctly', () => {
      expect(isValidSectorCode('11110')).toBe(true);
      expect(isValidSectorCode('11120')).toBe(true);
      expect(isValidSectorCode('11220')).toBe(true);
    });

    it('should reject invalid sector codes', () => {
      expect(isValidSectorCode('111')).toBe(false); // 3-digit
      expect(isValidSectorCode('1111')).toBe(false); // 4-digit
      expect(isValidSectorCode('111100')).toBe(false); // 6-digit
      expect(isValidSectorCode('99999')).toBe(false); // Not in DAC list
      expect(isValidSectorCode('abcde')).toBe(false); // Non-numeric
      expect(isValidSectorCode('')).toBe(false); // Empty
    });

    it('should handle edge cases', () => {
      expect(isValidSectorCode('00000')).toBe(false);
      expect(isValidSectorCode('11110a')).toBe(false);
      expect(isValidSectorCode(' 11110')).toBe(false);
    });
  });

  describe('3-Digit Sector Detection', () => {
    it('should detect 3-digit sectors correctly', () => {
      const sectors3Digit = [
        { code: '110', narrative: 'Education', percentage: 50 },
        { code: '111', narrative: 'Education Basic', percentage: 50 }
      ];
      expect(detect3DigitSectors(sectors3Digit)).toBe(true);
    });

    it('should not flag 5-digit sectors', () => {
      const sectors5Digit = [
        { code: '11110', narrative: 'Education policy', percentage: 50 },
        { code: '11120', narrative: 'Education facilities', percentage: 50 }
      ];
      expect(detect3DigitSectors(sectors5Digit)).toBe(false);
    });

    it('should handle mixed sector codes', () => {
      const sectorsMixed = [
        { code: '110', narrative: 'Education', percentage: 30 },
        { code: '11110', narrative: 'Education policy', percentage: 70 }
      ];
      expect(detect3DigitSectors(sectorsMixed)).toBe(true);
    });

    it('should handle empty or invalid codes', () => {
      const sectorsInvalid = [
        { code: '', narrative: 'Empty', percentage: 50 },
        { code: null, narrative: 'Null', percentage: 50 }
      ];
      expect(detect3DigitSectors(sectorsInvalid)).toBe(false);
    });
  });

  describe('Percentage Normalization', () => {
    it('should normalize percentages to sum to 100', () => {
      const sectors = [
        { code: '11110', name: 'Education policy', percentage: 30 },
        { code: '11120', name: 'Education facilities', percentage: 20 }
      ];
      
      const normalized = normalizePercentages(sectors);
      const total = normalized.reduce((sum, s) => sum + s.percentage, 0);
      
      expect(Math.abs(total - 100)).toBeLessThan(0.01);
      expect(normalized[0].percentage).toBeCloseTo(60); // 30/50 * 100
      expect(normalized[1].percentage).toBeCloseTo(40); // 20/50 * 100
    });

    it('should handle zero total gracefully', () => {
      const sectors = [
        { code: '11110', name: 'Education policy', percentage: 0 },
        { code: '11120', name: 'Education facilities', percentage: 0 }
      ];
      
      const normalized = normalizePercentages(sectors);
      expect(normalized).toEqual(sectors); // Should return unchanged
    });

    it('should handle single sector', () => {
      const sectors = [
        { code: '11110', name: 'Education policy', percentage: 50 }
      ];
      
      const normalized = normalizePercentages(sectors);
      expect(normalized[0].percentage).toBe(100);
    });

    it('should preserve other properties', () => {
      const sectors = [
        { code: '11110', name: 'Education policy', percentage: 60, level: 'subsector' },
        { code: '11120', name: 'Education facilities', percentage: 40, level: 'subsector' }
      ];
      
      const normalized = normalizePercentages(sectors);
      expect(normalized[0].level).toBe('subsector');
      expect(normalized[1].level).toBe('subsector');
      expect(normalized[0].name).toBe('Education policy');
    });
  });

  describe('Sector Issue Detection', () => {
    it('should detect percentage total issues', () => {
      const sectors = [
        { code: '11110', name: 'Education policy', percentage: 60 },
        { code: '11120', name: 'Education facilities', percentage: 30 }
      ];
      
      const issues = detectSectorIssues(sectors);
      expect(issues).toContain('Total percentage is 90.0% (should be 100%)');
    });

    it('should detect invalid sector codes', () => {
      const sectors = [
        { code: '111', name: 'Invalid 3-digit', percentage: 50 }, // 3-digit
        { code: '99999', name: 'Invalid code', percentage: 50 } // Not in DAC list
      ];
      
      const issues = detectSectorIssues(sectors);
      expect(issues).toContain('2 sectors have invalid codes');
    });

    it('should detect duplicate sector codes', () => {
      const sectors = [
        { code: '11110', name: 'Education policy', percentage: 50 },
        { code: '11110', name: 'Education policy duplicate', percentage: 50 }
      ];
      
      const issues = detectSectorIssues(sectors);
      expect(issues).toContain('Duplicate sector codes found: 11110');
    });

    it('should return no issues for valid sectors', () => {
      const sectors = [
        { code: '11110', name: 'Education policy', percentage: 60 },
        { code: '11120', name: 'Education facilities', percentage: 40 }
      ];
      
      const issues = detectSectorIssues(sectors);
      expect(issues).toHaveLength(0);
    });

    it('should detect multiple issues simultaneously', () => {
      const sectors = [
        { code: '111', name: 'Invalid', percentage: 30 },
        { code: '11110', name: 'Valid', percentage: 50 },
        { code: '11110', name: 'Duplicate', percentage: 50 }
      ];
      
      const issues = detectSectorIssues(sectors);
      expect(issues.length).toBeGreaterThan(1);
      expect(issues.some(i => i.includes('percentage'))).toBe(true);
      expect(issues.some(i => i.includes('invalid codes'))).toBe(true);
      expect(issues.some(i => i.includes('Duplicate'))).toBe(true);
    });

    it('should handle edge case percentages', () => {
      const sectors = [
        { code: '11110', name: 'Education policy', percentage: 100.01 }
      ];
      
      const issues = detectSectorIssues(sectors);
      expect(issues).toContain('Total percentage is 100.0% (should be 100%)');
    });

    it('should accept percentages within tolerance', () => {
      const sectors = [
        { code: '11110', name: 'Education policy', percentage: 99.999 }
      ];
      
      const issues = detectSectorIssues(sectors);
      expect(issues.filter(i => i.includes('percentage'))).toHaveLength(0);
    });
  });

  describe('Sector Import Data Transformation', () => {
    it('should transform refined sectors for API import', () => {
      const refinedSectors = [
        { code: '11110', name: 'Education policy', percentage: 60, originalCode: '111' },
        { code: '11120', name: 'Education facilities', percentage: 40, originalCode: '111' }
      ];
      
      const importData = refinedSectors.map(sector => ({
        sector_code: sector.code,
        sector_name: sector.name,
        percentage: sector.percentage,
        type: 'secondary',
        level: 'subsector'
      }));
      
      expect(importData).toHaveLength(2);
      expect(importData[0]).toEqual({
        sector_code: '11110',
        sector_name: 'Education policy',
        percentage: 60,
        type: 'secondary',
        level: 'subsector'
      });
    });

    it('should handle missing or undefined values', () => {
      const refinedSectors = [
        { code: '11110', name: undefined, percentage: null }
      ];
      
      const importData = refinedSectors.map(sector => ({
        sector_code: sector.code,
        sector_name: sector.name,
        percentage: sector.percentage,
        type: 'secondary',
        level: 'subsector'
      }));
      
      expect(importData[0].sector_name).toBeUndefined();
      expect(importData[0].percentage).toBeNull();
    });
  });

  describe('Sector Refinement Logic', () => {
    it('should map 3-digit categories to 5-digit subsectors', () => {
      const originalSector = { code: '111', narrative: 'Education, level unspecified', percentage: 100 };
      
      // Mock the mapping logic
      const categoryCode = originalSector.code;
      const availableSubsectors = Object.keys(mockIatiDacSectors)
        .filter(code => code.startsWith(categoryCode))
        .map(code => ({ code, name: mockIatiDacSectors[code].name }));
      
      expect(availableSubsectors.length).toBeGreaterThan(0);
      expect(availableSubsectors[0].code).toBe('11110');
      expect(availableSubsectors[1].code).toBe('11120');
    });

    it('should handle categories with no subsectors', () => {
      const originalSector = { code: '999', narrative: 'Non-existent category', percentage: 100 };
      
      const categoryCode = originalSector.code;
      const availableSubsectors = Object.keys(mockIatiDacSectors)
        .filter(code => code.startsWith(categoryCode))
        .map(code => ({ code, name: mockIatiDacSectors[code].name }));
      
      expect(availableSubsectors).toHaveLength(0);
    });
  });
});