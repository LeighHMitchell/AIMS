"use client";

import React, { useState } from "react";
import GovernmentInputsSectionEnhanced from "@/components/GovernmentInputsSectionEnhanced";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Code } from "lucide-react";

export default function TestGovernmentInputsPage() {
  const [governmentInputs, setGovernmentInputs] = useState({});
  const [showJson, setShowJson] = useState(false);

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Government Inputs UI Test Page</CardTitle>
              <p className="text-gray-600 mt-2">
                This page demonstrates the enhanced Government Inputs section with improved UI/UX, 
                comprehensive help text, and intuitive data entry flow.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowJson(!showJson)}
                >
                  {showJson ? <Eye className="h-4 w-4 mr-2" /> : <Code className="h-4 w-4 mr-2" />}
                  {showJson ? "Hide JSON" : "Show JSON"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGovernmentInputs({});
                    window.location.reload();
                  }}
                >
                  Reset Form
                </Button>
              </div>

              {showJson && (
                <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                  <h3 className="font-medium mb-2">Current Data Structure:</h3>
                  <pre className="text-xs overflow-auto max-h-64">
                    {JSON.stringify(governmentInputs, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          <GovernmentInputsSectionEnhanced
            governmentInputs={governmentInputs}
            onChange={setGovernmentInputs}
          />

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Key Improvements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>✓ Collapsible sections for better focus and navigation</li>
                <li>✓ Color-coded sections with intuitive icons</li>
                <li>✓ Comprehensive help tooltips on every field</li>
                <li>✓ Visual progress tracking and completion indicators</li>
                <li>✓ Smart conditional fields that appear only when needed</li>
                <li>✓ Beautiful visual feedback with color-coded states</li>
                <li>✓ Quick data entry with inline forms and tag management</li>
                <li>✓ Professional, modern design that's easy on the eyes</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

