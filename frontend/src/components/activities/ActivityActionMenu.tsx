"use client";

import {
  MoreVertical,
  Bookmark,
  BookmarkCheck,
  Pencil,
  FileText,
  FileCode,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onToggleBookmark}>
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

        {canEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2 text-slate-500" />
            Edit
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FileText className="h-4 w-4 mr-2" />
            Export
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuItem onClick={onExportXML}>
              <FileCode className="h-4 w-4 mr-2" />
              Export to XML
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as Excel
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4 mr-2 text-red-500" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
