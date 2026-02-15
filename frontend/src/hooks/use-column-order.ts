"use client";

import { useState, useCallback, useMemo } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { ColumnConfig } from "@/components/ui/column-selector";

interface UseColumnOrderOptions<T extends string> {
  /** localStorage key for persisting column order */
  storageKey: string;
  /** Full column config array (defines default order) */
  columns: ColumnConfig<T>[];
}

interface UseColumnOrderReturn<T extends string> {
  /** Returns visible columns in user-chosen order */
  getOrderedVisibleColumns: (visibleColumns: T[]) => T[];
  /** Handle reorder from drag-and-drop */
  handleReorder: (activeId: string, overId: string) => void;
  /** Reset to default config order */
  resetOrder: () => void;
  /** Current column order (all columns) */
  columnOrder: T[];
}

function loadOrder<T extends string>(storageKey: string, columns: ColumnConfig<T>[]): T[] {
  if (typeof window === "undefined") return columns.map((c) => c.id);
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as T[];
      const configIds = new Set(columns.map((c) => c.id));
      // Filter out removed columns
      const filtered = parsed.filter((id) => configIds.has(id));
      // Append any new columns not in stored order
      const storedSet = new Set(filtered);
      const newCols = columns.map((c) => c.id).filter((id) => !storedSet.has(id));
      return [...filtered, ...newCols];
    }
  } catch {
    // Ignore parse errors
  }
  return columns.map((c) => c.id);
}

export function useColumnOrder<T extends string>({
  storageKey,
  columns,
}: UseColumnOrderOptions<T>): UseColumnOrderReturn<T> {
  const defaultOrder = useMemo(() => columns.map((c) => c.id), [columns]);

  const [columnOrder, setColumnOrder] = useState<T[]>(() =>
    loadOrder(storageKey, columns)
  );

  const getOrderedVisibleColumns = useCallback(
    (visibleColumns: T[]): T[] => {
      const visibleSet = new Set(visibleColumns);
      return columnOrder.filter((id) => visibleSet.has(id));
    },
    [columnOrder]
  );

  const handleReorder = useCallback(
    (activeId: string, overId: string) => {
      setColumnOrder((prev) => {
        const oldIndex = prev.indexOf(activeId as T);
        const newIndex = prev.indexOf(overId as T);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const next = arrayMove(prev, oldIndex, newIndex);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore storage errors
        }
        return next;
      });
    },
    [storageKey]
  );

  const resetOrder = useCallback(() => {
    setColumnOrder(defaultOrder);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors
    }
  }, [defaultOrder, storageKey]);

  return { getOrderedVisibleColumns, handleReorder, resetOrder, columnOrder };
}
