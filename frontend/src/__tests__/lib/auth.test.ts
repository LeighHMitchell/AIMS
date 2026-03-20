import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// ============================================
// verifyCronSecret tests
// ============================================
// requireAuth relies on Next.js cookies() which is hard to mock in unit tests.
// verifyCronSecret is a pure function that's straightforward to test.

// We need to mock modules before importing
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

import { verifyCronSecret } from '@/lib/auth';

describe('verifyCronSecret', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns null (authorized) when header matches CRON_SECRET', () => {
    process.env.CRON_SECRET = 'my-secret-123';
    const request = new Request('https://example.com/api/cron/task', {
      headers: { authorization: 'Bearer my-secret-123' },
    });

    const result = verifyCronSecret(request);
    expect(result).toBeNull();
  });

  it('returns 401 when authorization header does not match', () => {
    process.env.CRON_SECRET = 'my-secret-123';
    const request = new Request('https://example.com/api/cron/task', {
      headers: { authorization: 'Bearer wrong-secret' },
    });

    const result = verifyCronSecret(request);
    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(NextResponse);
    // NextResponse.json returns a Response with status
    expect(result!.status).toBe(401);
  });

  it('returns 401 when no authorization header is present', () => {
    process.env.CRON_SECRET = 'my-secret-123';
    const request = new Request('https://example.com/api/cron/task');

    const result = verifyCronSecret(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('returns 500 when CRON_SECRET env var is not set', () => {
    delete process.env.CRON_SECRET;
    const request = new Request('https://example.com/api/cron/task', {
      headers: { authorization: 'Bearer anything' },
    });

    const result = verifyCronSecret(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(500);
  });

  it('returns 500 when CRON_SECRET is empty string', () => {
    process.env.CRON_SECRET = '';
    const request = new Request('https://example.com/api/cron/task', {
      headers: { authorization: 'Bearer ' },
    });

    // Empty string is falsy, so !cronSecret is true → 500
    const result = verifyCronSecret(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(500);
  });

  it('rejects Bearer token with extra whitespace', () => {
    process.env.CRON_SECRET = 'my-secret';
    const request = new Request('https://example.com/api/cron/task', {
      headers: { authorization: 'Bearer  my-secret' },
    });

    const result = verifyCronSecret(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('rejects non-Bearer auth schemes', () => {
    process.env.CRON_SECRET = 'my-secret';
    const request = new Request('https://example.com/api/cron/task', {
      headers: { authorization: 'Basic my-secret' },
    });

    const result = verifyCronSecret(request);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });
});
