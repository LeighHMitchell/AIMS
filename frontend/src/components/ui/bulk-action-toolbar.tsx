import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";

interface BulkActionToolbarProps {
  selectedCount: number;
  itemType: "activities" | "transactions";
  onDelete: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  itemType,
  onDelete,
  onCancel,
  isDeleting = false,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div 
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
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
        <span className="text-sm font-medium text-gray-700">
          {selectedCount} {itemType === "activities" ? (selectedCount === 1 ? "activity" : "activities") : (selectedCount === 1 ? "transaction" : "transactions")} selected
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Selected"}
          </Button>
        </div>
      </div>
    </div>
  );
}

