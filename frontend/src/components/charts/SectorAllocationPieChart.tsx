'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { LoadingText } from '@/components/ui/loading-text';
import { getSectorLabel, getSectorDescription } from '@/components/forms/SimpleSectorSelect';
import dacSectorsData from '@/data/dac-sectors.json';

interface SectorAllocation {
  id: string;
  code: string;
  name?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const renderCount = useRef(0);
  
  renderCount.current += 1;
  
  console.log(`SectorAllocationPieChart rendered (render #${renderCount.current}) with allocations:`, allocations);
  console.log('SectorAllocationPieChart - svgRef.current:', svgRef.current);
  console.log('SectorAllocationPieChart - isLoading:', isLoading);
  
  // Transform allocations into hierarchical data for treemap
  const treemapData = useMemo(() => {
    console.log('=== useMemo triggered ===');
    console.log('Processing treemap data with allocations:', allocations);
    const categoryLookup = createCategoryLookup();
    
    if (allocations.length === 0) {
      console.log('No allocations, returning null');
      return null;
    }
    
    // Group sectors by category
    const categoryMap = new Map<string, any[]>();
    
    allocations
      .filter(allocation => allocation.percentage > 0)
      .forEach(allocation => {
        try {
          const fullLabel = getSectorLabel(allocation.code);
          const description = getSectorDescription(allocation.code);
          
          // Extract category code (first 3 digits) and sector name
          const categoryCode = allocation.code.substring(0, 3);
          
          // Use the name from allocation if available, otherwise extract from label
          let sectorName = allocation.name;
          if (!sectorName) {
            const sectorNameMatch = fullLabel.match(/\d{5}\s*-\s*(.+)$/);
            sectorName = sectorNameMatch ? sectorNameMatch[1] : fullLabel;
          }
          
          // Fallback if name is still empty
          if (!sectorName) {
            sectorName = allocation.code;
          }
          
          const sectorNode = {
            name: sectorName,
            value: allocation.percentage,
            code: allocation.code,
            category: categoryCode,
            description
          };
          
          console.log('Created sector node:', sectorNode);
          
          if (!categoryMap.has(categoryCode)) {
            categoryMap.set(categoryCode, []);
          }
          categoryMap.get(categoryCode)!.push(sectorNode);
        } catch (error) {
          console.error('Error processing allocation:', allocation, error);
          // Create a fallback node
          const sectorNode = {
            name: allocation.name || allocation.code,
            value: allocation.percentage,
            code: allocation.code,
            category: allocation.code.substring(0, 3),
            description: ''
          };
          
          const categoryCode = allocation.code.substring(0, 3);
          if (!categoryMap.has(categoryCode)) {
            categoryMap.set(categoryCode, []);
          }
          categoryMap.get(categoryCode)!.push(sectorNode);
        }
      });
    
    console.log('Category map:', categoryMap);
    
    // Create hierarchical structure
    const children = Array.from(categoryMap.entries()).map(([categoryCode, sectors]) => {
      const categoryName = categoryLookup[categoryCode] || `Category ${categoryCode}`;
      return {
        name: categoryName,
        code: categoryCode,
        children: sectors
      };
    });
    
    const result = {
      name: 'Sectors',
      children
    };
    
    console.log('Final treemap data:', result);
    return result;
  }, [allocations]);

