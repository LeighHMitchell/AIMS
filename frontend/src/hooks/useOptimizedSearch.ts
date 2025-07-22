import { useState, useEffect, useRef, useCallback } from 'react';

interface UseOptimizedSearchOptions {
  debounceMs?: number;
  minSearchLength?: number;
  cacheTimeout?: number;
  enableCache?: boolean;
}

interface SearchCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

export function useOptimizedSearch<T = any>(
  searchFunction: (query: string, signal?: AbortSignal) => Promise<T>,
  options: UseOptimizedSearchOptions = {}
) {
  const {
    debounceMs = 300,
    minSearchLength = 2,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    enableCache = true,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<SearchCache>({});

  // Clean up cache entries that have expired
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    Object.keys(cacheRef.current).forEach(key => {
      if (now - cacheRef.current[key].timestamp > cacheTimeout) {
        delete cacheRef.current[key];
      }
    });
  }, [cacheTimeout]);

  // Enhanced search with caching and cancellation
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < minSearchLength) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    // Check cache first
    if (enableCache && cacheRef.current[searchQuery]) {
      const cached = cacheRef.current[searchQuery];
      if (Date.now() - cached.timestamp < cacheTimeout) {
        setResults(cached.data);
        setIsLoading(false);
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const data = await searchFunction(searchQuery, abortControllerRef.current.signal);
      
      // Cache the result
      if (enableCache) {
        cacheRef.current[searchQuery] = {
          data,
          timestamp: Date.now(),
        };
      }

      setResults(data);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Search failed');
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchFunction, minSearchLength, enableCache, cacheTimeout]);

  // Debounced search effect
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, performSearch, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Periodic cache cleanup
  useEffect(() => {
    if (!enableCache) return;

    const interval = setInterval(cleanupCache, cacheTimeout);
    return () => clearInterval(interval);
  }, [cleanupCache, enableCache, cacheTimeout]);

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    query,
    results,
    isLoading,
    error,
    updateQuery,
    clearSearch,
    performSearch: () => performSearch(query),
  };
} 