"use client"

import dynamic from 'next/dynamic'
import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Dynamic import for MyanmarLocationEditor to handle client-side only rendering
const MyanmarLocationEditor = dynamic(() => import('./MyanmarLocationEditor'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="animate-pulse space-y-6">
        <div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-4">
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  )
})

interface ActivityLocationEditorWrapperProps {
  activityScope: string
  onScopeChange: (scope: string) => void
  locations: any
  onChange: (locations: any) => void
}

// IATI Activity Scope options
const activityScopes = [
  { value: "1", label: "1 - Global" },
  { value: "2", label: "2 - Regional" },
  { value: "3", label: "3 - Multi-national" },
  { value: "4", label: "4 - National" },
  { value: "5", label: "5 - Multi 1st-level subnational" },
  { value: "6", label: "6 - Single 1st-level subnational" },
  { value: "7", label: "7 - Single 2nd-level subnational" },
  { value: "8", label: "8 - Single location" },
]

export default function ActivityLocationEditorWrapper({
  activityScope,
  onScopeChange,
  locations,
  onChange
}: ActivityLocationEditorWrapperProps) {
  return (
    <div className="space-y-6">
      {/* Activity Scope Selector */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Activity Scope</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="activity-scope" className="text-sm font-medium">
              Geographic Scope *
            </Label>
            <Select
              value={activityScope}
              onValueChange={onScopeChange}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select activity scope" />
              </SelectTrigger>
              <SelectContent>
                {activityScopes.map((scope) => (
                  <SelectItem key={scope.value} value={scope.value}>
                    {scope.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Defines the geographic level of the activity according to IATI standards
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Myanmar-specific location fields for scopes 4-8 */}
      <MyanmarLocationEditor
        activityScope={activityScope}
        locations={locations}
        onChange={onChange}
      />
    </div>
  )
}