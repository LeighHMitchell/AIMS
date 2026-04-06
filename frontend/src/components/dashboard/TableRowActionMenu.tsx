"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

interface TableRowActionMenuProps {
  activityId: string;
  entityType: 'activity' | 'transaction' | 'budget' | 'planned-disbursement';
  entityId?: string;
  onDelete?: () => void;
}

export function TableRowActionMenu({ activityId, entityType, entityId, onDelete }: TableRowActionMenuProps) {
  const router = useRouter();

  const handleEdit = () => {
    switch (entityType) {
      case 'activity':
        router.push(`/activities/${activityId}`);
        break;
      case 'transaction':
        router.push(`/activities/${activityId}?tab=financials&editTransaction=${entityId}`);
        break;
      case 'budget':
        router.push(`/activities/${activityId}?tab=financials&editBudget=${entityId}`);
        break;
      case 'planned-disbursement':
        router.push(`/activities/${activityId}?tab=financials&editPlannedDisbursement=${entityId}`);
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={5} className="min-w-[120px]">
        <DropdownMenuItem onClick={handleEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        {onDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
