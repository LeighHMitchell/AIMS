"use client";

import React from "react";
import {
  FragmentationData,
  FragmentationCell,
  getColorForPercentage,
  getTextColorForBackground,
  FRAGMENTATION_COLOR_SCALE,
} from "@/types/national-priorities";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FragmentationHeatmapProps {
  data: FragmentationData;
  swapAxes?: boolean;
  viewMode?: 'chart' | 'table';
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  if (value < 1) return "<1%";
  return `${Math.round(value)}%`;
}

export function FragmentationHeatmap({ data, swapAxes = false, viewMode = 'chart' }: FragmentationHeatmapProps) {
  if (!data || data.donors.length === 0 || data.categories.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No fragmentation data available
      </div>
    );
  }

  // When swapAxes is true, swap donors and categories
  const rows = swapAxes ? data.categories : data.donors;
  const columns = swapAxes ? data.donors : data.categories;

  // Create a map for quick cell lookup
  const cellMap = new Map<string, FragmentationCell>();
  data.cells.forEach((cell) => {
    cellMap.set(`${cell.donorId}-${cell.categoryId}`, cell);
  });

  // Header height for wrapped text
  const headerHeight = 'auto';

  // Table view - show detailed data
  if (viewMode === 'table') {
    return (
      <TooltipProvider>
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-2 border-b border-slate-200 font-medium">
                    {swapAxes ? 'Category' : 'Donor'}
                  </th>
                  {columns.map((col: any) => (
                    <th key={col.id} className="text-right p-2 border-b border-slate-200 font-medium whitespace-nowrap">
                      {col.code ? `${col.code}` : (col.acronym || col.name.slice(0, 15))}
                    </th>
                  ))}
                  <th className="text-right p-2 border-b border-slate-200 font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => {
                  const isOthers = row.id === 'others';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className={`p-2 border-b border-slate-100 font-medium ${isOthers ? 'text-red-600' : ''}`}>
                        {isOthers ? 'OTHERS' : (row.acronym || row.code || row.name)}
                      </td>
                      {columns.map((col: any) => {
                        const cell = swapAxes 
                          ? cellMap.get(`${col.id}-${row.id}`)
                          : cellMap.get(`${row.id}-${col.id}`);
                        return (
                          <td key={col.id} className="text-right p-2 border-b border-slate-100 tabular-nums">
                            {cell && cell.value > 0 ? formatCurrency(cell.value) : '-'}
                          </td>
                        );
                      })}
                      <td className="text-right p-2 border-b border-slate-100 font-medium tabular-nums">
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-bold">
                  <td className="p-2 border-t border-slate-200">Total</td>
                  {columns.map((col: any) => (
                    <td key={col.id} className="text-right p-2 border-t border-slate-200 tabular-nums">
                      {formatCurrency(col.total)}
                    </td>
                  ))}
                  <td className="text-right p-2 border-t border-slate-200 tabular-nums">
                    {formatCurrency(data.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Helper to get column label
  const getColumnLabel = (col: any) => {
    if (swapAxes) {
      // Columns are donors
      return col.acronym || col.name.slice(0, 15);
    } else {
      // Columns are categories
      return col.code ? `${col.code} - ${col.name}` : col.name;
    }
  };

  // Helper to get row label
  const getRowLabel = (row: any) => {
    if (swapAxes) {
      // Rows are categories
      return row.code ? `${row.code} - ${row.name}` : row.name;
    } else {
      // Rows are donors
      return row.acronym || row.name.slice(0, 20);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Heatmap table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ borderSpacing: 0, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                {/* Empty corner cell - fixed width for row labels */}
                <th 
                  className="sticky left-0 bg-white z-20 border-b border-slate-200 align-bottom"
                  style={{ width: 100 }}
                />
                {/* Column headers - horizontal with text wrap, equal widths */}
                {columns.map((col: any) => (
                  <th
                    key={col.id}
                    className="border-b border-slate-200 px-1 py-3 align-bottom text-center"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-medium text-slate-600 cursor-help block leading-tight whitespace-normal">
                          {getColumnLabel(col)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="font-medium">{col.name}</p>
                        {col.code && (
                          <p className="text-xs text-muted-foreground">
                            Code: {col.code}
                          </p>
                        )}
                        {col.total !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            Total: {formatCurrency(col.total)}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </th>
                ))}
                {/* Totals header - same width as data columns */}
                <th 
                  className="border-b border-slate-200 p-1 align-bottom text-center"
                >
                  <span className="text-xs font-bold text-slate-700">
                    Totals
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => {
                const isOthers = row.id === 'others';
                // Calculate row's share of grand total for the Totals column
                const rowShareOfTotal = data.grandTotal > 0 
                  ? (row.total / data.grandTotal) * 100 
                  : 0;
                
                return (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    {/* Row name cell */}
                    <td 
                      className={`sticky left-0 bg-white z-10 px-2 py-1 text-xs font-medium border-b border-slate-100 ${
                        isOthers ? 'text-red-600' : 'text-slate-700'
                      }`}
                      style={{ width: 100 }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {isOthers ? 'OTHERS' : getRowLabel(row)}
                            {!isOthers && !swapAxes && row.name.length > 20 && !row.acronym ? "..." : ""}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{row.name}</p>
                          {row.country && (
                            <p className="text-xs text-muted-foreground">
                              {row.country}
                            </p>
                          )}
                          <p className="text-xs mt-1">
                            Total: {formatCurrency(row.total)}
                          </p>
                          <p className="text-xs">
                            Share: {formatPercent(rowShareOfTotal)} of total
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    {/* Data cells */}
                    {columns.map((col: any) => {
                      // When swapAxes, row is category and col is donor
                      const cell = swapAxes 
                        ? cellMap.get(`${col.id}-${row.id}`)
                        : cellMap.get(`${row.id}-${col.id}`);
                      // Use column-based percentage for coloring
                      const percentage = cell?.percentageOfCategory ?? 0;
                      const percentageDecimal = percentage / 100;
                      const bgColor = percentage > 0 ? getColorForPercentage(percentageDecimal) : "transparent";
                      const textColor = percentage > 0 ? getTextColorForBackground(bgColor) : "inherit";

                      return (
                        <td
                          key={col.id}
                          className="p-0.5 text-center border-b border-slate-100"
                        >
                          {cell && percentage > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="px-1 py-1 rounded-sm cursor-help text-[11px] font-medium"
                                  style={{
                                    backgroundColor: bgColor,
                                    color: textColor,
                                  }}
                                >
                                  {formatPercent(percentage)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{swapAxes ? col.name : row.name}</p>
                                <p className="text-xs">{swapAxes ? row.name : col.name}</p>
                                <div className="mt-1 text-xs space-y-0.5">
                                  <p>Value: {formatCurrency(cell.value)}</p>
                                  <p>
                                    Column share: {formatPercent(percentage)}
                                  </p>
                                  <p>
                                    Row share: {formatPercent(cell.percentage)}
                                  </p>
                                  <p>Activities: {cell.activityCount}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="px-1 py-1" />
                          )}
                        </td>
                      );
                    })}
                    {/* Totals column - row's share of grand total */}
                    <td
                      className="p-0.5 text-center border-b border-slate-100"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="px-1 py-1 rounded-sm cursor-help text-[11px] font-medium"
                            style={{
                              backgroundColor: getColorForPercentage(rowShareOfTotal / 100),
                              color: getTextColorForBackground(getColorForPercentage(rowShareOfTotal / 100)),
                            }}
                          >
                            {formatPercent(rowShareOfTotal)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs mt-1">
                            Total: {formatCurrency(row.total)}
                          </p>
                          <p className="text-xs">
                            {formatPercent(rowShareOfTotal)} of all funding
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="bg-slate-50 font-medium">
                <td 
                  className="sticky left-0 bg-slate-50 z-10 px-2 py-1 text-xs font-bold text-slate-700 border-t border-slate-200"
                  style={{ width: 100 }}
                >
                  Totals
                </td>
                {columns.map((col: any) => (
                  <td
                    key={col.id}
                    className="p-0.5 text-center border-t border-slate-200"
                  >
                    <div className="px-1 py-1 text-[11px] font-bold text-slate-700">
                      100%
                    </div>
                  </td>
                ))}
                <td
                  className="p-0.5 text-center border-t border-slate-200"
                >
                  <div className="px-1 py-1 text-[11px] font-bold text-slate-700">
                    100%
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend - horizontal bar at bottom */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs font-medium text-slate-600 mr-2">LEGENDS</span>
          <div className="flex items-center">
            {FRAGMENTATION_COLOR_SCALE.map((scale, i) => (
              <div 
                key={i} 
                className="flex items-center justify-center px-3 py-1.5 text-xs font-medium first:rounded-l last:rounded-r"
                style={{ 
                  backgroundColor: scale.color,
                  color: getTextColorForBackground(scale.color),
                  minWidth: 100,
                }}
              >
                {scale.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