  // Force D3 rendering on every render when we have data
  useEffect(() => {
    console.log('=== FORCE RENDER useEffect triggered ===');
    console.log('Render count:', renderCount.current);
    console.log('useEffect triggered with treemapData:', treemapData);
    console.log('svgRef.current:', svgRef.current);
    console.log('svgRef.current?.parentElement:', svgRef.current?.parentElement);
    console.log('svgRef.current?.parentElement?.clientWidth:', svgRef.current?.parentElement?.clientWidth);
    console.log('svgRef.current?.parentElement?.clientHeight:', svgRef.current?.parentElement?.clientHeight);
    
    if (!svgRef.current || !treemapData) {
      console.log('Early return - no svgRef or treemapData');
      setIsLoading(false);
      return;
    }

    console.log('Starting treemap rendering...');
    setIsLoading(true);

    try {
      // Clear previous content
      d3.select(svgRef.current).selectAll('*').remove();

      // Get container dimensions with better proportions
      const containerWidth = svgRef.current.parentElement?.clientWidth || 800;
      const containerHeight = svgRef.current.parentElement?.clientHeight || 600;
      
      // Ensure we have valid dimensions
      let width, height;
      if (containerWidth <= 0 || containerHeight <= 0) {
        console.log('Container has invalid dimensions, using defaults');
        width = 800;
        height = 600;
      } else {
        width = Math.max(containerWidth, 400); // Ensure minimum width
        height = Math.max(containerHeight, 300); // Ensure minimum height
      }
      
      console.log('Treemap dimensions:', { width, height, containerWidth, containerHeight });
      console.log('Treemap data:', treemapData);
      
      // Reduced margins for better space utilization
      const margin = { top: 10, right: 10, bottom: 10, left: 10 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      // Create hierarchy and calculate values
      const root = d3.hierarchy(treemapData)
        .sum((d: any) => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      console.log('D3 hierarchy root:', root);

      // Create treemap layout with reduced padding for better space utilization
      const treemap = d3.treemap<any>()
        .size([innerWidth, innerHeight])
        .paddingOuter(2)  // Reduced from 6
        .paddingInner(2)  // Reduced from 4
        .paddingTop(20)   // Reduced from 25
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

      console.log('Leaf nodes:', root.leaves());

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
        .attr('stroke-width', 1)  // Reduced from 2
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

      // Add clipPath for each leaf to prevent text overflow
      leaf.append('clipPath')
        .attr('id', (d: any, i: number) => `leaf-clip-${i}`)
        .append('rect')
        .attr('x', 4)
        .attr('y', 4)
        .attr('width', (d: any) => Math.max(0, d.x1 - d.x0 - 8))
        .attr('height', (d: any) => Math.max(0, d.y1 - d.y0 - 8))
        .attr('rx', 2);

      // Add text labels for larger rectangles with full sector names (clipped)
      leaf.append('text')
        .attr('clip-path', (d: any, i: number) => `url(#leaf-clip-${i})`)
        .attr('x', 6)
        .attr('y', 18)
        .text((d: any) => {
          const width = d.x1 - d.x0;
          const height = d.y1 - d.y0;
          // More conservative size check for cross-browser compatibility
          if (width > 120 && height > 35) {
            // Truncate name if it's too long for the available width
            const maxChars = Math.floor((width - 12) / 7); // ~7px per char average
            const name = d.data.name;
            return name.length > maxChars ? name.substring(0, maxChars - 1) + '…' : name;
          }
          return '';
        })
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', 'white')
        .attr('text-anchor', 'start')
        .style('text-shadow', '0 1px 2px rgba(0,0,0,0.3)')
        .style('font-family', 'system-ui, -apple-system, sans-serif');

      // Add percentage labels for larger rectangles (clipped)
      leaf.append('text')
        .attr('clip-path', (d: any, i: number) => `url(#leaf-clip-${i})`)
        .attr('x', 6)
        .attr('y', 32)
        .text((d: any) => {
          const width = d.x1 - d.x0;
          const height = d.y1 - d.y0;
          // More conservative size check
          if (width > 100 && height > 45) {
            return `${d.data.value.toFixed(1)}%`;
          }
          return '';
        })
        .attr('font-size', '10px')
        .attr('fill', 'white')
        .attr('opacity', 0.9)
        .attr('text-anchor', 'start')
        .style('text-shadow', '0 1px 2px rgba(0,0,0,0.3)')
        .style('font-family', 'system-ui, -apple-system, sans-serif');

      // Draw category boundaries with reduced opacity
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
        .attr('stroke-width', 2)  // Reduced from 3
        .attr('opacity', 0.4);    // Reduced from 0.6

      // Add clipPath for each category to prevent text overflow
      categoryGroups.append('clipPath')
        .attr('id', (d: any, i: number) => `category-clip-${i}`)
        .append('rect')
        .attr('x', (d: any) => d.x0 + 2)
        .attr('y', (d: any) => d.y0 + 2)
        .attr('width', (d: any) => Math.max(0, d.x1 - d.x0 - 4))
        .attr('height', (d: any) => Math.max(0, d.y1 - d.y0 - 4));

      // Category labels with full names (clipped)
      categoryGroups.append('text')
        .attr('clip-path', (d: any, i: number) => `url(#category-clip-${i})`)
        .attr('x', (d: any) => d.x0 + 4)
        .attr('y', (d: any) => d.y0 + 14)
        .text((d: any) => {
          const width = d.x1 - d.x0;
          const height = d.y1 - d.y0;
          // More conservative size check for cross-browser compatibility
          if (width > 140 && height > 55) {
            // Truncate name if needed
            const maxChars = Math.floor((width - 8) / 7);
            const name = d.data.name;
            return name.length > maxChars ? name.substring(0, maxChars - 1) + '…' : name;
          }
          return '';
        })
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('fill', '#333')
        .attr('text-anchor', 'start')
        .style('font-family', 'system-ui, -apple-system, sans-serif');

      console.log('Treemap rendering completed successfully');
      // Set loading to false after rendering
      setTimeout(() => setIsLoading(false), 100);

      // Cleanup tooltip on unmount
      return () => {
        tooltip.remove();
      };
    } catch (error) {
      console.error('Error rendering treemap:', error);
      setIsLoading(false);
      
      // Render a simple fallback visualization
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove();
        
        const svg = d3.select(svgRef.current)
          .attr('width', 400)
          .attr('height', 300);
        
        const g = svg.append('g')
          .attr('transform', 'translate(20,20)');
        
        // Simple bar chart fallback
        const barWidth = 360 / allocations.length;
        allocations.forEach((allocation, i) => {
          const barHeight = (allocation.percentage / 100) * 200;
          g.append('rect')
            .attr('x', i * barWidth)
            .attr('y', 200 - barHeight)
            .attr('width', barWidth - 2)
            .attr('height', barHeight)
            .attr('fill', SECTOR_COLORS[i % SECTOR_COLORS.length])
            .attr('rx', 2);
          
          g.append('text')
            .attr('x', i * barWidth + barWidth / 2)
            .attr('y', 220)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .text(allocation.code);
        });
      }
    }
  }, [treemapData, allocations]); // Removed dependencies to force it to run on every render

  // Loading state with skeleton
  if (isLoading) {
    console.log('Rendering loading skeleton');
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 flex items-center justify-center">
          <div className="h-full flex items-center justify-center"><LoadingText>Loading...</LoadingText></div>
        </div>
      </div>
    );
  }

  if (!treemapData || allocations.length === 0) {
    console.log('Rendering no data message');
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm font-medium mb-1 text-gray-500">No Sector Data</div>
            <div className="text-xs text-gray-400">Add sectors with percentages to see the visualization</div>
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering treemap SVG');
  return (
    <div className="h-full flex flex-col">
      {/* Chart Container - removed padding for better space utilization */}
      <div className="flex-1 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 flex justify-center shadow-sm hover:shadow-md transition-shadow duration-200">
        <svg 
          ref={svgRef} 
          className="w-full h-full"
          width="100%"
          height="100%"
          key={`treemap-${allocations.length}-${allocations.map(a => `${a.code}-${a.percentage}`).join('-')}`}
        ></svg>
      </div>
    </div>
  );
}