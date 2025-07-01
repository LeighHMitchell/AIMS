"use client"

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, GripVertical } from 'lucide-react';
import { SystemField, FileColumn } from '@/types/import';
import { cn } from '@/lib/utils';

interface SystemFieldItemProps {
  field: SystemField;
  mappedColumn: FileColumn | null;
  onRemoveMapping: (fieldId: string) => void;
  isDropTarget?: boolean;
  isDraggable?: boolean;
}

export function SystemFieldItem({
  field,
  mappedColumn,
  onRemoveMapping,
  isDropTarget = false,
  isDraggable = false,
}: SystemFieldItemProps) {
  const droppable = useDroppable({
    id: field.id,
    disabled: !isDropTarget,
  });

  const sortable = useSortable({
    id: `field-${field.id}`,
    disabled: !isDraggable,
  });

  const style = isDraggable ? {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  } : {};

  const isMapped = mappedColumn !== null;

  return (
    <div
      ref={isDraggable ? sortable.setNodeRef : droppable.setNodeRef}
      style={style}
      className={cn(
        "relative transition-all",
        droppable.isOver && "scale-105",
        sortable.isDragging && "opacity-50"
      )}
      {...(isDraggable ? sortable.attributes : {})}
      {...(isDraggable ? sortable.listeners : {})}
    >
      <Card
        className={cn(
          "p-3 transition-all",
          isMapped ? "bg-green-50 border-green-300" : field.required ? "border-red-200" : "border-gray-200",
          droppable.isOver && "ring-2 ring-primary shadow-lg"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          {isDraggable && (
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
          )}
          
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