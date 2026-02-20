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
        <button className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {onToggleBookmark && (
          <DropdownMenuItem onClick={onToggleBookmark} className="cursor-pointer">
            {isBookmarked ? (
              <>
                <BookmarkCheck className="h-4 w-4 mr-2 text-slate-600" />
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
            <Pencil className="h-4 w-4 mr-2 text-slate-500" />
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
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2 text-red-500" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
