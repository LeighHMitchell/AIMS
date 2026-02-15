"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableTableHeaderProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function SortableTableHeader({
  id,
  children,
  className,
  disabled = false,
  onClick,
}: SortableTableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? "relative" : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        "h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground sortable-th",
        className
      )}
      onClick={onClick}
      {...attributes}
    >
      <div className="flex items-center gap-1">
        {!disabled && (
          <span
            {...listeners}
            className="grip-handle opacity-0 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 -ml-1 mr-0.5"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              // Prevent sort handler from firing during drag
              e.stopPropagation();
              listeners?.onPointerDown?.(e);
            }}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
          </span>
        )}
        <span className="flex-1 min-w-0">{children}</span>
      </div>
    </th>
  );
}
