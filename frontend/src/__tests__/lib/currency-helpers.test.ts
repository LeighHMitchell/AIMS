import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase module before imports
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
  }),
}));

import {
  resolveCurrency,
  resolveCurrencySync,
  resolveValueDate,
  isValidCurrencyFormat,
  formatCurrencyAmount,
} from '@/lib/currency-helpers';

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ single: mockSingle });
});

// ============================================
// resolveCurrencySync — pure function tests
// ============================================

describe('resolveCurrencySync', () => {
  it('returns provided currency when available', () => {
    expect(resolveCurrencySync('eur', 'GBP', 'JPY')).toBe('EUR');
  });

  it('uppercases provided currency', () => {
    expect(resolveCurrencySync('gbp')).toBe('GBP');
  });

  it('falls back to activity default when provided is null', () => {
    expect(resolveCurrencySync(null, 'GBP')).toBe('GBP');
  });

  it('falls back to activity default when provided is undefined', () => {
    expect(resolveCurrencySync(undefined, 'eur')).toBe('EUR');
  });

  it('falls back to activity default when provided is empty string', () => {
    expect(resolveCurrencySync('', 'jpy')).toBe('JPY');
  });

  it('falls back to activity default when provided is whitespace', () => {
    expect(resolveCurrencySync('   ', 'chf')).toBe('CHF');
  });

  it('falls back to org default when provided and activity are null', () => {
    expect(resolveCurrencySync(null, null, 'sek')).toBe('SEK');
  });

  it('falls back to org default when provided and activity are empty', () => {
    expect(resolveCurrencySync('', '', 'nok')).toBe('NOK');
  });

  it('falls back to USD when all values are null', () => {
    expect(resolveCurrencySync(null, null, null)).toBe('USD');
  });

  it('falls back to USD when all values are undefined', () => {
    expect(resolveCurrencySync(undefined, undefined, undefined)).toBe('USD');
  });

  it('falls back to USD when all values are empty strings', () => {
    expect(resolveCurrencySync('', '', '')).toBe('USD');
  });

  it('falls back to USD when no optional params provided', () => {
    expect(resolveCurrencySync(null)).toBe('USD');
  });

  it('skips whitespace-only activity default', () => {
    expect(resolveCurrencySync(null, '  ', 'cad')).toBe('CAD');
  });

  it('skips whitespace-only org default', () => {
    expect(resolveCurrencySync(null, null, '   ')).toBe('USD');
  });
});

// ============================================
// resolveValueDate — pure function tests
// ============================================

describe('resolveValueDate', () => {
  it('returns provided value date when available', () => {
    expect(resolveValueDate('2024-01-15', '2024-06-01')).toBe('2024-01-15');
  });

  it('returns fallback when provided is null', () => {
    expect(resolveValueDate(null, '2024-06-01')).toBe('2024-06-01');
  });

  it('returns fallback when provided is undefined', () => {
    expect(resolveValueDate(undefined, '2024-06-01')).toBe('2024-06-01');
  });

  it('returns fallback when provided is empty string', () => {
    expect(resolveValueDate('', '2024-06-01')).toBe('2024-06-01');
  });

  it('returns fallback when provided is whitespace', () => {
    expect(resolveValueDate('   ', '2024-06-01')).toBe('2024-06-01');
  });

  it('preserves the exact format of the provided date', () => {
    expect(resolveValueDate('2024-01-15T00:00:00Z', '2024-06-01')).toBe('2024-01-15T00:00:00Z');
  });
});

// ============================================
// isValidCurrencyFormat
// ============================================

describe('isValidCurrencyFormat', () => {
  it('accepts valid 3-letter uppercase codes', () => {
    expect(isValidCurrencyFormat('USD')).toBe(true);
    expect(isValidCurrencyFormat('EUR')).toBe(true);
    expect(isValidCurrencyFormat('GBP')).toBe(true);
    expect(isValidCurrencyFormat('JPY')).toBe(true);
  });

  it('accepts lowercase (auto-uppercased internally)', () => {
    expect(isValidCurrencyFormat('usd')).toBe(true);
    expect(isValidCurrencyFormat('eur')).toBe(true);
  });

  it('accepts mixed case', () => {
    expect(isValidCurrencyFormat('Usd')).toBe(true);
  });

  it('rejects codes shorter than 3 characters', () => {
    expect(isValidCurrencyFormat('US')).toBe(false);
    expect(isValidCurrencyFormat('U')).toBe(false);
    expect(isValidCurrencyFormat('')).toBe(false);
  });

  it('rejects codes longer than 3 characters', () => {
    expect(isValidCurrencyFormat('USDD')).toBe(false);
    expect(isValidCurrencyFormat('EURO')).toBe(false);
  });

  it('rejects codes with numbers', () => {
    expect(isValidCurrencyFormat('US1')).toBe(false);
    expect(isValidCurrencyFormat('123')).toBe(false);
  });

  it('rejects codes with special characters', () => {
    expect(isValidCurrencyFormat('US$')).toBe(false);
    expect(isValidCurrencyFormat('U-D')).toBe(false);
    expect(isValidCurrencyFormat('U D')).toBe(false);
  });
});

