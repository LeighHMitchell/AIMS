"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { apiFetch } from '@/lib/api-fetch';

interface AidOnBudgetChartProps {
  dateRange?: {
    from: Date;
    to: Date;
  };
  refreshKey?: number;
}

interface TooltipContent {
  title: string;
  value: string;
  percentage: string;
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  content: TooltipContent | null;
}

interface ChartData {
  centerData: {
    total: number;
    breakdown: { type: string; value: number }[];
  };
  sectorData: {
    name: string;
    code: string;
    value: number;
    breakdown: number[];
  }[];
}

interface ApiResponse {
  success: boolean;
  summary: {
    totalAid: number;
    totalOnBudget: number;
    totalOffBudget: number;
    onBudgetPercentage: number;
    activityCount: number;
    mappedActivityCount: number;
    mappingCoverage: number;
  };
  chartData: ChartData;
  data: any[];
}

export function AidOnBudgetChart({ dateRange, refreshKey }: AidOnBudgetChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, x: 0, y: 0, content: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  // Format number to abbreviated form (e.g., 1.5M, 2.3B)
  const formatAbbreviated = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.set('dateFrom', dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange?.to) {
        params.set('dateTo', dateRange.to.toISOString().split('T')[0]);
      }

      const response = await apiFetch(`/api/analytics/aid-on-budget?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result);
    } catch (err: any) {
      console.error('[AidOnBudgetChart] Error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Render D3 chart when data changes
  useEffect(() => {
    if (!svgRef.current || !data) return;

    // Clear any existing content
    d3.select(svgRef.current).selectAll("*").remove();

    const { summary, chartData } = data;

    // Color palette - using provided palette
    const palette = {
      primaryScarlet: "#dc2625",
      paleSlate: "#cfd0d5",
      blueSlate: "#4c5568",
      coolSteel: "#7b95a7",
      platinum: "#f1f4f8"
    };

    // Check if there's any data to show
    if (summary.totalAid === 0 && chartData.sectorData.length === 0) {
      // Render empty state message
      const svg = d3.select(svgRef.current)
        .attr("viewBox", `0 0 900 700`);

      svg.append("text")
        .attr("x", 450)
        .attr("y", 320)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", palette.blueSlate)
        .text("No budget mapping data available yet.");

      svg.append("text")
        .attr("x", 450)
        .attr("y", 350)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", palette.coolSteel)
        .text("Add budget classifications to activities to see the visualization.");

      return;
    }

    // Prepare data for visualization
    const centerData = {
      total: summary.totalAid,
      breakdown: [
        { type: "On-Budget", value: summary.totalOnBudget },
        { type: "Off-Budget", value: summary.totalOffBudget }
      ]
    };

    // Use sector data from API, or create placeholder if empty
    const sectorData = chartData.sectorData.length > 0
      ? chartData.sectorData
      : [
          { name: "No Classifications", code: "00", value: summary.totalAid, breakdown: [0, 100] }
        ];

    // SETUP
    const width = 900;
    const height = 700;
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Colors using palette
    const colors = {
      "On-Budget": palette.coolSteel,      // Cool Steel for on-budget
      "Off-Budget": palette.primaryScarlet  // Primary Scarlet for off-budget
    };
    const colorScale = d3.scaleOrdinal()
      .domain(["On-Budget", "Off-Budget"])
      .range([colors["On-Budget"], colors["Off-Budget"]]);

    // Tooltip handlers
    const showTooltip = (event: MouseEvent, content: TooltipContent) => {
      if (!svgRef.current) return;
      const svgRect = svgRef.current.getBoundingClientRect();
      setTooltip({
        show: true,
        x: event.clientX - svgRect.left + 10,
        y: event.clientY - svgRect.top - 10,
        content
      });
    };

    const hideTooltip = () => {
      setTooltip({ show: false, x: 0, y: 0, content: null });
    };

    // ORBIT
    const orbitRadius = sectorData.length > 1 ? 260 : 0;
    if (sectorData.length > 1) {
      g.append("circle")
        .attr("r", orbitRadius)
        .attr("fill", "none")
        .attr("stroke", palette.paleSlate)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4")
        .attr("opacity", 0.5);
    }

    // CENTER DONUT
    const centerRadius = 110;
    const centerThickness = 18;
    const pieGenerator = d3.pie<{ type: string; value: number }>().value(d => d.value).sort(null);
    const centerArc = d3.arc<d3.PieArcDatum<{ type: string; value: number }>>()
      .innerRadius(centerRadius)
      .outerRadius(centerRadius + centerThickness);

    const totalCenterValue = centerData.breakdown.reduce((sum, d) => sum + d.value, 0);

    if (totalCenterValue > 0) {
      g.selectAll(".center-slice")
        .data(pieGenerator(centerData.breakdown.filter(d => d.value > 0)))
        .enter()
        .append("path")
        .attr("d", centerArc)
        .attr("fill", d => colorScale(d.data.type) as string)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event: MouseEvent, d) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("transform", "scale(1.05)");

          const percentage = ((d.data.value / totalCenterValue) * 100).toFixed(1);
          showTooltip(event, {
            title: d.data.type,
            value: formatAbbreviated(d.data.value),
            percentage: `${percentage}% of total aid`
          });
        })
        .on("mousemove", function(event: MouseEvent, d) {
          const percentage = ((d.data.value / totalCenterValue) * 100).toFixed(1);
          showTooltip(event, {
            title: d.data.type,
            value: formatAbbreviated(d.data.value),
            percentage: `${percentage}% of total aid`
          });
        })
        .on("mouseout", function() {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("transform", "scale(1)");
          hideTooltip();
        });
    }

    // Center circle with platinum background
    g.append("circle")
      .attr("r", centerRadius)
      .attr("fill", palette.platinum);

    // Center text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.3em")
      .attr("font-size", "22px")
      .attr("font-weight", "bold")
      .attr("fill", palette.blueSlate)
      .text(formatAbbreviated(centerData.total));

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("font-size", "11px")
      .attr("fill", palette.blueSlate)
      .text("Total Aid");

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "2.5em")
      .attr("font-size", "11px")
      .attr("fill", palette.blueSlate)
      .text(`${summary.onBudgetPercentage.toFixed(0)}% On-Budget`);

    // SATELLITES (Budget Classifications)
    if (sectorData.length > 0 && sectorData[0].name !== "No Classifications") {
      const maxValue = d3.max(sectorData, d => d.value) || 1;
      const rScale = d3.scaleSqrt()
        .domain([0, maxValue])
        .range([22, 55]);

      const angleStep = (2 * Math.PI) / sectorData.length;

      // Color scale for sectors - using palette colors
      const sectorColors = [
        palette.blueSlate,
        palette.coolSteel,
        palette.primaryScarlet,
        palette.paleSlate
      ];
      const sectorColorScale = d3.scaleOrdinal(sectorColors);

      sectorData.forEach((sector, i) => {
        const angle = (i * angleStep) - (Math.PI / 2);
        const x = Math.cos(angle) * orbitRadius;
        const y = Math.sin(angle) * orbitRadius;
        const r = rScale(sector.value);

        const planetGroup = g.append("g")
          .attr("transform", `translate(${x}, ${y})`)
          .style("cursor", "pointer");

        // Filled circle instead of donut for simplicity
        planetGroup.append("circle")
          .attr("r", r)
          .attr("fill", sectorColorScale(i.toString()) as string)
          .attr("opacity", 0.8)
          .attr("stroke", sectorColorScale(i.toString()) as string)
          .attr("stroke-width", 2)
          .on("mouseover", function(event: MouseEvent) {
            d3.select(this)
              .transition()
              .duration(150)
              .attr("opacity", 1)
              .attr("r", r * 1.1);

            const pct = totalCenterValue > 0
              ? ((sector.value / totalCenterValue) * 100).toFixed(1)
              : '0.0';
            showTooltip(event, {
              title: `${sector.code} - ${sector.name}`,
              value: formatAbbreviated(sector.value),
              percentage: `${pct}% of total aid`
            });
          })
          .on("mousemove", function(event: MouseEvent) {
            const pct = totalCenterValue > 0
              ? ((sector.value / totalCenterValue) * 100).toFixed(1)
              : '0.0';
            showTooltip(event, {
              title: `${sector.code} - ${sector.name}`,
              value: formatAbbreviated(sector.value),
              percentage: `${pct}% of total aid`
            });
          })
          .on("mouseout", function() {
            d3.select(this)
              .transition()
              .duration(150)
              .attr("opacity", 0.8)
              .attr("r", r);
            hideTooltip();
          });

        // Inner circle for text background
        planetGroup.append("circle")
          .attr("r", r * 0.75)
          .attr("fill", palette.platinum);

        // Value text
        planetGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "-0.2em")
          .attr("font-size", r > 35 ? "12px" : "10px")
          .attr("font-weight", "bold")
          .attr("fill", palette.blueSlate)
          .text(formatAbbreviated(sector.value));

        // Name text (wrapped if needed)
        const words = sector.name.split(" ");
        if (words.length > 1 && sector.name.length > 8 && r > 35) {
          planetGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1em")
            .attr("font-size", "8px")
            .attr("fill", palette.blueSlate)
            .text(words.slice(0, Math.ceil(words.length / 2)).join(" "));

          planetGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "2.1em")
            .attr("font-size", "8px")
            .attr("fill", palette.blueSlate)
            .text(words.slice(Math.ceil(words.length / 2)).join(" "));
        } else {
          planetGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1em")
            .attr("font-size", r > 35 ? "9px" : "7px")
            .attr("fill", palette.blueSlate)
            .text(sector.name.length > 12 ? sector.name.slice(0, 12) + "..." : sector.name);
        }
      });
    }

    // LEGEND
    const legendData = [
      { label: "On-Budget Aid", color: colors["On-Budget"] },
      { label: "Off-Budget Aid", color: colors["Off-Budget"] }
    ];

    const legend = svg.append("g")
      .attr("transform", `translate(${width - 160}, 25)`);

    legendData.forEach((d, i) => {
      const row = legend.append("g")
        .attr("transform", `translate(0, ${i * 28})`);

      row.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("rx", 3)
        .attr("fill", d.color);

      row.append("text")
        .attr("x", 26)
        .attr("y", 13)
        .attr("font-size", "12px")
        .attr("fill", palette.blueSlate)
        .text(d.label);
    });

    // Stats in bottom left
    const stats = svg.append("g")
      .attr("transform", `translate(20, ${height - 80})`);

    stats.append("text")
      .attr("font-size", "12px")
      .attr("fill", palette.blueSlate)
      .text(`Mapping Coverage: ${summary.mappingCoverage.toFixed(0)}%`);

    stats.append("text")
      .attr("y", 20)
      .attr("font-size", "12px")
      .attr("fill", palette.blueSlate)
      .text(`${summary.mappedActivityCount} of ${summary.activityCount} activities mapped`);

  }, [data]);

  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle>Aid on Budget</CardTitle>
          <CardDescription>Aid distribution by budget classification</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[700px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle>Aid on Budget</CardTitle>
          <CardDescription>Aid distribution by budget classification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[700px] text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Error loading data</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle>Aid on Budget</CardTitle>
        <CardDescription>Aid distribution by budget classification</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full flex items-center justify-center" style={{ backgroundColor: '#f1f4f8', minHeight: '700px' }}>
          <svg ref={svgRef} className="w-full h-full max-w-4xl max-h-[700px]" />

          {/* Tooltip */}
          {tooltip.show && tooltip.content && (
            <div
              className="absolute pointer-events-none z-50 rounded-lg shadow-lg px-3 py-2"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(0, -100%)',
                backgroundColor: '#f1f4f8',
                border: '1px solid #cfd0d5'
              }}
            >
              <div className="font-semibold text-sm" style={{ color: '#4c5568' }}>{tooltip.content.title}</div>
              <div className="text-sm" style={{ color: '#4c5568' }}>{tooltip.content.value}</div>
              <div className="text-xs" style={{ color: '#7b95a7' }}>{tooltip.content.percentage}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
