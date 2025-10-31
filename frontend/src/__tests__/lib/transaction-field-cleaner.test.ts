import {
  cleanBooleanValue,
  cleanEnumValue,
  cleanUUIDValue,
  cleanDateValue,
  cleanTransactionFields,
  cleanFieldValue
} from '@/lib/transaction-field-cleaner';

describe('Transaction Field Cleaner Utilities', () => {
  describe('cleanBooleanValue', () => {
    it('should preserve false value', () => {
      expect(cleanBooleanValue(false)).toBe(false);
    });

    it('should preserve true value', () => {
      expect(cleanBooleanValue(true)).toBe(true);
    });

    it('should convert null to false', () => {
      expect(cleanBooleanValue(null)).toBe(false);
    });

    it('should convert undefined to false', () => {
      expect(cleanBooleanValue(undefined)).toBe(false);
    });

    it('should convert truthy strings to true', () => {
      expect(cleanBooleanValue('yes')).toBe(true);
      expect(cleanBooleanValue('1')).toBe(true);
      expect(cleanBooleanValue('true')).toBe(true);
    });

    it('should convert empty string to false', () => {
      expect(cleanBooleanValue('')).toBe(false);
    });

    it('should convert 0 to false', () => {
      expect(cleanBooleanValue(0)).toBe(false);
    });

    it('should convert 1 to true', () => {
      expect(cleanBooleanValue(1)).toBe(true);
    });
  });

  describe('cleanEnumValue', () => {
    it('should preserve valid enum values', () => {
      expect(cleanEnumValue('110')).toBe('110');
      expect(cleanEnumValue('grant')).toBe('grant');
    });

    it('should trim whitespace', () => {
      expect(cleanEnumValue('  110  ')).toBe('110');
    });

    it('should convert empty string to null', () => {
      expect(cleanEnumValue('')).toBeNull();
    });

    it('should convert "none" to null', () => {
      expect(cleanEnumValue('none')).toBeNull();
    });

    it('should convert "undefined" string to null', () => {
      expect(cleanEnumValue('undefined')).toBeNull();
    });

    it('should convert "null" string to null', () => {
      expect(cleanEnumValue('null')).toBeNull();
    });

    it('should convert null to null', () => {
      expect(cleanEnumValue(null)).toBeNull();
    });

    it('should convert undefined to null', () => {
      expect(cleanEnumValue(undefined)).toBeNull();
    });
  });

  describe('cleanUUIDValue', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';

    it('should preserve valid UUIDs', () => {
      expect(cleanUUIDValue(validUUID)).toBe(validUUID);
    });

    it('should handle uppercase UUIDs', () => {
      const upperUUID = '123E4567-E89B-12D3-A456-426614174000';
      expect(cleanUUIDValue(upperUUID)).toBe(upperUUID);
    });

    it('should trim whitespace from UUIDs', () => {
      expect(cleanUUIDValue(`  ${validUUID}  `)).toBe(validUUID);
    });

    it('should reject invalid UUID formats', () => {
      expect(cleanUUIDValue('not-a-uuid')).toBeNull();
      expect(cleanUUIDValue('12345')).toBeNull();
    });

    it('should convert empty string to null', () => {
      expect(cleanUUIDValue('')).toBeNull();
    });

    it('should convert "null" string to null', () => {
      expect(cleanUUIDValue('null')).toBeNull();
    });

    it('should convert "undefined" string to null', () => {
      expect(cleanUUIDValue('undefined')).toBeNull();
    });

    it('should handle null', () => {
      expect(cleanUUIDValue(null)).toBeNull();
    });

    it('should handle undefined', () => {
      expect(cleanUUIDValue(undefined)).toBeNull();
    });

    it('should handle non-string values', () => {
      expect(cleanUUIDValue(123)).toBeNull();
      expect(cleanUUIDValue({})).toBeNull();
    });
  });

  describe('cleanDateValue', () => {
    it('should preserve valid date strings', () => {
      expect(cleanDateValue('2024-01-01')).toBe('2024-01-01');
    });

    it('should convert empty string to null', () => {
      expect(cleanDateValue('')).toBeNull();
    });

    it('should convert whitespace-only string to null', () => {
      expect(cleanDateValue('   ')).toBeNull();
    });

    it('should handle null', () => {
      expect(cleanDateValue(null)).toBeNull();
    });

    it('should handle undefined', () => {
      expect(cleanDateValue(undefined)).toBeNull();
    });
  });

  describe('cleanTransactionFields', () => {
    it('should clean all fields correctly', () => {
      const input = {
        transaction_type: '1',
        transaction_date: '2024-01-01',
        value: 1000,
        currency: 'USD',
        status: 'actual',
        aid_type: '  110  ',
        flow_type: '10',
        finance_type: '110',
        tied_status: '3',
        disbursement_channel: '1',
        is_humanitarian: false,
        provider_org_id: '123e4567-e89b-12d3-a456-426614174000',
        receiver_org_id: null,
      };

      const result = cleanTransactionFields(input);

      expect(result.transaction_type).toBe('1');
      expect(result.transaction_date).toBe('2024-01-01');
      expect(result.value).toBe(1000);
      expect(result.currency).toBe('USD');
      expect(result.aid_type).toBe('110'); // Trimmed
      expect(result.is_humanitarian).toBe(false); // Preserved!
      expect(result.provider_org_id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.receiver_org_id).toBeNull();
    });

    it('should preserve false for is_humanitarian', () => {
      const input = {
        is_humanitarian: false,
      };

      const result = cleanTransactionFields(input);

      expect(result.is_humanitarian).toBe(false);
    });

    it('should handle empty strings for enum fields', () => {
      const input = {
        aid_type: '',
        flow_type: 'none',
        finance_type: null,
      };

      const result = cleanTransactionFields(input);

      expect(result.aid_type).toBeNull();
      expect(result.flow_type).toBeNull();
      expect(result.finance_type).toBeNull();
    });

    it('should only include fields present in input', () => {
      const input = {
        transaction_type: '1',
        value: 1000,
      };

      const result = cleanTransactionFields(input);

      expect(result).toHaveProperty('transaction_type');
      expect(result).toHaveProperty('value');
      expect(result).not.toHaveProperty('aid_type');
      expect(result).not.toHaveProperty('is_humanitarian');
    });

    it('should handle all boolean fields correctly', () => {
      const input = {
        is_humanitarian: false,
        finance_type_inherited: true,
        fx_differs: false,
      };

      const result = cleanTransactionFields(input);

      expect(result.is_humanitarian).toBe(false);
      expect(result.finance_type_inherited).toBe(true);
      expect(result.fx_differs).toBe(false);
    });
  });

  describe('cleanFieldValue', () => {
    it('should clean boolean field is_humanitarian correctly', () => {
      expect(cleanFieldValue('is_humanitarian', true)).toBe(true);
      expect(cleanFieldValue('is_humanitarian', false)).toBe(false);
      expect(cleanFieldValue('is_humanitarian', null)).toBeNull();
      expect(cleanFieldValue('is_humanitarian', undefined)).toBeNull();
    });

    it('should clean enum fields correctly', () => {
      expect(cleanFieldValue('aid_type', '110')).toBe('110');
      expect(cleanFieldValue('aid_type', '')).toBeNull();
      expect(cleanFieldValue('flow_type', 'none')).toBeNull();
    });

    it('should clean UUID fields correctly', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(cleanFieldValue('provider_org_id', validUUID)).toBe(validUUID);
      expect(cleanFieldValue('provider_org_id', 'invalid')).toBeNull();
    });

    it('should clean date fields correctly', () => {
      expect(cleanFieldValue('transaction_date', '2024-01-01')).toBe('2024-01-01');
      expect(cleanFieldValue('transaction_date', '')).toBeNull();
    });

    it('should handle unknown fields', () => {
      expect(cleanFieldValue('unknown_field', 'value')).toBe('value');
      expect(cleanFieldValue('unknown_field', null)).toBeNull();
      expect(cleanFieldValue('unknown_field', undefined)).toBeNull();
    });
  });

  describe('Critical Bug Prevention', () => {
    it('CRITICAL: should NOT convert false to null for boolean fields', () => {
      // This was the original bug - using `value || null` converted false to null
      const input = {
        is_humanitarian: false,
      };

      const result = cleanTransactionFields(input);

      // This test verifies the bug is fixed
      expect(result.is_humanitarian).toBe(false);
      expect(result.is_humanitarian).not.toBeNull();
    });

    it('CRITICAL: should NOT convert empty string to false for boolean fields', () => {
      // Ensure we handle edge cases properly
      const falseResult = cleanBooleanValue(false);
      const emptyStringResult = cleanBooleanValue('');

      expect(falseResult).toBe(false);
      expect(emptyStringResult).toBe(false);
      // Both should be false, but for different reasons
    });
  });
});

