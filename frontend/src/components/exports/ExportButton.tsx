"use client";

/**
 * ExportButton — single primitive used everywhere a list view offers a
 * filtered/all + format choice. Wraps shadcn DropdownMenu.
 *
 *   <ExportButton
 *     entity="Activities"
 *     filteredCount={42}
 *     totalCount={1280}
 *     formats={[
 *       { label: 'CSV (flat)',   onFiltered: () => exportListCsv(filtered),   onAll: () => exportListCsv(all) },
 *       { label: 'Excel (full)', onFiltered: () => exportListXlsx(filtered),  onAll: () => exportListXlsx(all) },
 *     ]}
 *   />
 *
 * If only one format is supplied, the dropdown still appears with two items
 * (Filtered / All). If `filteredCount === totalCount` (or no filtered count
 * is given) the "Filtered" item is hidden.
 */

import * as React from 'react';
import { Download, ChevronDown, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ExportFormatOption {
  /** Display label (e.g. 'CSV (flat)', 'Excel (full)'). */
  label: string;
  /** Optional sub-label / hint shown under the label. */
  description?: string;
  /** Handler when the user picks this format on the filtered subset. */
  onFiltered?: () => void | Promise<void>;
  /** Handler when the user picks this format on the full accessible set. */
  onAll: () => void | Promise<void>;
  /** Optional disabled flag (e.g. while loading). */
  disabled?: boolean;
}

export interface ExportButtonProps {
  /** Entity name used in tooltips / labels (e.g. "Activities"). */
  entity?: string;
  /** Number of rows currently visible after filters/search. */
  filteredCount?: number;
  /** Number of rows the user could see if no filters were applied. */
  totalCount?: number;
  /** One or more output format options. */
  formats: ReadonlyArray<ExportFormatOption>;
  /** Visual variant. Defaults to 'outline'. */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Size. Defaults to 'sm'. */
  size?: 'default' | 'sm' | 'lg';
  /** Optional class on the trigger button. */
  className?: string;
  /** Override the trigger label (default: "Export"). */
  triggerLabel?: string;
  /** If true, the trigger renders icon-only. */
  iconOnly?: boolean;
}

export function ExportButton({
  entity,
  filteredCount,
  totalCount,
  formats,
  variant = 'outline',
  size = 'sm',
  className,
  triggerLabel = 'Export',
  iconOnly = false,
}: ExportButtonProps) {
  const [busy, setBusy] = React.useState(false);

  const showFiltered =
    filteredCount !== undefined &&
    totalCount !== undefined &&
    filteredCount !== totalCount;

  const fmt = (n?: number) =>
    typeof n === 'number' ? n.toLocaleString() : '';

  const run = async (handler?: () => void | Promise<void>) => {
    if (!handler) return;
    try {
      setBusy(true);
      await handler();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('gap-2', className)}
          disabled={busy || formats.length === 0}
          aria-label={iconOnly ? `Export ${entity ?? ''}`.trim() : undefined}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {!iconOnly && (
            <>
              <span>{triggerLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {formats.map((format, idx) => {
          const filteredHandler = format.onFiltered;
          const allHandler = format.onAll;
          return (
            <React.Fragment key={`${format.label}-${idx}`}>
              {idx > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                {format.label}
                {format.description && (
                  <span className="ml-1 font-normal opacity-70">
                    — {format.description}
                  </span>
                )}
              </DropdownMenuLabel>
              {showFiltered && filteredHandler && (
                <DropdownMenuItem
                  disabled={busy || format.disabled}
                  onSelect={(e) => {
                    e.preventDefault();
                    void run(filteredHandler);
                  }}
                  className="cursor-pointer"
                >
                  <span className="flex flex-col">
                    <span>Export filtered</span>
                    <span className="text-xs text-muted-foreground">
                      {fmt(filteredCount)} of {fmt(totalCount)} {entity ?? 'rows'}
                    </span>
                  </span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                disabled={busy || format.disabled}
                onSelect={(e) => {
                  e.preventDefault();
                  void run(allHandler);
                }}
                className="cursor-pointer"
              >
                <span className="flex flex-col">
                  <span>Export all</span>
                  {totalCount !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {fmt(totalCount)} {entity ?? 'rows'}
                    </span>
                  )}
                </span>
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
