/**
 * Unit tests for IATI Policy Marker Significance Validation
 * Tests IATI v2.03 Policy Significance codelist rules
 */

import {
  validatePolicyMarkerSignificance,
  getMaxAllowedSignificance,
  getSignificanceLabel,
  getSignificanceDescription,
  getAvailableSignificanceOptions,
  type PolicyMarker
} from '../policy-marker-validation';

// Test data
const standardMarker: PolicyMarker = {
  iati_code: '1',
  code: 'gender_equality',
  name: 'Gender Equality',
  is_iati_standard: true
};

const desertificationMarker: PolicyMarker = {
  iati_code: '8',
  code: 'desertification',
  name: 'Aid Targeting the Objectives of the Convention to Combat Desertification',
  is_iati_standard: true
};

const rmncHMarker: PolicyMarker = {
  iati_code: '9',
  code: 'rmnch',
  name: 'Reproductive, Maternal, Newborn and Child Health (RMNCH)',
  is_iati_standard: true
};

const customMarker: PolicyMarker = {
  iati_code: null,
  code: 'custom_marker',
  name: 'Custom Policy Marker',
  is_iati_standard: false
};

describe('getMaxAllowedSignificance', () => {
  test('standard IATI markers allow significance 0-2', () => {
    expect(getMaxAllowedSignificance(standardMarker)).toBe(2);
  });

  test('desertification marker allows significance 0-3', () => {
    expect(getMaxAllowedSignificance(desertificationMarker)).toBe(3);
  });

  test('RMNCH marker allows significance 0-4', () => {
    expect(getMaxAllowedSignificance(rmncHMarker)).toBe(4);
  });

  test('custom markers allow full range 0-4', () => {
    expect(getMaxAllowedSignificance(customMarker)).toBe(4);
  });
});

describe('validatePolicyMarkerSignificance', () => {
  describe('standard IATI markers (0-2)', () => {
    test('accepts valid significance values 0-2', () => {
      expect(validatePolicyMarkerSignificance(standardMarker, 0).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(standardMarker, 1).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(standardMarker, 2).isValid).toBe(true);
    });

    test('rejects significance 3', () => {
      const result = validatePolicyMarkerSignificance(standardMarker, 3);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('only allows significance 0-2');
      expect(result.error).toContain('Higher values are reserved for Desertification');
    });

    test('rejects significance 4', () => {
      const result = validatePolicyMarkerSignificance(standardMarker, 4);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('only allows significance 0-2');
      expect(result.error).toContain('RMNCH (0-4)');
    });
  });

  describe('desertification marker (0-3)', () => {
    test('accepts valid significance values 0-3', () => {
      expect(validatePolicyMarkerSignificance(desertificationMarker, 0).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(desertificationMarker, 1).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(desertificationMarker, 2).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(desertificationMarker, 3).isValid).toBe(true);
    });

    test('rejects significance 4', () => {
      const result = validatePolicyMarkerSignificance(desertificationMarker, 4);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Desertification marker only allows significance 0-3');
      expect(result.error).toContain('principal objective AND in support of an action programme');
    });
  });

  describe('RMNCH marker (0-4)', () => {
    test('accepts all significance values 0-4', () => {
      expect(validatePolicyMarkerSignificance(rmncHMarker, 0).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(rmncHMarker, 1).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(rmncHMarker, 2).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(rmncHMarker, 3).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(rmncHMarker, 4).isValid).toBe(true);
    });
  });

  describe('custom markers (0-4)', () => {
    test('accepts all significance values 0-4', () => {
      expect(validatePolicyMarkerSignificance(customMarker, 0).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(customMarker, 1).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(customMarker, 2).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(customMarker, 3).isValid).toBe(true);
      expect(validatePolicyMarkerSignificance(customMarker, 4).isValid).toBe(true);
    });
  });

  describe('invalid significance values', () => {
    test('rejects negative values', () => {
      const result = validatePolicyMarkerSignificance(standardMarker, -1);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be between 0 and 4');
    });

    test('rejects values greater than 4', () => {
      const result = validatePolicyMarkerSignificance(standardMarker, 5);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be between 0 and 4');
    });
  });
});

describe('getSignificanceLabel', () => {
  test('returns correct labels for standard markers', () => {
    expect(getSignificanceLabel(0, standardMarker)).toBe('Not targeted');
    expect(getSignificanceLabel(1, standardMarker)).toBe('Significant objective');
    expect(getSignificanceLabel(2, standardMarker)).toBe('Principal objective');
    expect(getSignificanceLabel(3, standardMarker)).toBe('Principal objective AND in support of action programme');
    expect(getSignificanceLabel(4, standardMarker)).toBe('Explicit primary objective');
  });

  test('returns correct labels for RMNCH marker', () => {
    expect(getSignificanceLabel(0, rmncHMarker)).toBe('Negligible or no funding');
    expect(getSignificanceLabel(1, rmncHMarker)).toBe('At least a quarter of funding');
    expect(getSignificanceLabel(2, rmncHMarker)).toBe('Half of the funding');
    expect(getSignificanceLabel(3, rmncHMarker)).toBe('Most funding targeted');
    expect(getSignificanceLabel(4, rmncHMarker)).toBe('Explicit primary objective');
  });
});

describe('getAvailableSignificanceOptions', () => {
  test('returns correct options for standard markers (0-2)', () => {
    const options = getAvailableSignificanceOptions(standardMarker);
    expect(options).toHaveLength(3);
    expect(options.map(o => o.value)).toEqual([0, 1, 2]);
  });

  test('returns correct options for desertification marker (0-3)', () => {
    const options = getAvailableSignificanceOptions(desertificationMarker);
    expect(options).toHaveLength(4);
    expect(options.map(o => o.value)).toEqual([0, 1, 2, 3]);
  });

  test('returns correct options for RMNCH marker (0-4)', () => {
    const options = getAvailableSignificanceOptions(rmncHMarker);
    expect(options).toHaveLength(5);
    expect(options.map(o => o.value)).toEqual([0, 1, 2, 3, 4]);
  });

  test('returns correct options for custom markers (0-4)', () => {
    const options = getAvailableSignificanceOptions(customMarker);
    expect(options).toHaveLength(5);
    expect(options.map(o => o.value)).toEqual([0, 1, 2, 3, 4]);
  });

  test('includes proper descriptions for RMNCH-specific options', () => {
    const options = getAvailableSignificanceOptions(rmncHMarker);
    const option4 = options.find(o => o.value === 4);
    expect(option4?.description).toContain('all funding is targeted to RMNCH activities');
  });
});

describe('edge cases', () => {
  test('handles markers without IATI code', () => {
    const markerWithoutCode: PolicyMarker = {
      iati_code: null,
      code: 'test',
      name: 'Test Marker',
      is_iati_standard: true
    };
    expect(getMaxAllowedSignificance(markerWithoutCode)).toBe(2);
  });

  test('handles empty IATI code', () => {
    const markerWithEmptyCode: PolicyMarker = {
      iati_code: '',
      code: 'test',
      name: 'Test Marker',
      is_iati_standard: true
    };
    expect(getMaxAllowedSignificance(markerWithEmptyCode)).toBe(2);
  });
});