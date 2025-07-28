'use client';

// @ts-ignore
import sectorGroupData from '@/data/SectorGroup.json';

import React, { useState, useRef, useMemo } from 'react';

interface SectorAllocation {
  id: string;
  code: string;
  name: string;
  percentage: number;
  level?: 'group' | 'sector' | 'subsector';
  category?: string;
  categoryName?: string;
  categoryCode?: string;
  groupName?: string;
}

interface SectorSunburstChartProps {
  allocations: SectorAllocation[];
  onSegmentClick?: (code: string, level: 'category' | 'sector' | 'subsector') => void;
  selectedCodes?: string[];
}

interface TooltipData {
  x: number;
  y: number;
  code: string;
  name: string;
  percentage: number;
  level: 'category' | 'sector' | 'subsector';
}

// Slate and dark blue color palette
const COLORS = [
  '#1e293b', '#334155', '#475569', '#64748b', '#0f172a',
  '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93bbfe',
  '#1e3a8a', '#1d4ed8', '#2b6cb0', '#1a365d', '#1e3b70'
];

// Build multi-level hierarchy from allocations
function buildMultiLevelHierarchy(allocations: SectorAllocation[]) {
  const sectorGroupData = require('@/data/SectorGroup.json');
  
  // Create maps for quick lookup
  const sectorDataMap = new Map(sectorGroupData.data.map((s: any) => [s.code, s]));
  
  // Build hierarchy: Group -> Category -> 5-digit sectors
  const hierarchyMap = new Map<string, {
    name: string;
    code: string;
    totalPercentage: number;
    categories: Map<string, {
      name: string;
      code: string;
      totalPercentage: number;
      subsectors: SectorAllocation[];
    }>;
  }>();

  allocations.forEach(allocation => {
    let groupCode: string;
    let groupName: string;
    let categoryCode: string;
    let categoryName: string;
    
    // Handle different allocation levels
    if (allocation.code.length === 3 && allocation.code.endsWith('0')) {
      // This is a group-level allocation (e.g., 110 for Education)
      groupCode = allocation.code;
      groupName = allocation.name;
      categoryCode = allocation.code; // For group-level, use same code for category
      categoryName = allocation.name;
    } else if (allocation.code.length === 3) {
      // This is a category-level allocation (e.g., 111 for Education, Level Unspecified)
      const groupCodeBase = allocation.code.substring(0, 2) + '0';
      groupCode = groupCodeBase;
      categoryCode = allocation.code;
      categoryName = allocation.name;
      
      // Find group name from data
      const groupData = sectorGroupData.data.find((s: any) => (s as any)['codeforiati:group-code'] === groupCodeBase);
      groupName = groupData ? (groupData as any)['codeforiati:group-name'] : `Group ${groupCodeBase}`;
    } else if (allocation.code.length === 5) {
      // This is a 5-digit subsector
      const sectorData = sectorDataMap.get(allocation.code);
      if (!sectorData) return;
      
      groupCode = (sectorData as any)['codeforiati:group-code'] || allocation.code.substring(0, 2) + '0';
      groupName = (sectorData as any)['codeforiati:group-name'] || `Group ${groupCode}`;
      categoryCode = (sectorData as any)['codeforiati:category-code'] || allocation.code.substring(0, 3);
      categoryName = (sectorData as any)['codeforiati:category-name'] || `Category ${categoryCode}`;
    } else {
      return; // Skip unknown formats
    }
    
    // Initialize group if not exists
    if (!hierarchyMap.has(groupCode)) {
      hierarchyMap.set(groupCode, {
        name: groupName,
        code: groupCode,
        totalPercentage: 0,
        categories: new Map()
      });
    }
    
    const group = hierarchyMap.get(groupCode)!;
    
    // Initialize category if not exists
    if (!group.categories.has(categoryCode)) {
      group.categories.set(categoryCode, {
        name: categoryName,
        code: categoryCode,
        totalPercentage: 0,
        subsectors: []
      });
    }
    
    const category = group.categories.get(categoryCode)!;
    
    // Add the allocation at the appropriate level
    if (allocation.code.length === 5 || 
        (allocation.code.length === 3 && !allocation.code.endsWith('0'))) {
      // Add as subsector (5-digit or 3-digit category)
      const enhancedAllocation = {
        ...allocation,
        groupName: groupName,
        categoryName: categoryName
      };
      category.subsectors.push(enhancedAllocation);
    }
    
    // Update percentages
    category.totalPercentage += allocation.percentage;
    group.totalPercentage += allocation.percentage;
  });

  return hierarchyMap;
}

