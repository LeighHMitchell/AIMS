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
} from 'lucide-react';
import { format } from 'date-fns';
import type { UnifiedDocument, DocumentSourceType, LibrarySortField } from '@/types/library-document';
import { getFormatLabel } from '@/types/library-document';

interface DocumentTableProps {
  documents: UnifiedDocument[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onPreview: (doc: UnifiedDocument) => void;
  onDownload: (doc: UnifiedDocument) => void;
  onDelete?: (doc: UnifiedDocument) => void;
  onNavigate: (doc: UnifiedDocument) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: LibrarySortField) => void;
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
  onDelete,
  onNavigate,
  sortBy,
  sortOrder,
  onSort,
}: DocumentTableProps) {
  const allSelected = documents.length > 0 && documents.every(d => selectedIds.has(d.id));
  const someSelected = documents.some(d => selectedIds.has(d.id)) && !allSelected;

  return (
    <div className="border rounded-lg">
      <Table>
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
            <TableHead className="min-w-[200px]">
              <SortableHeader
                field="title"
                label="Title"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                field="categoryCode"
                label="Category"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                field="format"
                label="Format"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                field="sourceType"
                label="Source"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>Linked To</TableHead>
            <TableHead>
              <SortableHeader
                field="reportingOrgName"
                label="Organization"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                field="createdAt"
                label="Date"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </TableHead>
            <TableHead className="w-[60px]">Actions</TableHead>
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
                          className="text-left font-medium hover:text-primary hover:underline max-w-[300px] truncate block"
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                        {doc.categoryCode}
                      </span>
                      {doc.categoryName && (
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {doc.categoryName}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {getFormatLabel(doc.format)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {sourceLabel}
                  </span>
                </TableCell>
                <TableCell>
                  {doc.sourceType !== 'standalone' ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="text-sm text-muted-foreground hover:text-primary hover:underline max-w-[150px] truncate block"
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
                          <span className="text-sm max-w-[100px] truncate block">
                            {doc.reportingOrgName}
                          </span>
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
                <TableCell className="text-sm text-muted-foreground">
                  {doc.documentDate 
                    ? format(new Date(doc.documentDate), 'MMM d, yyyy')
                    : doc.createdAt
                      ? format(new Date(doc.createdAt), 'MMM d, yyyy')
                      : '-'
                  }
                </TableCell>
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
                      {doc.sourceUrl && (
                        <DropdownMenuItem onClick={() => onNavigate(doc)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Go to {sourceLabel}
                        </DropdownMenuItem>
                      )}
                      {onDelete && doc.sourceType === 'standalone' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onDelete(doc)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
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
