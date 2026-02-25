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

interface OrganizationCardActionMenuProps {
  organizationId: string;
  onView?: () => void;
  onEdit?: () => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onDelete?: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

const itemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 cursor-pointer";
const dangerItemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20 cursor-pointer";

export function OrganizationCardActionMenu({
  organizationId,
  onView,
  onEdit,
  onExportPDF,
  onExportExcel,
  onDelete,
  isBookmarked,
  onToggleBookmark,
}: OrganizationCardActionMenuProps) {
  const hasExport = onExportPDF || onExportExcel;

  return (
    <div
      data-menu-root="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            <MoreVertical className="h-4 w-4 text-white" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px] rounded-xl p-1.5">
          {onToggleBookmark && (
            <DropdownMenuItem className={itemClass} onSelect={onToggleBookmark}>
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="h-4 w-4 text-slate-600" />
                  Remove Bookmark
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" />
                  Add Bookmark
                </>
              )}
            </DropdownMenuItem>
          )}

          {onView && (
            <DropdownMenuItem className={itemClass} onSelect={onView}>
              <Eye className="h-4 w-4" />
              View
            </DropdownMenuItem>
          )}

          {onEdit && (
            <DropdownMenuItem className={itemClass} onSelect={onEdit}>
              <Pencil className="h-4 w-4 text-slate-500" />
              Edit
            </DropdownMenuItem>
          )}

          {hasExport && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className={itemClass}>
                  <FileText className="h-4 w-4" />
                  Export
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-xl p-1.5">
                  {onExportPDF && (
                    <DropdownMenuItem className={itemClass} onSelect={onExportPDF}>
                      <FileText className="h-4 w-4" />
                      Export as PDF
                    </DropdownMenuItem>
                  )}
                  {onExportExcel && (
                    <DropdownMenuItem className={itemClass} onSelect={onExportExcel}>
                      <FileSpreadsheet className="h-4 w-4" />
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
              <DropdownMenuItem className={dangerItemClass} onSelect={onDelete}>
                <Trash2 className="h-4 w-4 text-red-500" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
