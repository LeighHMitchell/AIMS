'use client';

import React from 'react';

interface SectorAllocation {
  id: string;
  code: string;
  name: string;
  percentage: number;
  level?: 'group' | 'sector' | 'subsector';
  category?: string;
  categoryName?: string;
  categoryCode?: string;
}

interface SectorSunburstChartProps {
  allocations: SectorAllocation[];
}

// Extended color palette for better visual distinction
const COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#6366F1',
  '#EC4899', '#84CC16', '#06B6D4', '#F97316', '#14B8A6',
  '#F43F5E', '#22C55E', '#A855F7', '#0EA5E9', '#EAB308',
  '#EF4444', '#8B5CF6', '#59D4E8', '#FAB12F', '#4ADE80'
];

// Build multi-level hierarchy from allocations
function buildMultiLevelHierarchy(allocations: SectorAllocation[]) {
  const hierarchyMap = new Map<string, {
    name: string;
    code: string;
    totalPercentage: number;
    sectors: Map<string, {
      name: string;
      code: string;
      totalPercentage: number;
      subsectors: SectorAllocation[];
    }>;
  }>();

  allocations.forEach(allocation => {
    const groupCode = allocation.code.substring(0, 3);
    const sectorCode = allocation.code.length >= 3 ? allocation.code.substring(0, 3) : groupCode;
    
    // Initialize group if not exists
    if (!hierarchyMap.has(groupCode)) {
      hierarchyMap.set(groupCode, {
        name: allocation.category || `Group ${groupCode}`,
        code: groupCode,
        totalPercentage: 0,
        sectors: new Map()
      });
    }
    
    const group = hierarchyMap.get(groupCode)!;
    
    // Handle based on allocation level
    if (allocation.code.length === 3) {
      // This is a group-level allocation
      group.totalPercentage += allocation.percentage;
    } else if (allocation.code.length === 5) {
      // This is a subsector
      if (!group.sectors.has(sectorCode)) {
        group.sectors.set(sectorCode, {
          name: allocation.categoryName || `Sector ${sectorCode}`,
          code: sectorCode,
          totalPercentage: 0,
          subsectors: []
        });
      }
      const sector = group.sectors.get(sectorCode)!;
      sector.subsectors.push(allocation);
      sector.totalPercentage += allocation.percentage;
      group.totalPercentage += allocation.percentage;
    }
  });

  return hierarchyMap;
}

// Export function to get category color for consistency
export const getCategoryColorBySunburstChart = (allocations: SectorAllocation[], categoryCode: string): string => {
  const hierarchyMap = buildMultiLevelHierarchy(allocations.filter(a => a.percentage > 0));
  const groups = Array.from(hierarchyMap.entries()).map(([code]) => code).sort();
  const index = groups.findIndex(code => code === categoryCode);
  return COLORS[index % COLORS.length] || '#6B7280';
};

export default function SectorSunburstChart({ allocations = [] }: SectorSunburstChartProps) {
  // Filter allocations with percentage > 0
  const validAllocations = allocations.filter(allocation => allocation.percentage > 0);
  
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
  
  // Calculate dimensions
  const centerX = 200;
  const centerY = 200;
  const innerRadius = 50;
  const middleRadius = 100;
  const outerRadius = 150;

  // Render the multi-level sunburst
  const renderSunburst = () => {
    const elements: JSX.Element[] = [];
    let currentAngle = 0;
    const groups = Array.from(hierarchyMap.entries());
    
    groups.forEach(([groupCode, groupData], groupIndex) => {
      const groupPercentage = groupData.totalPercentage;
      const groupAngle = (groupPercentage / 100) * 360;
      const groupColor = COLORS[groupIndex % COLORS.length];
      
      // Inner ring - Group/Category
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
          />
          {groupAngle > 15 && (
            <text
              x={centerX + ((innerRadius + middleRadius) / 2) * Math.cos((currentAngle + groupAngle / 2 - 90) * Math.PI / 180)}
              y={centerY + ((innerRadius + middleRadius) / 2) * Math.sin((currentAngle + groupAngle / 2 - 90) * Math.PI / 180)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fill="#fff"
              fontWeight="bold"
            >
              {groupCode}
            </text>
          )}
        </g>
      );
      
      // Middle and outer rings - Sectors and Subsectors
      let sectorStartAngle = currentAngle;
      const sectors = Array.from(groupData.sectors.values());
      
      sectors.forEach((sectorData, sectorIndex) => {
        const sectorPercentage = sectorData.totalPercentage;
        const sectorAngle = (sectorPercentage / 100) * 360;
        
        // Middle ring - Sectors
        const middlePath = createArcPath(
          centerX,
          centerY,
          middleRadius,
          outerRadius,
          sectorStartAngle,
          sectorStartAngle + sectorAngle
        );
        
        elements.push(
          <path
            key={`sector-${sectorData.code}`}
            d={middlePath}
            fill={groupColor}
            stroke="#fff"
            strokeWidth="1"
            opacity="0.7"
          />
        );
        
        // Outer ring - Subsectors
        let subsectorStartAngle = sectorStartAngle;
        sectorData.subsectors.forEach((subsector, subsectorIndex) => {
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
          
          elements.push(
            <g key={`subsector-${subsector.code}`}>
              <path
                d={outerPath}
                fill={groupColor}
                stroke="#fff"
                strokeWidth="1"
                opacity="0.5"
              />
              {subsectorAngle > 10 && (
                <text
                  x={centerX + (outerRadius + 20) * Math.cos((subsectorStartAngle + subsectorAngle / 2 - 90) * Math.PI / 180)}
                  y={centerY + (outerRadius + 20) * Math.sin((subsectorStartAngle + subsectorAngle / 2 - 90) * Math.PI / 180)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fill="#374151"
                >
                  {subsector.percentage.toFixed(0)}%
                </text>
              )}
            </g>
          );
          
          subsectorStartAngle += subsectorAngle;
        });
        
        sectorStartAngle += sectorAngle;
      });
      
      currentAngle += groupAngle;
    });
    
    return elements;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <svg 
        width={400} 
        height={400}
        className="max-w-full max-h-full"
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
          100%
        </text>
        <text
          x={centerX}
          y={centerY + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fill="#6b7280"
        >
          Total
        </text>
      </svg>
      
      {/* Legend */}
      <div className="mt-4 w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border">
          <div className="text-xs font-medium text-gray-700 mb-2">Sector Categories:</div>
          <div className="grid grid-cols-2 gap-2">
            {Array.from(hierarchyMap.entries()).map(([code, data], index) => (
              <div key={code} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-gray-600 truncate">{data.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t">
            <div className="text-xs text-gray-500">
              <div>• Inner ring: Categories</div>
              <div>• Middle ring: Sectors</div>
              <div>• Outer ring: Sub-sectors</div>
            </div>
          </div>
        </div>
      </div>
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