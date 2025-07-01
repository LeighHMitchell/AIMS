'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Grid3X3, 
  List, 
  RefreshCw, 
  Download, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { FilterPanel } from '@/components/rolodex/FilterPanel';
import { PersonCard } from '@/components/rolodex/PersonCard';
import { useRolodexData } from '@/components/rolodex/useRolodexData';
import { useRouter } from 'next/navigation';
import { RolodexSkeleton } from '@/components/skeletons';

type ViewMode = 'grid' | 'list';

export default function RolodexPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  const {
    people,
    loading,
    error,
    filters,
    setFilters,
    clearFilters,
    refetch,
    pagination
  } = useRolodexData({
    initialFilters: {
      page: 1,
      limit: 24 // Good for grid layout (4x6)
    }
  });
  
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

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
          loading={loading}
          totalCount={pagination.total}
        />

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
                {Object.keys(filters).filter(key => filters[key as keyof typeof filters] && !['page', 'limit'].includes(key)).length > 0
                  ? 'Try adjusting your search criteria or clearing filters.'
                  : 'No people are currently in the system.'}
              </p>
              {Object.keys(filters).filter(key => filters[key as keyof typeof filters] && !['page', 'limit'].includes(key)).length > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear all filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* People Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
    </div>
    </MainLayout>
  );
}