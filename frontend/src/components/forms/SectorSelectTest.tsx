'use client';

import React, { useState } from 'react';
import { EnhancedSectorSelect } from './EnhancedSectorSelect';
import SectorSunburstChart from '../charts/SectorSunburstChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SectorAllocation {
  id: string;
  code: string;
  name: string;
  percentage: number;
}

export default function SectorSelectTest() {
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<SectorAllocation[]>([]);

  const handleSectorsChange = (codes: string[]) => {
    setSelectedSectors(codes);
    
    // Create allocations with equal percentages
    const percentage = codes.length > 0 ? 100 / codes.length : 0;
    const newAllocations: SectorAllocation[] = codes.map((code, index) => ({
      id: `alloc-${index}`,
      code,
      name: `Sector ${code}`,
      percentage
    }));
    
    setAllocations(newAllocations);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Sector Hierarchy Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Sectors</CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedSectorSelect
              value={selectedSectors}
              onValueChange={handleSectorsChange}
              placeholder="Choose sectors from the hierarchy..."
              className="w-full"
              maxSelections={10}
            />
            
            {selectedSectors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Selected Sectors:</h3>
                <div className="space-y-1">
                  {selectedSectors.map(code => (
                    <div key={code} className="text-sm text-gray-600">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sunburst Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sector Allocation Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <SectorSunburstChart allocations={allocations} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {allocations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Allocation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{allocations.length}</div>
                <div className="text-sm text-blue-600">Total Sectors</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">100%</div>
                <div className="text-sm text-green-600">Total Allocation</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {allocations.length > 0 ? (100 / allocations.length).toFixed(1) : 0}%
                </div>
                <div className="text-sm text-purple-600">Average per Sector</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 