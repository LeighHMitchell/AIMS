'use client';

import React, { useState } from 'react';
import { buildSectorHierarchy, getSectorByCode, getHierarchyByCode } from '@/data/sector-hierarchy';

interface SectorAllocation {
  id: string;
  code: string;
  name: string;
  percentage: number;
  level?: 'group' | 'sector' | 'subsector'; // Add level field for multi-level support
  category?: string;
  categoryName?: string;
  categoryCode?: string;
}

interface SectorSunburstChartProps {
  allocations: SectorAllocation[];
}

interface TooltipData {
  x: number;
  y: number;
  code: string;
  name: string;
  percentage: number;
  level: 'group' | 'sector' | 'subsector';
  parentName?: string;
  description?: string;
}

// Gray/Slate color palette for groups (darker tones for inner ring)
export const GROUP_COLORS = [
  '#1e293b', '#334155', '#475569', '#64748b', '#374151',
  '#4b5563', '#6b7280', '#374151', '#1f2937', '#111827',
  '#0f172a', '#262626', '#404040', '#525552', '#171717',
  '#2d2d2d', '#3a3a3a', '#484848', '#565656', '#1a1a1a'
];

// Export function to get category color by group code for use in other components
export const getCategoryColorBySunburstChart = (allocations: SectorAllocation[], categoryCode: string): string => {
  // Build the same hierarchy as the sunburst chart to get consistent color indexing
  const hierarchyMap = buildMultiLevelHierarchy(allocations.filter(a => a.percentage > 0));
  const groups = Array.from(hierarchyMap.entries()).map(([code, data]) => ({
    code,
    name: data.name,
    totalPercentage: data.totalPercentage
  }));
  
  // Find the group index for this category
  const groupIndex = groups.findIndex(group => group.code === categoryCode);
  return groupIndex >= 0 ? GROUP_COLORS[groupIndex % GROUP_COLORS.length] : '#6b7280';
};

// Helper function to get lighter shades for outer rings
const getLighterShade = (baseColor: string, level: 'sector' | 'subsector') => {
  // Convert hex to RGB
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Progressive lightening: darker (groups) → medium (sectors) → lighter (subsectors)
  const factor = level === 'sector' ? 0.4 : 0.7; // More dramatic lightening
  
  const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
  const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
  const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
  
  return `rgb(${newR}, ${newG}, ${newB})`;
};

// Helper function to determine allocation level
const determineLevel = (allocation: SectorAllocation): 'group' | 'sector' | 'subsector' => {
  if (allocation.level) {
    return allocation.level;
  }
  
  // Fallback: detect from code structure
  const codeLength = allocation.code.length;
  if (codeLength === 3) return 'group';
  if (codeLength === 5) return 'subsector';
  return 'sector'; // Assume 4-digit codes are sectors
};

// Helper function to build multi-level hierarchy
const buildMultiLevelHierarchy = (allocations: SectorAllocation[]) => {
  const groupMap = new Map<string, {
    name: string;
    totalPercentage: number;
    isDirectSelection: boolean;
    sectors: Map<string, {
      name: string;
      totalPercentage: number;
      isDirectSelection: boolean;
      subsectors: SectorAllocation[];
    }>;
  }>();

  allocations.forEach(allocation => {
    const level = determineLevel(allocation);
    
    if (level === 'group') {
      // Direct group selection
      if (!groupMap.has(allocation.code)) {
        groupMap.set(allocation.code, {
          name: allocation.name,
          totalPercentage: 0,
          isDirectSelection: false,
          sectors: new Map()
        });
      }
      const groupData = groupMap.get(allocation.code)!;
      groupData.totalPercentage += allocation.percentage;
      groupData.isDirectSelection = true;
    } else {
      // Sector or sub-sector selection - need to find parent hierarchy
      const { group, sector, subsector } = getHierarchyByCode(allocation.code);
      
      if (!group) {
        console.warn(`Could not find hierarchy for code: ${allocation.code}`);
        return;
      }
      
      // Initialize group if not exists
      if (!groupMap.has(group.code)) {
        groupMap.set(group.code, {
          name: group.name,
          totalPercentage: 0,
          isDirectSelection: false,
          sectors: new Map()
        });
      }
      
      const groupData = groupMap.get(group.code)!;
      
      if (level === 'sector') {
        // Direct sector selection
        if (sector) {
          if (!groupData.sectors.has(sector.code)) {
            groupData.sectors.set(sector.code, {
              name: sector.name,
              totalPercentage: 0,
              isDirectSelection: false,
              subsectors: []
            });
          }
          const sectorData = groupData.sectors.get(sector.code)!;
          sectorData.totalPercentage += allocation.percentage;
          sectorData.isDirectSelection = true;
          groupData.totalPercentage += allocation.percentage;
        }
      } else {
        // Sub-sector selection
        if (sector && subsector) {
          if (!groupData.sectors.has(sector.code)) {
            groupData.sectors.set(sector.code, {
              name: sector.name,
              totalPercentage: 0,
              isDirectSelection: false,
              subsectors: []
            });
          }
          const sectorData = groupData.sectors.get(sector.code)!;
          sectorData.subsectors.push(allocation);
          sectorData.totalPercentage += allocation.percentage;
          groupData.totalPercentage += allocation.percentage;
        }
      }
    }
  });
  
  return groupMap;
};

