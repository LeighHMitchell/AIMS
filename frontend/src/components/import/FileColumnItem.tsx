"use client"

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical, FileText } from 'lucide-react';
import { FileColumn } from '@/types/import';
import { cn } from '@/lib/utils';

interface FileColumnItemProps {
  column: FileColumn;
  isMapped: boolean;
  isDraggable: boolean;
  isDragging?: boolean;
  id?: string;
}

export function FileColumnItem({
  column,
  isMapped,
  isDraggable,
  isDragging = false,
  id,
}: FileColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isActiveDrag,
  } = useDraggable({
    id: id || column.index.toString(),
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isActiveDrag ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && "z-50"
      )}
    >
      <Card
        className={cn(
          "p-3 transition-all",
          isMapped && "opacity-50 bg-muted",
          isDraggable && "cursor-move hover:shadow-md",
          isDragging && "shadow-lg ring-2 ring-primary"
        )}
        {...(isDraggable ? attributes : {})}
        {...(isDraggable ? listeners : {})}
      >
        <div className="flex items-center gap-2">
          {isDraggable && (
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{column.name}</div>
            {column.sampleValues.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Sample: {column.sampleValues.filter(v => v).slice(0, 2).join(', ')}
                {column.sampleValues.filter(v => v).length > 2 && '...'}
              </div>
            )}
          </div>
          {isMapped && (
            <Badge variant="secondary" className="text-xs">
              Mapped
            </Badge>
          )}
        </div>
      </Card>
    </div>
  );
}