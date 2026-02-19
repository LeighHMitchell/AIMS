"use client";

import { Menu } from 'bloom-menu';
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

const itemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors";
const successItemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer transition-colors";
const dangerItemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors";

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
    <Menu.Root direction="bottom" anchor="end">
      <Menu.Container
        buttonSize={32}
        menuWidth={180}
        menuRadius={12}
        className="bg-white dark:bg-neutral-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10 relative z-[9999]"
      >
        <Menu.Trigger>
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
            <MoreVertical className="h-4 w-4" />
          </div>
        </Menu.Trigger>
        <Menu.Content className="p-1.5">
          {/* View Details */}
          {onViewDetails && (
            <Menu.Item className={itemClass} onSelect={onViewDetails}>
              <ExternalLink className="h-4 w-4" />
              View Details
            </Menu.Item>
          )}

          {/* Status Actions */}
          {canChangeStatus && onStatusChange && (
            <>
              {(onViewDetails) && (
                <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />
              )}

              {assignment.status === 'pending' && (
                <Menu.Item className={itemClass} onSelect={() => onStatusChange('in_progress')}>
                  <Play className="h-4 w-4" />
                  Start Task
                </Menu.Item>
              )}

              <Menu.Item className={successItemClass} onSelect={() => onStatusChange('completed')}>
                <Check className="h-4 w-4" />
                Mark Complete
              </Menu.Item>

              <Menu.Item className={dangerItemClass} onSelect={() => onStatusChange('declined')}>
                <X className="h-4 w-4" />
                Decline
              </Menu.Item>
            </>
          )}

          {/* Reassign & Share */}
          {(onReassign || onShare) && (
            <>
              <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />

              {onReassign && (
                <Menu.Item className={itemClass} onSelect={onReassign}>
                  <ArrowRightLeft className="h-4 w-4" />
                  Reassign
                </Menu.Item>
              )}

              {onShare && (
                <Menu.Item className={itemClass} onSelect={onShare}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Menu.Item>
              )}
            </>
          )}

          {/* Archive Actions */}
          {canArchive && (onArchive || onUnarchive) && (
            <>
              <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />

              {isArchived ? (
                onUnarchive && (
                  <Menu.Item className={itemClass} onSelect={onUnarchive}>
                    <ArchiveRestore className="h-4 w-4" />
                    Unarchive
                  </Menu.Item>
                )
              ) : (
                onArchive && (
                  <Menu.Item className={itemClass} onSelect={onArchive}>
                    <Archive className="h-4 w-4" />
                    Archive
                  </Menu.Item>
                )
              )}
            </>
          )}

          {/* Delete Task (Creator only) */}
          {canDelete && (
            <>
              <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />
              <Menu.Item className={dangerItemClass} onSelect={onDelete}>
                <Trash2 className="h-4 w-4 text-red-500" />
                Delete Task
              </Menu.Item>
            </>
          )}
        </Menu.Content>
      </Menu.Container>
    </Menu.Root>
  );
}
