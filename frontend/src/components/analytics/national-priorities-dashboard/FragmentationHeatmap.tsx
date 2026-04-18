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
  if (value < 0.1) return "<0.1%";
  return `${value.toFixed(1)}%`;
}

export function FragmentationHeatmap({ data }: FragmentationHeatmapProps) {
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

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Legend */}
        <div className="flex items-center gap-4 justify-end text-helper">
          <span className="text-muted-foreground">% of donor&apos;s total:</span>
          <div className="flex items-center gap-1">
            {FRAGMENTATION_COLOR_SCALE.map((scale, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className="w-5 h-4 rounded-sm"
                  style={{ backgroundColor: scale.color }}
                />
                <span className="text-muted-foreground">{scale.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-surface-muted">
              <tr>
                <th className="sticky left-0 bg-background z-10 px-2 py-1 text-left text-helper font-medium border-b">
                  Donor
                </th>
                <th className="px-2 py-1 text-right text-helper font-medium border-b">
                  Total
                </th>
                {data.categories.map((cat) => (
                  <th
                    key={cat.id}
                    className="px-2 py-1 text-center text-helper font-medium border-b whitespace-nowrap"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">
                          {cat.code || cat.name.slice(0, 10)}
                          {cat.name.length > 10 && !cat.code ? "..." : ""}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{cat.name}</p>
                        {cat.code && (
                          <p className="text-helper text-muted-foreground">
                            Code: {cat.code}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.donors.map((donor) => (
                <tr key={donor.id} className="hover:bg-muted/30">
                  <td className="sticky left-0 bg-background z-10 px-2 py-1 text-helper font-medium border-b whitespace-nowrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">
                          {donor.acronym || donor.name.slice(0, 15)}
                          {donor.name.length > 15 && !donor.acronym ? "..." : ""}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{donor.name}</p>
                        {donor.country && (
                          <p className="text-helper text-muted-foreground">
                            {donor.country}
                          </p>
                        )}
                        <p className="text-helper mt-1">
                          Total: {formatCurrency(donor.total)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="px-2 py-1 text-helper text-right border-b text-muted-foreground">
                    {formatCurrency(donor.total)}
                  </td>
                  {data.categories.map((cat) => {
                    const cell = cellMap.get(`${donor.id}-${cat.id}`);
                    const percentage = cell ? cell.percentage / 100 : 0;
                    const bgColor = percentage > 0 ? getColorForPercentage(percentage) : "transparent";
                    const textColor = percentage > 0 ? getTextColorForBackground(bgColor) : "inherit";

                    return (
                      <td
                        key={cat.id}
                        className="px-1 py-1 text-center text-[10px] border-b"
                      >
                        {cell && cell.percentage > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="px-1 py-0.5 rounded cursor-help min-w-[32px]"
                                style={{
                                  backgroundColor: bgColor,
                                  color: textColor,
                                }}
                              >
                                {formatPercent(cell.percentage)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{donor.name}</p>
                              <p className="text-helper">{cat.name}</p>
                              <div className="mt-1 text-helper space-y-0.5">
                                <p>Value: {formatCurrency(cell.value)}</p>
                                <p>
                                  Share: {formatPercent(cell.percentage)} of donor
                                </p>
                                <p>Activities: {cell.activityCount}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="px-1 py-0.5 text-muted-foreground/30">
                            -
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-helper text-muted-foreground">
          <span>
            {data.donors.length} donors × {data.categories.length} categories
          </span>
          <span>Grand Total: {formatCurrency(data.grandTotal)}</span>
        </div>

        {/* Explanatory text */}
        <p className="text-body text-muted-foreground leading-relaxed">
          This heatmap visualizes how funding is distributed between donors and categories. Each cell shows the percentage share of a donor's total allocation to that category. Darker colours indicate higher concentration, helping to identify specialization patterns.
        </p>
      </div>
    </TooltipProvider>
  );
}

