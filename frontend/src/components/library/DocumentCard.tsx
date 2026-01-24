"use client"

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { DocumentThumbnail } from '@/components/ui/document-thumbnail';
import {
  MoreVertical,
  Download,
  Eye,
  Trash2,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { format } from 'date-fns';
import type { UnifiedDocument, DocumentSourceType } from '@/types/library-document';
import { getFormatLabel } from '@/types/library-document';

interface DocumentCardProps {
  document: UnifiedDocument;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onPreview: () => void;
  onDownload: () => void;
  onDelete?: () => void;
  onNavigate?: () => void;
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

export function DocumentCard({
  document,
  isSelected,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
  onNavigate,
}: DocumentCardProps) {
  return (
    <Card className={`group relative transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="bg-white/90 dark:bg-gray-900/90"
        />
      </div>

      {/* Action Menu */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            {document.sourceUrl && onNavigate && (
              <DropdownMenuItem onClick={onNavigate}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to {SOURCE_TYPE_LABELS[document.sourceType]}
              </DropdownMenuItem>
            )}
            {onDelete && document.sourceType === 'standalone' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent className="p-0">
        {/* Thumbnail */}
        <div 
          className="relative w-full aspect-[4/3] bg-muted rounded-t-lg overflow-hidden cursor-pointer"
          onClick={onPreview}
        >
          <DocumentThumbnail
            url={document.url}
            format={document.format}
            title={document.title}
            className="w-full h-full"
          />
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          {/* Title */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 
                  className="font-medium text-sm line-clamp-2 cursor-pointer hover:text-primary"
                  onClick={onPreview}
                >
                  {document.title}
                </h3>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{document.title}</p>
                {document.description && (
                  <p className="text-muted-foreground mt-1 text-xs">{document.description}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Format and Source Type */}
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {getFormatLabel(document.format)} · {SOURCE_TYPE_LABELS[document.sourceType]}
          </div>

          {/* Category */}
          {document.categoryCode && (
            <div className="flex items-start gap-1 text-xs">
              <span className="font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1 py-0.5 rounded shrink-0">
                {document.categoryCode}
              </span>
              {document.categoryName && (
                <span className="text-gray-600 dark:text-gray-400">
                  {document.categoryName}
                </span>
              )}
            </div>
          )}

          {/* Linked Entities */}
          {document.linkedEntities.length > 1 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Link2 className="h-3 w-3" />
              <span>Linked to {document.linkedEntities.length} items</span>
            </div>
          )}

          {/* Source Name */}
          {document.sourceName && document.sourceType !== 'standalone' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground truncate">
                    {document.sourceName}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{document.sourceName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Footer - Date and Org */}
          <div className="flex flex-col gap-2 text-xs text-muted-foreground pt-2 border-t">
            {/* Date */}
            <span>
              {document.createdAt
                ? `Uploaded on ${format(new Date(document.createdAt), 'MMM d, yyyy')}`
                : document.documentDate
                  ? `Uploaded on ${format(new Date(document.documentDate), 'MMM d, yyyy')}`
                  : '-'
              }
            </span>
            
            {/* Organization with logo */}
            {document.reportingOrgName && (
              <div className="flex items-center gap-2">
                {document.reportingOrgLogo ? (
                  <img 
                    src={document.reportingOrgLogo} 
                    alt=""
                    className="h-5 w-5 rounded-sm object-contain flex-shrink-0"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-sm bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      {(document.reportingOrgAcronym || document.reportingOrgName || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate">
                        {document.reportingOrgName}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{document.reportingOrgName}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions (visible on hover) */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-background to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={onPreview}>
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button variant="secondary" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
