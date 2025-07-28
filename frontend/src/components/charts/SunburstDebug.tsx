'use client';

import React from 'react';

interface DebugProps {
  allocations: any[];
}

export default function SunburstDebug({ allocations }: DebugProps) {
  const sectorGroupData = require('@/data/SectorGroup.json');
  
  // Check what we have
  console.log('[DEBUG] Input allocations:', allocations);
  
  // Find unique groups and categories
  const groups = new Set<string>();
  const categories = new Set<string>();
  
  allocations.forEach(allocation => {
    if (allocation.code.length === 5) {
      const sectorData = sectorGroupData.data.find((s: any) => s.code === allocation.code);
      if (sectorData) {
        groups.add(sectorData['codeforiati:group-code']);
        categories.add(sectorData['codeforiati:category-code']);
        console.log(`[DEBUG] Sector ${allocation.code}:`, {
          group: sectorData['codeforiati:group-code'],
          groupName: sectorData['codeforiati:group-name'],
          category: sectorData['codeforiati:category-code'],
          categoryName: sectorData['codeforiati:category-name']
        });
      }
    }
  });
  
  return (
    <div className="p-4 bg-gray-100 rounded text-xs">
      <h3 className="font-bold mb-2">Sunburst Debug Info</h3>
      <div>Total allocations: {allocations.length}</div>
      <div>Unique groups: {Array.from(groups).join(', ')}</div>
      <div>Unique categories: {Array.from(categories).join(', ')}</div>
      <div className="mt-2">
        <div className="font-semibold">Expected rings:</div>
        <div>1. Inner: Group codes (e.g., 110)</div>
        <div>2. Middle: Category codes (e.g., 111, 112)</div>
        <div>3. Outer: 5-digit codes (e.g., 11110, 11120)</div>
      </div>
    </div>
  );
}