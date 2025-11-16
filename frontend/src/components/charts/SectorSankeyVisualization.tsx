'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
// @ts-ignore
import sectorGroupData from '@/data/SectorGroup.json';
import { Button } from '@/components/ui/button';
import { Download, GitBranch, Table as TableIcon, PieChart, BarChart3 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportToCSV } from '@/lib/csv-export';
import { exportChartToJPG } from '@/lib/chart-export';

// User's simplified data structure
interface SectorAllocation {
  code: string;
  name: string;
  percentage: number;
}

interface SectorFinancialData {
  code: string;
  budget?: number;
  commitment?: number;
  plannedDisbursement?: number;
  actualDisbursement?: number;
}

interface Props {
  allocations: SectorAllocation[];
  financialData?: SectorFinancialData[];
  onSegmentClick?: (code: string, level: 'category' | 'sector' | 'subsector') => void;
  className?: string;
  showControls?: boolean; // Whether to show view mode and metric controls
  defaultView?: ViewMode; // Default view mode
  defaultMetric?: MetricMode; // Default metric mode
}

interface CustomSankeyNode {
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

interface PositionedNode extends CustomSankeyNode {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  width: number;
  height: number;
}

interface CustomSankeyLink {
  source: string;
  target: string;
  value: number;
  color: string;
}

type ViewMode = 'sankey' | 'table' | 'pie' | 'bar';
type MetricMode = 'percentage' | 'budget' | 'planned' | 'actual';

// Extended color palette for unique colors per segment (same as sunburst)
const BASE_COLORS = [
  '#E3120B', '#006BA2', '#3EBCD2', '#379A8B', '#EBB434', '#B4BA39', '#9A607F', '#D1B07C',
  '#FF6B6C', '#1270A8', '#25ADC2', '#4DAD9E', '#C89608', '#9DA521', '#C98CAC', '#FFC2E3',
  '#C7303C', '#00588D', '#0092A7', '#00786B', '#8D6300', '#667100', '#925977', '#826636',
  '#DB444B', '#0C4A6E', '#0E7490', '#065F46', '#A16207', '#4D7C0F', '#7C2D12', '#92400E',
  '#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#FB7185', '#38BDF8', '#4ADE80',
  '#EF4444', '#3B82F6', '#64748b', '#475569', '#8B5CF6', '#EC4899', '#06B6D4', '#22C55E',
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
  financialData = [],
  onSegmentClick,
  className = '',
  showControls = true,
  defaultView = 'sankey',
  defaultMetric = 'percentage'
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [metricMode, setMetricMode] = useState<MetricMode>('percentage');

  // Update view mode when defaultView prop changes
  useEffect(() => {
    setViewMode(defaultView);
  }, [defaultView]);

  // Metric mode is locked to percentage for activity editor sector reporting

  // Build hierarchy data for Sankey
  const sankeyData = useMemo(() => {
    console.log('Processing allocations for Sankey:', allocations);

    // First, build a lookup map for unique sector names from the data
    const sectorNameMap = new Map<string, string>();
    const categoryNameMap = new Map<string, string>();

    sectorGroupData.data.forEach((item: any) => {
      const sectorCode = item['codeforiati:category-code'];
      const sectorName = item['codeforiati:category-name'];
      const categoryCode = item['codeforiati:group-code'];
      const categoryName = item['codeforiati:group-name'];

      if (sectorCode && sectorName && !sectorNameMap.has(sectorCode)) {
        sectorNameMap.set(sectorCode, sectorName);
      }
      if (categoryCode && categoryName && !categoryNameMap.has(categoryCode)) {
        categoryNameMap.set(categoryCode, categoryName);
      }
    });

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
      const codeLength = allocation.code?.length || 0;

      // Determine what level this allocation represents
      // 3-digit codes are sectors, 5-digit codes are subsectors
      const isSector = codeLength === 3;
      const isSubsector = codeLength === 5;

      // Derive codes
      const derivedCategoryCode = allocation.code?.substring(0, 2) + '0';
      const derivedSectorCode = allocation.code?.substring(0, 3);

      const categoryCode = sectorData ? sectorData['codeforiati:group-code'] : derivedCategoryCode;
      let sectorCode: string;

      if (isSector) {
        // For 3-digit codes, the code itself is the sector
        sectorCode = allocation.code;
      } else {
        // For 5-digit codes, derive the 3-digit sector code
        sectorCode = sectorData ? sectorData['codeforiati:category-code'] : derivedSectorCode;
      }

      // Look up names from our maps (built from all sector data)
      const categoryName = categoryNameMap.get(categoryCode) || `Category ${categoryCode}`;
      const sectorName = sectorNameMap.get(sectorCode) || `Category ${sectorCode}`;

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
      category.percentage += allocation.percentage;

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
      sector.percentage += allocation.percentage;

      // Only add to subsectors array if this is actually a 5-digit subsector
      if (isSubsector) {
        sector.subsectors.push(allocation);
      }
    });

    // Convert to Sankey format
    const nodes: CustomSankeyNode[] = [];
    const links: CustomSankeyLink[] = [];
    const nodeIds = new Set<string>();

    // Track color assignment
    let categoryIndex = 0;
    const categoryColors = new Map<string, string>();

    categoryMap.forEach((category, categoryCode) => {
      // Assign color to category
      const baseColor = BASE_COLORS[categoryIndex % BASE_COLORS.length];
      categoryColors.set(categoryCode, baseColor);
      categoryIndex++;

      const categoryId = `cat-${categoryCode}`;

      if (!nodeIds.has(categoryId)) {
        nodes.push({
          id: categoryId,
          name: category.name,
          level: 'category',
          value: category.percentage,
          color: baseColor
        });
        nodeIds.add(categoryId);
      }

      let sectorIndexWithinCategory = 0;
      const sectorsInCategory = category.sectors.size;

      category.sectors.forEach((sector, sectorCode) => {
        const sectorId = `sec-${sectorCode}`;
        const sectorColor = generateVariedShades(baseColor, sectorIndexWithinCategory, sectorsInCategory, 'sector');

        if (!nodeIds.has(sectorId)) {
          nodes.push({
            id: sectorId,
            name: sector.name,
            level: 'sector',
            value: sector.percentage,
            color: sectorColor
          });
          nodeIds.add(sectorId);
        }

        links.push({
          source: categoryId,
          target: sectorId,
          value: sector.percentage,
          color: sectorColor
        });

        let subsectorIndex = 0;
        const subsectorsInSector = sector.subsectors.length;

        sector.subsectors.forEach(subsector => {
          const subsectorId = `sub-${subsector.code}`;
          const subsectorColor = generateVariedShades(baseColor, subsectorIndex, subsectorsInSector, 'subsector');

          if (!nodeIds.has(subsectorId)) {
            nodes.push({
              id: subsectorId,
              name: subsector.name,
              level: 'subsector',
              value: subsector.percentage,
              color: subsectorColor
            });
            nodeIds.add(subsectorId);
          }

          links.push({
            source: sectorId,
            target: subsectorId,
            value: subsector.percentage,
            color: subsectorColor
          });

          subsectorIndex++;
        });

        sectorIndexWithinCategory++;
      });
    });

    console.log('Generated Sankey data:', { nodes, links });
    return { nodes, links };
  }, [allocations]);

  // Calculate financial totals
  const financialTotals = useMemo(() => {
    const totals = {
      budget: 0,
      commitment: 0,
      plannedDisbursement: 0,
      actualDisbursement: 0
    };

    financialData.forEach(data => {
      totals.budget += data.budget || 0;
      totals.commitment += data.commitment || 0;
      totals.plannedDisbursement += data.plannedDisbursement || 0;
      totals.actualDisbursement += data.actualDisbursement || 0;
    });

    return totals;
  }, [financialData]);

  // Get display data based on metric mode
  const displayData = useMemo(() => {
    return allocations.map(allocation => {
      const financial = financialData.find(f => f.code === allocation.code);
      let value = allocation.percentage;

      if (metricMode === 'budget') {
        value = financial?.budget || 0;
      } else if (metricMode === 'planned') {
        value = financial?.plannedDisbursement || 0;
      } else if (metricMode === 'actual') {
        value = financial?.actualDisbursement || 0;
      }

      return {
        ...allocation,
        displayValue: value
      };
    }).filter(d => d.displayValue > 0);
  }, [allocations, financialData, metricMode]);

  // Get total for current metric
  const currentTotal = useMemo(() => {
    if (metricMode === 'percentage') {
      return allocations.reduce((sum, a) => sum + a.percentage, 0);
    } else if (metricMode === 'budget') {
      return financialTotals.budget;
    } else if (metricMode === 'planned') {
      return financialTotals.plannedDisbursement;
    } else {
      return financialTotals.actualDisbursement;
    }
  }, [metricMode, allocations, financialTotals]);

  // Calculate container size
  useEffect(() => {
    const updateSize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          setContainerSize({
            width: container.clientWidth,
            height: container.clientHeight
          });
        }
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Render Sankey diagram
  useEffect(() => {
    if (!svgRef.current || sankeyData.nodes.length === 0 || viewMode !== 'sankey') return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = containerSize;
    const margin = { top: 10, right: 200, bottom: 10, left: 200 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Prepare data for d3-sankey
    const sankeyGenerator = sankey<any, any>()
      .nodeId((d: any) => d.id)
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[0, 0], [innerWidth, innerHeight]]);

    // Create a deep copy for d3-sankey to mutate
    const graph = {
      nodes: sankeyData.nodes.map(n => ({ ...n })),
      links: sankeyData.links.map(l => ({ ...l }))
    };

    // Compute the Sankey layout
    const { nodes, links } = sankeyGenerator(graph);

    // Create gradients for links
    const defs = svg.append('defs');

    links.forEach((link: any, i: number) => {
      const gradientId = `gradient-${i}`;
      const gradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.source.x1)
        .attr('x2', link.target.x0);

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', link.source.color)
        .attr('stop-opacity', 0.3);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', link.target.color)
        .attr('stop-opacity', 0.3);
    });

    // Draw links using d3-sankey's sankeyLinkHorizontal
    const link = g.append('g')
      .selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d: any, i: number) => `url(#gradient-${i})`)
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .attr('fill', 'none')
      .attr('opacity', 0.5)
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 0.7);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.5);
      });

    // Create tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'absolute bg-slate-800 text-white px-3 py-2 rounded shadow-lg text-sm pointer-events-none z-50')
      .style('opacity', 0);

    const format = d3.format('.1f');

    // Draw nodes
    const node = g.append('g')
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node');

    node.append('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (d: any) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('rx', 3)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d: any) {
        d3.select(this).style('filter', 'brightness(1.2)');
        tooltip.style('opacity', 1);

        const code = d.id.replace(/^(cat-|sec-|sub-)/, '');
        tooltip.html(`
          <div class="font-semibold">${code ? `<span class="font-mono">${code}</span> - ` : ''}${d.name}</div>
          <div class="text-lg font-bold mt-1 text-gray-300">${format(d.value)}%</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).style('filter', 'none');
        tooltip.style('opacity', 0);
      })
      .on('click', function(event, d: any) {
        if (onSegmentClick) {
          const code = d.id.replace(/^(cat-|sec-|sub-)/, '');
          const level = d.level === 'category' ? 'category' :
                      d.level === 'sector' ? 'sector' : 'subsector';
          onSegmentClick(code, level);
        }
      });

    // Add node labels with wrapping and sector codes on the same line
    node.each(function(d: any) {
      const nodeGroup = d3.select(this);
      const isLeftSide = d.x0 < innerWidth / 2;
      const x = isLeftSide ? d.x1 + 6 : d.x0 - 6;
      const y = (d.y1 + d.y0) / 2;
      const anchor = isLeftSide ? 'start' : 'end';
      const code = d.id.replace(/^(cat-|sec-|sub-)/, '');

      // Combine code and name - ensure code is always at the start
      const fullText = `${code} ${d.name}`;
      const words = fullText.split(/\s+/);
      const maxCharsPerLine = 35;
      const lines: string[] = [];
      let currentLine = '';

      words.forEach((word: string) => {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (testLine.length > maxCharsPerLine && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });

      if (currentLine) {
        lines.push(currentLine);
      }

      // Limit to 2 lines
      const displayLines = lines.slice(0, 2);
      if (lines.length > 2) {
        displayLines[1] = displayLines[1].substring(0, 32) + '...';
      }

      displayLines.forEach((line: string, i: number) => {
        const text = nodeGroup.append('text')
          .attr('x', x)
          .attr('y', y - (displayLines.length - 1) * 6 + (i * 12))
          .attr('text-anchor', anchor)
          .attr('font-size', '12px')
          .attr('font-weight', d.level === 'category' ? 'bold' : 'normal')
          .attr('fill', '#1e293b')
          .style('pointer-events', 'none');

        // First line should always start with the code
        if (i === 0) {
          // Add code with styled background
          const codeTspan = text.append('tspan')
            .attr('font-family', 'monospace')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .attr('fill', '#1e293b')
            .text(code);

          // Add the rest of the text after the code
          const nameText = line.substring(code.length).trim();
          if (nameText) {
            text.append('tspan')
              .attr('dx', 4)
              .attr('font-weight', d.level === 'category' ? 'bold' : 'normal')
              .text(nameText);
          }
        } else {
          // Continuation lines
          text.text(line);
        }
      });
    });

    // Percentage labels removed - only shown on hover

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };

  }, [sankeyData, containerSize, onSegmentClick, viewMode]);

  // Render Sunburst Chart (3-level hierarchy)
  useEffect(() => {
    if (!svgRef.current || allocations.length === 0 || viewMode !== 'pie') return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = containerSize;
    const radius = Math.min(width, height) / 2 - 60;

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Build hierarchical data structure
    const hierarchyData: any = {
      name: 'root',
      children: []
    };

    const categoryMap = new Map<string, any>();

    allocations.forEach(allocation => {
      const sectorData = sectorGroupData.data.find((s: any) => s.code === allocation.code);
      if (!sectorData) return;

      const categoryCode = sectorData['codeforiati:group-code'];
      const categoryName = sectorData['codeforiati:group-name'];
      const sectorCode = sectorData['codeforiati:category-code'];
      const sectorName = sectorData['codeforiati:category-name'];

      // Get or create category
      if (!categoryMap.has(categoryCode)) {
        const category = {
          name: categoryName,
          code: categoryCode,
          level: 'category',
          children: [],
          sectors: new Map()
        };
        categoryMap.set(categoryCode, category);
        hierarchyData.children.push(category);
      }

      const category = categoryMap.get(categoryCode);

      // Get or create sector
      if (!category.sectors.has(sectorCode)) {
        const sector = {
          name: sectorName,
          code: sectorCode,
          level: 'sector',
          children: []
        };
        category.sectors.set(sectorCode, sector);
        category.children.push(sector);
      }

      const sector = category.sectors.get(sectorCode);

      // Add subsector (the actual allocation)
      const financial = financialData.find(f => f.code === allocation.code);
      let displayValue = allocation.percentage;

      if (metricMode === 'budget') {
        displayValue = financial?.budget || 0;
      } else if (metricMode === 'planned') {
        displayValue = financial?.plannedDisbursement || 0;
      } else if (metricMode === 'actual') {
        displayValue = financial?.actualDisbursement || 0;
      }

      sector.children.push({
        name: allocation.name,
        code: allocation.code,
        level: 'subsector',
        value: allocation.percentage, // Always use percentage for sizing
        displayValue: displayValue // Use selected metric for display
      });
    });

    // Create d3 hierarchy
    const root = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create partition layout
    const partition = d3.partition<any>()
      .size([2 * Math.PI, radius]);

    partition(root);

    // Create arc generator
    const arc = d3.arc<any>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    // Create tooltip
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'absolute bg-slate-800 text-white px-3 py-2 rounded shadow-lg text-sm pointer-events-none z-50')
      .style('opacity', 0);

    const format = metricMode === 'percentage' ? d3.format('.1f') : d3.format(',.0f');
    const isPercentage = metricMode === 'percentage';

    // Track color assignment
    let categoryIndex = 0;
    const categoryColorMap = new Map<string, string>();

    // Draw arcs
    const paths = g.selectAll('path')
      .data(root.descendants().filter((d: any) => d.depth > 0))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d: any) => {
        // Assign color based on category
        if (d.depth === 1) {
          // Category level - base color
          const color = BASE_COLORS[categoryIndex % BASE_COLORS.length];
          categoryColorMap.set(d.data.code, color);
          categoryIndex++;
          return color;
        } else {
          // Find parent category
          let parent = d.parent;
          while (parent && parent.depth > 1) {
            parent = parent.parent;
          }
          const baseColor = parent ? categoryColorMap.get(parent.data.code) || BASE_COLORS[0] : BASE_COLORS[0];

          if (d.depth === 2) {
            // Sector level - lighter shade
            return generateVariedShades(baseColor, d.parent!.children.indexOf(d), d.parent!.children.length, 'sector');
          } else {
            // Subsector level - lightest shade
            return generateVariedShades(baseColor, d.parent!.children.indexOf(d), d.parent!.children.length, 'subsector');
          }
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d: any) {
        d3.select(this).style('filter', 'brightness(1.2)');
        tooltip.style('opacity', 1);

        const percentage = ((d.value || 0) / (root.value || 1) * 100).toFixed(1);

        tooltip.html(`
          <div class="font-semibold">${d.data.code || ''} - ${d.data.name}</div>
          <div class="text-lg font-bold mt-1">${percentage}%</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).style('filter', 'none');
        tooltip.style('opacity', 0);
      })
      .on('click', function(event, d: any) {
        if (onSegmentClick && d.data.code) {
          const level = d.data.level === 'category' ? 'category' :
                       d.data.level === 'sector' ? 'sector' : 'subsector';
          onSegmentClick(d.data.code, level);
        }
      });

    // Center label removed for cleaner visualization

    return () => {
      tooltip.remove();
    };
  }, [allocations, financialData, containerSize, viewMode, currentTotal, metricMode, onSegmentClick]);

  // Render Bar Chart
  useEffect(() => {
    if (!svgRef.current || displayData.length === 0 || viewMode !== 'bar') return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = containerSize;
    const margin = { top: 20, right: 30, bottom: 40, left: 300 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const sortedData = [...displayData].sort((a, b) => b.displayValue - a.displayValue);

    const yScale = d3.scaleBand()
      .domain(sortedData.map(d => d.name))
      .range([0, innerHeight])
      .padding(0.3);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(sortedData, d => d.displayValue) || 0])
      .range([0, innerWidth]);

    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'absolute bg-slate-800 text-white px-3 py-2 rounded shadow-lg text-sm pointer-events-none z-50')
      .style('opacity', 0);

    const format = d3.format(',.0f'); // Always format as whole numbers
    const isPercentage = metricMode === 'percentage';

    // Add bars
    g.selectAll('.bar')
      .data(sortedData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.name) || 0)
      .attr('width', d => xScale(d.displayValue))
      .attr('height', yScale.bandwidth())
      .attr('fill', (d, i) => BASE_COLORS[i % BASE_COLORS.length])
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).style('filter', 'brightness(1.2)');
        tooltip.style('opacity', 1);
        const percentage = (d.displayValue / currentTotal * 100).toFixed(0);
        tooltip.html(`
          <div class="font-semibold">${d.code} - ${d.name}</div>
          <div class="text-lg font-bold mt-1">${isPercentage ? format(d.displayValue) + '%' : '$' + format(d.displayValue)}</div>
          <div class="text-xs text-gray-300">${percentage}% of total</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).style('filter', 'none');
        tooltip.style('opacity', 0);
      })
      .on('click', function(event, d) {
        if (onSegmentClick) {
          onSegmentClick(d.code, 'subsector');
        }
      });

    // Add value labels
    g.selectAll('.label')
      .data(sortedData)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => xScale(d.displayValue) + 5)
      .attr('y', d => (yScale(d.name) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('font-size', '11px')
      .attr('fill', '#374151')
      .text(d => isPercentage ? format(d.displayValue) + '%' : '$' + format(d.displayValue));

    // Add y-axis labels with wrapping
    const wrapText = (text: string, maxWidth: number) => {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        // Rough estimate: 6 pixels per character
        if (testLine.length * 6 > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    };

    g.selectAll('.y-label-group')
      .data(sortedData)
      .enter()
      .append('g')
      .attr('class', 'y-label-group')
      .attr('transform', d => `translate(-10, ${(yScale(d.name) || 0) + yScale.bandwidth() / 2})`)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        if (onSegmentClick) {
          onSegmentClick(d.code, 'subsector');
        }
      })
      .each(function(d) {
        const group = d3.select(this);
        const lines = wrapText(d.name, 280);
        const lineHeight = 12;
        const yOffset = -(lines.length - 1) * lineHeight / 2;

        lines.forEach((line, i) => {
          group.append('text')
            .attr('x', 0)
            .attr('y', yOffset + i * lineHeight)
            .attr('text-anchor', 'end')
            .attr('font-size', '11px')
            .attr('fill', '#374151')
            .text(line);
        });
      });

    // Add x-axis with formatted labels
    const formatXAxis = (value: number) => {
      if (isPercentage) {
        return value.toFixed(0) + '%';
      } else {
        // Format currency values
        if (value >= 1000000) {
          return '$' + (value / 1000000).toFixed(0) + 'm';
        } else if (value >= 1000) {
          return '$' + (value / 1000).toFixed(0) + 'k';
        } else {
          return '$' + value.toFixed(0);
        }
      }
    };

    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(formatXAxis as any);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('fill', '#64748b');

    return () => {
      tooltip.remove();
    };
  }, [displayData, containerSize, viewMode, currentTotal, metricMode, onSegmentClick]);

  const totalPercentage = useMemo(() => {
    return allocations.reduce((sum, allocation) => sum + allocation.percentage, 0);
  }, [allocations]);

  const handleExportCSV = useCallback(() => {
    const csvData = allocations.map(allocation => {
      const financial = financialData.find(f => f.code === allocation.code);
      return {
        'Sector Code': allocation.code,
        'Sector Name': allocation.name,
        'Percentage': allocation.percentage,
        'Budget (USD)': financial?.budget || 0,
        'Commitment (USD)': financial?.commitment || 0,
        'Planned Disbursement (USD)': financial?.plannedDisbursement || 0,
        'Actual Disbursement (USD)': financial?.actualDisbursement || 0
      };
    });
    exportToCSV(csvData, 'sector-allocations');
  }, [allocations, financialData]);

  const handleExportJPG = useCallback(() => {
    if (containerRef.current) {
      exportChartToJPG(containerRef.current, 'sector-visualization');
    }
  }, []);

  const renderTable = () => {
    const formatPercentage = (v: number) => v.toFixed(0) + '%';

    // Calculate total percentage
    const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);

    // Build table data with hierarchy information
    const tableData = allocations.map(allocation => {
      const sectorData = sectorGroupData.data.find((s: any) => s.code === allocation.code);

      let category = '';
      let sector = '';
      let subsector = '';

      if (sectorData) {
        const categoryCode = sectorData['codeforiati:group-code'];
        const categoryName = sectorData['codeforiati:group-name'];
        const sectorCode = sectorData['codeforiati:category-code'];
        const sectorName = sectorData['codeforiati:category-name'];

        category = `${categoryCode} ${categoryName}`;
        sector = `${sectorCode} ${sectorName}`;
        subsector = `${allocation.code} ${allocation.name}`;
      } else {
        subsector = `${allocation.code} ${allocation.name}`;
      }

      return {
        category,
        sector,
        subsector,
        allocation
      };
    });

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sector Category</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Sub-sector</TableHead>
              <TableHead className="text-right w-[80px]">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData
              .sort((a, b) => b.allocation.percentage - a.allocation.percentage)
              .map((row, index) => {
                // Extract codes and names for styling
                const categoryParts = row.category.split(' ');
                const categoryCode = categoryParts[0];
                const categoryName = categoryParts.slice(1).join(' ');

                const sectorParts = row.sector.split(' ');
                const sectorCode = sectorParts[0];
                const sectorName = sectorParts.slice(1).join(' ');

                const subsectorParts = row.subsector.split(' ');
                const subsectorCode = subsectorParts[0];
                const subsectorName = subsectorParts.slice(1).join(' ');

                return (
                  <TableRow key={index}>
                    <TableCell className="text-sm">
                      {row.category && (
                        <>
                          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded mr-2">{categoryCode}</span>
                          <span className="font-medium">{categoryName}</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.sector && (
                        <>
                          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded mr-2">{sectorCode}</span>
                          <span className="font-medium">{sectorName}</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded mr-2">{subsectorCode}</span>
                      <span className="font-medium">{subsectorName}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatPercentage(row.allocation.percentage)}</TableCell>
                  </TableRow>
                );
              })}
            <TableRow className="font-semibold bg-slate-50 border-t-2">
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right">{formatPercentage(totalPercentage)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

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

  const getMetricLabel = () => {
    switch (metricMode) {
      case 'percentage': return 'Percentage Allocation';
      case 'budget': return 'Total Budget';
      case 'planned': return 'Total Planned Disbursement';
      case 'actual': return 'Total Actual Disbursement';
      default: return 'Total';
    }
  };

  const formatTotal = (value: number) => {
    if (metricMode === 'percentage') {
      return value.toFixed(1) + '%';
    }
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {/* Controls - only shown if showControls is true */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b">
          <div className="flex flex-wrap items-center gap-4">
            {/* View Mode Tabs */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="w-auto">
              <TabsList className="h-9">
                <TabsTrigger value="sankey" className="text-xs px-3">
                  <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                  Sankey
                </TabsTrigger>
                <TabsTrigger value="pie" className="text-xs px-3">
                  <PieChart className="h-3.5 w-3.5 mr-1.5" />
                  Sunburst
                </TabsTrigger>
                <TabsTrigger value="bar" className="text-xs px-3">
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  Bar
                </TabsTrigger>
                <TabsTrigger value="table" className="text-xs px-3">
                  <TableIcon className="h-3.5 w-3.5 mr-1.5" />
                  Table
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Metric selector removed: percentage-only view */}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJPG}
            >
              <Download className="h-4 w-4 mr-1" />
              JPG
            </Button>
          </div>
        </div>
      )}

      {/* Total Display removed per design request */}

      {/* View - always render based on viewMode */}
      {viewMode === 'sankey' ? (
        <div className="w-full" style={{ height: '600px' }}>
          <svg ref={svgRef} className="w-full h-full" />
        </div>
      ) : viewMode === 'pie' ? (
        <div className="w-full" style={{ height: '600px' }}>
          <svg ref={svgRef} className="w-full h-full" />
        </div>
      ) : viewMode === 'bar' ? (
        <div className="w-full" style={{ height: '600px' }}>
          <svg ref={svgRef} className="w-full h-full" />
        </div>
      ) : (
        renderTable()
      )}
    </div>
  );
}
