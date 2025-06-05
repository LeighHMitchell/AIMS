"use client"

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, ArrowRight } from 'lucide-react';
import { SystemField, FileColumn } from '@/types/import';
import { cn } from '@/lib/utils';

interface SystemFieldItemProps {
  field: SystemField;
  mappedColumn: FileColumn | null;
  onRemoveMapping: (fieldId: string) => void;
  isDropTarget?: boolean;
}

export function SystemFieldItem({
  field,
  mappedColumn,
  onRemoveMapping,
  isDropTarget = false,
}: SystemFieldItemProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: field.id,
    disabled: !isDropTarget,
  });

  const isMapped = mappedColumn !== null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative transition-all",
        isOver && "scale-105"
      )}
    >
      <Card
        className={cn(
          "p-3 transition-all",
          isMapped ? "bg-green-50 border-green-300" : field.required ? "border-red-200" : "border-gray-200",
          isOver && "ring-2 ring-primary shadow-lg"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Field Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{field.name}</span>
              {field.required && (
                <Badge variant="destructive" className="text-xs h-5">
                  Required
                </Badge>
              )}
              {field.type !== 'string' && (
                <Badge variant="outline" className="text-xs h-5">
                  {field.type}
                </Badge>
              )}
            </div>
          </div>

          {/* Mapped Column or Drop Zone */}
          <div className="flex items-center gap-2">
            {isMapped ? (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2 bg-white rounded-md px-3 py-1 border">
                  <span className="text-sm font-medium">{mappedColumn.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => onRemoveMapping(field.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground px-3 py-1">
                {isDropTarget ? "Drop column here" : "Not mapped"}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}