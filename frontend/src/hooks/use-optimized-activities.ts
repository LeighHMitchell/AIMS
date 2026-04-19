import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SystemTotals } from '@/lib/system-totals';
import { apiFetch } from '@/lib/api-fetch';

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
  systemTotals: SystemTotals | null;
}

interface ActivitiesResponse {
  activities: Activity[];
  totalCount: number;
  totalPages: number;
  systemTotals: SystemTotals | null;
  queryTime: number;
}

const EMPTY_ACTIVITIES: Activity[] = [];

export function useOptimizedActivities(
  options: UseOptimizedActivitiesOptions = {},
): UseOptimizedActivitiesReturn {
  const { pageSize = 20, onError, viewMode = 'table' } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const [sortField, setSortField] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [activityStatuses, setActivityStatuses] = useState<string[]>([]);
  const [submissionStatuses, setSubmissionStatuses] = useState<string[]>([]);
  const [reportedByOrgs, setReportedByOrgs] = useState<string[]>([]);
  const [aidTypes, setAidTypes] = useState<string[]>([]);
  const [flowTypes, setFlowTypes] = useState<string[]>([]);
  const [tiedStatuses, setTiedStatuses] = useState<string[]>([]);

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

  const activityStatus = activityStatuses.length === 1 ? activityStatuses[0] : 'all';
  const submissionStatus = submissionStatuses.length === 1 ? submissionStatuses[0] : 'all';
  const reportedBy = reportedByOrgs.length === 1 ? reportedByOrgs[0] : 'all';
  const aidType = aidTypes.length === 1 ? aidTypes[0] : 'all';
  const flowType = flowTypes.length === 1 ? flowTypes[0] : 'all';
  const tiedStatus = tiedStatuses.length === 1 ? tiedStatuses[0] : 'all';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const queryKey = useMemo(
    () => [
      'activities',
      'list',
      {
        page: currentPage,
        pageSize,
        search: debouncedSearchQuery,
        sortField,
        sortOrder,
        activityStatuses,
        submissionStatuses,
        reportedByOrgs,
        aidTypes,
        flowTypes,
        tiedStatuses,
        viewMode,
      },
    ],
    [
      currentPage,
      pageSize,
      debouncedSearchQuery,
      sortField,
      sortOrder,
      activityStatuses,
      submissionStatuses,
      reportedByOrgs,
      aidTypes,
      flowTypes,
      tiedStatuses,
      viewMode,
    ],
  );

  const queryTimesRef = useRef<number[]>([]);
  const [lastQueryTime, setLastQueryTime] = useState(0);

  const query = useQuery<ActivitiesResponse, Error>({
    queryKey,
    queryFn: async ({ signal }) => {
      const startTime = Date.now();

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortField,
        sortOrder,
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(activityStatuses.length > 0 && { activityStatuses: activityStatuses.join(',') }),
        ...(submissionStatuses.length > 0 && { submissionStatuses: submissionStatuses.join(',') }),
        ...(reportedByOrgs.length > 0 && { reportedByOrgs: reportedByOrgs.join(',') }),
        ...(aidTypes.length > 0 && { aidTypes: aidTypes.join(',') }),
        ...(flowTypes.length > 0 && { flowTypes: flowTypes.join(',') }),
        ...(tiedStatuses.length > 0 && { tiedStatuses: tiedStatuses.join(',') }),
        ...(viewMode === 'card' && { includeImages: 'true' }),
      });

      let endpoint = `/api/activities-optimized?${params}`;
      let response = await apiFetch(endpoint, { signal, cache: 'no-store' });

      if (!response.ok) {
        endpoint = `/api/activities-simple?${params}`;
        response = await apiFetch(endpoint, { signal, cache: 'no-store' });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} from ${endpoint}`);
      }

      const data = await response.json();
      const activities: Activity[] = data.activities || data.data || [];
      const rawTotal = data.pagination?.total ?? data.pagination?.totalCount ?? data.totalCount;
      const totalCount = typeof rawTotal === 'number' ? rawTotal : activities.length;
      const totalPages =
        data.pagination?.totalPages ??
        (typeof rawTotal === 'number' ? Math.ceil(totalCount / pageSize) : 1);

      const queryTime = Date.now() - startTime;

      return {
        activities,
        totalCount,
        totalPages,
        systemTotals: (data.systemTotals as SystemTotals | null) || null,
        queryTime,
      };
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!query.data) return;
    setLastQueryTime(query.data.queryTime);
    queryTimesRef.current.push(query.data.queryTime);
    if (queryTimesRef.current.length > 10) {
      queryTimesRef.current = queryTimesRef.current.slice(-10);
    }
  }, [query.data]);

  const errorMessage = useMemo(() => {
    if (!query.error) return null;
    const raw = query.error.message || 'Failed to fetch activities';
    if (raw.includes('DATABASE_CONNECTION_ERROR')) {
      return 'Database connection issue. Please try again later.';
    }
    if (raw.includes('503')) {
      return 'Service temporarily unavailable. Please try again later.';
    }
    return raw;
  }, [query.error]);

  useEffect(() => {
    if (errorMessage && onError) onError(errorMessage);
  }, [errorMessage, onError]);

  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder('asc');
      }
      setCurrentPage(1);
    },
    [sortField],
  );

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const queryClient = useQueryClient();

  const removeActivity = useCallback(
    (id: string) => {
      queryClient.setQueriesData<ActivitiesResponse>(
        { queryKey: ['activities', 'list'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            activities: old.activities.filter((a) => a.id !== id),
            totalCount: Math.max(0, old.totalCount - 1),
          };
        },
      );
    },
    [queryClient],
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['activities', 'list'] });
  }, [queryClient]);

  const avgQueryTime =
    queryTimesRef.current.length > 0
      ? queryTimesRef.current.reduce((a, b) => a + b, 0) / queryTimesRef.current.length
      : 0;

  const activities = query.data?.activities ?? EMPTY_ACTIVITIES;
  const totalCount = query.data?.totalCount ?? 0;
  const totalPages = query.data?.totalPages ?? 0;
  const systemTotals = query.data?.systemTotals ?? null;

  return {
    activities,
    loading: query.isFetching,
    error: errorMessage,
    totalCount,
    totalPages,
    currentPage,
    searchQuery,
    setSearchQuery,
    setPage,
    sorting: {
      sortField,
      sortOrder,
      handleSort,
    },
    filters: {
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
      setTiedStatus,
    },
    refetch,
    removeActivity,
    performance: {
      lastQueryTime,
      avgQueryTime,
    },
    systemTotals,
  };
}
