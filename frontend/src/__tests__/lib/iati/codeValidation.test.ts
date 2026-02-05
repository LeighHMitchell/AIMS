/**
 * IATI Code Validation Tests
 *
 * Tests validation of IATI standard codes:
 * - Transaction types (1-9, 11-13)
 * - Flow types
 * - Finance types
 * - Aid types
 * - Tied status
 * - Sector codes
 * - Disbursement channels
 */

import { describe, it, expect } from 'vitest';

// Validation functions matching the parse route
function isValidTransactionType(type: string): boolean {
  const validTypes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '12', '13'];
  return validTypes.includes(type);
}

function isValidFlowType(type: string): boolean {
  const validTypes = ['10', '13', '14', '15', '19', '20', '21', '22', '30', '35', '36', '37', '40', '50'];
  return validTypes.includes(type);
}

function isValidFinanceType(type: string): boolean {
  const validTypes = [
    '1', '100', '110', '111', '210', '211', '310', '311', '410', '411', '412', '413', '414',
    '451', '452', '453', '510', '511', '512', '600', '610', '611', '612', '613', '614', '615',
    '616', '617', '618', '620', '621', '622', '623', '624', '625', '626', '627', '630', '631',
    '632', '633', '634', '700', '710', '711', '810', '811', '910', '911', '912', '913'
  ];
  return validTypes.includes(type);
}

function isValidAidType(type: string): boolean {
  const validTypes = [
    'A01', 'A02', 'B01', 'B02', 'B03', 'B04', 'C01', 'D01', 'D02',
    'E01', 'E02', 'F01', 'G01', 'H01', 'H02', 'H03', 'H04', 'H05'
  ];
  return validTypes.includes(type);
}

function isValidTiedStatus(status: string): boolean {
  const validStatuses = ['1', '3', '4', '5'];
  return validStatuses.includes(status);
}

function isValidDisbursementChannel(channel: string): boolean {
  const validChannels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
  return validChannels.includes(channel);
}

function isValidSectorCode(code: string): boolean {
  return /^[1-9]\d{4}$/.test(code);
}

describe('Transaction Type Validation', () => {
  describe('TC-VAL-010: Accept valid transaction type codes', () => {
    const validTypes = [
      { code: '1', name: 'Incoming Funds' },
      { code: '2', name: 'Outgoing Commitment' },
      { code: '3', name: 'Disbursement' },
      { code: '4', name: 'Expenditure' },
      { code: '5', name: 'Interest Payment' },
      { code: '6', name: 'Loan Repayment' },
      { code: '7', name: 'Reimbursement' },
      { code: '8', name: 'Purchase of Equity' },
      { code: '9', name: 'Sale of Equity' },
      { code: '11', name: 'Incoming Commitment' },
      { code: '12', name: 'Outgoing Pledge' },
      { code: '13', name: 'Incoming Pledge' }
    ];

    validTypes.forEach(({ code, name }) => {
      it(`should accept type ${code} (${name})`, () => {
        expect(isValidTransactionType(code)).toBe(true);
      });
    });
  });

  describe('TC-VAL-011: Reject invalid transaction type code 10', () => {
    it('should reject type 10 (not used in IATI)', () => {
      expect(isValidTransactionType('10')).toBe(false);
    });
  });

  describe('TC-VAL-012: Reject other invalid codes', () => {
    const invalidTypes = ['0', '-1', '14', '99', 'abc', '', '1.5'];

    invalidTypes.forEach(code => {
      it(`should reject invalid type "${code}"`, () => {
        expect(isValidTransactionType(code)).toBe(false);
      });
    });
  });
});

