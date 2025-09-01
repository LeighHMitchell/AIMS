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

interface PositionedNode extends SankeyNode {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  width: number;
  height: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color: string;
}

// Extended color palette for unique colors per segment (same as sunburst)
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

// Function to generate darker and lighter shades from a base color (same as sunburst)
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

// Function to generate multiple shades within the same color family for different ring levels (same as sunburst)
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
      // Each category gets its own base color from the same palette as sunburst
      const categoryBaseColor = BASE_COLORS[categoryIndex % BASE_COLORS.length];
      const categoryColorSet = generateShades(categoryBaseColor);
      
      nodes.push({
        id: `cat-${categoryCode}`,
        name: category.name,
        level: 'category',
        value: category.percentage,
        color: categoryColorSet.darker // Use darker shade for categories (same as sunburst inner ring)
      });

      links.push({
        source: 'root',
        target: `cat-${categoryCode}`,
        value: category.percentage,
        color: categoryColorSet.base
      });

      // Add sector nodes and links
      const sectors = Array.from(category.sectors.entries());
      sectors.forEach(([sectorCode, sector], sectorIndex) => {
        // Generate varied shade for sector within the same color family
        const sectorColor = generateVariedShades(categoryBaseColor, sectorIndex, sectors.length, 'sector');
        
        nodes.push({
          id: `sec-${sectorCode}`,
          name: sector.name,
          level: 'sector',
          value: sector.percentage,
          color: sectorColor
        });

        links.push({
          source: `cat-${categoryCode}`,
          target: `sec-${sectorCode}`,
          value: sector.percentage,
          color: sectorColor
        });

        // Add subsector nodes and links
        sector.subsectors.forEach((subsector, subsectorIndex) => {
          // Generate varied shade for subsector within the same color family
          const subsectorColor = generateVariedShades(categoryBaseColor, subsectorIndex, sector.subsectors.length, 'subsector');
          
          nodes.push({
            id: `sub-${subsector.code}`,
            name: subsector.name,
            level: 'subsector',
            value: subsector.percentage,
            color: subsectorColor
          });

          links.push({
            source: `sec-${sectorCode}`,
            target: `sub-${subsector.code}`,
            value: subsector.percentage,
            color: subsectorColor
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

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'absolute bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm pointer-events-none z-50')
      .style('opacity', 0);

    // Manual layout for Sankey-style positioning with proper flow conservation
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

    // Calculate total value for consistent scaling
    const totalValue = nodesByLevel.root[0]?.value || 100;
    const availableHeight = innerHeight - (nodePadding * Math.max(nodesByLevel.category.length, nodesByLevel.sector.length, nodesByLevel.subsector.length));
    const valueToHeightScale = availableHeight / totalValue;

    // Calculate positions for each level
    const positionedNodes: PositionedNode[] = [];

    // Position root node - height should match total outgoing flow
    nodesByLevel.root.forEach(node => {
      const nodeHeight = Math.max(40, node.value * valueToHeightScale);
      const positioned = {
        ...node,
        x0: 0,
        x1: nodeWidth,
        y0: (innerHeight - nodeHeight) / 2,
        y1: (innerHeight - nodeHeight) / 2 + nodeHeight,
        width: nodeWidth,
        height: nodeHeight
      };
      positionedNodes.push(positioned);
    });

    // Position category nodes - heights proportional to their values
    let categoryY = 0;
    nodesByLevel.category.forEach(node => {
      const nodeHeight = Math.max(20, node.value * valueToHeightScale);
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

    // Position sector nodes - heights proportional to their values
    let sectorY = 0;
    nodesByLevel.sector.forEach(node => {
      const nodeHeight = Math.max(15, node.value * valueToHeightScale);
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

    // Position subsector nodes - heights proportional to their values
    let subsectorY = 0;
    nodesByLevel.subsector.forEach(node => {
      const nodeHeight = Math.max(12, node.value * valueToHeightScale);
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

    // Helper function to get detailed node information for tooltips
    const getNodeDetails = (node: PositionedNode) => {
      if (node.id === 'root') {
        return {
          title: 'Total Budget',
          category: null,
          sector: null,
          subsector: null,
          level: 'Total',
          code: null
        };
      }

      const nodeId = node.id.replace(/^(cat-|sec-|sub-)/, '');
      
      if (node.id.startsWith('cat-')) {
        // Category node - find in sankeyData
        const categoryNode = sankeyData.nodes.find(n => n.id === `cat-${nodeId}`);
        return {
          title: categoryNode?.name || node.name,
          category: categoryNode?.name || node.name,
          sector: null,
          subsector: null,
          level: 'Sector Category',
          code: nodeId
        };
      } else if (node.id.startsWith('sec-')) {
        // Sector node - find parent category through links
        const sectorNode = sankeyData.nodes.find(n => n.id === `sec-${nodeId}`);
        const parentLink = sankeyData.links.find(l => l.target === `sec-${nodeId}`);
        const parentCategoryNode = parentLink ? sankeyData.nodes.find(n => n.id === parentLink.source) : null;
        
        return {
          title: sectorNode?.name || node.name,
          category: parentCategoryNode?.name || null,
          sector: sectorNode?.name || node.name,
          subsector: null,
          level: 'Sector',
          code: nodeId
        };
      } else if (node.id.startsWith('sub-')) {
        // Subsector node - find parent sector and category through links
        const subsectorNode = sankeyData.nodes.find(n => n.id === `sub-${nodeId}`);
        const parentSectorLink = sankeyData.links.find(l => l.target === `sub-${nodeId}`);
        const parentSectorNode = parentSectorLink ? sankeyData.nodes.find(n => n.id === parentSectorLink.source) : null;
        const parentCategoryLink = parentSectorNode ? sankeyData.links.find(l => l.target === parentSectorNode.id) : null;
        const parentCategoryNode = parentCategoryLink ? sankeyData.nodes.find(n => n.id === parentCategoryLink.source) : null;
        
        return {
          title: subsectorNode?.name || node.name,
          category: parentCategoryNode?.name || null,
          sector: parentSectorNode?.name || null,
          subsector: subsectorNode?.name || node.name,
          level: 'Sub-sector',
          code: nodeId
        };
      }
      
      return {
        title: node.name,
        category: null,
        sector: null,
        subsector: null,
        level: 'Unknown',
        code: node.id || ''
      };
    };


    // Calculate link positions for proper flow conservation
    const calculateLinkPositions = () => {
      const linkPositions = new Map();
      
      // Track cumulative heights for each node's incoming and outgoing flows
      const nodeIncomingY = new Map();
      const nodeOutgoingY = new Map();
      
      // Initialize positions
      positionedNodes.forEach(node => {
        nodeIncomingY.set(node.id, node.y0);
        nodeOutgoingY.set(node.id, node.y0);
      });
      
      return { nodeIncomingY, nodeOutgoingY };
    };
    
    const { nodeIncomingY, nodeOutgoingY } = calculateLinkPositions();

    // Custom link path generator with proper flow positioning
    const linkPath = (source: PositionedNode, target: PositionedNode, linkHeight: number, sourceY: number, targetY: number) => {
      const x0 = source.x1;
      const x1 = target.x0;
      const y0s = sourceY;
      const y0e = sourceY + linkHeight;
      const y1s = targetY;
      const y1e = targetY + linkHeight;
      
      const xi = d3.interpolateNumber(x0, x1);
      const x2 = xi(0.5);
      const x3 = xi(0.5);
      
      return `M${x0},${y0s}C${x2},${y0s} ${x3},${y1s} ${x1},${y1s}L${x1},${y1e}C${x3},${y1e} ${x2},${y0e} ${x0},${y0e}Z`;
    };

    // Draw links first (so they appear behind nodes)
    const linkGroup = g.append('g')
      .attr('fill-opacity', 0.6)
      .attr('stroke', 'none');

    sankeyData.links.forEach((link, i) => {
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      
      if (!source || !target) return;

      // Calculate link height based on the same scale as nodes
      const linkHeight = Math.max(2, link.value * valueToHeightScale);
      
      // Get current positions for source outgoing and target incoming
      const sourceY = nodeOutgoingY.get(source.id);
      const targetY = nodeIncomingY.get(target.id);
      
      // Update positions for next links
      nodeOutgoingY.set(source.id, sourceY + linkHeight);
      nodeIncomingY.set(target.id, targetY + linkHeight);
      
      // Create gradient for each link
      const gradientId = `gradient-${i}`;
      const gradient = svg.append('defs').append('linearGradient')
        .attr('id', gradientId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', source.x1)
        .attr('x2', target.x0);

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', source.color);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', target.color);

      // Draw the link path with proper flow conservation
      linkGroup.append('path')
        .attr('d', linkPath(source, target, linkHeight, sourceY, targetY))
        .attr('fill', `url(#${gradientId})`)
        .style('cursor', 'pointer')
        .on('mouseover', function(event) {
          d3.select(this).attr('fill-opacity', 0.9);
          
          tooltip.style('opacity', 1);
          
          const sourceDetails = getNodeDetails(source);
          const targetDetails = getNodeDetails(target);
          
          tooltip.html(`
            <div class="font-semibold">${sourceDetails.code && sourceDetails.code.trim() ? `<span class="font-mono">${sourceDetails.code}</span> - ` : ''}${sourceDetails.title} → ${targetDetails.code && targetDetails.code.trim() ? `<span class="font-mono">${targetDetails.code}</span> - ` : ''}${targetDetails.title}</div>
            <div class="text-lg font-bold text-gray-300">${format(link.value)}%</div>
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this).attr('fill-opacity', 0.6);
          
          tooltip.style('opacity', 0);
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
      .attr('fill', d => d.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('rx', 3)
      .attr('ry', 3)
              .on('mouseover', function(event, d) {
        d3.select(this).style('filter', 'brightness(1.2)');
        
        tooltip.style('opacity', 1);
        
        const details = getNodeDetails(d);
        let hierarchyHtml = '';
        
        // Build hierarchy display with codes in monotype font
        if (details.category) {
          hierarchyHtml += `<div class="text-xs text-blue-200 mb-1">Category: <span class="font-mono">${details.code}</span> - ${details.category}</div>`;
        }
        if (details.sector) {
          hierarchyHtml += `<div class="text-xs text-green-200 mb-1">Sector: <span class="font-mono">${details.code}</span> - ${details.sector}</div>`;
        }
        if (details.subsector) {
          hierarchyHtml += `<div class="text-xs text-yellow-200 mb-1">Sub-sector: <span class="font-mono">${details.code}</span> - ${details.subsector}</div>`;
        }
        
        tooltip.html(`
          <div class="font-semibold">${details.code && details.code.trim() ? `<span class="font-mono">${details.code}</span> - ` : ''}${details.title}</div>
          <div class="text-lg font-bold mt-2 text-gray-300">${format(d.value)}%</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).style('filter', 'none');
        
        tooltip.style('opacity', 0);
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
