'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Table2 } from 'lucide-react';
// @ts-ignore
import sectorGroupData from '@/data/SectorGroup.json';
import * as d3 from 'd3';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// User's simplified data structure
interface SectorAllocation {
  code: string;
  name: string;
  percentage: number;
}

interface Props {
  allocations: SectorAllocation[];
  onSegmentClick?: (code: string, level: 'category' | 'sector' | 'subsector') => void;
  className?: string;
}

// Color palette - expanded gray and slate colors for visual variety
const GRAY_SLATE_COLORS = [
  '#1e293b', // slate-800
  '#334155', // slate-700  
  '#475569', // slate-600
  '#64748b', // slate-500
  '#94a3b8', // slate-400
  '#0f172a', // slate-900
  '#374151', // gray-700
  '#4b5563', // gray-600
  '#6b7280', // gray-500
  '#9ca3af', // gray-400
  '#d1d5db', // gray-300
  '#111827', // gray-900
  '#1f2937', // gray-800
  '#374151', // gray-700
  '#6b7280'  // gray-500
];

export default function SectorSunburstVisualization({ 
  allocations, 
  onSegmentClick, 
  className = '' 
}: Props) {
  const [viewMode, setViewMode] = useState<'sunburst' | 'table'>('sunburst');
  const svgRef = useRef<SVGSVGElement>(null);

  // Build hierarchy: Categories -> Sectors -> Subsectors
  const hierarchyData = useMemo(() => {
    console.log('Processing allocations:', allocations);
    
    const categoryMap = new Map<string, {
      code: string;
      name: string;
      percentage: number;
      sectors: Map<string, {
        code: string;
        name: string;
        percentage: number;
        subsectors: SectorAllocation[];
      }>;
    }>();

    // Process each allocation
    allocations.forEach(allocation => {
      const sectorData = sectorGroupData.data.find((s: any) => s.code === allocation.code);
      
      if (!sectorData) {
        console.warn(`Sector data not found for code: ${allocation.code}`);
        return;
      }

      const categoryCode = sectorData['codeforiati:group-code']; // e.g., "110" for Education
      const categoryName = sectorData['codeforiati:group-name']; // e.g., "Education"
      const sectorCode = sectorData['codeforiati:category-code']; // e.g., "111"
      const sectorName = sectorData['codeforiati:category-name']; // e.g., "Education, Level Unspecified"

      console.log(`Processing ${allocation.code}: ${categoryCode}/${sectorCode}`);

      // Initialize category if not exists
      if (!categoryMap.has(categoryCode)) {
        categoryMap.set(categoryCode, {
          code: categoryCode,
          name: categoryName,
          percentage: 0,
          sectors: new Map()
        });
      }

      const category = categoryMap.get(categoryCode)!;

      // Initialize sector if not exists
      if (!category.sectors.has(sectorCode)) {
        category.sectors.set(sectorCode, {
          code: sectorCode,
          name: sectorName,
          percentage: 0,
          subsectors: []
        });
      }

      const sector = category.sectors.get(sectorCode)!;

      // Add subsector and update percentages
      sector.subsectors.push(allocation);
      sector.percentage += allocation.percentage;
      category.percentage += allocation.percentage;
    });

    console.log('Built hierarchy:', categoryMap);
    return categoryMap;
  }, [allocations]);

  const totalAllocated = allocations.reduce((sum, a) => sum + a.percentage, 0);
  const unallocatedPercentage = Math.max(0, 100 - totalAllocated);

  // Handle resize for responsive chart
  const [containerSize, setContainerSize] = useState({ width: 600, height: 600 });

  useEffect(() => {
    if (!svgRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width } = entry.contentRect;
        setContainerSize({ 
          width: Math.min(width, 700), // Increased container width
          height: 600 // Increased container height
        });
      }
    });

    resizeObserver.observe(svgRef.current.parentElement!);
    return () => resizeObserver.disconnect();
  }, []);

  // Simple D3 sunburst implementation
  useEffect(() => {
    if (!svgRef.current || viewMode !== 'sunburst') return;

    console.log('Rendering sunburst with data:', hierarchyData);

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    if (hierarchyData.size === 0) {
      console.log('No data to render');
      return;
    }

    // Use responsive sizing based on container - make larger
    const width = Math.min(containerSize.width, 600); // Increased from 500
    const height = Math.min(containerSize.height, 600); // Increased from 400
    const centerX = width / 2;
    const centerY = height / 2;
    const padding = 60; // Increased padding to prevent overflow
    const maxRadius = Math.min(width, height) / 2 - padding;

    // Ring radii - equal width rings
    const ringWidth = (maxRadius - 60) / 3; // Divide available space into 3 equal rings
    const innerRadius = 60;
    const middleInnerRadius = innerRadius + ringWidth;
    const middleOuterRadius = middleInnerRadius + ringWidth;
    const outerOuterRadius = middleOuterRadius + ringWidth;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${centerX},${centerY})`);

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'absolute invisible bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm pointer-events-none z-50')
      .style('opacity', 0);

    // Helper function to create arc path
    const createArc = (startAngle: number, endAngle: number, innerR: number, outerR: number) => {
      return d3.arc()({
        startAngle: startAngle * (Math.PI / 180),
        endAngle: endAngle * (Math.PI / 180),
        innerRadius: innerR,
        outerRadius: outerR
      });
    };

    let currentAngle = 0;
    const categories = Array.from(hierarchyData.entries());

    categories.forEach(([categoryCode, category], categoryIndex) => {
      const categoryAngle = (category.percentage / totalAllocated) * 360;
      const categoryColor = GRAY_SLATE_COLORS[categoryIndex % GRAY_SLATE_COLORS.length];

      // Inner ring - Categories (DAC Groups)
      const categoryPath = createArc(currentAngle, currentAngle + categoryAngle, innerRadius, middleInnerRadius);
      if (categoryPath) {
        g.append('path')
          .attr('d', categoryPath)
          .attr('fill', categoryColor) // Use category-specific color
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            d3.select(this).attr('opacity', 0.8);
            tooltip.html(`<div class="font-semibold">${category.code} – ${category.name}</div>
                         <div class="text-gray-300">DAC Category</div>
                         <div class="text-gray-300">${category.percentage.toFixed(1)}% of total</div>`)
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY - 10}px`)
              .style('opacity', 1)
              .classed('invisible', false);
          })
          .on('mouseout', function() {
            d3.select(this).attr('opacity', 1);
            tooltip.style('opacity', 0).classed('invisible', true);
          })
          .on('click', function() {
            onSegmentClick?.(category.code, 'category');
          });
      }

      // Process sectors within this category
      let sectorStartAngle = currentAngle;
      const sectors = Array.from(category.sectors.entries());

      sectors.forEach(([sectorCode, sector]) => {
        const sectorAngle = (sector.percentage / totalAllocated) * 360;

        // Middle ring - Sectors (3-digit codes)
        const sectorPath = createArc(sectorStartAngle, sectorStartAngle + sectorAngle, middleInnerRadius, middleOuterRadius);
        if (sectorPath) {
          g.append('path')
            .attr('d', sectorPath)
            .attr('fill', d3.color(categoryColor)!.brighter(0.3).toString()) // Lighter shade of category color
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function(event) {
              d3.select(this).attr('opacity', 0.8);
              tooltip.html(`<div class="font-semibold">${sector.code} – ${sector.name}</div>
                           <div class="text-gray-300">3-digit Sector</div>
                           <div class="text-gray-300">${sector.percentage.toFixed(1)}% of total</div>`)
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 10}px`)
                .style('opacity', 1)
                .classed('invisible', false);
            })
            .on('mouseout', function() {
              d3.select(this).attr('opacity', 1);
              tooltip.style('opacity', 0).classed('invisible', true);
            })
            .on('click', function() {
              onSegmentClick?.(sector.code, 'sector');
            });
        }

        // Process subsectors within this sector
        let subsectorStartAngle = sectorStartAngle;
        sector.subsectors.forEach((subsector) => {
          const subsectorAngle = (subsector.percentage / totalAllocated) * 360;

          // Outer ring - Subsectors (5-digit codes)
          const subsectorPath = createArc(subsectorStartAngle, subsectorStartAngle + subsectorAngle, middleOuterRadius, outerOuterRadius);
          if (subsectorPath) {
            g.append('path')
              .attr('d', subsectorPath)
              .attr('fill', d3.color(categoryColor)!.brighter(0.6).toString()) // Even lighter shade
              .attr('stroke', '#fff')
              .attr('stroke-width', 1)
              .style('cursor', 'pointer')
              .on('mouseover', function(event) {
                d3.select(this).attr('opacity', 0.8);
                tooltip.html(`<div class="font-semibold">${subsector.code} – ${subsector.name}</div>
                             <div class="text-gray-300">5-digit Subsector</div>
                             <div class="text-gray-300">${subsector.percentage.toFixed(1)}% of total</div>`)
                  .style('left', `${event.pageX + 10}px`)
                  .style('top', `${event.pageY - 10}px`)
                  .style('opacity', 1)
                  .classed('invisible', false);
              })
              .on('mouseout', function() {
                d3.select(this).attr('opacity', 1);
                tooltip.style('opacity', 0).classed('invisible', true);
              })
              .on('click', function() {
                onSegmentClick?.(subsector.code, 'subsector');
              });
          }

          subsectorStartAngle += subsectorAngle;
        });

        sectorStartAngle += sectorAngle;
      });

      currentAngle += categoryAngle;
    });

    // Center text removed as requested - no text in center
    // Clean up tooltip on unmount
    return () => {
      d3.select('body').selectAll('.absolute.bg-gray-900').remove();
    };
  }, [hierarchyData, viewMode, totalAllocated, onSegmentClick, containerSize]);

  // Render table view
  const renderTable = () => {
    const enhancedAllocations = allocations.map(allocation => {
      const sectorData = sectorGroupData.data.find((s: any) => s.code === allocation.code);
      return {
        ...allocation,
        categoryName: sectorData?.['codeforiati:group-name'] || 'Unknown',
        sectorCode: sectorData?.['codeforiati:category-code'] || '',
        sectorName: sectorData?.['codeforiati:category-name'] || 'Unknown'
      };
    });

    const sortedAllocations = [...enhancedAllocations].sort((a, b) => {
      if (a.categoryName !== b.categoryName) return a.categoryName.localeCompare(b.categoryName);
      if (a.sectorCode !== b.sectorCode) return a.sectorCode.localeCompare(b.sectorCode);
      return a.code.localeCompare(b.code);
    });

    return (
      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sector Code</TableHead>
              <TableHead>Sector Name</TableHead>
              <TableHead>3-Digit Sector</TableHead>
              <TableHead>Sector Category</TableHead>
              <TableHead className="text-right">% Allocation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAllocations.map((allocation) => (
              <TableRow key={allocation.code}>
                <TableCell className="font-mono text-sm">
                  {allocation.code}
                </TableCell>
                <TableCell>{allocation.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs font-mono">
                    {allocation.sectorCode} – {allocation.sectorName}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {allocation.categoryName}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {allocation.percentage.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
            {/* Total row */}
            <TableRow className="font-semibold border-t-2">
              <TableCell colSpan={4}>Total Allocated</TableCell>
              <TableCell className="text-right font-mono">
                {totalAllocated.toFixed(1)}%
              </TableCell>
            </TableRow>
            {/* Unallocated row */}
            {unallocatedPercentage > 0 && (
              <TableRow className="text-gray-500">
                <TableCell colSpan={4}>Unallocated</TableCell>
                <TableCell className="text-right font-mono">
                  {unallocatedPercentage.toFixed(1)}%
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (allocations.length === 0) {
    return (
      <Card className={`p-8 ${className}`}>
        <div className="text-center">
          <div className="text-lg font-medium text-gray-500 mb-2">No Sector Allocations</div>
          <div className="text-sm text-gray-400">Add sector allocations to see the visualization</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header with toggle */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sector Allocation Visualization</h3>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'sunburst' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('sunburst')}
            className="flex items-center gap-2"
          >
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Sunburst</span>
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="flex items-center gap-2"
          >
            <Table2 className="h-4 w-4" />
            <span className="hidden sm:inline">Table</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        {viewMode === 'sunburst' ? (
          <div className="flex justify-center items-center p-4 overflow-hidden">
            <div className="w-full max-w-2xl aspect-square flex items-center justify-center">
              <svg 
                ref={svgRef} 
                className="w-full h-full max-w-full max-h-full"
                style={{ maxHeight: '600px' }}
              ></svg>
            </div>
          </div>
        ) : renderTable()}
      </div>
    </Card>
  );
} 