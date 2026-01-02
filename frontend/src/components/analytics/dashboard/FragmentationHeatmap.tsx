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

export function FragmentationHeatmap({ data, swapAxes = false }: FragmentationHeatmapProps) {
  if (!data || data.donors.length === 0 || data.categories.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No fragmentation data available
      </div>
    );
  }

  // Create a map for quick cell lookup
  const cellMap = new Map<string, FragmentationCell>();
  data.cells.forEach((cell) => {
    cellMap.set(`${cell.donorId}-${cell.categoryId}`, cell);
  });

  // Calculate the height needed for rotated headers
  const headerHeight = 120;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Heatmap table */}
        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ borderSpacing: 0 }}>
            <thead>
              <tr>
                {/* Empty corner cell */}
                <th 
                  className="sticky left-0 bg-white z-20 border-b border-slate-200"
                  style={{ height: headerHeight, minWidth: 140 }}
                />
                {/* Category headers - rotated */}
                {data.categories.map((cat) => (
                  <th
                    key={cat.id}
                    className="border-b border-slate-200 p-0 align-bottom"
                    style={{ height: headerHeight, minWidth: 40, maxWidth: 40 }}
                  >
                    <div 
                      className="relative"
                      style={{ height: headerHeight, width: 40 }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="absolute text-xs font-medium text-slate-600 whitespace-nowrap cursor-help origin-bottom-left"
                            style={{
                              transform: 'rotate(-45deg)',
                              transformOrigin: 'bottom left',
                              bottom: 8,
                              left: 20,
                              maxWidth: 140,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {cat.code ? `${cat.code} - ${cat.name}` : cat.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="font-medium">{cat.name}</p>
                          {cat.code && (
                            <p className="text-xs text-muted-foreground">
                              Code: {cat.code}
                            </p>
                          )}
                          {cat.total !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              Total: {formatCurrency(cat.total)}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                ))}
                {/* Totals header */}
                <th 
                  className="border-b border-slate-200 p-0 align-bottom"
                  style={{ height: headerHeight, minWidth: 50 }}
                >
                  <div 
                    className="relative"
                    style={{ height: headerHeight, width: 50 }}
                  >
                    <span
                      className="absolute text-xs font-bold text-slate-700 whitespace-nowrap origin-bottom-left"
                      style={{
                        transform: 'rotate(-45deg)',
                        transformOrigin: 'bottom left',
                        bottom: 8,
                        left: 25,
                      }}
                    >
                      Totals
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.donors.map((donor) => {
                const isOthers = donor.id === 'others';
                // Calculate donor's share of grand total for the Totals column
                const donorShareOfTotal = data.grandTotal > 0 
                  ? (donor.total / data.grandTotal) * 100 
                  : 0;
                
                return (
                  <tr key={donor.id} className="hover:bg-slate-50/50">
                    {/* Donor name cell */}
                    <td 
                      className={`sticky left-0 bg-white z-10 px-2 py-1 text-xs font-medium border-b border-slate-100 whitespace-nowrap ${
                        isOthers ? 'text-red-600' : 'text-slate-700'
                      }`}
                      style={{ minWidth: 140 }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {isOthers ? 'OTHERS' : (donor.acronym || donor.name.slice(0, 20))}
                            {!isOthers && donor.name.length > 20 && !donor.acronym ? "..." : ""}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{donor.name}</p>
                          {donor.country && (
                            <p className="text-xs text-muted-foreground">
                              {donor.country}
                            </p>
                          )}
                          <p className="text-xs mt-1">
                            Total: {formatCurrency(donor.total)}
                          </p>
                          <p className="text-xs">
                            Share: {formatPercent(donorShareOfTotal)} of total
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    {/* Data cells */}
                    {data.categories.map((cat) => {
                      const cell = cellMap.get(`${donor.id}-${cat.id}`);
                      // Use column-based percentage for coloring
                      const percentage = cell?.percentageOfCategory ?? 0;
                      const percentageDecimal = percentage / 100;
                      const bgColor = percentage > 0 ? getColorForPercentage(percentageDecimal) : "transparent";
                      const textColor = percentage > 0 ? getTextColorForBackground(bgColor) : "inherit";

                      return (
                        <td
                          key={cat.id}
                          className="p-0.5 text-center border-b border-slate-100"
                          style={{ minWidth: 40, maxWidth: 40 }}
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
                                <p className="font-medium">{donor.name}</p>
                                <p className="text-xs">{cat.name}</p>
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
                    {/* Totals column - donor's share of grand total */}
                    <td
                      className="p-0.5 text-center border-b border-slate-100"
                      style={{ minWidth: 50 }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="px-1 py-1 rounded-sm cursor-help text-[11px] font-medium"
                            style={{
                              backgroundColor: getColorForPercentage(donorShareOfTotal / 100),
                              color: getTextColorForBackground(getColorForPercentage(donorShareOfTotal / 100)),
                            }}
                          >
                            {formatPercent(donorShareOfTotal)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{donor.name}</p>
                          <p className="text-xs mt-1">
                            Total: {formatCurrency(donor.total)}
                          </p>
                          <p className="text-xs">
                            {formatPercent(donorShareOfTotal)} of all funding
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
                  style={{ minWidth: 140 }}
                >
                  Totals
                </td>
                {data.categories.map((cat) => (
                  <td
                    key={cat.id}
                    className="p-0.5 text-center border-t border-slate-200"
                    style={{ minWidth: 40, maxWidth: 40 }}
                  >
                    <div className="px-1 py-1 text-[11px] font-bold text-slate-700">
                      100%
                    </div>
                  </td>
                ))}
                <td
                  className="p-0.5 text-center border-t border-slate-200"
                  style={{ minWidth: 50 }}
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
