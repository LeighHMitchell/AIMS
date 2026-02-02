'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar, getInitials } from '@/components/ui/user-avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { RolodexPerson } from '@/app/api/rolodex/route';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Grid3X3,
  Table,
  RefreshCw,
  Download,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  Phone,
  Building2,
  FileText,
  ExternalLink,
  Trash2
} from 'lucide-react';

import { PersonCard } from '@/components/rolodex/PersonCard';
import { FilterPanel } from '@/components/rolodex/FilterPanel';
import { useRolodexData } from '@/components/rolodex/useRolodexData';
import { LoadingText } from '@/components/ui/loading-text';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';

type ViewMode = 'grid' | 'table';

export default function RolodexPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteContact, setDeleteContact] = useState<RolodexPerson | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
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

  const handleDeleteContact = async (contact: RolodexPerson) => {
    setDeleteContact(contact);
  };

  const confirmDelete = async () => {
    if (!deleteContact) return;

    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/rolodex?id=${deleteContact.id}&source=${deleteContact.source}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete contact');
      }

      toast.success(`"${deleteContact.name}" was deleted successfully`);
      setDeleteContact(null);
      refetch(); // Refresh the list
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete contact');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get sort icon for column headers
  const getSortIcon = (column: string) => {
    const currentSortBy = filters.sortBy || 'name';
    if (currentSortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return filters.sortOrder === 'desc' 
      ? <ArrowDown className="h-4 w-4 ml-1" />
      : <ArrowUp className="h-4 w-4 ml-1" />;
  };

  const renderPaginationControls = () => (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
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

  // Skeleton loader for initial load
  const renderSkeleton = () => (
    <div className="min-h-screen bg-white">
      <div className="max-w-screen-2xl mx-auto px-6 py-4 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="h-12 px-4 py-3 w-[60px]"><Skeleton className="h-4 w-8" /></th>
                <th className="h-12 px-4 py-3"><Skeleton className="h-4 w-20" /></th>
                <th className="h-12 px-4 py-3"><Skeleton className="h-4 w-16" /></th>
                <th className="h-12 px-4 py-3"><Skeleton className="h-4 w-16" /></th>
                <th className="h-12 px-4 py-3"><Skeleton className="h-4 w-28" /></th>
                <th className="h-12 px-4 py-3"><Skeleton className="h-4 w-14" /></th>
                <th className="h-12 px-4 py-3"><Skeleton className="h-4 w-14" /></th>
                <th className="h-12 px-4 py-3"><Skeleton className="h-4 w-16" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-8 rounded-full" /></td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-7 w-14" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Show skeleton loader during initial load
  if (loading && people.length === 0 && !error && pagination.total === 0) {
    return (
      <MainLayout>
        {renderSkeleton()}
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-white">
      <div className="max-w-screen-2xl mx-auto px-6 py-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rolodex</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive directory of all individuals in the aid system
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex border border-slate-200 rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
                title="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-l-none"
                title="Table view"
              >
                <Table className="h-4 w-4" />
              </Button>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleExport}
                    disabled={loading || people.length === 0}
                    aria-label="Export to CSV"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export to CSV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={() => {
            setFilters({
              page: 1,
              limit: 24,
              search: undefined,
              source: undefined,
              role: undefined,
              organization: undefined,
              orgType: undefined,
              activity: undefined,
              country: undefined,
            });
          }}
          loading={loading}
          totalCount={pagination.total}
        />

        <div className="space-y-6">
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
                {filters.search || filters.organization || filters.activity || filters.orgType || filters.role
                  ? 'No people match your current filters. Try adjusting your filter criteria.'
                  : 'No people are currently in the system.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* People Grid/Table */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {people.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    onOrganizationClick={handleOrganizationClick}
                    onActivityClick={handleActivityClick}
                    onDelete={handleDeleteContact}
                    compact={false}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto border-collapse">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground w-[60px]"></th>
                        <th 
                          className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground min-w-[180px] cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => handleSortChange('name')}
                        >
                          <div className="flex items-center">
                            <span>Name</span>
                            {getSortIcon('name')}
                          </div>
                        </th>
                        <th 
                          className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground min-w-[200px] cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => handleSortChange('email')}
                        >
                          <div className="flex items-center">
                            <span>Email</span>
                            {getSortIcon('email')}
                          </div>
                        </th>
                        <th className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground min-w-[140px]">Phone</th>
                        <th 
                          className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground min-w-[200px] cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => handleSortChange('organization')}
                        >
                          <div className="flex items-center">
                            <span>Organization</span>
                            {getSortIcon('organization')}
                          </div>
                        </th>
                        <th 
                          className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground min-w-[120px] cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => handleSortChange('role')}
                        >
                          <div className="flex items-center">
                            <span>Role</span>
                            {getSortIcon('role')}
                          </div>
                        </th>
                        <th 
                          className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground w-[100px] cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => handleSortChange('source')}
                        >
                          <div className="flex items-center">
                            <span>Type</span>
                            {getSortIcon('source')}
                          </div>
                        </th>
                        <th className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground w-[80px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {people.map((person) => (
                        <tr key={person.id} className="group hover:bg-muted transition-colors">
                          <td className="px-4 py-2 align-middle">
                            <UserAvatar
                              src={person.profile_photo}
                              seed={person.id || person.email || person.name || ''}
                              name={person.name || 'User'}
                              size="sm"
                              initials={getInitials(person.name || '')}
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-foreground align-middle">
                            <div className="font-medium text-foreground leading-tight">{person.name}</div>
                            {person.job_title && (
                              <div className="text-xs text-muted-foreground">{person.job_title}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-foreground align-middle">
                            {person.email && (
                              <a 
                                href={`mailto:${person.email}`}
                                className="text-sm text-foreground hover:text-blue-600 inline-flex items-center"
                              >
                                <Mail className="h-3 w-3 mr-1.5 text-muted-foreground flex-shrink-0" />
                                <span>{person.email}</span>
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-foreground align-middle">
                            {person.phone && (
                              <a 
                                href={`tel:${person.phone}`}
                                className="text-sm text-foreground hover:text-blue-600 inline-flex items-center"
                              >
                                <Phone className="h-3 w-3 mr-1.5 text-muted-foreground flex-shrink-0" />
                                <span>{person.phone}</span>
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-foreground align-middle text-left">
                            {person.organization_name && (
                              <button
                                onClick={() => person.organization_id && handleOrganizationClick(person.organization_id)}
                                className="text-sm text-foreground hover:text-blue-600 inline-flex items-center justify-start text-left"
                                disabled={!person.organization_id}
                              >
                                <Building2 className="h-3 w-3 mr-1.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-left">
                                  {person.organization_acronym 
                                    ? `${person.organization_name} (${person.organization_acronym})`
                                    : person.organization_name
                                  }
                                </span>
                                {person.organization_id && (
                                  <ExternalLink className="h-3 w-3 ml-1 text-muted-foreground flex-shrink-0" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-foreground align-middle">
                            <span>{person.role_label || person.role || '-'}</span>
                          </td>
                          <td className="px-4 py-2 text-sm align-middle">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                person.source === 'user' 
                                  ? 'bg-slate-100 text-slate-600' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}
                            >
                              {person.source === 'user' ? 'User' : 'Activity'}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-sm align-middle">
                            <div className="flex items-center gap-1">
                              {person.activity_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleActivityClick(person.activity_id!)}
                                  title="View Activity"
                                >
                                  <FileText className="h-4 w-4 text-muted-foreground hover:text-blue-600" />
                                </Button>
                              )}
                              {person.email && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => window.location.href = `mailto:${person.email}`}
                                  title="Send Email"
                                >
                                  <Mail className="h-4 w-4 text-muted-foreground hover:text-blue-600" />
                                </Button>
                              )}
                              {person.source === 'activity_contact' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleDeleteContact(person)}
                                  title="Delete Contact"
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Loading overlay */}
            {loading && (
              <div className="relative">
                <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10">
                  <div className="flex items-center space-x-2 text-slate-600">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <LoadingText>Loading contacts...</LoadingText>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                {renderPaginationControls()}
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>

      {/* Delete Contact Confirmation Dialog */}
      <Dialog open={!!deleteContact} onOpenChange={() => setDeleteContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteContact?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteContact(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}