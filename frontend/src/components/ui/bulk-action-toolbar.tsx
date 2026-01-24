import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X, CheckCircle, UserX, Download } from "lucide-react";

// Action interface for custom actions
interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
}

interface BulkActionToolbarProps {
  selectedCount: number;
  itemType?: "activities" | "transactions" | "documents";
  onDelete?: () => void;
  onCancel?: () => void;
  onClearSelection?: () => void;
  isDeleting?: boolean;
  // Linked transaction actions
  linkedTransactionCount?: number;
  onAcceptLinked?: () => void;
  onRejectLinked?: () => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
  // Custom actions (alternative to built-in actions)
  actions?: BulkAction[];
  // For documents - count of deletable items
  deletableCount?: number;
}

function getItemLabel(itemType: string, count: number): string {
  switch (itemType) {
    case 'activities':
      return count === 1 ? 'activity' : 'activities';
    case 'transactions':
      return count === 1 ? 'transaction' : 'transactions';
    case 'documents':
      return count === 1 ? 'document' : 'documents';
    default:
      return count === 1 ? 'item' : 'items';
  }
}

export function BulkActionToolbar({
  selectedCount,
  itemType = "activities",
  onDelete,
  onCancel,
  onClearSelection,
  isDeleting = false,
  linkedTransactionCount = 0,
  onAcceptLinked,
  onRejectLinked,
  isAccepting = false,
  isRejecting = false,
  actions,
  deletableCount,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  const hasLinkedTransactions = linkedTransactionCount > 0;
  const isProcessing = isDeleting || isAccepting || isRejecting;
  const handleCancel = onClearSelection || onCancel;
  const actualDeletableCount = deletableCount ?? (selectedCount - linkedTransactionCount);

  return (
    <div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[70]"
      style={{
        animation: 'slideUpFromBottom 0.3s ease-out'
      }}
    >
      <style jsx>{`
        @keyframes slideUpFromBottom {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
      <div className="bg-white shadow-lg rounded-lg border border-gray-200 px-6 py-3 flex items-center gap-4">
        <div className="text-sm font-medium text-gray-700">
          <div>
            {selectedCount} {getItemLabel(itemType, selectedCount)} selected
          </div>
          {hasLinkedTransactions && (
            <div className="text-xs text-gray-500 mt-1">
              {linkedTransactionCount} linked transaction{linkedTransactionCount === 1 ? '' : 's'}
            </div>
          )}
          {itemType === 'documents' && deletableCount !== undefined && deletableCount < selectedCount && (
            <div className="text-xs text-gray-500 mt-1">
              {deletableCount} can be deleted (standalone only)
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {handleCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          
          {/* Custom actions (e.g., Download) */}
          {actions && actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'default'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled || isProcessing}
              className="flex items-center gap-2"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
          
          {/* Accept/Reject actions for linked transactions (only when no custom actions) */}
          {!actions && hasLinkedTransactions && onAcceptLinked && (
            <Button
              variant="default"
              size="sm"
              onClick={onAcceptLinked}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              {isAccepting ? "Accepting..." : `Accept ${linkedTransactionCount}`}
            </Button>
          )}
          
          {!actions && hasLinkedTransactions && onRejectLinked && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRejectLinked}
              disabled={isProcessing}
              className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <UserX className="h-4 w-4" />
              {isRejecting ? "Rejecting..." : `Reject ${linkedTransactionCount}`}
            </Button>
          )}
          
          {/* Delete action - always show when onDelete is provided and there are deletable items */}
          {onDelete && actualDeletableCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : `Delete ${actualDeletableCount}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

