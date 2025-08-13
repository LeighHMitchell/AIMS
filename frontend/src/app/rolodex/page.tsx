'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Grid3X3, 
  List, 
  RefreshCw, 
  Download, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown
} from 'lucide-react';

import { PersonCard } from '@/components/rolodex/PersonCard';
import { RolodexStats } from '@/components/rolodex/RolodexStats';
import { useRolodexData } from '@/components/rolodex/useRolodexData';
import { useRouter } from 'next/navigation';
import { RolodexSkeleton } from '@/components/skeletons';

type ViewMode = 'grid' | 'list';

export default function RolodexPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Define sort options
  const sortOptions = [
    { value: 'name', label: 'Name (A-Z)', icon: ArrowUpDown },
    { value: 'firstName', label: 'First Name', icon: ArrowUpDown },
    { value: 'lastName', label: 'Last Name', icon: ArrowUpDown },
    { value: 'email', label: 'Email', icon: ArrowUpDown },
    { value: 'organization', label: 'Organization', icon: ArrowUpDown },
    { value: 'role', label: 'Role', icon: ArrowUpDown },
    { value: 'source', label: 'Type (Users/Contacts)', icon: ArrowUpDown },
  ];
  
  const {
    people,
    loading,
    error,
    filters,
    setFilters,
    refetch,
    pagination
  } = useRolodexData({
    initialFilters: {
      page: 1,
      limit: 24 // Good for grid layout (4x6)
    },
    autoFetch: true // Enable auto-fetch for filters and sorting
  });
  
  // Manual initial fetch to avoid infinite loops
  useEffect(() => {
    console.log('[RolodexPage] Initial fetch on mount');
    refetch();
  }, []); // Only run once on mount

  // Debug logging
  console.log('[RolodexPage] State:', { 
    peopleCount: people.length, 
    loading, 
    error, 
    total: pagination.total,
    filters 
  });

  const handleOrganizationClick = (organizationId: string) => {
    router.push(`/partners/${organizationId}`);
  };

  const handleActivityClick = (activityId: string) => {
    router.push(`/activities/${activityId}`);
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Organization', 'Activity', 'Phone', 'Country', 'Source'],
      ...people.map(person => [
        person.name,
        person.email,
        person.role_label,
        person.organization_name || '',
        person.activity_title || '',
        person.phone || '',
        person.country_code || '',
        person.source
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rolodex-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSortChange = (sortBy: string) => {
    const currentSortBy = filters.sortBy || 'name';
    const currentSortOrder = filters.sortOrder || 'asc';
    
    // If clicking the same sort field, toggle the order
    const newSortOrder = sortBy === currentSortBy && currentSortOrder === 'asc' ? 'desc' : 'asc';
    
    setFilters({ 
      sortBy, 
      sortOrder: newSortOrder,
      page: 1 // Reset to first page when sorting changes
    });
  };

  const getCurrentSortLabel = () => {
    const currentSort = sortOptions.find(option => option.value === (filters.sortBy || 'name'));
    const order = filters.sortOrder === 'desc' ? ' (Z-A)' : ' (A-Z)';
    return currentSort ? currentSort.label + order : 'Name (A-Z)';
  };

  const renderPaginationControls = () => (
    <div className="flex items-center justify-between">
      <div className="text-sm text-slate-600">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
        {pagination.total} people
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={pagination.prevPage}
          disabled={!pagination.hasPrev || loading}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            const page = Math.max(1, pagination.page - 2) + i;
            if (page > pagination.totalPages) return null;
            
            return (
              <Button
                key={page}
                variant={page === pagination.page ? "default" : "outline"}
                size="sm"
                onClick={() => pagination.goToPage(page)}
                disabled={loading}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            );
          })}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={pagination.nextPage}
          disabled={!pagination.hasNext || loading}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  // Show skeleton loader during initial load
  if (loading && people.length === 0 && !error && pagination.total === 0) {
    return (
      <MainLayout>
        <RolodexSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50">
      <div className="max-w-screen-xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Rolodex</h1>
            <p className="text-slate-600 mt-1">
              Comprehensive directory of all individuals in the aid system
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-[160px] justify-between"
                >
                  <span className="flex items-center">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Sort: {getCurrentSortLabel().split(' (')[0]}
                  </span>
                  <div className="flex items-center ml-2">
                    {filters.sortOrder === 'desc' ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUp className="h-3 w-3" />
                    )}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <option.icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </span>
                    {(filters.sortBy || 'name') === option.value && (
                      filters.sortOrder === 'desc' ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={loading || people.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            
            <div className="flex border border-slate-200 rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Content */}
        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <h3 className="font-medium">Error loading rolodex data</h3>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : people.length === 0 && !loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No people found</h3>
              <p className="text-slate-600 mb-4">
                No people are currently in the system.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* People Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-8">
                {people.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    onOrganizationClick={handleOrganizationClick}
                    onActivityClick={handleActivityClick}
                    compact={false}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {people.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    onOrganizationClick={handleOrganizationClick}
                    onActivityClick={handleActivityClick}
                    compact={true}
                  />
                ))}
              </div>
            )}

            {/* Loading overlay for grid/list */}
            {loading && (
              <div className="relative">
                <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10">
                  <div className="flex items-center space-x-2 text-slate-600">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Card>
                <CardContent className="p-4">
                  {renderPaginationControls()}
                </CardContent>
              </Card>
            )}
          </>
        )}
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <RolodexStats 
              totalCount={pagination.total}
              filters={filters}
            />
          </div>
        </div>
      </div>
    </div>
    </MainLayout>
  );
}