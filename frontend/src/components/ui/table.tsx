import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown } from "lucide-react"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-x-auto overflow-y-visible">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-body border border-border", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

/**
 * Standard wrapper for bordered tables — gives the table a single, consistent
 * square-cornered border that clips the header background cleanly. Use this
 * around <Table> instead of hand-rolled `<div className="border">` wrappers.
 * Tables use square corners app-wide (no rounded-lg).
 */
const TableContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("border overflow-hidden w-full", className)}
    {...props}
  />
))
TableContainer.displayName = "TableContainer"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-surface-muted border-b border-border [&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-surface-muted font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted [&:hover>td]:bg-muted/50",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-top [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-body text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

// Shows a single chevron only when the column is the active sort field.
// Returns null when the column is not actively sorted (no double-chevron default).
function getSortIcon(
  field: string,
  sortField: string,
  sortOrder: 'asc' | 'desc'
): React.ReactElement | null {
  if (sortField !== field) return null;
  return sortOrder === 'asc'
    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
    : <ChevronDown className="h-4 w-4 text-muted-foreground" />;
}

/**
 * Standard class names for sortable table headers
 */
const sortableHeaderClasses = "cursor-pointer hover:bg-muted/80 transition-colors";

export {
  Table,
  TableContainer,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  getSortIcon,
  sortableHeaderClasses,
}