export default function SectorSunburstChart({ allocations = [] }: SectorSunburstChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Early return if no allocations
  if (!allocations || allocations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500">No Sector Data</div>
          <div className="text-xs text-gray-400">Add sectors to see the sunburst visualization</div>
        </div>
      </div>
    );
  }

  // Filter allocations with percentage > 0
  const validAllocations = allocations.filter(allocation => allocation.percentage > 0);
  
  if (validAllocations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500">No Valid Allocations</div>
          <div className="text-xs text-gray-400">Add percentage values to see the visualization</div>
        </div>
      </div>
    );
  }

  // Build multi-level hierarchy with support for group, sector, and sub-sector selections
  const hierarchyMap = buildMultiLevelHierarchy(validAllocations);

  const groups = Array.from(hierarchyMap.entries()).map(([code, data]) => ({
    code,
    name: data.name,
    totalPercentage: data.totalPercentage,
    isDirectSelection: data.isDirectSelection,
    sectors: Array.from(data.sectors.entries()).map(([sectorCode, sectorData]) => ({
      code: sectorCode,
      name: sectorData.name,
      totalPercentage: sectorData.totalPercentage,
      isDirectSelection: sectorData.isDirectSelection,
      subsectors: sectorData.subsectors
    }))
  }));

  const totalPercentage = groups.reduce((sum, group) => sum + group.totalPercentage, 0);
  
  // Chart dimensions - 3 distinct rings (REVERSED)
  const outerRadius = 180;        // Sub-sectors (outer ring)
  const middleRadius = 130;       // Sectors (middle ring)
  const innerRadius = 80;         // Groups (inner ring)
  const centerRadius = 30;        // Center
  
  const centerX = outerRadius + 60;
  const centerY = outerRadius + 60;

  // Helper function to create SVG path for arc
  const createArcPath = (startAngle: number, endAngle: number, innerR: number, outerR: number) => {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    
    const x1 = centerX + innerR * Math.cos(startRad);
    const y1 = centerY + innerR * Math.sin(startRad);
    const x2 = centerX + outerR * Math.cos(startRad);
    const y2 = centerY + outerR * Math.sin(startRad);
    
    const x3 = centerX + outerR * Math.cos(endRad);
    const y3 = centerY + outerR * Math.sin(endRad);
    const x4 = centerX + innerR * Math.cos(endRad);
    const y4 = centerY + innerR * Math.sin(endRad);
    
    const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    
    return [
      `M ${x1} ${y1}`,
      `L ${x2} ${y2}`,
      `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x3} ${y3}`,
      `L ${x4} ${y4}`,
      `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x1} ${y1}`,
      'Z'
    ].join(' ');
  };

  const handleMouseEnter = (e: React.MouseEvent, data: TooltipData) => {
    setTooltip({
      ...data,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tooltip) {
      setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    }
  };

  // Calculate angles for groups
  let currentAngle = 0;
  const groupArcs = groups.map((group, groupIndex) => {
    const groupAngle = (group.totalPercentage / totalPercentage) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + groupAngle;
    currentAngle = endAngle;

    return {
      ...group,
      startAngle,
      endAngle,
      color: GROUP_COLORS[groupIndex % GROUP_COLORS.length]
    };
  });

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      <svg 
        width={centerX * 2} 
        height={centerY * 2}
        className="max-w-full max-h-full"
        onMouseMove={handleMouseMove}
      >
        {/* Render 3-level hierarchy */}
        {groupArcs.map((group, groupIndex) => {
          // Calculate sectors within this group
          let sectorStartAngle = group.startAngle;
          const sectorArcs = group.sectors.map(sector => {
            const sectorAngle = (sector.totalPercentage / group.totalPercentage) * (group.endAngle - group.startAngle);
            const sectorEndAngle = sectorStartAngle + sectorAngle;
            const arc = {
              ...sector,
              startAngle: sectorStartAngle,
              endAngle: sectorEndAngle,
              groupColor: group.color
            };
            sectorStartAngle = sectorEndAngle;
            return arc;
          });

          return (
            <g key={group.code}>
              {/* Group arc (inner ring) */}
              <path
                d={createArcPath(group.startAngle, group.endAngle, centerRadius, innerRadius)}
                fill={group.color}
                stroke="#fff"
                strokeWidth="2"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onMouseEnter={(e) => handleMouseEnter(e, {
                  x: e.clientX,
                  y: e.clientY,
                  code: group.code,
                  name: group.name,
                  percentage: group.totalPercentage,
                  level: 'group'
                })}
                onMouseLeave={handleMouseLeave}
              />
              
              {/* Sector arcs (middle ring) */}
              {sectorArcs.map((sector, sectorIndex) => {
                const sectorColor = getLighterShade(sector.groupColor, 'sector');
                
                // Calculate subsectors within this sector
                let subsectorStartAngle = sector.startAngle;
                const subsectorArcs = sector.subsectors.map(subsector => {
                  const subsectorAngle = (subsector.percentage / sector.totalPercentage) * (sector.endAngle - sector.startAngle);
                  const subsectorEndAngle = subsectorStartAngle + subsectorAngle;
                  const arc = {
                    ...subsector,
                    startAngle: subsectorStartAngle,
                    endAngle: subsectorEndAngle,
                    sectorColor
                  };
                  subsectorStartAngle = subsectorEndAngle;
                  return arc;
                });

                return (
                  <g key={sector.code}>
                    {/* Sector arc (middle ring) */}
                    <path
                      d={createArcPath(sector.startAngle, sector.endAngle, innerRadius, middleRadius)}
                      fill={sectorColor}
                      stroke="#fff"
                      strokeWidth="1"
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                                              onMouseEnter={(e) => handleMouseEnter(e, {
                          x: e.clientX,
                          y: e.clientY,
                          code: sector.code,
                          name: sector.name,
                          percentage: sector.totalPercentage,
                          level: 'sector'
                        })}
                      onMouseLeave={handleMouseLeave}
                    />
                    


                    {/* Sub-sector arcs (outer ring) */}
                    {subsectorArcs.map((subsector, subsectorIndex) => {
                      const subsectorColor = getLighterShade(sector.groupColor, 'subsector');
                      const { subsector: subsectorInfo } = getSectorByCode(subsector.code);
                      
                      return (
                        <g key={subsector.id}>
                          <path
                            d={createArcPath(subsector.startAngle, subsector.endAngle, middleRadius, outerRadius)}
                            fill={subsectorColor}
                            stroke="#fff"
                            strokeWidth="1"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                                          onMouseEnter={(e) => handleMouseEnter(e, {
                                x: e.clientX,
                                y: e.clientY,
                                code: subsector.code,
                                name: subsector.name || subsectorInfo?.name || `Sub-sector ${subsector.code}`,
                                percentage: subsector.percentage,
                                level: 'subsector',
                                description: subsectorInfo?.description
                              })}
                            onMouseLeave={handleMouseLeave}
                          />
                          
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={centerRadius}
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="2"
        />
      </svg>

            {/* Enhanced Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-100 text-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-300 pointer-events-none text-sm max-w-xs"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="font-semibold text-gray-900">
            {tooltip.code} - {tooltip.name}
              </div>
          <div className="text-xs text-gray-600">
            {tooltip.level === 'group' && 'Sector Group'}
            {tooltip.level === 'sector' && 'Sector'}
            {tooltip.level === 'subsector' && 'Sub-sector'}: {tooltip.percentage.toFixed(1)}%
          </div>
          {tooltip.description && tooltip.level === 'subsector' && (
            <div className="text-xs text-gray-500 mt-1 max-w-xs">
              {tooltip.description.slice(0, 100)}{tooltip.description.length > 100 ? '...' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 