// ============================================
// formatCurrencyAmount
// ============================================

describe('formatCurrencyAmount', () => {
  it('formats USD amounts correctly', () => {
    const result = formatCurrencyAmount(1000000, 'USD');
    expect(result).toContain('1,000,000');
  });

  it('formats EUR amounts', () => {
    const result = formatCurrencyAmount(500000, 'EUR');
    // Intl.NumberFormat will use EUR symbol
    expect(result).toBeTruthy();
  });

  it('defaults to USD when no currency provided', () => {
    const result = formatCurrencyAmount(1000);
    expect(result).toContain('$');
  });

  it('handles zero amounts', () => {
    const result = formatCurrencyAmount(0, 'USD');
    expect(result).toContain('0');
  });

  it('handles negative amounts', () => {
    const result = formatCurrencyAmount(-5000, 'USD');
    expect(result).toContain('5,000');
  });

  it('handles very large amounts', () => {
    const result = formatCurrencyAmount(999999999999, 'USD');
    expect(result).toContain('999,999,999,999');
  });

  it('falls back gracefully for invalid currency codes', () => {
    const result = formatCurrencyAmount(1000, 'INVALID');
    // Should use fallback format: "INVALID 1,000"
    expect(result).toContain('INVALID');
    expect(result).toContain('1,000');
  });

  it('uppercases currency code in fallback', () => {
    const result = formatCurrencyAmount(500, 'xyz');
    // Invalid code triggers fallback with uppercase
    expect(result).toContain('XYZ');
  });
});

// ============================================
// resolveCurrency — async with DB lookups
// ============================================

describe('resolveCurrency', () => {
  it('returns provided currency without DB lookup', async () => {
    const result = await resolveCurrency('eur', 'activity-123');
    expect(result).toBe('EUR');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('uppercases provided currency', async () => {
    const result = await resolveCurrency('gbp', 'activity-123');
    expect(result).toBe('GBP');
  });

  it('looks up activity default_currency when provided is null', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { default_currency: 'JPY' },
      error: null,
    });

    const result = await resolveCurrency(null, 'activity-123');
    expect(result).toBe('JPY');
    expect(mockFrom).toHaveBeenCalledWith('activities');
  });

  it('looks up org default_currency when activity has none', async () => {
    // Activity lookup returns no default_currency
    mockSingle.mockResolvedValueOnce({
      data: { default_currency: null },
      error: null,
    });

    // Need to reset chain for second call
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });

    // Org lookup returns CHF
    mockSingle.mockResolvedValueOnce({
      data: { default_currency: 'CHF' },
      error: null,
    });

    const result = await resolveCurrency(null, 'activity-123', 'org-456');
    expect(result).toBe('CHF');
    expect(mockFrom).toHaveBeenCalledWith('organizations');
  });

  it('falls back to USD when all lookups return nothing', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { default_currency: null },
      error: null,
    });

    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });

    mockSingle.mockResolvedValueOnce({
      data: { default_currency: null },
      error: null,
    });

    const result = await resolveCurrency(null, 'activity-123', 'org-456');
    expect(result).toBe('USD');
  });

  it('falls back to USD when no providerOrgId and activity has no default', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { default_currency: null },
      error: null,
    });

    const result = await resolveCurrency(null, 'activity-123');
    expect(result).toBe('USD');
  });

  it('falls back to USD on database error', async () => {
    mockSingle.mockRejectedValueOnce(new Error('DB connection failed'));

    const result = await resolveCurrency(null, 'activity-123');
    expect(result).toBe('USD');
  });

  it('skips empty string provided currency', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { default_currency: 'SEK' },
      error: null,
    });

    const result = await resolveCurrency('', 'activity-123');
    expect(result).toBe('SEK');
  });

  it('skips whitespace-only provided currency', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { default_currency: 'NOK' },
      error: null,
    });

    const result = await resolveCurrency('   ', 'activity-123');
    expect(result).toBe('NOK');
  });
});
