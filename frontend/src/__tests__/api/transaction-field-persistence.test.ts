/**
 * Transaction Field Persistence Tests
 * 
 * These tests verify that transaction field updates persist correctly,
 * especially for boolean and enum fields that were previously buggy.
 * 
 * CRITICAL: These tests ensure that the boolean field bug (false -> null)
 * and enum field inconsistencies are fixed and stay fixed.
 */

import { cleanBooleanValue, cleanEnumValue, cleanTransactionFields } from '@/lib/transaction-field-cleaner';

describe('Transaction Field Persistence', () => {
  describe('Boolean Field Handling', () => {
    it('should preserve false value for is_humanitarian', () => {
      const data = {
        is_humanitarian: false,
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.is_humanitarian).toBe(false);
      expect(cleaned.is_humanitarian).not.toBeNull();
      expect(cleaned.is_humanitarian).not.toBeUndefined();
    });

    it('should preserve true value for is_humanitarian', () => {
      const data = {
        is_humanitarian: true,
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.is_humanitarian).toBe(true);
    });

    it('should handle undefined for is_humanitarian by not including it', () => {
      const data = {
        transaction_type: '1',
        // is_humanitarian is not provided
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned).not.toHaveProperty('is_humanitarian');
    });

    it('should convert null to false for is_humanitarian when explicitly provided', () => {
      const data = {
        is_humanitarian: null,
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.is_humanitarian).toBe(false);
    });

    it('should handle finance_type_inherited boolean correctly', () => {
      const data = {
        finance_type_inherited: false,
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.finance_type_inherited).toBe(false);
    });

    it('should handle fx_differs boolean correctly', () => {
      const data = {
        fx_differs: true,
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.fx_differs).toBe(true);
    });
  });

  describe('Enum Field Handling', () => {
    it('should save valid aid_type', () => {
      const data = {
        aid_type: 'A01',
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.aid_type).toBe('A01');
    });

    it('should convert empty string to null for aid_type', () => {
      const data = {
        aid_type: '',
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.aid_type).toBeNull();
    });

    it('should convert "none" to null for flow_type', () => {
      const data = {
        flow_type: 'none',
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.flow_type).toBeNull();
    });

    it('should trim whitespace from enum values', () => {
      const data = {
        finance_type: '  110  ',
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.finance_type).toBe('110');
    });

    it('should handle all IATI classification fields', () => {
      const data = {
        aid_type: 'A01',
        flow_type: '10',
        finance_type: '110',
        tied_status: '3',
        disbursement_channel: '1',
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.aid_type).toBe('A01');
      expect(cleaned.flow_type).toBe('10');
      expect(cleaned.finance_type).toBe('110');
      expect(cleaned.tied_status).toBe('3');
      expect(cleaned.disbursement_channel).toBe('1');
    });

    it('should convert "undefined" string to null', () => {
      const data = {
        tied_status: 'undefined',
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.tied_status).toBeNull();
    });

    it('should convert "null" string to null', () => {
      const data = {
        disbursement_channel: 'null',
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.disbursement_channel).toBeNull();
    });
  });

  describe('Mixed Field Types', () => {
    it('should handle a complete transaction update payload', () => {
      const data = {
        transaction_type: '1',
        transaction_date: '2024-01-15',
        value: 50000,
        currency: 'USD',
        status: 'actual',
        transaction_reference: 'TXN-2024-001',
        description: 'Emergency relief supplies',
        provider_org_id: '123e4567-e89b-12d3-a456-426614174000',
        receiver_org_id: '987e6543-e21b-12d3-a456-426614174000',
        aid_type: 'B01',
        flow_type: '10',
        finance_type: '110',
        tied_status: '5',
        disbursement_channel: '1',
        is_humanitarian: true,
        financing_classification: 'ODA Grant',
      };

      const cleaned = cleanTransactionFields(data);

      // Core fields
      expect(cleaned.transaction_type).toBe('1');
      expect(cleaned.value).toBe(50000);
      
      // UUIDs
      expect(cleaned.provider_org_id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(cleaned.receiver_org_id).toBe('987e6543-e21b-12d3-a456-426614174000');
      
      // Enums
      expect(cleaned.aid_type).toBe('B01');
      expect(cleaned.flow_type).toBe('10');
      expect(cleaned.tied_status).toBe('5');
      
      // Boolean
      expect(cleaned.is_humanitarian).toBe(true);
    });

    it('should handle partial updates correctly', () => {
      // Simulating a field-level autosave that only updates one field
      const data = {
        is_humanitarian: false,
      };

      const cleaned = cleanTransactionFields(data);

      // Should only have the one field
      expect(Object.keys(cleaned)).toHaveLength(1);
      expect(cleaned.is_humanitarian).toBe(false);
    });

    it('should handle clearing optional fields', () => {
      const data = {
        aid_type: null,
        flow_type: '',
        tied_status: 'none',
        disbursement_channel: undefined,
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.aid_type).toBeNull();
      expect(cleaned.flow_type).toBeNull();
      expect(cleaned.tied_status).toBeNull();
      expect(cleaned).not.toHaveProperty('disbursement_channel');
    });
  });

  describe('Regression Tests for Original Bug', () => {
    it('REGRESSION: false for is_humanitarian should NOT become null', () => {
      // This is the exact scenario that was failing before the fix
      const userInput = {
        is_humanitarian: false, // User unchecked the humanitarian checkbox
      };

      const cleaned = cleanTransactionFields(userInput);

      // Before the fix, this would be null due to `value || null`
      // After the fix, it should be false
      expect(cleaned.is_humanitarian).toBe(false);
      expect(cleaned.is_humanitarian).not.toBeNull();
    });

    it('REGRESSION: enum field with empty string should become null, not ""', () => {
      // Empty strings for enums should convert to null for database
      const userInput = {
        aid_type: '',
        flow_type: '',
      };

      const cleaned = cleanTransactionFields(userInput);

      expect(cleaned.aid_type).toBeNull();
      expect(cleaned.aid_type).not.toBe('');
      expect(cleaned.flow_type).toBeNull();
      expect(cleaned.flow_type).not.toBe('');
    });

    it('REGRESSION: all IATI fields mentioned in bug report should work', () => {
      // These are the fields the user mentioned having problems with
      const userInput = {
        aid_type: 'A02',
        finance_type: '410',
        flow_type: '30',
        tied_status: '4',
        disbursement_channel: '2',
        is_humanitarian: false,
      };

      const cleaned = cleanTransactionFields(userInput);

      expect(cleaned.aid_type).toBe('A02');
      expect(cleaned.finance_type).toBe('410');
      expect(cleaned.flow_type).toBe('30');
      expect(cleaned.tied_status).toBe('4');
      expect(cleaned.disbursement_channel).toBe('2');
      expect(cleaned.is_humanitarian).toBe(false); // This was the critical bug!
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace in enum values', () => {
      const data = {
        aid_type: '   A01   ',
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.aid_type).toBe('A01');
    });

    it('should handle zero as a valid value', () => {
      const data = {
        value: 0,
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.value).toBe(0);
    });

    it('should handle invalid UUIDs by converting to null', () => {
      const data = {
        provider_org_id: 'not-a-valid-uuid',
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.provider_org_id).toBeNull();
    });

    it('should preserve valid UUID with different casing', () => {
      const uuid = '123E4567-E89B-12D3-A456-426614174000';
      const data = {
        provider_org_id: uuid,
      };

      const cleaned = cleanTransactionFields(data);

      expect(cleaned.provider_org_id).toBe(uuid);
    });
  });
});

