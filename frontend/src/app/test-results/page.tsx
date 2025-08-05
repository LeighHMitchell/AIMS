'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ResultsTab } from '@/components/activities/ResultsTab';

export default function TestResultsPage() {
  const [testActivityId, setTestActivityId] = useState('85b03f24-217e-4cbf-b8e4-79dca60dee1f'); // Using the activity ID from the logs
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testResultsAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/activities/${testActivityId}/results`);
      const data = await response.json();
      setApiStatus({
        success: response.ok,
        status: response.status,
        data: data
      });
    } catch (error) {
      setApiStatus({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const createTestResult = async () => {
    setLoading(true);
    try {
      const requestData = {
        type: 'output',
        aggregation_status: false,
        title: { en: 'Test Result from Debug Page' },
        description: { en: 'This is a test result created for debugging the Results feature' }
      };

      console.log('[Test Page] Sending request:', requestData);

      const response = await fetch(`/api/activities/${testActivityId}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      console.log('[Test Page] Response:', {
        status: response.status,
        ok: response.ok,
        data: data
      });

      setApiStatus({
        success: response.ok,
        status: response.status,
        data: data,
        action: 'create',
        requestData: requestData
      });
      
      // Refresh the results
      if (response.ok) {
        setTimeout(() => testResultsAPI(), 1000);
      }
    } catch (error) {
      console.error('[Test Page] Error:', error);
      setApiStatus({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'create'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testResultsAPI();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Results Feature Test Page</h1>

        {/* API Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>API Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Button onClick={testResultsAPI} disabled={loading}>
                {loading ? 'Testing...' : 'Test Results API'}
              </Button>
              <Button onClick={createTestResult} disabled={loading}>
                {loading ? 'Creating...' : 'Create Test Result'}
              </Button>
              <Button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const response = await fetch('/api/debug-results');
                    const data = await response.json();
                    setApiStatus({
                      success: response.ok,
                      status: response.status,
                      data: data,
                      action: 'debug'
                    });
                  } catch (error) {
                    setApiStatus({
                      success: false,
                      error: error instanceof Error ? error.message : 'Unknown error',
                      action: 'debug'
                    });
                  } finally {
                    setLoading(false);
                  }
                }} 
                disabled={loading}
                variant="outline"
              >
                {loading ? 'Debugging...' : 'Debug Database'}
              </Button>
            </div>

            {apiStatus && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <div>
                      <strong>Status:</strong> {apiStatus.success ? '✅ Success' : '❌ Failed'}
                      {apiStatus.status && ` (${apiStatus.status})`}
                      {apiStatus.action && ` - ${apiStatus.action}`}
                    </div>
                    {apiStatus.error && (
                      <div><strong>Error:</strong> {apiStatus.error}</div>
                    )}
                    {apiStatus.requestData && (
                      <div>
                        <strong>Request Data:</strong>
                        <pre className="text-xs bg-blue-50 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(apiStatus.requestData, null, 2)}
                        </pre>
                      </div>
                    )}
                    {apiStatus.data && (
                      <div>
                        <strong>Response:</strong>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(apiStatus.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Activity ID Input */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium">Activity ID:</label>
              <input
                type="text"
                value={testActivityId}
                onChange={(e) => setTestActivityId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter activity ID to test"
              />
              <p className="text-xs text-gray-600">
                Using activity ID from the dev server logs. Change this to test with different activities.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Results Component */}
        <Card>
          <CardHeader>
            <CardTitle>Results Component Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4">
              <ResultsTab 
                activityId={testActivityId}
                readOnly={false}
                defaultLanguage="en"
                onResultsChange={(results) => {
                  console.log('Results changed:', results);
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}