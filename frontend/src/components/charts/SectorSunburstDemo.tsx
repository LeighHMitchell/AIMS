'use client';

import React from 'react';
import SectorSunburstVisualization from './SectorSunburstVisualization';

// Sample data exactly as specified by the user
const sampleAllocations = [
  { code: '11120', name: 'Education facilities and training', percentage: 33.3 },
  { code: '11130', name: 'Teacher training', percentage: 33.3 },
  { code: '11110', name: 'Education policy and administrative management', percentage: 33.3 }
];

// Additional sample with more diverse sectors for better demonstration
const diverseSampleAllocations = [
  { code: '11120', name: 'Education facilities and training', percentage: 25.0 },
  { code: '11130', name: 'Teacher training', percentage: 15.0 },
  { code: '12220', name: 'Basic health care', percentage: 20.0 },
  { code: '12240', name: 'Basic nutrition', percentage: 10.0 },
  { code: '14020', name: 'Water supply and sanitation - large systems', percentage: 15.0 },
  { code: '31120', name: 'Agricultural development', percentage: 10.0 },
  { code: '15130', name: 'Legal and judicial development', percentage: 5.0 }
];

export default function SectorSunburstDemo() {
  const handleSegmentClick = (code: string, level: 'category' | 'sector' | 'subsector') => {
    console.log(`Clicked on ${level}: ${code}`);
    // You can implement drill-down functionality here
    alert(`Clicked on ${level}: ${code}`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Sector Sunburst Visualization Demo
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This demonstration shows the sector allocation sunburst chart with sample data.
          The chart automatically builds a 3-level hierarchy from 5-digit DAC sector codes.
        </p>
      </div>

      {/* Simple Example */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Simple Example - Education Sectors Only
        </h2>
        <SectorSunburstVisualization 
          allocations={sampleAllocations}
          onSegmentClick={handleSegmentClick}
        />
      </div>

      {/* Diverse Example */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Complex Example - Multiple DAC Categories
        </h2>
        <SectorSunburstVisualization 
          allocations={diverseSampleAllocations}
          onSegmentClick={handleSegmentClick}
        />
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">How to Use</h3>
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <strong>Data Structure:</strong> Simply pass an array of sector allocations with the format:
            <pre className="mt-2 p-3 bg-white rounded border text-xs overflow-x-auto">
{`[
  { code: '11120', name: 'Education facilities and training', percentage: 33.3 },
  { code: '11130', name: 'Teacher training', percentage: 33.3 },
  { code: '11110', name: 'Education policy and administrative management', percentage: 33.3 }
]`}
            </pre>
          </div>
          
          <div>
            <strong>Chart Levels:</strong>
            <ul className="mt-2 ml-4 space-y-1">
              <li>• <strong>Inner ring:</strong> DAC Categories (e.g., Education, Health)</li>
              <li>• <strong>Middle ring:</strong> 3-digit DAC sectors (e.g., 111 - Education, level unspecified)</li>
              <li>• <strong>Outer ring:</strong> 5-digit subsectors (e.g., 11120 - Education facilities and training)</li>
            </ul>
          </div>

          <div>
            <strong>Interactions:</strong>
            <ul className="mt-2 ml-4 space-y-1">
              <li>• Hover over segments to see tooltips</li>
              <li>• Click segments to trigger onSegmentClick callback</li>
              <li>• Toggle between Sunburst and Table views</li>
              <li>• Responsive design works on mobile devices</li>
            </ul>
          </div>

          <div>
            <strong>Features:</strong>
            <ul className="mt-2 ml-4 space-y-1">
              <li>• Automatic hierarchy building from 5-digit DAC codes</li>
              <li>• Color-coded by DAC category</li>
              <li>• Shows unallocated percentage if total &lt; 100%</li>
              <li>• Responsive design for mobile and desktop</li>
              <li>• Built with Recharts for smooth performance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 