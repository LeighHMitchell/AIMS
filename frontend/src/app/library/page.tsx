"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Search,
  Grid3X3,
  TableIcon,
  Plus,
  Download,
  Trash2,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Building2,
  Receipt,
  Target,
  BarChart3,
  Library as LibraryIcon,
  RefreshCw,
  Bookmark,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { useLoadingBar } from "@/hooks/useLoadingBar";
import { useUser } from "@/hooks/useUser";
import { USER_ROLES } from "@/types/user";
import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { BulkDeleteDialog } from "@/components/dialogs/bulk-delete-dialog";
import type {
  UnifiedDocument,
  LibraryFilters,
  LibraryResponse,
  DocumentSourceType
} from "@/types/library-document";
import { SOURCE_TYPE_LABELS } from "@/types/library-document";
import { LibraryFiltersPanel } from "@/components/library/LibraryFilters";
import { DocumentCard } from "@/components/library/DocumentCard";
import { DocumentTable } from "@/components/library/DocumentTable";
import { AddDocumentModal } from "@/components/library/AddDocumentModal";
import { EditDocumentModal } from "@/components/library/EditDocumentModal";
import { DocumentPreviewModal } from "@/components/library/DocumentPreviewModal";
import { BookmarkedDocumentsView } from "@/components/library/BookmarkedDocumentsView";
import { useDocumentBookmarks } from "@/hooks/useDocumentBookmarks";
import { apiFetch } from '@/lib/api-fetch';

type ViewMode = 'card' | 'table';

