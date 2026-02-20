"use client"

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MoreVertical,
  Download,
  Eye,
  Trash2,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Bookmark,
  BookOpen,
} from 'lucide-react';
import { format } from 'date-fns';
import type { UnifiedDocument, DocumentSourceType, LibrarySortField } from '@/types/library-document';
import { getFormatLabel, getFormatBadgeClasses } from '@/types/library-document';

interface DocumentTableProps {
  documents: UnifiedDocument[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onPreview: (doc: UnifiedDocument) => void;
  onDownload: (doc: UnifiedDocument) => void;
  onEdit?: (doc: UnifiedDocument) => void;
  onDelete?: (doc: UnifiedDocument) => void;
  onNavigate: (doc: UnifiedDocument) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: LibrarySortField) => void;
  // Bookmark props
  isPersonalBookmarked?: (url: string) => boolean;
  isReadingRoomBookmarked?: (url: string) => boolean;
  onTogglePersonalBookmark?: (doc: { url: string; title: string; format: string }) => void;
  onToggleReadingRoomBookmark?: (doc: { url: string; title: string; format: string }) => void;
  showAddedBy?: boolean;
  attributionMap?: Map<string, string>;
}

// Source type labels
const SOURCE_TYPE_LABELS: Record<DocumentSourceType, string> = {
  activity: 'Activity',
  transaction: 'Transaction',
  organization: 'Organization',
  result: 'Result',
  indicator: 'Indicator',
  baseline: 'Baseline',
  period: 'Period',
  standalone: 'Library',
};

// Sortable column header component
function SortableHeader({
  field,
  label,
  currentSortBy,
  sortOrder,
  onSort,
}: {
  field: LibrarySortField;
  label: string;
  currentSortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: LibrarySortField) => void;
}) {
  const isActive = currentSortBy === field;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive ? (
        sortOrder === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}

export function DocumentTable({
  documents,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  onNavigate,
  sortBy,
  sortOrder,
  onSort,
  isPersonalBookmarked,
  isReadingRoomBookmarked,
  onTogglePersonalBookmark,
  onToggleReadingRoomBookmark,
  showAddedBy,
  attributionMap,
}: DocumentTableProps) {
  const allSelected = documents.length > 0 && documents.every(d => selectedIds.has(d.id));
  const someSelected = documents.some(d => selectedIds.has(d.id)) && !allSelected;

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as any).indeterminate = someSelected;
                  }
                }}
                onCheckedChange={(checked) => onSelectAll(checked as boolean)}
              />
            </TableHead>
            <TableHead className="w-[25%]">
              <SortableHeader
                field="title"
                label="Document Title"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="w-[18%]">
              <SortableHeader
                field="categoryCode"
                label="Category"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="w-[14%]">Activity</TableHead>
            <TableHead className="w-[14%]">
              <SortableHeader
                field="reportingOrgName"
                label="Organisation"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="w-[8%]">
              <SortableHeader
                field="format"
                label="Format"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="w-[10%]">
              <SortableHeader
                field="createdAt"
                label="Date"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className={showAddedBy ? "w-[7%]" : "w-[8%]"}>
              <SortableHeader
                field="sourceType"
                label="Source"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            {showAddedBy && (
              <TableHead className="w-[10%]">Added By</TableHead>
            )}
            <TableHead className="w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const sourceLabel = SOURCE_TYPE_LABELS[doc.sourceType];

            return (
              <TableRow 
                key={doc.id}
                className={selectedIds.has(doc.id) ? 'bg-muted/50' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(doc.id)}
                    onCheckedChange={(checked) => onSelectOne(doc.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="text-left font-medium hover:text-primary hover:underline"
                          onClick={() => onPreview(doc)}
                        >
                          {doc.title}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-sm">
                        <p className="font-medium">{doc.title}</p>
                        {doc.description && (
                          <p className="text-muted-foreground mt-1 text-sm">{doc.description}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  {doc.categoryCode ? (
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-xs font-mono bg-muted dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                        {doc.categoryCode}
                      </span>
                      {doc.categoryName && (
                        <> {doc.categoryName}</>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {doc.sourceType !== 'standalone' ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="text-sm text-muted-foreground hover:text-primary hover:underline text-left"
                            onClick={() => onNavigate(doc)}
                          >
                            {doc.sourceName}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{doc.sourceName}</p>
                          {doc.linkedEntities.length > 1 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              + {doc.linkedEntities.length - 1} more links
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {doc.reportingOrgName ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            {doc.reportingOrgLogo ? (
                              <img src={doc.reportingOrgLogo} alt="" className="h-5 w-5 rounded-sm object-contain flex-shrink-0" />
                            ) : (
                              <div className="h-5 w-5 rounded-sm bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                  {(doc.reportingOrgAcronym || doc.reportingOrgName || '?')[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-sm">
                              {doc.reportingOrgAcronym || doc.reportingOrgName}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{doc.reportingOrgName}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${getFormatBadgeClasses(doc.format)}`}>
                    {getFormatLabel(doc.format)}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {doc.documentDate
                    ? format(new Date(doc.documentDate), 'd MMM yyyy')
                    : doc.createdAt
                      ? format(new Date(doc.createdAt), 'd MMM yyyy')
                      : '-'
                  }
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {sourceLabel}
                  </span>
                </TableCell>
                {showAddedBy && (
                  <TableCell className="text-sm text-muted-foreground">
                    {attributionMap?.get(doc.url) || '-'}
                  </TableCell>
                )}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onPreview(doc)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDownload(doc)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      {onEdit && doc.sourceType === 'standalone' && (
                        <DropdownMenuItem onClick={() => onEdit(doc)}>
                          <Pencil className="h-4 w-4 mr-2 text-slate-500" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {doc.sourceUrl && (
                        <DropdownMenuItem onClick={() => onNavigate(doc)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Go to {sourceLabel}
                        </DropdownMenuItem>
                      )}
                      {onTogglePersonalBookmark && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onTogglePersonalBookmark(doc)}>
                            <Bookmark className={`h-4 w-4 mr-2 ${isPersonalBookmarked?.(doc.url) ? 'fill-current' : ''}`} />
                            {isPersonalBookmarked?.(doc.url) ? 'Remove from My Library' : 'Save to My Library'}
                          </DropdownMenuItem>
                        </>
                      )}
                      {onToggleReadingRoomBookmark && (
                        <DropdownMenuItem onClick={() => onToggleReadingRoomBookmark(doc)}>
                          <BookOpen className={`h-4 w-4 mr-2 ${isReadingRoomBookmarked?.(doc.url) ? 'fill-current' : ''}`} />
                          {isReadingRoomBookmarked?.(doc.url) ? 'Remove from Reading Room' : 'Add to Reading Room'}
                        </DropdownMenuItem>
                      )}
                      {onDelete && doc.sourceType === 'standalone' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onDelete(doc)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
