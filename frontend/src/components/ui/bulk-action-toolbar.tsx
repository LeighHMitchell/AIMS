import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X, CheckCircle, UserX } from "lucide-react";

interface BulkActionToolbarProps {
  selectedCount: number;
  itemType: "activities" | "transactions";
  onDelete?: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  // Linked transaction actions
  linkedTransactionCount?: number;
  onAcceptLinked?: () => void;
  onRejectLinked?: () => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  itemType,
  onDelete,
  onCancel,
  isDeleting = false,
  linkedTransactionCount = 0,
  onAcceptLinked,
  onRejectLinked,
  isAccepting = false,
  isRejecting = false,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  const hasLinkedTransactions = linkedTransactionCount > 0;
  const isProcessing = isDeleting || isAccepting || isRejecting;

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
            {selectedCount} {itemType === "activities" ? (selectedCount === 1 ? "activity" : "activities") : (selectedCount === 1 ? "transaction" : "transactions")} selected
          </div>
          {hasLinkedTransactions && (
            <div className="text-xs text-gray-500 mt-1">
              {linkedTransactionCount} linked transaction{linkedTransactionCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isProcessing}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          
          {/* Accept/Reject actions for linked transactions */}
          {hasLinkedTransactions && onAcceptLinked && (
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
          
          {hasLinkedTransactions && onRejectLinked && (
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
          
          {/* Delete action for own transactions */}
          {onDelete && (selectedCount > linkedTransactionCount) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : `Delete ${selectedCount - linkedTransactionCount}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