// Export function to get category color for consistency
export const getCategoryColorBySunburstChart = (allocations: SectorAllocation[], categoryCode: string): string => {
  const sectorGroupData = require('@/data/SectorGroup.json');
  const hierarchyMap = buildMultiLevelHierarchy(allocations.filter(a => a.percentage > 0));
  const groups = Array.from(hierarchyMap.entries()).map(([code]) => code).sort();
  
  // Find the group code for this category
  const sectorData = sectorGroupData.data.find((s: any) => 
    s['codeforiati:category-code'] === categoryCode || 
    s.code === categoryCode
  );
  const groupCode = sectorData?.['codeforiati:group-code'] || categoryCode.substring(0, 2) + '0';
  
  const index = groups.findIndex(code => code === groupCode);
  return COLORS[index % COLORS.length] || '#6B7280';
};

export default function SectorSunburstChart({ 
  allocations = [], 
  onSegmentClick, 
  selectedCodes = [] 
}: SectorSunburstChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Handle mouse events for tooltip
  const handleMouseEnter = (event: React.MouseEvent, data: { code: string; name: string; percentage: number; level: 'category' | 'sector' | 'subsector' }) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        ...data
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (tooltip) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltip(prev => prev ? {
          ...prev,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        } : null);
      }
    }
  };

  // Expand allocations to include parent levels for visualization
  const expandedAllocations = useMemo(() => {
    const sectorGroupData = require('@/data/SectorGroup.json');
    const expanded: SectorAllocation[] = [];
    const addedCodes = new Set<string>();
    
    // First add all real allocations
    allocations.forEach(allocation => {
      expanded.push(allocation);
      addedCodes.add(allocation.code);
    });
    
    // Then add virtual parent entries for 5-digit codes
    allocations.forEach(allocation => {
      // Only expand 5-digit codes
      if (allocation.code.length === 5 && allocation.percentage > 0) {
        const sectorData = sectorGroupData.data.find((s: any) => s.code === allocation.code);
        if (sectorData) {
          // Add category (3-digit) if not already present
          const categoryCode = sectorData['codeforiati:category-code'];
          const categoryName = sectorData['codeforiati:category-name'];
          if (categoryCode && !addedCodes.has(categoryCode)) {
            expanded.push({
              id: `virtual-${categoryCode}`,
              code: categoryCode,
              name: categoryName,
              percentage: 0, // Virtual entry for hierarchy visualization
              level: 'sector',
              category: categoryName,
              categoryCode: categoryCode
            });
            addedCodes.add(categoryCode);
          }
          
          // Add group (e.g., 110) if not already present
          const groupCode = sectorData['codeforiati:group-code'];
          const groupName = sectorData['codeforiati:group-name'];
          if (groupCode && !addedCodes.has(groupCode)) {
            expanded.push({
              id: `virtual-${groupCode}`,
              code: groupCode,
              name: groupName,
              percentage: 0, // Virtual entry for hierarchy visualization
              level: 'group',
              category: groupName,
              categoryCode: groupCode
            });
            addedCodes.add(groupCode);
          }
        }
      }
    });
    
    console.log('[SunburstChart] Expanded allocations:', expanded);
    return expanded;
  }, [allocations]);

  // Filter allocations with percentage > 0 (but keep virtual parents)
  const validAllocations = expandedAllocations.filter(allocation => 
    allocation.percentage > 0 || allocation.id?.startsWith('virtual-')
  );
  
  if (validAllocations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500">No Sector Data</div>
          <div className="text-xs text-gray-400">Add sectors to see the sunburst visualization</div>
        </div>
      </div>
    );
  }

  // Build hierarchy
  const hierarchyMap = buildMultiLevelHierarchy(validAllocations);
  
  // Debug logging
  console.log('[SunburstChart] Valid allocations:', validAllocations);
  console.log('[SunburstChart] Hierarchy map size:', hierarchyMap.size);
  console.log('[SunburstChart] Groups:', Array.from(hierarchyMap.keys()));
  hierarchyMap.forEach((group, groupCode) => {
    console.log(`[SunburstChart] Group ${groupCode} (${group.name}):`);
    group.categories.forEach((cat, catCode) => {
      console.log(`  Category ${catCode} (${cat.name}): ${cat.subsectors.length} subsectors`);
    });
  });
  
  // Calculate dimensions
  const centerX = 200;
  const centerY = 200;
  const innerRadius = 50;
  const middleRadius = 100;
  const outerRadius = 150;
  
  // Calculate unallocated percentage (only from real allocations, not virtual)
  const totalAllocated = validAllocations
    .filter(a => !a.id?.startsWith('virtual-'))
    .reduce((sum, a) => sum + a.percentage, 0);
  const unallocatedPercentage = Math.max(0, 100 - totalAllocated);

  // Render the multi-level sunburst
  const renderSunburst = () => {
    const elements: JSX.Element[] = [];
    let currentAngle = 0;
    const groups = Array.from(hierarchyMap.entries());
    
    // Add unallocated segment if needed
    if (unallocatedPercentage > 0) {
      const unallocatedAngle = (unallocatedPercentage / 100) * 360;
      
      // Render unallocated segment across all rings
      const innerPath = createArcPath(
        centerX,
        centerY,
        innerRadius,
        middleRadius,
        currentAngle,
        currentAngle + unallocatedAngle
      );
      
      const middlePath = createArcPath(
        centerX,
        centerY,
        middleRadius,
        outerRadius,
        currentAngle,
        currentAngle + unallocatedAngle
      );
      
      const outerPath = createArcPath(
        centerX,
        centerY,
        outerRadius,
        outerRadius + 40,
        currentAngle,
        currentAngle + unallocatedAngle
      );
      
      elements.push(
        <g key="unallocated">
          <path
            d={innerPath}
            fill="#E5E7EB"
            stroke="#fff"
            strokeWidth="2"
            opacity="0.6"
            onMouseEnter={(e) => handleMouseEnter(e, {
              code: 'unallocated',
              name: 'Unallocated',
              percentage: unallocatedPercentage,
              level: 'category'
            })}
            onMouseLeave={handleMouseLeave}
          />
          <path
            d={middlePath}
            fill="#E5E7EB"
            stroke="#fff"
            strokeWidth="1"
            opacity="0.5"
            onMouseEnter={(e) => handleMouseEnter(e, {
              code: 'unallocated',
              name: 'Unallocated',
              percentage: unallocatedPercentage,
              level: 'sector'
            })}
            onMouseLeave={handleMouseLeave}
          />
          <path
            d={outerPath}
            fill="#E5E7EB"
            stroke="#fff"
            strokeWidth="1"
            opacity="0.4"
            onMouseEnter={(e) => handleMouseEnter(e, {
              code: 'unallocated',
              name: 'Unallocated',
              percentage: unallocatedPercentage,
              level: 'subsector'
            })}
            onMouseLeave={handleMouseLeave}
          />
        </g>
      );
      
      currentAngle += unallocatedAngle;
    }
    
    groups.forEach(([groupCode, groupData], groupIndex) => {
      // For virtual entries, we need to sum up actual percentages from real allocations
      const actualGroupPercentage = Array.from(groupData.categories.values())
        .reduce((sum, cat) => sum + cat.subsectors
          .filter(s => !s.id?.startsWith('virtual-'))
          .reduce((catSum, s) => catSum + s.percentage, 0), 0);
      
      const groupPercentage = actualGroupPercentage || groupData.totalPercentage;
      const groupAngle = (groupPercentage / 100) * 360;
      const groupColor = COLORS[groupIndex % COLORS.length];
      
      // Skip rendering if angle is 0
      if (groupAngle === 0) {
        return;
      }
      
      // Inner ring - Group (e.g. Education, Health)
      const innerPath = createArcPath(
        centerX,
        centerY,
        innerRadius,
        middleRadius,
        currentAngle,
        currentAngle + groupAngle
      );
      
      elements.push(
        <g key={`group-${groupCode}`}>
          <path
            d={innerPath}
            fill={groupColor}
            stroke="#fff"
            strokeWidth="2"
            opacity="0.9"
            style={{
              cursor: onSegmentClick ? 'pointer' : 'default'
            }}
            onClick={() => onSegmentClick?.(groupCode, 'category')}
            onMouseEnter={(e) => handleMouseEnter(e, {
              code: groupCode,
              name: groupData.name,
              percentage: groupPercentage,
              level: 'category'
            })}
            onMouseLeave={handleMouseLeave}
          />
        </g>
      );
      
      // Middle and outer rings - Categories and 5-digit sectors
      let categoryStartAngle = currentAngle;
      const categories = Array.from(groupData.categories.values());
      
      categories.forEach((categoryData, categoryIndex) => {
        // For virtual entries, sum up actual percentages from real subsectors
        const actualCategoryPercentage = categoryData.subsectors
          .filter(s => !s.id?.startsWith('virtual-'))
          .reduce((sum, s) => sum + s.percentage, 0);
        
        const categoryPercentage = actualCategoryPercentage || categoryData.totalPercentage;
        const categoryAngle = (categoryPercentage / 100) * 360;
        
        // Skip rendering if angle is 0
        if (categoryAngle === 0) {
          return;
        }
        
        // Middle ring - Categories (3-digit)
        const middlePath = createArcPath(
          centerX,
          centerY,
          middleRadius,
          outerRadius,
          categoryStartAngle,
          categoryStartAngle + categoryAngle
        );
        
        elements.push(
          <path
            key={`category-${categoryData.code}`}
            d={middlePath}
            fill={groupColor}
            stroke="#fff"
            strokeWidth="1"
            opacity="0.7"
            style={{
              cursor: onSegmentClick ? 'pointer' : 'default'
            }}
            onClick={() => onSegmentClick?.(categoryData.code, 'sector')}
            onMouseEnter={(e) => handleMouseEnter(e, {
              code: categoryData.code,
              name: categoryData.name,
              percentage: categoryPercentage,
              level: 'sector'
            })}
            onMouseLeave={handleMouseLeave}
          />
        );
        
        // Outer ring - 5-digit subsectors
        let subsectorStartAngle = categoryStartAngle;
        categoryData.subsectors.forEach((subsector, subsectorIndex) => {
          const subsectorPercentage = subsector.percentage;
          const subsectorAngle = (subsectorPercentage / 100) * 360;
          
          const outerPath = createArcPath(
            centerX,
            centerY,
            outerRadius,
            outerRadius + 40,
            subsectorStartAngle,
            subsectorStartAngle + subsectorAngle
          );
          
          const isSubsectorSelected = selectedCodes.includes(subsector.code);
          
          elements.push(
            <g key={`subsector-${subsector.code}`}>
              <path
                d={outerPath}
                fill={groupColor}
                stroke="#fff"
                strokeWidth="1"
                opacity={isSubsectorSelected ? "0.6" : "0.5"}
                style={{
                  cursor: onSegmentClick ? 'pointer' : 'default',
                  filter: isSubsectorSelected ? 'brightness(1.1)' : 'none'
                }}
                onClick={() => onSegmentClick?.(subsector.code, 'subsector')}
                onMouseEnter={(e) => handleMouseEnter(e, {
                  code: subsector.code,
                  name: `${subsector.code} – ${subsector.name}`,
                  percentage: subsector.percentage,
                  level: 'subsector'
                })}
                onMouseLeave={handleMouseLeave}
              />
            </g>
          );
          
          subsectorStartAngle += subsectorAngle;
        });
        
        categoryStartAngle += categoryAngle;
      });
      
      currentAngle += groupAngle;
    });
    
    return elements;
  };

  // Tooltip component
  const renderTooltip = () => {
    if (!tooltip) return null;
    
    return (
      <div
        className="absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm pointer-events-none"
        style={{
          left: tooltip.x + 10,
          top: tooltip.y - 10,
          maxWidth: '200px'
        }}
      >
        <div className="font-semibold">{tooltip.name}</div>
        <div className="text-gray-300">
          {tooltip.level === 'category' ? 'DAC Category' : 
           tooltip.level === 'sector' ? 'DAC 3-digit Sector' : 'DAC 5-digit Sub-sector'}
        </div>
        <div className="text-gray-300">{tooltip.percentage.toFixed(1)}% allocation</div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
      <svg 
        ref={svgRef}
        width={400} 
        height={400}
        className="max-w-full max-h-full"
        onMouseMove={handleMouseMove}
      >
        {renderSunburst()}
        
        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={innerRadius - 5}
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#374151"
        >
          {totalAllocated.toFixed(0)}%
        </text>
        <text
          x={centerX}
          y={centerY + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fill="#6b7280"
        >
          Allocated
        </text>
      </svg>
      {renderTooltip()}
    </div>
  );
}

// Helper function to create arc path
function createArcPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const startAngleRad = (startAngle - 90) * Math.PI / 180;
  const endAngleRad = (endAngle - 90) * Math.PI / 180;
  
  const x1 = cx + innerRadius * Math.cos(startAngleRad);
  const y1 = cy + innerRadius * Math.sin(startAngleRad);
  const x2 = cx + outerRadius * Math.cos(startAngleRad);
  const y2 = cy + outerRadius * Math.sin(startAngleRad);
  const x3 = cx + outerRadius * Math.cos(endAngleRad);
  const y3 = cy + outerRadius * Math.sin(endAngleRad);
  const x4 = cx + innerRadius * Math.cos(endAngleRad);
  const y4 = cy + innerRadius * Math.sin(endAngleRad);
  
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  
  return [
    `M ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}`,
    `L ${x4} ${y4}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}`,
    'Z'
  ].join(' ');
}