export default function LibraryPage() {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('library-view-mode') as ViewMode) || 'card';
    }
    return 'card';
  });

  // Data state
  const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState(() => {
    let limit = 20;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('library-page-limit');
      if (saved) limit = Number(saved);
    }
    return { page: 1, limit, total: 0, totalPages: 0 };
  });

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<LibraryFilters>({
    sourceTypes: undefined,
    categoryCodes: undefined,
    formats: undefined,
    reportingOrgIds: undefined,
    documentDateFrom: undefined,
    documentDateTo: undefined,
  });

  // Sort state
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<UnifiedDocument | null>(null);
  const [editingDocument, setEditingDocument] = useState<UnifiedDocument | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('all');

  // User permissions
  const { user } = useUser();
  const isSuperUser = user?.role === USER_ROLES.SUPER_USER || user?.role === 'admin';
  const hasOrganization = !!(user?.organizationId || (user as any)?.organization_id);

  // Bookmarks
  const {
    personalBookmarks,
    readingRoomBookmarks,
    loading: bookmarksLoading,
    isPersonalBookmarked,
    isReadingRoomBookmarked,
    togglePersonalBookmark,
    toggleReadingRoomBookmark,
  } = useDocumentBookmarks();

  // Loading bar
  const { startLoading, stopLoading } = useLoadingBar();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Save view mode preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('library-view-mode', viewMode);
    }
  }, [viewMode]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    startLoading();

    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (filters.sourceTypes && filters.sourceTypes.length > 0) {
        params.append('sourceTypes', filters.sourceTypes.join(','));
      }
      if (filters.categoryCodes && filters.categoryCodes.length > 0) {
        params.append('categoryCodes', filters.categoryCodes.join(','));
      }
      if (filters.formats && filters.formats.length > 0) {
        params.append('formats', filters.formats.join(','));
      }
      if (filters.reportingOrgIds && filters.reportingOrgIds.length > 0) {
        params.append('reportingOrgIds', filters.reportingOrgIds.join(','));
      }
      if (filters.documentDateFrom) {
        params.append('documentDateFrom', filters.documentDateFrom);
      }
      if (filters.documentDateTo) {
        params.append('documentDateTo', filters.documentDateTo);
      }

      const response = await apiFetch(`/api/library?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data: LibraryResponse = await response.json();
      setDocuments(data.documents);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please try again.');
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
      stopLoading();
    }
  }, [pagination.page, pagination.limit, sortBy, sortOrder, debouncedSearch, filters, startLoading, stopLoading]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [debouncedSearch, filters]);

  // Handle selection
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(documents.map(d => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [documents]);

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  // Handle download
  const handleDownload = useCallback((doc: UnifiedDocument) => {
    window.open(doc.url, '_blank');
  }, []);

  // Handle bulk download
  const handleBulkDownload = useCallback(() => {
    const selectedDocs = documents.filter(d => selectedIds.has(d.id));
    selectedDocs.forEach(doc => {
      window.open(doc.url, '_blank');
    });
    toast.success(`Opened ${selectedDocs.length} documents`);
  }, [documents, selectedIds]);

  // Handle delete
  const handleDelete = useCallback(async (doc: UnifiedDocument) => {
    if (doc.sourceType !== 'standalone') {
      toast.error('Only standalone library documents can be deleted from here');
      return;
    }

    try {
      const response = await apiFetch(`/api/library/${doc.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete document');
      }

      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      toast.error(err.message || 'Failed to delete document');
    }
  }, [fetchDocuments]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    const standaloneIds = Array.from(selectedIds).filter(id => id.startsWith('standalone-'));

    if (standaloneIds.length === 0) {
      toast.error('Only standalone library documents can be deleted');
      setShowBulkDeleteDialog(false);
      return;
    }

    setIsBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        standaloneIds.map(id =>
          apiFetch(`/api/library/${id}`, { method: 'DELETE' })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      if (failCount > 0) {
        toast.warning(`Deleted ${successCount} documents, ${failCount} failed`);
      } else {
        toast.success(`Deleted ${successCount} document${successCount === 1 ? '' : 's'}`);
      }

      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting documents:', err);
      toast.error('Failed to delete documents');
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedIds, fetchDocuments]);

  // Handle preview
  const handlePreview = useCallback((doc: UnifiedDocument) => {
    setPreviewDocument(doc);
  }, []);

  // Handle navigate to source
  const handleNavigateToSource = useCallback((doc: UnifiedDocument) => {
    if (doc.sourceUrl) {
      window.location.href = doc.sourceUrl;
    }
  }, []);

  // Handle document added
  const handleDocumentAdded = useCallback(() => {
    setShowAddModal(false);
    fetchDocuments();
    toast.success('Document added to library');
  }, [fetchDocuments]);

  // Handle edit
  const handleEdit = useCallback((doc: UnifiedDocument) => {
    setEditingDocument(doc);
  }, []);

  // Handle edit success
  const handleEditSuccess = useCallback(() => {
    setEditingDocument(null);
    fetchDocuments();
  }, [fetchDocuments]);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setFilters({
      sourceTypes: undefined,
      categoryCodes: undefined,
      formats: undefined,
      reportingOrgIds: undefined,
      documentDateFrom: undefined,
      documentDateTo: undefined,
    });
    setSearchQuery('');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      (filters.sourceTypes && filters.sourceTypes.length > 0) ||
      (filters.categoryCodes && filters.categoryCodes.length > 0) ||
      (filters.formats && filters.formats.length > 0) ||
      (filters.reportingOrgIds && filters.reportingOrgIds.length > 0) ||
      filters.documentDateFrom ||
      filters.documentDateTo ||
      debouncedSearch
    );
  }, [filters, debouncedSearch]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.sourceTypes && filters.sourceTypes.length > 0) count++;
    if (filters.categoryCodes && filters.categoryCodes.length > 0) count++;
    if (filters.formats && filters.formats.length > 0) count++;
    if (filters.reportingOrgIds && filters.reportingOrgIds.length > 0) count++;
    if (filters.documentDateFrom || filters.documentDateTo) count++;
    return count;
  }, [filters]);

  // Calculate if all selected are standalone (for delete button)
  const canDeleteSelected = useMemo(() => {
    if (selectedIds.size === 0) return false;
    return Array.from(selectedIds).some(id => id.startsWith('standalone-'));
  }, [selectedIds]);

  // Bookmark toggle helpers that adapt UnifiedDocument to the hook's expected shape
  const handleTogglePersonal = useCallback((doc: UnifiedDocument) => {
    togglePersonalBookmark({ url: doc.url, title: doc.title, format: doc.format });
  }, [togglePersonalBookmark]);

  const handleToggleReadingRoom = useCallback((doc: UnifiedDocument) => {
    toggleReadingRoomBookmark({ url: doc.url, title: doc.title, format: doc.format });
  }, [toggleReadingRoomBookmark]);

  return (
    <MainLayout>
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Document Library
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse all documents from activities, transactions, organizations, and more
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isSuperUser && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="p-1 h-auto bg-background gap-1 border mb-4 flex flex-wrap">
            <TabsTrigger value="all" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LibraryIcon className="h-4 w-4" />
              All Documents
            </TabsTrigger>
            {hasOrganization && (
              <TabsTrigger value="reading_room" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BookOpen className="h-4 w-4" />
                Reading Room
                {readingRoomBookmarks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs">
                    {readingRoomBookmarks.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="personal" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bookmark className="h-4 w-4" />
              My Library
              {personalBookmarks.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs">
                  {personalBookmarks.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* All Documents Tab */}
          <TabsContent value="all" className="border-0 p-0 mt-4">
            <div className="space-y-4">
              {/* Search and Controls Bar */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents by title, description, or organization..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  {/* Filter Toggle */}
                  <Button
                    variant={showFilters ? "secondary" : "outline"}
                    onClick={() => setShowFilters(!showFilters)}
                    className="relative"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>

                  {/* View Toggle */}
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="rounded-r-none"
                      onClick={() => setViewMode('card')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="rounded-l-none"
                      onClick={() => setViewMode('table')}
                    >
                      <TableIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Refresh */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchDocuments()}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <LibraryFiltersPanel
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClear={handleClearFilters}
                />
              )}

              {/* Results Summary */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  {loading ? (
                    <Skeleton className="h-5 w-32" />
                  ) : (
                    <span>
                      {pagination.total} document{pagination.total !== 1 ? 's' : ''} found
                      {hasActiveFilters && ' (filtered)'}
                    </span>
                  )}
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear all filters
                  </Button>
                )}
              </div>

              {/* Content */}
              {error ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-destructive">{error}</p>
                    <Button variant="outline" className="mt-4" onClick={() => fetchDocuments()}>
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              ) : loading && documents.length === 0 ? (
                viewMode === 'card' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
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
                )
              ) : documents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <LibraryIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No documents found</h3>
                    <p className="text-muted-foreground mt-1">
                      {hasActiveFilters
                        ? 'Try adjusting your filters or search query'
                        : 'Documents uploaded to activities, transactions, and organizations will appear here'}
                    </p>
                    {isSuperUser && !hasActiveFilters && (
                      <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Document
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      isSelected={selectedIds.has(doc.id)}
                      onSelect={(checked) => handleSelectOne(doc.id, checked)}
                      onPreview={() => handlePreview(doc)}
                      onDownload={() => handleDownload(doc)}
                      onEdit={isSuperUser && doc.sourceType === 'standalone' ? () => handleEdit(doc) : undefined}
                      onDelete={isSuperUser && doc.sourceType === 'standalone' ? () => handleDelete(doc) : undefined}
                      onNavigate={() => handleNavigateToSource(doc)}
                      isPersonalBookmarked={isPersonalBookmarked(doc.url)}
                      isReadingRoomBookmarked={isReadingRoomBookmarked(doc.url)}
                      onTogglePersonalBookmark={() => handleTogglePersonal(doc)}
                      onToggleReadingRoomBookmark={hasOrganization ? () => handleToggleReadingRoom(doc) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <DocumentTable
                  documents={documents}
                  selectedIds={selectedIds}
                  onSelectAll={handleSelectAll}
                  onSelectOne={handleSelectOne}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onEdit={isSuperUser ? handleEdit : undefined}
                  onDelete={isSuperUser ? handleDelete : undefined}
                  onNavigate={handleNavigateToSource}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={(field) => {
                    if (sortBy === field) {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy(field);
                      setSortOrder('asc');
                    }
                  }}
                  isPersonalBookmarked={isPersonalBookmarked}
                  isReadingRoomBookmarked={isReadingRoomBookmarked}
                  onTogglePersonalBookmark={(doc) => handleTogglePersonal(doc as UnifiedDocument)}
                  onToggleReadingRoomBookmark={hasOrganization ? (doc) => handleToggleReadingRoom(doc as UnifiedDocument) : undefined}
                />
              )}

              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} documents
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                        disabled={pagination.page === 1 || loading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={pagination.page === 1 || loading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={pagination.page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                              className="w-8 h-8 p-0"
                              disabled={loading}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                        disabled={pagination.page === pagination.totalPages || loading}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.totalPages }))}
                        disabled={pagination.page === pagination.totalPages || loading}
                      >
                        Last
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Items per page:</label>
                      <Select
                        value={pagination.limit.toString()}
                        onValueChange={(value) => {
                          const newLimit = Number(value);
                          setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                          localStorage.setItem("library-page-limit", newLimit.toString());
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Reading Room Tab */}
          {hasOrganization && (
            <TabsContent value="reading_room" className="border-0 p-0 mt-4">
              <BookmarkedDocumentsView
                scope="reading_room"
                bookmarks={readingRoomBookmarks}
                bookmarksLoading={bookmarksLoading}
                isPersonalBookmarked={isPersonalBookmarked}
                isReadingRoomBookmarked={isReadingRoomBookmarked}
                togglePersonalBookmark={(doc) => togglePersonalBookmark(doc)}
                toggleReadingRoomBookmark={(doc) => toggleReadingRoomBookmark(doc)}
                hasOrganization={hasOrganization}
                onPreview={handlePreview}
                onDownload={handleDownload}
                onNavigate={handleNavigateToSource}
                onEdit={isSuperUser ? handleEdit : undefined}
                onDelete={isSuperUser ? handleDelete : undefined}
              />
            </TabsContent>
          )}

          {/* My Library Tab */}
          <TabsContent value="personal" className="border-0 p-0 mt-4">
            <BookmarkedDocumentsView
              scope="personal"
              bookmarks={personalBookmarks}
              bookmarksLoading={bookmarksLoading}
              isPersonalBookmarked={isPersonalBookmarked}
              isReadingRoomBookmarked={isReadingRoomBookmarked}
              togglePersonalBookmark={(doc) => togglePersonalBookmark(doc)}
              toggleReadingRoomBookmark={(doc) => toggleReadingRoomBookmark(doc)}
              hasOrganization={hasOrganization}
              onPreview={handlePreview}
              onDownload={handleDownload}
              onNavigate={handleNavigateToSource}
              onEdit={isSuperUser ? handleEdit : undefined}
              onDelete={isSuperUser ? handleDelete : undefined}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <AddDocumentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleDocumentAdded}
      />

      <EditDocumentModal
        isOpen={!!editingDocument}
        onClose={() => setEditingDocument(null)}
        onSuccess={handleEditSuccess}
        document={editingDocument}
      />

      <DocumentPreviewModal
        document={previewDocument}
        isOpen={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        onDownload={previewDocument ? () => handleDownload(previewDocument) : undefined}
      />

      {/* Bulk Action Toolbar - Fixed at bottom like activities */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        itemType="documents"
        onDelete={isSuperUser && canDeleteSelected ? () => setShowBulkDeleteDialog(true) : undefined}
        onClearSelection={() => setSelectedIds(new Set())}
        isDeleting={isBulkDeleting}
        deletableCount={Array.from(selectedIds).filter(id => id.startsWith('standalone-')).length}
        actions={[
          {
            label: 'Download',
            icon: <Download className="h-4 w-4" />,
            onClick: handleBulkDownload,
          },
        ]}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <BulkDeleteDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        onConfirm={handleBulkDelete}
        count={Array.from(selectedIds).filter(id => id.startsWith('standalone-')).length}
        entityName="document"
        isDeleting={isBulkDeleting}
      />
    </MainLayout>
  );
}
