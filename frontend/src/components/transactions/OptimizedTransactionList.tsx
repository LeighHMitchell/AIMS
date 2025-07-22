'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useOptimizedSearch } from '@/hooks/useOptimizedSearch';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { getOptimizedApiClient } from '@/lib/optimized-api-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, RefreshCw, DollarSign, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Transaction {
  id: string;
  activity_id: string;
  transaction_type: string;
  transaction_date: string;
  value: number;
  currency: string;
  description?: string;
  provider_org?: string;
  receiver_org?: string;
  disbursement_channel?: string;
  flow_type?: string;
  finance_type?: string;
  aid_type?: string;
  tied_status?: string;
  created_at: string;
  updated_at: string;
}

interface OptimizedTransactionListProps {
  activityId?: string;
  initialPageSize?: number;
  maxItems?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  className?: string;
}

const ITEM_HEIGHT = 120; // Approximate height of each transaction row
const CONTAINER_HEIGHT = 500; // Height of the scrollable container

export function OptimizedTransactionList({
  activityId,
  initialPageSize = 25,
  maxItems = 500,
  showSearch = true,
  showFilters = true,
  className = '',
}: OptimizedTransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filters, setFilters] = useState({
    transaction_type: '',
    flow_type: '',
    finance_type: '',
    dateRange: '',
  });

  const apiClient = getOptimizedApiClient();

  // Optimized search function
  const searchTransactions = useCallback(async (query: string, signal?: AbortSignal) => {
    try {
      const result = await apiClient.fetchList<Transaction>('transactions', {
        page: 1,
        pageSize: initialPageSize,
        filters: {
          ...filters,
          activity_id: activityId,
          search: query,
        },
        orderBy: { column: 'transaction_date', ascending: false },
        select: 'id,activity_id,transaction_type,transaction_date,value,currency,description,provider_org,receiver_org,disbursement_channel,flow_type,finance_type,aid_type,tied_status,created_at,updated_at',
      });

      return result;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }, [apiClient, initialPageSize, filters, activityId]);

  // Enhanced search hook
  const {
    query,
    results: searchResults,
    isLoading: isSearching,
    error: searchError,
    updateQuery,
    clearSearch,
  } = useOptimizedSearch(searchTransactions, {
    debounceMs: 300,
    minSearchLength: 2,
    enableCache: true,
  });

  // Load initial transactions
  const loadTransactions = useCallback(async (page: number = 1, append: boolean = false) => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const result = await apiClient.fetchList<Transaction>('transactions', {
        page,
        pageSize: initialPageSize,
        filters: {
          ...filters,
          activity_id: activityId,
        },
        orderBy: { column: 'transaction_date', ascending: false },
        select: 'id,activity_id,transaction_type,transaction_date,value,currency,description,provider_org,receiver_org,disbursement_channel,flow_type,finance_type,aid_type,tied_status,created_at,updated_at',
      });

      if (append) {
        setTransactions(prev => [...prev, ...result.data]);
      } else {
        setTransactions(result.data);
      }

      setTotalCount(result.total);
      setHasMore(result.hasMore && transactions.length < maxItems);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [apiClient, initialPageSize, filters, activityId, isLoadingMore, transactions.length, maxItems]);

  // Load more transactions
  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadTransactions(currentPage + 1, true);
    }
  }, [hasMore, isLoadingMore, currentPage, loadTransactions]);

  // Virtual scroll setup
  const displayTransactions = searchResults?.data || transactions;
  const virtualScroll = useVirtualScroll(displayTransactions, {
    itemHeight: ITEM_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
    overscan: 5,
  });

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    clearSearch();
    loadTransactions(1, false);
  }, [clearSearch, loadTransactions]);

  // Format currency
  const formatCurrency = useCallback((value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  // Format date
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Load initial data
  useEffect(() => {
    loadTransactions(1, false);
  }, [loadTransactions]);

  // Reload when filters change
  useEffect(() => {
    if (currentPage === 1) {
      loadTransactions(1, false);
    }
  }, [filters, loadTransactions, currentPage]);

  // Auto-load more when scrolling near bottom
  useEffect(() => {
    const { scrollTop, totalHeight } = virtualScroll;
    const scrollPercentage = scrollTop / (totalHeight - CONTAINER_HEIGHT);
    
    if (scrollPercentage > 0.8 && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [virtualScroll.scrollTop, virtualScroll.totalHeight, hasMore, isLoadingMore, loadMore]);

  // Render transaction row
  const renderTransactionRow = useCallback((transaction: Transaction) => (
    <div
      key={transaction.id}
      className="border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="text-xs">
              {transaction.transaction_type}
            </Badge>
            {transaction.flow_type && (
              <Badge variant="secondary" className="text-xs">
                {transaction.flow_type}
              </Badge>
            )}
            {transaction.finance_type && (
              <Badge variant="secondary" className="text-xs">
                {transaction.finance_type}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span className="font-medium">
                {formatCurrency(transaction.value, transaction.currency)}
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(transaction.transaction_date)}</span>
            </div>
          </div>
          
          {transaction.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-1">
              {transaction.description}
            </p>
          )}
          
          {(transaction.provider_org || transaction.receiver_org) && (
            <div className="text-xs text-gray-500 mt-1">
              {transaction.provider_org && `From: ${transaction.provider_org}`}
              {transaction.provider_org && transaction.receiver_org && ' → '}
              {transaction.receiver_org && `To: ${transaction.receiver_org}`}
            </div>
          )}
        </div>
      </div>
    </div>
  ), [formatCurrency, formatDate]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {showSearch && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search transactions..."
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {showFilters && (
          <div className="flex gap-2">
            <Select value={filters.transaction_type} onValueChange={(value) => handleFilterChange('transaction_type', value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="incoming-funds">Incoming</SelectItem>
                <SelectItem value="commitment">Commitment</SelectItem>
                <SelectItem value="disbursement">Disbursement</SelectItem>
                <SelectItem value="expenditure">Expenditure</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.flow_type} onValueChange={(value) => handleFilterChange('flow_type', value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Flow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="ODA">ODA</SelectItem>
                <SelectItem value="OOF">OOF</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoadingMore}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingMore ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {searchResults ? (
          `Found ${searchResults.total} transactions`
        ) : (
          `Showing ${transactions.length} of ${totalCount} transactions`
        )}
        {hasMore && !searchResults && ` (scroll to load more)`}
      </div>

      {/* Error Display */}
      {searchError && (
        <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
          {searchError}
        </div>
      )}

      {/* Virtual Scrolled List */}
      <div
        ref={virtualScroll.containerRef}
        className="border rounded-lg overflow-auto bg-white"
        style={{ height: CONTAINER_HEIGHT }}
      >
        <div style={{ height: virtualScroll.totalHeight, position: 'relative' }}>
          {virtualScroll.virtualItems.map((virtualItem) => {
            const transaction = displayTransactions[virtualItem.index];
            if (!transaction) return null;

            return (
              <div
                key={virtualItem.index}
                style={{
                  position: 'absolute',
                  top: virtualItem.offsetTop,
                  height: virtualItem.size,
                  width: '100%',
                }}
              >
                {renderTransactionRow(transaction)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading States */}
      {(isSearching || isLoadingMore) && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-4 w-1/4 mb-2" />
              <Skeleton className="h-3 w-1/3 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Load More Button (fallback) */}
      {hasMore && !isLoadingMore && !searchResults && (
        <div className="text-center">
          <Button onClick={loadMore} variant="outline">
            Load More Transactions
          </Button>
        </div>
      )}
    </div>
  );
} 