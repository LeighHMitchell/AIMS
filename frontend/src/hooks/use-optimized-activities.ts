import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Optimized Activities Hook
 * 
 * Performance improvements:
 * 1. Implements debounced search
 * 2. Uses optimized API endpoint with server-side pagination
 * 3. Implements request cancellation
 * 4. Caches results for better UX
 * 
 * Drop-in replacement for existing activity fetching logic
 */

interface Activity {
  id: string;
  title: string;
  partnerId?: string;
  iatiId?: string;
  iatiIdentifier?: string;
  description?: string;
  activityStatus?: string;
  publicationStatus?: string;
  submissionStatus?: string;
  created_by_org_name?: string;
  created_by_org_acronym?: string;
  commitments?: number;
  disbursements?: number;
  expenditures?: number;
  inflows?: number;
  totalTransactions?: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

interface UseOptimizedActivitiesOptions {
  pageSize?: number;
  enableOptimization?: boolean;
  onError?: (error: Error) => void;
}

interface UseOptimizedActivitiesReturn {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setPage: (page: number) => void;
  refetch: () => void;
  removeActivity: (id: string) => void;
  filters: {
    activityStatus: string;
    publicationStatus: string;
    submissionStatus: string;
    setActivityStatus: (status: string) => void;
    setPublicationStatus: (status: string) => void;
    setSubmissionStatus: (status: string) => void;
  };
  performanceMetrics: {
    lastQueryTime: number;
    averageQueryTime: number;
  };
}

export function useOptimizedActivities(
  options: UseOptimizedActivitiesOptions = {}
): UseOptimizedActivitiesReturn {
  const {
    pageSize = 20,
    enableOptimization = true,
    onError
  } = options;

  console.log('[Activities Hook] Received options:', options);
  console.log('[Activities Hook] enableOptimization after destructuring:', enableOptimization);
  
  // Force enable optimization for debugging
  const forceEnableOptimization = true;

  // State
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Filters
  const [activityStatus, setActivityStatus] = useState('all');
  const [publicationStatus, setPublicationStatus] = useState('all');
  const [submissionStatus, setSubmissionStatus] = useState('all');

  // Performance tracking
  const [lastQueryTime, setLastQueryTime] = useState(0);
  const queryTimesRef = useRef<number[]>([]);

  // Request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cache for quick page changes
  const cacheRef = useRef<Map<string, any>>(new Map());

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Generate cache key
  const getCacheKey = useCallback(() => {
    return JSON.stringify({
      page: currentPage,
      limit: pageSize,
      search: debouncedSearchQuery,
      activityStatus,
      publicationStatus,
      submissionStatus
    });
  }, [currentPage, pageSize, debouncedSearchQuery, activityStatus, publicationStatus, submissionStatus]);

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    console.log('[Activities Hook] fetchActivities called, enableOptimization:', enableOptimization);
    console.log('[Activities Hook] forceEnableOptimization:', forceEnableOptimization);
    // Don't fetch if optimization is disabled (use forced enable for debugging)
    if (!forceEnableOptimization) {
      console.log('[Activities Hook] Optimization disabled, skipping fetch');
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache first
    const cacheKey = getCacheKey();
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      setActivities(cached.data);
      setTotalCount(cached.totalCount);
      setTotalPages(cached.totalPages);
      setLoading(false);
      return;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const startTime = Date.now();

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(activityStatus !== 'all' && { activityStatus }),
        ...(publicationStatus !== 'all' && { publicationStatus }),
        ...(submissionStatus !== 'all' && { submissionStatus })
      });

      // Use optimized endpoint if enabled (force optimized for debugging)
      const endpoint = forceEnableOptimization 
        ? `/api/activities-optimized?${params}`
        : `/api/activities?${params}`;
        
      console.log('[Activities Hook] Using endpoint:', endpoint);

      const res = await fetch(endpoint, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch activities: ${res.status}`);
      }

      const response = await res.json();

      // Handle optimized response format
      let data: Activity[];
      let total: number;
      let pages: number;

      if (response.pagination) {
        // Optimized endpoint response
        data = response.data || [];
        total = response.pagination.total;
        pages = response.pagination.totalPages;
      } else {
        // Legacy endpoint response
        data = Array.isArray(response) ? response : response.data || [];
        total = data.length;
        pages = Math.ceil(total / pageSize);
        // Client-side pagination for legacy endpoint
        const start = (currentPage - 1) * pageSize;
        data = data.slice(start, start + pageSize);
      }

      // Update state
      setActivities(data);
      setTotalCount(total);
      setTotalPages(pages);

      // Cache the results
      cacheRef.current.set(cacheKey, {
        data,
        totalCount: total,
        totalPages: pages,
        timestamp: Date.now()
      });

      // Track performance
      const queryTime = Date.now() - startTime;
      setLastQueryTime(queryTime);
      queryTimesRef.current.push(queryTime);
      if (queryTimesRef.current.length > 10) {
        queryTimesRef.current.shift();
      }

      console.log(`[Activities Hook] Fetched ${data.length} activities in ${queryTime}ms`);
      console.log('[Activities Hook] Activities data:', data.slice(0, 2)); // Log first 2 activities for debugging

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[Activities Hook] Request aborted');
        return;
      }

      console.error('[Activities Hook] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch activities';
      setError(errorMessage);
      
      if (onError && error instanceof Error) {
        onError(error);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearchQuery, activityStatus, publicationStatus, submissionStatus, enableOptimization, getCacheKey, onError]);

  // Force immediate fetch for debugging
  useEffect(() => {
    console.log('[Activities Hook] useEffect triggered, calling fetchActivities');
    // Also make a test API call to verify hook is running
    fetch('/api/health').catch(() => {}); // Silent test call
    fetchActivities();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // Empty dependencies to force immediate call

  // Also call on dependency changes
  useEffect(() => {
    console.log('[Activities Hook] Dependencies changed, calling fetchActivities');
    fetchActivities();
  }, [currentPage, pageSize, debouncedSearchQuery, activityStatus, publicationStatus, submissionStatus]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activityStatus, publicationStatus, submissionStatus]);

  // Calculate average query time
  const averageQueryTime = queryTimesRef.current.length > 0
    ? queryTimesRef.current.reduce((a, b) => a + b, 0) / queryTimesRef.current.length
    : 0;

  // Optimistic remove function for immediate UI updates
  const removeActivity = useCallback((id: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== id));
    setTotalCount(prev => prev - 1);
    
    // Clear cache to ensure fresh data on next refetch
    cacheRef.current.clear();
  }, []);

  return {
    activities,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    searchQuery,
    setSearchQuery,
    setPage: setCurrentPage,
    refetch: fetchActivities,
    removeActivity,
    filters: {
      activityStatus,
      publicationStatus,
      submissionStatus,
      setActivityStatus,
      setPublicationStatus,
      setSubmissionStatus
    },
    performanceMetrics: {
      lastQueryTime,
      averageQueryTime
    }
  };
}