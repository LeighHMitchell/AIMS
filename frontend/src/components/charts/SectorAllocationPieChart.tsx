'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getSectorLabel, getSectorDescription } from '@/components/forms/SimpleSectorSelect';
import dacSectorsData from '@/data/dac-sectors.json';

interface SectorAllocation {
  id: string;
  code: string;
  percentage: number;
}

interface SectorChartData {
  code: string;
  label: string;
  category: string;
  categoryLabel: string;
  value: number;
  description: string;
}

interface SectorAllocationPieChartProps {
  allocations: SectorAllocation[];
}

// Financial Times / Economist inspired color palette
const SECTOR_COLORS = [
  '#18375F', // Navy
  '#7A8471', // Olive green
  '#6FA8DC', // Soft grey-blue
  '#C3514E', // Rust red
  '#A6A09B', // Beige
  '#5B4A3A', // Dark brown
  '#8B4F47', // Muted burgundy
  '#4A5D23', // Dark olive
  '#2C5F41', // Forest green
  '#7B6143', // Warm grey
  '#4A5568', // Slate grey
  '#744C4C', // Dusty rose
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
  
  // Transform allocations into chart data
  const { sectorData, categoryData } = useMemo(() => {
    const categoryLookup = createCategoryLookup();
    const sectors = allocations
      .filter(allocation => allocation.percentage > 0) // Only show sectors with percentages
      .map(allocation => {
        const fullLabel = getSectorLabel(allocation.code);
        const description = getSectorDescription(allocation.code);
        
        // Extract category code (first 3 digits) and category name
        const categoryCode = allocation.code.substring(0, 3);
        const categoryMatch = fullLabel.match(/^(\d{3}\s*-\s*[^,]+)/);
        const categoryLabel = categoryMatch ? categoryMatch[1] : `${categoryCode} - Category`;
        
        // Extract sector name (after the dash)
        const sectorNameMatch = fullLabel.match(/\d{5}\s*-\s*(.+)$/);
        const sectorName = sectorNameMatch ? sectorNameMatch[1] : fullLabel;
        
        return {
          code: allocation.code,
          label: sectorName,
          category: categoryCode,
          categoryLabel,
          value: allocation.percentage,
          description
        };
      });

    // Aggregate data by category for inner ring
    const categoryMap = new Map<string, { label: string; value: number; count: number }>();
    
    sectors.forEach(sector => {
      const existing = categoryMap.get(sector.category);
      if (existing) {
        existing.value += sector.value;
        existing.count += 1;
      } else {
        // Use the proper category lookup for the 3-digit code
        const categoryName = categoryLookup[sector.category] || 'Unknown Category';
        
        categoryMap.set(sector.category, {
          label: categoryName,
          value: sector.value,
          count: 1
        });
      }
    });

    const categories = Array.from(categoryMap.entries()).map(([code, data]) => ({
      code,
      label: data.label,
      value: data.value,
      count: data.count
    }));

    return { sectorData: sectors, categoryData: categories };
  }, [allocations]);

  // Clean tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // Check if this is sector data (has 'code' field) or category data
      const isSectorData = 'code' in data && data.code.length === 5;
      
      if (isSectorData) {
        // Sector tooltip
        return (
          <div className="bg-white border border-gray-300 px-3 py-2 rounded shadow text-sm">
            <div className="font-medium">
              {data.code} – {data.label}
            </div>
            <div>{data.value.toFixed(1)}%</div>
          </div>
        );
      } else {
        // Category tooltip
        return (
          <div className="bg-white border border-gray-300 px-3 py-2 rounded shadow text-sm">
            <div className="font-medium">
              {data.code} – {data.label}
            </div>
            <div>{data.value.toFixed(1)}%</div>
          </div>
        );
      }
    }
    return null;
  };


  if (sectorData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <div className="text-center">
          <div className="text-sm font-medium mb-1">No Sector Data</div>
          <div className="text-xs">Add sectors with percentages to see the visualization</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart Title */}
      <div className="text-center">
        <h4 className="text-base font-semibold text-gray-900">Sector Allocation Breakdown</h4>
        <p className="text-xs text-gray-600 mt-1">
          Visual representation of OECD DAC sector percentages
        </p>
      </div>

      {/* Chart Container */}
      <div className="bg-white rounded-lg border p-2">
        <ResponsiveContainer width="100%" height={500}>
          <PieChart>
            {/* Inner ring - Categories */}
            <Pie
              data={categoryData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={120}
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={800}
            >
              {categoryData.map((entry, index) => (
                <Cell
                  key={`category-${index}`}
                  fill={SECTOR_COLORS[index % SECTOR_COLORS.length]}
                  stroke="#fff"
                  strokeWidth={2}
                  opacity={0.7}
                />
              ))}
            </Pie>
            
            {/* Outer ring - Sectors */}
            <Pie
              data={sectorData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={120}
              outerRadius={190}
              isAnimationActive={true}
              animationBegin={200}
              animationDuration={800}
            >
              {sectorData.map((entry, index) => {
                // Find category index to use consistent colors
                const categoryIndex = categoryData.findIndex(cat => cat.code === entry.category);
                return (
                  <Cell
                    key={`sector-${index}`}
                    fill={SECTOR_COLORS[categoryIndex % SECTOR_COLORS.length]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              })}
            </Pie>
            
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>



    </div>
  );
}