describe('Flow Type Validation', () => {
  describe('TC-VAL-FLOW: Validate flow type codes', () => {
    const validFlowTypes = [
      { code: '10', name: 'ODA' },
      { code: '13', name: 'ODA-PSI' },
      { code: '20', name: 'OOF' },
      { code: '30', name: 'Private Development Finance' },
      { code: '40', name: 'Non Flow' },
      { code: '50', name: 'Other flows' }
    ];

    validFlowTypes.forEach(({ code, name }) => {
      it(`should accept flow type ${code} (${name})`, () => {
        expect(isValidFlowType(code)).toBe(true);
      });
    });

    const invalidFlowTypes = ['0', '1', '11', '12', '99', '', 'ODA'];

    invalidFlowTypes.forEach(code => {
      it(`should reject invalid flow type "${code}"`, () => {
        expect(isValidFlowType(code)).toBe(false);
      });
    });
  });
});

describe('Finance Type Validation', () => {
  describe('TC-VAL-030: Accept standard finance type codes', () => {
    const validFinanceTypes = [
      { code: '110', name: 'Standard grant' },
      { code: '210', name: 'Interest subsidy grant' },
      { code: '310', name: 'Capital subscription deposit' },
      { code: '410', name: 'Aid loan excluding debt reorganisation' },
      { code: '510', name: 'Common equity' },
      { code: '610', name: 'Debt relief' },
      { code: '710', name: 'Foreign direct investment' },
      { code: '810', name: 'Bank bonds' },
      { code: '910', name: 'Other securities/claims' }
    ];

    validFinanceTypes.forEach(({ code, name }) => {
      it(`should accept finance type ${code} (${name})`, () => {
        expect(isValidFinanceType(code)).toBe(true);
      });
    });
  });

  describe('TC-VAL-031: Reject invalid finance types', () => {
    const invalidFinanceTypes = ['0', '50', '999', '1000', '', 'grant'];

    invalidFinanceTypes.forEach(code => {
      it(`should reject invalid finance type "${code}"`, () => {
        expect(isValidFinanceType(code)).toBe(false);
      });
    });
  });
});

describe('Aid Type Validation', () => {
  describe('TC-VAL-AID: Validate aid type codes', () => {
    const validAidTypes = [
      { code: 'A01', name: 'General budget support' },
      { code: 'A02', name: 'Sector budget support' },
      { code: 'B01', name: 'Core support to NGOs' },
      { code: 'B02', name: 'Core contributions to multilateral' },
      { code: 'C01', name: 'Project-type interventions' },
      { code: 'D01', name: 'Donor country personnel' },
      { code: 'E01', name: 'Scholarships/training in donor country' },
      { code: 'F01', name: 'Debt relief' },
      { code: 'G01', name: 'Administrative costs not included elsewhere' },
      { code: 'H01', name: 'Development awareness' }
    ];

    validAidTypes.forEach(({ code, name }) => {
      it(`should accept aid type ${code} (${name})`, () => {
        expect(isValidAidType(code)).toBe(true);
      });
    });

    const invalidAidTypes = ['A00', 'Z01', 'Z99', '001', '', 'project'];

    invalidAidTypes.forEach(code => {
      it(`should reject invalid aid type "${code}"`, () => {
        expect(isValidAidType(code)).toBe(false);
      });
    });
  });
});

describe('Tied Status Validation', () => {
  describe('TC-VAL-TIED: Validate tied status codes', () => {
    const validStatuses = [
      { code: '1', name: 'Tied' },
      { code: '3', name: 'Partially tied' },
      { code: '4', name: 'Untied' },
      { code: '5', name: 'Not applicable' }
    ];

    validStatuses.forEach(({ code, name }) => {
      it(`should accept tied status ${code} (${name})`, () => {
        expect(isValidTiedStatus(code)).toBe(true);
      });
    });

    // Note: Code 2 (partially untied) was withdrawn
    const invalidStatuses = ['0', '2', '6', '9', '', 'tied'];

    invalidStatuses.forEach(code => {
      it(`should reject invalid tied status "${code}"`, () => {
        expect(isValidTiedStatus(code)).toBe(false);
      });
    });
  });
});

