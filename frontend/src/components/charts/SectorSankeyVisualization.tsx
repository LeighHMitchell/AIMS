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

interface SankeyNode {
  id: string;
  name: string;
  level: 'category' | 'sector' | 'subsector';
  value: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color: string;
}

// Generate colors for categories
const generateCategoryColor = (index: number, total: number) => {
  const hue = (index * 360) / total;
  return d3.hsl(hue, 0.7, 0.6).toString();
};

// Generate lighter shades for subcategories
const generateSubColor = (baseColor: string, opacity: number = 0.6) => {
  const color = d3.hsl(baseColor);
  return `${color.toString()}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

export default function SectorSankeyVisualization({ 
  allocations, 
  onSegmentClick, 
  className = '' 
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Build hierarchy data for Sankey
  const sankeyData = useMemo(() => {
    console.log('Processing allocations for Sankey:', allocations);
    
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

    // Convert to Sankey format
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];
    
    const categories = Array.from(categoryMap.entries());
    const categoryColors = categories.map((_, index) => 
      generateCategoryColor(index, categories.length)
    );

    // Add root node
    nodes.push({
      id: 'root',
      name: 'Total Budget',
      level: 'category',
      value: allocations.reduce((sum, a) => sum + a.percentage, 0),
      color: '#6b7280'
    });

    // Add category nodes and links
    categories.forEach(([categoryCode, category], categoryIndex) => {
      const baseColor = categoryColors[categoryIndex];
      
      nodes.push({
        id: `cat-${categoryCode}`,
        name: category.name,
        level: 'category',
        value: category.percentage,
        color: baseColor
      });

      links.push({
        source: 'root',
        target: `cat-${categoryCode}`,
        value: category.percentage,
        color: generateSubColor(baseColor, 0.4)
      });

      // Add sector nodes and links
      Array.from(category.sectors.entries()).forEach(([sectorCode, sector]) => {
        nodes.push({
          id: `sec-${sectorCode}`,
          name: sector.name,
          level: 'sector',
          value: sector.percentage,
          color: generateSubColor(baseColor, 0.8)
        });

        links.push({
          source: `cat-${categoryCode}`,
          target: `sec-${sectorCode}`,
          value: sector.percentage,
          color: generateSubColor(baseColor, 0.3)
        });

        // Add subsector nodes and links
        sector.subsectors.forEach(subsector => {
          nodes.push({
            id: `sub-${subsector.code}`,
            name: subsector.name,
            level: 'subsector',
            value: subsector.percentage,
            color: generateSubColor(baseColor, 1.0)
          });

          links.push({
            source: `sec-${sectorCode}`,
            target: `sub-${subsector.code}`,
            value: subsector.percentage,
            color: generateSubColor(baseColor, 0.2)
          });
        });
      });
    });

    return { nodes, links };
  }, [allocations]);

  // Handle container resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setContainerSize({ width: Math.max(600, width), height: Math.max(400, height) });
      }
    });

    if (svgRef.current?.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Render custom Sankey-style flow diagram
  useEffect(() => {
    if (!svgRef.current || !sankeyData.nodes.length) return;

    console.log('Rendering custom Sankey with data:', sankeyData);

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    const width = containerSize.width;
    const height = containerSize.height;
    const format = d3.format(',.1f');
    const margin = { top: 20, right: 80, bottom: 20, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .style('max-width', '100%')
      .style('height', 'auto')
      .style('font-family', 'system-ui, -apple-system, sans-serif');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'absolute invisible bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm pointer-events-none z-50')
      .style('opacity', 0);

    // Manual layout for Sankey-style positioning
    const nodeWidth = 20;
    const nodePadding = 8;
    const levelCount = 4; // root, category, sector, subsector
    const levelWidth = innerWidth / (levelCount - 1);

    // Group nodes by level
    const nodesByLevel = {
      root: sankeyData.nodes.filter(n => n.id === 'root'),
      category: sankeyData.nodes.filter(n => n.level === 'category' && n.id !== 'root'),
      sector: sankeyData.nodes.filter(n => n.level === 'sector'),
      subsector: sankeyData.nodes.filter(n => n.level === 'subsector')
    };

    // Calculate positions for each level
    const positionedNodes = [];

    // Position root node
    nodesByLevel.root.forEach(node => {
      const positioned = {
        ...node,
        x0: 0,
        x1: nodeWidth,
        y0: innerHeight / 2 - 30,
        y1: innerHeight / 2 + 30,
        width: nodeWidth,
        height: 60
      };
      positionedNodes.push(positioned);
    });

    // Position category nodes
    const totalCategoryValue = nodesByLevel.category.reduce((sum, n) => sum + n.value, 0);
    let categoryY = 0;
    nodesByLevel.category.forEach(node => {
      const nodeHeight = Math.max(20, (node.value / totalCategoryValue) * innerHeight * 0.8);
      const positioned = {
        ...node,
        x0: levelWidth,
        x1: levelWidth + nodeWidth,
        y0: categoryY,
        y1: categoryY + nodeHeight,
        width: nodeWidth,
        height: nodeHeight
      };
      positionedNodes.push(positioned);
      categoryY += nodeHeight + nodePadding;
    });

    // Position sector nodes
    const totalSectorValue = nodesByLevel.sector.reduce((sum, n) => sum + n.value, 0);
    let sectorY = 0;
    nodesByLevel.sector.forEach(node => {
      const nodeHeight = Math.max(15, (node.value / totalSectorValue) * innerHeight * 0.7);
      const positioned = {
        ...node,
        x0: levelWidth * 2,
        x1: levelWidth * 2 + nodeWidth,
        y0: sectorY,
        y1: sectorY + nodeHeight,
        width: nodeWidth,
        height: nodeHeight
      };
      positionedNodes.push(positioned);
      sectorY += nodeHeight + nodePadding;
    });

    // Position subsector nodes
    const totalSubsectorValue = nodesByLevel.subsector.reduce((sum, n) => sum + n.value, 0);
    let subsectorY = 0;
    nodesByLevel.subsector.forEach(node => {
      const nodeHeight = Math.max(12, (node.value / totalSubsectorValue) * innerHeight * 0.6);
      const positioned = {
        ...node,
        x0: levelWidth * 3,
        x1: levelWidth * 3 + nodeWidth,
        y0: subsectorY,
        y1: subsectorY + nodeHeight,
        width: nodeWidth,
        height: nodeHeight
      };
      positionedNodes.push(positioned);
      subsectorY += nodeHeight + nodePadding;
    });

    // Create a map for quick node lookup
    const nodeMap = new Map(positionedNodes.map(n => [n.id, n]));

    // Custom link path generator
    const linkPath = (source, target) => {
      const x0 = source.x1;
      const x1 = target.x0;
      const y0 = source.y0 + source.height / 2;
      const y1 = target.y0 + target.height / 2;
      const xi = d3.interpolateNumber(x0, x1);
      const x2 = xi(0.5);
      const x3 = xi(0.5);
      return `M${x0},${y0}C${x2},${y0} ${x3},${y1} ${x1},${y1}`;
    };

    // Draw links first (so they appear behind nodes)
    const linkGroup = g.append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.6);

    sankeyData.links.forEach((link, i) => {
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      
      if (!source || !target) return;

      const linkWidth = Math.max(2, (link.value / 100) * 40);
      
      // Create gradient for each link
      const gradientId = `gradient-${i}`;
      const gradient = svg.append('defs').append('linearGradient')
        .attr('id', gradientId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', source.x1)
        .attr('x2', target.x0);

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color(source.level));

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color(target.level));

      // Draw the link path
      linkGroup.append('path')
        .attr('d', linkPath(source, target))
        .attr('stroke', `url(#${gradientId})`)
        .attr('stroke-width', linkWidth)
        .style('cursor', 'pointer')
        .on('mouseover', function(event) {
          d3.select(this).attr('stroke-opacity', 0.9);
          
          tooltip.transition()
            .duration(200)
            .style('opacity', .95);
          
          tooltip.html(`
            <div class="font-semibold text-white">${source.name} → ${target.name}</div>
            <div class="text-sm mt-1 text-blue-200">${format(link.value)}%</div>
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this).attr('stroke-opacity', 0.6);
          
          tooltip.transition()
            .duration(300)
            .style('opacity', 0);
        });
    });

    // Draw nodes
    const nodeGroup = g.selectAll('.node')
      .data(positionedNodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer');

    // Add node rectangles
    nodeGroup.append('rect')
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('fill', d => color(d.level))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('rx', 3)
      .attr('ry', 3)
      .on('mouseover', function(event, d) {
        d3.select(this).style('filter', 'brightness(1.2)');
        
        tooltip.transition()
          .duration(200)
          .style('opacity', .95);
        
        tooltip.html(`
          <div class="font-semibold text-white">${d.name}</div>
          <div class="text-sm mt-1 text-blue-200">${d.level}</div>
          <div class="text-lg font-bold mt-2 text-green-300">${format(d.value)}%</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).style('filter', 'none');
        
        tooltip.transition()
          .duration(300)
          .style('opacity', 0);
      })
      .on('click', function(event, d) {
        if (onSegmentClick && d.id !== 'root') {
          const code = d.id.replace(/^(cat-|sec-|sub-)/, '');
          const level = d.level === 'category' ? 'category' : 
                      d.level === 'sector' ? 'sector' : 'subsector';
          onSegmentClick(code, level);
        }
      });

    // Add node labels
    nodeGroup.append('text')
      .attr('x', d => d.x0 < innerWidth / 2 ? d.width + 8 : -8)
      .attr('y', d => d.height / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => d.x0 < innerWidth / 2 ? 'start' : 'end')
      .attr('font-size', d => d.level === 'subsector' ? '10px' : '11px')
      .attr('font-weight', d => d.level === 'category' ? 'bold' : 'normal')
      .attr('fill', '#374151')
      .text(d => {
        const maxLength = d.x0 < innerWidth / 2 ? 20 : 15;
        return d.name.length > maxLength ? d.name.substring(0, maxLength) + '...' : d.name;
      })
      .style('pointer-events', 'none');

    // Add native tooltips
    nodeGroup.append('title')
      .text(d => `${d.name}\n${d.level}\n${format(d.value)}%`);

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };

  }, [sankeyData, containerSize, onSegmentClick]);

  if (allocations.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 text-gray-500 ${className}`}>
        <div className="text-center">
          <div className="text-lg font-medium">No sector data available</div>
          <div className="text-sm mt-1">Add sector allocations to see the Sankey flow visualization</div>
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
