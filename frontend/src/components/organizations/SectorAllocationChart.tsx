"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  PieChart as PieChartIcon,
  Target,
  TrendingUp
} from "lucide-react";

interface SectorData {
  sector_code: string;
  sector_name: string;
  percentage: number;
  category?: string;
}

interface ActivityData {
  id: string;
  title: string;
  sectors?: SectorData[];
}

interface SectorAllocationChartProps {
  activities: ActivityData[];
}

interface ProcessedSectorData {
  name: string;
  value: number;
  activityCount: number;
  percentage: number;
  color: string;
  code: string;
}

export const SectorAllocationChart: React.FC<SectorAllocationChartProps> = ({
  activities
}) => {
  const sectorData = useMemo(() => {
    const sectorMap = new Map<string, {
      name: string;
      code: string;
      totalPercentage: number;
      activityCount: number;
      category?: string;
    }>();

    // Process all activities and their sectors
    activities.forEach(activity => {
      if (activity.sectors && activity.sectors.length > 0) {
        activity.sectors.forEach(sector => {
          const key = `${sector.sector_code}-${sector.sector_name}`;
          
          if (!sectorMap.has(key)) {
            sectorMap.set(key, {
              name: sector.sector_name,
              code: sector.sector_code,
              totalPercentage: 0,
              activityCount: 0,
              category: sector.category
            });
          }
          
          const sectorInfo = sectorMap.get(key)!;
          sectorInfo.totalPercentage += sector.percentage;
          sectorInfo.activityCount++;
        });
      }
    });

    // Convert to array and calculate final percentages
    const sectors = Array.from(sectorMap.values());
    const totalAllocation = sectors.reduce((sum, s) => sum + s.totalPercentage, 0);

    const processedSectors: ProcessedSectorData[] = sectors
      .map((sector, index) => ({
        name: sector.name,
        code: sector.code,
        value: sector.totalPercentage,
        activityCount: sector.activityCount,
        percentage: totalAllocation > 0 ? (sector.totalPercentage / totalAllocation) * 100 : 0,
        color: SECTOR_COLORS[index % SECTOR_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);

    return {
      sectors: processedSectors,
      totalActivities: activities.length,
      activitiesWithSectors: activities.filter(a => a.sectors && a.sectors.length > 0).length,
      totalAllocation
    };
  }, [activities]);

  const formatTooltipValue = (value: number, name: string, props: any) => {
    return [
      `${value.toFixed(1)}%`,
      `${props.payload.activityCount} activities`
    ];
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
          <p className="text-sm text-gray-600">Code: {data.code}</p>
          <p className="text-sm text-blue-600">Allocation: {data.value.toFixed(1)}%</p>
          <p className="text-sm text-green-600">Activities: {data.activityCount}</p>
          <p className="text-sm text-purple-600">Share: {data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  if (sectorData.activitiesWithSectors === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Sector Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sector data available</p>
            <p className="text-sm">Add sector information to activities to see allocation breakdown</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Sector Allocation
          <Badge variant="outline" className="ml-2">
            {sectorData.sectors.length} Sectors
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Target className="h-6 w-6 mx-auto mb-1 text-blue-600" />
              <p className="text-xl font-bold text-blue-900">{sectorData.sectors.length}</p>
              <p className="text-xs text-blue-600">Sectors</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-green-600" />
              <p className="text-xl font-bold text-green-900">{sectorData.activitiesWithSectors}</p>
              <p className="text-xs text-green-600">Activities with Sectors</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <PieChartIcon className="h-6 w-6 mx-auto mb-1 text-purple-600" />
              <p className="text-xl font-bold text-purple-900">{sectorData.totalAllocation.toFixed(0)}%</p>
              <p className="text-xs text-purple-600">Total Allocation</p>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sectorData.sectors}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="percentage"
                  >
                    {sectorData.sectors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="lg:w-80">
              <h4 className="font-semibold text-gray-900 mb-3">Sector Breakdown</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sectorData.sectors.map((sector, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sector.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate" title={sector.name}>
                          {sector.name}
                        </p>
                        <p className="text-xs text-gray-500">{sector.code}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {sector.percentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {sector.activityCount} {sector.activityCount === 1 ? 'activity' : 'activities'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coverage Information */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Coverage:</strong> {sectorData.activitiesWithSectors} of {sectorData.totalActivities} activities have sector information 
              ({((sectorData.activitiesWithSectors / sectorData.totalActivities) * 100).toFixed(1)}%)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Color palette for sectors
const SECTOR_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#A855F7', // Violet
  '#22C55E', // Emerald
  '#FB923C', // Orange-400
  '#60A5FA', // Blue-400
];