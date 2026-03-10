"use client";

import { useState, useCallback, useMemo } from "react";
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
  /** Handle reorder (no-op, kept for API compatibility) */
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

  // No-op — drag-and-drop reordering removed
  const handleReorder = useCallback(
    (_activeId: string, _overId: string) => {},
    []
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
