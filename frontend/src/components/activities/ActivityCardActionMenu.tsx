"use client";

import { Menu } from 'bloom-menu';
import {
  MoreVertical,
  Bookmark,
  BookmarkCheck,
  Download,
  PencilLine,
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

const itemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors";
const dangerItemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors";

export function ActivityCardActionMenu({
  activityId,
  isBookmarked,
  onToggleBookmark,
  onExportJPG,
  onEdit,
  onDelete,
}: ActivityCardActionMenuProps) {
  return (
    <Menu.Root direction="bottom" anchor="start">
      <Menu.Container
        buttonSize={32}
        menuWidth={200}
        menuRadius={12}
        className="bg-white dark:bg-neutral-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10 relative z-[9999]"
      >
        <Menu.Trigger>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            <MoreVertical className="h-4 w-4 text-white" />
          </div>
        </Menu.Trigger>
        <Menu.Content className="p-1.5">
          <Menu.Item className={itemClass} onSelect={onToggleBookmark}>
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
          </Menu.Item>

          {onExportJPG && (
            <Menu.Item className={itemClass} onSelect={onExportJPG}>
              <Download className="h-4 w-4" />
              Export as JPG
            </Menu.Item>
          )}

          {onEdit && (
            <Menu.Item className={itemClass} onSelect={onEdit}>
              <PencilLine className="h-4 w-4" />
              Edit
            </Menu.Item>
          )}

          {onDelete && (
            <>
              <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />
              <Menu.Item className={dangerItemClass} onSelect={onDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Menu.Item>
            </>
          )}
        </Menu.Content>
      </Menu.Container>
    </Menu.Root>
  );
}
