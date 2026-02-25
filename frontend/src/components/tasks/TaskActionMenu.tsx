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
  Play,
  Check,
  X,
  Share2,
  ArrowRightLeft,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import type { TaskAssignment, TaskStatus } from '@/types/task';

interface TaskActionMenuProps {
  assignment: TaskAssignment;
  onStatusChange?: (status: TaskStatus) => void;
  onReassign?: () => void;
  onShare?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onViewDetails?: () => void;
  onDelete?: () => void;
  isCreatorView?: boolean;
}

const itemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 cursor-pointer";
const successItemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-green-600 dark:text-green-400 hover:!bg-green-50 dark:hover:!bg-green-900/20 cursor-pointer";
const dangerItemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20 cursor-pointer";

export function TaskActionMenu({
  assignment,
  onStatusChange,
  onReassign,
  onShare,
  onArchive,
  onUnarchive,
  onViewDetails,
  onDelete,
  isCreatorView = false,
}: TaskActionMenuProps) {
  const canChangeStatus = !isCreatorView && ['pending', 'in_progress'].includes(assignment.status);
  const canArchive = !isCreatorView && ['completed', 'declined'].includes(assignment.status);
  const isArchived = assignment.archived;
  const canDelete = isCreatorView && onDelete;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px] rounded-xl p-1.5">
        {/* View Details */}
        {onViewDetails && (
          <DropdownMenuItem className={itemClass} onSelect={onViewDetails}>
            <ExternalLink className="h-4 w-4" />
            View Details
          </DropdownMenuItem>
        )}

        {/* Status Actions */}
        {canChangeStatus && onStatusChange && (
          <>
            {(onViewDetails) && (
              <DropdownMenuSeparator />
            )}

            {assignment.status === 'pending' && (
              <DropdownMenuItem className={itemClass} onSelect={() => onStatusChange('in_progress')}>
                <Play className="h-4 w-4" />
                Start Task
              </DropdownMenuItem>
            )}

            <DropdownMenuItem className={successItemClass} onSelect={() => onStatusChange('completed')}>
              <Check className="h-4 w-4" />
              Mark Complete
            </DropdownMenuItem>

            <DropdownMenuItem className={dangerItemClass} onSelect={() => onStatusChange('declined')}>
              <X className="h-4 w-4" />
              Decline
            </DropdownMenuItem>
          </>
        )}

        {/* Reassign & Share */}
        {(onReassign || onShare) && (
          <>
            <DropdownMenuSeparator />

            {onReassign && (
              <DropdownMenuItem className={itemClass} onSelect={onReassign}>
                <ArrowRightLeft className="h-4 w-4" />
                Reassign
              </DropdownMenuItem>
            )}

            {onShare && (
              <DropdownMenuItem className={itemClass} onSelect={onShare}>
                <Share2 className="h-4 w-4" />
                Share
              </DropdownMenuItem>
            )}
          </>
        )}

        {/* Archive Actions */}
        {canArchive && (onArchive || onUnarchive) && (
          <>
            <DropdownMenuSeparator />

            {isArchived ? (
              onUnarchive && (
                <DropdownMenuItem className={itemClass} onSelect={onUnarchive}>
                  <ArchiveRestore className="h-4 w-4" />
                  Unarchive
                </DropdownMenuItem>
              )
            ) : (
              onArchive && (
                <DropdownMenuItem className={itemClass} onSelect={onArchive}>
                  <Archive className="h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )
            )}
          </>
        )}

        {/* Delete Task (Creator only) */}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className={dangerItemClass} onSelect={onDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
              Delete Task
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
