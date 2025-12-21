import { useState, useEffect, useCallback, useRef } from 'react';
import { SystemTotals } from '@/lib/system-totals';

/**
 * Optimized Activities Hook
 * 
 * Performance improvements:
 * 1. Implements debounced search
 * 2. Uses optimized API endpoint with server-side pagination
 * 3. Implements request cancellation
 * 4. Caches results for better UX
 * 5. Includes system-wide totals for portfolio percentage calculations
 * 
 * Drop-in replacement for existing activity fetching logic
 */

// Re-export SystemTotals for consumers of this hook
export type { SystemTotals } from '@/lib/system-totals';

interface Activity {
  id: string;
  title: string;
  acronym?: string;
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
  viewMode?: 'table' | 'card';
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
    activityStatuses: string[];
    setActivityStatuses: (statuses: string[]) => void;
    submissionStatuses: string[];
    setSubmissionStatuses: (statuses: string[]) => void;
    reportedByOrgs: string[];
    setReportedByOrgs: (orgs: string[]) => void;
    aidTypes: string[];
    setAidTypes: (types: string[]) => void;
    flowTypes: string[];
    setFlowTypes: (types: string[]) => void;
    tiedStatuses: string[];
    setTiedStatuses: (statuses: string[]) => void;
    // Legacy single-value getters for backward compatibility
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
  /** System-wide totals for calculating portfolio percentage shares */
  systemTotals: SystemTotals | null;
}

