import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ============================================
// Mock setup
// ============================================

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();

// Chain builder: each method returns an object with all chain methods
function chainable() {
  const chain: any = {};
  chain.select = mockSelect.mockReturnValue(chain);
  chain.eq = mockEq.mockReturnValue(chain);
  chain.in = mockIn.mockReturnValue(chain);
  chain.or = mockOr.mockReturnValue(chain);
  chain.order = mockOrder.mockReturnValue(chain);
  chain.range = mockRange.mockReturnValue(chain);
  // Make the chain itself thenable so Promise.all works
  chain.then = undefined;
  return chain;
}

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}));

import { requireAuth } from '@/lib/auth';
import { GET } from '@/app/api/activities-list/route';

const mockRequireAuth = vi.mocked(requireAuth);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/activities-list');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

// ============================================
// Authentication
// ============================================

describe('GET /api/activities-list', () => {
  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockRequireAuth.mockResolvedValue({
        supabase: null,
        user: null,
        response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      } as any);

      const result = await GET(makeRequest());
      expect(result.status).toBe(401);
    });

    it('returns 500 when supabase client is null', async () => {
      mockRequireAuth.mockResolvedValue({
        supabase: null,
        user: { id: 'user-1' },
        response: null,
      } as any);

      const result = await GET(makeRequest());
      expect(result.status).toBe(500);
      const body = await result.json();
      expect(body.error).toBe('Database connection failed');
    });
  });

  describe('successful requests', () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'user-1' },
        response: null,
      } as any);
    });

    it('returns activities with pagination metadata', async () => {
      const countChain = chainable();
      const dataChain = chainable();

      // First call to from('activities') for count, second for data
      mockFrom
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(countChain) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(dataChain) });

      // Make chains resolve as promises (for Promise.all)
      countChain.then = (resolve: any) => resolve({ count: 2, error: null });
      dataChain.then = (resolve: any) =>
        resolve({
          data: [
            {
              id: 'act-1',
              iati_identifier: 'IATI-001',
              other_identifier: 'P-001',
              title_narrative: 'Test Activity',
              acronym: 'TA',
              activity_status: '2',
              publication_status: 'published',
              submission_status: 'validated',
              reporting_org_id: 'org-1',
              reporting_org_name: 'Test Org',
              created_by_org_name: 'Test Org',
              created_by_org_acronym: 'TO',
              planned_start_date: '2024-01-01',
              planned_end_date: '2024-12-31',
              actual_start_date: null,
              actual_end_date: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-06-15T00:00:00Z',
              humanitarian: false,
            },
          ],
          error: null,
        });

      // Budget and transaction queries
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });

      const result = await GET(makeRequest());
      expect(result.status).toBe(200);

      const body = await result.json();
      expect(body.activities).toHaveLength(1);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(20);
      expect(body.pagination.total).toBe(2);
      expect(body.performance.isSlimEndpoint).toBe(true);
    });

    it('transforms snake_case fields to camelCase', async () => {
      const countChain = chainable();
      const dataChain = chainable();

      mockFrom
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(countChain) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(dataChain) });

      countChain.then = (resolve: any) => resolve({ count: 1, error: null });
      dataChain.then = (resolve: any) =>
        resolve({
          data: [
            {
              id: 'act-1',
              iati_identifier: 'IATI-001',
              other_identifier: 'P-001',
              title_narrative: 'Test',
              acronym: null,
              activity_status: '2',
              publication_status: 'draft',
              submission_status: 'draft',
              reporting_org_id: null,
              reporting_org_name: null,
              created_by_org_name: null,
              created_by_org_acronym: null,
              planned_start_date: '2024-01-01',
              planned_end_date: null,
              actual_start_date: null,
              actual_end_date: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              humanitarian: null,
            },
          ],
          error: null,
        });

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });

      const result = await GET(makeRequest());
      const body = await result.json();
      const activity = body.activities[0];

      // Verify camelCase transformation
      expect(activity.iatiIdentifier).toBe('IATI-001');
      expect(activity.partnerId).toBe('P-001');
      expect(activity.activityStatus).toBe('2');
      expect(activity.publicationStatus).toBe('draft');
      expect(activity.submissionStatus).toBe('draft');
      expect(activity.plannedStartDate).toBe('2024-01-01');
      expect(activity.createdAt).toBeDefined();
      expect(activity.updatedAt).toBeDefined();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'user-1' },
        response: null,
      } as any);
    });

    it('returns 500 when count query fails', async () => {
      const countChain = chainable();
      const dataChain = chainable();

      mockFrom
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(countChain) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(dataChain) });

      countChain.then = (resolve: any) =>
        resolve({ count: null, error: { message: 'Query failed' } });
      dataChain.then = (resolve: any) =>
        resolve({ data: [], error: null });

      const result = await GET(makeRequest());
      expect(result.status).toBe(500);
      const body = await result.json();
      expect(body.error).toBe('Failed to fetch activities');
    });

    it('returns 500 when data query fails', async () => {
      const countChain = chainable();
      const dataChain = chainable();

      mockFrom
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(countChain) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(dataChain) });

      countChain.then = (resolve: any) =>
        resolve({ count: 5, error: null });
      dataChain.then = (resolve: any) =>
        resolve({ data: null, error: { message: 'Query failed' } });

      const result = await GET(makeRequest());
      expect(result.status).toBe(500);
    });
  });

  describe('query parameter handling', () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({
        supabase: mockSupabase,
        user: { id: 'user-1' },
        response: null,
      } as any);
    });

    it('clamps limit to max 100', async () => {
      const countChain = chainable();
      const dataChain = chainable();

      mockFrom
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(countChain) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(dataChain) });

      countChain.then = (resolve: any) => resolve({ count: 0, error: null });
      dataChain.then = (resolve: any) => resolve({ data: [], error: null });

      await GET(makeRequest({ limit: '500' }));

      // range should be called with offset=0 and 0+100-1=99
      expect(mockRange).toHaveBeenCalledWith(0, 99);
    });

    it('defaults page to 1 and limit to 20', async () => {
      const countChain = chainable();
      const dataChain = chainable();

      mockFrom
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(countChain) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(dataChain) });

      countChain.then = (resolve: any) => resolve({ count: 0, error: null });
      dataChain.then = (resolve: any) => resolve({ data: [], error: null });

      await GET(makeRequest());

      // range(0, 19) for page=1, limit=20
      expect(mockRange).toHaveBeenCalledWith(0, 19);
    });

    it('calculates correct offset for page 3', async () => {
      const countChain = chainable();
      const dataChain = chainable();

      mockFrom
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(countChain) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(dataChain) });

      countChain.then = (resolve: any) => resolve({ count: 0, error: null });
      dataChain.then = (resolve: any) => resolve({ data: [], error: null });

      await GET(makeRequest({ page: '3', limit: '10' }));

      // offset = (3-1)*10 = 20, range(20, 29)
      expect(mockRange).toHaveBeenCalledWith(20, 29);
    });
  });
});
