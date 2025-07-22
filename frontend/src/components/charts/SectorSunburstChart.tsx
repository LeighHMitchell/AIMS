'use client';

import React from 'react';

interface SectorAllocation {
  id: string;
  code: string;
  name: string;
  percentage: number;
  category?: string;
  categoryName?: string;
  categoryCode?: string;
}

interface SectorSunburstChartProps {
  allocations: SectorAllocation[];
}

// Simple color palette for sectors
const COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#6366F1',
  '#EC4899', '#84CC16', '#06B6D4', '#F97316', '#14B8A6',
  '#F43F5E', '#22C55E', '#A855F7', '#0EA5E9', '#EAB308'
];

export default function SectorSunburstChart({ allocations = [] }: SectorSunburstChartProps) {
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

  // Group by category
  const categoryMap = new Map<string, SectorAllocation[]>();
  
  validAllocations.forEach(allocation => {
    const categoryCode = allocation.code.substring(0, 3);
    const categoryName = allocation.category || `Category ${categoryCode}`;
    
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, []);
    }
    categoryMap.get(categoryName)!.push(allocation);
  });

  const chartData = Array.from(categoryMap.entries()).map(([categoryName, sectors]) => ({
    name: categoryName,
    children: sectors
  }));

  const totalSectors = chartData.reduce((sum, category) => sum + category.children.length, 0);
  const radius = 200;
  const centerX = radius + 50;
  const centerY = radius + 50;

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg 
        width={centerX * 2} 
        height={centerY * 2}
        className="max-w-full max-h-full"
      >
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="#f3f4f6"
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {/* Render sectors */}
        {chartData.map((category, categoryIndex) => {
          const categoryColor = COLORS[categoryIndex % COLORS.length];
          const categoryAngle = (360 / chartData.length) * categoryIndex;
          const sectorAngle = 360 / chartData.length;
          
          return category.children.map((sector, sectorIndex) => {
            const sectorStartAngle = categoryAngle + (sectorAngle / category.children.length) * sectorIndex;
            const sectorEndAngle = categoryAngle + (sectorAngle / category.children.length) * (sectorIndex + 1);
            const sectorPercentage = sector.percentage;
            
            // Calculate arc path
            const startRad = (sectorStartAngle - 90) * Math.PI / 180;
            const endRad = (sectorEndAngle - 90) * Math.PI / 180;
            
            const x1 = centerX + radius * Math.cos(startRad);
            const y1 = centerY + radius * Math.sin(startRad);
            const x2 = centerX + radius * Math.cos(endRad);
            const y2 = centerY + radius * Math.sin(endRad);
            
            const largeArcFlag = Math.abs(sectorEndAngle - sectorStartAngle) > 180 ? 1 : 0;
            
            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');

            return (
              <g key={`${category.name}-${sector.code}`}>
                <path
                  d={pathData}
                  fill={categoryColor}
                  opacity={0.7}
                  stroke="#fff"
                  strokeWidth="1"
                />
                {/* Sector label */}
                {sectorPercentage > 5 && (
                  <text
                    x={centerX + (radius * 0.7) * Math.cos((startRad + endRad) / 2)}
                    y={centerY + (radius * 0.7) * Math.sin((startRad + endRad) / 2)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fill="#fff"
                    fontWeight="bold"
                  >
                    {sectorPercentage.toFixed(0)}%
                  </text>
                )}
              </g>
            );
          });
        })}

        {/* Center label */}
        <circle
          cx={centerX}
          cy={centerY}
          r="30"
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="bold"
          fill="#374151"
        >
          {totalSectors}
        </text>
        <text
          x={centerX}
          y={centerY + 15}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="10"
          fill="#6b7280"
        >
          Sectors
        </text>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border">
          <div className="text-xs font-medium text-gray-700 mb-2">Categories:</div>
          <div className="grid grid-cols-2 gap-2">
            {chartData.map((category, index) => (
              <div key={category.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-gray-600 truncate">{category.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 