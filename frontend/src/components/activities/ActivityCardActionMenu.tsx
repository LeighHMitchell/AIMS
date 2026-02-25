"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Bookmark,
  BookmarkCheck,
  Download,
  Pencil,
  Trash2,
} from 'lucide-react';

interface ActivityCardActionMenuProps {
  activityId: string;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onExportJPG?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const itemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 cursor-pointer";
const dangerItemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20 cursor-pointer";

export function ActivityCardActionMenu({
  activityId,
  isBookmarked,
  onToggleBookmark,
  onExportJPG,
  onEdit,
  onDelete,
}: ActivityCardActionMenuProps) {
  return (
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
        <DropdownMenuItem className={itemClass} onSelect={onToggleBookmark}>
          {isBookmarked ? (
            <>
              <BookmarkCheck className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              Remove Bookmark
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" />
              Add Bookmark
            </>
          )}
        </DropdownMenuItem>

        {onExportJPG && (
          <DropdownMenuItem className={itemClass} onSelect={onExportJPG}>
            <Download className="h-4 w-4" />
            Export as JPG
          </DropdownMenuItem>
        )}

        {onEdit && (
          <DropdownMenuItem className={itemClass} onSelect={onEdit}>
            <Pencil className="h-4 w-4 text-slate-500" />
            Edit
          </DropdownMenuItem>
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
  );
}
