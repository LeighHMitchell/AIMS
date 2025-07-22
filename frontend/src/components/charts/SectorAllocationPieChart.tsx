'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { getSectorLabel, getSectorDescription } from '@/components/forms/SimpleSectorSelect';
import dacSectorsData from '@/data/dac-sectors.json';

interface SectorAllocation {
  id: string;
  code: string;
  percentage: number;
}

interface TreemapNode {
  name: string;
  value?: number;
  children?: TreemapNode[];
  code?: string;
  category?: string;
  description?: string;
}

interface SectorAllocationPieChartProps {
  allocations: SectorAllocation[];
}

// Enhanced professional color palette
const SECTOR_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#dc2626', // Red
  '#7c3aed', // Violet
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#be123c', // Rose
  '#16a34a', // Green
  '#9333ea', // Purple
  '#0284c7', // Sky
  '#c2410c', // Orange-600
  '#0d9488', // Teal
];

// Create lookup for 3-digit DAC category codes to names
const createCategoryLookup = (): Record<string, string> => {
  const lookup: Record<string, string> = {};
  
  Object.keys(dacSectorsData).forEach(categoryKey => {
    // Extract 3-digit code and name from keys like "111 - Education, Level Unspecified"
    const match = categoryKey.match(/^(\d{3})\s*-\s*(.+)$/);
    if (match) {
      const [, code, name] = match;
      lookup[code] = name;
    }
  });
  
  return lookup;
};



export default function SectorAllocationPieChart({ 
  allocations = [] 
}: SectorAllocationPieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Transform allocations into hierarchical data for treemap
  const treemapData = useMemo(() => {
    const categoryLookup = createCategoryLookup();
    
    if (allocations.length === 0) return null;
    
    // Group sectors by category
    const categoryMap = new Map<string, any[]>();
    
    allocations
      .filter(allocation => allocation.percentage > 0)
      .forEach(allocation => {
        const fullLabel = getSectorLabel(allocation.code);
        const description = getSectorDescription(allocation.code);
        
        // Extract category code (first 3 digits) and sector name
        const categoryCode = allocation.code.substring(0, 3);
        const sectorNameMatch = fullLabel.match(/\d{5}\s*-\s*(.+)$/);
        const sectorName = sectorNameMatch ? sectorNameMatch[1] : fullLabel;
        
        const sectorNode = {
          name: sectorName,
          value: allocation.percentage,
          code: allocation.code,
          category: categoryCode,
          description
        };
        
        if (!categoryMap.has(categoryCode)) {
          categoryMap.set(categoryCode, []);
        }
        categoryMap.get(categoryCode)!.push(sectorNode);
      });
    
    // Create hierarchical structure
    const children = Array.from(categoryMap.entries()).map(([categoryCode, sectors]) => {
      const categoryName = categoryLookup[categoryCode] || 'Unknown Category';
      return {
        name: categoryName,
        code: categoryCode,
        children: sectors
      };
    });
    
    return {
      name: 'Sectors',
      children
    };
  }, [allocations]);

  useEffect(() => {
    if (!svgRef.current || !treemapData) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Get container dimensions
    const containerWidth = svgRef.current.parentElement?.clientWidth || 800;
    const containerHeight = svgRef.current.parentElement?.clientHeight || 600;
    const width = Math.min(containerWidth, 1200);
    const height = Math.max(containerHeight - 40, 600); // Use container height or minimum 600px
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create hierarchy and calculate values
    const root = d3.hierarchy(treemapData)
      .sum((d: any) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap layout with better separation
    const treemap = d3.treemap<any>()
      .size([innerWidth, innerHeight])
      .paddingOuter(6)
      .paddingInner(4)
      .paddingTop(25)
      .round(true);

    treemap(root);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tooltip with enhanced styling
    const tooltip = d3.select('body').append('div')
      .attr('class', 'absolute invisible bg-gray-900/95 backdrop-blur-sm text-white text-sm rounded-lg px-4 py-3 pointer-events-none z-50 shadow-2xl border border-gray-700')
      .style('opacity', 0);

    // Color scale
    const colorScale = d3.scaleOrdinal(SECTOR_COLORS);

    // Draw leaf nodes (sectors)
    const leaf = g.selectAll('.leaf')
      .data(root.leaves())
      .enter().append('g')
      .attr('class', 'leaf')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

    leaf.append('rect')
      .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', (d: any) => {
         const categoryIndex = root.children?.findIndex((cat: any) => cat.data.code === d.data.category) || 0;
         return colorScale(categoryIndex.toString());
       })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))')
      .style('transition', 'all 0.2s ease')
      .on('mouseover', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 0.85)
          .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))')
          .attr('transform', 'scale(1.02)');
        
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`
          <div class="font-semibold text-base mb-1">${d.data.code} - ${d.data.name}</div>
          <div class="text-sm opacity-75 mb-1">Category: ${d.parent?.data.name}</div>
          <div class="text-lg font-bold">${d.data.value.toFixed(1)}%</div>
        `)
          .style('left', `${event.pageX + 15}px`)
          .style('top', `${event.pageY - 10}px`)
          .classed('invisible', false);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 1)
          .style('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))')
          .attr('transform', 'scale(1)');
        
        tooltip.transition().duration(200).style('opacity', 0)
          .on('end', () => tooltip.classed('invisible', true));
      });

    // Add text labels for larger rectangles
    leaf.append('text')
      .attr('x', 6)
      .attr('y', 18)
      .text((d: any) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        if (width > 80 && height > 30) {
          return d.data.code;
        }
        return '';
      })
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', 'white')
      .attr('text-anchor', 'start')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.3)');

    // Add percentage labels for larger rectangles
    leaf.append('text')
      .attr('x', 6)
      .attr('y', 32)
      .text((d: any) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        if (width > 80 && height > 40) {
          return `${d.data.value.toFixed(1)}%`;
        }
        return '';
      })
      .attr('font-size', '10px')
      .attr('fill', 'white')
      .attr('opacity', 0.9)
      .attr('text-anchor', 'start')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.3)');

    // Draw category boundaries (optional)
    const categoryGroups = g.selectAll('.category')
      .data(root.children || [])
      .enter().append('g')
      .attr('class', 'category');

    categoryGroups.append('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', 'none')
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 3)
      .attr('opacity', 0.6);

    // Category labels
    categoryGroups.append('text')
      .attr('x', (d: any) => d.x0 + 4)
      .attr('y', (d: any) => d.y0 + 14)
      .text((d: any) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        if (width > 100 && height > 50) {
          return d.data.name.length > 20 ? d.data.name.substring(0, 20) + '...' : d.data.name;
        }
        return '';
      })
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .attr('text-anchor', 'start');

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };
  }, [treemapData]);

  if (!treemapData || allocations.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <div className="text-center">
          <div className="text-sm font-medium mb-1">No Sector Data</div>
          <div className="text-xs">Add sectors with percentages to see the visualization</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chart Container */}
      <div className="flex-1 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-4 flex justify-center shadow-sm hover:shadow-md transition-shadow duration-200">
        <svg ref={svgRef} className="w-full max-w-full h-full"></svg>
      </div>
    </div>
  );
}