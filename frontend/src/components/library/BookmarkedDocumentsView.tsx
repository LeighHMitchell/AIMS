"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  TableIcon,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import { DocumentCard } from '@/components/library/DocumentCard';
import { DocumentTable } from '@/components/library/DocumentTable';
import type { UnifiedDocument, LibraryResponse } from '@/types/library-document';
import type { BookmarkEntry } from '@/hooks/useDocumentBookmarks';

type ViewMode = 'card' | 'table';

interface BookmarkedDocumentsViewProps {
  scope: 'personal' | 'reading_room';
  bookmarks: BookmarkEntry[];
  bookmarksLoading: boolean;
  // Bookmark actions to pass down to cards/table
  isPersonalBookmarked: (url: string) => boolean;
  isReadingRoomBookmarked: (url: string) => boolean;
  togglePersonalBookmark: (doc: { url: string; title: string; format: string }) => void;
  toggleReadingRoomBookmark: (doc: { url: string; title: string; format: string }) => void;
  hasOrganization: boolean;
  // Handlers
  onPreview: (doc: UnifiedDocument) => void;
  onDownload: (doc: UnifiedDocument) => void;
  onNavigate: (doc: UnifiedDocument) => void;
  onEdit?: (doc: UnifiedDocument) => void;
  onDelete?: (doc: UnifiedDocument) => void;
}

export function BookmarkedDocumentsView({
  scope,
  bookmarks,
  bookmarksLoading,
  isPersonalBookmarked,
  isReadingRoomBookmarked,
  togglePersonalBookmark,
  toggleReadingRoomBookmark,
  hasOrganization,
  onPreview,
  onDownload,
  onNavigate,
  onEdit,
  onDelete,
}: BookmarkedDocumentsViewProps) {
  const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('library-view-mode') as ViewMode) || 'card';
    }
    return 'card';
  });

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 24;

  // Build a map of reading room attribution
  const attributionMap = new Map<string, string>();
  if (scope === 'reading_room') {
    bookmarks.forEach(b => {
      if (b.added_by_name) {
        attributionMap.set(b.document_url, b.added_by_name);
      }
    });
  }

  const bookmarkUrls = bookmarks.map(b => b.document_url);

  const fetchDocuments = useCallback(async () => {
    if (bookmarkUrls.length === 0) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('urls', bookmarkUrls.map(u => encodeURIComponent(u)).join(','));
      params.append('limit', '1000'); // fetch all bookmarked docs at once

      const response = await apiFetch(`/api/library?${params.toString()}`);
      if (response.ok) {
        const data: LibraryResponse = await response.json();
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Error fetching bookmarked documents:', err);
    } finally {
      setLoading(false);
    }
  }, [bookmarkUrls.join(',')]);

  useEffect(() => {
    if (!bookmarksLoading) {
      fetchDocuments();
    }
  }, [bookmarksLoading, fetchDocuments]);

  // Reset page when bookmarks change
  useEffect(() => {
    setPage(1);
  }, [bookmarkUrls.length]);

  // Paginate locally
  const total = documents.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedDocs = documents.slice((page - 1) * limit, page * limit);

  const isLoading = bookmarksLoading || loading;

  // Empty state
  if (!isLoading && bookmarkUrls.length === 0) {
    const isPersonal = scope === 'personal';
    return (
      <Card>
        <CardContent className="py-12 text-center">
          {isPersonal ? (
            <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          ) : (
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          )}
          <h3 className="text-lg font-medium">
            {isPersonal ? 'My Library is empty' : 'Reading Room is empty'}
          </h3>
          <p className="text-muted-foreground mt-1">
            {isPersonal
              ? 'Save documents from the All Documents tab to access them quickly here.'
              : 'Add documents to the Reading Room from the All Documents tab to share them with your organisation.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading skeleton
  if (isLoading && documents.length === 0) {
    return viewMode === 'card' ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-32 w-full mb-3" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    ) : (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {total} document{total !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                viewMode === 'card'
                  ? 'bg-white shadow-sm text-slate-900 hover:bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              )}
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                viewMode === 'table'
                  ? 'bg-white shadow-sm text-slate-900 hover:bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              )}
              onClick={() => setViewMode('table')}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchDocuments}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedDocs.map(doc => (
            <DocumentCard
              key={doc.id}
              document={doc}
              isSelected={false}
              onSelect={() => {}}
              onPreview={() => onPreview(doc)}
              onDownload={() => onDownload(doc)}
              onEdit={onEdit && doc.sourceType === 'standalone' ? () => onEdit(doc) : undefined}
              onDelete={onDelete && doc.sourceType === 'standalone' ? () => onDelete(doc) : undefined}
              onNavigate={() => onNavigate(doc)}
              isPersonalBookmarked={isPersonalBookmarked(doc.url)}
              isReadingRoomBookmarked={isReadingRoomBookmarked(doc.url)}
              onTogglePersonalBookmark={() => togglePersonalBookmark(doc)}
              onToggleReadingRoomBookmark={hasOrganization ? () => toggleReadingRoomBookmark(doc) : undefined}
              addedByName={scope === 'reading_room' ? attributionMap.get(doc.url) : undefined}
            />
          ))}
        </div>
      ) : (
        <DocumentTable
          documents={paginatedDocs}
          selectedIds={new Set()}
          onSelectAll={() => {}}
          onSelectOne={() => {}}
          onPreview={onPreview}
          onDownload={onDownload}
          onEdit={onEdit}
          onDelete={onDelete}
          onNavigate={onNavigate}
          sortBy="createdAt"
          sortOrder="desc"
          onSort={() => {}}
          isPersonalBookmarked={isPersonalBookmarked}
          isReadingRoomBookmarked={isReadingRoomBookmarked}
          onTogglePersonalBookmark={togglePersonalBookmark}
          onToggleReadingRoomBookmark={hasOrganization ? toggleReadingRoomBookmark : undefined}
          showAddedBy={scope === 'reading_room'}
          attributionMap={scope === 'reading_room' ? attributionMap : undefined}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
