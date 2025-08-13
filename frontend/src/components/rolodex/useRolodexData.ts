import { useState, useEffect, useCallback, useMemo } from 'react';
import { RolodexPerson, RolodexFilters } from '@/app/api/rolodex/route';

export interface RolodexResponse {
  people: RolodexPerson[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: RolodexFilters;
}

export interface UseRolodexDataOptions {
  initialFilters?: Partial<RolodexFilters>;
  debounceMs?: number;
  autoFetch?: boolean;
}

export interface UseRolodexDataReturn {
  data: RolodexResponse | null;
  people: RolodexPerson[];
  loading: boolean;
  error: string | null;
  filters: RolodexFilters;
  setFilters: (filters: Partial<RolodexFilters>) => void;
  updateFilter: (key: keyof RolodexFilters, value: any) => void;
  clearFilters: () => void;
  refetch: () => Promise<void>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
  };
}

const DEFAULT_FILTERS: RolodexFilters = {
  page: 1,
  limit: 25,
};

export function useRolodexData(options: UseRolodexDataOptions = {}): UseRolodexDataReturn {
  const {
    initialFilters = {},
    debounceMs = 300,
    autoFetch = true,
  } = options;

  const [data, setData] = useState<RolodexResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setInternalFilters] = useState<RolodexFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Debounced search effect
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [filters, debounceMs]);

  const fetchData = useCallback(async (fetchFilters?: RolodexFilters) => {
    const filtersToUse = fetchFilters || debouncedFilters;
    
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      
      Object.entries(filtersToUse).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      console.log('[useRolodexData] Fetching with params:', params.toString());
      console.log('[useRolodexData] Full filters object:', filtersToUse);

      const response = await fetch(`/api/rolodex?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: RolodexResponse = await response.json();
      setData(result);
      console.log('[useRolodexData] Successfully fetched', result.people.length, 'people');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rolodex data';
      console.error('[useRolodexData] Error:', errorMessage);
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on filter changes
  useEffect(() => {
    console.log('[useRolodexData] Effect triggered:', { autoFetch, filters: debouncedFilters });
    if (autoFetch) {
      fetchData(debouncedFilters);
    }
  }, [debouncedFilters, autoFetch]);

  const refetch = useCallback(() => fetchData(debouncedFilters), [fetchData, debouncedFilters]);

  const setFilters = useCallback((newFilters: Partial<RolodexFilters>) => {
    console.log('[useRolodexData] Setting filters:', newFilters);
    setInternalFilters(prev => {
      const updated = {
        ...prev,
        ...newFilters,
        // Reset to page 1 when filters change (except when explicitly setting page)
        page: newFilters.page !== undefined ? newFilters.page : 1,
      };
      console.log('[useRolodexData] Updated filters:', updated);
      return updated;
    });
  }, []);

  const updateFilter = useCallback((key: keyof RolodexFilters, value: any) => {
    setFilters({ [key]: value });
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    setInternalFilters(DEFAULT_FILTERS);
  }, []);

  // Pagination helpers
  const pagination = useMemo(() => {
    const paginationData = data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 };
    
    return {
      ...paginationData,
      hasNext: paginationData.page < paginationData.totalPages,
      hasPrev: paginationData.page > 1,
      goToPage: (page: number) => {
        if (page >= 1 && page <= paginationData.totalPages) {
          updateFilter('page', page);
        }
      },
      nextPage: () => {
        if (paginationData.page < paginationData.totalPages) {
          updateFilter('page', paginationData.page + 1);
        }
      },
      prevPage: () => {
        if (paginationData.page > 1) {
          updateFilter('page', paginationData.page - 1);
        }
      },
    };
  }, [data?.pagination, updateFilter]);

  return {
    data,
    people: data?.people || [],
    loading,
    error,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    refetch,
    pagination,
  };
}