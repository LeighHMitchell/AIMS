"use client";

import { Menu } from 'bloom-menu';
import {
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';

interface BudgetActionMenuProps {
  budgetId: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

const itemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors";
const dangerItemClass = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors";

export function BudgetActionMenu({
  budgetId,
  onEdit,
  onDelete,
}: BudgetActionMenuProps) {
  // Don't render if no actions are available
  if (!onEdit && !onDelete) {
    return null;
  }

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
          {onEdit && (
            <Menu.Item className={itemClass} onSelect={onEdit}>
              <Pencil className="h-4 w-4 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
              Edit
            </Menu.Item>
          )}

          {onEdit && onDelete && (
            <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />
          )}

          {onDelete && (
            <Menu.Item className={dangerItemClass} onSelect={onDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
              Delete
            </Menu.Item>
          )}
        </Menu.Content>
      </Menu.Container>
    </Menu.Root>
  );
}
