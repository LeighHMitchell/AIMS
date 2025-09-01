'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
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

// Extended color palette for unique colors per segment
const BASE_COLORS = [
  '#E3120B', '#006BA2', '#3EBCD2', '#379A8B', '#EBB434', '#B4BA39', '#9A607F', '#D1B07C',
  '#FF6B6C', '#1270A8', '#25ADC2', '#4DAD9E', '#C89608', '#9DA521', '#C98CAC', '#FFC2E3',
  '#C7303C', '#00588D', '#0092A7', '#00786B', '#8D6300', '#667100', '#925977', '#826636',
  '#DB444B', '#0C4A6E', '#0E7490', '#065F46', '#A16207', '#4D7C0F', '#7C2D12', '#92400E',
  '#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#FB7185', '#38BDF8', '#4ADE80',
  '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#22C55E',
  '#DC2626', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0891B2', '#16A34A',
  '#B91C1C', '#1D4ED8', '#047857', '#B45309', '#6D28D9', '#BE185D', '#0E7490', '#15803D'
];

// Function to generate darker and lighter shades from a base color
const generateShades = (baseColor: string) => {
  // Convert hex to RGB
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Generate darker shade (multiply by 0.7)
  const darkerR = Math.round(r * 0.7);
  const darkerG = Math.round(g * 0.7);
  const darkerB = Math.round(b * 0.7);
  
  // Generate lighter shade (blend with white)
  const lighterR = Math.round(r + (255 - r) * 0.4);
  const lighterG = Math.round(g + (255 - g) * 0.4);
  const lighterB = Math.round(b + (255 - b) * 0.4);
  
  return {
    darker: `rgb(${darkerR}, ${darkerG}, ${darkerB})`,
    base: baseColor,
    lighter: `rgb(${lighterR}, ${lighterG}, ${lighterB})`
  };
};

// Function to generate multiple shades within the same color family for different ring levels
const generateVariedShades = (baseColor: string, shadeIndex: number, totalShades: number, ringLevel: 'sector' | 'subsector') => {
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  let minLighten, maxLighten;
  
  if (ringLevel === 'sector') {
    // Middle ring - moderate lightening range
    minLighten = 0.1;
    maxLighten = 0.3;
  } else {
    // Outer ring - lighter range
    minLighten = 0.4;
    maxLighten = 0.7;
  }
  
  const lightenFactor = totalShades === 1 ? 
    (minLighten + maxLighten) / 2 : // Use middle value if only one shade
    minLighten + (maxLighten - minLighten) * (shadeIndex / (totalShades - 1));
  
  const lighterR = Math.round(r + (255 - r) * lightenFactor);
  const lighterG = Math.round(g + (255 - g) * lightenFactor);
  const lighterB = Math.round(b + (255 - b) * lightenFactor);
  
  return `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
};

export default function SectorSunburstVisualization({ 
  allocations, 
  onSegmentClick, 
  className = '' 
}: Props) {
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
    if (!svgRef.current) return;

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
      // Each category gets its own base color - this will be the family color for all its children
      const categoryBaseColor = BASE_COLORS[categoryIndex % BASE_COLORS.length];
      const categoryColorSet = generateShades(categoryBaseColor);

      // Inner ring - Categories (DAC Groups) - use darker shade
      const categoryPath = createArc(currentAngle, currentAngle + categoryAngle, innerRadius, middleInnerRadius);
      if (categoryPath) {
        g.append('path')
          .attr('d', categoryPath)
          .attr('fill', categoryColorSet.darker) // Use darker shade for inner ring
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            d3.select(this).attr('opacity', 0.8);
            tooltip.html(`<div class="font-semibold">${category.code} – ${category.name}</div>
                         <div class="text-gray-300">Sector Category</div>
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
        
        // Add text label for category code
        const categoryMidAngle = currentAngle + (categoryAngle / 2);
        const categoryTextRadius = innerRadius + (ringWidth / 2);
        const categoryTextX = centerX + (categoryTextRadius * Math.cos((categoryMidAngle - 90) * (Math.PI / 180)));
        const categoryTextY = centerY + (categoryTextRadius * Math.sin((categoryMidAngle - 90) * (Math.PI / 180)));
        
        g.append('text')
          .attr('x', categoryTextX)
          .attr('y', categoryTextY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('class', 'font-mono text-xs font-bold fill-white')
          .style('font-family', 'monospace')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .style('pointer-events', 'none')
          .text(category.code);
      }

      // Process sectors within this category
      let sectorStartAngle = currentAngle;
      const sectors = Array.from(category.sectors.entries());

      sectors.forEach(([sectorCode, sector], sectorIndex) => {
        const sectorAngle = (sector.percentage / totalAllocated) * 360;
        // Each sector gets a different shade within the same color family (medium range)
        const sectorColor = generateVariedShades(categoryBaseColor, sectorIndex, sectors.length, 'sector');

        // Middle ring - Sectors (3-digit codes) - use varied medium shades
        const sectorPath = createArc(sectorStartAngle, sectorStartAngle + sectorAngle, middleInnerRadius, middleOuterRadius);
        if (sectorPath) {
          g.append('path')
            .attr('d', sectorPath)
            .attr('fill', sectorColor) // Use varied shade for middle ring
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function(event) {
              d3.select(this).attr('opacity', 0.8);
              tooltip.html(`<div class="font-semibold">${sector.code} – ${sector.name}</div>
                           <div class="text-gray-300">Sector</div>
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
        sector.subsectors.forEach((subsector, subsectorIndex) => {
          const subsectorAngle = (subsector.percentage / totalAllocated) * 360;
          // Each subsector gets a different shade within the same color family
          const subsectorColor = generateVariedShades(categoryBaseColor, subsectorIndex, sector.subsectors.length, 'subsector');

          // Outer ring - Subsectors (5-digit codes) - use varied lighter shades
          const subsectorPath = createArc(subsectorStartAngle, subsectorStartAngle + subsectorAngle, middleOuterRadius, outerOuterRadius);
          if (subsectorPath) {
            g.append('path')
              .attr('d', subsectorPath)
              .attr('fill', subsectorColor) // Use varied shade for outer ring
              .attr('stroke', '#fff')
              .attr('stroke-width', 1)
              .style('cursor', 'pointer')
              .on('mouseover', function(event) {
                d3.select(this).attr('opacity', 0.8);
                tooltip.html(`<div class="font-semibold">${subsector.code} – ${subsector.name}</div>
                             <div class="text-gray-300">Sub-sector</div>
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
  }, [hierarchyData, totalAllocated, onSegmentClick, containerSize]);

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
              <TableHead className="text-center">% Allocation</TableHead>
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
    <div className={`${className}`}>
      {/* Content - always show sunburst since tabs handle the switching */}
      <div className="flex justify-center items-center p-4 overflow-hidden">
        <div className="w-full max-w-2xl aspect-square flex items-center justify-center">
          <svg 
            ref={svgRef} 
            className="w-full h-full max-w-full max-h-full"
            style={{ maxHeight: '600px' }}
          ></svg>
        </div>
      </div>
    </div>
  );
} 