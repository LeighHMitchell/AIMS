"use client";

import { Menu } from 'bloom-menu';
import {
  MoreVertical,
  PencilLine,
  Trash2,
  CheckCircle,
  UserX,
  ExternalLink,
} from 'lucide-react';

interface TransactionActionMenuProps {
  transactionId: string;
  isLinkedTransaction?: boolean;
  acceptanceStatus?: string;
  linkedFromActivityId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onViewSourceActivity?: () => void;
}

const itemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors";
const successItemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer transition-colors";
const dangerItemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors";

export function TransactionActionMenu({
  transactionId,
  isLinkedTransaction = false,
  acceptanceStatus,
  linkedFromActivityId,
  onEdit,
  onDelete,
  onAccept,
  onReject,
  onViewSourceActivity,
}: TransactionActionMenuProps) {
  const showAcceptReject = isLinkedTransaction && acceptanceStatus === 'pending' && (onAccept || onReject);
  const showEdit = !isLinkedTransaction && onEdit;
  const showDelete = !isLinkedTransaction && onDelete;
  const showViewSource = isLinkedTransaction && linkedFromActivityId && onViewSourceActivity;

  // Don't render if no actions are available
  if (!showAcceptReject && !showEdit && !showDelete && !showViewSource) {
    return null;
  }

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
          {/* Accept/Reject actions for linked transactions */}
          {showAcceptReject && (
            <>
              {onAccept && (
                <Menu.Item className={successItemClass} onSelect={onAccept}>
                  <CheckCircle className="h-4 w-4" />
                  Accept Transaction
                </Menu.Item>
              )}
              {onReject && (
                <Menu.Item className={dangerItemClass} onSelect={onReject}>
                  <UserX className="h-4 w-4" />
                  Reject Transaction
                </Menu.Item>
              )}
            </>
          )}

          {/* Standard edit action */}
          {showEdit && (
            <>
              {showAcceptReject && (
                <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />
              )}
              <Menu.Item className={itemClass} onSelect={onEdit}>
                <PencilLine className="h-4 w-4" />
                Edit
              </Menu.Item>
            </>
          )}

          {/* View source activity for linked transactions */}
          {showViewSource && (
            <Menu.Item className={itemClass} onSelect={onViewSourceActivity}>
              <ExternalLink className="h-4 w-4" />
              View Source Activity
            </Menu.Item>
          )}

          {/* Delete action */}
          {showDelete && (
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
