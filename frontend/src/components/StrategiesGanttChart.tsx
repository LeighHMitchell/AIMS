"use client"

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  EyeOff, 
  Download, 
  ExternalLink,
  FileText,
  Calendar
} from 'lucide-react';

interface Strategy {
  id: string;
  title: string;
  document_type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  start_year?: number;
  end_year?: number;
  start_month?: number;
  end_month?: number;
  estimated_start_date?: string;
  estimated_end_date?: string;
  thematic_pillars?: string[];
  public_link?: string;
  has_file: boolean;
  file_url?: string;
  public: boolean;
  organization: {
    id: string;
    name: string;
    acronym?: string;
  };
}

interface StrategiesGanttChartProps {
  strategies: Strategy[];
  isPublicView?: boolean;
}

const StrategiesGanttChart: React.FC<StrategiesGanttChartProps> = ({
  strategies,
  isPublicView = false
}) => {
  const chartData = useMemo(() => {
    if (strategies.length === 0) return { strategies: [], yearRange: { min: new Date().getFullYear(), max: new Date().getFullYear() + 5 } };

    // Calculate date ranges for each strategy
    const processedStrategies = strategies.map(strategy => {
      let startYear, endYear, startDate, endDate;

      // Determine start and end dates/years
      if (strategy.start_date && strategy.end_date) {
        startDate = new Date(strategy.start_date);
        endDate = new Date(strategy.end_date);
        startYear = startDate.getFullYear();
        endYear = endDate.getFullYear();
      } else if (strategy.start_year && strategy.end_year) {
        startYear = strategy.start_year;
        endYear = strategy.end_year;
        startDate = new Date(startYear, strategy.start_month ? strategy.start_month - 1 : 0, 1);
        endDate = new Date(endYear, strategy.end_month ? strategy.end_month - 1 : 11, 31);
      } else if (strategy.estimated_start_date && strategy.estimated_end_date) {
        startDate = new Date(strategy.estimated_start_date);
        endDate = new Date(strategy.estimated_end_date);
        startYear = startDate.getFullYear();
        endYear = endDate.getFullYear();
      } else {
        // Default to current year if no dates available
        const currentYear = new Date().getFullYear();
        startYear = currentYear;
        endYear = currentYear + 3;
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear + 3, 11, 31);
      }

      return {
        ...strategy,
        startYear,
        endYear,
        startDate,
        endDate,
        isEstimated: !!(strategy.estimated_start_date || strategy.estimated_end_date)
      };
    });

    // Calculate year range for the chart
    const allYears = processedStrategies.flatMap(s => [s.startYear, s.endYear]);
    const minYear = Math.min(...allYears, new Date().getFullYear());
    const maxYear = Math.max(...allYears, new Date().getFullYear() + 5);

    return {
      strategies: processedStrategies,
      yearRange: { min: minYear, max: maxYear }
    };
  }, [strategies]);

  const getStatusColor = (status: string, isPublic: boolean) => {
    if (!isPublic) {
      return {
        bg: 'bg-gray-200',
        border: 'border-gray-400',
        text: 'text-gray-700'
      };
    }

    switch (status) {
      case 'Published':
        return { bg: 'bg-green-200', border: 'border-green-500', text: 'text-green-800' };
      case 'Active':
        return { bg: 'bg-blue-200', border: 'border-blue-500', text: 'text-blue-800' };
      case 'Completed':
        return { bg: 'bg-gray-200', border: 'border-gray-500', text: 'text-gray-800' };
      default:
        return { bg: 'bg-orange-200', border: 'border-orange-500', text: 'text-orange-800' };
    }
  };

  const calculateBarPosition = (strategy: any) => {
    const totalYears = chartData.yearRange.max - chartData.yearRange.min + 1;
    const strategyStartOffset = strategy.startYear - chartData.yearRange.min;
    const strategyDuration = strategy.endYear - strategy.startYear + 1;
    
    const left = (strategyStartOffset / totalYears) * 100;
    const width = (strategyDuration / totalYears) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  const years = Array.from(
    { length: chartData.yearRange.max - chartData.yearRange.min + 1 },
    (_, i) => chartData.yearRange.min + i
  );

  if (strategies.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No strategies to display</h3>
          <p className="text-gray-600">
            {isPublicView 
              ? "No published strategies available for timeline view." 
              : "Add strategies to see them in the timeline view."
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Strategy Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Year headers */}
          <div className="relative">
            <div className="flex justify-between text-sm text-gray-600 font-medium mb-2">
              {years.map(year => (
                <span key={year} className="flex-1 text-center">
                  {year}
                </span>
              ))}
            </div>
            <div className="border-t border-gray-200"></div>
          </div>

          {/* Strategy bars */}
          <div className="space-y-4">
            {chartData.strategies.map((strategy) => {
              const colors = getStatusColor(strategy.status, strategy.public);
              const barPosition = calculateBarPosition(strategy);

              return (
                <div key={strategy.id} className="relative">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-48 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {strategy.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>{strategy.organization.acronym || strategy.organization.name}</span>
                        {!strategy.public && (
                          <span className="flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                            Internal
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 relative h-8">
                      {/* Timeline background */}
                      <div className="absolute inset-0 border-t border-gray-200"></div>
                      
                      {/* Strategy bar */}
                      <div
                        className={`absolute top-1 h-6 rounded ${colors.bg} ${colors.border} border-2 ${
                          strategy.isEstimated ? 'border-dashed' : ''
                        } cursor-pointer group transition-all hover:shadow-md`}
                        style={barPosition}
                        title={`${strategy.title} (${strategy.startYear} - ${strategy.endYear})`}
                      >
                        <div className="flex items-center justify-between h-full px-2">
                          <span className={`text-xs font-medium ${colors.text} truncate`}>
                            {strategy.status}
                          </span>
                          
                          {/* Actions on hover */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                            {strategy.public_link && (
                              <button
                                onClick={() => window.open(strategy.public_link, '_blank')}
                                className="p-1 hover:bg-white rounded"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            )}
                            {strategy.has_file && strategy.file_url && (
                              <button
                                onClick={() => window.open(strategy.file_url, '_blank')}
                                className="p-1 hover:bg-white rounded"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-32 flex-shrink-0 flex justify-end gap-1">
                      <Badge 
                        className={getStatusColor(strategy.status, strategy.public).bg + ' ' + getStatusColor(strategy.status, strategy.public).text}
                        variant="secondary"
                      >
                        {strategy.status}
                      </Badge>
                      {strategy.has_file && (
                        <Badge variant="outline">
                          <FileText className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-200 border-2 border-green-500 rounded"></div>
                  <span>Published</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-200 border-2 border-blue-500 rounded"></div>
                  <span>Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-200 border-2 border-orange-500 border-dashed rounded"></div>
                  <span>Draft/Estimated</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 border-2 border-gray-500 rounded"></div>
                  <span>Completed</span>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Hover over bars for more details and actions
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategiesGanttChart; 