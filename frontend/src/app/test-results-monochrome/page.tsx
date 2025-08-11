"use client";

import React from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResultsTab } from "@/components/activities/ResultsTab";
import { Badge } from "@/components/ui/badge";
import { Info, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TestResultsMonochromePage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Card */}
          <Card className="border-2 border-gray-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Monochrome Results Tab Demo</CardTitle>
                  <CardDescription className="mt-2">
                    Enhanced Results tab with monochrome design and comprehensive help text tooltips
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-gray-700">
                  UI Enhancement Demo
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="bg-gray-50 border-gray-300">
                <Info className="h-4 w-4 text-gray-600" />
                <AlertDescription className="text-gray-700">
                  This demo showcases the improved Results tab with:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Fixed number inputs for start value, target, and current values</li>
                    <li>Beautiful line/area charts showing progress over time</li>
                    <li>Monochrome color scheme for professional appearance</li>
                    <li>Help text tooltips throughout for better user guidance</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Results Tab Demo */}
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <ResultsTab
                activityId="demo-activity-1"
                readOnly={false}
                onResultsChange={(results) => console.log('Results changed:', results)}
                defaultLanguage="en"
              />
            </CardContent>
          </Card>

          {/* Key Features Card */}
          <Card className="bg-gray-50 border-gray-300">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-gray-700" />
                Key Improvements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Visual Enhancements</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>Monochrome design using shades of gray for professional appearance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>Progress visualization with area and line chart options</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>Mini chart preview in collapsed indicator cards</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>Visual progress bars with achievement percentages</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Usability Features</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>Help text tooltips on all key UI elements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>Fixed number inputs that properly handle decimal values</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>Trend indicators showing progress from baseline</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <span>Smart status indicators based on achievement rates</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Details */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Technical Implementation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  <strong>Chart Library:</strong> Recharts with custom monochrome styling
                </p>
                <p>
                  <strong>Color Palette:</strong> Gray scale from gray-50 to gray-900
                </p>
                <p>
                  <strong>Input Handling:</strong> Controlled inputs with proper number parsing using step="any"
                </p>
                <p>
                  <strong>Help System:</strong> HelpTextTooltip component with hover interactions
                </p>
                <p>
                  <strong>Status Logic:</strong> Dynamic status calculation based on achievement thresholds (80% = on track, 50-79% = needs attention, &lt;50% = off track)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

