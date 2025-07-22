'use client';

import React from 'react';
import { SDGImageGrid } from '@/components/ui/SDGImageGrid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Example component demonstrating SDGImageGrid usage
 * This shows various ways to use the component with different input formats
 */
export function SDGImageGridExample() {
  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SDG Image Grid Examples</h1>
        <p className="text-gray-600">
          Demonstrations of the SDGImageGrid component with various configurations
        </p>
      </div>

      <div className="grid gap-6">
        {/* Basic Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Usage</CardTitle>
            <CardDescription>
              Display SDG icons using different input formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                String format: ['SDG 1', 'SDG 3', 'SDG 13']
              </h4>
              <SDGImageGrid sdgCodes={['SDG 1', 'SDG 3', 'SDG 13']} />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Number format: [1, 4, 7, 11]
              </h4>
              <SDGImageGrid sdgCodes={[1, 4, 7, 11]} />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Mixed format: ['1', 'SDG 2', 5, 'Goal 17']
              </h4>
              <SDGImageGrid sdgCodes={['1', 'SDG 2', 5, 'Goal 17']} />
            </div>
          </CardContent>
        </Card>

        {/* Different Sizes */}
        <Card>
          <CardHeader>
            <CardTitle>Different Sizes</CardTitle>
            <CardDescription>
              Small, medium, and large size variants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Small (32px)</h4>
              <SDGImageGrid sdgCodes={[1, 2, 3, 4, 5]} size="sm" />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Medium (48px) - Default</h4>
              <SDGImageGrid sdgCodes={[1, 2, 3, 4, 5]} size="md" />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Large (64px)</h4>
              <SDGImageGrid sdgCodes={[1, 2, 3, 4, 5]} size="lg" />
            </div>
          </CardContent>
        </Card>

        {/* Max Display Limit */}
        <Card>
          <CardHeader>
            <CardTitle>Display Limits</CardTitle>
            <CardDescription>
              Show only a certain number of SDGs with a "+" indicator for the rest
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Show max 3 out of 8 SDGs
              </h4>
              <SDGImageGrid 
                sdgCodes={[1, 2, 3, 4, 5, 6, 7, 8]} 
                maxDisplay={3}
              />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Show max 5 out of 10 SDGs
              </h4>
              <SDGImageGrid 
                sdgCodes={[1, 3, 5, 7, 9, 11, 13, 15, 16, 17]} 
                maxDisplay={5}
                size="sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Without Tooltips */}
        <Card>
          <CardHeader>
            <CardTitle>Without Tooltips</CardTitle>
            <CardDescription>
              Display SDGs without hover tooltips for simple presentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SDGImageGrid 
              sdgCodes={[1, 6, 7, 11, 13, 15]} 
              showTooltips={false}
            />
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card>
          <CardHeader>
            <CardTitle>Empty State</CardTitle>
            <CardDescription>
              What shows when no valid SDGs are provided
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Empty array</h4>
              <SDGImageGrid sdgCodes={[]} />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Invalid codes</h4>
              <SDGImageGrid sdgCodes={['invalid', 'SDG 25', 0, -1]} />
            </div>
          </CardContent>
        </Card>

        {/* Real-world Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Real-world Activity Examples</CardTitle>
            <CardDescription>
              How SDGs might appear in activity cards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Education Project */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-900 mb-2">
                Education Infrastructure Project
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Building schools and training centers in rural communities
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">SDGs:</span>
                <SDGImageGrid sdgCodes={['SDG 4', 'SDG 5', 'SDG 10']} size="sm" />
              </div>
            </div>

            {/* Climate Project */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-900 mb-2">
                Renewable Energy Initiative
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Solar panel installation and energy efficiency programs
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">SDGs:</span>
                <SDGImageGrid sdgCodes={[7, 11, 13]} size="sm" />
              </div>
            </div>

            {/* Health Project */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-900 mb-2">
                Community Health Program
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Healthcare access improvement and nutrition programs
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">SDGs:</span>
                <SDGImageGrid sdgCodes={[1, 2, 3, 5, 6]} maxDisplay={3} size="sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Code Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Code Examples</CardTitle>
            <CardDescription>
              Copy-paste examples for common use cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Basic usage:</h4>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`<SDGImageGrid sdgCodes={['SDG 1', 'SDG 3', 'SDG 13']} />`}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">In activity card:</h4>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{activity.sdgMappings?.length > 0 && (
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-500">SDGs:</span>
    <SDGImageGrid 
      sdgCodes={activity.sdgMappings.map(m => m.sdgGoal)} 
      size="sm" 
      maxDisplay={4}
    />
  </div>
)}`}
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-2">With custom styling:</h4>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`<SDGImageGrid 
  sdgCodes={sdgList}
  size="md"
  className="mt-4"
  showTooltips={true}
  maxDisplay={5}
/>`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SDGImageGridExample;