"use client";

import {
  MoreVertical,
  PencilLine,
  Trash2,
  CheckCircle,
  UserX,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Accept/Reject actions for linked transactions */}
        {showAcceptReject && (
          <>
            {onAccept && (
              <DropdownMenuItem onClick={onAccept} className="text-green-600 focus:text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Transaction
              </DropdownMenuItem>
            )}
            {onReject && (
              <DropdownMenuItem onClick={onReject} className="text-red-600 focus:text-red-600">
                <UserX className="h-4 w-4 mr-2" />
                Reject Transaction
              </DropdownMenuItem>
            )}
          </>
        )}

        {/* Standard edit action */}
        {showEdit && (
          <>
            {showAcceptReject && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={onEdit}>
              <PencilLine className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          </>
        )}

        {/* View source activity for linked transactions */}
        {showViewSource && (
          <DropdownMenuItem onClick={onViewSourceActivity}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Source Activity
          </DropdownMenuItem>
        )}

        {/* Delete action */}
        {showDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
