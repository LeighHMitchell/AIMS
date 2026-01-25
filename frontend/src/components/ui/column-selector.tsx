"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, Columns3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Configuration for a single column in the column selector
 */
export interface ColumnConfig<T extends string> {
  id: T;
  label: string;
  group: string;
  alwaysVisible?: boolean;
  defaultVisible?: boolean;
  /** Help text description shown in column header tooltip */
  description?: string;
}

/**
 * Props for the ColumnSelector component
 */
export interface ColumnSelectorProps<T extends string> {
  columns: ColumnConfig<T>[];
  visibleColumns: T[];
  defaultVisibleColumns: T[];
  onChange: (columns: T[]) => void;
  /** Optional mapping of group keys to display labels */
  groupLabels?: Record<string, string>;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

/**
 * A generic, reusable column selector component for table views.
 * Supports grouping, search, and reset functionality.
 */
export function ColumnSelector<T extends string>({
  columns,
  visibleColumns,
  defaultVisibleColumns,
  onChange,
  groupLabels,
  open: controlledOpen,
  onOpenChange,
}: ColumnSelectorProps<T>) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    }
    if (controlledOpen === undefined) {
      setInternalOpen(value);
    }
  };

  // Get unique groups in stable order (based on first appearance)
  const orderedGroups = useMemo(() => {
    const seen = new Set<string>();
    const groups: string[] = [];
    for (const col of columns) {
      if (!seen.has(col.group)) {
        seen.add(col.group);
        groups.push(col.group);
      }
    }
    return groups;
  }, [columns]);

  // Get display label for a group
  const getGroupLabel = (group: string): string => {
    if (groupLabels && groupLabels[group]) {
      return groupLabels[group];
    }
    // Default: capitalize first letter
    return group.charAt(0).toUpperCase() + group.slice(1);
  };

  const toggleColumn = (columnId: T) => {
    const column = columns.find((c) => c.id === columnId);
    if (column?.alwaysVisible) return; // Cannot toggle always-visible columns

    if (visibleColumns.includes(columnId)) {
      onChange(visibleColumns.filter((id) => id !== columnId));
    } else {
      onChange([...visibleColumns, columnId]);
    }
  };

  const toggleGroup = (group: string) => {
    const groupColumns = columns.filter((c) => c.group === group && !c.alwaysVisible);
    const allVisible = groupColumns.every((c) => visibleColumns.includes(c.id));

    if (allVisible) {
      // Remove all non-alwaysVisible columns in this group
      onChange(visibleColumns.filter((id) => !groupColumns.find((c) => c.id === id)));
    } else {
      // Add all columns in this group
      const newColumns = [...visibleColumns];
      groupColumns.forEach((c) => {
        if (!newColumns.includes(c.id)) {
          newColumns.push(c.id);
        }
      });
      onChange(newColumns);
    }
  };

  const resetToDefaults = () => {
    onChange(defaultVisibleColumns);
  };

  const selectAll = () => {
    const allColumnIds = columns.map((c) => c.id);
    onChange(allColumnIds);
  };

  const visibleCount = visibleColumns.length;
  const totalColumns = columns.length;

  // Filter columns based on search query
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return null; // null means show grouped view
    const query = searchQuery.toLowerCase();
    return columns.filter((c) => c.label.toLowerCase().includes(query));
  }, [columns, searchQuery]);

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchQuery(""); // Clear search when closing
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="h-4 w-4" />
          <span className="hidden sm:inline">Columns</span>
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
            {visibleCount}
          </Badge>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[100]" align="end" sideOffset={5}>
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Visible Columns</h4>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="h-7 text-xs"
              >
                Select all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefaults}
                className="h-7 text-xs"
              >
                Reset
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {visibleCount} of {totalColumns} columns visible
          </p>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {filteredColumns ? (
            // Show flat filtered list when searching
            filteredColumns.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No columns match "{searchQuery}"
              </div>
            ) : (
              <div className="py-1">
                {filteredColumns.map((column) => (
                  <div
                    key={column.id}
                    className={`flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 ${
                      column.alwaysVisible ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                    onClick={() => !column.alwaysVisible && toggleColumn(column.id)}
                  >
                    <Checkbox
                      checked={visibleColumns.includes(column.id)}
                      onCheckedChange={() => toggleColumn(column.id)}
                      disabled={column.alwaysVisible}
                    />
                    <span className="text-sm">{column.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {getGroupLabel(column.group)}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Show grouped view when not searching
            orderedGroups.map((groupKey) => {
              const groupColumns = columns.filter((c) => c.group === groupKey);
              if (groupColumns.length === 0) return null;

              const toggleableColumns = groupColumns.filter((c) => !c.alwaysVisible);
              const allVisible = toggleableColumns.length > 0 &&
                toggleableColumns.every((c) => visibleColumns.includes(c.id));
              const someVisible = toggleableColumns.some((c) => visibleColumns.includes(c.id));
              const hasToggleable = toggleableColumns.length > 0;

              return (
                <div key={groupKey} className="border-b last:border-b-0">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 bg-muted/50 ${
                      hasToggleable ? "cursor-pointer hover:bg-muted/80" : ""
                    }`}
                    onClick={() => hasToggleable && toggleGroup(groupKey)}
                  >
                    <Checkbox
                      checked={allVisible}
                      indeterminate={someVisible && !allVisible}
                      onCheckedChange={() => toggleGroup(groupKey)}
                      disabled={!hasToggleable}
                    />
                    <span className="text-sm font-medium">{getGroupLabel(groupKey)}</span>
                  </div>
                  <div className="py-1">
                    {groupColumns.map((column) => (
                      <div
                        key={column.id}
                        className={`flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 ${
                          column.alwaysVisible ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                        onClick={() => !column.alwaysVisible && toggleColumn(column.id)}
                      >
                        <Checkbox
                          checked={visibleColumns.includes(column.id)}
                          onCheckedChange={() => toggleColumn(column.id)}
                          disabled={column.alwaysVisible}
                        />
                        <span className="text-sm">{column.label}</span>
                        {column.alwaysVisible && (
                          <span className="text-xs text-muted-foreground ml-auto">Required</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