export function useOptimizedActivities(
  options: UseOptimizedActivitiesOptions = {}
): UseOptimizedActivitiesReturn {
  const {
    pageSize = 20,
    enableOptimization = true,
    onError,
    viewMode = 'table'
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
  const [systemTotals, setSystemTotals] = useState<SystemTotals | null>(null);
  
  // Sorting
  const [sortField, setSortField] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Filters - use arrays for multi-select
  const [activityStatuses, setActivityStatuses] = useState<string[]>([]);
  const [submissionStatuses, setSubmissionStatuses] = useState<string[]>([]);
  const [reportedByOrgs, setReportedByOrgs] = useState<string[]>([]);
  const [aidTypes, setAidTypes] = useState<string[]>([]);
  const [flowTypes, setFlowTypes] = useState<string[]>([]);
  const [tiedStatuses, setTiedStatuses] = useState<string[]>([]);

  // Legacy single-value setters for backward compatibility
  const setActivityStatus = useCallback((status: string) => {
    setActivityStatuses(status === 'all' ? [] : [status]);
  }, []);
  const setSubmissionStatus = useCallback((status: string) => {
    setSubmissionStatuses(status === 'all' ? [] : [status]);
  }, []);
  const setReportedBy = useCallback((org: string) => {
    setReportedByOrgs(org === 'all' ? [] : [org]);
  }, []);
  const setAidType = useCallback((type: string) => {
    setAidTypes(type === 'all' ? [] : [type]);
  }, []);
  const setFlowType = useCallback((type: string) => {
    setFlowTypes(type === 'all' ? [] : [type]);
  }, []);
  const setTiedStatus = useCallback((status: string) => {
    setTiedStatuses(status === 'all' ? [] : [status]);
  }, []);

  // Legacy single-value getters for backward compatibility
  const activityStatus = activityStatuses.length === 1 ? activityStatuses[0] : 'all';
  const submissionStatus = submissionStatuses.length === 1 ? submissionStatuses[0] : 'all';
  const reportedBy = reportedByOrgs.length === 1 ? reportedByOrgs[0] : 'all';
  const aidType = aidTypes.length === 1 ? aidTypes[0] : 'all';
  const flowType = flowTypes.length === 1 ? flowTypes[0] : 'all';
  const tiedStatus = tiedStatuses.length === 1 ? tiedStatuses[0] : 'all';

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
  const fetchActivities = useCallback(async (showLoading = true, bypassCache = false) => {
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
      activityStatuses,
      submissionStatuses,
      reportedByOrgs,
      aidTypes,
      flowTypes,
      tiedStatuses,
      viewMode
    });

    // Clear cache if bypassing
    if (bypassCache) {
      cacheRef.current.clear();
    }

    // Check cache first (unless bypassing)
    if (!bypassCache) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        setActivities(cached.data);
        setTotalCount(cached.totalCount);
        setTotalPages(cached.totalPages);
        setSystemTotals(cached.systemTotals || null);
        setLoading(false);
        return;
      }
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const startTime = Date.now();

      // Build query parameters with cache-busting timestamp
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortField,
        sortOrder,
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        // Array filters - comma-separated
        ...(activityStatuses.length > 0 && { activityStatuses: activityStatuses.join(',') }),
        ...(submissionStatuses.length > 0 && { submissionStatuses: submissionStatuses.join(',') }),
        ...(reportedByOrgs.length > 0 && { reportedByOrgs: reportedByOrgs.join(',') }),
        ...(aidTypes.length > 0 && { aidTypes: aidTypes.join(',') }),
        ...(flowTypes.length > 0 && { flowTypes: flowTypes.join(',') }),
        ...(tiedStatuses.length > 0 && { tiedStatuses: tiedStatuses.join(',') }),
        ...(viewMode === 'card' && { includeImages: 'true' }),
        _t: Date.now().toString() // Cache-busting timestamp
      });

      // Try optimized endpoint first, fallback to lightweight simple endpoint
      let endpoint = `/api/activities-optimized?${params}`;
      
      let response = await fetch(endpoint, {
        signal: abortControllerRef.current.signal,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // If optimized endpoint fails, try lightweight endpoint with server-side pagination
      if (!response.ok) {
        endpoint = `/api/activities-simple?${params}`;
        response = await fetch(endpoint, {
          signal: abortControllerRef.current.signal,
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} from ${endpoint}`);
      }

      const data = await response.json();

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
      
      // Parse system-wide totals for portfolio percentage calculations
      const parsedSystemTotals: SystemTotals | null = data.systemTotals || null;

      setActivities(activities);
      setTotalCount(totalCount);
      setTotalPages(totalPages);
      setSystemTotals(parsedSystemTotals);

      // Cache the result (including system totals)
      cacheRef.current.set(cacheKey, {
        data: activities,
        totalCount,
        totalPages,
        systemTotals: parsedSystemTotals,
        timestamp: Date.now()
      });

      // Set loading to false AFTER data is successfully set
      // Add a small delay to prevent any flash of empty state
      setTimeout(() => setLoading(false), 50);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }

      console.error('[Activities Hook] Error fetching activities:', error);

      // Handle specific error types
      let errorMessage = 'Failed to fetch activities';

      if (error.message && error.message.includes('DATABASE_CONNECTION_ERROR')) {
        errorMessage = 'Database connection issue. Please try again later.';
      } else if (error.message && error.message.includes('503')) {
        errorMessage = 'Service temporarily unavailable. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      // Set loading to false on error with small delay for consistency
      setTimeout(() => setLoading(false), 50);

      if (onError) {
        onError(errorMessage);
      }
    }
  }, [currentPage, pageSize, debouncedSearchQuery, sortField, sortOrder, activityStatuses, submissionStatuses, reportedByOrgs, aidTypes, flowTypes, tiedStatuses, viewMode, onError]);

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
  }, [currentPage, pageSize, debouncedSearchQuery, sortField, sortOrder, activityStatuses, submissionStatuses, reportedByOrgs, aidTypes, flowTypes, tiedStatuses, viewMode]);

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

  // Remove activity from local state and clear cache
  const removeActivity = useCallback((id: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== id));
    setTotalCount(prev => prev - 1);
    // Clear cache to prevent stale data from being used
    cacheRef.current.clear();
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
      // Array-based multi-select filters
      activityStatuses,
      setActivityStatuses,
      submissionStatuses,
      setSubmissionStatuses,
      reportedByOrgs,
      setReportedByOrgs,
      aidTypes,
      setAidTypes,
      flowTypes,
      setFlowTypes,
      tiedStatuses,
      setTiedStatuses,
      // Legacy single-value getters for backward compatibility
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
    refetch: () => fetchActivities(true, true), // Always bypass cache on refetch
    removeActivity,
    performance: {
      lastQueryTime,
      avgQueryTime
    },
    systemTotals
  };
}