describe('Disbursement Channel Validation', () => {
  describe('TC-VAL-DISB: Validate disbursement channel codes', () => {
    const validChannels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];

    validChannels.forEach(code => {
      it(`should accept disbursement channel ${code}`, () => {
        expect(isValidDisbursementChannel(code)).toBe(true);
      });
    });

    const invalidChannels = ['0', '14', '99', '', 'direct'];

    invalidChannels.forEach(code => {
      it(`should reject invalid disbursement channel "${code}"`, () => {
        expect(isValidDisbursementChannel(code)).toBe(false);
      });
    });
  });
});

describe('Sector Code Validation', () => {
  describe('TC-VAL-020: Accept 5-digit DAC sector codes', () => {
    const validSectorCodes = [
      { code: '11110', name: 'Education policy' },
      { code: '11120', name: 'Education facilities' },
      { code: '12110', name: 'Health policy' },
      { code: '14010', name: 'Water sector policy' },
      { code: '15110', name: 'Public sector policy' },
      { code: '31110', name: 'Agricultural policy' },
      { code: '72010', name: 'Material relief' },
      { code: '99810', name: 'Sectors not specified' }
    ];

    validSectorCodes.forEach(({ code, name }) => {
      it(`should accept sector code ${code} (${name})`, () => {
        expect(isValidSectorCode(code)).toBe(true);
      });
    });
  });

  describe('TC-VAL-021: Reject invalid sector code formats', () => {
    const invalidSectorCodes = [
      { code: '111', reason: 'only 3 digits' },
      { code: '1111', reason: 'only 4 digits' },
      { code: '111111', reason: '6 digits' },
      { code: '01110', reason: 'starts with 0' },
      { code: 'ABCDE', reason: 'letters' },
      { code: '1111A', reason: 'contains letter' },
      { code: '', reason: 'empty' },
      { code: '11110.5', reason: 'decimal' }
    ];

    invalidSectorCodes.forEach(({ code, reason }) => {
      it(`should reject "${code}" (${reason})`, () => {
        expect(isValidSectorCode(code)).toBe(false);
      });
    });
  });

  describe('TC-VAL-SECTOR-RANGE: Validate sector code ranges', () => {
    it('should accept codes starting with 1-9', () => {
      expect(isValidSectorCode('11110')).toBe(true);
      expect(isValidSectorCode('21010')).toBe(true);
      expect(isValidSectorCode('31110')).toBe(true);
      expect(isValidSectorCode('41010')).toBe(true);
      expect(isValidSectorCode('51010')).toBe(true);
      expect(isValidSectorCode('99810')).toBe(true);
    });

    it('should reject codes starting with 0', () => {
      expect(isValidSectorCode('01110')).toBe(false);
      expect(isValidSectorCode('00000')).toBe(false);
    });
  });
});

