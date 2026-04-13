"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getSortIcon,
  sortableHeaderClasses,
} from '@/components/ui/table';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Building2,
  BookmarkX,
  LayoutGrid,
  TableIcon,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useOrganizationBookmarks } from '@/hooks/use-organization-bookmarks';
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import OrganizationCardModern from '@/components/organizations/OrganizationCardModern';

type ViewMode = 'card' | 'table';
type SortField = 'name' | 'type' | 'location' | 'activities' | 'updated_at';
type SortDirection = 'asc' | 'desc';

interface BookmarkedOrganization {
  id: string;
  name: string;
  acronym?: string;
  organisation_type?: string;
  organisation_type_name?: string;
  description?: string;
  logo?: string;
  banner?: string;
  country?: string;
  country_represented?: string;
  iati_org_id?: string;
  website?: string;
  activeProjects?: number;
  updated_at: string;
  bookmarkedAt: string;
}

interface BookmarkedOrganizationsTableProps {
  userId?: string;
}

export function BookmarkedOrganizationsTable({ userId: propUserId }: BookmarkedOrganizationsTableProps = {}) {
  const router = useRouter();
  const { user } = useUser();
  const { removeBookmark } = useOrganizationBookmarks();
  const [organizations, setOrganizations] = useState<BookmarkedOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const userId = propUserId || user?.id;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedOrganizations = useMemo(() => {
    const sorted = [...organizations];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'type':
          cmp = (a.organisation_type_name || a.organisation_type || '').localeCompare(
            b.organisation_type_name || b.organisation_type || ''
          );
          break;
        case 'location':
          cmp = (a.country_represented || a.country || '').localeCompare(
            b.country_represented || b.country || ''
          );
          break;
        case 'activities':
          cmp = (a.activeProjects || 0) - (b.activeProjects || 0);
          break;
        case 'updated_at':
          cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [organizations, sortField, sortDirection]);

  const fetchBookmarkedOrganizations = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch(`/api/organization-bookmarks/organizations?userId=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch bookmarked organizations');
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error('[BookmarkedOrganizationsTable] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bookmarked organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarkedOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleRowClick = (organizationId: string) => {
    router.push(`/organizations/${organizationId}`);
  };

  const handleRemoveBookmark = async (e: React.MouseEvent, organizationId: string) => {
    e.stopPropagation();
    setRemovingId(organizationId);

    try {
      await removeBookmark(organizationId);
      setOrganizations((prev) => prev.filter((o) => o.id !== organizationId));
    } catch (error) {
      console.error('[BookmarkedOrganizationsTable] Error removing bookmark:', error);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bookmarked Organizations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load bookmarked organizations: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-600" />
              Bookmarked Organizations
            </CardTitle>
            <CardDescription>
              Your saved organizations for quick access
            </CardDescription>
          </div>
          {organizations.length > 0 && (
            <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-8 p-0',
                  viewMode === 'card'
                    ? 'bg-white shadow-sm text-slate-900 hover:bg-white'
                    : 'text-slate-500 hover:text-slate-700'
                )}
                onClick={() => setViewMode('card')}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-8 p-0',
                  viewMode === 'table'
                    ? 'bg-white shadow-sm text-slate-900 hover:bg-white'
                    : 'text-slate-500 hover:text-slate-700'
                )}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-2">No bookmarked organizations</p>
            <p className="text-xs text-slate-400">
              Bookmark organizations from the organization profile or organization cards to see them here.
            </p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedOrganizations.map((org) => (
              <OrganizationCardModern
                key={org.id}
                organization={{
                  id: org.id,
                  name: org.name,
                  acronym: org.acronym,
                  Organisation_Type_Code: org.organisation_type || '',
                  Organisation_Type_Name: org.organisation_type_name,
                  description: org.description,
                  logo: org.logo,
                  banner: org.banner,
                  country: org.country,
                  country_represented: org.country_represented,
                  iati_org_id: org.iati_org_id,
                  website: org.website,
                  activeProjects: org.activeProjects || 0,
                }}
              />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={`w-[35%] ${sortableHeaderClasses}`} onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    Organization
                    {getSortIcon('name', sortField, sortDirection)}
                  </div>
                </TableHead>
                <TableHead className={sortableHeaderClasses} onClick={() => handleSort('type')}>
                  <div className="flex items-center gap-1">
                    Type
                    {getSortIcon('type', sortField, sortDirection)}
                  </div>
                </TableHead>
                <TableHead className={sortableHeaderClasses} onClick={() => handleSort('location')}>
                  <div className="flex items-center gap-1">
                    Location
                    {getSortIcon('location', sortField, sortDirection)}
                  </div>
                </TableHead>
                <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => handleSort('activities')}>
                  <div className="flex items-center gap-1 justify-end">
                    Activities
                    {getSortIcon('activities', sortField, sortDirection)}
                  </div>
                </TableHead>
                <TableHead className={sortableHeaderClasses} onClick={() => handleSort('updated_at')}>
                  <div className="flex items-center gap-1">
                    Updated
                    {getSortIcon('updated_at', sortField, sortDirection)}
                  </div>
                </TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrganizations.map((organization) => (
                <TableRow
                  key={organization.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(organization.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {organization.logo ? (
                        <img
                          src={organization.logo}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-foreground" title={organization.name}>
                          {organization.name}
                          {organization.acronym && (
                            <span> ({organization.acronym})</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground">
                      {organization.organisation_type_name || organization.organisation_type || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground">
                      {organization.country_represented || organization.country || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm text-foreground">
                      {organization.activeProjects || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground" title={format(new Date(organization.updated_at), 'PPpp')}>
                      {formatDistanceToNow(new Date(organization.updated_at), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-red-50"
                      onClick={(e) => handleRemoveBookmark(e, organization.id)}
                      disabled={removingId === organization.id}
                      title="Remove bookmark"
                    >
                      <BookmarkX className="h-4 w-4 text-slate-500 hover:text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
