'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';

export default function TestSectorFix() {
  const { user } = useUser();
  const [testActivityId, setTestActivityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const addTestResult = (result: any) => {
    setTestResults(prev => [...prev, { ...result, timestamp: new Date().toISOString() }]);
  };

  // Test 1: Create a test activity with sectors
  const testCreateActivityWithSectors = async () => {
    setIsLoading(true);
    try {
      const testSectors = [
        {
          id: crypto.randomUUID(),
          code: '111',
          name: 'Education, level unspecified',
          percentage: 30,
          level: 'group',
          category: 'Education',
          categoryCode: '111',
          categoryName: 'Education'
        },
        {
          id: crypto.randomUUID(),
          code: '11110',
          name: 'Education policy and administrative management',
          percentage: 40,
          level: 'subsector',
          category: 'Education',
          categoryCode: '111',
          categoryName: 'Education'
        },
        {
          id: crypto.randomUUID(),
          code: '121',
          name: 'Health, general',
          percentage: 30,
          level: 'group',
          category: 'Health',
          categoryCode: '121',
          categoryName: 'Health'
        }
      ];

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Test Sector Fix - ${new Date().toISOString()}`,
          description: 'Testing sector saving functionality',
          activityStatus: '1',
          publicationStatus: 'draft',
          sectors: testSectors,
          user: { id: user?.id }
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setTestActivityId(data.id);
        addTestResult({
          test: 'Create Activity with Sectors',
          status: 'success',
          message: `Created activity ${data.id} with ${data.sectors?.length || 0} sectors`,
          details: data.sectors
        });
        toast.success('Activity created successfully');
      } else {
        throw new Error(data.error || 'Failed to create activity');
      }
    } catch (error) {
      addTestResult({
        test: 'Create Activity with Sectors',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error('Failed to create activity');
    } finally {
      setIsLoading(false);
    }
  };

  // Test 2: Update sectors using field API
  const testUpdateSectorsViaFieldAPI = async () => {
    if (!testActivityId) {
      toast.error('Please create a test activity first');
      return;
    }

    setIsLoading(true);
    try {
      const updatedSectors = [
        {
          id: crypto.randomUUID(),
          code: '151',
          name: 'Government and civil society, general',
          percentage: 50,
          level: 'group',
          category: 'Government & Civil Society',
          categoryCode: '151',
          categoryName: 'Government & Civil Society'
        },
        {
          id: crypto.randomUUID(),
          code: '15110',
          name: 'Public sector policy and administrative management',
          percentage: 50,
          level: 'subsector',
          category: 'Government & Civil Society',
          categoryCode: '151',
          categoryName: 'Government & Civil Society'
        }
      ];

      const response = await fetch('/api/activities/field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: testActivityId,
          field: 'sectors',
          value: updatedSectors,
          user: { id: user?.id }
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        addTestResult({
          test: 'Update Sectors via Field API',
          status: 'success',
          message: `Updated sectors successfully. Returned ${data.sectors?.length || 0} sectors`,
          details: data.sectors
        });
        toast.success('Sectors updated successfully');
      } else {
        throw new Error(data.error || 'Failed to update sectors');
      }
    } catch (error) {
      addTestResult({
        test: 'Update Sectors via Field API',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error('Failed to update sectors');
    } finally {
      setIsLoading(false);
    }
  };

  // Test 3: Fetch activity to verify sectors
  const testFetchActivity = async () => {
    if (!testActivityId) {
      toast.error('Please create a test activity first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/activities/${testActivityId}`);
      const data = await response.json();
      
      if (response.ok) {
        addTestResult({
          test: 'Fetch Activity to Verify Sectors',
          status: 'success',
          message: `Fetched activity successfully. Has ${data.sectors?.length || 0} sectors`,
          details: data.sectors
        });
        toast.success('Activity fetched successfully');
      } else {
        throw new Error(data.error || 'Failed to fetch activity');
      }
    } catch (error) {
      addTestResult({
        test: 'Fetch Activity to Verify Sectors',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error('Failed to fetch activity');
    } finally {
      setIsLoading(false);
    }
  };

  // Clean up test activity
  const cleanupTestActivity = async () => {
    if (!testActivityId) {
      toast.error('No test activity to clean up');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/activities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: testActivityId, user: { id: user?.id } })
      });
      
      if (response.ok) {
        addTestResult({
          test: 'Cleanup Test Activity',
          status: 'success',
          message: `Deleted test activity ${testActivityId}`
        });
        setTestActivityId(null);
        toast.success('Test activity deleted');
      } else {
        throw new Error('Failed to delete activity');
      }
    } catch (error) {
      addTestResult({
        test: 'Cleanup Test Activity',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error('Failed to delete test activity');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Sector Fix</CardTitle>
          <p className="text-sm text-gray-600">
            This page tests the sector saving functionality after the API fix
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={testCreateActivityWithSectors}
                disabled={isLoading || !!testActivityId}
              >
                1. Create Test Activity with Sectors
              </Button>
              
              <Button 
                onClick={testUpdateSectorsViaFieldAPI}
                disabled={isLoading || !testActivityId}
                variant="secondary"
              >
                2. Update Sectors via Field API
              </Button>
              
              <Button 
                onClick={testFetchActivity}
                disabled={isLoading || !testActivityId}
                variant="secondary"
              >
                3. Fetch Activity to Verify
              </Button>
              
              <Button 
                onClick={cleanupTestActivity}
                disabled={isLoading || !testActivityId}
                variant="destructive"
              >
                4. Clean Up Test Activity
              </Button>
            </div>

            {testActivityId && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm">Test Activity ID: <code className="font-mono">{testActivityId}</code></p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">Test Results:</h3>
              {testResults.length === 0 ? (
                <p className="text-gray-500 text-sm">No tests run yet</p>
              ) : (
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg ${
                        result.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{result.test}</p>
                          <p className={`text-sm ${
                            result.status === 'success' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {result.message}
                          </p>
                          {result.details && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-sm text-gray-600">
                                View Details
                              </summary>
                              <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          result.status === 'success' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}