describe('Required Field Validation', () => {
  describe('TC-VAL-001: Validate required transaction fields', () => {
    interface Transaction {
      type?: string;
      date?: string;
      value?: number;
      currency?: string;
    }

    function validateTransaction(tx: Transaction): { valid: boolean; errors: string[] } {
      const errors: string[] = [];

      if (!tx.date) {
        errors.push('Missing required transaction date');
      }

      if (tx.value === undefined || tx.value === null || tx.value <= 0) {
        errors.push('Missing or invalid transaction value');
      }

      if (tx.type && !isValidTransactionType(tx.type)) {
        errors.push(`Invalid transaction type: ${tx.type}`);
      }

      return { valid: errors.length === 0, errors };
    }

    it('should pass validation for complete transaction', () => {
      const result = validateTransaction({
        type: '3',
        date: '2024-01-15',
        value: 100000,
        currency: 'USD'
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing date', () => {
      const result = validateTransaction({
        type: '3',
        value: 100000,
        currency: 'USD'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required transaction date');
    });

    it('should fail validation for missing value', () => {
      const result = validateTransaction({
        type: '3',
        date: '2024-01-15',
        currency: 'USD'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid transaction value');
    });

    it('should fail validation for zero value', () => {
      const result = validateTransaction({
        type: '3',
        date: '2024-01-15',
        value: 0,
        currency: 'USD'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid transaction value');
    });

    it('should fail validation for negative value', () => {
      const result = validateTransaction({
        type: '3',
        date: '2024-01-15',
        value: -100000,
        currency: 'USD'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid transaction value');
    });

    it('should fail validation for invalid transaction type', () => {
      const result = validateTransaction({
        type: '10', // Invalid type
        date: '2024-01-15',
        value: 100000,
        currency: 'USD'
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid transaction type'))).toBe(true);
    });
  });
});

describe('Percentage Validation', () => {
  describe('TC-VAL-040: Validate sector percentages sum to 100%', () => {
    interface Sector {
      code: string;
      percentage: number;
    }

    function validateSectorPercentages(sectors: Sector[]): { valid: boolean; warning?: string } {
      if (sectors.length === 0) {
        return { valid: true };
      }

      const total = sectors.reduce((sum, s) => sum + s.percentage, 0);
      const tolerance = 0.01; // Allow small rounding errors

      if (Math.abs(total - 100) > tolerance) {
        return {
          valid: false,
          warning: `Sector percentages sum to ${total}%, expected 100%`
        };
      }

      return { valid: true };
    }

    it('should pass when percentages sum to 100%', () => {
      const result = validateSectorPercentages([
        { code: '11110', percentage: 60 },
        { code: '11120', percentage: 40 }
      ]);
      expect(result.valid).toBe(true);
    });

    it('should pass for single sector at 100%', () => {
      const result = validateSectorPercentages([
        { code: '11110', percentage: 100 }
      ]);
      expect(result.valid).toBe(true);
    });

    it('should warn when percentages sum to less than 100%', () => {
      const result = validateSectorPercentages([
        { code: '11110', percentage: 50 },
        { code: '11120', percentage: 30 }
      ]);
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('80%');
    });

    it('should warn when percentages sum to more than 100%', () => {
      const result = validateSectorPercentages([
        { code: '11110', percentage: 60 },
        { code: '11120', percentage: 50 }
      ]);
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('110%');
    });

    it('should accept small rounding differences', () => {
      const result = validateSectorPercentages([
        { code: '11110', percentage: 33.33 },
        { code: '11120', percentage: 33.33 },
        { code: '11130', percentage: 33.34 }
      ]);
      expect(result.valid).toBe(true);
    });

    it('should pass for empty sectors array', () => {
      const result = validateSectorPercentages([]);
      expect(result.valid).toBe(true);
    });
  });

  describe('TC-VAL-042: Validate recipient country percentages sum to 100%', () => {
    interface RecipientCountry {
      code: string;
      percentage: number;
    }

    function validateCountryPercentages(countries: RecipientCountry[]): { valid: boolean; warning?: string } {
      if (countries.length === 0) {
        return { valid: true };
      }

      const total = countries.reduce((sum, c) => sum + c.percentage, 0);
      const tolerance = 0.01;

      if (Math.abs(total - 100) > tolerance) {
        return {
          valid: false,
          warning: `Recipient country percentages sum to ${total}%, expected 100%`
        };
      }

      return { valid: true };
    }

    it('should pass when country percentages sum to 100%', () => {
      const result = validateCountryPercentages([
        { code: 'MM', percentage: 70 },
        { code: 'TH', percentage: 30 }
      ]);
      expect(result.valid).toBe(true);
    });

    it('should pass for single country at 100%', () => {
      const result = validateCountryPercentages([
        { code: 'MM', percentage: 100 }
      ]);
      expect(result.valid).toBe(true);
    });

    it('should warn when country percentages do not sum to 100%', () => {
      const result = validateCountryPercentages([
        { code: 'MM', percentage: 50 }
      ]);
      expect(result.valid).toBe(false);
    });
  });
});
