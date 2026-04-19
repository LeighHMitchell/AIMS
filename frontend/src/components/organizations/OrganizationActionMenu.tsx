"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  Eye,
  Pencil,
  FileText,
  FileSpreadsheet,
  Trash2,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';

interface OrganizationActionMenuProps {
  organizationId: string;
  onView?: () => void;
  onEdit?: () => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onDelete?: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

export function OrganizationActionMenu({
  organizationId,
  onView,
  onEdit,
  onExportPDF,
  onExportExcel,
  onDelete,
  isBookmarked,
  onToggleBookmark,
}: OrganizationActionMenuProps) {
  const hasExport = onExportPDF || onExportExcel;

  // Don't render if no actions are available
  if (!onView && !onEdit && !hasExport && !onDelete) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Organization actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {onToggleBookmark && (
          <DropdownMenuItem onClick={onToggleBookmark} className="cursor-pointer">
            {isBookmarked ? (
              <>
                <BookmarkCheck className="h-4 w-4 mr-2" />
                Remove Bookmark
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4 mr-2" />
                Add Bookmark
              </>
            )}
          </DropdownMenuItem>
        )}

        {onView && (
          <DropdownMenuItem onClick={onView} className="cursor-pointer">
            <Eye className="h-4 w-4 mr-2" />
            View
          </DropdownMenuItem>
        )}

        {onEdit && (
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}

        {hasExport && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {onExportPDF && (
                  <DropdownMenuItem onClick={onExportPDF} className="cursor-pointer">
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                )}
                {onExportExcel && (
                  <DropdownMenuItem onClick={onExportExcel} className="cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2 text-destructive" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
