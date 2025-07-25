'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';

export default function TestSectorSavingPage() {
  const { user } = useUser();
  const [logs, setLogs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  // Test 1: Direct API call to test sectors endpoint
  const testDirectAPICall = async () => {
    addLog('🧪 Starting Direct API Test...');
    
    const testActivityId = '85b03f24-217e-4cbf-b8e4-79dca60dee1f'; // Replace with your activity ID
    const testSectors = [
      {
        id: 'test-1',
        code: '110',
        name: 'Education',
        percentage: 50,
        level: 'group',
        category: 'Education',
        categoryCode: '110'
      },
      {
        id: 'test-2', 
        code: '11220',
        name: 'Primary education',
        percentage: 50,
        level: 'subsector',
        category: 'Education',
        categoryCode: '112'
      }
    ];

    try {
      addLog(`📤 Sending POST to /api/activities/field`);
      addLog(`📊 Test data: ${JSON.stringify(testSectors, null, 2)}`);
      
      const response = await fetch('/api/activities/field', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId: testActivityId,
          field: 'sectors',
          value: testSectors,
          user: { id: user?.id }
        })
      });

      addLog(`📥 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        addLog(`❌ API Error: ${errorText}`);
        setTestResults(prev => ({ ...prev, directAPI: { success: false, error: errorText } }));
        return;
      }

      const responseData = await response.json();
      addLog(`✅ API Success: ${JSON.stringify(responseData, null, 2)}`);
      setTestResults(prev => ({ ...prev, directAPI: { success: true, data: responseData } }));

    } catch (error) {
      addLog(`💥 Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTestResults(prev => ({ ...prev, directAPI: { success: false, error: error instanceof Error ? error.message : 'Unknown error' } }));
    }
  };

  // Test 2: Check database directly
  const testDatabaseQuery = async () => {
    addLog('🗄️ Testing Database Query...');
    
    try {
      const response = await fetch('/api/test-sectors-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId: '85b03f24-217e-4cbf-b8e4-79dca60dee1f' // Replace with your activity ID
        })
      });

      if (!response.ok) {
        addLog(`❌ DB Query failed: ${response.status}`);
        return;
      }

      const data = await response.json();
      addLog(`✅ DB Query result: ${JSON.stringify(data, null, 2)}`);
      setTestResults(prev => ({ ...prev, database: data }));

    } catch (error) {
      addLog(`💥 DB Query Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Test 3: Schema validation
  const testSchemaValidation = async () => {
    addLog('🔍 Testing Database Schema...');
    
    try {
      const response = await fetch('/api/test-schema');
      
      if (!response.ok) {
        addLog(`❌ Schema test failed: ${response.status}`);
        return;
      }

      const data = await response.json();
      addLog(`✅ Schema test result: ${JSON.stringify(data, null, 2)}`);
      setTestResults(prev => ({ ...prev, schema: data }));

    } catch (error) {
      addLog(`💥 Schema Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    setTestResults({});
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Sector Saving Debug Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={testDirectAPICall} variant="outline">
              🚀 Test Direct API Call
            </Button>
            <Button onClick={testDatabaseQuery} variant="outline">
              🗄️ Test Database Query
            </Button>
            <Button onClick={testSchemaValidation} variant="outline">
              🔍 Test Schema
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={clearLogs} variant="destructive" size="sm">
              🗑️ Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results Summary */}
      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Test Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Console Logs */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Run tests above to see debug output.</div>
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
          <CardTitle>📋 Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Step 1:</strong> Open browser DevTools (F12) → Console tab</p>
          <p><strong>Step 2:</strong> Open Network tab in DevTools</p>
          <p><strong>Step 3:</strong> Click "Test Direct API Call" button above</p>
          <p><strong>Step 4:</strong> Check console logs below and in DevTools</p>
          <p><strong>Step 5:</strong> In Network tab, look for POST to /api/activities/field</p>
          <p><strong>Step 6:</strong> Click "Test Database Query" to see current data</p>
          <p><strong>Step 7:</strong> Click "Test Schema" to verify database structure</p>
        </CardContent>
      </Card>
    </div>
  );
} 