"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface FinanceTableColumn {
  header: string
  accessor?: string
  className?: string
  render?: (value: any, row: any, index: number) => React.ReactNode
  sortable?: boolean
  width?: string
}

interface FinanceTableProps {
  columns: FinanceTableColumn[]
  data: any[]
  isLoading?: boolean
  emptyMessage?: string
  onSort?: (column: string) => void
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  className?: string
  rowClassName?: (row: any, index: number) => string
  onRowClick?: (row: any, index: number) => void
}

export function FinanceTable({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No data available",
  onSort,
  sortColumn,
  sortDirection,
  className,
  rowClassName,
  onRowClick
}: FinanceTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <Table className={cn("w-full", className)}>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead 
                  key={index} 
                  className={cn(
                    "px-4 py-2 text-left text-sm font-medium text-muted-foreground",
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, rowIndex) => (
              <TableRow 
                key={rowIndex} 
                className={cn(
                  "hover:bg-muted/10 transition-colors",
                  rowIndex % 2 === 1 && "bg-muted/5"
                )}
              >
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex} className="px-4 py-3">
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="overflow-x-auto">
        <Table className={cn("w-full", className)}>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead 
                  key={index} 
                  className={cn(
                    "px-4 py-2 text-left text-sm font-medium text-muted-foreground",
                    column.sortable && "cursor-pointer hover:bg-muted/20",
                    column.className
                  )}
                  onClick={() => column.sortable && onSort?.(column.accessor || column.header)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.header}</span>
                    {column.sortable && sortColumn === (column.accessor || column.header) && (
                      <span className="text-xs">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="px-4 py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table className={cn("w-full", className)}>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead 
                key={index} 
                className={cn(
                  "px-4 py-2 text-left text-sm font-medium text-muted-foreground",
                  column.sortable && "cursor-pointer hover:bg-muted/20",
                  column.className
                )}
                onClick={() => column.sortable && onSort?.(column.accessor || column.header)}
                style={{ width: column.width }}
              >
                <div className="flex items-center gap-1">
                  <span>{column.header}</span>
                  {column.sortable && sortColumn === (column.accessor || column.header) && (
                    <span className="text-xs">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow 
              key={index} 
              className={cn(
                "hover:bg-muted/10 transition-colors",
                index % 2 === 1 && "bg-muted/5",
                onRowClick && "cursor-pointer",
                rowClassName?.(row, index)
              )}
              onClick={() => onRowClick?.(row, index)}
            >
              {columns.map((column, colIndex) => (
                <TableCell 
                  key={colIndex} 
                  className={cn(
                    "px-4 py-3 text-sm font-normal text-foreground",
                    column.className
                  )}
                >
                  {column.render 
                    ? column.render(column.accessor ? row[column.accessor] : row, row, index)
                    : column.accessor 
                      ? row[column.accessor] 
                      : ''
                  }
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}