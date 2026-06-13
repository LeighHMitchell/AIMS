/**
 * Unit tests for activity-transactions-mapper.ts
 *
 * Pins the CURRENT behavior of the mapper functions — do not "fix" quirks
 * here; they are intentional behavioural anchors.
 */

import { describe, it, expect } from 'vitest';
import {
  cleanDateValue,
  cleanUUIDValue,
  mapIncomingTransaction,
  validateIncomingTransaction,
} from '@/lib/activity-transactions-mapper';

const ACTIVITY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const ORG_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
const USER_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

const baseCtx = {
  activityId: ACTIVITY_ID,
  organizationId: ORG_ID,
  createdBy: USER_ID,
};

// ---------------------------------------------------------------------------
// 1. Field aliasing
// ---------------------------------------------------------------------------
describe('mapIncomingTransaction — field aliasing', () => {
  it('maps camelCase type and transactionDate to snake_case DB columns', () => {
    const raw = {
      type: '3',
      transactionDate: '2024-01-01',
      value: 500,
      currency: 'USD',
    };
    const mapped = mapIncomingTransaction(raw, baseCtx);
    expect(mapped.transaction_type).toBe('3');
    expect(mapped.transaction_date).toBe('2024-01-01');
  });

  it('prefers transaction_type over type when both present', () => {
    const raw = { transaction_type: '2', type: '3', value: 100, currency: 'USD' };
    const mapped = mapIncomingTransaction(raw, baseCtx);
    expect(mapped.transaction_type).toBe('2');
  });
});

// ---------------------------------------------------------------------------
// 2. value: 0 preserved
// ---------------------------------------------------------------------------
describe('validateIncomingTransaction — value: 0', () => {
  it('does NOT flag value: 0 as missing', () => {
    const errors = validateIncomingTransaction({
      transaction_type: '3',
      value: 0,
      transaction_date: '2024-01-01',
      currency: 'USD',
    });
    expect(errors).toEqual([]);
  });
});

describe('mapIncomingTransaction — value: 0 preserved', () => {
  it('keeps value as 0 when explicitly provided', () => {
    const raw = { type: '3', value: 0, transaction_date: '2024-01-01', currency: 'USD' };
    const mapped = mapIncomingTransaction(raw, baseCtx);
    expect(mapped.value).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. value: null — mapped to 0, validation flags it
// ---------------------------------------------------------------------------
describe('mapIncomingTransaction / validateIncomingTransaction — value: null', () => {
  it('maps value: null to 0 (current coercion quirk)', () => {
    const raw = { type: '3', value: null, transaction_date: '2024-01-01', currency: 'USD' };
    const mapped = mapIncomingTransaction(raw, baseCtx);
    expect(mapped.value).toBe(0);
  });

  it('validateIncomingTransaction flags null value as missing', () => {
    const errors = validateIncomingTransaction({
      transaction_type: '3',
      value: null,
      transaction_date: '2024-01-01',
      currency: 'USD',
    });
    expect(errors.some((e) => e.includes('value'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Empty-string dates → null
// ---------------------------------------------------------------------------
describe('cleanDateValue', () => {
  it('converts empty string to null', () => {
    expect(cleanDateValue('')).toBeNull();
  });

  it('converts string "null" to null', () => {
    expect(cleanDateValue('null')).toBeNull();
  });

  it('passes through a valid date string', () => {
    expect(cleanDateValue('2024-06-01')).toBe('2024-06-01');
  });
});

describe('mapIncomingTransaction — empty-string dates', () => {
  it('maps empty transaction_date to null', () => {
    const raw = { type: '3', value: 100, transaction_date: '', currency: 'USD' };
    const mapped = mapIncomingTransaction(raw, baseCtx);
    expect(mapped.transaction_date).toBeNull();
  });

  it('maps empty value_date to null', () => {
    const raw = { type: '3', value: 100, transaction_date: '2024-01-01', value_date: '', currency: 'USD' };
    const mapped = mapIncomingTransaction(raw, baseCtx);
    expect(mapped.value_date).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Invalid UUID in provider_org_id throws
// ---------------------------------------------------------------------------
describe('cleanUUIDValue', () => {
  it('throws for a non-UUID string like "1"', () => {
    expect(() => cleanUUIDValue('1')).toThrow(/Invalid UUID format/);
  });

  it('returns null for empty string', () => {
    expect(cleanUUIDValue('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(cleanUUIDValue(null)).toBeNull();
  });

  it('passes a valid UUID through unchanged', () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(cleanUUIDValue(id)).toBe(id);
  });
});

describe('mapIncomingTransaction — invalid UUID in provider_org_id', () => {
  it('throws when provider_org_id is a non-UUID string', () => {
    const raw = { type: '3', value: 100, transaction_date: '2024-01-01', currency: 'USD', provider_org_id: '1' };
    expect(() => mapIncomingTransaction(raw, baseCtx)).toThrow(/Invalid UUID format/);
  });
});

// ---------------------------------------------------------------------------
// 6. Missing currency validation
// ---------------------------------------------------------------------------
describe('validateIncomingTransaction — missing currency', () => {
  it('includes "currency" in errors when currency is absent', () => {
    const errors = validateIncomingTransaction({
      transaction_type: '3',
      value: 100,
      transaction_date: '2024-01-01',
    });
    expect(errors.some((e) => e.includes('currency'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. is_humanitarian IATI tri-state semantics
// ---------------------------------------------------------------------------
describe('mapIncomingTransaction — is_humanitarian tri-state', () => {
  it('maps null is_humanitarian to null (not false)', () => {
    const raw = { type: '3', value: 100, transaction_date: '2024-01-01', currency: 'USD', is_humanitarian: null };
    const mapped = mapIncomingTransaction(raw, baseCtx);
    expect(mapped.is_humanitarian).toBeNull();
  });

  it('maps absent is_humanitarian to null (not false)', () => {
    const raw = { type: '3', value: 100, transaction_date: '2024-01-01', currency: 'USD' };
    const mapped = mapIncomingTransaction(raw, baseCtx);
    expect(mapped.is_humanitarian).toBeNull();
  });

  it('maps explicit true is_humanitarian to true', () => {
    const raw = { type: '3', value: 100, transaction_date: '2024-01-01', currency: 'USD', is_humanitarian: true };
    const mapped = mapIncomingTransaction(raw, baseCtx);
    expect(mapped.is_humanitarian).toBe(true);
  });
});
