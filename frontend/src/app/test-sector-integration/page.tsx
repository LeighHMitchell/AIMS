'use client';

import React, { useState } from 'react';
import ImprovedSectorAllocationForm from '@/components/activities/ImprovedSectorAllocationForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SectorAllocation {
  id: string;
  code: string;
  name: string;
  percentage: number;
  category?: string;
  categoryName?: string;
  categoryCode?: string;
}

export default function TestSectorIntegrationPage() {
  const [allocations, setAllocations] = useState<SectorAllocation[]>([]);
  const [isValid, setIsValid] = useState(false);

  const handleAllocationsChange = (newAllocations: SectorAllocation[]) => {
    setAllocations(newAllocations);
    console.log('Allocations updated:', newAllocations);
  };

  const handleValidationChange = (validation: { isValid: boolean; errors: string[] }) => {
    setIsValid(validation.isValid);
    console.log('Validation changed:', validation);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sector Integration Test
          </h1>
          <p className="text-gray-600">
            Test the enhanced sector allocation form with hierarchy support
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <ImprovedSectorAllocationForm
              allocations={allocations}
              onChange={handleAllocationsChange}
              onValidationChange={handleValidationChange}
              allowPublish={true}
              activityId="test-activity"
            />
          </div>

          {/* Test Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Allocations Count:</span>
                    <span className="font-medium">{allocations.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Is Valid:</span>
                    <span className={`font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {isValid ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Percentage:</span>
                    <span className="font-medium">
                      {allocations.reduce((sum, alloc) => sum + alloc.percentage, 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Scenarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 rounded">
                    <strong>1. Reversed Sunburst</strong>
                    <p className="text-gray-600 mt-1">
                      Groups (inner) → Sectors (middle) → Sub-sectors (outer)
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded">
                    <strong>2. Clean Dropdown</strong>
                    <p className="text-gray-600 mt-1">
                      All groups/sectors expanded, monospace codes, no folder icons
                    </p>
                  </div>
                  
                  <div className="p-3 bg-purple-50 rounded">
                    <strong>3. Search Functionality</strong>
                    <p className="text-gray-600 mt-1">
                      Search for "health", "education", or specific codes like "11220"
                    </p>
                  </div>
                  
                  <div className="p-3 bg-orange-50 rounded">
                    <strong>4. Multiple Selection</strong>
                    <p className="text-gray-600 mt-1">
                      Select multiple sectors and verify sunburst chart updates
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {allocations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Sectors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allocations.map((allocation) => (
                      <div key={allocation.id} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="font-medium">{allocation.code}</div>
                        <div className="text-gray-600">{allocation.name}</div>
                        <div className="text-blue-600">{allocation.percentage}%</div>
                        {allocation.category && (
                          <div className="text-gray-500">{allocation.category}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Debug Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-64">
              {JSON.stringify(allocations, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 