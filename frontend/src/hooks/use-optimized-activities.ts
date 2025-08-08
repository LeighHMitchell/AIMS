import { useState, useEffect, useCallback, useRef } from 'react';

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
  onError?: (error: string) => void;
}

interface UseOptimizedActivitiesReturn {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setPage: (page: number) => void;
  sorting: {
    sortField: string;
    sortOrder: string;
    handleSort: (field: string) => void;
  };
  filters: {
    activityStatus: string;
    setActivityStatus: (status: string) => void;
    submissionStatus: string;
    setSubmissionStatus: (status: string) => void;
    reportedBy: string;
    setReportedBy: (org: string) => void;
    aidType: string;
    setAidType: (type: string) => void;
    flowType: string;
    setFlowType: (type: string) => void;
    tiedStatus: string;
    setTiedStatus: (status: string) => void;
  };
  refetch: () => void;
  removeActivity: (id: string) => void;
  performance: {
    lastQueryTime: number;
    avgQueryTime: number;
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
  
  // Sorting
  const [sortField, setSortField] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Filters
  const [activityStatus, setActivityStatus] = useState('all');
  const [submissionStatus, setSubmissionStatus] = useState('all');
  const [reportedBy, setReportedBy] = useState('all');
  const [aidType, setAidType] = useState('all');
  const [flowType, setFlowType] = useState('all');
  const [tiedStatus, setTiedStatus] = useState('all');

  // Performance tracking
  const [lastQueryTime, setLastQueryTime] = useState(0);
  const queryTimesRef = useRef<number[]>([]);

  // Request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cache for quick page changes
  const cacheRef = useRef<Map<string, any>>(new Map());

  // Handle sorting
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  }, [sortField, sortOrder]);

  // Fetch activities
  const fetchActivities = useCallback(async (showLoading = true) => {
    console.log('[Activities Hook] Starting fetchActivities...');
    
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Generate cache key inline to avoid dependency issues
    const cacheKey = JSON.stringify({
      page: currentPage,
      limit: pageSize,
      search: debouncedSearchQuery,
      sortField,
      sortOrder,
      activityStatus,
      submissionStatus,
      reportedBy,
      aidType,
      flowType,
      tiedStatus
    });

    // Check cache first
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) {
      console.log('[Activities Hook] Using cached data');
      setActivities(cached.data);
      setTotalCount(cached.totalCount);
      setTotalPages(cached.totalPages);
      setLoading(false);
      return;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const startTime = Date.now();

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortField,
        sortOrder,
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(activityStatus !== 'all' && { activityStatus }),
        ...(submissionStatus !== 'all' && { submissionStatus }),
        ...(reportedBy !== 'all' && { reportedBy }),
        ...(aidType !== 'all' && { aidType }),
        ...(flowType !== 'all' && { flowType }),
        ...(tiedStatus !== 'all' && { tiedStatus })
      });

      // Try optimized endpoint first, fallback to lightweight simple endpoint
      let endpoint = `/api/activities-optimized?${params}`;
      console.log('[Activities Hook] Trying optimized endpoint:', endpoint);
      
      let response = await fetch(endpoint, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // If optimized endpoint fails, try lightweight endpoint with server-side pagination
      if (!response.ok) {
        console.log('[Activities Hook] Optimized endpoint failed, trying simple endpoint');
        endpoint = `/api/activities-simple?${params}`;
        response = await fetch(endpoint, {
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} from ${endpoint}`);
      }

      const data = await response.json();
      console.log('[Activities Hook] Received data:', { 
        activitiesCount: data.activities?.length,
        totalCount: data.pagination?.totalCount || data.totalCount,
        endpoint
      });

      // Performance tracking
      const queryTime = Date.now() - startTime;
      setLastQueryTime(queryTime);
      queryTimesRef.current.push(queryTime);
      
      if (queryTimesRef.current.length > 10) {
        queryTimesRef.current = queryTimesRef.current.slice(-10);
      }

      // Handle both optimized and regular API response formats
      const activities = data.activities || data.data || [];
      const rawTotal = (data.pagination?.total ?? data.pagination?.totalCount ?? data.totalCount);
      const totalCount = typeof rawTotal === 'number' ? rawTotal : activities.length;
      const totalPages = data.pagination?.totalPages ?? (typeof rawTotal === 'number' ? Math.ceil(totalCount / pageSize) : 1);

      setActivities(activities);
      setTotalCount(totalCount);
      setTotalPages(totalPages);

      // Cache the result
      cacheRef.current.set(cacheKey, {
        data: activities,
        totalCount,
        totalPages,
        timestamp: Date.now()
      });

      console.log('[Activities Hook] Successfully set activities:', {
        count: activities.length,
        totalCount,
        totalPages
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[Activities Hook] Request was aborted');
        return;
      }

      console.error('[Activities Hook] Error fetching activities:', error);
      setError(error.message || 'Failed to fetch activities');
      
      if (onError) {
        onError(error.message || 'Failed to fetch activities');
      }
    } finally {
      setLoading(false);
    }
  }, [onError]); // Remove unstable dependencies to prevent infinite re-fetching

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data when key dependencies change
  useEffect(() => {
    fetchActivities();
  }, [currentPage, pageSize, debouncedSearchQuery, sortField, sortOrder, activityStatus, submissionStatus, reportedBy, aidType, flowType, tiedStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle page changes
  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Remove activity from local state
  const removeActivity = useCallback((id: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== id));
    setTotalCount(prev => prev - 1);
  }, []);

  // Calculate average query time
  const avgQueryTime = queryTimesRef.current.length > 0 
    ? queryTimesRef.current.reduce((a, b) => a + b, 0) / queryTimesRef.current.length 
    : 0;

  return {
    activities,
    loading,
    error,
    totalCount,
    totalPages,
    currentPage,
    searchQuery,
    setSearchQuery,
    setPage,
    sorting: {
      sortField,
      sortOrder,
      handleSort
    },
    filters: {
      activityStatus,
      setActivityStatus,
      submissionStatus,
      setSubmissionStatus,
      reportedBy,
      setReportedBy,
      aidType,
      setAidType,
      flowType,
      setFlowType,
      tiedStatus,
      setTiedStatus
    },
    refetch: () => fetchActivities(),
    removeActivity,
    performance: {
      lastQueryTime,
      avgQueryTime
    }
  };
}