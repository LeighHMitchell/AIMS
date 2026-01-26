'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { apiFetch } from '@/lib/api-fetch';

export default function DebugSectorsPage() {
  const { user } = useUser();
  const [logs, setLogs] = useState<string[]>([]);
  const [activityData, setActivityData] = useState<any>(null);
  const [sectorsFromDB, setSectorsFromDB] = useState<any[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  // Test: Load activity data directly
  const loadActivityData = async () => {
    const activityId = '85b03f24-217e-4cbf-b8e4-79dca60dee1f'; // Replace with your activity ID
    
    addLog('🔍 Loading activity data from API...');
    
    try {
      const response = await apiFetch(`/api/activities/${activityId}`);
      
      if (!response.ok) {
        addLog(`❌ API Error: ${response.status}`);
        return;
      }

      const data = await response.json();
      setActivityData(data);
      
      addLog(`✅ Activity loaded: ${data.title}`);
      addLog(`📊 Sectors in API response: ${data.sectors?.length || 0}`);
      
      if (data.sectors && data.sectors.length > 0) {
        addLog(`🔍 First sector: ${JSON.stringify(data.sectors[0], null, 2)}`);
      }

    } catch (error) {
      addLog(`💥 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Test: Load sectors directly from database
  const loadSectorsFromDB = async () => {
    const activityId = '85b03f24-217e-4cbf-b8e4-79dca60dee1f'; // Replace with your activity ID
    
    addLog('🗄️ Loading sectors directly from database...');
    
    try {
      const response = await apiFetch('/api/test-sectors-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId })
      });

      if (!response.ok) {
        addLog(`❌ DB Query Error: ${response.status}`);
        return;
      }

      const data = await response.json();
      setSectorsFromDB(data.sectors || []);
      
      addLog(`✅ DB Query result: ${data.sectorCount} sectors found`);
      
      if (data.sectors && data.sectors.length > 0) {
        addLog(`🔍 First sector from DB: ${JSON.stringify(data.sectors[0], null, 2)}`);
      }

    } catch (error) {
      addLog(`💥 DB Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Test: Add a test sector via API
  const addTestSector = async () => {
    const activityId = '85b03f24-217e-4cbf-b8e4-79dca60dee1f'; // Replace with your activity ID
    
    const testSectors = [
      {
        id: 'debug-test-' + Date.now(),
        code: '220',
        name: 'Communications',
        percentage: 30,
        level: 'group',
        category: 'Communications',
        categoryCode: '220'
      }
    ];

    addLog('➕ Adding test sector via API...');
    
    try {
      const response = await apiFetch('/api/activities/field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId,
          field: 'sectors',
          value: testSectors,
          user: { id: user?.id }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        addLog(`❌ Add sector failed: ${errorText}`);
        return;
      }

      const data = await response.json();
      addLog(`✅ Test sector added successfully`);
      addLog(`📊 Response sectors count: ${data.sectors?.length || 0}`);

    } catch (error) {
      addLog(`💥 Add Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    setActivityData(null);
    setSectorsFromDB([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🐛 Sector Persistence Debug Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={loadActivityData} variant="outline">
              📊 Load Activity Data
            </Button>
            <Button onClick={loadSectorsFromDB} variant="outline">
              🗄️ Query DB Directly
            </Button>
            <Button onClick={addTestSector} variant="outline">
              ➕ Add Test Sector
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={clearLogs} variant="destructive" size="sm">
              🗑️ Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Data */}
      {activityData && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Activity API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <strong>Title:</strong> {activityData.title}
            </div>
            <div className="mb-4">
              <strong>Sectors Count:</strong> {activityData.sectors?.length || 0}
            </div>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-64">
              {JSON.stringify(activityData.sectors, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Database Sectors */}
      {sectorsFromDB.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🗄️ Database Sectors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <strong>Sectors Count:</strong> {sectorsFromDB.length}
            </div>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-64">
              {JSON.stringify(sectorsFromDB, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Debug Logs */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click buttons above to start debugging.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Debug Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Step 1:</strong> Click "Load Activity Data" to see what the API returns</p>
          <p><strong>Step 2:</strong> Click "Query DB Directly" to see what's in the database</p>
          <p><strong>Step 3:</strong> Compare the two results - they should match</p>
          <p><strong>Step 4:</strong> Click "Add Test Sector" to add a new sector</p>
          <p><strong>Step 5:</strong> Reload the page and run steps 1-2 again</p>
          <p><strong>Step 6:</strong> Check if the test sector persists</p>
        </CardContent>
      </Card>
    </div>
  );
} 