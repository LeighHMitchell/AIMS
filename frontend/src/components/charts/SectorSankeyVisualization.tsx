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
import { cn } from '@/lib/utils';

// User's simplified data structure
interface SectorAllocation {
  code: string;
  name: string;
  percentage: number;
}

interface SectorFinancialData {
  code: string;
  budget?: number;
  plannedDisbursement?: number;
  transactionTypes?: Record<string, number>; // Dynamic: { '3': 5000, '4': 2000 }
}

interface Props {
  allocations: SectorAllocation[];
  financialData?: SectorFinancialData[];
  onSegmentClick?: (code: string, level: 'category' | 'sector' | 'subsector') => void;
  className?: string;
  showControls?: boolean; // Whether to show view mode and metric controls
  defaultView?: ViewMode; // Default view mode
  defaultMetric?: MetricMode; // Default metric mode
  barGroupingMode?: BarGroupingMode; // Bar chart grouping mode (controlled from outside)
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
type BarGroupingMode = 'sector' | 'category' | 'group';

// Transaction type labels for dynamic columns (IATI Standard v2.03)
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Payment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '10': 'Credit Guarantee',
  '11': 'Incoming Commitment',
  '12': 'Outgoing Pledge',
  '13': 'Incoming Pledge'
};

// Color palette: Primary Scarlet, Pale Slate, Blue Slate, Cool Steel, Platinum
const BASE_COLORS = [
  '#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8',
  '#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8',
  '#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8',
  '#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8',
  '#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8',
  '#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8',
  '#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8',
  '#dc2625', '#4c5568', '#7b95a7', '#cfd0d5', '#f1f4f8'
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
  defaultMetric = 'percentage',
  barGroupingMode: externalBarGroupingMode
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [metricMode, setMetricMode] = useState<MetricMode>('percentage');
  const [internalBarGroupingMode, setBarGroupingMode] = useState<BarGroupingMode>('group');
  
  // Use external bar grouping mode if provided, otherwise use internal state
  const barGroupingMode = externalBarGroupingMode ?? internalBarGroupingMode;

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

  // Get stacked bar data based on grouping mode
  const stackedBarData = useMemo(() => {
    if (barGroupingMode === 'sector') {
      // Return 5-digit subsectors with their colors
      return displayData.map((d, i) => {
        const sectorData = sectorGroupData.data.find((s: any) => s.code === d.code);
        const categoryCode = sectorData?.['codeforiati:category-code'] || d.code.substring(0, 3);
        return {
          code: d.code,
          name: d.name,
          value: d.displayValue,
          categoryCode,
          color: BASE_COLORS[i % BASE_COLORS.length]
        };
      }).sort((a, b) => b.value - a.value);
    } else if (barGroupingMode === 'category') {
      // Group by 3-digit sector
      const categoryMap = new Map<string, {
        code: string;
        name: string;
        value: number;
        sectors: { code: string; name: string; value: number }[];
      }>();

      displayData.forEach(d => {
        const sectorData = sectorGroupData.data.find((s: any) => s.code === d.code);
        const categoryCode = sectorData?.['codeforiati:category-code'] || d.code.substring(0, 3);
        const categoryName = sectorData?.['codeforiati:category-name'] || `Sector ${categoryCode}`;

        if (!categoryMap.has(categoryCode)) {
          categoryMap.set(categoryCode, {
            code: categoryCode,
            name: categoryName,
            value: 0,
            sectors: []
          });
        }

        const category = categoryMap.get(categoryCode)!;
        category.value += d.displayValue;
        category.sectors.push({
          code: d.code,
          name: d.name,
          value: d.displayValue
        });
      });

      return Array.from(categoryMap.values())
        .map((cat, i) => ({
          code: cat.code,
          name: cat.name,
          value: cat.value,
          categoryCode: cat.code,
          color: BASE_COLORS[i % BASE_COLORS.length],
          sectors: cat.sectors
        }))
        .sort((a, b) => b.value - a.value);
    } else {
      // Group by 2-digit sector category (group)
      const groupMap = new Map<string, {
        code: string;
        name: string;
        value: number;
        sectors: { code: string; name: string; value: number }[];
      }>();

      displayData.forEach(d => {
        const sectorData = sectorGroupData.data.find((s: any) => s.code === d.code);
        const groupCode = sectorData?.['codeforiati:group-code'] || d.code.substring(0, 2) + '0';
        const groupName = sectorData?.['codeforiati:group-name'] || `Sector Category ${groupCode}`;

        if (!groupMap.has(groupCode)) {
          groupMap.set(groupCode, {
            code: groupCode,
            name: groupName,
            value: 0,
            sectors: []
          });
        }

        const group = groupMap.get(groupCode)!;
        group.value += d.displayValue;
        group.sectors.push({
          code: d.code,
          name: d.name,
          value: d.displayValue
        });
      });

      return Array.from(groupMap.values())
        .map((grp, i) => ({
          code: grp.code,
          name: grp.name,
          value: grp.value,
          categoryCode: grp.code,
          color: BASE_COLORS[i % BASE_COLORS.length],
          sectors: grp.sectors
        }))
        .sort((a, b) => b.value - a.value);
    }
  }, [displayData, barGroupingMode]);

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
    const margin = { top: 10, right: 250, bottom: 10, left: 20 };
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
      .attr('class', 'absolute bg-white text-slate-800 border border-slate-200 px-3 py-2 rounded shadow-lg text-sm pointer-events-none z-50')
      .style('opacity', 0);

    const format = d3.format('.1f');

    // Helper to format currency for tooltips
    const formatTooltipCurrency = (v: number) => {
      if (v === 0) return '$0';
      if (v >= 1000000) return '$' + (v / 1000000).toFixed(2) + 'm';
      if (v >= 1000) return '$' + (v / 1000).toFixed(2) + 'k';
      return '$' + v.toFixed(0);
    };
    
    // Helper to get financial data for a node (aggregated for category/sector)
    const getNodeFinancials = (nodeId: string, level: string) => {
      const code = nodeId.replace(/^(cat-|sec-|sub-)/, '');
      
      if (level === 'subsector') {
        return financialData.find(f => f.code === code);
      }
      
      // For category/sector, aggregate from child subsectors
      // Find all subsectors that belong to this category/sector
      const relevantSubsectors = allocations.filter(a => {
        const sectorInfo = sectorGroupData.data.find((s: any) => s.code === a.code);
        if (!sectorInfo) return false;
        
        if (level === 'category') {
          return sectorInfo['codeforiati:group-code'] === code;
        } else if (level === 'sector') {
          return sectorInfo['codeforiati:category-code'] === code;
        }
        return false;
      });
      
      // Aggregate financial data
      const aggregated = {
        budget: 0,
        plannedDisbursement: 0,
        transactionTypes: {} as Record<string, number>
      };
      
      relevantSubsectors.forEach(sub => {
        const fin = financialData.find(f => f.code === sub.code);
        if (fin) {
          aggregated.budget += fin.budget || 0;
          aggregated.plannedDisbursement += fin.plannedDisbursement || 0;
          if (fin.transactionTypes) {
            Object.entries(fin.transactionTypes).forEach(([type, amount]) => {
              aggregated.transactionTypes[type] = (aggregated.transactionTypes[type] || 0) + amount;
            });
          }
        }
      });
      
      return aggregated;
    };

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
        const fin = getNodeFinancials(d.id, d.level);
        
        // Build financial details HTML
        let financialHtml = '';
        if (fin) {
          const details: string[] = [];
          if (fin.budget) details.push(`Budget: ${formatTooltipCurrency(fin.budget)}`);
          if (fin.plannedDisbursement) details.push(`Planned: ${formatTooltipCurrency(fin.plannedDisbursement)}`);
          if (fin.transactionTypes) {
            Object.entries(fin.transactionTypes).forEach(([type, amount]) => {
              if (amount > 0) {
                const label = TRANSACTION_TYPE_LABELS[type] || `Type ${type}`;
                details.push(`${label}: ${formatTooltipCurrency(amount)}`);
              }
            });
          }
          if (details.length > 0) {
            financialHtml = `<div class="mt-2 pt-2 border-t border-slate-200 text-xs space-y-1">${details.map(d => `<div>${d}</div>`).join('')}</div>`;
          }
        }
        
        tooltip.html(`
          <div class="font-semibold">${code ? `<span class="font-mono">${code}</span> - ` : ''}${d.name}</div>
          <div class="text-lg font-bold mt-1 text-slate-600">${format(d.value)}%</div>
          ${financialHtml}
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
        const textY = y - (displayLines.length - 1) * 6 + (i * 12);

        // First line should always start with the code with a background
        if (i === 0) {
          // Calculate code badge dimensions
          const codeWidth = code.length * 7 + 8;
          const codeHeight = 14;

          // Get the name text
          const nameText = line.substring(code.length).trim();

          // For left side: code badge first, then name
          // For right side: name first (reading right to left), then code badge at the end (leftmost)
          if (isLeftSide) {
            const badgeX = x;

            // Add background rect for code
            nodeGroup.append('rect')
              .attr('x', badgeX)
              .attr('y', textY - codeHeight / 2 - 1)
              .attr('width', codeWidth)
              .attr('height', codeHeight)
              .attr('rx', 3)
              .attr('fill', '#e5e7eb') // gray-200
              .style('pointer-events', 'none');

            // Add code text
            nodeGroup.append('text')
              .attr('x', badgeX + codeWidth / 2)
              .attr('y', textY)
              .attr('text-anchor', 'middle')
              .attr('font-family', 'ui-monospace, SFMono-Regular, monospace')
              .attr('font-size', '10px')
              .attr('font-weight', '600')
              .attr('fill', '#374151') // gray-700
              .style('pointer-events', 'none')
              .text(code);

            // Add name text after code
            if (nameText) {
              nodeGroup.append('text')
                .attr('x', badgeX + codeWidth + 6)
                .attr('y', textY)
                .attr('text-anchor', 'start')
                .attr('font-size', '12px')
                .attr('font-weight', d.level === 'category' ? 'bold' : 'normal')
                .attr('fill', '#1e293b')
                .style('pointer-events', 'none')
                .text(nameText);
            }
          } else {
            // Right side: code badge at start (leftmost), then name
            const badgeX = x - codeWidth;

            // Add background rect for code (leftmost)
            nodeGroup.append('rect')
              .attr('x', badgeX)
              .attr('y', textY - codeHeight / 2 - 1)
              .attr('width', codeWidth)
              .attr('height', codeHeight)
              .attr('rx', 3)
              .attr('fill', '#e5e7eb') // gray-200
              .style('pointer-events', 'none');

            // Add code text
            nodeGroup.append('text')
              .attr('x', badgeX + codeWidth / 2)
              .attr('y', textY)
              .attr('text-anchor', 'middle')
              .attr('font-family', 'ui-monospace, SFMono-Regular, monospace')
              .attr('font-size', '10px')
              .attr('font-weight', '600')
              .attr('fill', '#374151') // gray-700
              .style('pointer-events', 'none')
              .text(code);

            // Add name text after code (to the right of the badge)
            if (nameText) {
              nodeGroup.append('text')
                .attr('x', badgeX + codeWidth + 6)
                .attr('y', textY)
                .attr('text-anchor', 'start')
                .attr('font-size', '12px')
                .attr('font-weight', d.level === 'category' ? 'bold' : 'normal')
                .attr('fill', '#1e293b')
                .style('pointer-events', 'none')
                .text(nameText);
            }
          }
        } else {
          // Continuation lines
          const text = nodeGroup.append('text')
            .attr('x', x)
            .attr('y', textY)
            .attr('text-anchor', anchor)
            .attr('font-size', '12px')
            .attr('font-weight', d.level === 'category' ? 'bold' : 'normal')
            .attr('fill', '#1e293b')
            .style('pointer-events', 'none')
            .text(line);
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
      .attr('class', 'absolute bg-white text-slate-800 border border-slate-200 px-3 py-2 rounded shadow-lg text-sm pointer-events-none z-50')
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

  // Render Stacked Bar Chart
  useEffect(() => {
    if (!svgRef.current || stackedBarData.length === 0 || viewMode !== 'bar') return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = containerSize;
    const barHeight = 80;
    const margin = { top: 30, right: 60, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = barHeight;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Calculate total value and cumulative positions
    const total = stackedBarData.reduce((sum, d) => sum + d.value, 0);
    let cumulative = 0;
    const segments = stackedBarData.map(d => {
      const segment = {
        ...d,
        start: cumulative,
        end: cumulative + d.value
      };
      cumulative += d.value;
      return segment;
    });

    // Scale for x-axis (0 to total)
    const xScale = d3.scaleLinear()
      .domain([0, total])
      .range([0, innerWidth]);

    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'absolute bg-white text-slate-800 border border-slate-200 px-3 py-2 rounded shadow-lg text-sm pointer-events-none z-50')
      .style('opacity', 0);

    const format = d3.format(',.0f');
    const isPercentage = metricMode === 'percentage';

    // Draw stacked bar segments
    g.selectAll('.bar-segment')
      .data(segments)
      .enter()
      .append('rect')
      .attr('class', 'bar-segment')
      .attr('x', d => xScale(d.start))
      .attr('y', 0)
      .attr('width', d => Math.max(1, xScale(d.end) - xScale(d.start)))
      .attr('height', innerHeight)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).style('filter', 'brightness(1.2)');
        tooltip.style('opacity', 1);
        const percentage = (d.value / total * 100).toFixed(1);
        const sectors = 'sectors' in d ? (d.sectors as { code: string; name: string; value: number }[] | undefined) : undefined;
        const sectorsInfo = sectors && sectors.length > 0 ? 
          `<div class="text-xs text-slate-500 mt-1">Includes ${sectors.length} sector${sectors.length > 1 ? 's' : ''}</div>` : '';
        tooltip.html(`
          <div class="font-semibold">${d.code} - ${d.name}</div>
          <div class="text-lg font-bold mt-1">${isPercentage ? format(d.value) + '%' : '$' + format(d.value)}</div>
          <div class="text-xs text-slate-500">${percentage}% of total</div>
          ${sectorsInfo}
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
          const level = barGroupingMode === 'group' ? 'category' : 
                       barGroupingMode === 'category' ? 'sector' : 'subsector';
          onSegmentClick(d.code, level);
        }
      });

    // Add code and name labels on segments (only if wide enough)
    segments.forEach(d => {
      const segmentWidth = xScale(d.end) - xScale(d.start);
      const segmentX = xScale(d.start) + segmentWidth / 2;
      
      // Only show label if segment is wide enough
      if (segmentWidth < 50) return;
      
      const labelGroup = g.append('g')
        .attr('class', 'segment-label-group')
        .style('pointer-events', 'none');
      
      // Code badge dimensions
      const codeText = d.code;
      const codeWidth = codeText.length * 7 + 8;
      const codeHeight = 16;
      
      // Truncate name based on available space
      const availableWidth = segmentWidth - codeWidth - 16; // Leave padding
      const maxNameChars = Math.floor(availableWidth / 6);
      let nameText = d.name;
      if (maxNameChars < 3) {
        nameText = ''; // Don't show name if not enough space
      } else if (nameText.length > maxNameChars) {
        nameText = nameText.substring(0, maxNameChars - 2) + '..';
      }
      
      // Calculate total label width
      const totalWidth = codeWidth + (nameText ? nameText.length * 6 + 8 : 0);
      const startX = segmentX - totalWidth / 2;
      
      // Add code background rect
      labelGroup.append('rect')
        .attr('x', startX)
        .attr('y', innerHeight / 2 - codeHeight / 2)
        .attr('width', codeWidth)
        .attr('height', codeHeight)
        .attr('rx', 3)
        .attr('fill', 'rgba(100, 116, 139, 0.95)'); // slate-500
      
      // Add code text
      labelGroup.append('text')
        .attr('x', startX + codeWidth / 2)
        .attr('y', innerHeight / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace')
        .attr('font-weight', '600')
        .attr('fill', '#fff')
        .text(codeText);
      
      // Add name text if there's space
      if (nameText) {
        labelGroup.append('text')
          .attr('x', startX + codeWidth + 6)
          .attr('y', innerHeight / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'start')
          .attr('font-size', '11px')
          .attr('font-weight', '500')
          .attr('fill', '#fff')
          .text(nameText);
      }
    });

    // Add x-axis with percentage marks
    const formatXAxis = (value: number) => {
      if (isPercentage) {
        return value.toFixed(0) + '%';
      } else {
        if (value >= 1000000) return '$' + (value / 1000000).toFixed(0) + 'm';
        if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'k';
        return '$' + value.toFixed(0);
      }
    };

    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(formatXAxis as any);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight + 10})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('fill', '#64748b');

    return () => {
      tooltip.remove();
    };
  }, [stackedBarData, containerSize, viewMode, metricMode, onSegmentClick, barGroupingMode]);

  const totalPercentage = useMemo(() => {
    return allocations.reduce((sum, allocation) => sum + allocation.percentage, 0);
  }, [allocations]);

  const handleExportCSV = useCallback(() => {
    // Get all unique transaction types
    const allTransactionTypes = new Set<string>();
    financialData.forEach(f => {
      if (f.transactionTypes) {
        Object.keys(f.transactionTypes).forEach(type => allTransactionTypes.add(type));
      }
    });
    const transactionTypeArray = Array.from(allTransactionTypes).sort();
    
    const csvData = allocations.map(allocation => {
      const financial = financialData.find(f => f.code === allocation.code);
      const row: Record<string, string | number> = {
        'Sector Code': allocation.code,
        'Sector Name': allocation.name,
        'Percentage': allocation.percentage,
        'Budget (USD)': financial?.budget || 0,
        'Planned Disbursement (USD)': financial?.plannedDisbursement || 0,
      };
      
      // Add dynamic transaction type columns
      transactionTypeArray.forEach(type => {
        const label = TRANSACTION_TYPE_LABELS[type] || `Type ${type}`;
        row[`${label} (USD)`] = (financial?.transactionTypes && financial.transactionTypes[type]) || 0;
      });
      
      return row;
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
    
    const formatCurrency = (v: number) => {
      if (v === 0) return '$0';
      if (v >= 1000000) return '$' + (v / 1000000).toFixed(2) + 'm';
      if (v >= 1000) return '$' + (v / 1000).toFixed(2) + 'k';
      return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    // Get all unique transaction types across all sectors
    const allTransactionTypes = new Set<string>();
    financialData.forEach(f => {
      if (f.transactionTypes) {
        Object.keys(f.transactionTypes).forEach(type => allTransactionTypes.add(type));
      }
    });
    const transactionTypeArray = Array.from(allTransactionTypes).sort();

    // Calculate total percentage
    const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);

    // Calculate financial totals
    const financialTotals = {
      budget: financialData.reduce((sum, f) => sum + (f.budget || 0), 0),
      plannedDisbursement: financialData.reduce((sum, f) => sum + (f.plannedDisbursement || 0), 0),
    };
    
    // Calculate transaction type totals
    const transactionTypeTotals: Record<string, number> = {};
    transactionTypeArray.forEach(type => {
      transactionTypeTotals[type] = financialData.reduce((sum, f) => {
        return sum + ((f.transactionTypes && f.transactionTypes[type]) || 0);
      }, 0);
    });

    // Build table data with hierarchy information and financial data
    const tableData = allocations.map(allocation => {
      const sectorData = sectorGroupData.data.find((s: any) => s.code === allocation.code);
      const financial = financialData.find(f => f.code === allocation.code);

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
        allocation,
        financial: financial || {
          budget: 0,
          plannedDisbursement: 0,
          transactionTypes: {}
        }
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
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Planned Disbursement</TableHead>
              {transactionTypeArray.map(type => (
                <TableHead key={type} className="text-right">
                  {TRANSACTION_TYPE_LABELS[type] || `Type ${type}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData
              .sort((a, b) => {
                // Sort by the selected metric mode
                if (metricMode === 'budget') {
                  return (b.financial.budget || 0) - (a.financial.budget || 0);
                } else if (metricMode === 'planned') {
                  return (b.financial.plannedDisbursement || 0) - (a.financial.plannedDisbursement || 0);
                }
                return b.allocation.percentage - a.allocation.percentage;
              })
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

                // Highlight the column based on metric mode
                const highlightBudget = metricMode === 'budget';
                const highlightPlanned = metricMode === 'planned';

                return (
                  <TableRow key={index}>
                    <TableCell className="text-sm">
                      {row.category && (
                        <>
                          <span className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-2">{categoryCode}</span>
                          <span className="font-medium">{categoryName}</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.sector && (
                        <>
                          <span className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-2">{sectorCode}</span>
                          <span className="font-medium">{sectorName}</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-2">{subsectorCode}</span>
                      <span className="font-medium">{subsectorName}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatPercentage(row.allocation.percentage)}</TableCell>
                    <TableCell className={`text-right font-medium ${highlightBudget ? 'bg-blue-50 font-semibold' : ''}`}>
                      {formatCurrency(row.financial.budget || 0)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${highlightPlanned ? 'bg-blue-50 font-semibold' : ''}`}>
                      {formatCurrency(row.financial.plannedDisbursement || 0)}
                    </TableCell>
                    {transactionTypeArray.map(type => (
                      <TableCell key={type} className="text-right font-medium">
                        {formatCurrency((row.financial.transactionTypes && row.financial.transactionTypes[type]) || 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            <TableRow className="font-semibold bg-slate-50 border-t-2">
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right">{formatPercentage(totalPercentage)}</TableCell>
              <TableCell className={`text-right ${metricMode === 'budget' ? 'bg-blue-50' : ''}`}>
                {formatCurrency(financialTotals.budget)}
              </TableCell>
              <TableCell className={`text-right ${metricMode === 'planned' ? 'bg-blue-50' : ''}`}>
                {formatCurrency(financialTotals.plannedDisbursement)}
              </TableCell>
              {transactionTypeArray.map(type => (
                <TableCell key={type} className="text-right">
                  {formatCurrency(transactionTypeTotals[type] || 0)}
                </TableCell>
              ))}
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
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
                  <BarChart3 className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="table" className="text-xs px-3">
                  <TableIcon className="h-3.5 w-3.5" />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Bar grouping buttons - only show when bar view is active */}
            {viewMode === 'bar' && (
              <div className="flex gap-1 rounded-lg p-1 bg-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBarGroupingMode('group')}
                  className={cn("h-7 text-xs px-3", barGroupingMode === 'group' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
                >
                  Sector Category
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBarGroupingMode('category')}
                  className={cn("h-7 text-xs px-3", barGroupingMode === 'category' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
                >
                  Sector
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBarGroupingMode('sector')}
                  className={cn("h-7 text-xs px-3", barGroupingMode === 'sector' ? "bg-white shadow-sm text-slate-900 hover:bg-white" : "text-slate-500 hover:text-slate-700")}
                >
                  Sub Sector
                </Button>
              </div>
            )}
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
        <div className="w-full">
          <div style={{ height: '180px' }}>
            <svg ref={svgRef} className="w-full h-full" />
          </div>
        </div>
      ) : (
        renderTable()
      )}
    </div>
  );
}
