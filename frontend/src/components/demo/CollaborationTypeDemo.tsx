"use client";

import React from "react";
import { CollaborationTypeSearchableSelect } from "@/components/forms/CollaborationTypeSearchableSelect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CollaborationTypeDemo() {
  const [value, setValue] = React.useState<string>("");

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>IATI Collaboration Type Selector</CardTitle>
          <CardDescription>
            Searchable dropdown with grouped options. Try searching by code (e.g., "1", "#1"), 
            name (e.g., "bilateral", "triangular"), or description (e.g., "NGOs", "South-South").
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CollaborationTypeSearchableSelect
            value={value}
            onValueChange={setValue}
            placeholder="Select collaboration type..."
          />
          
          {value && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Selected:</strong> Code {value}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✅ <strong>Searchable</strong> - Type to filter by code, name, or description</li>
            <li>✅ <strong>Grouped</strong> - Options organized under Bilateral, Multilateral, and Other types</li>
            <li>✅ <strong>Formatted display</strong> - Shows #code followed by name, with description below</li>
            <li>✅ <strong>Keyboard navigation</strong> - Arrow keys, Enter, Escape support</li>
            <li>✅ <strong>Accessible</strong> - Proper ARIA attributes and roles</li>
            <li>✅ <strong>Responsive</strong> - Works on mobile and desktop</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
} 