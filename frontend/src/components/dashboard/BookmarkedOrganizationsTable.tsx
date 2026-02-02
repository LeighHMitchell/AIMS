"use client";

import React, { useState, useEffect } from 'react';
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
} from '@/components/ui/table';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Building2,
  BookmarkX,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useOrganizationBookmarks } from '@/hooks/use-organization-bookmarks';
import { apiFetch } from '@/lib/api-fetch';

interface BookmarkedOrganization {
  id: string;
  name: string;
  acronym?: string;
  organisation_type?: string;
  organisation_type_name?: string;
  description?: string;
  logo?: string;
  country?: string;
  country_represented?: string;
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

  const userId = propUserId || user?.id;

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
      // Remove from local state for immediate feedback
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
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Organization</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Activities</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((organization) => (
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
                        <p className="font-medium" title={organization.name}>
                          {organization.name}
                          {organization.acronym && (
                            <span className="text-slate-500"> ({organization.acronym})</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">
                      {organization.organisation_type_name || organization.organisation_type || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">
                      {organization.country_represented || organization.country || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-medium">
                      {organization.activeProjects || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500" title={format(new Date(organization.updated_at), 'PPpp')}>
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
