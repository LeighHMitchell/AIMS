'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useOptimizedSearch } from '@/hooks/useOptimizedSearch';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { getOptimizedApiClient } from '@/lib/optimized-api-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, RefreshCw, Building2, MapPin, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  acronym?: string;
  iati_identifier?: string;
  country?: string;
  organization_type?: string;
  registration_agency?: string;
  website?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface OptimizedOrganizationListProps {
  initialPageSize?: number;
  maxItems?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  className?: string;
}

const ITEM_HEIGHT = 140; // Approximate height of each organization card
const CONTAINER_HEIGHT = 600; // Height of the scrollable container

export function OptimizedOrganizationList({
  initialPageSize = 20,
  maxItems = 1000,
  showSearch = true,
  showFilters = true,
  className = '',
}: OptimizedOrganizationListProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filters, setFilters] = useState({
    organization_type: '',
    country: '',
    registration_agency: '',
  });

  const apiClient = getOptimizedApiClient();

  // Optimized search function
  const searchOrganizations = useCallback(async (query: string, signal?: AbortSignal) => {
    try {
      const result = await apiClient.fetchList<Organization>('organizations', {
        page: 1,
        pageSize: initialPageSize,
        filters: {
          ...filters,
          search: query,
        },
        orderBy: { column: 'name', ascending: true },
        select: 'id,name,acronym,iati_identifier,country,organization_type,registration_agency,website,description,created_at,updated_at',
      });

      return result;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }, [apiClient, initialPageSize, filters]);

  // Enhanced search hook
  const {
    query,
    results: searchResults,
    isLoading: isSearching,
    error: searchError,
    updateQuery,
    clearSearch,
  } = useOptimizedSearch(searchOrganizations, {
    debounceMs: 300,
    minSearchLength: 2,
    enableCache: true,
  });

  // Load initial organizations
  const loadOrganizations = useCallback(async (page: number = 1, append: boolean = false) => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const result = await apiClient.fetchList<Organization>('organizations', {
        page,
        pageSize: initialPageSize,
        filters,
        orderBy: { column: 'name', ascending: true },
        select: 'id,name,acronym,iati_identifier,country,organization_type,registration_agency,website,description,created_at,updated_at',
      });

      if (append) {
        setOrganizations(prev => [...prev, ...result.data]);
      } else {
        setOrganizations(result.data);
      }

      setTotalCount(result.total);
      setHasMore(result.hasMore && organizations.length < maxItems);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [apiClient, initialPageSize, filters, isLoadingMore, organizations.length, maxItems]);

  // Load more organizations
  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadOrganizations(currentPage + 1, true);
    }
  }, [hasMore, isLoadingMore, currentPage, loadOrganizations]);

  // Virtual scroll setup
  const displayOrganizations = searchResults?.data || organizations;
  const virtualScroll = useVirtualScroll(displayOrganizations, {
    itemHeight: ITEM_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
    overscan: 3,
  });

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    clearSearch();
    loadOrganizations(1, false);
  }, [clearSearch, loadOrganizations]);

  // Load initial data
  useEffect(() => {
    loadOrganizations(1, false);
  }, [loadOrganizations]);

  // Reload when filters change
  useEffect(() => {
    if (currentPage === 1) {
      loadOrganizations(1, false);
    }
  }, [filters, loadOrganizations, currentPage]);

  // Auto-load more when scrolling near bottom
  useEffect(() => {
    const { scrollTop, totalHeight } = virtualScroll;
    const scrollPercentage = scrollTop / (totalHeight - CONTAINER_HEIGHT);
    
    if (scrollPercentage > 0.8 && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [virtualScroll.scrollTop, virtualScroll.totalHeight, hasMore, isLoadingMore, loadMore]);

  // Render organization card
  const renderOrganizationCard = useCallback((organization: Organization) => (
    <Link
      key={organization.id}
      href={`/organizations/${organization.id}`}
      className="block border rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 bg-white"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {organization.name}
            </h3>
            {organization.acronym && (
              <p className="text-sm text-gray-600 mt-1">
                {organization.acronym}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {organization.organization_type && (
              <Badge variant="outline" className="text-xs">
                {organization.organization_type}
              </Badge>
            )}
          </div>
        </div>

        {/* IATI Identifier and Country */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {organization.iati_identifier && (
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <span className="font-mono text-xs">
                {organization.iati_identifier}
              </span>
            </div>
          )}
          
          {organization.country && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{organization.country}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {organization.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {organization.description}
          </p>
        )}

        {/* Additional Info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            {organization.registration_agency && (
              <span>Reg: {organization.registration_agency}</span>
            )}
            {organization.website && (
              <span className="truncate max-w-32">
                {organization.website.replace(/^https?:\/\//, '')}
              </span>
            )}
          </div>
          
          <span>
            Updated {new Date(organization.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  ), []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {showSearch && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search organizations..."
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {showFilters && (
          <div className="flex gap-2">
            <Select value={filters.organization_type} onValueChange={(value) => handleFilterChange('organization_type', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="government">Government</SelectItem>
                <SelectItem value="multilateral">Multilateral</SelectItem>
                <SelectItem value="ngo">NGO</SelectItem>
                <SelectItem value="foundation">Foundation</SelectItem>
                <SelectItem value="private_sector">Private Sector</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.country} onValueChange={(value) => handleFilterChange('country', value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Countries</SelectItem>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="DE">Germany</SelectItem>
                <SelectItem value="FR">France</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
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
          `Found ${searchResults.total} organizations`
        ) : (
          `Showing ${organizations.length} of ${totalCount} organizations`
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
        className="border rounded-lg overflow-auto"
        style={{ height: CONTAINER_HEIGHT }}
      >
        <div style={{ height: virtualScroll.totalHeight, position: 'relative' }}>
          {virtualScroll.virtualItems.map((virtualItem) => {
            const organization = displayOrganizations[virtualItem.index];
            if (!organization) return null;

            return (
              <div
                key={virtualItem.index}
                style={{
                  position: 'absolute',
                  top: virtualItem.offsetTop,
                  height: virtualItem.size,
                  width: '100%',
                  padding: '0 1rem',
                }}
              >
                {renderOrganizationCard(organization)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading States */}
      {(isSearching || isLoadingMore) && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Load More Button (fallback) */}
      {hasMore && !isLoadingMore && !searchResults && (
        <div className="text-center">
          <Button onClick={loadMore} variant="outline">
            Load More Organizations
          </Button>
        </div>
      )}
    </div>
  );
} 