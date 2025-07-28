'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HierarchicalSectorSelect } from './HierarchicalSectorSelect';

export function HierarchicalSectorSelectDemo() {
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedSectorsLimited, setSelectedSectorsLimited] = useState<string[]>([]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Hierarchical IATI Sector Select</h1>
        <p className="text-muted-foreground">
          A tiered dropdown showing DAC sector categories, 3-digit sectors, and 5-digit subsectors
        </p>
      </div>

      {/* Demo 1: Standard Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Standard Multi-Select</CardTitle>
          <CardDescription>
            Select multiple DAC 5-digit sector codes from the hierarchical structure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <HierarchicalSectorSelect
            value={selectedSectors}
            onValueChange={setSelectedSectors}
            placeholder="Select DAC 5-digit sector codes..."
            maxSelections={10}
          />
          
          {selectedSectors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected Sectors ({selectedSectors.length}):</p>
              <div className="flex flex-wrap gap-1">
                {selectedSectors.map(code => (
                  <Badge key={code} variant="outline" className="text-xs">
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demo 2: Limited Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Limited Selection (Max 3)</CardTitle>
          <CardDescription>
            Example with a maximum of 3 selections allowed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <HierarchicalSectorSelect
            value={selectedSectorsLimited}
            onValueChange={setSelectedSectorsLimited}
            placeholder="Select up to 3 sectors..."
            maxSelections={3}
          />
          
          <div className="text-xs text-muted-foreground">
            {selectedSectorsLimited.length} of 3 sectors selected
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span><strong>3-Level Hierarchy:</strong> Categories → 3-digit Sectors → 5-digit Subsectors</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span><strong>Visual Distinction:</strong> Bold categories, indented sectors, further indented subsectors</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span><strong>Selective Interaction:</strong> Only 5-digit codes are selectable</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span><strong>Smart Search:</strong> Filter across 5-digit codes and names only</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span><strong>Accessibility:</strong> Proper ARIA roles and keyboard navigation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span><strong>Selection Management:</strong> Individual remove, clear all, max limits</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Usage Example */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Example</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-100 p-3 rounded-md overflow-x-auto">
{`import { HierarchicalSectorSelect } from '@/components/forms/HierarchicalSectorSelect';

function MyForm() {
  const [sectors, setSectors] = useState<string[]>([]);

  return (
    <HierarchicalSectorSelect
      value={sectors}
      onValueChange={setSectors}
      placeholder="Select DAC 5-digit sector codes..."
      maxSelections={10}
    />
  );
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
} 