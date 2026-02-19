"use client";

import { Menu } from 'bloom-menu';
import {
  MoreVertical,
  Bookmark,
  BookmarkCheck,
  Pencil,
  FileText,
  FileCode,
  FileSpreadsheet,
  Trash2,
  ChevronRight
} from 'lucide-react';

interface ActivityActionMenuProps {
  activityId: string;
  isBookmarked: boolean;
  canEdit: boolean;
  onToggleBookmark: () => void;
  onEdit: () => void;
  onExportXML: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onDelete: () => void;
}

const itemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors";
const dangerItemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors";

export function ActivityActionMenu({
  activityId,
  isBookmarked,
  canEdit,
  onToggleBookmark,
  onEdit,
  onExportXML,
  onExportPDF,
  onExportExcel,
  onDelete,
}: ActivityActionMenuProps) {
  return (
    <Menu.Root direction="bottom" anchor="end">
        <Menu.Container
          buttonSize={32}
          menuWidth={200}
          menuRadius={12}
          className="bg-white dark:bg-neutral-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10 relative z-[9999]"
        >
        <Menu.Trigger>
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
            <MoreVertical className="h-4 w-4" />
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

          {canEdit && (
            <Menu.Item className={itemClass} onSelect={onEdit}>
              <Pencil className="h-4 w-4 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
              Edit
            </Menu.Item>
          )}

          <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />

          <Menu.SubMenu id="export-submenu">
            <Menu.SubMenuTrigger>
              {(isActive) => (
                <div className={`${itemClass} justify-between ${isActive ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}>
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Export
                  </span>
                  <ChevronRight className="h-4 w-4 text-neutral-400" />
                </div>
              )}
            </Menu.SubMenuTrigger>
            <Menu.SubMenuContent className="bg-white dark:bg-neutral-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10 rounded-xl p-1.5">
              <Menu.Item className={itemClass} onSelect={onExportXML}>
                <FileCode className="h-4 w-4" />
                Export to XML
              </Menu.Item>
              <Menu.Item className={itemClass} onSelect={onExportPDF}>
                <FileText className="h-4 w-4" />
                Export as PDF
              </Menu.Item>
              <Menu.Item className={itemClass} onSelect={onExportExcel}>
                <FileSpreadsheet className="h-4 w-4" />
                Export as Excel
              </Menu.Item>
            </Menu.SubMenuContent>
          </Menu.SubMenu>

          <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />

          <Menu.Item className={dangerItemClass} onSelect={onDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
            Delete
          </Menu.Item>
        </Menu.Content>
        </Menu.Container>
      </Menu.Root>
  );
}
