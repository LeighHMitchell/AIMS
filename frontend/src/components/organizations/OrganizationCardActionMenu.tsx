"use client";

import { Menu } from 'bloom-menu';
import {
  MoreVertical,
  Eye,
  PencilLine,
  FileText,
  FileSpreadsheet,
  Trash2,
  ChevronRight,
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

const itemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors";
const dangerItemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors";

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
          {onToggleBookmark && (
            <Menu.Item className={itemClass} onSelect={onToggleBookmark}>
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
            </Menu.Item>
          )}

          {onView && (
            <Menu.Item className={itemClass} onSelect={onView}>
              <Eye className="h-4 w-4" />
              View
            </Menu.Item>
          )}

          {onEdit && (
            <Menu.Item className={itemClass} onSelect={onEdit}>
              <PencilLine className="h-4 w-4" />
              Edit
            </Menu.Item>
          )}

          {hasExport && (
            <>
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
                  {onExportPDF && (
                    <Menu.Item className={itemClass} onSelect={onExportPDF}>
                      <FileText className="h-4 w-4" />
                      Export as PDF
                    </Menu.Item>
                  )}
                  {onExportExcel && (
                    <Menu.Item className={itemClass} onSelect={onExportExcel}>
                      <FileSpreadsheet className="h-4 w-4" />
                      Export as Excel
                    </Menu.Item>
                  )}
                </Menu.SubMenuContent>
              </Menu.SubMenu>
            </>
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
    </div>
  );
}
