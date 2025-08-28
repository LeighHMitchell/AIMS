import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/transactions/[transactionId]/sectors/route';

// Mock Supabase
const mockSupabaseAdmin = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          // For sector lines query
        })),
        is: vi.fn(() => ({
          order: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }))
};

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => mockSupabaseAdmin
}));

describe('Transaction Sectors API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/transactions/[transactionId]/sectors', () => {
    it('returns sector lines for valid transaction', async () => {
      const mockTransaction = {
        uuid: 'test-transaction-id',
        value: 100000,
        currency: 'USD',
        activity_id: 'test-activity-id'
      };

      const mockSectorLines = [
        {
          id: '1',
          transaction_id: 'test-transaction-id',
          sector_vocabulary: '1',
          sector_code: '11220',
          sector_name: 'Primary education',
          percentage: 60,
          amount_minor: 6000000,
          sort_order: 0
        },
        {
          id: '2',
          transaction_id: 'test-transaction-id',
          sector_vocabulary: '1',
          sector_code: '12240',
          sector_name: 'Basic nutrition',
          percentage: 40,
          amount_minor: 4000000,
          sort_order: 1
        }
      ];

      // Mock the database calls
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockTransaction,
              error: null
            })
          }))
        }))
      });

      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: mockSectorLines,
                error: null
              })
            }))
          }))
        }))
      });

      const request = new NextRequest('http://localhost/api/transactions/test-transaction-id/sectors');
      const params = { transactionId: 'test-transaction-id' };

      const response = await GET(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.sector_lines).toHaveLength(2);
      expect(responseData.metadata.transaction_id).toBe('test-transaction-id');
      expect(responseData.metadata.transaction_value).toBe(100000);
      expect(responseData.metadata.validation.isValid).toBe(true);
      expect(responseData.metadata.validation.totalPercentage).toBe(100);
    });

    it('returns 404 for non-existent transaction', async () => {
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          }))
        }))
      });

      const request = new NextRequest('http://localhost/api/transactions/non-existent/sectors');
      const params = { transactionId: 'non-existent' };

      const response = await GET(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Transaction not found');
    });
  });

  describe('PUT /api/transactions/[transactionId]/sectors', () => {
    it('updates sector lines successfully', async () => {
      const mockTransaction = {
        uuid: 'test-transaction-id',
        value: 100000,
        currency: 'USD',
        activity_id: 'test-activity-id'
      };

      const requestBody = {
        sector_lines: [
          {
            sector_code: '11220',
            sector_name: 'Primary education',
            percentage: 60
          },
          {
            sector_code: '12240',
            sector_name: 'Basic nutrition',
            percentage: 40
          }
        ]
      };

      const mockInsertedLines = [
        {
          id: '1',
          transaction_id: 'test-transaction-id',
          sector_vocabulary: '1',
          sector_code: '11220',
          sector_name: 'Primary education',
          percentage: 60,
          amount_minor: 6000000,
          sort_order: 0
        },
        {
          id: '2',
          transaction_id: 'test-transaction-id',
          sector_vocabulary: '1',
          sector_code: '12240',
          sector_name: 'Basic nutrition',
          percentage: 40,
          amount_minor: 4000000,
          sort_order: 1
        }
      ];

      // Mock transaction lookup
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockTransaction,
              error: null
            })
          }))
        }))
      });

      // Mock delete existing lines
      mockSupabaseAdmin.from.mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      });

      // Mock insert new lines
      mockSupabaseAdmin.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({
            data: mockInsertedLines,
            error: null
          })
        }))
      });

      const request = new NextRequest('http://localhost/api/transactions/test-transaction-id/sectors', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const params = { transactionId: 'test-transaction-id' };

      const response = await PUT(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.sector_lines).toHaveLength(2);
      expect(responseData.changes.created).toBe(2);
      expect(responseData.metadata.validation.isValid).toBe(true);
    });

    it('returns validation error for invalid percentages', async () => {
      const mockTransaction = {
        uuid: 'test-transaction-id',
        value: 100000,
        currency: 'USD',
        activity_id: 'test-activity-id'
      };

      const requestBody = {
        sector_lines: [
          {
            sector_code: '11220',
            sector_name: 'Primary education',
            percentage: 60
          },
          {
            sector_code: '12240',
            sector_name: 'Basic nutrition',
            percentage: 50 // Total = 110%, should fail
          }
        ]
      };

      // Mock transaction lookup
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockTransaction,
              error: null
            })
          }))
        }))
      });

      const request = new NextRequest('http://localhost/api/transactions/test-transaction-id/sectors', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const params = { transactionId: 'test-transaction-id' };

      const response = await PUT(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.validation.errors).toContain('Total percentage (110.00%) exceeds 100%');
    });
  });

  describe('DELETE /api/transactions/[transactionId]/sectors', () => {
    it('deletes all sector lines successfully', async () => {
      const mockTransaction = {
        uuid: 'test-transaction-id',
        value: 100000,
        currency: 'USD'
      };

      // Mock transaction lookup
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockTransaction,
              error: null
            })
          }))
        }))
      });

      // Mock delete operation
      mockSupabaseAdmin.from.mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      });

      const request = new NextRequest('http://localhost/api/transactions/test-transaction-id/sectors', {
        method: 'DELETE'
      });
      const params = { transactionId: 'test-transaction-id' };

      const response = await DELETE(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.remaining_lines).toHaveLength(0);
      expect(responseData.validation.isValid).toBe(true);
      expect(responseData.validation.totalPercentage).toBe(0);
    });
  });
});




