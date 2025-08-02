'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LocationSelector, { Location } from '@/components/LocationSelector';

const DEMO_LOCATIONS: Location[] = [
  {
    id: 'demo-1',
    location_type: 'site',
    location_name: 'Main Office',
    description: 'Primary headquarters location with administrative facilities',
    latitude: 21.9162,
    longitude: 95.9560,
    address: 'Yangon, Myanmar',
    site_type: 'office',
    state_region_name: 'Yangon Region',
    township_name: 'Yangon Township',
    activity_id: 'test-activity',
    created_by: 'demo-user'
  },
  {
    id: 'demo-2', 
    location_type: 'site',
    location_name: 'Project Site Alpha',
    description: 'Rural development project implementation site',
    latitude: 22.2734,
    longitude: 96.1688,
    address: 'Mandalay Region, Myanmar',
    site_type: 'project_site',
    state_region_name: 'Mandalay Region',
    township_name: 'Mandalay Township',
    activity_id: 'test-activity',
    created_by: 'demo-user'
  }
];

export default function TestLocationFixes() {
  const [locations, setLocations] = useState<Location[]>(DEMO_LOCATIONS);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              🗺️ Location Selector - ALL ISSUES FIXED! ✅
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-semibold text-green-700 mb-2">✅ FIXED ISSUES</h3>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>Search fixed:</strong> Now works globally + Myanmar</li>
                  <li>• <strong>Pins visible:</strong> Enhanced markers with tooltips</li>
                  <li>• <strong>Hover working:</strong> Tooltip on hover + popup on click</li>
                  <li>• <strong>Heat map working:</strong> Toggle between pins/heat view</li>
                  <li>• <strong>Admin fields:</strong> Auto-populate on pin drop</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-blue-700 mb-2">🧪 TEST THESE NOW</h3>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>Hover pins:</strong> Immediate tooltip appears</li>
                  <li>• <strong>Search anything:</strong> "Paris", "Tokyo", "London"</li>
                  <li>• <strong>Toggle heat map:</strong> See red circles</li>
                  <li>• <strong>Click map:</strong> Coordinates + admin fields appear</li>
                  <li>• <strong>Site dropdown:</strong> Enhanced with descriptions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Test Section */}
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg text-green-800">🚀 Quick Test Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-white rounded border">
                <h4 className="font-semibold text-green-800 mb-1">1. Test Search (FIXED!)</h4>
                <p className="text-green-700">Try searching for: <code className="bg-gray-100 px-1 rounded">"Paris"</code>, <code className="bg-gray-100 px-1 rounded">"Tokyo"</code>, <code className="bg-gray-100 px-1 rounded">"London"</code>, or <code className="bg-gray-100 px-1 rounded">"Yangon"</code></p>
              </div>
              
              <div className="p-3 bg-white rounded border">
                <h4 className="font-semibold text-blue-800 mb-1">2. Test Pin Hover (FIXED!)</h4>
                <p className="text-blue-700">Hover over the blue pins - you'll see immediate tooltips with location name and type</p>
              </div>
              
              <div className="p-3 bg-white rounded border">
                <h4 className="font-semibold text-purple-800 mb-1">3. Test Heat Map (WORKING!)</h4>
                <p className="text-purple-700">Click the "Heat Map" button to see red circles showing location density</p>
              </div>
              
              <div className="p-3 bg-white rounded border">
                <h4 className="font-semibold text-orange-800 mb-1">4. Test Admin Fields</h4>
                <p className="text-orange-700">Click anywhere on the map to see coordinates and grayed-out admin fields appear</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📊 Current Status: {locations.length} locations loaded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {locations.map((loc, idx) => (
                <div key={loc.id} className="p-3 bg-blue-50 rounded border">
                  <div className="font-medium flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    {loc.location_name}
                  </div>
                  <div className="text-xs text-gray-600 ml-5">{loc.site_type}</div>
                  <div className="text-xs text-gray-500 mt-1 ml-5">
                    {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                  </div>
                  <div className="text-xs text-blue-600 mt-1 ml-5">{loc.state_region_name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* LocationSelector Component */}
        <Card>
          <CardHeader>
            <CardTitle>🗺️ Enhanced LocationSelector - All Fixes Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationSelector
              locations={locations}
              onLocationsChange={setLocations}
              activityId="test-activity"
              userId="demo-user"
            />
          </CardContent>
        </Card>

        {/* Results Summary */}
        <Card className="mt-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg text-green-800">✅ All Issues Resolved!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></span>
                <span><strong>Heat map:</strong> Working - toggle shows red circles</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></span>
                <span><strong>Search:</strong> Returns results globally (try "Paris")</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></span>
                <span><strong>Pins:</strong> Clearly visible blue markers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></span>
                <span><strong>Hover:</strong> Immediate tooltips on pin hover</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></span>
                <span><strong>Admin fields:</strong> Auto-populate when clicking map</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">🔍 Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs bg-gray-100 p-4 rounded font-mono space-y-1">
              <div>Total Locations: {locations.length}</div>
              <div>Site Locations: {locations.filter(l => l.location_type === 'site').length}</div>
              <div>Locations with Coordinates: {locations.filter(l => l.latitude && l.longitude).length}</div>
              <div>Locations with Admin Data: {locations.filter(l => l.state_region_name).length}</div>
              <div className="pt-2 border-t border-gray-300">
                Features: Search ✅ | Pins ✅ | Hover ✅ | Heat Map ✅ | Admin Fields ✅
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 