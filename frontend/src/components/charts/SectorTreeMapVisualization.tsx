'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
// @ts-ignore
import sectorGroupData from '@/data/SectorGroup.json';

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

interface TreeMapNode {
  name: string;
  code: string;
  value: number;
  level: 'category' | 'sector' | 'subsector';
  color: string;
  children?: TreeMapNode[];
}

// Generate colors for categories
const generateCategoryColor = (index: number, total: number) => {
  const hue = (index * 360) / total;
  return d3.hsl(hue, 0.7, 0.6).toString();
};

// Generate lighter shades for subcategories
const generateSubColor = (baseColor: string, level: number) => {
  const color = d3.hsl(baseColor);
  color.l = Math.min(0.9, color.l + (level * 0.15));
  return color.toString();
};

export default function SectorTreeMapVisualization({ 
  allocations, 
  onSegmentClick, 
  className = '' 
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Build hierarchy data for tree map
  const hierarchyData = useMemo(() => {
    console.log('Processing allocations for TreeMap:', allocations);
    
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

      const categoryCode = sectorData['codeforiati:group-code'];
      const categoryName = sectorData['codeforiati:group-name'];
      const sectorCode = sectorData['codeforiati:category-code'];
      const sectorName = sectorData['codeforiati:category-name'];

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

    return categoryMap;
  }, [allocations]);

  // Convert to D3 hierarchy format
  const treeMapData = useMemo(() => {
    const categories = Array.from(hierarchyData.entries());
    const categoryColors = categories.map((_, index) => 
      generateCategoryColor(index, categories.length)
    );

    const children: TreeMapNode[] = categories.map(([categoryCode, category], categoryIndex) => {
      const baseColor = categoryColors[categoryIndex];
      
      const sectorChildren: TreeMapNode[] = Array.from(category.sectors.entries()).map(([sectorCode, sector], sectorIndex) => {
        const sectorColor = generateSubColor(baseColor, 1);
        
        const subsectorChildren: TreeMapNode[] = sector.subsectors.map((subsector, subsectorIndex) => ({
          name: `${subsector.code}\n${subsector.name}`,
          code: subsector.code,
          value: subsector.percentage,
          level: 'subsector' as const,
          color: generateSubColor(baseColor, 2)
        }));

        return {
          name: `${sector.code}\n${sector.name}`,
          code: sector.code,
          value: sector.percentage,
          level: 'sector' as const,
          color: sectorColor,
          children: subsectorChildren
        };
      });

      return {
        name: `${category.code}\n${category.name}`,
        code: category.code,
        value: category.percentage,
        level: 'category' as const,
        color: baseColor,
        children: sectorChildren
      };
    });

    return {
      name: 'Root',
      code: 'root',
      value: 0,
      level: 'category' as const,
      color: '#000',
      children
    };
  }, [hierarchyData]);

  // Handle container resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setContainerSize({ width: Math.max(400, width), height: Math.max(300, height) });
      }
    });

    if (svgRef.current?.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Render beautiful 3-tiered nested treemap
  useEffect(() => {
    if (!svgRef.current || !treeMapData.children?.length) return;

    console.log('Rendering 3-tiered TreeMap with data:', treeMapData);

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    const width = containerSize.width;
    const height = containerSize.height;

    // Color scale based on categories
    const categoryNames = treeMapData.children?.map(d => d.name.split('\n')[0]) || [];
    const color = d3.scaleOrdinal(categoryNames, d3.schemeSet3);

    // Create hierarchy
    const root = d3.hierarchy(treeMapData)
      .sum(d => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Treemap with proper nested padding
    const treemap = d3.treemap<TreeMapNode>()
      .tile(d3.treemapSquarify)
      .size([width, height])
      .paddingOuter(6)        // Outer padding around entire treemap
      .paddingTop(28)         // Extra space for category labels
      .paddingInner(d => d.depth === 1 ? 4 : 2) // More space between categories, less between sectors
      .round(true);

    treemap(root);

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .attr('width', width)
      .attr('height', height)
      .style('max-width', '100%')
      .style('height', 'auto')
      .style('font-family', 'system-ui, -apple-system, sans-serif');

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'absolute invisible bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm pointer-events-none z-50')
      .style('opacity', 0);

    const format = d3.format(',.1f');

    // Create groups for all nodes
    const node = svg.selectAll('g')
      .data(root.descendants().filter(d => d.depth > 0)) // Skip root
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Add rectangles with depth-based styling
    node.append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => {
        if (d.depth === 1) {
          // Category - very light background
          return d3.color(color(d.data.name.split('\n')[0]))?.brighter(2.5).toString() || '#f8fafc';
        }
        if (d.depth === 2) {
          // Sector - medium background
          const categoryNode = d.parent!;
          return d3.color(color(categoryNode.data.name.split('\n')[0]))?.brighter(1.2).toString() || '#e2e8f0';
        }
        // Subsector - full color
        const categoryNode = d.ancestors()[d.ancestors().length - 2];
        return color(categoryNode.data.name.split('\n')[0]);
      })
      .attr('stroke', d => {
        if (d.depth === 1) return '#cbd5e1'; // Light gray for categories
        if (d.depth === 2) return '#94a3b8'; // Medium gray for sectors
        return '#ffffff'; // White for subsectors
      })
      .attr('stroke-width', d => {
        if (d.depth === 1) return 3; // Thick borders for categories
        if (d.depth === 2) return 2; // Medium borders for sectors
        return 1.5; // Thin borders for subsectors
      })
      .attr('rx', d => d.depth === 3 ? 4 : 2) // Rounded corners for subsectors
      .attr('ry', d => d.depth === 3 ? 4 : 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        // Highlight effect
        d3.select(this)
          .style('filter', 'brightness(1.1)')
          .attr('stroke-width', d => d.depth === 1 ? 4 : d.depth === 2 ? 3 : 2);
        
        tooltip.transition()
          .duration(200)
          .style('opacity', .95);
        
        const nameParts = d.data.name.split('\n');
        const code = nameParts[0];
        const name = nameParts[1] || nameParts[0];
        const levelName = d.depth === 1 ? 'Category' : d.depth === 2 ? 'Sector' : 'Subsector';
        
        // Show hierarchy path
        const path = d.ancestors().reverse().slice(1).map(node => {
          const parts = node.data.name.split('\n');
          return parts[0];
        }).join(' → ');
        
        tooltip.html(`
          <div class="font-semibold text-white">${code}</div>
          <div class="text-sm mt-1 text-gray-200">${name}</div>
          <div class="text-xs mt-1 text-blue-300">${levelName}</div>
          <div class="text-xs mt-1 text-gray-400">${path}</div>
          <div class="text-lg font-bold mt-2 text-green-300">${format(d.data.value)}%</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .style('filter', 'none')
          .attr('stroke-width', d => d.depth === 1 ? 3 : d.depth === 2 ? 2 : 1.5);
        
        tooltip.transition()
          .duration(300)
          .style('opacity', 0);
      })
      .on('click', function(event, d) {
        if (onSegmentClick) {
          onSegmentClick(d.data.code, d.data.level);
        }
      });

    // Add native tooltips
    node.append('title')
      .text(d => {
        const path = d.ancestors().reverse().slice(1).map(node => {
          const parts = node.data.name.split('\n');
          return parts[0];
        }).join(' → ');
        return `${path}\n${format(d.data.value)}%`;
      });

    // Add category labels (depth 1)
    node.filter(d => d.depth === 1)
      .append('text')
      .attr('x', 8)
      .attr('y', 20)
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1f2937')
      .text(d => {
        const nameParts = d.data.name.split('\n');
        const code = nameParts[0];
        const name = nameParts[1] || '';
        const rectWidth = d.x1 - d.x0;
        
        if (rectWidth > 200 && name) {
          const truncatedName = name.length > 25 ? name.substring(0, 22) + '...' : name;
          return `${code} - ${truncatedName}`;
        }
        return code;
      })
      .style('pointer-events', 'none');

    // Add sector labels (depth 2) - only for larger sectors
    node.filter(d => d.depth === 2)
      .each(function(d) {
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        
        // Only add labels for sectors large enough
        if (rectWidth > 100 && rectHeight > 40) {
          const g = d3.select(this);
          const nameParts = d.data.name.split('\n');
          const code = nameParts[0];
          
          g.append('text')
            .attr('x', 6)
            .attr('y', 16)
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#374151')
            .text(code)
            .style('pointer-events', 'none');
        }
      });

    // Add subsector labels (depth 3) - the main data
    node.filter(d => d.depth === 3)
      .each(function(d) {
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        const area = rectWidth * rectHeight;
        
        // Only add text if rectangle is large enough
        if (area < 1500) return;
        
        const g = d3.select(this);
        const nameParts = d.data.name.split('\n');
        const code = nameParts[0];
        const name = nameParts[1] || '';
        const percentage = format(d.data.value) + '%';
        
        let fontSize = area > 8000 ? '12px' : area > 4000 ? '11px' : '10px';
        let yOffset = 14;
        
        // Sector code (always shown)
        g.append('text')
          .attr('x', rectWidth / 2)
          .attr('y', yOffset)
          .attr('text-anchor', 'middle')
          .attr('font-size', fontSize)
          .attr('font-weight', 'bold')
          .attr('fill', '#ffffff')
          .attr('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))')
          .text(code)
          .style('pointer-events', 'none');
        
        yOffset += parseInt(fontSize) + 2;
        
        // Percentage (if space allows)
        if (rectHeight > 35) {
          g.append('text')
            .attr('x', rectWidth / 2)
            .attr('y', yOffset)
            .attr('text-anchor', 'middle')
            .attr('font-size', fontSize)
            .attr('font-weight', '600')
            .attr('fill', '#ffffff')
            .attr('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))')
            .text(percentage)
            .style('pointer-events', 'none');
          
          yOffset += parseInt(fontSize) + 2;
        }
        
        // Name (only for larger rectangles)
        if (rectHeight > 55 && rectWidth > 80 && name && area > 6000) {
          const maxChars = Math.floor(rectWidth / 7);
          const truncatedName = name.length > maxChars ? name.substring(0, maxChars - 3) + '...' : name;
          
          g.append('text')
            .attr('x', rectWidth / 2)
            .attr('y', yOffset)
            .attr('text-anchor', 'middle')
            .attr('font-size', '9px')
            .attr('fill', '#f3f4f6')
            .attr('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))')
            .text(truncatedName)
            .style('pointer-events', 'none');
        }
      });

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };

  }, [treeMapData, containerSize, onSegmentClick]);

  if (allocations.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 text-gray-500 ${className}`}>
        <div className="text-center">
          <div className="text-lg font-medium">No sector data available</div>
          <div className="text-sm mt-1">Add sector allocations to see the tree map visualization</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-96 ${className}`}>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
